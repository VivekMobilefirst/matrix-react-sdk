"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MatrixClientPeg = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _matrix = require("matrix-js-sdk/src/matrix");

var _memory = require("matrix-js-sdk/src/store/memory");

var utils = _interopRequireWildcard(require("matrix-js-sdk/src/utils"));

var _eventTimeline = require("matrix-js-sdk/src/models/event-timeline");

var _eventTimelineSet = require("matrix-js-sdk/src/models/event-timeline-set");

var _crypto = require("matrix-js-sdk/src/crypto");

var _QRCode = require("matrix-js-sdk/src/crypto/verification/QRCode");

var _logger = require("matrix-js-sdk/src/logger");

var _createMatrixClient = _interopRequireDefault(require("./utils/createMatrixClient"));

var _SettingsStore = _interopRequireDefault(require("./settings/SettingsStore"));

var _MatrixActionCreators = _interopRequireDefault(require("./actions/MatrixActionCreators"));

var _Modal = _interopRequireDefault(require("./Modal"));

var _MatrixClientBackedSettingsHandler = _interopRequireDefault(require("./settings/handlers/MatrixClientBackedSettingsHandler"));

var StorageManager = _interopRequireWildcard(require("./utils/StorageManager"));

var _IdentityAuthClient = _interopRequireDefault(require("./IdentityAuthClient"));

var _SecurityManager = require("./SecurityManager");

var _Security = _interopRequireDefault(require("./customisations/Security"));

var _CryptoStoreTooNewDialog = _interopRequireDefault(require("./components/views/dialogs/CryptoStoreTooNewDialog"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/**
 * Wrapper object for handling the js-sdk Matrix Client object in the react-sdk
 * Handles the creation/initialisation of client objects.
 * This module provides a singleton instance of this class so the 'current'
 * Matrix Client object is available easily.
 */
class MatrixClientPegClass {
  constructor() {
    (0, _defineProperty2.default)(this, "opts", {
      initialSyncLimit: 20
    });
    (0, _defineProperty2.default)(this, "matrixClient", null);
    (0, _defineProperty2.default)(this, "justRegisteredUserId", null);
    (0, _defineProperty2.default)(this, "currentClientCreds", void 0);
  }

  get() {
    return this.matrixClient;
  }

  unset() {
    this.matrixClient = null;

    _MatrixActionCreators.default.stop();
  }

  setJustRegisteredUserId(uid) {
    this.justRegisteredUserId = uid;

    if (uid) {
      const registrationTime = Date.now().toString();
      window.localStorage.setItem("mx_registration_time", registrationTime);
    }
  }

  currentUserIsJustRegistered() {
    return this.matrixClient && this.matrixClient.credentials.userId === this.justRegisteredUserId;
  }

  userRegisteredWithinLastHours(hours) {
    if (hours <= 0) {
      return false;
    }

    try {
      const registrationTime = parseInt(window.localStorage.getItem("mx_registration_time"), 10);
      const diff = Date.now() - registrationTime;
      return diff / 36e5 <= hours;
    } catch (e) {
      return false;
    }
  }

  userRegisteredAfter(timestamp) {
    try {
      const registrationTime = parseInt(window.localStorage.getItem("mx_registration_time"), 10);
      return timestamp.getTime() <= registrationTime;
    } catch (e) {
      return false;
    }
  }

  replaceUsingCreds(creds) {
    this.currentClientCreds = creds;
    this.createClient(creds);
  }

  async assign() {
    for (const dbType of ['indexeddb', 'memory']) {
      try {
        const promise = this.matrixClient.store.startup();

        _logger.logger.log("MatrixClientPeg: waiting for MatrixClient store to initialise");

        await promise;
        break;
      } catch (err) {
        if (dbType === 'indexeddb') {
          _logger.logger.error('Error starting matrixclient store - falling back to memory store', err);

          this.matrixClient.store = new _memory.MemoryStore({
            localStorage: localStorage
          });
        } else {
          _logger.logger.error('Failed to start memory store!', err);

          throw err;
        }
      }
    } // try to initialise e2e on the new client


    try {
      // check that we have a version of the js-sdk which includes initCrypto
      if (!_SettingsStore.default.getValue("lowBandwidth") && this.matrixClient.initCrypto) {
        await this.matrixClient.initCrypto();
        this.matrixClient.setCryptoTrustCrossSignedDevices(!_SettingsStore.default.getValue('e2ee.manuallyVerifyAllSessions'));
        await (0, _SecurityManager.tryToUnlockSecretStorageWithDehydrationKey)(this.matrixClient);
        StorageManager.setCryptoInitialised(true);
      }
    } catch (e) {
      if (e && e.name === 'InvalidCryptoStoreError') {
        // The js-sdk found a crypto DB too new for it to use
        _Modal.default.createDialog(_CryptoStoreTooNewDialog.default);
      } // this can happen for a number of reasons, the most likely being
      // that the olm library was missing. It's not fatal.


      _logger.logger.warn("Unable to initialise e2e", e);
    }

    const opts = utils.deepCopy(this.opts); // the react sdk doesn't work without this, so don't allow

    opts.pendingEventOrdering = _matrix.PendingEventOrdering.Detached;
    opts.lazyLoadMembers = true;
    opts.clientWellKnownPollPeriod = 2 * 60 * 60; // 2 hours

    opts.experimentalThreadSupport = _SettingsStore.default.getValue("feature_thread"); // Connect the matrix client to the dispatcher and setting handlers

    _MatrixActionCreators.default.start(this.matrixClient);

    _MatrixClientBackedSettingsHandler.default.matrixClient = this.matrixClient;
    return opts;
  }

  async start() {
    const opts = await this.assign();

    _logger.logger.log(`MatrixClientPeg: really starting MatrixClient`);

    await this.get().startClient(opts);

    _logger.logger.log(`MatrixClientPeg: MatrixClient started`);
  }

  getCredentials() {
    let copiedCredentials = this.currentClientCreds;

    if (this.currentClientCreds?.userId !== this.matrixClient?.credentials?.userId) {
      // cached credentials belong to a different user - don't use them
      copiedCredentials = null;
    }

    return _objectSpread(_objectSpread({}, copiedCredentials ?? {}), {}, {
      homeserverUrl: this.matrixClient.baseUrl,
      identityServerUrl: this.matrixClient.idBaseUrl,
      userId: this.matrixClient.credentials.userId,
      deviceId: this.matrixClient.getDeviceId(),
      accessToken: this.matrixClient.getAccessToken(),
      guest: this.matrixClient.isGuest()
    });
  }

  getHomeserverName() {
    const matches = /^@[^:]+:(.+)$/.exec(this.matrixClient.credentials.userId);

    if (matches === null || matches.length < 1) {
      throw new Error("Failed to derive homeserver name from user ID!");
    }

    return matches[1];
  }

  createClient(creds) {
    const opts = {
      baseUrl: creds.homeserverUrl,
      idBaseUrl: creds.identityServerUrl,
      accessToken: creds.accessToken,
      userId: creds.userId,
      deviceId: creds.deviceId,
      pickleKey: creds.pickleKey,
      timelineSupport: true,
      forceTURN: !_SettingsStore.default.getValue('webRtcAllowPeerToPeer'),
      fallbackICEServerAllowed: !!_SettingsStore.default.getValue('fallbackICEServerAllowed'),
      // Gather up to 20 ICE candidates when a call arrives: this should be more than we'd
      // ever normally need, so effectively this should make all the gathering happen when
      // the call arrives.
      iceCandidatePoolSize: 20,
      verificationMethods: [_crypto.verificationMethods.SAS, _QRCode.SHOW_QR_CODE_METHOD, _crypto.verificationMethods.RECIPROCATE_QR_CODE],
      identityServer: new _IdentityAuthClient.default(),
      cryptoCallbacks: {}
    }; // These are always installed regardless of the labs flag so that
    // cross-signing features can toggle on without reloading and also be
    // accessed immediately after login.

    Object.assign(opts.cryptoCallbacks, _SecurityManager.crossSigningCallbacks);

    if (_Security.default.getDehydrationKey) {
      opts.cryptoCallbacks.getDehydrationKey = _Security.default.getDehydrationKey;
    }

    this.matrixClient = (0, _createMatrixClient.default)(opts); // we're going to add eventlisteners for each matrix event tile, so the
    // potential number of event listeners is quite high.

    this.matrixClient.setMaxListeners(500);
    this.matrixClient.setGuest(Boolean(creds.guest));
    const notifTimelineSet = new _eventTimelineSet.EventTimelineSet(null, {
      timelineSupport: true,
      pendingEvents: false
    }); // XXX: what is our initial pagination token?! it somehow needs to be synchronised with /sync.

    notifTimelineSet.getLiveTimeline().setPaginationToken("", _eventTimeline.EventTimeline.BACKWARDS);
    this.matrixClient.setNotifTimelineSet(notifTimelineSet);
  }

}
/**
 * Note: You should be using a React context with access to a client rather than
 * using this, as in a multi-account world this will not exist!
 */


const MatrixClientPeg = new MatrixClientPegClass();
exports.MatrixClientPeg = MatrixClientPeg;

if (!window.mxMatrixClientPeg) {
  window.mxMatrixClientPeg = MatrixClientPeg;
}
//# sourceMappingURL=MatrixClientPeg.js.map