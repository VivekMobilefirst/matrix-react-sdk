"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VoiceRecordingStore = void 0;

var _objectWithoutProperties2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutProperties"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _AsyncStoreWithClient = require("./AsyncStoreWithClient");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _VoiceRecording = require("../audio/VoiceRecording");

function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }

function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

class VoiceRecordingStore extends _AsyncStoreWithClient.AsyncStoreWithClient {
  constructor() {
    super(_dispatcher.default, {});
  }

  static get instance() {
    if (!VoiceRecordingStore.internalInstance) {
      VoiceRecordingStore.internalInstance = new VoiceRecordingStore();
    }

    return VoiceRecordingStore.internalInstance;
  }

  async onAction(payload) {
    // Nothing to do, but we're required to override the function
    return;
  }
  /**
   * Gets the active recording instance, if any.
   * @param {string} roomId The room ID to get the recording in.
   * @returns {Optional<VoiceRecording>} The recording, if any.
   */


  getActiveRecording(roomId) {
    return this.state[roomId];
  }
  /**
   * Starts a new recording if one isn't already in progress. Note that this simply
   * creates a recording instance - whether or not recording is actively in progress
   * can be seen via the VoiceRecording class.
   * @param {string} roomId The room ID to start recording in.
   * @returns {VoiceRecording} The recording.
   */


  startRecording(roomId) {
    if (!this.matrixClient) throw new Error("Cannot start a recording without a MatrixClient");
    if (!roomId) throw new Error("Recording must be associated with a room");
    if (this.state[roomId]) throw new Error("A recording is already in progress");
    const recording = new _VoiceRecording.VoiceRecording(this.matrixClient); // noinspection JSIgnoredPromiseFromCall - we can safely run this async

    this.updateState(_objectSpread(_objectSpread({}, this.state), {}, {
      [roomId]: recording
    }));
    return recording;
  }
  /**
   * Disposes of the current recording, no matter the state of it.
   * @param {string} roomId The room ID to dispose of the recording in.
   * @returns {Promise<void>} Resolves when complete.
   */


  disposeRecording(roomId) {
    if (this.state[roomId]) {
      this.state[roomId].destroy(); // stops internally
    }

    const _this$state = this.state,
          {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      [roomId]: _toDelete
    } = _this$state,
          newState = (0, _objectWithoutProperties2.default)(_this$state, [roomId].map(_toPropertyKey)); // unexpectedly AsyncStore.updateState merges state
    // AsyncStore.reset actually just *sets*

    return this.reset(newState);
  }

}

exports.VoiceRecordingStore = VoiceRecordingStore;
(0, _defineProperty2.default)(VoiceRecordingStore, "internalInstance", void 0);
window.mxVoiceRecordingStore = VoiceRecordingStore.instance;
//# sourceMappingURL=VoiceRecordingStore.js.map