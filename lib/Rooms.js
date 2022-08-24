"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDisplayAliasForAliasSet = getDisplayAliasForAliasSet;
exports.getDisplayAliasForRoom = getDisplayAliasForRoom;
exports.guessAndSetDMRoom = guessAndSetDMRoom;
exports.setDMRoom = setDMRoom;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _event = require("matrix-js-sdk/src/@types/event");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _Alias = _interopRequireDefault(require("./customisations/Alias"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/**
 * Given a room object, return the alias we should use for it,
 * if any. This could be the canonical alias if one exists, otherwise
 * an alias selected arbitrarily but deterministically from the list
 * of aliases. Otherwise return null;
 *
 * @param {Object} room The room object
 * @returns {string} A display alias for the given room
 */
function getDisplayAliasForRoom(room) {
  return getDisplayAliasForAliasSet(room.getCanonicalAlias(), room.getAltAliases());
} // The various display alias getters should all feed through this one path so
// there's a single place to change the logic.


function getDisplayAliasForAliasSet(canonicalAlias, altAliases) {
  if (_Alias.default.getDisplayAliasForAliasSet) {
    return _Alias.default.getDisplayAliasForAliasSet(canonicalAlias, altAliases);
  }

  return canonicalAlias || altAliases?.[0];
}

function guessAndSetDMRoom(room, isDirect) {
  let newTarget;

  if (isDirect) {
    const guessedUserId = guessDMRoomTargetId(room, _MatrixClientPeg.MatrixClientPeg.get().getUserId());
    newTarget = guessedUserId;
  } else {
    newTarget = null;
  }

  return setDMRoom(room.roomId, newTarget);
}
/**
 * Marks or unmarks the given room as being as a DM room.
 * @param {string} roomId The ID of the room to modify
 * @param {string} userId The user ID of the desired DM
 room target user or null to un-mark
 this room as a DM room
 * @returns {object} A promise
 */


async function setDMRoom(roomId, userId) {
  if (_MatrixClientPeg.MatrixClientPeg.get().isGuest()) return;

  const mDirectEvent = _MatrixClientPeg.MatrixClientPeg.get().getAccountData(_event.EventType.Direct);

  let dmRoomMap = {};
  if (mDirectEvent !== undefined) dmRoomMap = _objectSpread({}, mDirectEvent.getContent()); // copy as we will mutate
  // remove it from the lists of any others users
  // (it can only be a DM room for one person)

  for (const thisUserId of Object.keys(dmRoomMap)) {
    const roomList = dmRoomMap[thisUserId];

    if (thisUserId != userId) {
      const indexOfRoom = roomList.indexOf(roomId);

      if (indexOfRoom > -1) {
        roomList.splice(indexOfRoom, 1);
      }
    }
  } // now add it, if it's not already there


  if (userId) {
    const roomList = dmRoomMap[userId] || [];

    if (roomList.indexOf(roomId) == -1) {
      roomList.push(roomId);
    }

    dmRoomMap[userId] = roomList;
  }

  await _MatrixClientPeg.MatrixClientPeg.get().setAccountData(_event.EventType.Direct, dmRoomMap);
}
/**
 * Given a room, estimate which of its members is likely to
 * be the target if the room were a DM room and return that user.
 *
 * @param {Object} room Target room
 * @param {string} myUserId User ID of the current user
 * @returns {string} User ID of the user that the room is probably a DM with
 */


function guessDMRoomTargetId(room, myUserId) {
  let oldestTs;
  let oldestUser; // Pick the joined user who's been here longest (and isn't us),

  for (const user of room.getJoinedMembers()) {
    if (user.userId == myUserId) continue;

    if (oldestTs === undefined || user.events.member && user.events.member.getTs() < oldestTs) {
      oldestUser = user;
      oldestTs = user.events.member.getTs();
    }
  }

  if (oldestUser) return oldestUser.userId; // if there are no joined members other than us, use the oldest member

  for (const user of room.currentState.getMembers()) {
    if (user.userId == myUserId) continue;

    if (oldestTs === undefined || user.events.member && user.events.member.getTs() < oldestTs) {
      oldestUser = user;
      oldestTs = user.events.member.getTs();
    }
  }

  if (oldestUser === undefined) return myUserId;
  return oldestUser.userId;
}
//# sourceMappingURL=Rooms.js.map