"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useConnectedMembers = exports.removeOurDevice = exports.getGroupCall = exports.fixStuckDevices = exports.STUCK_DEVICE_TIMEOUT_MS = exports.CALL_STATE_EVENT_TYPE = exports.CALL_MEMBER_STATE_EVENT_TYPE = void 0;

var _matrix = require("matrix-js-sdk/src/matrix");

var _NamespacedValue = require("matrix-js-sdk/src/NamespacedValue");

var _utils = require("matrix-js-sdk/src/utils");

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
const STUCK_DEVICE_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour

exports.STUCK_DEVICE_TIMEOUT_MS = STUCK_DEVICE_TIMEOUT_MS;
const CALL_STATE_EVENT_TYPE = new _NamespacedValue.UnstableValue("m.call", "org.matrix.msc3401.call");
exports.CALL_STATE_EVENT_TYPE = CALL_STATE_EVENT_TYPE;
const CALL_MEMBER_STATE_EVENT_TYPE = new _NamespacedValue.UnstableValue("m.call.member", "org.matrix.msc3401.call.member");
exports.CALL_MEMBER_STATE_EVENT_TYPE = CALL_MEMBER_STATE_EVENT_TYPE;
const CALL_STATE_EVENT_TERMINATED = "m.terminated";

const getRoomState = (client, roomId) => {
  return client.getRoom(roomId)?.getLiveTimeline()?.getState?.(_matrix.EventTimeline.FORWARDS);
};
/**
 * Returns all room state events for the stable and unstable type value.
 */


const getRoomStateEvents = (client, roomId, type) => {
  const roomState = getRoomState(client, roomId);
  if (!roomState) return [];
  return [...roomState.getStateEvents(type.name), ...roomState.getStateEvents(type.altName)];
};
/**
 * Finds the latest, non-terminated call state event.
 */


const getGroupCall = (client, roomId) => {
  return getRoomStateEvents(client, roomId, CALL_STATE_EVENT_TYPE).sort((a, b) => b.getTs() - a.getTs()).find(event => {
    return !(CALL_STATE_EVENT_TERMINATED in event.getContent());
  });
};
/**
 * Finds the "m.call.member" events for an "m.call" event.
 *
 * @returns {MatrixEvent[]} non-expired "m.call.member" events for the call
 */


exports.getGroupCall = getGroupCall;

const useConnectedMembers = (client, callEvent) => {
  if (!CALL_STATE_EVENT_TYPE.matches(callEvent.getType())) return [];
  const callId = callEvent.getStateKey();
  const now = Date.now();
  return getRoomStateEvents(client, callEvent.getRoomId(), CALL_MEMBER_STATE_EVENT_TYPE).filter(callMemberEvent => {
    const {
      ["m.expires_ts"]: expiresTs,
      ["m.calls"]: calls
    } = callMemberEvent.getContent(); // state event expired

    if (expiresTs && expiresTs < now) return false;
    return !!calls?.find(call => call["m.call_id"] === callId);
  }) || [];
};
/**
 * Removes a list of devices from a call.
 * Only works for the current user's devices.
 */


exports.useConnectedMembers = useConnectedMembers;

const removeDevices = async (client, callEvent, deviceIds) => {
  if (!CALL_STATE_EVENT_TYPE.matches(callEvent.getType())) return;
  const roomId = callEvent.getRoomId();
  const roomState = getRoomState(client, roomId);
  if (!roomState) return;
  const callMemberEvent = roomState.getStateEvents(CALL_MEMBER_STATE_EVENT_TYPE.name, client.getUserId()) ?? roomState.getStateEvents(CALL_MEMBER_STATE_EVENT_TYPE.altName, client.getUserId());
  const callMemberEventContent = callMemberEvent?.getContent();

  if (!Array.isArray(callMemberEventContent?.["m.calls"]) || callMemberEventContent?.["m.calls"].length === 0) {
    return;
  } // copy the content to prevent mutations


  const newContent = (0, _utils.deepCopy)(callMemberEventContent);
  const callId = callEvent.getStateKey();
  let changed = false;
  newContent["m.calls"].forEach(call => {
    // skip other calls
    if (call["m.call_id"] !== callId) return;
    call["m.devices"] = call["m.devices"]?.filter(device => {
      if (deviceIds.includes(device["m.device_id"])) {
        changed = true;
        return false;
      }

      return true;
    });
  });

  if (changed) {
    // only send a new state event if there has been a change
    newContent["m.expires_ts"] = Date.now() + STUCK_DEVICE_TIMEOUT_MS;
    await client.sendStateEvent(roomId, CALL_MEMBER_STATE_EVENT_TYPE.name, newContent, client.getUserId());
  }
};
/**
 * Removes the current device from a call.
 */


const removeOurDevice = async (client, callEvent) => {
  return removeDevices(client, callEvent, [client.getDeviceId()]);
};
/**
 * Removes all devices of the current user that have not been seen within the STUCK_DEVICE_TIMEOUT_MS.
 * Does per default not remove the current device unless includeCurrentDevice is true.
 *
 * @param {boolean} includeCurrentDevice - Whether to include the current device of this session here.
 */


exports.removeOurDevice = removeOurDevice;

const fixStuckDevices = async (client, callEvent, includeCurrentDevice) => {
  const now = Date.now();
  const {
    devices: myDevices
  } = await client.getDevices();
  const currentDeviceId = client.getDeviceId();
  const devicesToBeRemoved = myDevices.filter(_ref => {
    let {
      last_seen_ts: lastSeenTs,
      device_id: deviceId
    } = _ref;
    return lastSeenTs && (deviceId !== currentDeviceId || includeCurrentDevice) && now - lastSeenTs > STUCK_DEVICE_TIMEOUT_MS;
  }).map(d => d.device_id);
  return removeDevices(client, callEvent, devicesToBeRemoved);
};

exports.fixStuckDevices = fixStuckDevices;
//# sourceMappingURL=GroupCallUtils.js.map