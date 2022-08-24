"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.VideoChannelEvent = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _logger = require("matrix-js-sdk/src/logger");

var _room = require("matrix-js-sdk/src/models/room");

var _SettingsStore = _interopRequireDefault(require("../settings/SettingsStore"));

var _SettingLevel = require("../settings/SettingLevel");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _ElementWidgetActions = require("./widgets/ElementWidgetActions");

var _WidgetMessagingStore = require("./widgets/WidgetMessagingStore");

var _ActiveWidgetStore = _interopRequireWildcard(require("./ActiveWidgetStore"));

var _VideoChannelUtils = require("../utils/VideoChannelUtils");

var _promise = require("../utils/promise");

var _WidgetUtils = _interopRequireDefault(require("../utils/WidgetUtils"));

var _AsyncStoreWithClient = require("./AsyncStoreWithClient");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
let VideoChannelEvent;
exports.VideoChannelEvent = VideoChannelEvent;

(function (VideoChannelEvent) {
  VideoChannelEvent["StartConnect"] = "start_connect";
  VideoChannelEvent["Connect"] = "connect";
  VideoChannelEvent["Disconnect"] = "disconnect";
  VideoChannelEvent["Participants"] = "participants";
})(VideoChannelEvent || (exports.VideoChannelEvent = VideoChannelEvent = {}));

const TIMEOUT_MS = 16000; // Wait until an event is emitted satisfying the given predicate

const waitForEvent = async function (emitter, event) {
  let pred = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : () => true;
  let listener;
  const wait = new Promise(resolve => {
    listener = function () {
      if (pred(...arguments)) resolve();
    };

    emitter.on(event, listener);
  });
  const timedOut = (await (0, _promise.timeout)(wait, false, TIMEOUT_MS)) === false;
  emitter.off(event, listener);
  if (timedOut) throw new Error("Timed out");
};
/*
 * Holds information about the currently active video channel.
 */


class VideoChannelStore extends _AsyncStoreWithClient.AsyncStoreWithClient {
  static get instance() {
    if (!VideoChannelStore._instance) {
      VideoChannelStore._instance = new VideoChannelStore();
    }

    return VideoChannelStore._instance;
  }

  constructor() {
    var _this;

    super(_dispatcher.default);
    _this = this;
    (0, _defineProperty2.default)(this, "activeChannel", void 0);
    (0, _defineProperty2.default)(this, "resendDevicesTimer", void 0);
    (0, _defineProperty2.default)(this, "_connected", false);
    (0, _defineProperty2.default)(this, "_participants", []);
    (0, _defineProperty2.default)(this, "connect", async (roomId, audioDevice, videoDevice) => {
      if (this.activeChannel) await this.disconnect();
      const jitsi = (0, _VideoChannelUtils.getVideoChannel)(roomId);
      if (!jitsi) throw new Error(`No video channel in room ${roomId}`);

      const jitsiUid = _WidgetUtils.default.getWidgetUid(jitsi);

      const messagingStore = _WidgetMessagingStore.WidgetMessagingStore.instance;
      let messaging = messagingStore.getMessagingForUid(jitsiUid);

      if (!messaging) {
        // The widget might still be initializing, so wait for it
        try {
          await waitForEvent(messagingStore, _WidgetMessagingStore.WidgetMessagingStoreEvent.StoreMessaging, (uid, widgetApi) => {
            if (uid === jitsiUid) {
              messaging = widgetApi;
              return true;
            }

            return false;
          });
        } catch (e) {
          throw new Error(`Failed to bind video channel in room ${roomId}: ${e}`);
        }
      } // Now that we got the messaging, we need a way to ensure that it doesn't get stopped


      const dontStopMessaging = new Promise((resolve, reject) => {
        const listener = uid => {
          if (uid === jitsiUid) {
            cleanup();
            reject(new Error("Messaging stopped"));
          }
        };

        const done = () => {
          cleanup();
          resolve();
        };

        const cleanup = () => {
          messagingStore.off(_WidgetMessagingStore.WidgetMessagingStoreEvent.StopMessaging, listener);
          this.off(VideoChannelEvent.Connect, done);
          this.off(VideoChannelEvent.Disconnect, done);
        };

        messagingStore.on(_WidgetMessagingStore.WidgetMessagingStoreEvent.StopMessaging, listener);
        this.on(VideoChannelEvent.Connect, done);
        this.on(VideoChannelEvent.Disconnect, done);
      });

      if (!messagingStore.isWidgetReady(jitsiUid)) {
        // Wait for the widget to be ready to receive our join event
        try {
          await Promise.race([waitForEvent(messagingStore, _WidgetMessagingStore.WidgetMessagingStoreEvent.WidgetReady, uid => uid === jitsiUid), dontStopMessaging]);
        } catch (e) {
          throw new Error(`Video channel in room ${roomId} never became ready: ${e}`);
        }
      } // Participant data and mute state will come down the event pipeline quickly, so prepare in advance


      this.activeChannel = messaging;
      this.roomId = roomId;
      messaging.on(`action:${_ElementWidgetActions.ElementWidgetActions.CallParticipants}`, this.onParticipants);
      messaging.on(`action:${_ElementWidgetActions.ElementWidgetActions.MuteAudio}`, this.onMuteAudio);
      messaging.on(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteAudio}`, this.onUnmuteAudio);
      messaging.on(`action:${_ElementWidgetActions.ElementWidgetActions.MuteVideo}`, this.onMuteVideo);
      messaging.on(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteVideo}`, this.onUnmuteVideo); // Empirically, it's possible for Jitsi Meet to crash instantly at startup,
      // sending a hangup event that races with the rest of this method, so we also
      // need to add the hangup listener now rather than later

      messaging.once(`action:${_ElementWidgetActions.ElementWidgetActions.HangupCall}`, this.onHangup);
      this.emit(VideoChannelEvent.StartConnect, roomId); // Actually perform the join

      const waitForJoin = waitForEvent(messaging, `action:${_ElementWidgetActions.ElementWidgetActions.JoinCall}`, ev => {
        ev.preventDefault();
        this.ack(ev);
        return true;
      });
      messaging.transport.send(_ElementWidgetActions.ElementWidgetActions.JoinCall, {
        audioDevice: audioDevice?.label ?? null,
        videoDevice: videoDevice?.label ?? null
      });

      try {
        await Promise.race([waitForJoin, dontStopMessaging]);
      } catch (e) {
        // If it timed out, clean up our advance preparations
        this.activeChannel = null;
        this.roomId = null;
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.CallParticipants}`, this.onParticipants);
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.MuteAudio}`, this.onMuteAudio);
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteAudio}`, this.onUnmuteAudio);
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.MuteVideo}`, this.onMuteVideo);
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteVideo}`, this.onUnmuteVideo);
        messaging.off(`action:${_ElementWidgetActions.ElementWidgetActions.HangupCall}`, this.onHangup);

        if (messaging.transport.ready) {
          // The messaging still exists, which means Jitsi might still be going in the background
          messaging.transport.send(_ElementWidgetActions.ElementWidgetActions.ForceHangupCall, {});
        }

        this.emit(VideoChannelEvent.Disconnect, roomId);
        throw new Error(`Failed to join call in room ${roomId}: ${e}`);
      }

      this.connected = true;

      _ActiveWidgetStore.default.instance.on(_ActiveWidgetStore.ActiveWidgetStoreEvent.Dock, this.onDock);

      _ActiveWidgetStore.default.instance.on(_ActiveWidgetStore.ActiveWidgetStoreEvent.Undock, this.onUndock);

      this.room.on(_room.RoomEvent.MyMembership, this.onMyMembership);
      window.addEventListener("beforeunload", this.setDisconnected);
      this.emit(VideoChannelEvent.Connect, roomId); // Tell others that we're connected, by adding our device to room state

      await (0, _VideoChannelUtils.addOurDevice)(this.room); // Re-add this device every so often so our video member event doesn't become stale

      this.resendDevicesTimer = setInterval(async () => {
        _logger.logger.log(`Resending video member event for ${this.roomId}`);

        await (0, _VideoChannelUtils.addOurDevice)(this.room);
      }, _VideoChannelUtils.STUCK_DEVICE_TIMEOUT_MS * 3 / 4);
    });
    (0, _defineProperty2.default)(this, "disconnect", async () => {
      if (!this.activeChannel) throw new Error("Not connected to any video channel");
      const waitForDisconnect = waitForEvent(this, VideoChannelEvent.Disconnect);
      this.activeChannel.transport.send(_ElementWidgetActions.ElementWidgetActions.HangupCall, {});

      try {
        await waitForDisconnect; // onHangup cleans up for us
      } catch (e) {
        throw new Error(`Failed to hangup call in room ${this.roomId}: ${e}`);
      }
    });
    (0, _defineProperty2.default)(this, "setDisconnected", async () => {
      const roomId = this.roomId;
      const room = this.room;
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.CallParticipants}`, this.onParticipants);
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.MuteAudio}`, this.onMuteAudio);
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteAudio}`, this.onUnmuteAudio);
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.MuteVideo}`, this.onMuteVideo);
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.UnmuteVideo}`, this.onUnmuteVideo);
      this.activeChannel.off(`action:${_ElementWidgetActions.ElementWidgetActions.HangupCall}`, this.onHangup);

      _ActiveWidgetStore.default.instance.off(_ActiveWidgetStore.ActiveWidgetStoreEvent.Dock, this.onDock);

      _ActiveWidgetStore.default.instance.off(_ActiveWidgetStore.ActiveWidgetStoreEvent.Undock, this.onUndock);

      room.off(_room.RoomEvent.MyMembership, this.onMyMembership);
      window.removeEventListener("beforeunload", this.setDisconnected);
      clearInterval(this.resendDevicesTimer);
      this.activeChannel = null;
      this.roomId = null;
      this.connected = false;
      this.participants = [];
      this.emit(VideoChannelEvent.Disconnect, roomId); // Tell others that we're disconnected, by removing our device from room state

      await (0, _VideoChannelUtils.removeOurDevice)(room);
    });
    (0, _defineProperty2.default)(this, "ack", function (ev) {
      let messaging = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _this.activeChannel;
      // Even if we don't have a reply to a given widget action, we still need
      // to give the widget API something to acknowledge receipt
      messaging.transport.reply(ev.detail, {});
    });
    (0, _defineProperty2.default)(this, "onHangup", async ev => {
      ev.preventDefault();
      const messaging = this.activeChannel; // In case this hangup is caused by Jitsi Meet crashing at startup,
      // wait for the connection event in order to avoid racing

      if (!this.connected) await waitForEvent(this, VideoChannelEvent.Connect);
      await this.setDisconnected();
      this.ack(ev, messaging);
    });
    (0, _defineProperty2.default)(this, "onParticipants", ev => {
      ev.preventDefault();
      this.participants = ev.detail.data.participants;
      this.emit(VideoChannelEvent.Participants, this.roomId, ev.detail.data.participants);
      this.ack(ev);
    });
    (0, _defineProperty2.default)(this, "onMuteAudio", ev => {
      ev.preventDefault();
      this.audioMuted = true;
      this.ack(ev);
    });
    (0, _defineProperty2.default)(this, "onUnmuteAudio", ev => {
      ev.preventDefault();
      this.audioMuted = false;
      this.ack(ev);
    });
    (0, _defineProperty2.default)(this, "onMuteVideo", ev => {
      ev.preventDefault();
      this.videoMuted = true;
      this.ack(ev);
    });
    (0, _defineProperty2.default)(this, "onUnmuteVideo", ev => {
      ev.preventDefault();
      this.videoMuted = false;
      this.ack(ev);
    });
    (0, _defineProperty2.default)(this, "onMyMembership", (room, membership) => {
      if (membership !== "join") this.setDisconnected();
    });
    (0, _defineProperty2.default)(this, "onDock", async () => {
      // The widget is no longer a PiP, so let's restore the default layout
      await this.activeChannel.transport.send(_ElementWidgetActions.ElementWidgetActions.TileLayout, {});
    });
    (0, _defineProperty2.default)(this, "onUndock", async () => {
      // The widget has become a PiP, so let's switch Jitsi to spotlight mode
      // to only show the active speaker and economize on space
      await this.activeChannel.transport.send(_ElementWidgetActions.ElementWidgetActions.SpotlightLayout, {});
    });
  }

  async onAction(payload) {// nothing to do
  }

  // This is persisted to settings so we can detect unclean disconnects
  get roomId() {
    return _SettingsStore.default.getValue("videoChannelRoomId");
  }

  set roomId(value) {
    _SettingsStore.default.setValue("videoChannelRoomId", null, _SettingLevel.SettingLevel.DEVICE, value);
  }

  get room() {
    return this.matrixClient.getRoom(this.roomId);
  }

  get connected() {
    return this._connected;
  }

  set connected(value) {
    this._connected = value;
  }

  get participants() {
    return this._participants;
  }

  set participants(value) {
    this._participants = value;
  }

  get audioMuted() {
    return _SettingsStore.default.getValue("audioInputMuted");
  }

  set audioMuted(value) {
    _SettingsStore.default.setValue("audioInputMuted", null, _SettingLevel.SettingLevel.DEVICE, value);
  }

  get videoMuted() {
    return _SettingsStore.default.getValue("videoInputMuted");
  }

  set videoMuted(value) {
    _SettingsStore.default.setValue("videoInputMuted", null, _SettingLevel.SettingLevel.DEVICE, value);
  }

}

exports.default = VideoChannelStore;
(0, _defineProperty2.default)(VideoChannelStore, "_instance", void 0);
//# sourceMappingURL=VideoChannelStore.js.map