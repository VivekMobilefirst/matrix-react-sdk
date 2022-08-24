"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BlurhashEncoder = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _utils = require("matrix-js-sdk/src/utils");

var _blurhashWorker = _interopRequireDefault(require("./workers/blurhash.worker.ts"));

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
// @ts-ignore - `.ts` is needed here to make TS happy
class BlurhashEncoder {
  static get instance() {
    return BlurhashEncoder.internalInstance;
  }

  constructor() {
    (0, _defineProperty2.default)(this, "worker", void 0);
    (0, _defineProperty2.default)(this, "seq", 0);
    (0, _defineProperty2.default)(this, "pendingDeferredMap", new Map());
    (0, _defineProperty2.default)(this, "onMessage", ev => {
      const {
        seq,
        blurhash
      } = ev.data;
      const deferred = this.pendingDeferredMap.get(seq);

      if (deferred) {
        this.pendingDeferredMap.delete(seq);
        deferred.resolve(blurhash);
      }
    });
    this.worker = new _blurhashWorker.default();
    this.worker.onmessage = this.onMessage;
  }

  getBlurhash(imageData) {
    const seq = this.seq++;
    const deferred = (0, _utils.defer)();
    this.pendingDeferredMap.set(seq, deferred);
    this.worker.postMessage({
      seq,
      imageData
    });
    return deferred.promise;
  }

}

exports.BlurhashEncoder = BlurhashEncoder;
(0, _defineProperty2.default)(BlurhashEncoder, "internalInstance", new BlurhashEncoder());
//# sourceMappingURL=BlurhashEncoder.js.map