"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OrderingAlgorithm = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _logger = require("matrix-js-sdk/src/logger");

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
 * Represents a list ordering algorithm. Subclasses should populate the
 * `cachedOrderedRooms` field.
 */
class OrderingAlgorithm {
  constructor(tagId, initialSortingAlgorithm) {
    this.tagId = tagId;
    (0, _defineProperty2.default)(this, "cachedOrderedRooms", void 0);
    (0, _defineProperty2.default)(this, "sortingAlgorithm", void 0);
    // noinspection JSIgnoredPromiseFromCall
    this.setSortAlgorithm(initialSortingAlgorithm); // we use the setter for validation
  }
  /**
   * The rooms as ordered by the algorithm.
   */


  get orderedRooms() {
    return this.cachedOrderedRooms || [];
  }
  /**
   * Sets the sorting algorithm to use within the list.
   * @param newAlgorithm The new algorithm. Must be defined.
   * @returns Resolves when complete.
   */


  setSortAlgorithm(newAlgorithm) {
    if (!newAlgorithm) throw new Error("A sorting algorithm must be defined");
    this.sortingAlgorithm = newAlgorithm; // Force regeneration of the rooms

    this.setRooms(this.orderedRooms);
  }
  /**
   * Sets the rooms the algorithm should be handling, implying a reconstruction
   * of the ordering.
   * @param rooms The rooms to use going forward.
   */


  getRoomIndex(room) {
    let roomIdx = this.cachedOrderedRooms.indexOf(room);

    if (roomIdx === -1) {
      // can only happen if the js-sdk's store goes sideways.
      _logger.logger.warn(`Degrading performance to find missing room in "${this.tagId}": ${room.roomId}`);

      roomIdx = this.cachedOrderedRooms.findIndex(r => r.roomId === room.roomId);
    }

    return roomIdx;
  }

}

exports.OrderingAlgorithm = OrderingAlgorithm;
//# sourceMappingURL=OrderingAlgorithm.js.map