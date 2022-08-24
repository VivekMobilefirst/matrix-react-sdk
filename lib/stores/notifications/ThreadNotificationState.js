"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThreadNotificationState = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _thread = require("matrix-js-sdk/src/models/thread");

var _NotificationColor = require("./NotificationColor");

var _MatrixClientPeg = require("../../MatrixClientPeg");

var _NotificationState = require("./NotificationState");

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
class ThreadNotificationState extends _NotificationState.NotificationState {
  constructor(thread) {
    super();
    this.thread = thread;
    (0, _defineProperty2.default)(this, "_symbol", null);
    (0, _defineProperty2.default)(this, "_count", 0);
    (0, _defineProperty2.default)(this, "_color", _NotificationColor.NotificationColor.None);
    (0, _defineProperty2.default)(this, "handleNewThreadReply", (thread, event) => {
      const client = _MatrixClientPeg.MatrixClientPeg.get();

      const myUserId = client.getUserId();
      const isOwn = myUserId === event.getSender();
      const readReceipt = this.thread.room.getReadReceiptForUserId(myUserId);

      if (!isOwn && !readReceipt || readReceipt && event.getTs() >= readReceipt.data.ts) {
        const actions = client.getPushActionsForEvent(event, true);

        if (actions?.tweaks) {
          const color = !!actions.tweaks.highlight ? _NotificationColor.NotificationColor.Red : _NotificationColor.NotificationColor.Grey;
          this.updateNotificationState(color);
        }
      }
    });
    (0, _defineProperty2.default)(this, "resetThreadNotification", () => {
      this.updateNotificationState(_NotificationColor.NotificationColor.None);
    });
    this.thread.on(_thread.ThreadEvent.NewReply, this.handleNewThreadReply);
    this.thread.on(_thread.ThreadEvent.ViewThread, this.resetThreadNotification);

    if (this.thread.replyToEvent) {
      // Process the current tip event
      this.handleNewThreadReply(this.thread, this.thread.replyToEvent);
    }
  }

  destroy() {
    super.destroy();
    this.thread.off(_thread.ThreadEvent.NewReply, this.handleNewThreadReply);
    this.thread.off(_thread.ThreadEvent.ViewThread, this.resetThreadNotification);
  }

  updateNotificationState(color) {
    const snapshot = this.snapshot();
    this._color = color; // finally, publish an update if needed

    this.emitIfUpdated(snapshot);
  }

}

exports.ThreadNotificationState = ThreadNotificationState;
//# sourceMappingURL=ThreadNotificationState.js.map