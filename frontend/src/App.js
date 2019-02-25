import React, { Component } from "react";
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import Navbar from "./Navbar";
import HomeScreen from "./HomeScreen";
import Footer from "./Footer";
import CreateWalletScreen from "./CreateWalletScreen";
import SubmitTweet from "./SubmitTweet";

class App extends Component {
  constructor() {
    super();
    this.handleSuccess = this.handleSuccess.bind(this);
    this.handleFailed = this.handleFailed.bind(this);
    this.state = { isAuthenticated: false, user: null, token: "" };
  }

  handleSuccessLogin() {
    this.setState({ isAuthenticated: true });
  }

  handleSuccess(response) {
    const token = response.headers.get("x-auth-token");
    response.json().then(user => {
      if (token) {
        this.setState({ isAuthenticated: true, user: user, token: token });
        // this.props.onSuccessLogin({ user, token });
      }
    });
  }

  handleFailed(error) {
    console.error(error);
  }

  logout() {
    this.setState({ isAuthenticated: false, token: "", user: null });
  }

  render() {
    const { isAuthenticated } = this.state;

    return (
      <Router>
        <span>
          <Navbar
            isAuthenticated={isAuthenticated}
            onLoginSuccess={this.handleSuccess}
            onLoginFail={this.handleFailed}
          />
          <Route
            exact
            path="/"
            component={props => (
              <HomeScreen
                {...props}
                isAuthenticated={isAuthenticated}
                onLoginSuccess={this.handleSuccess}
                onLoginFail={this.handleFailed}
              />
            )}
          />
          <Route path="/create" component={CreateWalletScreen} />
          <Route path="/submit" component={SubmitTweet} />
          <Footer />
        </span>
      </Router>
    );
  }
}

export default App;
