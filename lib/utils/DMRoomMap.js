"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _lodash = require("lodash");

var _client = require("matrix-js-sdk/src/client");

var _logger = require("matrix-js-sdk/src/logger");

var _event = require("matrix-js-sdk/src/@types/event");

var _MatrixClientPeg = require("../MatrixClientPeg");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/**
 * Class that takes a Matrix Client and flips the m.direct map
 * so the operation of mapping a room ID to which user it's a DM
 * with can be performed efficiently.
 *
 * With 'start', this can also keep itself up to date over time.
 */
class DMRoomMap {
  // TODO: convert these to maps
  constructor(matrixClient) {
    this.matrixClient = matrixClient;
    (0, _defineProperty2.default)(this, "roomToUser", null);
    (0, _defineProperty2.default)(this, "userToRooms", null);
    (0, _defineProperty2.default)(this, "hasSentOutPatchDirectAccountDataPatch", void 0);
    (0, _defineProperty2.default)(this, "mDirectEvent", void 0);
    (0, _defineProperty2.default)(this, "onAccountData", ev => {
      if (ev.getType() == _event.EventType.Direct) {
        this.mDirectEvent = _objectSpread({}, ev.getContent()); // copy as we will mutate

        this.userToRooms = null;
        this.roomToUser = null;
      }
    });
    // see onAccountData
    this.hasSentOutPatchDirectAccountDataPatch = false;
    const mDirectEvent = matrixClient.getAccountData(_event.EventType.Direct)?.getContent() ?? {};
    this.mDirectEvent = _objectSpread({}, mDirectEvent); // copy as we will mutate
  }
  /**
   * Makes and returns a new shared instance that can then be accessed
   * with shared(). This returned instance is not automatically started.
   */


  static makeShared() {
    DMRoomMap.sharedInstance = new DMRoomMap(_MatrixClientPeg.MatrixClientPeg.get());
    return DMRoomMap.sharedInstance;
  }
  /**
   * Set the shared instance to the instance supplied
   * Used by tests
   * @param inst the new shared instance
   */


  static setShared(inst) {
    DMRoomMap.sharedInstance = inst;
  }
  /**
   * Returns a shared instance of the class
   * that uses the singleton matrix client
   * The shared instance must be started before use.
   */


  static shared() {
    return DMRoomMap.sharedInstance;
  }

  start() {
    this.populateRoomToUser();
    this.matrixClient.on(_client.ClientEvent.AccountData, this.onAccountData);
  }

  stop() {
    this.matrixClient.removeListener(_client.ClientEvent.AccountData, this.onAccountData);
  }

  /**
   * some client bug somewhere is causing some DMs to be marked
   * with ourself, not the other user. Fix it by guessing the other user and
   * modifying userToRooms
   */
  patchUpSelfDMs(userToRooms) {
    const myUserId = this.matrixClient.getUserId();
    const selfRoomIds = userToRooms[myUserId];

    if (selfRoomIds) {
      // any self-chats that should not be self-chats?
      const guessedUserIdsThatChanged = selfRoomIds.map(roomId => {
        const room = this.matrixClient.getRoom(roomId);

        if (room) {
          const userId = room.guessDMUserId();

          if (userId && userId !== myUserId) {
            return {
              userId,
              roomId
            };
          }
        }
      }).filter(ids => !!ids); //filter out
      // these are actually all legit self-chats
      // bail out

      if (!guessedUserIdsThatChanged.length) {
        return false;
      }

      userToRooms[myUserId] = selfRoomIds.filter(roomId => {
        return !guessedUserIdsThatChanged.some(ids => ids.roomId === roomId);
      });
      guessedUserIdsThatChanged.forEach(_ref => {
        let {
          userId,
          roomId
        } = _ref;
        const roomIds = userToRooms[userId];

        if (!roomIds) {
          userToRooms[userId] = [roomId];
        } else {
          roomIds.push(roomId);
          userToRooms[userId] = (0, _lodash.uniq)(roomIds);
        }
      });
      return true;
    }
  }

  getDMRoomsForUserId(userId) {
    // Here, we return the empty list if there are no rooms,
    // since the number of conversations you have with this user is zero.
    return this.getUserToRooms()[userId] || [];
  }
  /**
   * Gets the DM room which the given IDs share, if any.
   * @param {string[]} ids The identifiers (user IDs and email addresses) to look for.
   * @returns {Room} The DM room which all IDs given share, or falsy if no common room.
   */


  getDMRoomForIdentifiers(ids) {
    // TODO: [Canonical DMs] Handle lookups for email addresses.
    // For now we'll pretend we only get user IDs and end up returning nothing for email addresses
    let commonRooms = this.getDMRoomsForUserId(ids[0]);

    for (let i = 1; i < ids.length; i++) {
      const userRooms = this.getDMRoomsForUserId(ids[i]);
      commonRooms = commonRooms.filter(r => userRooms.includes(r));
    }

    const joinedRooms = commonRooms.map(r => _MatrixClientPeg.MatrixClientPeg.get().getRoom(r)).filter(r => r && r.getMyMembership() === 'join');
    return joinedRooms[0];
  }

  getUserIdForRoomId(roomId) {
    if (this.roomToUser == null) {
      // we lazily populate roomToUser so you can use
      // this class just to call getDMRoomsForUserId
      // which doesn't do very much, but is a fairly
      // convenient wrapper and there's no point
      // iterating through the map if getUserIdForRoomId()
      // is never called.
      this.populateRoomToUser();
    } // Here, we return undefined if the room is not in the map:
    // the room ID you gave is not a DM room for any user.


    if (this.roomToUser[roomId] === undefined) {
      // no entry? if the room is an invite, look for the is_direct hint.
      const room = this.matrixClient.getRoom(roomId);

      if (room) {
        return room.getDMInviter();
      }
    }

    return this.roomToUser[roomId];
  }

  getUniqueRoomsWithIndividuals() {
    if (!this.roomToUser) return {}; // No rooms means no map.

    return Object.keys(this.roomToUser).map(r => ({
      userId: this.getUserIdForRoomId(r),
      room: this.matrixClient.getRoom(r)
    })).filter(r => r.userId && r.room && r.room.getInvitedAndJoinedMemberCount() === 2).reduce((obj, r) => (obj[r.userId] = r.room) && obj, {});
  }

  getUserToRooms() {
    if (!this.userToRooms) {
      const userToRooms = this.mDirectEvent;
      const myUserId = this.matrixClient.getUserId();
      const selfDMs = userToRooms[myUserId];

      if (selfDMs?.length) {
        const neededPatching = this.patchUpSelfDMs(userToRooms); // to avoid multiple devices fighting to correct
        // the account data, only try to send the corrected
        // version once.

        _logger.logger.warn(`Invalid m.direct account data detected ` + `(self-chats that shouldn't be), patching it up.`);

        if (neededPatching && !this.hasSentOutPatchDirectAccountDataPatch) {
          this.hasSentOutPatchDirectAccountDataPatch = true;
          this.matrixClient.setAccountData(_event.EventType.Direct, userToRooms);
        }
      }

      this.userToRooms = userToRooms;
    }

    return this.userToRooms;
  }

  populateRoomToUser() {
    this.roomToUser = {};

    for (const user of Object.keys(this.getUserToRooms())) {
      for (const roomId of this.userToRooms[user]) {
        this.roomToUser[roomId] = user;
      }
    }
  }

}

exports.default = DMRoomMap;
(0, _defineProperty2.default)(DMRoomMap, "sharedInstance", void 0);
//# sourceMappingURL=DMRoomMap.js.map