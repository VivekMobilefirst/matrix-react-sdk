"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.doesRoomHaveUnreadMessages = doesRoomHaveUnreadMessages;
exports.eventTriggersUnreadCount = eventTriggersUnreadCount;

var _event = require("matrix-js-sdk/src/@types/event");

var _beacon = require("matrix-js-sdk/src/@types/beacon");

var _MatrixClientPeg = require("./MatrixClientPeg");

var _shouldHideEvent = _interopRequireDefault(require("./shouldHideEvent"));

var _EventTileFactory = require("./events/EventTileFactory");

var _SettingsStore = _interopRequireDefault(require("./settings/SettingsStore"));

var _RoomNotificationStateStore = require("./stores/notifications/RoomNotificationStateStore");

/*
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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

/**
 * Returns true if this event arriving in a room should affect the room's
 * count of unread messages
 *
 * @param {Object} ev The event
 * @returns {boolean} True if the given event should affect the unread message count
 */
function eventTriggersUnreadCount(ev) {
  if (ev.getSender() === _MatrixClientPeg.MatrixClientPeg.get().credentials.userId) {
    return false;
  }

  switch (ev.getType()) {
    case _event.EventType.RoomMember:
    case _event.EventType.RoomThirdPartyInvite:
    case _event.EventType.CallAnswer:
    case _event.EventType.CallHangup:
    case _event.EventType.RoomAliases:
    case _event.EventType.RoomCanonicalAlias:
    case _event.EventType.RoomServerAcl:
    case _beacon.M_BEACON.name:
    case _beacon.M_BEACON.altName:
      return false;
  }

  if (ev.isRedacted()) return false;
  return (0, _EventTileFactory.haveRendererForEvent)(ev, false
  /* hidden messages should never trigger unread counts anyways */
  );
}

function doesRoomHaveUnreadMessages(room) {
  const myUserId = _MatrixClientPeg.MatrixClientPeg.get().getUserId(); // get the most recent read receipt sent by our account.
  // N.B. this is NOT a read marker (RM, aka "read up to marker"),
  // despite the name of the method :((


  const readUpToId = room.getEventReadUpTo(myUserId);

  if (!_SettingsStore.default.getValue("feature_thread")) {
    // as we don't send RRs for our own messages, make sure we special case that
    // if *we* sent the last message into the room, we consider it not unread!
    // Should fix: https://github.com/vector-im/element-web/issues/3263
    //             https://github.com/vector-im/element-web/issues/2427
    // ...and possibly some of the others at
    //             https://github.com/vector-im/element-web/issues/3363
    if (room.timeline.length && room.timeline[room.timeline.length - 1].getSender() === myUserId) {
      return false;
    }
  } else {
    const threadState = _RoomNotificationStateStore.RoomNotificationStateStore.instance.getThreadsRoomState(room);

    if (threadState.color > 0) {
      return true;
    }
  } // if the read receipt relates to an event is that part of a thread
  // we consider that there are no unread messages
  // This might be a false negative, but probably the best we can do until
  // the read receipts have evolved to cater for threads


  const event = room.findEventById(readUpToId);

  if (event?.getThread()) {
    return false;
  } // this just looks at whatever history we have, which if we've only just started
  // up probably won't be very much, so if the last couple of events are ones that
  // don't count, we don't know if there are any events that do count between where
  // we have and the read receipt. We could fetch more history to try & find out,
  // but currently we just guess.
  // Loop through messages, starting with the most recent...


  for (let i = room.timeline.length - 1; i >= 0; --i) {
    const ev = room.timeline[i];

    if (ev.getId() == readUpToId) {
      // If we've read up to this event, there's nothing more recent
      // that counts and we can stop looking because the user's read
      // this and everything before.
      return false;
    } else if (!(0, _shouldHideEvent.default)(ev) && eventTriggersUnreadCount(ev)) {
      // We've found a message that counts before we hit
      // the user's read receipt, so this room is definitely unread.
      return true;
    }
  } // If we got here, we didn't find a message that counted but didn't find
  // the user's read receipt either, so we guess and say that the room is
  // unread on the theory that false positives are better than false
  // negatives here.


  return true;
}
//# sourceMappingURL=Unread.js.map