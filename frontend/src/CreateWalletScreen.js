import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import "whatwg-fetch";
import { registerUser as _registerUser, isUserRegistered } from "./zilliqa";
import LoadingModal from "./LoadingModal";
import { CURRENT_URI } from "./utils";
const CP = require("@zilliqa-js/crypto");

export default class CreateWalletScreen extends Component {
  constructor() {
    super();
    this.generateWallet = this.generateWallet.bind(this);
    this.requestFunds = this.requestFunds.bind(this);
    this.registerUser = this.registerUser.bind(this);
    this.existingPrivateKey = !!localStorage.getItem("privateKey");
    this.state = {
      redirectBack: false,
      successRequestFund: null,
      successRegisterUser: null,
      redirectToSubmitTweet: false,
      privkey: null,
      errMsg: null,
      isRegistered: null
    };
  }

  storePrivateKey(privateKey) {
    localStorage.setItem("privateKey", privateKey);
  }

  useOwnWallet() {
    window.$("#loadingModal").modal("show");
    return;
  }

  async generateWallet() {
    const { username } = this.props.location.state.user;
    const isRegistered = await isUserRegistered(username);
    if (isRegistered) {
      this.setState({ errMsg: "User is already registered." });
      window.$("#loadingModal").modal("show");
      return;
    }

    const privkey = CP.schnorr.generatePrivateKey();
    // delay to create illusion
    setTimeout(() => {
      this.setState({ privkey });
      this.storePrivateKey(privkey);
    }, 5000);
    await this.requestFunds(privkey);
    await this.registerUser(privkey, username);
  }

  async registerUser(privkey, username) {
    if (this.state.successRequestFund) {
      const address = CP.getAddressFromPrivateKey(privkey);
      try {
        const tx = await _registerUser(privkey, address, username);
        console.log(tx);
        this.setState({ successRegisterUser: tx.receipt.success });
      } catch (e) {
        this.setState({ errMsg: e.message });
        console.error(e);
      }
    }
  }

  async requestFunds(privkey) {
    const { user, token } = this.props.location.state;
    const { username, token: twitterToken } = user;
    const address = CP.getAddressFromPrivateKey(privkey);

    try {
      const response = await fetch(`${CURRENT_URI}/api/v1/request-funds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({
          username,
          address,
          twitterToken
        })
      });
      const receipt = await response.json();
      console.log(receipt);
      this.setState({ successRequestFund: receipt.success });
      return receipt;
    } catch (e) {
      console.log(e);
      this.setState({
        errMsg: "Failed in requesting funds.\nPlease refresh and try again."
      });
    }
  }

  async componentDidMount() {
    const { username } = this.props.location.state.user;
    const isRegistered = isUserRegistered(username);
    this.setState({ isRegistered });

    window.$("#loadingModal").on("hidden.bs.modal", () => {
      if (this.state.errMsg) {
        this.props.onLogout();
        // this.setState({ redirectBack: true });
      } else {
        this.setState({ redirectToSubmitTweet: true });
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const { successRegisterUser, successRequestFund } = this.state;
    if (successRegisterUser && successRequestFund) {
      setTimeout(() => {
        window.$("#loadingModal").modal("hide");
      }, 3000);
    }
  }

  render() {
    const {
      successRegisterUser,
      successRequestFund,
      privkey,
      errMsg,
      redirectToSubmitTweet,
      isRegistered
    } = this.state;

    const { isAuthenticated } = this.props;

    if (!isAuthenticated) {
      return <Redirect exact to="/" />;
    } else {
      // dont regenerate private keys for the user
      if (this.existingPrivateKey) {
        console.log("existingPrivateKey");
        return (
          <Redirect
            to={{
              pathname: "/submit",
              state: {
                ...this.props.location.state
              }
            }}
          />
        );
      }
    }

    if (redirectToSubmitTweet) {
      return (
        <Redirect
          to={{
            pathname: "/submit",
            state: {
              ...this.props.location.state
            }
          }}
        />
      );
    }

    const msg = "\nPlease be patient, do not close this window.";
    const loadingPercentages = [0, 33.33, 66.66, 100];
    let fromLoadingPercent = loadingPercentages[0];
    let toLoadingPercent = loadingPercentages[1];
    let loadingText = "Generating private key...";
    if (privkey) {
      loadingText = "Requesting funds for wallet..." + msg;
      fromLoadingPercent = loadingPercentages[1];
      toLoadingPercent = loadingPercentages[2];

      if (successRequestFund) {
        loadingText = "Registering wallet in contract..." + msg;
        fromLoadingPercent = loadingPercentages[2];
        toLoadingPercent = loadingPercentages[3];

        if (successRegisterUser) {
          loadingText =
            "Successfully registered wallet in contract. Redirecting you...";
          fromLoadingPercent = loadingPercentages[3];
          toLoadingPercent = loadingPercentages[3];
        }
      }
    }

    return (
      <header className="masthead-create">
        <LoadingModal
          title="Your Testnet Wallet"
          fromLoadingPercent={fromLoadingPercent}
          toLoadingPercent={toLoadingPercent}
          loadingText={loadingText}
          errorText={errMsg}
        />
        <div className="container h-100">
          <div className="row h-100">
            <div className="col-lg-12 my-auto">
              <div className="header-content mx-auto">
                <h1 className="mb-5">Thanks for registering</h1>
                <h2>
                  You'll also need a Zilliqa testnet wallet address to store the
                  testnet tokens you have.
                  <br />
                  <br />
                  We will get you started with a wallet, loaded with 50 testnet
                  ZIL tokens.
                </h2>
                <br />
                <p className="warning">
                  Warning: This is a testnet application for demo purposes and
                  only handles testnet ZIL tokens. Please do not send any
                  interim ERC-20 tokens or mainnet tokens here.
                </p>
                {isRegistered === null ? null : isRegistered ? (
                  <div onClick={this.useOwnWallet} className="shiny-button">
                    <button
                      type="button"
                      className="btn shiny-button-content"
                      data-toggle="modal"
                      data-target="#loadingModal"
                      data-backdrop="static"
                      data-keyboard="false"
                    >
                      Use my own wallet
                    </button>
                  </div>
                ) : (
                  <div onClick={this.generateWallet} className="shiny-button">
                    <button
                      type="button"
                      className="btn shiny-button-content"
                      data-toggle="modal"
                      data-target="#loadingModal"
                      data-backdrop="static"
                      data-keyboard="false"
                    >
                      Generate a free testnet wallet for me
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }
}
