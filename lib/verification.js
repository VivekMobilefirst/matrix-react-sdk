"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.legacyVerifyUser = legacyVerifyUser;
exports.pendingVerificationRequestForUser = pendingVerificationRequestForUser;
exports.verifyDevice = verifyDevice;
exports.verifyUser = verifyUser;

var _crypto = require("matrix-js-sdk/src/crypto");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _dispatcher = _interopRequireDefault(require("./dispatcher/dispatcher"));

var _Modal = _interopRequireDefault(require("./Modal"));

var _RightPanelStorePhases = require("./stores/right-panel/RightPanelStorePhases");

var _SecurityManager = require("./SecurityManager");

var _UntrustedDeviceDialog = _interopRequireDefault(require("./components/views/dialogs/UntrustedDeviceDialog"));

var _ManualDeviceKeyVerificationDialog = _interopRequireDefault(require("./components/views/dialogs/ManualDeviceKeyVerificationDialog"));

var _RightPanelStore = _interopRequireDefault(require("./stores/right-panel/RightPanelStore"));

var _findDMForUser = require("./utils/dm/findDMForUser");

/*
Copyright 2019, 2020, 2021 The Matrix.org Foundation C.I.C.

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
async function enable4SIfNeeded() {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  if (!cli.isCryptoEnabled()) {
    return false;
  }

  const usk = cli.getCrossSigningId("user_signing");

  if (!usk) {
    await (0, _SecurityManager.accessSecretStorage)();
    return false;
  }

  return true;
}

async function verifyDevice(user, device) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  if (cli.isGuest()) {
    _dispatcher.default.dispatch({
      action: 'require_registration'
    });

    return;
  } // if cross-signing is not explicitly disabled, check if it should be enabled first.


  if (cli.getCryptoTrustCrossSignedDevices()) {
    if (!(await enable4SIfNeeded())) {
      return;
    }
  }

  _Modal.default.createDialog(_UntrustedDeviceDialog.default, {
    user,
    device,
    onFinished: async action => {
      if (action === "sas") {
        const verificationRequestPromise = cli.legacyDeviceVerification(user.userId, device.deviceId, _crypto.verificationMethods.SAS);
        setRightPanel({
          member: user,
          verificationRequestPromise
        });
      } else if (action === "legacy") {
        _Modal.default.createDialog(_ManualDeviceKeyVerificationDialog.default, {
          userId: user.userId,
          device
        });
      }
    }
  });
}

async function legacyVerifyUser(user) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  if (cli.isGuest()) {
    _dispatcher.default.dispatch({
      action: 'require_registration'
    });

    return;
  } // if cross-signing is not explicitly disabled, check if it should be enabled first.


  if (cli.getCryptoTrustCrossSignedDevices()) {
    if (!(await enable4SIfNeeded())) {
      return;
    }
  }

  const verificationRequestPromise = cli.requestVerification(user.userId);
  setRightPanel({
    member: user,
    verificationRequestPromise
  });
}

async function verifyUser(user) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  if (cli.isGuest()) {
    _dispatcher.default.dispatch({
      action: 'require_registration'
    });

    return;
  }

  if (!(await enable4SIfNeeded())) {
    return;
  }

  const existingRequest = pendingVerificationRequestForUser(user);
  setRightPanel({
    member: user,
    verificationRequest: existingRequest
  });
}

function setRightPanel(state) {
  if (_RightPanelStore.default.instance.roomPhaseHistory.some(card => card.phase == _RightPanelStorePhases.RightPanelPhases.RoomSummary)) {
    _RightPanelStore.default.instance.pushCard({
      phase: _RightPanelStorePhases.RightPanelPhases.EncryptionPanel,
      state
    });
  } else {
    _RightPanelStore.default.instance.setCards([{
      phase: _RightPanelStorePhases.RightPanelPhases.RoomSummary
    }, {
      phase: _RightPanelStorePhases.RightPanelPhases.RoomMemberInfo,
      state: {
        member: state.member
      }
    }, {
      phase: _RightPanelStorePhases.RightPanelPhases.EncryptionPanel,
      state
    }]);
  }
}

function pendingVerificationRequestForUser(user) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  const dmRoom = (0, _findDMForUser.findDMForUser)(cli, user.userId);

  if (dmRoom) {
    return cli.findVerificationRequestDMInProgress(dmRoom.roomId);
  }
}
//# sourceMappingURL=verification.js.map