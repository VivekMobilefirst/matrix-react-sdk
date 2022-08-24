"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HostSignupStore = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _AsyncStore = require("./AsyncStore");

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
class HostSignupStore extends _AsyncStore.AsyncStore {
  constructor() {
    super(_dispatcher.default, {
      hostSignupActive: false
    });
  }

  static get instance() {
    return HostSignupStore.internalInstance;
  }

  get isHostSignupActive() {
    return this.state.hostSignupActive;
  }

  async setHostSignupActive(status) {
    return this.updateState({
      hostSignupActive: status
    });
  }

  onDispatch(payload) {// Nothing to do
  }

}

exports.HostSignupStore = HostSignupStore;
(0, _defineProperty2.default)(HostSignupStore, "internalInstance", new HostSignupStore());
//# sourceMappingURL=HostSignupStore.js.map