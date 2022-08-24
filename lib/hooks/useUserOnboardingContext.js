"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useUserOnboardingContext = useUserOnboardingContext;

var _logger = require("matrix-js-sdk/src/logger");

var _matrix = require("matrix-js-sdk/src/matrix");

var _react = require("react");

var _MatrixClientPeg = require("../MatrixClientPeg");

var _DMRoomMap = _interopRequireDefault(require("../utils/DMRoomMap"));

var _useEventEmitter = require("./useEventEmitter");

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
function useUserOnboardingContext() {
  const [context, setContext] = (0, _react.useState)(null);

  const cli = _MatrixClientPeg.MatrixClientPeg.get();

  const handler = (0, _react.useCallback)(async () => {
    try {
      const profile = await cli.getProfileInfo(cli.getUserId());
      const myDevice = cli.getDeviceId();
      const devices = await cli.getDevices();
      const dmRooms = _DMRoomMap.default.shared().getUniqueRoomsWithIndividuals() ?? {};
      setContext({
        avatar: profile?.avatar_url ?? null,
        myDevice,
        devices: devices.devices,
        dmRooms: dmRooms
      });
    } catch (e) {
      _logger.logger.warn("Could not load context for user onboarding task list: ", e);

      setContext(null);
    }
  }, [cli]);
  (0, _useEventEmitter.useEventEmitter)(cli, _matrix.ClientEvent.AccountData, handler);
  (0, _react.useEffect)(() => {
    const handle = setInterval(handler, 2000);
    handler();
    return () => {
      if (handle) {
        clearInterval(handle);
      }
    };
  }, [handler]);
  return context;
}
//# sourceMappingURL=useUserOnboardingContext.js.map