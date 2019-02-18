import React, { Component } from "react";
import TwitterLogin from "react-twitter-auth";
import "whatwg-fetch";
const CP = require("@zilliqa-js/crypto");

export default class WalletCreation extends Component {
  constructor() {
    super();
    this.generateWallet = this.generateWallet.bind(this);
    this.requestFunds = this.requestFunds.bind(this);
    this.state = {
      privkey: null
    };
  }

  storePrivateKey(privateKey) {
    localStorage.setItem("privateKey", privateKey);
  }

  generateWallet() {
    const privkey = CP.schnorr.generatePrivateKey();
    this.requestFunds(privkey);
    this.setState({ privkey }, () => {
      this.storePrivateKey(privkey);
    });
  }

  async requestFunds(privkey) {
    const { user, token } = this.props;
    const { id: userId, screen_name: username } = user;
    const address = CP.getAddressFromPrivateKey(privkey);

    const data = await fetch("http://localhost:4000/api/v1/request-funds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        username,
        token,
        address
      })
    });
    return data;
  }

  render() {
    return (
      <div>
        <button onClick={this.generateWallet}>Create Wallet</button>
        {this.state.privkey ? (
          <div>
            <p>Address: {CP.getAddressFromPrivateKey(this.state.privkey)}</p>
            <p>Private key: {this.state.privkey}</p>
          </div>
        ) : null}
      </div>
    );
  }
}
