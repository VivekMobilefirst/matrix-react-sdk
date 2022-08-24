"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WidgetPermissionStore = exports.OIDCState = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _matrixWidgetApi = require("matrix-widget-api");

var _SettingsStore = _interopRequireDefault(require("../../settings/SettingsStore"));

var _MatrixClientPeg = require("../../MatrixClientPeg");

var _SettingLevel = require("../../settings/SettingLevel");

/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let OIDCState;
exports.OIDCState = OIDCState;

(function (OIDCState) {
  OIDCState[OIDCState["Allowed"] = 0] = "Allowed";
  OIDCState[OIDCState["Denied"] = 1] = "Denied";
  OIDCState[OIDCState["Unknown"] = 2] = "Unknown";
})(OIDCState || (exports.OIDCState = OIDCState = {}));

class WidgetPermissionStore {
  constructor() {}

  static get instance() {
    if (!WidgetPermissionStore.internalInstance) {
      WidgetPermissionStore.internalInstance = new WidgetPermissionStore();
    }

    return WidgetPermissionStore.internalInstance;
  } // TODO (all functions here): Merge widgetKind with the widget definition


  packSettingKey(widget, kind, roomId) {
    let location = roomId;

    if (kind !== _matrixWidgetApi.WidgetKind.Room) {
      location = _MatrixClientPeg.MatrixClientPeg.get().getUserId();
    }

    if (kind === _matrixWidgetApi.WidgetKind.Modal) {
      location = '*MODAL*-' + location; // to guarantee differentiation from whatever spawned it
    }

    if (!location) {
      throw new Error("Failed to determine a location to check the widget's OIDC state with");
    }

    return encodeURIComponent(`${location}::${widget.templateUrl}`);
  }

  getOIDCState(widget, kind, roomId) {
    const settingsKey = this.packSettingKey(widget, kind, roomId);

    const settings = _SettingsStore.default.getValue("widgetOpenIDPermissions");

    if (settings?.deny?.includes(settingsKey)) {
      return OIDCState.Denied;
    }

    if (settings?.allow?.includes(settingsKey)) {
      return OIDCState.Allowed;
    }

    return OIDCState.Unknown;
  }

  setOIDCState(widget, kind, roomId, newState) {
    const settingsKey = this.packSettingKey(widget, kind, roomId);

    const currentValues = _SettingsStore.default.getValue("widgetOpenIDPermissions");

    if (!currentValues.allow) currentValues.allow = [];
    if (!currentValues.deny) currentValues.deny = [];

    if (newState === OIDCState.Allowed) {
      currentValues.allow.push(settingsKey);
    } else if (newState === OIDCState.Denied) {
      currentValues.deny.push(settingsKey);
    } else {
      currentValues.allow = currentValues.allow.filter(c => c !== settingsKey);
      currentValues.deny = currentValues.deny.filter(c => c !== settingsKey);
    }

    _SettingsStore.default.setValue("widgetOpenIDPermissions", null, _SettingLevel.SettingLevel.DEVICE, currentValues);
  }

}

exports.WidgetPermissionStore = WidgetPermissionStore;
(0, _defineProperty2.default)(WidgetPermissionStore, "internalInstance", void 0);
//# sourceMappingURL=WidgetPermissionStore.js.map