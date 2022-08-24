"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Kind = exports.IntegrationManagerInstance = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _url = _interopRequireDefault(require("url"));

var _logger = require("matrix-js-sdk/src/logger");

var _ScalarAuthClient = _interopRequireDefault(require("../ScalarAuthClient"));

var _Terms = require("../Terms");

var _Modal = _interopRequireDefault(require("../Modal"));

var _SettingsStore = _interopRequireDefault(require("../settings/SettingsStore"));

var _IntegrationManager = _interopRequireDefault(require("../components/views/settings/IntegrationManager"));

var _IntegrationManagers = require("./IntegrationManagers");

/*
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
let Kind;
exports.Kind = Kind;

(function (Kind) {
  Kind["Account"] = "account";
  Kind["Config"] = "config";
  Kind["Homeserver"] = "homeserver";
})(Kind || (exports.Kind = Kind = {}));

class IntegrationManagerInstance {
  // only applicable in some cases
  // Per the spec: UI URL is optional.
  constructor(kind, apiUrl) {
    let uiUrl = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : apiUrl;
    let id = arguments.length > 3 ? arguments[3] : undefined;
    (0, _defineProperty2.default)(this, "apiUrl", void 0);
    (0, _defineProperty2.default)(this, "uiUrl", void 0);
    (0, _defineProperty2.default)(this, "kind", void 0);
    (0, _defineProperty2.default)(this, "id", void 0);
    this.kind = kind;
    this.apiUrl = apiUrl;
    this.uiUrl = uiUrl;
    this.id = id;
  }

  get name() {
    const parsed = _url.default.parse(this.uiUrl);

    return parsed.host;
  }

  get trimmedApiUrl() {
    const parsed = _url.default.parse(this.apiUrl);

    parsed.pathname = '';
    parsed.path = '';
    return _url.default.format(parsed);
  }

  getScalarClient() {
    return new _ScalarAuthClient.default(this.apiUrl, this.uiUrl);
  }

  async open() {
    let room = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    let screen = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let integrationId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    if (!_SettingsStore.default.getValue("integrationProvisioning")) {
      return _IntegrationManagers.IntegrationManagers.sharedInstance().showDisabledDialog();
    }

    const dialog = _Modal.default.createDialog(_IntegrationManager.default, {
      loading: true
    }, 'mx_IntegrationManager');

    const client = this.getScalarClient();
    client.setTermsInteractionCallback((policyInfo, agreedUrls) => {
      // To avoid visual glitching of two modals stacking briefly, we customise the
      // terms dialog sizing when it will appear for the integration manager so that
      // it gets the same basic size as the integration manager's own modal.
      return (0, _Terms.dialogTermsInteractionCallback)(policyInfo, agreedUrls, 'mx_TermsDialog_forIntegrationManager');
    });
    const newProps = {};

    try {
      await client.connect();

      if (!client.hasCredentials()) {
        newProps["connected"] = false;
      } else {
        newProps["url"] = client.getScalarInterfaceUrlForRoom(room, screen, integrationId);
      }
    } catch (e) {
      if (e instanceof _Terms.TermsNotSignedError) {
        dialog.close();
        return;
      }

      _logger.logger.error(e);

      newProps["connected"] = false;
    } // Close the old dialog and open a new one


    dialog.close();

    _Modal.default.createDialog(_IntegrationManager.default, newProps, 'mx_IntegrationManager');
  }

}

exports.IntegrationManagerInstance = IntegrationManagerInstance;
//# sourceMappingURL=IntegrationManagerInstance.js.map