"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReactionEventPreview = void 0;

var _utils = require("./utils");

var _languageHandler = require("../../../languageHandler");

var _SettingsStore = _interopRequireDefault(require("../../../settings/SettingsStore"));

var _DMRoomMap = _interopRequireDefault(require("../../../utils/DMRoomMap"));

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
class ReactionEventPreview {
  getTextFor(event, tagId, isThread) {
    const showDms = _SettingsStore.default.getValue("feature_roomlist_preview_reactions_dms");

    const showAll = _SettingsStore.default.getValue("feature_roomlist_preview_reactions_all"); // If we're not showing all reactions, see if we're showing DMs instead


    if (!showAll) {
      // If we're not showing reactions on DMs, or we are and the room isn't a DM, skip
      if (!(showDms && _DMRoomMap.default.shared().getUserIdForRoomId(event.getRoomId()))) {
        return null;
      }
    }

    const relation = event.getRelation();
    if (!relation) return null; // invalid reaction (probably redacted)

    const reaction = relation.key;
    if (!reaction) return null; // invalid reaction (unknown format)

    if (isThread || (0, _utils.isSelf)(event) || !(0, _utils.shouldPrefixMessagesIn)(event.getRoomId(), tagId)) {
      return reaction;
    } else {
      return (0, _languageHandler._t)("%(senderName)s: %(reaction)s", {
        senderName: (0, _utils.getSenderName)(event),
        reaction
      });
    }
  }

}

exports.ReactionEventPreview = ReactionEventPreview;
//# sourceMappingURL=ReactionEventPreview.js.map