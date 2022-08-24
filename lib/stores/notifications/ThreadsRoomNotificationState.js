"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThreadsRoomNotificationState = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _thread = require("matrix-js-sdk/src/models/thread");

var _NotificationState = require("./NotificationState");

var _ThreadNotificationState = require("./ThreadNotificationState");

var _NotificationColor = require("./NotificationColor");

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
class ThreadsRoomNotificationState extends _NotificationState.NotificationState {
  constructor(room) {
    super();
    this.room = room;
    (0, _defineProperty2.default)(this, "threadsState", new Map());
    (0, _defineProperty2.default)(this, "_symbol", null);
    (0, _defineProperty2.default)(this, "_count", 0);
    (0, _defineProperty2.default)(this, "_color", _NotificationColor.NotificationColor.None);
    (0, _defineProperty2.default)(this, "onNewThread", thread => {
      const notificationState = new _ThreadNotificationState.ThreadNotificationState(thread);
      this.threadsState.set(thread, notificationState);
      notificationState.on(_NotificationState.NotificationStateEvents.Update, this.onThreadUpdate);
    });
    (0, _defineProperty2.default)(this, "onThreadUpdate", () => {
      let color = _NotificationColor.NotificationColor.None;

      for (const [, notificationState] of this.threadsState) {
        if (notificationState.color === _NotificationColor.NotificationColor.Red) {
          color = _NotificationColor.NotificationColor.Red;
          break;
        } else if (notificationState.color === _NotificationColor.NotificationColor.Grey) {
          color = _NotificationColor.NotificationColor.Grey;
        }
      }

      this.updateNotificationState(color);
    });

    for (const thread of this.room.getThreads()) {
      this.onNewThread(thread);
    }

    this.room.on(_thread.ThreadEvent.New, this.onNewThread);
  }

  destroy() {
    super.destroy();
    this.room.off(_thread.ThreadEvent.New, this.onNewThread);

    for (const [, notificationState] of this.threadsState) {
      notificationState.off(_NotificationState.NotificationStateEvents.Update, this.onThreadUpdate);
    }
  }

  getThreadRoomState(thread) {
    if (!this.threadsState.has(thread)) {
      this.threadsState.set(thread, new _ThreadNotificationState.ThreadNotificationState(thread));
    }

    return this.threadsState.get(thread);
  }

  updateNotificationState(color) {
    const snapshot = this.snapshot();
    this._color = color; // finally, publish an update if needed

    this.emitIfUpdated(snapshot);
  }

}

exports.ThreadsRoomNotificationState = ThreadsRoomNotificationState;
//# sourceMappingURL=ThreadsRoomNotificationState.js.map