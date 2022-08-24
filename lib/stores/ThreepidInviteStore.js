"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _events = _interopRequireDefault(require("events"));

var _rfc = require("rfc4648");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

const STORAGE_PREFIX = "mx_threepid_invite_";

class ThreepidInviteStore extends _events.default {
  static get instance() {
    if (!ThreepidInviteStore._instance) {
      ThreepidInviteStore._instance = new ThreepidInviteStore();
    }

    return ThreepidInviteStore._instance;
  }

  storeInvite(roomId, wireInvite) {
    const invite = _objectSpread({
      roomId
    }, wireInvite);

    const id = this.generateIdOf(invite);
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(invite));
    return this.translateInvite(invite);
  }

  getWireInvites() {
    const results = [];

    for (let i = 0; i < localStorage.length; i++) {
      const keyName = localStorage.key(i);
      if (!keyName.startsWith(STORAGE_PREFIX)) continue;
      results.push(JSON.parse(localStorage.getItem(keyName)));
    }

    return results;
  }

  getInvites() {
    return this.getWireInvites().map(i => this.translateInvite(i));
  } // Currently Element can only handle one invite at a time, so handle that


  pickBestInvite() {
    return this.getInvites()[0];
  }

  resolveInvite(invite) {
    localStorage.removeItem(`${STORAGE_PREFIX}${invite.id}`);
  }

  generateIdOf(persisted) {
    // Use a consistent "hash" to form an ID.
    return _rfc.base32.stringify(Buffer.from(JSON.stringify(persisted)));
  }

  translateInvite(persisted) {
    return {
      id: this.generateIdOf(persisted),
      roomId: persisted.roomId,
      toEmail: persisted.email,
      signUrl: persisted.signurl,
      roomName: persisted.room_name,
      roomAvatarUrl: persisted.room_avatar_url,
      inviterName: persisted.inviter_name
    };
  }

  translateToWireFormat(invite) {
    return {
      email: invite.toEmail,
      signurl: invite.signUrl,
      room_name: invite.roomName,
      room_avatar_url: invite.roomAvatarUrl,
      inviter_name: invite.inviterName
    };
  }

}

exports.default = ThreepidInviteStore;
(0, _defineProperty2.default)(ThreepidInviteStore, "_instance", void 0);
//# sourceMappingURL=ThreepidInviteStore.js.map