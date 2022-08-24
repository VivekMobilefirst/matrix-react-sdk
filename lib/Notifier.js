"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Notifier = void 0;

var _event = require("matrix-js-sdk/src/models/event");

var _room = require("matrix-js-sdk/src/models/room");

var _client = require("matrix-js-sdk/src/client");

var _logger = require("matrix-js-sdk/src/logger");

var _event2 = require("matrix-js-sdk/src/@types/event");

var _location = require("matrix-js-sdk/src/@types/location");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _PosthogAnalytics = require("./PosthogAnalytics");

var _SdkConfig = _interopRequireDefault(require("./SdkConfig"));

var _PlatformPeg = _interopRequireDefault(require("./PlatformPeg"));

var TextForEvent = _interopRequireWildcard(require("./TextForEvent"));

var Avatar = _interopRequireWildcard(require("./Avatar"));

var _dispatcher = _interopRequireDefault(require("./dispatcher/dispatcher"));

var _languageHandler = require("./languageHandler");

var _Modal = _interopRequireDefault(require("./Modal"));

var _SettingsStore = _interopRequireDefault(require("./settings/SettingsStore"));

var _DesktopNotificationsToast = require("./toasts/DesktopNotificationsToast");

var _SettingLevel = require("./settings/SettingLevel");

var _NotificationControllers = require("./settings/controllers/NotificationControllers");

var _RoomViewStore = require("./stores/RoomViewStore");

var _UserActivity = _interopRequireDefault(require("./UserActivity"));

var _Media = require("./customisations/Media");

var _ErrorDialog = _interopRequireDefault(require("./components/views/dialogs/ErrorDialog"));

var _CallHandler = _interopRequireDefault(require("./CallHandler"));

var _VoipUserMapper = _interopRequireDefault(require("./VoipUserMapper"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
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

/*
 * Dispatches:
 * {
 *   action: "notifier_enabled",
 *   value: boolean
 * }
 */
const MAX_PENDING_ENCRYPTED = 20;
/*
Override both the content body and the TextForEvent handler for specific msgtypes, in notifications.
This is useful when the content body contains fallback text that would explain that the client can't handle a particular
type of tile.
*/

const msgTypeHandlers = {
  [_event2.MsgType.KeyVerificationRequest]: event => {
    const name = (event.sender || {}).name;
    return (0, _languageHandler._t)("%(name)s is requesting verification", {
      name
    });
  },
  [_location.M_LOCATION.name]: event => {
    return TextForEvent.textForLocationEvent(event)();
  },
  [_location.M_LOCATION.altName]: event => {
    return TextForEvent.textForLocationEvent(event)();
  }
};
const Notifier = {
  notifsByRoom: {},
  // A list of event IDs that we've received but need to wait until
  // they're decrypted until we decide whether to notify for them
  // or not
  pendingEncryptedEventIds: [],
  notificationMessageForEvent: function (ev) {
    if (msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
      return msgTypeHandlers[ev.getContent().msgtype](ev);
    }

    return TextForEvent.textForEvent(ev);
  },
  _displayPopupNotification: function (ev, room) {
    const plaf = _PlatformPeg.default.get();

    if (!plaf) {
      return;
    }

    if (!plaf.supportsNotifications() || !plaf.maySendNotifications()) {
      return;
    }

    let msg = this.notificationMessageForEvent(ev);
    if (!msg) return;
    let title;

    if (!ev.sender || room.name === ev.sender.name) {
      title = room.name; // notificationMessageForEvent includes sender,
      // but we already have the sender here

      if (ev.getContent().body && !msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
        msg = ev.getContent().body;
      }
    } else if (ev.getType() === 'm.room.member') {
      // context is all in the message here, we don't need
      // to display sender info
      title = room.name;
    } else if (ev.sender) {
      title = ev.sender.name + " (" + room.name + ")"; // notificationMessageForEvent includes sender,
      // but we've just out sender in the title

      if (ev.getContent().body && !msgTypeHandlers.hasOwnProperty(ev.getContent().msgtype)) {
        msg = ev.getContent().body;
      }
    }

    if (!this.isBodyEnabled()) {
      msg = '';
    }

    let avatarUrl = null;

    if (ev.sender && !_SettingsStore.default.getValue("lowBandwidth")) {
      avatarUrl = Avatar.avatarUrlForMember(ev.sender, 40, 40, 'crop');
    }

    const notif = plaf.displayNotification(title, msg, avatarUrl, room, ev); // if displayNotification returns non-null,  the platform supports
    // clearing notifications later, so keep track of this.

    if (notif) {
      if (this.notifsByRoom[ev.getRoomId()] === undefined) this.notifsByRoom[ev.getRoomId()] = [];
      this.notifsByRoom[ev.getRoomId()].push(notif);
    }
  },
  getSoundForRoom: function (roomId) {
    // We do no caching here because the SDK caches setting
    // and the browser will cache the sound.
    const content = _SettingsStore.default.getValue("notificationSound", roomId);

    if (!content) {
      return null;
    }

    if (!content.url) {
      _logger.logger.warn(`${roomId} has custom notification sound event, but no url key`);

      return null;
    }

    if (!content.url.startsWith("mxc://")) {
      _logger.logger.warn(`${roomId} has custom notification sound event, but url is not a mxc url`);

      return null;
    } // Ideally in here we could use MSC1310 to detect the type of file, and reject it.


    return {
      url: (0, _Media.mediaFromMxc)(content.url).srcHttp,
      name: content.name,
      type: content.type,
      size: content.size
    };
  },
  _playAudioNotification: async function (ev, room) {
    const sound = this.getSoundForRoom(room.roomId);

    _logger.logger.log(`Got sound ${sound && sound.name || "default"} for ${room.roomId}`);

    try {
      const selector = document.querySelector(sound ? `audio[src='${sound.url}']` : "#messageAudio");
      let audioElement = selector;

      if (!selector) {
        if (!sound) {
          _logger.logger.error("No audio element or sound to play for notification");

          return;
        }

        audioElement = new Audio(sound.url);

        if (sound.type) {
          audioElement.type = sound.type;
        }

        document.body.appendChild(audioElement);
      }

      await audioElement.play();
    } catch (ex) {
      _logger.logger.warn("Caught error when trying to fetch room notification sound:", ex);
    }
  },
  start: function () {
    // do not re-bind in the case of repeated call
    this.boundOnEvent = this.boundOnEvent || this.onEvent.bind(this);
    this.boundOnSyncStateChange = this.boundOnSyncStateChange || this.onSyncStateChange.bind(this);
    this.boundOnRoomReceipt = this.boundOnRoomReceipt || this.onRoomReceipt.bind(this);
    this.boundOnEventDecrypted = this.boundOnEventDecrypted || this.onEventDecrypted.bind(this);

    _MatrixClientPeg.MatrixClientPeg.get().on(_client.ClientEvent.Event, this.boundOnEvent);

    _MatrixClientPeg.MatrixClientPeg.get().on(_room.RoomEvent.Receipt, this.boundOnRoomReceipt);

    _MatrixClientPeg.MatrixClientPeg.get().on(_event.MatrixEventEvent.Decrypted, this.boundOnEventDecrypted);

    _MatrixClientPeg.MatrixClientPeg.get().on(_client.ClientEvent.Sync, this.boundOnSyncStateChange);

    this.toolbarHidden = false;
    this.isSyncing = false;
  },
  stop: function () {
    if (_MatrixClientPeg.MatrixClientPeg.get()) {
      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_client.ClientEvent.Event, this.boundOnEvent);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_room.RoomEvent.Receipt, this.boundOnRoomReceipt);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_event.MatrixEventEvent.Decrypted, this.boundOnEventDecrypted);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_client.ClientEvent.Sync, this.boundOnSyncStateChange);
    }

    this.isSyncing = false;
  },
  supportsDesktopNotifications: function () {
    const plaf = _PlatformPeg.default.get();

    return plaf && plaf.supportsNotifications();
  },
  setEnabled: function (enable, callback) {
    const plaf = _PlatformPeg.default.get();

    if (!plaf) return; // Dev note: We don't set the "notificationsEnabled" setting to true here because it is a
    // calculated value. It is determined based upon whether or not the master rule is enabled
    // and other flags. Setting it here would cause a circular reference.
    // make sure that we persist the current setting audio_enabled setting
    // before changing anything

    if (_SettingsStore.default.isLevelSupported(_SettingLevel.SettingLevel.DEVICE)) {
      _SettingsStore.default.setValue("audioNotificationsEnabled", null, _SettingLevel.SettingLevel.DEVICE, this.isEnabled());
    }

    if (enable) {
      // Attempt to get permission from user
      plaf.requestNotificationPermission().then(result => {
        if (result !== 'granted') {
          // The permission request was dismissed or denied
          // TODO: Support alternative branding in messaging
          const brand = _SdkConfig.default.get().brand;

          const description = result === 'denied' ? (0, _languageHandler._t)('%(brand)s does not have permission to send you notifications - ' + 'please check your browser settings', {
            brand
          }) : (0, _languageHandler._t)('%(brand)s was not given permission to send notifications - please try again', {
            brand
          });

          _Modal.default.createDialog(_ErrorDialog.default, {
            title: (0, _languageHandler._t)('Unable to enable Notifications'),
            description
          });

          return;
        }

        if (callback) callback();

        _PosthogAnalytics.PosthogAnalytics.instance.trackEvent({
          eventName: "PermissionChanged",
          permission: "Notification",
          granted: true
        });

        _dispatcher.default.dispatch({
          action: "notifier_enabled",
          value: true
        });
      });
    } else {
      _PosthogAnalytics.PosthogAnalytics.instance.trackEvent({
        eventName: "PermissionChanged",
        permission: "Notification",
        granted: false
      });

      _dispatcher.default.dispatch({
        action: "notifier_enabled",
        value: false
      });
    } // set the notifications_hidden flag, as the user has knowingly interacted
    // with the setting we shouldn't nag them any further


    this.setPromptHidden(true);
  },
  isEnabled: function () {
    return this.isPossible() && _SettingsStore.default.getValue("notificationsEnabled");
  },
  isPossible: function () {
    const plaf = _PlatformPeg.default.get();

    if (!plaf) return false;
    if (!plaf.supportsNotifications()) return false;
    if (!plaf.maySendNotifications()) return false;
    return true; // possible, but not necessarily enabled
  },
  isBodyEnabled: function () {
    return this.isEnabled() && _SettingsStore.default.getValue("notificationBodyEnabled");
  },
  isAudioEnabled: function () {
    // We don't route Audio via the HTML Notifications API so it is possible regardless of other things
    return _SettingsStore.default.getValue("audioNotificationsEnabled");
  },
  setPromptHidden: function (hidden) {
    let persistent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    this.toolbarHidden = hidden;
    (0, _DesktopNotificationsToast.hideToast)(); // update the info to localStorage for persistent settings

    if (persistent && global.localStorage) {
      global.localStorage.setItem("notifications_hidden", String(hidden));
    }
  },
  shouldShowPrompt: function () {
    const client = _MatrixClientPeg.MatrixClientPeg.get();

    if (!client) {
      return false;
    }

    const isGuest = client.isGuest();
    return !isGuest && this.supportsDesktopNotifications() && !(0, _NotificationControllers.isPushNotifyDisabled)() && !this.isEnabled() && !this._isPromptHidden();
  },
  _isPromptHidden: function () {
    // Check localStorage for any such meta data
    if (global.localStorage) {
      return global.localStorage.getItem("notifications_hidden") === "true";
    }

    return this.toolbarHidden;
  },
  onSyncStateChange: function (state) {
    if (state === "SYNCING") {
      this.isSyncing = true;
    } else if (state === "STOPPED" || state === "ERROR") {
      this.isSyncing = false;
    }
  },
  onEvent: function (ev) {
    if (!this.isSyncing) return; // don't alert for any messages initially

    if (ev.getSender() === _MatrixClientPeg.MatrixClientPeg.get().credentials.userId) return;

    _MatrixClientPeg.MatrixClientPeg.get().decryptEventIfNeeded(ev); // If it's an encrypted event and the type is still 'm.room.encrypted',
    // it hasn't yet been decrypted, so wait until it is.


    if (ev.isBeingDecrypted() || ev.isDecryptionFailure()) {
      this.pendingEncryptedEventIds.push(ev.getId()); // don't let the list fill up indefinitely

      while (this.pendingEncryptedEventIds.length > MAX_PENDING_ENCRYPTED) {
        this.pendingEncryptedEventIds.shift();
      }

      return;
    }

    this._evaluateEvent(ev);
  },
  onEventDecrypted: function (ev) {
    // 'decrypted' means the decryption process has finished: it may have failed,
    // in which case it might decrypt soon if the keys arrive
    if (ev.isDecryptionFailure()) return;
    const idx = this.pendingEncryptedEventIds.indexOf(ev.getId());
    if (idx === -1) return;
    this.pendingEncryptedEventIds.splice(idx, 1);

    this._evaluateEvent(ev);
  },
  onRoomReceipt: function (ev, room) {
    if (room.getUnreadNotificationCount() === 0) {
      // ideally we would clear each notification when it was read,
      // but we have no way, given a read receipt, to know whether
      // the receipt comes before or after an event, so we can't
      // do this. Instead, clear all notifications for a room once
      // there are no notifs left in that room., which is not quite
      // as good but it's something.
      const plaf = _PlatformPeg.default.get();

      if (!plaf) return;
      if (this.notifsByRoom[room.roomId] === undefined) return;

      for (const notif of this.notifsByRoom[room.roomId]) {
        plaf.clearNotification(notif);
      }

      delete this.notifsByRoom[room.roomId];
    }
  },
  _evaluateEvent: function (ev) {
    let roomId = ev.getRoomId();

    if (_CallHandler.default.instance.getSupportsVirtualRooms()) {
      // Attempt to translate a virtual room to a native one
      const nativeRoomId = _VoipUserMapper.default.sharedInstance().nativeRoomForVirtualRoom(roomId);

      if (nativeRoomId) {
        roomId = nativeRoomId;
      }
    }

    const room = _MatrixClientPeg.MatrixClientPeg.get().getRoom(roomId);

    const actions = _MatrixClientPeg.MatrixClientPeg.get().getPushActionsForEvent(ev);

    if (actions?.notify) {
      if (_RoomViewStore.RoomViewStore.instance.getRoomId() === room.roomId && _UserActivity.default.sharedInstance().userActiveRecently() && !_Modal.default.hasDialogs()) {
        // don't bother notifying as user was recently active in this room
        return;
      }

      if (this.isEnabled()) {
        this._displayPopupNotification(ev, room);
      }

      if (actions.tweaks.sound && this.isAudioEnabled()) {
        _PlatformPeg.default.get().loudNotification(ev, room);

        this._playAudioNotification(ev, room);
      }
    }
  }
};
exports.Notifier = Notifier;

if (!window.mxNotifier) {
  window.mxNotifier = Notifier;
}

var _default = window.mxNotifier;
exports.default = _default;
//# sourceMappingURL=Notifier.js.map