"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.showToast = exports.hideToast = void 0;

var _languageHandler = require("../languageHandler");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _MatrixClientPeg = require("../MatrixClientPeg");

var _DeviceListener = _interopRequireDefault(require("../DeviceListener"));

var _ToastStore = _interopRequireDefault(require("../stores/ToastStore"));

var _GenericToast = _interopRequireDefault(require("../components/views/toasts/GenericToast"));

var _actions = require("../dispatcher/actions");

var _UserTab = require("../components/views/dialogs/UserTab");

/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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
function toastKey(deviceId) {
  return "unverified_session_" + deviceId;
}

const showToast = async deviceId => {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  const onAccept = () => {
    _DeviceListener.default.sharedInstance().dismissUnverifiedSessions([deviceId]);

    _dispatcher.default.dispatch({
      action: _actions.Action.ViewUserSettings,
      initialTabId: _UserTab.UserTab.Security
    });
  };

  const onReject = () => {
    _DeviceListener.default.sharedInstance().dismissUnverifiedSessions([deviceId]);
  };

  const device = await cli.getDevice(deviceId);

  _ToastStore.default.sharedInstance().addOrReplaceToast({
    key: toastKey(deviceId),
    title: (0, _languageHandler._t)("New login. Was this you?"),
    icon: "verification_warning",
    props: {
      description: device.display_name,
      detail: (0, _languageHandler._t)("%(deviceId)s from %(ip)s", {
        deviceId,
        ip: device.last_seen_ip
      }),
      acceptLabel: (0, _languageHandler._t)("Check your devices"),
      onAccept,
      rejectLabel: (0, _languageHandler._t)("Later"),
      onReject
    },
    component: _GenericToast.default,
    priority: 80
  });
};

exports.showToast = showToast;

const hideToast = deviceId => {
  _ToastStore.default.sharedInstance().dismissToast(toastKey(deviceId));
};

exports.hideToast = hideToast;
//# sourceMappingURL=UnverifiedSessionToast.js.map