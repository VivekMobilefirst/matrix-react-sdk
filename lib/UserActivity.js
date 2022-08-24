"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _dispatcher = _interopRequireDefault(require("./dispatcher/dispatcher"));

var _Timer = _interopRequireDefault(require("./utils/Timer"));

/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 New Vector Ltd

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
// important these are larger than the timeouts of timers
// used with UserActivity.timeWhileActive*,
// such as READ_MARKER_INVIEW_THRESHOLD_MS (timeWhileActiveRecently),
// READ_MARKER_OUTOFVIEW_THRESHOLD_MS (timeWhileActiveRecently),
// READ_RECEIPT_INTERVAL_MS (timeWhileActiveNow) in TimelinePanel
// 'Under a few seconds'. Must be less than 'RECENTLY_ACTIVE_THRESHOLD_MS'
const CURRENTLY_ACTIVE_THRESHOLD_MS = 700; // 'Under a few minutes'.

const RECENTLY_ACTIVE_THRESHOLD_MS = 2 * 60 * 1000;
/**
 * This class watches for user activity (moving the mouse or pressing a key)
 * and starts/stops attached timers while the user is active.
 *
 * There are two classes of 'active': 'active now' and 'active recently'
 * see doc on the userActive* functions for what these mean.
 */

class UserActivity {
  constructor(window, document) {
    this.window = window;
    this.document = document;
    (0, _defineProperty2.default)(this, "activeNowTimeout", void 0);
    (0, _defineProperty2.default)(this, "activeRecentlyTimeout", void 0);
    (0, _defineProperty2.default)(this, "attachedActiveNowTimers", []);
    (0, _defineProperty2.default)(this, "attachedActiveRecentlyTimers", []);
    (0, _defineProperty2.default)(this, "lastScreenX", 0);
    (0, _defineProperty2.default)(this, "lastScreenY", 0);
    (0, _defineProperty2.default)(this, "onPageVisibilityChanged", e => {
      if (this.document.visibilityState === "hidden") {
        this.activeNowTimeout.abort();
        this.activeRecentlyTimeout.abort();
      } else {
        this.onUserActivity(e);
      }
    });
    (0, _defineProperty2.default)(this, "onWindowBlurred", () => {
      this.activeNowTimeout.abort();
      this.activeRecentlyTimeout.abort();
    });
    (0, _defineProperty2.default)(this, "onUserActivity", event => {
      // ignore anything if the window isn't focused
      if (!this.document.hasFocus()) return;

      if (event.screenX && event.type === "mousemove") {
        if (event.screenX === this.lastScreenX && event.screenY === this.lastScreenY) {
          // mouse hasn't actually moved
          return;
        }

        this.lastScreenX = event.screenX;
        this.lastScreenY = event.screenY;
      }

      _dispatcher.default.dispatch({
        action: 'user_activity'
      });

      if (!this.activeNowTimeout.isRunning()) {
        this.activeNowTimeout.start();

        _dispatcher.default.dispatch({
          action: 'user_activity_start'
        });

        UserActivity.runTimersUntilTimeout(this.attachedActiveNowTimers, this.activeNowTimeout);
      } else {
        this.activeNowTimeout.restart();
      }

      if (!this.activeRecentlyTimeout.isRunning()) {
        this.activeRecentlyTimeout.start();
        UserActivity.runTimersUntilTimeout(this.attachedActiveRecentlyTimers, this.activeRecentlyTimeout);
      } else {
        this.activeRecentlyTimeout.restart();
      }
    });
    this.activeNowTimeout = new _Timer.default(CURRENTLY_ACTIVE_THRESHOLD_MS);
    this.activeRecentlyTimeout = new _Timer.default(RECENTLY_ACTIVE_THRESHOLD_MS);
  }

  static sharedInstance() {
    if (window.mxUserActivity === undefined) {
      window.mxUserActivity = new UserActivity(window, document);
    }

    return window.mxUserActivity;
  }
  /**
   * Runs the given timer while the user is 'active now', aborting when the user is no longer
   * considered currently active.
   * See userActiveNow() for what it means for a user to be 'active'.
   * Can be called multiple times with the same already running timer, which is a NO-OP.
   * Can be called before the user becomes active, in which case it is only started
   * later on when the user does become active.
   * @param {Timer} timer the timer to use
   */


  timeWhileActiveNow(timer) {
    this.timeWhile(timer, this.attachedActiveNowTimers);

    if (this.userActiveNow()) {
      timer.start();
    }
  }
  /**
   * Runs the given timer while the user is 'active' now or recently,
   * aborting when the user becomes inactive.
   * See userActiveRecently() for what it means for a user to be 'active recently'.
   * Can be called multiple times with the same already running timer, which is a NO-OP.
   * Can be called before the user becomes active, in which case it is only started
   * later on when the user does become active.
   * @param {Timer} timer the timer to use
   */


  timeWhileActiveRecently(timer) {
    this.timeWhile(timer, this.attachedActiveRecentlyTimers);

    if (this.userActiveRecently()) {
      timer.start();
    }
  }

  timeWhile(timer, attachedTimers) {
    // important this happens first
    const index = attachedTimers.indexOf(timer);

    if (index === -1) {
      attachedTimers.push(timer); // remove when done or aborted

      timer.finished().finally(() => {
        const index = attachedTimers.indexOf(timer);

        if (index !== -1) {
          // should never be -1
          attachedTimers.splice(index, 1);
        } // as we fork the promise here,
        // avoid unhandled rejection warnings

      }).catch(err => {});
    }
  }
  /**
   * Start listening to user activity
   */


  start() {
    this.document.addEventListener('mousedown', this.onUserActivity);
    this.document.addEventListener('mousemove', this.onUserActivity);
    this.document.addEventListener('keydown', this.onUserActivity);
    this.document.addEventListener("visibilitychange", this.onPageVisibilityChanged);
    this.window.addEventListener("blur", this.onWindowBlurred);
    this.window.addEventListener("focus", this.onUserActivity); // can't use document.scroll here because that's only the document
    // itself being scrolled. Need to use addEventListener's useCapture.
    // also this needs to be the wheel event, not scroll, as scroll is
    // fired when the view scrolls down for a new message.

    this.window.addEventListener('wheel', this.onUserActivity, {
      passive: true,
      capture: true
    });
  }
  /**
   * Stop tracking user activity
   */


  stop() {
    this.document.removeEventListener('mousedown', this.onUserActivity);
    this.document.removeEventListener('mousemove', this.onUserActivity);
    this.document.removeEventListener('keydown', this.onUserActivity);
    this.window.removeEventListener('wheel', this.onUserActivity, {
      capture: true
    });
    this.document.removeEventListener("visibilitychange", this.onPageVisibilityChanged);
    this.window.removeEventListener("blur", this.onWindowBlurred);
    this.window.removeEventListener("focus", this.onUserActivity);
  }
  /**
   * Return true if the user is currently 'active'
   * A user is 'active' while they are interacting with the app and for a very short (<1s)
   * time after that. This is intended to give a strong indication that the app has the
   * user's attention at any given moment.
   * @returns {boolean} true if user is currently 'active'
   */


  userActiveNow() {
    return this.activeNowTimeout.isRunning();
  }
  /**
   * Return true if the user is currently active or has been recently
   * A user is 'active recently' for a longer period of time (~2 mins) after
   * they have been 'active' and while the app still has the focus. This is
   * intended to indicate when the app may still have the user's attention
   * (or they may have gone to make tea and left the window focused).
   * @returns {boolean} true if user has been active recently
   */


  userActiveRecently() {
    return this.activeRecentlyTimeout.isRunning();
  }

  static async runTimersUntilTimeout(attachedTimers, timeout) {
    attachedTimers.forEach(t => t.start());

    try {
      await timeout.finished();
    } catch (_e) {
      /* aborted */
    }

    attachedTimers.forEach(t => t.abort());
  }

}

exports.default = UserActivity;
//# sourceMappingURL=UserActivity.js.map