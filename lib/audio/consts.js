"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WORKLET_NAME = exports.PayloadEvent = void 0;

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
const WORKLET_NAME = "mx-voice-worklet";
exports.WORKLET_NAME = WORKLET_NAME;
let PayloadEvent;
exports.PayloadEvent = PayloadEvent;

(function (PayloadEvent) {
  PayloadEvent["Timekeep"] = "timekeep";
  PayloadEvent["AmplitudeMark"] = "amplitude_mark";
})(PayloadEvent || (exports.PayloadEvent = PayloadEvent = {}));
//# sourceMappingURL=consts.js.map