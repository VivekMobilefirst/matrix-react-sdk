"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.MediaDeviceKindEnum = exports.MediaDeviceHandlerEvent = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _events = _interopRequireDefault(require("events"));

var _logger = require("matrix-js-sdk/src/logger");

var _SettingsStore = _interopRequireDefault(require("./settings/SettingsStore"));

var _SettingLevel = require("./settings/SettingLevel");

var _MatrixClientPeg = require("./MatrixClientPeg");

/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
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
// XXX: MediaDeviceKind is a union type, so we make our own enum
let MediaDeviceKindEnum;
exports.MediaDeviceKindEnum = MediaDeviceKindEnum;

(function (MediaDeviceKindEnum) {
  MediaDeviceKindEnum["AudioOutput"] = "audiooutput";
  MediaDeviceKindEnum["AudioInput"] = "audioinput";
  MediaDeviceKindEnum["VideoInput"] = "videoinput";
})(MediaDeviceKindEnum || (exports.MediaDeviceKindEnum = MediaDeviceKindEnum = {}));

let MediaDeviceHandlerEvent;
exports.MediaDeviceHandlerEvent = MediaDeviceHandlerEvent;

(function (MediaDeviceHandlerEvent) {
  MediaDeviceHandlerEvent["AudioOutputChanged"] = "audio_output_changed";
})(MediaDeviceHandlerEvent || (exports.MediaDeviceHandlerEvent = MediaDeviceHandlerEvent = {}));

class MediaDeviceHandler extends _events.default {
  static get instance() {
    if (!MediaDeviceHandler.internalInstance) {
      MediaDeviceHandler.internalInstance = new MediaDeviceHandler();
    }

    return MediaDeviceHandler.internalInstance;
  }

  static async hasAnyLabeledDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => Boolean(d.label));
  }

  static async getDevices() {
    // Only needed for Electron atm, though should work in modern browsers
    // once permission has been granted to the webapp
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const output = {
        [MediaDeviceKindEnum.AudioOutput]: [],
        [MediaDeviceKindEnum.AudioInput]: [],
        [MediaDeviceKindEnum.VideoInput]: []
      };
      devices.forEach(device => output[device.kind].push(device));
      return output;
    } catch (error) {
      _logger.logger.warn('Unable to refresh WebRTC Devices: ', error);
    }
  }
  /**
   * Retrieves devices from the SettingsStore and tells the js-sdk to use them
   */


  static async loadDevices() {
    const audioDeviceId = _SettingsStore.default.getValue("webrtc_audioinput");

    const videoDeviceId = _SettingsStore.default.getValue("webrtc_videoinput");

    await _MatrixClientPeg.MatrixClientPeg.get().getMediaHandler().setAudioInput(audioDeviceId);
    await _MatrixClientPeg.MatrixClientPeg.get().getMediaHandler().setVideoInput(videoDeviceId);
  }

  setAudioOutput(deviceId) {
    _SettingsStore.default.setValue("webrtc_audiooutput", null, _SettingLevel.SettingLevel.DEVICE, deviceId);

    this.emit(MediaDeviceHandlerEvent.AudioOutputChanged, deviceId);
  }
  /**
   * This will not change the device that a potential call uses. The call will
   * need to be ended and started again for this change to take effect
   * @param {string} deviceId
   */


  async setAudioInput(deviceId) {
    _SettingsStore.default.setValue("webrtc_audioinput", null, _SettingLevel.SettingLevel.DEVICE, deviceId);

    return _MatrixClientPeg.MatrixClientPeg.get().getMediaHandler().setAudioInput(deviceId);
  }
  /**
   * This will not change the device that a potential call uses. The call will
   * need to be ended and started again for this change to take effect
   * @param {string} deviceId
   */


  async setVideoInput(deviceId) {
    _SettingsStore.default.setValue("webrtc_videoinput", null, _SettingLevel.SettingLevel.DEVICE, deviceId);

    return _MatrixClientPeg.MatrixClientPeg.get().getMediaHandler().setVideoInput(deviceId);
  }

  async setDevice(deviceId, kind) {
    switch (kind) {
      case MediaDeviceKindEnum.AudioOutput:
        this.setAudioOutput(deviceId);
        break;

      case MediaDeviceKindEnum.AudioInput:
        await this.setAudioInput(deviceId);
        break;

      case MediaDeviceKindEnum.VideoInput:
        await this.setVideoInput(deviceId);
        break;
    }
  }

  static getAudioOutput() {
    return _SettingsStore.default.getValueAt(_SettingLevel.SettingLevel.DEVICE, "webrtc_audiooutput");
  }

  static getAudioInput() {
    return _SettingsStore.default.getValueAt(_SettingLevel.SettingLevel.DEVICE, "webrtc_audioinput");
  }

  static getVideoInput() {
    return _SettingsStore.default.getValueAt(_SettingLevel.SettingLevel.DEVICE, "webrtc_videoinput");
  }
  /**
   * Returns the current set deviceId for a device kind
   * @param {MediaDeviceKindEnum} kind of the device that will be returned
   * @returns {string} the deviceId
   */


  static getDevice(kind) {
    switch (kind) {
      case MediaDeviceKindEnum.AudioOutput:
        return this.getAudioOutput();

      case MediaDeviceKindEnum.AudioInput:
        return this.getAudioInput();

      case MediaDeviceKindEnum.VideoInput:
        return this.getVideoInput();
    }
  }

}

exports.default = MediaDeviceHandler;
(0, _defineProperty2.default)(MediaDeviceHandler, "internalInstance", void 0);
//# sourceMappingURL=MediaDeviceHandler.js.map