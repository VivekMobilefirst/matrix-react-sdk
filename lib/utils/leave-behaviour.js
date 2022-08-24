"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.leaveRoomBehaviour = leaveRoomBehaviour;
exports.leaveSpace = void 0;

var _utils = require("matrix-js-sdk/src/utils");

var _react = _interopRequireDefault(require("react"));

var _eventStatus = require("matrix-js-sdk/src/models/event-status");

var _event = require("matrix-js-sdk/src/models/event");

var _Modal = _interopRequireDefault(require("../Modal"));

var _Spinner = _interopRequireDefault(require("../components/views/elements/Spinner"));

var _MatrixClientPeg = require("../MatrixClientPeg");

var _languageHandler = require("../languageHandler");

var _ErrorDialog = _interopRequireDefault(require("../components/views/dialogs/ErrorDialog"));

var _spaces = require("../stores/spaces");

var _SpaceStore = _interopRequireDefault(require("../stores/spaces/SpaceStore"));

var _RoomViewStore = require("../stores/RoomViewStore");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _actions = require("../dispatcher/actions");

var _LeaveSpaceDialog = _interopRequireDefault(require("../components/views/dialogs/LeaveSpaceDialog"));

var _space = require("./space");

/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
async function leaveRoomBehaviour(roomId) {
  let retry = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  let spinner = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  let spinnerModal;

  if (spinner) {
    spinnerModal = _Modal.default.createDialog(_Spinner.default, null, 'mx_Dialog_spinner');
  }

  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  let leavingAllVersions = true;
  const history = cli.getRoomUpgradeHistory(roomId);

  if (history && history.length > 0) {
    const currentRoom = history[history.length - 1];

    if (currentRoom.roomId !== roomId) {
      // The user is trying to leave an older version of the room. Let them through
      // without making them leave the current version of the room.
      leavingAllVersions = false;
    }
  }

  const room = cli.getRoom(roomId); // await any queued messages being sent so that they do not fail

  await Promise.all(room.getPendingEvents().filter(ev => {
    return [_eventStatus.EventStatus.QUEUED, _eventStatus.EventStatus.ENCRYPTING, _eventStatus.EventStatus.SENDING].includes(ev.status);
  }).map(ev => new Promise((resolve, reject) => {
    const handler = () => {
      if (ev.status === _eventStatus.EventStatus.NOT_SENT) {
        spinnerModal?.close();
        reject(ev.error);
      }

      if (!ev.status || ev.status === _eventStatus.EventStatus.SENT) {
        ev.off(_event.MatrixEventEvent.Status, handler);
        resolve();
      }
    };

    ev.on(_event.MatrixEventEvent.Status, handler);
  })));
  let results = {};

  if (!leavingAllVersions) {
    try {
      await cli.leave(roomId);
    } catch (e) {
      if (e?.data?.errcode) {
        const message = e.data.error || (0, _languageHandler._t)("Unexpected server error trying to leave the room");
        results[roomId] = Object.assign(new Error(message), {
          errcode: e.data.errcode,
          data: e.data
        });
      } else {
        results[roomId] = e || new Error("Failed to leave room for unknown causes");
      }
    }
  } else {
    results = await cli.leaveRoomChain(roomId, retry);
  }

  if (retry) {
    const limitExceededError = Object.values(results).find(e => e?.errcode === "M_LIMIT_EXCEEDED");

    if (limitExceededError) {
      await (0, _utils.sleep)(limitExceededError.data.retry_after_ms ?? 100);
      return leaveRoomBehaviour(roomId, false, false);
    }
  }

  spinnerModal?.close();
  const errors = Object.entries(results).filter(r => !!r[1]);

  if (errors.length > 0) {
    const messages = [];

    for (const roomErr of errors) {
      const err = roomErr[1]; // [0] is the roomId

      let message = (0, _languageHandler._t)("Unexpected server error trying to leave the room");

      if (err.errcode && err.message) {
        if (err.errcode === 'M_CANNOT_LEAVE_SERVER_NOTICE_ROOM') {
          _Modal.default.createDialog(_ErrorDialog.default, {
            title: (0, _languageHandler._t)("Can't leave Server Notices room"),
            description: (0, _languageHandler._t)("This room is used for important messages from the Homeserver, " + "so you cannot leave it.")
          });

          return;
        }

        message = results[roomId].message;
      }

      messages.push(message, /*#__PURE__*/_react.default.createElement('BR')); // createElement to avoid using a tsx file in utils
    }

    _Modal.default.createDialog(_ErrorDialog.default, {
      title: (0, _languageHandler._t)("Error leaving room"),
      description: messages
    });

    return;
  }

  if (!(0, _spaces.isMetaSpace)(_SpaceStore.default.instance.activeSpace) && _SpaceStore.default.instance.activeSpace !== roomId && _RoomViewStore.RoomViewStore.instance.getRoomId() === roomId) {
    _dispatcher.default.dispatch({
      action: _actions.Action.ViewRoom,
      room_id: _SpaceStore.default.instance.activeSpace,
      metricsTrigger: undefined // other

    });
  } else {
    _dispatcher.default.dispatch({
      action: _actions.Action.ViewHomePage
    });
  }
}

const leaveSpace = space => {
  _Modal.default.createDialog(_LeaveSpaceDialog.default, {
    space,
    onFinished: async (leave, rooms) => {
      if (!leave) return;
      await (0, _space.bulkSpaceBehaviour)(space, rooms, room => leaveRoomBehaviour(room.roomId));

      _dispatcher.default.dispatch({
        action: _actions.Action.AfterLeaveRoom,
        room_id: space.roomId
      });
    }
  }, "mx_LeaveSpaceDialog_wrapper");
};

exports.leaveSpace = leaveSpace;
//# sourceMappingURL=leave-behaviour.js.map