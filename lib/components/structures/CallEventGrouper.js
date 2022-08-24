"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CustomCallState = exports.CallEventGrouperEvent = void 0;
exports.buildCallEventGroupers = buildCallEventGroupers;
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _event = require("matrix-js-sdk/src/@types/event");

var _call = require("matrix-js-sdk/src/webrtc/call");

var _events = require("events");

var _CallHandler = _interopRequireWildcard(require("../../CallHandler"));

var _MatrixClientPeg = require("../../MatrixClientPeg");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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
let CallEventGrouperEvent;
exports.CallEventGrouperEvent = CallEventGrouperEvent;

(function (CallEventGrouperEvent) {
  CallEventGrouperEvent["StateChanged"] = "state_changed";
  CallEventGrouperEvent["SilencedChanged"] = "silenced_changed";
  CallEventGrouperEvent["LengthChanged"] = "length_changed";
})(CallEventGrouperEvent || (exports.CallEventGrouperEvent = CallEventGrouperEvent = {}));

const CONNECTING_STATES = [_call.CallState.Connecting, _call.CallState.WaitLocalMedia, _call.CallState.CreateOffer, _call.CallState.CreateAnswer];
const SUPPORTED_STATES = [_call.CallState.Connected, _call.CallState.Ringing];
let CustomCallState;
exports.CustomCallState = CustomCallState;

(function (CustomCallState) {
  CustomCallState["Missed"] = "missed";
})(CustomCallState || (exports.CustomCallState = CustomCallState = {}));

function buildCallEventGroupers(callEventGroupers, events) {
  const newCallEventGroupers = new Map();
  events?.forEach(ev => {
    if (!ev.getType().startsWith("m.call.") && !ev.getType().startsWith("org.matrix.call.")) {
      return;
    }

    const callId = ev.getContent().call_id;

    if (!newCallEventGroupers.has(callId)) {
      if (callEventGroupers.has(callId)) {
        // reuse the CallEventGrouper object where possible
        newCallEventGroupers.set(callId, callEventGroupers.get(callId));
      } else {
        newCallEventGroupers.set(callId, new CallEventGrouper());
      }
    }

    newCallEventGroupers.get(callId).add(ev);
  });
  return newCallEventGroupers;
}

class CallEventGrouper extends _events.EventEmitter {
  constructor() {
    super();
    (0, _defineProperty2.default)(this, "events", new Set());
    (0, _defineProperty2.default)(this, "call", void 0);
    (0, _defineProperty2.default)(this, "state", void 0);
    (0, _defineProperty2.default)(this, "onSilencedCallsChanged", () => {
      const newState = _CallHandler.default.instance.isCallSilenced(this.callId);

      this.emit(CallEventGrouperEvent.SilencedChanged, newState);
    });
    (0, _defineProperty2.default)(this, "onLengthChanged", length => {
      this.emit(CallEventGrouperEvent.LengthChanged, length);
    });
    (0, _defineProperty2.default)(this, "answerCall", () => {
      _CallHandler.default.instance.answerCall(this.roomId);
    });
    (0, _defineProperty2.default)(this, "rejectCall", () => {
      _CallHandler.default.instance.hangupOrReject(this.roomId, true);
    });
    (0, _defineProperty2.default)(this, "callBack", () => {
      _CallHandler.default.instance.placeCall(this.roomId, this.isVoice ? _call.CallType.Voice : _call.CallType.Video);
    });
    (0, _defineProperty2.default)(this, "toggleSilenced", () => {
      const silenced = _CallHandler.default.instance.isCallSilenced(this.callId);

      silenced ? _CallHandler.default.instance.unSilenceCall(this.callId) : _CallHandler.default.instance.silenceCall(this.callId);
    });
    (0, _defineProperty2.default)(this, "setState", () => {
      if (CONNECTING_STATES.includes(this.call?.state)) {
        this.state = _call.CallState.Connecting;
      } else if (SUPPORTED_STATES.includes(this.call?.state)) {
        this.state = this.call.state;
      } else {
        if (this.callWasMissed) this.state = CustomCallState.Missed;else if (this.reject) this.state = _call.CallState.Ended;else if (this.hangup) this.state = _call.CallState.Ended;else if (this.invite && this.call) this.state = _call.CallState.Connecting;
      }

      this.emit(CallEventGrouperEvent.StateChanged, this.state);
    });
    (0, _defineProperty2.default)(this, "setCall", () => {
      if (this.call) return;
      this.call = _CallHandler.default.instance.getCallById(this.callId);
      this.setCallListeners();
      this.setState();
    });

    _CallHandler.default.instance.addListener(_CallHandler.CallHandlerEvent.CallsChanged, this.setCall);

    _CallHandler.default.instance.addListener(_CallHandler.CallHandlerEvent.SilencedCallsChanged, this.onSilencedCallsChanged);
  }

  get invite() {
    return [...this.events].find(event => event.getType() === _event.EventType.CallInvite);
  }

  get hangup() {
    return [...this.events].find(event => event.getType() === _event.EventType.CallHangup);
  }

  get reject() {
    return [...this.events].find(event => event.getType() === _event.EventType.CallReject);
  }

  get selectAnswer() {
    return [...this.events].find(event => event.getType() === _event.EventType.CallSelectAnswer);
  }

  get isVoice() {
    const invite = this.invite;
    if (!invite) return; // FIXME: Find a better way to determine this from the event?

    if (invite.getContent()?.offer?.sdp?.indexOf('m=video') !== -1) return false;
    return true;
  }

  get hangupReason() {
    return this.hangup?.getContent()?.reason;
  }

  get rejectParty() {
    return this.reject?.getSender();
  }

  get gotRejected() {
    return Boolean(this.reject);
  }

  get duration() {
    if (!this.hangup || !this.selectAnswer) return;
    return new Date(this.hangup.getDate().getTime() - this.selectAnswer.getDate().getTime());
  }
  /**
   * Returns true if there are only events from the other side - we missed the call
   */


  get callWasMissed() {
    return ![...this.events].some(event => event.sender?.userId === _MatrixClientPeg.MatrixClientPeg.get().getUserId());
  }

  get callId() {
    return [...this.events][0]?.getContent()?.call_id;
  }

  get roomId() {
    return [...this.events][0]?.getRoomId();
  }

  setCallListeners() {
    if (!this.call) return;
    this.call.addListener(_call.CallEvent.State, this.setState);
    this.call.addListener(_call.CallEvent.LengthChanged, this.onLengthChanged);
  }

  add(event) {
    if (this.events.has(event)) return; // nothing to do

    this.events.add(event);
    this.setCall();
  }

}

exports.default = CallEventGrouper;
//# sourceMappingURL=CallEventGrouper.js.map