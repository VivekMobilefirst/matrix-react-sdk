"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RoomNotificationState = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _event = require("matrix-js-sdk/src/models/event");

var _room = require("matrix-js-sdk/src/models/room");

var _client = require("matrix-js-sdk/src/client");

var _NotificationColor = require("./NotificationColor");

var _MatrixClientPeg = require("../../MatrixClientPeg");

var _membership = require("../../utils/membership");

var _readReceipts = require("../../utils/read-receipts");

var RoomNotifs = _interopRequireWildcard(require("../../RoomNotifs"));

var Unread = _interopRequireWildcard(require("../../Unread"));

var _NotificationState = require("./NotificationState");

var _RoomStatusBar = require("../../components/structures/RoomStatusBar");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
class RoomNotificationState extends _NotificationState.NotificationState {
  constructor(room, threadsState) {
    super();
    this.room = room;
    this.threadsState = threadsState;
    (0, _defineProperty2.default)(this, "handleThreadsUpdate", () => {
      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "handleLocalEchoUpdated", () => {
      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "handleReadReceipt", (event, room) => {
      if (!(0, _readReceipts.readReceiptChangeIsFor)(event, _MatrixClientPeg.MatrixClientPeg.get())) return; // not our own - ignore

      if (room.roomId !== this.room.roomId) return; // not for us - ignore

      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "handleMembershipUpdate", () => {
      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "onEventDecrypted", event => {
      if (event.getRoomId() !== this.room.roomId) return; // ignore - not for us or notifications timeline

      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "handleRoomEventUpdate", (event, room) => {
      if (room?.roomId !== this.room.roomId) return; // ignore - not for us or notifications timeline

      this.updateNotificationState();
    });
    (0, _defineProperty2.default)(this, "handleAccountDataUpdate", ev => {
      if (ev.getType() === "m.push_rules") {
        this.updateNotificationState();
      }
    });
    this.room.on(_room.RoomEvent.Receipt, this.handleReadReceipt);
    this.room.on(_room.RoomEvent.Timeline, this.handleRoomEventUpdate);
    this.room.on(_room.RoomEvent.Redaction, this.handleRoomEventUpdate);
    this.room.on(_room.RoomEvent.MyMembership, this.handleMembershipUpdate);
    this.room.on(_room.RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);

    if (threadsState) {
      threadsState.on(_NotificationState.NotificationStateEvents.Update, this.handleThreadsUpdate);
    }

    _MatrixClientPeg.MatrixClientPeg.get().on(_event.MatrixEventEvent.Decrypted, this.onEventDecrypted);

    _MatrixClientPeg.MatrixClientPeg.get().on(_client.ClientEvent.AccountData, this.handleAccountDataUpdate);

    this.updateNotificationState();
  }

  get roomIsInvite() {
    return (0, _membership.getEffectiveMembership)(this.room.getMyMembership()) === _membership.EffectiveMembership.Invite;
  }

  destroy() {
    super.destroy();
    this.room.removeListener(_room.RoomEvent.Receipt, this.handleReadReceipt);
    this.room.removeListener(_room.RoomEvent.Timeline, this.handleRoomEventUpdate);
    this.room.removeListener(_room.RoomEvent.Redaction, this.handleRoomEventUpdate);
    this.room.removeListener(_room.RoomEvent.MyMembership, this.handleMembershipUpdate);
    this.room.removeListener(_room.RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);

    if (this.threadsState) {
      this.threadsState.removeListener(_NotificationState.NotificationStateEvents.Update, this.handleThreadsUpdate);
    }

    if (_MatrixClientPeg.MatrixClientPeg.get()) {
      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_event.MatrixEventEvent.Decrypted, this.onEventDecrypted);

      _MatrixClientPeg.MatrixClientPeg.get().removeListener(_client.ClientEvent.AccountData, this.handleAccountDataUpdate);
    }
  }

  updateNotificationState() {
    const snapshot = this.snapshot();

    if ((0, _RoomStatusBar.getUnsentMessages)(this.room).length > 0) {
      // When there are unsent messages we show a red `!`
      this._color = _NotificationColor.NotificationColor.Unsent;
      this._symbol = "!";
      this._count = 1; // not used, technically
    } else if (RoomNotifs.getRoomNotifsState(this.room.roomId) === RoomNotifs.RoomNotifState.Mute) {
      // When muted we suppress all notification states, even if we have context on them.
      this._color = _NotificationColor.NotificationColor.None;
      this._symbol = null;
      this._count = 0;
    } else if (this.roomIsInvite) {
      this._color = _NotificationColor.NotificationColor.Red;
      this._symbol = "!";
      this._count = 1; // not used, technically
    } else {
      const redNotifs = RoomNotifs.getUnreadNotificationCount(this.room, _room.NotificationCountType.Highlight);
      const greyNotifs = RoomNotifs.getUnreadNotificationCount(this.room, _room.NotificationCountType.Total); // For a 'true count' we pick the grey notifications first because they include the
      // red notifications. If we don't have a grey count for some reason we use the red
      // count. If that count is broken for some reason, assume zero. This avoids us showing
      // a badge for 'NaN' (which formats as 'NaNB' for NaN Billion).

      const trueCount = greyNotifs ? greyNotifs : redNotifs ? redNotifs : 0; // Note: we only set the symbol if we have an actual count. We don't want to show
      // zero on badges.

      if (redNotifs > 0) {
        this._color = _NotificationColor.NotificationColor.Red;
        this._count = trueCount;
        this._symbol = null; // symbol calculated by component
      } else if (greyNotifs > 0) {
        this._color = _NotificationColor.NotificationColor.Grey;
        this._count = trueCount;
        this._symbol = null; // symbol calculated by component
      } else {
        // We don't have any notified messages, but we might have unread messages. Let's
        // find out.
        const hasUnread = Unread.doesRoomHaveUnreadMessages(this.room);

        if (hasUnread) {
          this._color = _NotificationColor.NotificationColor.Bold;
        } else {
          this._color = _NotificationColor.NotificationColor.None;
        } // no symbol or count for this state


        this._count = 0;
        this._symbol = null;
      }
    } // finally, publish an update if needed


    this.emitIfUpdated(snapshot);
  }

}

exports.RoomNotificationState = RoomNotificationState;
//# sourceMappingURL=RoomNotificationState.js.map