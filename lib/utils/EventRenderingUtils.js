"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getEventDisplayInfo = getEventDisplayInfo;

var _event = require("matrix-js-sdk/src/@types/event");

var _matrixEventsSdk = require("matrix-events-sdk");

var _beacon = require("matrix-js-sdk/src/@types/beacon");

var _SettingsStore = _interopRequireDefault(require("../settings/SettingsStore"));

var _EventTileFactory = require("../events/EventTileFactory");

var _MatrixClientPeg = require("../MatrixClientPeg");

var _EventUtils = require("./EventUtils");

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
function getEventDisplayInfo(mxEvent, showHiddenEvents, hideEvent) {
  const content = mxEvent.getContent();
  const msgtype = content.msgtype;
  const eventType = mxEvent.getType();
  let isSeeingThroughMessageHiddenForModeration = false;

  if (_SettingsStore.default.getValue("feature_msc3531_hide_messages_pending_moderation")) {
    switch ((0, _EventUtils.getMessageModerationState)(mxEvent)) {
      case _EventUtils.MessageModerationState.VISIBLE_FOR_ALL:
      case _EventUtils.MessageModerationState.HIDDEN_TO_CURRENT_USER:
        // Nothing specific to do here
        break;

      case _EventUtils.MessageModerationState.SEE_THROUGH_FOR_CURRENT_USER:
        // Show message with a marker.
        isSeeingThroughMessageHiddenForModeration = true;
        break;
    }
  } // TODO: Thread a MatrixClient through to here


  let factory = (0, _EventTileFactory.pickFactory)(mxEvent, _MatrixClientPeg.MatrixClientPeg.get(), showHiddenEvents); // Info messages are basically information about commands processed on a room

  let isBubbleMessage = eventType.startsWith("m.key.verification") || eventType === _event.EventType.RoomMessage && msgtype?.startsWith("m.key.verification") || eventType === _event.EventType.RoomCreate || eventType === _event.EventType.RoomEncryption || factory === _EventTileFactory.JitsiEventFactory;

  const isLeftAlignedBubbleMessage = !isBubbleMessage && eventType === _event.EventType.CallInvite;
  let isInfoMessage = !isBubbleMessage && !isLeftAlignedBubbleMessage && eventType !== _event.EventType.RoomMessage && eventType !== _event.EventType.RoomMessageEncrypted && eventType !== _event.EventType.Sticker && eventType !== _event.EventType.RoomCreate && !_matrixEventsSdk.M_POLL_START.matches(eventType) && !_beacon.M_BEACON_INFO.matches(eventType); // Some non-info messages want to be rendered in the appropriate bubble column but without the bubble background

  const noBubbleEvent = eventType === _event.EventType.RoomMessage && msgtype === _event.MsgType.Emote || _matrixEventsSdk.M_POLL_START.matches(eventType) || _beacon.M_BEACON_INFO.matches(eventType) || (0, _EventUtils.isLocationEvent)(mxEvent); // If we're showing hidden events in the timeline, we should use the
  // source tile when there's no regular tile for an event and also for
  // replace relations (which otherwise would display as a confusing
  // duplicate of the thing they are replacing).

  if (hideEvent || !(0, _EventTileFactory.haveRendererForEvent)(mxEvent, showHiddenEvents)) {
    // forcefully ask for a factory for a hidden event (hidden event
    // setting is checked internally)
    // TODO: Thread a MatrixClient through to here
    factory = (0, _EventTileFactory.pickFactory)(mxEvent, _MatrixClientPeg.MatrixClientPeg.get(), showHiddenEvents, true);

    if (factory === _EventTileFactory.JSONEventFactory) {
      isBubbleMessage = false; // Reuse info message avatar and sender profile styling

      isInfoMessage = true;
    }
  }

  return {
    hasRenderer: !!factory,
    isInfoMessage,
    isBubbleMessage,
    isLeftAlignedBubbleMessage,
    noBubbleEvent,
    isSeeingThroughMessageHiddenForModeration
  };
}
//# sourceMappingURL=EventRenderingUtils.js.map