"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NaturalAlgorithm = void 0;

var _logger = require("matrix-js-sdk/src/logger");

var _tagSorting = require("../tag-sorting");

var _OrderingAlgorithm = require("./OrderingAlgorithm");

var _models = require("../../models");

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

/**
 * Uses the natural tag sorting algorithm order to determine tag ordering. No
 * additional behavioural changes are present.
 */
class NaturalAlgorithm extends _OrderingAlgorithm.OrderingAlgorithm {
  constructor(tagId, initialSortingAlgorithm) {
    super(tagId, initialSortingAlgorithm);
  }

  setRooms(rooms) {
    this.cachedOrderedRooms = (0, _tagSorting.sortRoomsWithAlgorithm)(rooms, this.tagId, this.sortingAlgorithm);
  }

  handleRoomUpdate(room, cause) {
    const isSplice = cause === _models.RoomUpdateCause.NewRoom || cause === _models.RoomUpdateCause.RoomRemoved;
    const isInPlace = cause === _models.RoomUpdateCause.Timeline || cause === _models.RoomUpdateCause.ReadReceipt;

    if (!isSplice && !isInPlace) {
      throw new Error(`Unsupported update cause: ${cause}`);
    }

    if (cause === _models.RoomUpdateCause.NewRoom) {
      this.cachedOrderedRooms.push(room);
    } else if (cause === _models.RoomUpdateCause.RoomRemoved) {
      const idx = this.getRoomIndex(room);

      if (idx >= 0) {
        this.cachedOrderedRooms.splice(idx, 1);
      } else {
        _logger.logger.warn(`Tried to remove unknown room from ${this.tagId}: ${room.roomId}`);
      }
    } // TODO: Optimize this to avoid useless operations: https://github.com/vector-im/element-web/issues/14457
    // For example, we can skip updates to alphabetic (sometimes) and manually ordered tags


    this.cachedOrderedRooms = (0, _tagSorting.sortRoomsWithAlgorithm)(this.cachedOrderedRooms, this.tagId, this.sortingAlgorithm);
    return true;
  }

}

exports.NaturalAlgorithm = NaturalAlgorithm;
//# sourceMappingURL=NaturalAlgorithm.js.map