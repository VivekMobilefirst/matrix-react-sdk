"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.host = exports.default = exports.baseUrl = void 0;

var _PermalinkConstructor = _interopRequireWildcard(require("./PermalinkConstructor"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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
const host = "matrix.to";
exports.host = host;
const baseUrl = `https://${host}`;
/**
 * Generates matrix.to permalinks
 */

exports.baseUrl = baseUrl;

class MatrixToPermalinkConstructor extends _PermalinkConstructor.default {
  constructor() {
    super();
  }

  forEvent(roomId, eventId, serverCandidates) {
    return `${baseUrl}/#/${roomId}/${eventId}${this.encodeServerCandidates(serverCandidates)}`;
  }

  forRoom(roomIdOrAlias, serverCandidates) {
    return `${baseUrl}/#/${roomIdOrAlias}${this.encodeServerCandidates(serverCandidates)}`;
  }

  forUser(userId) {
    return `${baseUrl}/#/${userId}`;
  }

  forGroup(groupId) {
    return `${baseUrl}/#/${groupId}`;
  }

  forEntity(entityId) {
    return `${baseUrl}/#/${entityId}`;
  }

  isPermalinkHost(testHost) {
    return testHost === host;
  }

  encodeServerCandidates(candidates) {
    if (!candidates || candidates.length === 0) return '';
    return `?via=${candidates.map(c => encodeURIComponent(c)).join("&via=")}`;
  } // Heavily inspired by/borrowed from the matrix-bot-sdk (with permission):
  // https://github.com/turt2live/matrix-js-bot-sdk/blob/7c4665c9a25c2c8e0fe4e509f2616505b5b66a1c/src/Permalinks.ts#L33-L61


  parsePermalink(fullUrl) {
    if (!fullUrl || !fullUrl.startsWith(baseUrl)) {
      throw new Error("Does not appear to be a permalink");
    }

    const parts = fullUrl.substring(`${baseUrl}/#/`.length).split("/");
    const entity = parts[0];

    if (entity[0] === '@') {
      // Probably a user, no further parsing needed.
      return _PermalinkConstructor.PermalinkParts.forUser(entity);
    } else if (entity[0] === '#' || entity[0] === '!') {
      if (parts.length === 1) {
        // room without event permalink
        const [roomId, query = ""] = entity.split("?");
        const via = query.split(/&?via=/g).filter(p => !!p);
        return _PermalinkConstructor.PermalinkParts.forRoom(roomId, via);
      } // rejoin the rest because v3 events can have slashes (annoyingly)


      const eventIdAndQuery = parts.length > 1 ? parts.slice(1).join('/') : "";
      const [eventId, query = ""] = eventIdAndQuery.split("?");
      const via = query.split(/&?via=/g).filter(p => !!p);
      return _PermalinkConstructor.PermalinkParts.forEvent(entity, eventId, via);
    } else if (entity[0] === '+') {
      return _PermalinkConstructor.PermalinkParts.forGroup(entity);
    } else {
      throw new Error("Unknown entity type in permalink");
    }
  }

}

exports.default = MatrixToPermalinkConstructor;
//# sourceMappingURL=MatrixToPermalinkConstructor.js.map