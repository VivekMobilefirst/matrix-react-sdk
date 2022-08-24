"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RoomNotifState = void 0;
exports.getRoomNotifsState = getRoomNotifsState;
exports.getUnreadNotificationCount = getUnreadNotificationCount;
exports.setRoomNotifsState = setRoomNotifsState;

var _pushprocessor = require("matrix-js-sdk/src/pushprocessor");

var _room = require("matrix-js-sdk/src/models/room");

var _PushRules = require("matrix-js-sdk/src/@types/PushRules");

var _event = require("matrix-js-sdk/src/@types/event");

var _MatrixClientPeg = require("./MatrixClientPeg");

/*
Copyright 2016 OpenMarket Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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
let RoomNotifState;
exports.RoomNotifState = RoomNotifState;

(function (RoomNotifState) {
  RoomNotifState["AllMessagesLoud"] = "all_messages_loud";
  RoomNotifState["AllMessages"] = "all_messages";
  RoomNotifState["MentionsOnly"] = "mentions_only";
  RoomNotifState["Mute"] = "mute";
})(RoomNotifState || (exports.RoomNotifState = RoomNotifState = {}));

function getRoomNotifsState(roomId) {
  if (_MatrixClientPeg.MatrixClientPeg.get().isGuest()) return RoomNotifState.AllMessages; // look through the override rules for a rule affecting this room:
  // if one exists, it will take precedence.

  const muteRule = findOverrideMuteRule(roomId);

  if (muteRule) {
    return RoomNotifState.Mute;
  } // for everything else, look at the room rule.


  let roomRule = null;

  try {
    roomRule = _MatrixClientPeg.MatrixClientPeg.get().getRoomPushRule('global', roomId);
  } catch (err) {
    // Possible that the client doesn't have pushRules yet. If so, it
    // hasn't started either, so indicate that this room is not notifying.
    return null;
  } // XXX: We have to assume the default is to notify for all messages
  // (in particular this will be 'wrong' for one to one rooms because
  // they will notify loudly for all messages)


  if (!roomRule?.enabled) return RoomNotifState.AllMessages; // a mute at the room level will still allow mentions
  // to notify

  if (isMuteRule(roomRule)) return RoomNotifState.MentionsOnly;

  const actionsObject = _pushprocessor.PushProcessor.actionListToActionsObject(roomRule.actions);

  if (actionsObject.tweaks.sound) return RoomNotifState.AllMessagesLoud;
  return null;
}

function setRoomNotifsState(roomId, newState) {
  if (newState === RoomNotifState.Mute) {
    return setRoomNotifsStateMuted(roomId);
  } else {
    return setRoomNotifsStateUnmuted(roomId, newState);
  }
}

function getUnreadNotificationCount(room) {
  let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let notificationCount = room.getUnreadNotificationCount(type); // Check notification counts in the old room just in case there's some lost
  // there. We only go one level down to avoid performance issues, and theory
  // is that 1st generation rooms will have already been read by the 3rd generation.

  const createEvent = room.currentState.getStateEvents(_event.EventType.RoomCreate, "");

  if (createEvent && createEvent.getContent()['predecessor']) {
    const oldRoomId = createEvent.getContent()['predecessor']['room_id'];

    const oldRoom = _MatrixClientPeg.MatrixClientPeg.get().getRoom(oldRoomId);

    if (oldRoom) {
      // We only ever care if there's highlights in the old room. No point in
      // notifying the user for unread messages because they would have extreme
      // difficulty changing their notification preferences away from "All Messages"
      // and "Noisy".
      notificationCount += oldRoom.getUnreadNotificationCount(_room.NotificationCountType.Highlight);
    }
  }

  return notificationCount;
}

function setRoomNotifsStateMuted(roomId) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  const promises = []; // delete the room rule

  const roomRule = cli.getRoomPushRule('global', roomId);

  if (roomRule) {
    promises.push(cli.deletePushRule('global', _PushRules.PushRuleKind.RoomSpecific, roomRule.rule_id));
  } // add/replace an override rule to squelch everything in this room
  // NB. We use the room ID as the name of this rule too, although this
  // is an override rule, not a room rule: it still pertains to this room
  // though, so using the room ID as the rule ID is logical and prevents
  // duplicate copies of the rule.


  promises.push(cli.addPushRule('global', _PushRules.PushRuleKind.Override, roomId, {
    conditions: [{
      kind: _PushRules.ConditionKind.EventMatch,
      key: 'room_id',
      pattern: roomId
    }],
    actions: [_PushRules.PushRuleActionName.DontNotify]
  }));
  return Promise.all(promises);
}

function setRoomNotifsStateUnmuted(roomId, newState) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  const promises = [];
  const overrideMuteRule = findOverrideMuteRule(roomId);

  if (overrideMuteRule) {
    promises.push(cli.deletePushRule('global', _PushRules.PushRuleKind.Override, overrideMuteRule.rule_id));
  }

  if (newState === RoomNotifState.AllMessages) {
    const roomRule = cli.getRoomPushRule('global', roomId);

    if (roomRule) {
      promises.push(cli.deletePushRule('global', _PushRules.PushRuleKind.RoomSpecific, roomRule.rule_id));
    }
  } else if (newState === RoomNotifState.MentionsOnly) {
    promises.push(cli.addPushRule('global', _PushRules.PushRuleKind.RoomSpecific, roomId, {
      actions: [_PushRules.PushRuleActionName.DontNotify]
    })); // https://matrix.org/jira/browse/SPEC-400

    promises.push(cli.setPushRuleEnabled('global', _PushRules.PushRuleKind.RoomSpecific, roomId, true));
  } else if (newState === RoomNotifState.AllMessagesLoud) {
    promises.push(cli.addPushRule('global', _PushRules.PushRuleKind.RoomSpecific, roomId, {
      actions: [_PushRules.PushRuleActionName.Notify, {
        set_tweak: _PushRules.TweakName.Sound,
        value: 'default'
      }]
    })); // https://matrix.org/jira/browse/SPEC-400

    promises.push(cli.setPushRuleEnabled('global', _PushRules.PushRuleKind.RoomSpecific, roomId, true));
  }

  return Promise.all(promises);
}

function findOverrideMuteRule(roomId) {
  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  if (!cli?.pushRules?.global?.override) {
    return null;
  }

  for (const rule of cli.pushRules.global.override) {
    if (rule.enabled && isRuleForRoom(roomId, rule) && isMuteRule(rule)) {
      return rule;
    }
  }

  return null;
}

function isRuleForRoom(roomId, rule) {
  if (rule.conditions?.length !== 1) {
    return false;
  }

  const cond = rule.conditions[0];
  return cond.kind === _PushRules.ConditionKind.EventMatch && cond.key === 'room_id' && cond.pattern === roomId;
}

function isMuteRule(rule) {
  return rule.actions.length === 1 && rule.actions[0] === _PushRules.PushRuleActionName.DontNotify;
}
//# sourceMappingURL=RoomNotifs.js.map