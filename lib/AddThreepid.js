"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _MatrixClientPeg = require("./MatrixClientPeg");

var _Modal = _interopRequireDefault(require("./Modal"));

var _languageHandler = require("./languageHandler");

var _IdentityAuthClient = _interopRequireDefault(require("./IdentityAuthClient"));

var _InteractiveAuthEntryComponents = require("./components/views/auth/InteractiveAuthEntryComponents");

var _InteractiveAuthDialog = _interopRequireDefault(require("./components/views/dialogs/InteractiveAuthDialog"));

/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
function getIdServerDomain() {
  return _MatrixClientPeg.MatrixClientPeg.get().idBaseUrl.split("://")[1];
}
/**
 * Allows a user to add a third party identifier to their homeserver and,
 * optionally, the identity servers.
 *
 * This involves getting an email token from the identity server to "prove" that
 * the client owns the given email address, which is then passed to the
 * add threepid API on the homeserver.
 *
 * Diagrams of the intended API flows here are available at:
 *
 * https://gist.github.com/jryans/839a09bf0c5a70e2f36ed990d50ed928
 */


class AddThreepid {
  constructor() {
    (0, _defineProperty2.default)(this, "sessionId", void 0);
    (0, _defineProperty2.default)(this, "submitUrl", void 0);
    (0, _defineProperty2.default)(this, "clientSecret", void 0);
    (0, _defineProperty2.default)(this, "bind", void 0);
    (0, _defineProperty2.default)(this, "makeAddThreepidOnlyRequest", auth => {
      return _MatrixClientPeg.MatrixClientPeg.get().addThreePidOnly({
        sid: this.sessionId,
        client_secret: this.clientSecret,
        auth
      });
    });
    this.clientSecret = _MatrixClientPeg.MatrixClientPeg.get().generateClientSecret();
  }
  /**
   * Attempt to add an email threepid to the homeserver.
   * This will trigger a side-effect of sending an email to the provided email address.
   * @param {string} emailAddress The email address to add
   * @return {Promise} Resolves when the email has been sent. Then call checkEmailLinkClicked().
   */


  addEmailAddress(emailAddress) {
    return _MatrixClientPeg.MatrixClientPeg.get().requestAdd3pidEmailToken(emailAddress, this.clientSecret, 1).then(res => {
      this.sessionId = res.sid;
      return res;
    }, function (err) {
      if (err.errcode === 'M_THREEPID_IN_USE') {
        err.message = (0, _languageHandler._t)('This email address is already in use');
      } else if (err.httpStatus) {
        err.message = err.message + ` (Status ${err.httpStatus})`;
      }

      throw err;
    });
  }
  /**
   * Attempt to bind an email threepid on the identity server via the homeserver.
   * This will trigger a side-effect of sending an email to the provided email address.
   * @param {string} emailAddress The email address to add
   * @return {Promise} Resolves when the email has been sent. Then call checkEmailLinkClicked().
   */


  async bindEmailAddress(emailAddress) {
    this.bind = true;

    if (await _MatrixClientPeg.MatrixClientPeg.get().doesServerSupportSeparateAddAndBind()) {
      // For separate bind, request a token directly from the IS.
      const authClient = new _IdentityAuthClient.default();
      const identityAccessToken = await authClient.getAccessToken();
      return _MatrixClientPeg.MatrixClientPeg.get().requestEmailToken(emailAddress, this.clientSecret, 1, undefined, undefined, identityAccessToken).then(res => {
        this.sessionId = res.sid;
        return res;
      }, function (err) {
        if (err.errcode === 'M_THREEPID_IN_USE') {
          err.message = (0, _languageHandler._t)('This email address is already in use');
        } else if (err.httpStatus) {
          err.message = err.message + ` (Status ${err.httpStatus})`;
        }

        throw err;
      });
    } else {
      // For tangled bind, request a token via the HS.
      return this.addEmailAddress(emailAddress);
    }
  }
  /**
   * Attempt to add a MSISDN threepid to the homeserver.
   * This will trigger a side-effect of sending an SMS to the provided phone number.
   * @param {string} phoneCountry The ISO 2 letter code of the country to resolve phoneNumber in
   * @param {string} phoneNumber The national or international formatted phone number to add
   * @return {Promise} Resolves when the text message has been sent. Then call haveMsisdnToken().
   */


  addMsisdn(phoneCountry, phoneNumber) {
    return _MatrixClientPeg.MatrixClientPeg.get().requestAdd3pidMsisdnToken(phoneCountry, phoneNumber, this.clientSecret, 1).then(res => {
      this.sessionId = res.sid;
      this.submitUrl = res.submit_url;
      return res;
    }, function (err) {
      if (err.errcode === 'M_THREEPID_IN_USE') {
        err.message = (0, _languageHandler._t)('This phone number is already in use');
      } else if (err.httpStatus) {
        err.message = err.message + ` (Status ${err.httpStatus})`;
      }

      throw err;
    });
  }
  /**
   * Attempt to bind a MSISDN threepid on the identity server via the homeserver.
   * This will trigger a side-effect of sending an SMS to the provided phone number.
   * @param {string} phoneCountry The ISO 2 letter code of the country to resolve phoneNumber in
   * @param {string} phoneNumber The national or international formatted phone number to add
   * @return {Promise} Resolves when the text message has been sent. Then call haveMsisdnToken().
   */


  async bindMsisdn(phoneCountry, phoneNumber) {
    this.bind = true;

    if (await _MatrixClientPeg.MatrixClientPeg.get().doesServerSupportSeparateAddAndBind()) {
      // For separate bind, request a token directly from the IS.
      const authClient = new _IdentityAuthClient.default();
      const identityAccessToken = await authClient.getAccessToken();
      return _MatrixClientPeg.MatrixClientPeg.get().requestMsisdnToken(phoneCountry, phoneNumber, this.clientSecret, 1, undefined, undefined, identityAccessToken).then(res => {
        this.sessionId = res.sid;
        return res;
      }, function (err) {
        if (err.errcode === 'M_THREEPID_IN_USE') {
          err.message = (0, _languageHandler._t)('This phone number is already in use');
        } else if (err.httpStatus) {
          err.message = err.message + ` (Status ${err.httpStatus})`;
        }

        throw err;
      });
    } else {
      // For tangled bind, request a token via the HS.
      return this.addMsisdn(phoneCountry, phoneNumber);
    }
  }
  /**
   * Checks if the email link has been clicked by attempting to add the threepid
   * @return {Promise} Resolves if the email address was added. Rejects with an object
   * with a "message" property which contains a human-readable message detailing why
   * the request failed.
   */


  async checkEmailLinkClicked() {
    try {
      if (await _MatrixClientPeg.MatrixClientPeg.get().doesServerSupportSeparateAddAndBind()) {
        if (this.bind) {
          const authClient = new _IdentityAuthClient.default();
          const identityAccessToken = await authClient.getAccessToken();
          await _MatrixClientPeg.MatrixClientPeg.get().bindThreePid({
            sid: this.sessionId,
            client_secret: this.clientSecret,
            id_server: getIdServerDomain(),
            id_access_token: identityAccessToken
          });
        } else {
          try {
            await this.makeAddThreepidOnlyRequest(); // The spec has always required this to use UI auth but synapse briefly
            // implemented it without, so this may just succeed and that's OK.

            return;
          } catch (e) {
            if (e.httpStatus !== 401 || !e.data || !e.data.flows) {
              // doesn't look like an interactive-auth failure
              throw e;
            }

            const dialogAesthetics = {
              [_InteractiveAuthEntryComponents.SSOAuthEntry.PHASE_PREAUTH]: {
                title: (0, _languageHandler._t)("Use Single Sign On to continue"),
                body: (0, _languageHandler._t)("Confirm adding this email address by using " + "Single Sign On to prove your identity."),
                continueText: (0, _languageHandler._t)("Single Sign On"),
                continueKind: "primary"
              },
              [_InteractiveAuthEntryComponents.SSOAuthEntry.PHASE_POSTAUTH]: {
                title: (0, _languageHandler._t)("Confirm adding email"),
                body: (0, _languageHandler._t)("Click the button below to confirm adding this email address."),
                continueText: (0, _languageHandler._t)("Confirm"),
                continueKind: "primary"
              }
            };

            const {
              finished
            } = _Modal.default.createDialog(_InteractiveAuthDialog.default, {
              title: (0, _languageHandler._t)("Add Email Address"),
              matrixClient: _MatrixClientPeg.MatrixClientPeg.get(),
              authData: e.data,
              makeRequest: this.makeAddThreepidOnlyRequest,
              aestheticsForStagePhases: {
                [_InteractiveAuthEntryComponents.SSOAuthEntry.LOGIN_TYPE]: dialogAesthetics,
                [_InteractiveAuthEntryComponents.SSOAuthEntry.UNSTABLE_LOGIN_TYPE]: dialogAesthetics
              }
            });

            return finished;
          }
        }
      } else {
        await _MatrixClientPeg.MatrixClientPeg.get().addThreePid({
          sid: this.sessionId,
          client_secret: this.clientSecret,
          id_server: getIdServerDomain()
        }, this.bind);
      }
    } catch (err) {
      if (err.httpStatus === 401) {
        err.message = (0, _languageHandler._t)('Failed to verify email address: make sure you clicked the link in the email');
      } else if (err.httpStatus) {
        err.message += ` (Status ${err.httpStatus})`;
      }

      throw err;
    }
  }
  /**
   * @param {{type: string, session?: string}} auth UI auth object
   * @return {Promise<Object>} Response from /3pid/add call (in current spec, an empty object)
   */


  /**
   * Takes a phone number verification code as entered by the user and validates
   * it with the identity server, then if successful, adds the phone number.
   * @param {string} msisdnToken phone number verification code as entered by the user
   * @return {Promise} Resolves if the phone number was added. Rejects with an object
   * with a "message" property which contains a human-readable message detailing why
   * the request failed.
   */
  async haveMsisdnToken(msisdnToken) {
    const authClient = new _IdentityAuthClient.default();
    const supportsSeparateAddAndBind = await _MatrixClientPeg.MatrixClientPeg.get().doesServerSupportSeparateAddAndBind();
    let result;

    if (this.submitUrl) {
      result = await _MatrixClientPeg.MatrixClientPeg.get().submitMsisdnTokenOtherUrl(this.submitUrl, this.sessionId, this.clientSecret, msisdnToken);
    } else if (this.bind || !supportsSeparateAddAndBind) {
      result = await _MatrixClientPeg.MatrixClientPeg.get().submitMsisdnToken(this.sessionId, this.clientSecret, msisdnToken, await authClient.getAccessToken());
    } else {
      throw new Error("The add / bind with MSISDN flow is misconfigured");
    }

    if (result.errcode) {
      throw result;
    }

    if (supportsSeparateAddAndBind) {
      if (this.bind) {
        await _MatrixClientPeg.MatrixClientPeg.get().bindThreePid({
          sid: this.sessionId,
          client_secret: this.clientSecret,
          id_server: getIdServerDomain(),
          id_access_token: await authClient.getAccessToken()
        });
      } else {
        try {
          await this.makeAddThreepidOnlyRequest(); // The spec has always required this to use UI auth but synapse briefly
          // implemented it without, so this may just succeed and that's OK.

          return;
        } catch (e) {
          if (e.httpStatus !== 401 || !e.data || !e.data.flows) {
            // doesn't look like an interactive-auth failure
            throw e;
          }

          const dialogAesthetics = {
            [_InteractiveAuthEntryComponents.SSOAuthEntry.PHASE_PREAUTH]: {
              title: (0, _languageHandler._t)("Use Single Sign On to continue"),
              body: (0, _languageHandler._t)("Confirm adding this phone number by using " + "Single Sign On to prove your identity."),
              continueText: (0, _languageHandler._t)("Single Sign On"),
              continueKind: "primary"
            },
            [_InteractiveAuthEntryComponents.SSOAuthEntry.PHASE_POSTAUTH]: {
              title: (0, _languageHandler._t)("Confirm adding phone number"),
              body: (0, _languageHandler._t)("Click the button below to confirm adding this phone number."),
              continueText: (0, _languageHandler._t)("Confirm"),
              continueKind: "primary"
            }
          };

          const {
            finished
          } = _Modal.default.createDialog(_InteractiveAuthDialog.default, {
            title: (0, _languageHandler._t)("Add Phone Number"),
            matrixClient: _MatrixClientPeg.MatrixClientPeg.get(),
            authData: e.data,
            makeRequest: this.makeAddThreepidOnlyRequest,
            aestheticsForStagePhases: {
              [_InteractiveAuthEntryComponents.SSOAuthEntry.LOGIN_TYPE]: dialogAesthetics,
              [_InteractiveAuthEntryComponents.SSOAuthEntry.UNSTABLE_LOGIN_TYPE]: dialogAesthetics
            }
          });

          return finished;
        }
      }
    } else {
      await _MatrixClientPeg.MatrixClientPeg.get().addThreePid({
        sid: this.sessionId,
        client_secret: this.clientSecret,
        id_server: getIdServerDomain()
      }, this.bind);
    }
  }

}

exports.default = AddThreepid;
//# sourceMappingURL=AddThreepid.js.map