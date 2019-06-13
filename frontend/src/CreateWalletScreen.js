import React, { Component } from "react";
import "whatwg-fetch";
import { registerUser as _registerUser, isUserRegistered } from "./zilliqa";
import LoadingModal from "./LoadingModal";
import { CURRENT_URI } from "./utils";
import { throws } from "assert";
const CP = require("@zilliqa-js/crypto");

export default class CreateWalletScreen extends Component {
  constructor() {
    super();
    this.generateWallet = this.generateWallet.bind(this);
    this.generateKey = this.generateKey.bind(this);
    this.requestFunds = this.requestFunds.bind(this);
    this.registerUser = this.registerUser.bind(this);
    this.getUsername = this.getUsername.bind(this);
    this.state = {
      redirectBack: false,
      successRequestFund: null,
      successRegisterUser: null,
      privateKey: null,
      errMsg: null
    };
  }

  getUsername() {
    const username = localStorage.getItem("authenticatedUsername");
    if (username) {
      return username;
    } else {
      this.props.onLogout(true);
    }
  }

  async generateWallet() {
    try {
      const username = await this.getUsername();
      const isRegistered = await isUserRegistered(username);
      if (!isRegistered) {
        await this.generateKey();
        const { privateKey } = this.state;
        localStorage.setItem("walletAddress", CP.getAddressFromPrivateKey(privateKey));
        await this.requestFunds(privateKey);
        await this.registerUser(privateKey, username);
      }
      window.$('#loadingModal').modal('toggle');
      this.props.handleWalletStateChange(true);
    } catch (e) {
      this.setState({errMsg: e.message});
    }
  }

  async generateKey() {
    const privateKey = CP.schnorr.generatePrivateKey();
    // TODO: Need to display modal
    this.setState({ privateKey });
  }

  async registerUser(privateKey, username) {
    if (this.state.successRequestFund) {
      const address = CP.getAddressFromPrivateKey(privateKey);
      // const tx = await _registerUser(privateKey, address, username);
      // this.setState({ successRegisterUser: tx.receipt.success });
      this.setState({ successRegisterUser: true });
    }
  }

  async requestFunds(privateKey) {
    const address = CP.getAddressFromPrivateKey(privateKey);

    try {
      // const response = fetch(`${CURRENT_URI}/api/v1/request-funds`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json"},
      //   body: JSON.stringify({ address }),
      //   credentials: "include"
      // });
      // // Cookie has expired
      // if (response.status === 401) {
      //   this.props.onLogout();
      //   return;
      // }
      // const receipt = response.json();
      // console.log(receipt);
      // this.setState({ successRequestFund: receipt.success });
      this.setState({ successRequestFund: true });
    } catch (e) {
      throw Error("Failed in requesting funds.\nPlease refresh and try again.");
    }
  }

  render() {
    const {
      successRegisterUser,
      successRequestFund,
      errMsg,
      privateKey
    } = this.state;

    const msg = "\nPlease be patient, do not close this window.";
    const loadingPercentages = [0, 33.33, 66.66, 100];
    let fromLoadingPercent = loadingPercentages[0];
    let toLoadingPercent = loadingPercentages[1];
    let loadingText = "Generating private key...";

    if (successRegisterUser && successRequestFund && privateKey) {
      loadingText = "Successfully registered wallet in contract. Redirecting you...";
      fromLoadingPercent = loadingPercentages[3];
      toLoadingPercent = loadingPercentages[3];
    } else if (successRequestFund && privateKey) {
      loadingText = "Registering wallet in contract..." + msg;
      fromLoadingPercent = loadingPercentages[2];
      toLoadingPercent = loadingPercentages[3];
    } else {
      loadingText = "Requesting funds for wallet..." + msg;
      fromLoadingPercent = loadingPercentages[1];
      toLoadingPercent = loadingPercentages[2];
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
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }
}
