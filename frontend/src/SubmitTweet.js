import React, { Component } from "react";
import Joyride from "react-joyride";
import LoadingModal from "./LoadingModal";
import {
  submitTweet as _submitTweet,
  getTweetVerification,
  isTweetIdAlreadyRegistered,
  zilliqa
} from "./zilliqa";
import { Link, Redirect } from "react-router-dom";
import { TwitterTweetEmbed } from "react-twitter-embed";
import { CURRENT_URI } from "./utils";
const { units, BN } = require("@zilliqa-js/util");
const CP = require("@zilliqa-js/crypto");
// const privkey =
//   "7906a5bdccf93556b8f2bc326d9747ad5252a303b9e064412e32e8feadff8a08";

export default class SubmitTweet extends Component {
  constructor() {
    super();
    this.handleChange = this.handleChange.bind(this);
    this.submitTweet = this.submitTweet.bind(this);
    this.sendTransactionId = this.sendTransactionId.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.clearState = this.clearState.bind(this);
    this.shownIntro = localStorage.getItem("shownIntro");

    this.state = {
      showLoading: false,
      tweetId: "",
      errMsg: null,
      submittedTweet: false,
      verifiedTweet: false,
      retrievedVerification: false,
      balance: 0,
      runIntro: false
    };
  }

  getPrivateKey() {
    return localStorage.getItem("privateKey");
    // return privkey;
  }

  async updateBalance() {
    const privateKey = this.getPrivateKey();
    if (privateKey) {
      const address = CP.getAddressFromPrivateKey(privateKey);
      const data = await zilliqa.blockchain.getBalance(address);
      const { balance } = data.result;
      const zilBalance = units.fromQa(new BN(balance), units.Units.Zil);
      this.setState({ balance: zilBalance });
    }
  }

  async sendTransactionId(txnId) {
    // const { token, user } = this.props.location.state;
    // TO FIX token is undefined here
    const { token, user } = this.props;
    // console.log(user, token);
    try {
      const response = await fetch(`${CURRENT_URI}/api/v1/submit-tweet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({
          txnId,
          username: user.username,
          twitterToken: user.token
        })
      });
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to verify tweet. Please try again.");
    }
  }

  isValidTweetId(tweetId) {
    return tweetId.length >= 18 && /^(0|[1-9]\d*)$/.test(tweetId);
  }

  async submitTweet() {
    const { tweetId } = this.state;
    if (tweetId === "") {
      this.setState({ errMsg: "Tweet ID cannot be empty", showLoading: true });
      // window.$("#loadingModal").modal("show");
      return;
    }

    if (!this.isValidTweetId(tweetId)) {
      this.setState({
        errMsg:
          "Invalid tweet ID. Please look at instructions to see what a tweet ID is.",
        showLoading: true
      });
      // window.$("#loadingModal").modal("show");
      return;
    }

    const isRegistered = await isTweetIdAlreadyRegistered(tweetId);
    if (isRegistered) {
      this.setState({
        errMsg: "Tweet ID already submitted. Please submit another tweet ID.",
        showLoading: true
      });
      // window.$("#loadingModal").modal("show");
      return;
    }

    const privateKey = this.getPrivateKey();
    // const address = CP.getAddressFromPrivateKey(privateKey);

    try {
      this.setState({ showLoading: true });
      const { txnId } = await _submitTweet(privateKey, tweetId);
      this.setState({ submittedTweet: true });
      // const modal = window
      //   .$("#loadingModal")
      //   .modal({ backdrop: "static", keyboard: false });
      // modal.modal("show");
      const verifyTxn = await this.sendTransactionId(txnId);
      console.log(verifyTxn);
      this.setState({ verifiedTweet: true });
      const verifyTxnId = verifyTxn.id;
      const tweetIsVerified = await getTweetVerification(verifyTxnId, tweetId);
      this.setState({ retrievedVerification: true });
      console.log(verifyTxn, tweetIsVerified);
    } catch (e) {
      console.error(e);
      this.setState({ errMsg: e.message });
    }
  }

  handleChange(e) {
    this.setState({ tweetId: e.target.value });
  }

  handleInstructionsClick(e) {
    e.preventDefault();
    const $container = window.$("html,body");
    const $scrollTo = window.$(".instructions-section");
    $container.animate({
      scrollTop:
        $scrollTo.offset().top -
        $container.offset().top +
        $container.scrollTop()
    });
  }

  componentDidMount() {
    this.updateBalance();

    this.updateBalanceInterval = setInterval(() => {
      this.updateBalance();
    }, 10000);

    if (!this.shownIntro) {
      setTimeout(() => {
        this.setState({ runIntro: true });
        localStorage.setItem("shownIntro", JSON.stringify(true));
      }, 1000);
    }

    window.$(".submit-tweet-form").submit(e => {
      e.preventDefault();
    });
  }

  componentWillUnmount() {
    clearInterval(this.updateBalanceInterval);
  }

  clearState() {
    this.setState({
      showLoading: false,
      tweetId: "",
      errMsg: null,
      submittedTweet: false,
      verifiedTweet: false,
      retrievedVerification: false
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      submittedTweet,
      verifiedTweet,
      retrievedVerification,
      showLoading
    } = this.state;
    if (submittedTweet && verifiedTweet && retrievedVerification) {
      // clear form
      setTimeout(() => {
        window.$("#loadingModal").modal("hide");
        this.updateBalance();
        this.clearState();
      }, 5000);
    }

    if (showLoading && !prevState.showLoading) {
      const modal = window
        .$("#loadingModal")
        .modal({ backdrop: "static", keyboard: false });
      modal.modal("show");
      window.$("#loadingModal").on("hidden.bs.modal", this.clearState);
    }
  }

  render() {
    const {
      balance,
      submittedTweet,
      verifiedTweet,
      retrievedVerification,
      errMsg,
      runIntro,
      tweetId,
      showLoading
    } = this.state;

    const { isAuthenticated } = this.props;
    const validTweetId = this.isValidTweetId(tweetId);

    if (!isAuthenticated) {
      return <Redirect exact to="/" />;
    }

    const loadingPercentages = [25, 50, 75, 100];
    const msg = "\nPlease be patient, do not close this window.";
    let fromLoadingPercent = loadingPercentages[0];
    let toLoadingPercent = loadingPercentages[1];
    let loadingText = "Submitting tweet to contract..." + msg;

    if (submittedTweet) {
      fromLoadingPercent = loadingPercentages[1];
      toLoadingPercent = loadingPercentages[2];
      loadingText = "Verifying tweet hashtag..." + msg;

      if (verifiedTweet) {
        fromLoadingPercent = loadingPercentages[2];
        toLoadingPercent = loadingPercentages[3];
        loadingText = "Retrieving verification..." + msg;

        if (retrievedVerification) {
          fromLoadingPercent = loadingPercentages[3];
          toLoadingPercent = loadingPercentages[3];
          loadingText = "Tweet is verified. Rewarded 10 ZILs!";
        }
      }
    }

    const steps = [
      {
        target: ".balance",
        content:
          "You can view your testnet wallet's address and private keys here.",
        disableBeacon: true
      }
    ];

    return (
      <div>
        {showLoading ? (
          <LoadingModal
            errorText={errMsg}
            title="Submitting tweet"
            loadingText={loadingText}
            fromLoadingPercent={fromLoadingPercent}
            toLoadingPercent={toLoadingPercent}
          />
        ) : null}
        <Joyride
          steps={steps}
          run={runIntro}
          styles={{
            options: {
              primaryColor: "#42e8e0"
            }
          }}
        />
        <header className="masthead-submit">
          <div className="container h-100">
            <div className="row h-100">
              <div className="balance">
                <Link to="/wallet">Balance: {balance} ZILs</Link>
              </div>
              <div className="col-lg-12 my-auto">
                <div className="header-content mx-auto">
                  <h1 className="mb-5">Enter your tweet ID</h1>
                  <h2 className="mb-6">
                    Your tweet must include the hashtag,{" "}
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://twitter.com/intent/tweet?hashtags=BuildonZIL&tw_p=tweetbutton&text=Hello+world&via=zilliqa"
                    >
                      #BuildonZIL
                    </a>
                  </h2>
                  <div className="row my-auto w-100">
                    <form
                      action="#"
                      className="submit-tweet-form form-inline justify-content-center w-100 mt-5"
                    >
                      <input
                        onChange={this.handleChange}
                        onKeyPress={e => {
                          if (e.key === "Enter") this.submitTweet();
                        }}
                        value={this.state.tweetId}
                        className="form-control mt-2 mb-2 mr-sm-3 pl-3"
                        type="text"
                        placeholder="1083722408815546368"
                      />
                      <div className="submit-tweet-btn shiny-button">
                        <button
                          type="button"
                          onClick={this.submitTweet}
                          className="btn shiny-button-content"
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="cta-container col-lg-12 text-center">
                    {validTweetId ? (
                      <span>
                        <TwitterTweetEmbed tweetId={tweetId} />
                      </span>
                    ) : (
                      <span>
                        <p>
                          A tweet ID is the series of numbers in a tweet's URL.
                          You're able to find the tweet URL in your browser's
                          search bar.
                        </p>
                        <img
                          className="mb-5"
                          src="/img/tweet-id.png"
                          alt="Tweet ID"
                        />
                        <br />
                        <a
                          onClick={this.handleInstructionsClick}
                          className="cta-link"
                          href=""
                        >
                          How does this work?
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="instructions-section">
          <div className="container">
            <div className="row h-100">
              <div className="col-lg-7 mx-auto my-auto">
                <p className="heading">
                  <strong className="ml-4">Instructions</strong>
                  <ol>
                    <li>Register or Sign in with your Twitter account.</li>
                    <li>
                      Note down the private key for your blockchain wallet
                      generated for future use.
                    </li>
                    <li>
                      Tweet something with the hashtag{" "}
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://twitter.com/intent/tweet?hashtags=BuildonZIL&tw_p=tweetbutton&text=Hello+world&via=zilliqa"
                      >
                        #BuildonZIL
                      </a>
                      .
                    </li>
                    <li>Submit the tweet ID here for verification.</li>
                    <li>Get test tokens for our test blockchain!</li>
                  </ol>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
