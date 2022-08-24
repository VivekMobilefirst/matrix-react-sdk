"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotificationStateSnapshot = exports.NotificationStateEvents = exports.NotificationState = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _typedEventEmitter = require("matrix-js-sdk/src/models/typed-event-emitter");

var _NotificationColor = require("./NotificationColor");

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
let NotificationStateEvents;
exports.NotificationStateEvents = NotificationStateEvents;

(function (NotificationStateEvents) {
  NotificationStateEvents["Update"] = "update";
})(NotificationStateEvents || (exports.NotificationStateEvents = NotificationStateEvents = {}));

class NotificationState extends _typedEventEmitter.TypedEventEmitter {
  constructor() {
    super(...arguments);
    (0, _defineProperty2.default)(this, "_symbol", void 0);
    (0, _defineProperty2.default)(this, "_count", void 0);
    (0, _defineProperty2.default)(this, "_color", void 0);
  }

  get symbol() {
    return this._symbol;
  }

  get count() {
    return this._count;
  }

  get color() {
    return this._color;
  }

  get isIdle() {
    return this.color <= _NotificationColor.NotificationColor.None;
  }

  get isUnread() {
    return this.color >= _NotificationColor.NotificationColor.Bold;
  }

  get hasUnreadCount() {
    return this.color >= _NotificationColor.NotificationColor.Grey && (!!this.count || !!this.symbol);
  }

  get hasMentions() {
    return this.color >= _NotificationColor.NotificationColor.Red;
  }

  emitIfUpdated(snapshot) {
    if (snapshot.isDifferentFrom(this)) {
      this.emit(NotificationStateEvents.Update);
    }
  }

  snapshot() {
    return new NotificationStateSnapshot(this);
  }

  destroy() {
    this.removeAllListeners(NotificationStateEvents.Update);
  }

}

exports.NotificationState = NotificationState;

class NotificationStateSnapshot {
  constructor(state) {
    (0, _defineProperty2.default)(this, "symbol", void 0);
    (0, _defineProperty2.default)(this, "count", void 0);
    (0, _defineProperty2.default)(this, "color", void 0);
    this.symbol = state.symbol;
    this.count = state.count;
    this.color = state.color;
  }

  isDifferentFrom(other) {
    const before = {
      count: this.count,
      symbol: this.symbol,
      color: this.color
    };
    const after = {
      count: other.count,
      symbol: other.symbol,
      color: other.color
    };
    return JSON.stringify(before) !== JSON.stringify(after);
  }

}

exports.NotificationStateSnapshot = NotificationStateSnapshot;
//# sourceMappingURL=NotificationState.js.map