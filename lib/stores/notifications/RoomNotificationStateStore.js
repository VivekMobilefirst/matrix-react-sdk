"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UPDATE_STATUS_INDICATOR = exports.RoomNotificationStateStore = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _client = require("matrix-js-sdk/src/client");

var _AsyncStoreWithClient = require("../AsyncStoreWithClient");

var _dispatcher = _interopRequireDefault(require("../../dispatcher/dispatcher"));

var _models = require("../room-list/models");

var _ListNotificationState = require("./ListNotificationState");

var _RoomNotificationState = require("./RoomNotificationState");

var _SummarizedNotificationState = require("./SummarizedNotificationState");

var _ThreadsRoomNotificationState = require("./ThreadsRoomNotificationState");

var _VisibilityProvider = require("../room-list/filters/VisibilityProvider");

var _PosthogAnalytics = require("../../PosthogAnalytics");

/*
Copyright 2020 - 2022 The Matrix.org Foundation C.I.C.

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
const UPDATE_STATUS_INDICATOR = Symbol("update-status-indicator");
exports.UPDATE_STATUS_INDICATOR = UPDATE_STATUS_INDICATOR;

class RoomNotificationStateStore extends _AsyncStoreWithClient.AsyncStoreWithClient {
  constructor() {
    super(_dispatcher.default, {});
    (0, _defineProperty2.default)(this, "roomMap", new Map());
    (0, _defineProperty2.default)(this, "roomThreadsMap", new Map());
    (0, _defineProperty2.default)(this, "listMap", new Map());
    (0, _defineProperty2.default)(this, "_globalState", new _SummarizedNotificationState.SummarizedNotificationState());
    (0, _defineProperty2.default)(this, "onSync", (state, prevState, data) => {
      // Only count visible rooms to not torment the user with notification counts in rooms they can't see.
      // This will include highlights from the previous version of the room internally
      const globalState = new _SummarizedNotificationState.SummarizedNotificationState();
      const visibleRooms = this.matrixClient.getVisibleRooms();
      let numFavourites = 0;

      for (const room of visibleRooms) {
        if (_VisibilityProvider.VisibilityProvider.instance.isRoomVisible(room)) {
          globalState.add(this.getRoomState(room));
          if (room.tags[_models.DefaultTagID.Favourite] && !room.getType()) numFavourites++;
        }
      }

      _PosthogAnalytics.PosthogAnalytics.instance.setProperty("numFavouriteRooms", numFavourites);

      if (this.globalState.symbol !== globalState.symbol || this.globalState.count !== globalState.count || this.globalState.color !== globalState.color || this.globalState.numUnreadStates !== globalState.numUnreadStates || state !== prevState) {
        this._globalState = globalState;
        this.emit(UPDATE_STATUS_INDICATOR, globalState, state, prevState, data);
      }
    });
  }
  /**
   * Gets a snapshot of notification state for all visible rooms. The number of states recorded
   * on the SummarizedNotificationState is equivalent to rooms.
   */


  get globalState() {
    return this._globalState;
  }
  /**
   * Gets an instance of the list state class for the given tag.
   * @param tagId The tag to get the notification state for.
   * @returns The notification state for the tag.
   */


  getListState(tagId) {
    if (this.listMap.has(tagId)) {
      return this.listMap.get(tagId);
    } // TODO: Update if/when invites move out of the room list.


    const useTileCount = tagId === _models.DefaultTagID.Invite;

    const getRoomFn = room => {
      return this.getRoomState(room);
    };

    const state = new _ListNotificationState.ListNotificationState(useTileCount, getRoomFn);
    this.listMap.set(tagId, state);
    return state;
  }
  /**
   * Gets a copy of the notification state for a room. The consumer should not
   * attempt to destroy the returned state as it may be shared with other
   * consumers.
   * @param room The room to get the notification state for.
   * @returns The room's notification state.
   */


  getRoomState(room) {
    if (!this.roomMap.has(room)) {
      // Not very elegant, but that way we ensure that we start tracking
      // threads notification at the same time at rooms.
      // There are multiple entry points, and it's unclear which one gets
      // called first
      const threadState = new _ThreadsRoomNotificationState.ThreadsRoomNotificationState(room);
      this.roomThreadsMap.set(room, threadState);
      this.roomMap.set(room, new _RoomNotificationState.RoomNotificationState(room, threadState));
    }

    return this.roomMap.get(room);
  }

  getThreadsRoomState(room) {
    if (!this.roomThreadsMap.has(room)) {
      this.roomThreadsMap.set(room, new _ThreadsRoomNotificationState.ThreadsRoomNotificationState(room));
    }

    return this.roomThreadsMap.get(room);
  }

  static get instance() {
    return RoomNotificationStateStore.internalInstance;
  }

  async onReady() {
    this.matrixClient.on(_client.ClientEvent.Sync, this.onSync);
  }

  async onNotReady() {
    this.matrixClient?.off(_client.ClientEvent.Sync, this.onSync);

    for (const roomState of this.roomMap.values()) {
      roomState.destroy();
    }
  } // We don't need this, but our contract says we do.


  async onAction(payload) {}

}

exports.RoomNotificationStateStore = RoomNotificationStateStore;
(0, _defineProperty2.default)(RoomNotificationStateStore, "internalInstance", new RoomNotificationStateStore());
//# sourceMappingURL=RoomNotificationStateStore.js.map