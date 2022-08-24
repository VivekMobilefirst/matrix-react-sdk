"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _logger = require("matrix-js-sdk/src/logger");

var _crypto = require("matrix-js-sdk/src/crypto");

var _matrix = require("matrix-js-sdk/src/matrix");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _dispatcher = _interopRequireDefault(require("./dispatcher/dispatcher"));

var _BulkUnverifiedSessionsToast = require("./toasts/BulkUnverifiedSessionsToast");

var _SetupEncryptionToast = require("./toasts/SetupEncryptionToast");

var _UnverifiedSessionToast = require("./toasts/UnverifiedSessionToast");

var _SecurityManager = require("./SecurityManager");

var _WellKnownUtils = require("./utils/WellKnownUtils");

var _actions = require("./dispatcher/actions");

var _login = require("./utils/login");

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
const KEY_BACKUP_POLL_INTERVAL = 5 * 60 * 1000;

class DeviceListener {
  constructor() {
    (0, _defineProperty2.default)(this, "dispatcherRef", void 0);
    (0, _defineProperty2.default)(this, "dismissed", new Set());
    (0, _defineProperty2.default)(this, "dismissedThisDeviceToast", false);
    (0, _defineProperty2.default)(this, "keyBackupInfo", null);
    (0, _defineProperty2.default)(this, "keyBackupFetchedAt", null);
    (0, _defineProperty2.default)(this, "keyBackupStatusChecked", false);
    (0, _defineProperty2.default)(this, "ourDeviceIdsAtStart", null);
    (0, _defineProperty2.default)(this, "displayingToastsForDeviceIds", new Set());
    (0, _defineProperty2.default)(this, "running", false);
    (0, _defineProperty2.default)(this, "onWillUpdateDevices", async (users, initialFetch) => {
      // If we didn't know about *any* devices before (ie. it's fresh login),
      // then they are all pre-existing devices, so ignore this and set the
      // devicesAtStart list to the devices that we see after the fetch.
      if (initialFetch) return;

      const myUserId = _MatrixClientPeg.MatrixClientPeg.get().getUserId();

      if (users.includes(myUserId)) this.ensureDeviceIdsAtStartPopulated(); // No need to do a recheck here: we just need to get a snapshot of our devices
      // before we download any new ones.
    });
    (0, _defineProperty2.default)(this, "onDevicesUpdated", users => {
      if (!users.includes(_MatrixClientPeg.MatrixClientPeg.get().getUserId())) return;
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onDeviceVerificationChanged", userId => {
      if (userId !== _MatrixClientPeg.MatrixClientPeg.get().getUserId()) return;
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onUserTrustStatusChanged", userId => {
      if (userId !== _MatrixClientPeg.MatrixClientPeg.get().getUserId()) return;
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onCrossSingingKeysChanged", () => {
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onAccountData", ev => {
      // User may have:
      // * migrated SSSS to symmetric
      // * uploaded keys to secret storage
      // * completed secret storage creation
      // which result in account data changes affecting checks below.
      if (ev.getType().startsWith('m.secret_storage.') || ev.getType().startsWith('m.cross_signing.') || ev.getType() === 'm.megolm_backup.v1') {
        this.recheck();
      }
    });
    (0, _defineProperty2.default)(this, "onSync", (state, prevState) => {
      if (state === 'PREPARED' && prevState === null) {
        this.recheck();
      }
    });
    (0, _defineProperty2.default)(this, "onRoomStateEvents", ev => {
      if (ev.getType() !== _matrix.EventType.RoomEncryption) return; // If a room changes to encrypted, re-check as it may be our first
      // encrypted room. This also catches encrypted room creation as well.

      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onAction", _ref => {
      let {
        action
      } = _ref;
      if (action !== _actions.Action.OnLoggedIn) return;
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "checkKeyBackupStatus", async () => {
      if (this.keyBackupStatusChecked) {
        return;
      } // returns null when key backup status hasn't finished being checked


      const isKeyBackupEnabled = _MatrixClientPeg.MatrixClientPeg.get().getKeyBackupEnabled();

      this.keyBackupStatusChecked = isKeyBackupEnabled !== null;

      if (isKeyBackupEnabled === false) {
        _dispatcher.default.dispatch({
          action: _actions.Action.ReportKeyBackupNotEnabled
        });
      }
    });
  }

  static sharedInstance() {
    if (!window.mxDeviceListener) window.mxDeviceListener = new DeviceListener();
    return window.mxDeviceListener;
  }

  start() {
    this.running = true;

    _MatrixClientPeg.MatrixClientPeg.get().on(_crypto.CryptoEvent.WillUpdateDevices, this.onWillUpdateDevices);

    _MatrixClientPeg.MatrixClientPeg.get().on(_crypto.CryptoEvent.DevicesUpdated, this.onDevicesUpdated);

    _MatrixClientPeg.MatrixClientPeg.get().on(_crypto.CryptoEvent.DeviceVerificationChanged, this.onDeviceVerificationChanged);

    _MatrixClientPeg.MatrixClientPeg.get().on(_crypto.CryptoEvent.UserTrustStatusChanged, this.onUserTrustStatusChanged);

    _MatrixClientPeg.MatrixClientPeg.get().on(_crypto.CryptoEvent.KeysChanged, this.onCrossSingingKeysChanged);

    _MatrixClientPeg.MatrixClientPeg.get().on(_matrix.ClientEvent.AccountData, this.onAccountData);

    _MatrixClientPeg.MatrixClientPeg.get().on(_matrix.ClientEvent.Sync, this.onSync);

    _MatrixClientPeg.MatrixClientPeg.get().on(_matrix.RoomStateEvent.Events, this.onRoomStateEvents);

    this.dispatcherRef = _dispatcher.default.register(this.onAction);
    this.recheck();
  }

  stop() {
    this.running = false;

    if (_MatrixClientPeg.MatrixClientPeg.get()) {
      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_crypto.CryptoEvent.WillUpdateDevices, this.onWillUpdateDevices);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_crypto.CryptoEvent.DevicesUpdated, this.onDevicesUpdated);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_crypto.CryptoEvent.DeviceVerificationChanged, this.onDeviceVerificationChanged);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_crypto.CryptoEvent.UserTrustStatusChanged, this.onUserTrustStatusChanged);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_crypto.CryptoEvent.KeysChanged, this.onCrossSingingKeysChanged);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_matrix.ClientEvent.AccountData, this.onAccountData);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_matrix.ClientEvent.Sync, this.onSync);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_matrix.RoomStateEvent.Events, this.onRoomStateEvents);
    }

    if (this.dispatcherRef) {
      _dispatcher.default.unregister(this.dispatcherRef);

      this.dispatcherRef = null;
    }

    this.dismissed.clear();
    this.dismissedThisDeviceToast = false;
    this.keyBackupInfo = null;
    this.keyBackupFetchedAt = null;
    this.keyBackupStatusChecked = false;
    this.ourDeviceIdsAtStart = null;
    this.displayingToastsForDeviceIds = new Set();
  }
  /**
   * Dismiss notifications about our own unverified devices
   *
   * @param {String[]} deviceIds List of device IDs to dismiss notifications for
   */


  async dismissUnverifiedSessions(deviceIds) {
    _logger.logger.log("Dismissing unverified sessions: " + Array.from(deviceIds).join(','));

    for (const d of deviceIds) {
      this.dismissed.add(d);
    }

    this.recheck();
  }

  dismissEncryptionSetup() {
    this.dismissedThisDeviceToast = true;
    this.recheck();
  }

  ensureDeviceIdsAtStartPopulated() {
    if (this.ourDeviceIdsAtStart === null) {
      const cli = _MatrixClientPeg.MatrixClientPeg.get();

      this.ourDeviceIdsAtStart = new Set(cli.getStoredDevicesForUser(cli.getUserId()).map(d => d.deviceId));
    }
  }

  // The server doesn't tell us when key backup is set up, so we poll
  // & cache the result
  async getKeyBackupInfo() {
    const now = new Date().getTime();

    if (!this.keyBackupInfo || this.keyBackupFetchedAt < now - KEY_BACKUP_POLL_INTERVAL) {
      this.keyBackupInfo = await _MatrixClientPeg.MatrixClientPeg.get().getKeyBackupVersion();
      this.keyBackupFetchedAt = now;
    }

    return this.keyBackupInfo;
  }

  shouldShowSetupEncryptionToast() {
    // If we're in the middle of a secret storage operation, we're likely
    // modifying the state involved here, so don't add new toasts to setup.
    if ((0, _SecurityManager.isSecretStorageBeingAccessed)()) return false; // Show setup toasts once the user is in at least one encrypted room.

    const cli = _MatrixClientPeg.MatrixClientPeg.get();

    return cli && cli.getRooms().some(r => cli.isRoomEncrypted(r.roomId));
  }

  async recheck() {
    if (!this.running) return; // we have been stopped

    const cli = _MatrixClientPeg.MatrixClientPeg.get();

    if (!(await cli.doesServerSupportUnstableFeature("org.matrix.e2e_cross_signing"))) return;
    if (!cli.isCryptoEnabled()) return; // don't recheck until the initial sync is complete: lots of account data events will fire
    // while the initial sync is processing and we don't need to recheck on each one of them
    // (we add a listener on sync to do once check after the initial sync is done)

    if (!cli.isInitialSyncComplete()) return;
    const crossSigningReady = await cli.isCrossSigningReady();
    const secretStorageReady = await cli.isSecretStorageReady();
    const allSystemsReady = crossSigningReady && secretStorageReady;

    if (this.dismissedThisDeviceToast || allSystemsReady) {
      (0, _SetupEncryptionToast.hideToast)();
      this.checkKeyBackupStatus();
    } else if (this.shouldShowSetupEncryptionToast()) {
      // make sure our keys are finished downloading
      await cli.downloadKeys([cli.getUserId()]); // cross signing isn't enabled - nag to enable it
      // There are 3 different toasts for:

      if (!cli.getCrossSigningId() && cli.getStoredCrossSigningForUser(cli.getUserId())) {
        // Cross-signing on account but this device doesn't trust the master key (verify this session)
        (0, _SetupEncryptionToast.showToast)(_SetupEncryptionToast.Kind.VERIFY_THIS_SESSION);
        this.checkKeyBackupStatus();
      } else {
        const backupInfo = await this.getKeyBackupInfo();

        if (backupInfo) {
          // No cross-signing on account but key backup available (upgrade encryption)
          (0, _SetupEncryptionToast.showToast)(_SetupEncryptionToast.Kind.UPGRADE_ENCRYPTION);
        } else {
          // No cross-signing or key backup on account (set up encryption)
          await cli.waitForClientWellKnown();

          if ((0, _WellKnownUtils.isSecureBackupRequired)() && (0, _login.isLoggedIn)()) {
            // If we're meant to set up, and Secure Backup is required,
            // trigger the flow directly without a toast once logged in.
            (0, _SetupEncryptionToast.hideToast)();
            (0, _SecurityManager.accessSecretStorage)();
          } else {
            (0, _SetupEncryptionToast.showToast)(_SetupEncryptionToast.Kind.SET_UP_ENCRYPTION);
          }
        }
      }
    } // This needs to be done after awaiting on downloadKeys() above, so
    // we make sure we get the devices after the fetch is done.


    this.ensureDeviceIdsAtStartPopulated(); // Unverified devices that were there last time the app ran
    // (technically could just be a boolean: we don't actually
    // need to remember the device IDs, but for the sake of
    // symmetry...).

    const oldUnverifiedDeviceIds = new Set(); // Unverified devices that have appeared since then

    const newUnverifiedDeviceIds = new Set(); // as long as cross-signing isn't ready,
    // you can't see or dismiss any device toasts

    if (crossSigningReady) {
      const devices = cli.getStoredDevicesForUser(cli.getUserId());

      for (const device of devices) {
        if (device.deviceId === cli.deviceId) continue;
        const deviceTrust = await cli.checkDeviceTrust(cli.getUserId(), device.deviceId);

        if (!deviceTrust.isCrossSigningVerified() && !this.dismissed.has(device.deviceId)) {
          if (this.ourDeviceIdsAtStart.has(device.deviceId)) {
            oldUnverifiedDeviceIds.add(device.deviceId);
          } else {
            newUnverifiedDeviceIds.add(device.deviceId);
          }
        }
      }
    }

    _logger.logger.debug("Old unverified sessions: " + Array.from(oldUnverifiedDeviceIds).join(','));

    _logger.logger.debug("New unverified sessions: " + Array.from(newUnverifiedDeviceIds).join(','));

    _logger.logger.debug("Currently showing toasts for: " + Array.from(this.displayingToastsForDeviceIds).join(',')); // Display or hide the batch toast for old unverified sessions


    if (oldUnverifiedDeviceIds.size > 0) {
      (0, _BulkUnverifiedSessionsToast.showToast)(oldUnverifiedDeviceIds);
    } else {
      (0, _BulkUnverifiedSessionsToast.hideToast)();
    } // Show toasts for new unverified devices if they aren't already there


    for (const deviceId of newUnverifiedDeviceIds) {
      (0, _UnverifiedSessionToast.showToast)(deviceId);
    } // ...and hide any we don't need any more


    for (const deviceId of this.displayingToastsForDeviceIds) {
      if (!newUnverifiedDeviceIds.has(deviceId)) {
        _logger.logger.debug("Hiding unverified session toast for " + deviceId);

        (0, _UnverifiedSessionToast.hideToast)(deviceId);
      }
    }

    this.displayingToastsForDeviceIds = newUnverifiedDeviceIds;
  }

}

exports.default = DeviceListener;
//# sourceMappingURL=DeviceListener.js.map