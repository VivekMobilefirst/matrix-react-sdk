"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _logger = require("matrix-js-sdk/src/logger");

var _event = require("matrix-js-sdk/src/@types/event");

var _createRoom = require("./createRoom");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _DMRoomMap = _interopRequireDefault(require("./utils/DMRoomMap"));

var _CallHandler = _interopRequireDefault(require("./CallHandler"));

var _callTypes = require("./call-types");

var _findDMForUser = require("./utils/dm/findDMForUser");

/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
// Functions for mapping virtual users & rooms. Currently the only lookup
// is sip virtual: there could be others in the future.
class VoipUserMapper {
  constructor() {
    (0, _defineProperty2.default)(this, "virtualToNativeRoomIdCache", new Map());
  }

  static sharedInstance() {
    if (window.mxVoipUserMapper === undefined) window.mxVoipUserMapper = new VoipUserMapper();
    return window.mxVoipUserMapper;
  }

  async userToVirtualUser(userId) {
    const results = await _CallHandler.default.instance.sipVirtualLookup(userId);
    if (results.length === 0 || !results[0].fields.lookup_success) return null;
    return results[0].userid;
  }

  async getVirtualUserForRoom(roomId) {
    const userId = _DMRoomMap.default.shared().getUserIdForRoomId(roomId);

    if (!userId) return null;
    const virtualUser = await this.userToVirtualUser(userId);
    if (!virtualUser) return null;
    return virtualUser;
  }

  async getOrCreateVirtualRoomForRoom(roomId) {
    const virtualUser = await this.getVirtualUserForRoom(roomId);
    if (!virtualUser) return null;
    const virtualRoomId = await (0, _createRoom.ensureVirtualRoomExists)(_MatrixClientPeg.MatrixClientPeg.get(), virtualUser, roomId);

    _MatrixClientPeg.MatrixClientPeg.get().setRoomAccountData(virtualRoomId, _callTypes.VIRTUAL_ROOM_EVENT_TYPE, {
      native_room: roomId
    });

    this.virtualToNativeRoomIdCache.set(virtualRoomId, roomId);
    return virtualRoomId;
  }
  /**
   * Gets the ID of the virtual room for a room, or null if the room has no
   * virtual room
   */


  async getVirtualRoomForRoom(roomId) {
    const virtualUser = await this.getVirtualUserForRoom(roomId);
    if (!virtualUser) return null;
    return (0, _findDMForUser.findDMForUser)(_MatrixClientPeg.MatrixClientPeg.get(), virtualUser);
  }

  nativeRoomForVirtualRoom(roomId) {
    const cachedNativeRoomId = this.virtualToNativeRoomIdCache.get(roomId);

    if (cachedNativeRoomId) {
      _logger.logger.log("Returning native room ID " + cachedNativeRoomId + " for virtual room ID " + roomId + " from cache");

      return cachedNativeRoomId;
    }

    const virtualRoom = _MatrixClientPeg.MatrixClientPeg.get().getRoom(roomId);

    if (!virtualRoom) return null;
    const virtualRoomEvent = virtualRoom.getAccountData(_callTypes.VIRTUAL_ROOM_EVENT_TYPE);
    if (!virtualRoomEvent || !virtualRoomEvent.getContent()) return null;
    const nativeRoomID = virtualRoomEvent.getContent()['native_room'];

    const nativeRoom = _MatrixClientPeg.MatrixClientPeg.get().getRoom(nativeRoomID);

    if (!nativeRoom || nativeRoom.getMyMembership() !== 'join') return null;
    return nativeRoomID;
  }

  isVirtualRoom(room) {
    if (this.nativeRoomForVirtualRoom(room.roomId)) return true;
    if (this.virtualToNativeRoomIdCache.has(room.roomId)) return true; // also look in the create event for the claimed native room ID, which is the only
    // way we can recognise a virtual room we've created when it first arrives down
    // our stream. We don't trust this in general though, as it could be faked by an
    // inviter: our main source of truth is the DM state.

    const roomCreateEvent = room.currentState.getStateEvents(_event.EventType.RoomCreate, "");
    if (!roomCreateEvent || !roomCreateEvent.getContent()) return false; // we only look at this for rooms we created (so inviters can't just cause rooms
    // to be invisible)

    if (roomCreateEvent.getSender() !== _MatrixClientPeg.MatrixClientPeg.get().getUserId()) return false;

    const claimedNativeRoomId = roomCreateEvent.getContent()[_callTypes.VIRTUAL_ROOM_EVENT_TYPE];

    return Boolean(claimedNativeRoomId);
  }

  async onNewInvitedRoom(invitedRoom) {
    if (!_CallHandler.default.instance.getSupportsVirtualRooms()) return;
    const inviterId = invitedRoom.getDMInviter();

    _logger.logger.log(`Checking virtual-ness of room ID ${invitedRoom.roomId}, invited by ${inviterId}`);

    const result = await _CallHandler.default.instance.sipNativeLookup(inviterId);

    if (result.length === 0) {
      return;
    }

    if (result[0].fields.is_virtual) {
      const nativeUser = result[0].userid;
      const nativeRoom = (0, _findDMForUser.findDMForUser)(_MatrixClientPeg.MatrixClientPeg.get(), nativeUser);

      if (nativeRoom) {
        // It's a virtual room with a matching native room, so set the room account data. This
        // will make sure we know where how to map calls and also allow us know not to display
        // it in the future.
        _MatrixClientPeg.MatrixClientPeg.get().setRoomAccountData(invitedRoom.roomId, _callTypes.VIRTUAL_ROOM_EVENT_TYPE, {
          native_room: nativeRoom.roomId
        }); // also auto-join the virtual room if we have a matching native room
        // (possibly we should only join if we've also joined the native room, then we'd also have
        // to make sure we joined virtual rooms on joining a native one)


        _MatrixClientPeg.MatrixClientPeg.get().joinRoom(invitedRoom.roomId);
      } // also put this room in the virtual room ID cache so isVirtualRoom return the right answer
      // in however long it takes for the echo of setAccountData to come down the sync


      this.virtualToNativeRoomIdCache.set(invitedRoom.roomId, nativeRoom.roomId);
    }
  }

}

exports.default = VoipUserMapper;
//# sourceMappingURL=VoipUserMapper.js.map