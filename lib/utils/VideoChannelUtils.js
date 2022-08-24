"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useJitsiParticipants = exports.useConnectionState = exports.useConnectedMembers = exports.removeOurDevice = exports.getVideoChannel = exports.fixStuckDevices = exports.addVideoChannel = exports.addOurDevice = exports.VIDEO_CHANNEL_MEMBER = exports.STUCK_DEVICE_TIMEOUT_MS = exports.ConnectionState = void 0;

var _react = require("react");

var _lodash = require("lodash");

var _logger = require("matrix-js-sdk/src/logger");

var _call = require("matrix-js-sdk/src/webrtc/call");

var _roomState = require("matrix-js-sdk/src/models/room-state");

var _useEventEmitter = require("../hooks/useEventEmitter");

var _WidgetStore = _interopRequireDefault(require("../stores/WidgetStore"));

var _WidgetType = require("../widgets/WidgetType");

var _WidgetUtils = _interopRequireDefault(require("./WidgetUtils"));

var _VideoChannelStore = _interopRequireWildcard(require("../stores/VideoChannelStore"));

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
const VIDEO_CHANNEL_MEMBER = "io.element.video.member";
exports.VIDEO_CHANNEL_MEMBER = VIDEO_CHANNEL_MEMBER;
const STUCK_DEVICE_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour

exports.STUCK_DEVICE_TIMEOUT_MS = STUCK_DEVICE_TIMEOUT_MS;
let ConnectionState;
exports.ConnectionState = ConnectionState;

(function (ConnectionState) {
  ConnectionState["Disconnected"] = "disconnected";
  ConnectionState["Connecting"] = "connecting";
  ConnectionState["Connected"] = "connected";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));

const getVideoChannel = roomId => {
  const apps = _WidgetStore.default.instance.getApps(roomId);

  return apps.find(app => _WidgetType.WidgetType.JITSI.matches(app.type) && app.data.isVideoChannel);
};

exports.getVideoChannel = getVideoChannel;

const addVideoChannel = async (roomId, roomName) => {
  await _WidgetUtils.default.addJitsiWidget(roomId, _call.CallType.Video, "Video channel", true, roomName);
}; // Gets the members connected to a given video room, along with a timestamp
// indicating when this data should be considered stale


exports.addVideoChannel = addVideoChannel;

const getConnectedMembers = (room, connectedLocalEcho) => {
  const members = new Set();
  const now = Date.now();
  let allExpireAt = Infinity;

  for (const e of room.currentState.getStateEvents(VIDEO_CHANNEL_MEMBER)) {
    const member = room.getMember(e.getStateKey());
    const content = e.getContent();
    let devices = Array.isArray(content.devices) ? content.devices : [];
    const expiresAt = typeof content.expires_ts === "number" ? content.expires_ts : -Infinity; // Ignore events with a timeout that's way off in the future

    const inTheFuture = expiresAt - STUCK_DEVICE_TIMEOUT_MS * 5 / 4 > now;
    const expired = expiresAt <= now || inTheFuture; // Apply local echo for the disconnected case

    if (!connectedLocalEcho && member?.userId === room.client.getUserId()) {
      devices = devices.filter(d => d !== room.client.getDeviceId());
    } // Must have a device connected, be unexpired, and still be joined to the room


    if (devices.length && !expired && member?.membership === "join") {
      members.add(member);
      if (expiresAt < allExpireAt) allExpireAt = expiresAt;
    }
  } // Apply local echo for the connected case


  if (connectedLocalEcho) members.add(room.getMember(room.client.getUserId()));
  return [members, allExpireAt];
};

const useConnectedMembers = function (room, connectedLocalEcho) {
  let throttleMs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
  const [[members, expiresAt], setState] = (0, _react.useState)(() => getConnectedMembers(room, connectedLocalEcho));
  const updateState = (0, _react.useMemo)(() => (0, _lodash.throttle)(() => {
    setState(getConnectedMembers(room, connectedLocalEcho));
  }, throttleMs, {
    leading: true,
    trailing: true
  }), [setState, room, connectedLocalEcho, throttleMs]);
  (0, _useEventEmitter.useTypedEventEmitter)(room.currentState, _roomState.RoomStateEvent.Update, updateState);
  (0, _react.useEffect)(() => {
    if (expiresAt < Infinity) {
      const timer = setTimeout(() => {
        _logger.logger.log(`Refreshing video members for ${room.roomId}`);

        updateState();
      }, expiresAt - Date.now());
      return () => clearTimeout(timer);
    }
  }, [expiresAt, updateState, room.roomId]);
  return members;
};

exports.useConnectedMembers = useConnectedMembers;

const useJitsiParticipants = room => {
  const store = _VideoChannelStore.default.instance;
  const [participants, setParticipants] = (0, _react.useState)(() => store.connected && store.roomId === room.roomId ? store.participants : []);
  (0, _useEventEmitter.useEventEmitter)(store, _VideoChannelStore.VideoChannelEvent.Disconnect, roomId => {
    if (roomId === room.roomId) setParticipants([]);
  });
  (0, _useEventEmitter.useEventEmitter)(store, _VideoChannelStore.VideoChannelEvent.Participants, (roomId, participants) => {
    if (roomId === room.roomId) setParticipants(participants);
  });
  return participants;
};

exports.useJitsiParticipants = useJitsiParticipants;

const updateDevices = async (room, fn) => {
  if (room?.getMyMembership() !== "join") return;
  const devicesState = room.currentState.getStateEvents(VIDEO_CHANNEL_MEMBER, room.client.getUserId());
  const devices = devicesState?.getContent()?.devices ?? [];
  const newDevices = fn(devices);

  if (newDevices) {
    const content = {
      devices: newDevices,
      expires_ts: Date.now() + STUCK_DEVICE_TIMEOUT_MS
    };
    await room.client.sendStateEvent(room.roomId, VIDEO_CHANNEL_MEMBER, content, room.client.getUserId());
  }
};

const addOurDevice = async room => {
  await updateDevices(room, devices => Array.from(new Set(devices).add(room.client.getDeviceId())));
};

exports.addOurDevice = addOurDevice;

const removeOurDevice = async room => {
  await updateDevices(room, devices => {
    const devicesSet = new Set(devices);
    devicesSet.delete(room.client.getDeviceId());
    return Array.from(devicesSet);
  });
};
/**
 * Fixes devices that may have gotten stuck in video channel member state after
 * an unclean disconnection, by filtering out logged out devices, inactive
 * devices, and our own device (if we're disconnected).
 * @param {Room} room The room to fix
 * @param {boolean} connectedLocalEcho Local echo of whether this device is connected
 */


exports.removeOurDevice = removeOurDevice;

const fixStuckDevices = async (room, connectedLocalEcho) => {
  const now = Date.now();
  const {
    devices: myDevices
  } = await room.client.getDevices();
  const deviceMap = new Map(myDevices.map(d => [d.device_id, d]));
  await updateDevices(room, devices => {
    const newDevices = devices.filter(d => {
      const device = deviceMap.get(d);
      return device?.last_seen_ts && !(d === room.client.getDeviceId() && !connectedLocalEcho) && now - device.last_seen_ts < STUCK_DEVICE_TIMEOUT_MS;
    }); // Skip the update if the devices are unchanged

    return newDevices.length === devices.length ? null : newDevices;
  });
};

exports.fixStuckDevices = fixStuckDevices;

const useConnectionState = room => {
  const store = _VideoChannelStore.default.instance;
  const [state, setState] = (0, _react.useState)(() => store.roomId === room.roomId ? store.connected ? ConnectionState.Connected : ConnectionState.Connecting : ConnectionState.Disconnected);
  (0, _useEventEmitter.useEventEmitter)(store, _VideoChannelStore.VideoChannelEvent.Disconnect, roomId => {
    if (roomId === room.roomId) setState(ConnectionState.Disconnected);
  });
  (0, _useEventEmitter.useEventEmitter)(store, _VideoChannelStore.VideoChannelEvent.StartConnect, roomId => {
    if (roomId === room.roomId) setState(ConnectionState.Connecting);
  });
  (0, _useEventEmitter.useEventEmitter)(store, _VideoChannelStore.VideoChannelEvent.Connect, roomId => {
    if (roomId === room.roomId) setState(ConnectionState.Connected);
  });
  return state;
};

exports.useConnectionState = useConnectionState;
//# sourceMappingURL=VideoChannelUtils.js.map