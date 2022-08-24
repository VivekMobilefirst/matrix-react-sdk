"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFieldsForThirdPartyLocation = getFieldsForThirdPartyLocation;
exports.joinRoomByAlias = joinRoomByAlias;
exports.privateShouldBeEncrypted = privateShouldBeEncrypted;
exports.showRoom = void 0;

var _actions = require("../dispatcher/actions");

var _WellKnownUtils = require("./WellKnownUtils");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _Rooms = require("../Rooms");

var _languageHandler = require("../languageHandler");

var _DirectoryUtils = require("./DirectoryUtils");

var _SdkConfig = _interopRequireDefault(require("../SdkConfig"));

var _error = require("./error");

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
function privateShouldBeEncrypted() {
  const e2eeWellKnown = (0, _WellKnownUtils.getE2EEWellKnown)();

  if (e2eeWellKnown) {
    const defaultDisabled = e2eeWellKnown["default"] === false;
    return !defaultDisabled;
  }

  return true;
}

const showRoom = (client, room, _ref) => {
  let {
    roomAlias,
    autoJoin = false,
    shouldPeek = false,
    roomServer
  } = _ref;
  const payload = {
    action: _actions.Action.ViewRoom,
    auto_join: autoJoin,
    should_peek: shouldPeek,
    metricsTrigger: "RoomDirectory"
  };

  if (room) {
    // Don't let the user view a room they won't be able to either
    // peek or join: fail earlier so they don't have to click back
    // to the directory.
    if (client.isGuest()) {
      if (!room.world_readable && !room.guest_can_join) {
        _dispatcher.default.dispatch({
          action: 'require_registration'
        });

        return;
      }
    }

    if (!roomAlias) {
      roomAlias = (0, _Rooms.getDisplayAliasForAliasSet)(room.canonical_alias, room.aliases);
    }

    payload.oob_data = {
      avatarUrl: room.avatar_url,
      // XXX: This logic is duplicated from the JS SDK which
      // would normally decide what the name is.
      name: room.name || roomAlias || (0, _languageHandler._t)('Unnamed room')
    };

    if (roomServer) {
      payload.via_servers = [roomServer];
    }
  } // It's not really possible to join Matrix rooms by ID because the HS has no way to know
  // which servers to start querying. However, there's no other way to join rooms in
  // this list without aliases at present, so if roomAlias isn't set here we have no
  // choice but to supply the ID.


  if (roomAlias) {
    payload.room_alias = roomAlias;
  } else {
    payload.room_id = room.room_id;
  }

  _dispatcher.default.dispatch(payload);
};

exports.showRoom = showRoom;

function joinRoomByAlias(cli, alias, _ref2) {
  let {
    instanceId,
    roomServer,
    protocols,
    metricsTrigger
  } = _ref2;

  // If we don't have a particular instance id selected, just show that rooms alias
  if (!instanceId || instanceId === _DirectoryUtils.ALL_ROOMS) {
    // If the user specified an alias without a domain, add on whichever server is selected
    // in the dropdown
    if (!alias.includes(':')) {
      alias = alias + ':' + roomServer;
    }

    showRoom(cli, null, {
      roomAlias: alias,
      autoJoin: true,
      metricsTrigger
    });
  } else {
    // This is a 3rd party protocol. Let's see if we can join it
    const protocolName = (0, _DirectoryUtils.protocolNameForInstanceId)(protocols, instanceId);
    const instance = (0, _DirectoryUtils.instanceForInstanceId)(protocols, instanceId);
    const fields = protocolName ? getFieldsForThirdPartyLocation(alias, protocols[protocolName], instance) : null;

    if (!fields) {
      const brand = _SdkConfig.default.get().brand;

      throw new _error.GenericError((0, _languageHandler._t)('Unable to join network'), (0, _languageHandler._t)('%(brand)s does not know how to join a room on this network', {
        brand
      }));
    }

    cli.getThirdpartyLocation(protocolName, fields).then(resp => {
      if (resp.length > 0 && resp[0].alias) {
        showRoom(cli, null, {
          roomAlias: resp[0].alias,
          autoJoin: true,
          metricsTrigger
        });
      } else {
        throw new _error.GenericError((0, _languageHandler._t)('Room not found'), (0, _languageHandler._t)('Couldn\'t find a matching Matrix room'));
      }
    }, e => {
      throw new _error.GenericError((0, _languageHandler._t)('Fetching third party location failed'), (0, _languageHandler._t)('Unable to look up room ID from server'));
    });
  }
}

function getFieldsForThirdPartyLocation(userInput, protocol, instance) {
  // make an object with the fields specified by that protocol. We
  // require that the values of all but the last field come from the
  // instance. The last is the user input.
  const requiredFields = protocol.location_fields;
  if (!requiredFields) return null;
  const fields = {};

  for (let i = 0; i < requiredFields.length - 1; ++i) {
    const thisField = requiredFields[i];
    if (instance.fields[thisField] === undefined) return null;
    fields[thisField] = instance.fields[thisField];
  }

  fields[requiredFields[requiredFields.length - 1]] = userInput;
  return fields;
}
//# sourceMappingURL=rooms.js.map