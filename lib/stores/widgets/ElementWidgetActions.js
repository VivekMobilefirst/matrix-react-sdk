"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElementWidgetActions = void 0;

/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let ElementWidgetActions;
exports.ElementWidgetActions = ElementWidgetActions;

(function (ElementWidgetActions) {
  ElementWidgetActions["ClientReady"] = "im.vector.ready";
  ElementWidgetActions["WidgetReady"] = "io.element.widget_ready";
  ElementWidgetActions["JoinCall"] = "io.element.join";
  ElementWidgetActions["HangupCall"] = "im.vector.hangup";
  ElementWidgetActions["ForceHangupCall"] = "io.element.force_hangup";
  ElementWidgetActions["CallParticipants"] = "io.element.participants";
  ElementWidgetActions["MuteAudio"] = "io.element.mute_audio";
  ElementWidgetActions["UnmuteAudio"] = "io.element.unmute_audio";
  ElementWidgetActions["MuteVideo"] = "io.element.mute_video";
  ElementWidgetActions["UnmuteVideo"] = "io.element.unmute_video";
  ElementWidgetActions["StartLiveStream"] = "im.vector.start_live_stream";
  ElementWidgetActions["TileLayout"] = "io.element.tile_layout";
  ElementWidgetActions["SpotlightLayout"] = "io.element.spotlight_layout";
  ElementWidgetActions["OpenIntegrationManager"] = "integration_manager_open";
  ElementWidgetActions["ViewRoom"] = "io.element.view_room";
})(ElementWidgetActions || (exports.ElementWidgetActions = ElementWidgetActions = {}));
//# sourceMappingURL=ElementWidgetActions.js.map