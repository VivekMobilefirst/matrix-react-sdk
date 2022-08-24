"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MessagePreviewStore = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _utils = require("matrix-js-sdk/src/utils");

var _matrixEventsSdk = require("matrix-events-sdk");

var _AsyncStoreWithClient = require("../AsyncStoreWithClient");

var _dispatcher = _interopRequireDefault(require("../../dispatcher/dispatcher"));

var _MessageEventPreview = require("./previews/MessageEventPreview");

var _PollStartEventPreview = require("./previews/PollStartEventPreview");

var _CallInviteEventPreview = require("./previews/CallInviteEventPreview");

var _CallAnswerEventPreview = require("./previews/CallAnswerEventPreview");

var _CallHangupEvent = require("./previews/CallHangupEvent");

var _StickerEventPreview = require("./previews/StickerEventPreview");

var _ReactionEventPreview = require("./previews/ReactionEventPreview");

var _AsyncStore = require("../AsyncStore");

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
// Emitted event for when a room's preview has changed. First argument will the room for which
// the change happened.
const ROOM_PREVIEW_CHANGED = "room_preview_changed";
const PREVIEWS = {
  'm.room.message': {
    isState: false,
    previewer: new _MessageEventPreview.MessageEventPreview()
  },
  'm.call.invite': {
    isState: false,
    previewer: new _CallInviteEventPreview.CallInviteEventPreview()
  },
  'm.call.answer': {
    isState: false,
    previewer: new _CallAnswerEventPreview.CallAnswerEventPreview()
  },
  'm.call.hangup': {
    isState: false,
    previewer: new _CallHangupEvent.CallHangupEvent()
  },
  'm.sticker': {
    isState: false,
    previewer: new _StickerEventPreview.StickerEventPreview()
  },
  'm.reaction': {
    isState: false,
    previewer: new _ReactionEventPreview.ReactionEventPreview()
  },
  [_matrixEventsSdk.M_POLL_START.name]: {
    isState: false,
    previewer: new _PollStartEventPreview.PollStartEventPreview()
  },
  [_matrixEventsSdk.M_POLL_START.altName]: {
    isState: false,
    previewer: new _PollStartEventPreview.PollStartEventPreview()
  }
}; // The maximum number of events we're willing to look back on to get a preview.

const MAX_EVENTS_BACKWARDS = 50; // type merging ftw

// eslint-disable-line @typescript-eslint/naming-convention
const TAG_ANY = "im.vector.any";

class MessagePreviewStore extends _AsyncStoreWithClient.AsyncStoreWithClient {
  // null indicates the preview is empty / irrelevant
  constructor() {
    super(_dispatcher.default, {});
    (0, _defineProperty2.default)(this, "previews", new Map());
  }

  static get instance() {
    return MessagePreviewStore.internalInstance;
  }

  static getPreviewChangedEventName(room) {
    return `${ROOM_PREVIEW_CHANGED}:${room?.roomId}`;
  }
  /**
   * Gets the pre-translated preview for a given room
   * @param room The room to get the preview for.
   * @param inTagId The tag ID in which the room resides
   * @returns The preview, or null if none present.
   */


  async getPreviewForRoom(room, inTagId) {
    if (!room) return null; // invalid room, just return nothing

    if (!this.previews.has(room.roomId)) await this.generatePreview(room, inTagId);
    const previews = this.previews.get(room.roomId);
    if (!previews) return null;

    if (!previews.has(inTagId)) {
      return previews.get(TAG_ANY);
    }

    return previews.get(inTagId);
  }

  generatePreviewForEvent(event) {
    const previewDef = PREVIEWS[event.getType()];
    return previewDef?.previewer.getTextFor(event, null, true) ?? "";
  }

  async generatePreview(room, tagId) {
    const events = room.timeline;
    if (!events) return; // should only happen in tests

    let map = this.previews.get(room.roomId);

    if (!map) {
      map = new Map();
      this.previews.set(room.roomId, map);
    } // Set the tags so we know what to generate


    if (!map.has(TAG_ANY)) map.set(TAG_ANY, null);
    if (tagId && !map.has(tagId)) map.set(tagId, null);
    let changed = false;

    for (let i = events.length - 1; i >= 0; i--) {
      if (i === events.length - MAX_EVENTS_BACKWARDS) {
        // limit reached - clear the preview by breaking out of the loop
        break;
      }

      const event = events[i];
      await this.matrixClient.decryptEventIfNeeded(event);
      const previewDef = PREVIEWS[event.getType()];
      if (!previewDef) continue;
      if (previewDef.isState && (0, _utils.isNullOrUndefined)(event.getStateKey())) continue;
      const anyPreview = previewDef.previewer.getTextFor(event, null);
      if (!anyPreview) continue; // not previewable for some reason

      changed = changed || anyPreview !== map.get(TAG_ANY);
      map.set(TAG_ANY, anyPreview);
      const tagsToGenerate = Array.from(map.keys()).filter(t => t !== TAG_ANY); // we did the any tag above

      for (const genTagId of tagsToGenerate) {
        const realTagId = genTagId === TAG_ANY ? null : genTagId;
        const preview = previewDef.previewer.getTextFor(event, realTagId);

        if (preview === anyPreview) {
          changed = changed || anyPreview !== map.get(genTagId);
          map.delete(genTagId);
        } else {
          changed = changed || preview !== map.get(genTagId);
          map.set(genTagId, preview);
        }
      }

      if (changed) {
        // We've muted the underlying Map, so just emit that we've changed.
        this.previews.set(room.roomId, map);
        this.emit(_AsyncStore.UPDATE_EVENT, this);
        this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
      }

      return; // we're done
    } // At this point, we didn't generate a preview so clear it


    this.previews.set(room.roomId, new Map());
    this.emit(_AsyncStore.UPDATE_EVENT, this);
    this.emit(MessagePreviewStore.getPreviewChangedEventName(room), room);
  }

  async onAction(payload) {
    if (!this.matrixClient) return;

    if (payload.action === 'MatrixActions.Room.timeline' || payload.action === 'MatrixActions.Event.decrypted') {
      const event = payload.event; // TODO: Type out the dispatcher

      const isHistoricalEvent = payload.hasOwnProperty("isLiveEvent") && !payload.isLiveEvent;
      if (!this.previews.has(event.getRoomId()) || isHistoricalEvent) return; // not important

      await this.generatePreview(this.matrixClient.getRoom(event.getRoomId()), TAG_ANY);
    }
  }

}

exports.MessagePreviewStore = MessagePreviewStore;
(0, _defineProperty2.default)(MessagePreviewStore, "internalInstance", new MessagePreviewStore());
//# sourceMappingURL=MessagePreviewStore.js.map