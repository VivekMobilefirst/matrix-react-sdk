"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProxiedModuleApi = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var Matrix = _interopRequireWildcard(require("matrix-js-sdk/src/matrix"));

var _Modal = _interopRequireDefault(require("../Modal"));

var _languageHandler = require("../languageHandler");

var _ModuleUiDialog = require("../components/views/dialogs/ModuleUiDialog");

var _SdkConfig = _interopRequireDefault(require("../SdkConfig"));

var _PlatformPeg = _interopRequireDefault(require("../PlatformPeg"));

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _navigator = require("../utils/permalinks/navigator");

var _Permalinks = require("../utils/permalinks/Permalinks");

var _MatrixClientPeg = require("../MatrixClientPeg");

var _RoomAliasCache = require("../RoomAliasCache");

var _actions = require("../dispatcher/actions");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

/**
 * Glue between the `ModuleApi` interface and the react-sdk. Anticipates one instance
 * to be assigned to a single module.
 */
class ProxiedModuleApi {
  constructor() {
    (0, _defineProperty2.default)(this, "cachedTranslations", void 0);
  }

  /**
   * All custom translations used by the associated module.
   */
  get translations() {
    return this.cachedTranslations;
  }
  /**
   * @override
   */


  registerTranslations(translations) {
    this.cachedTranslations = translations;
  }
  /**
   * @override
   */


  translateString(s, variables) {
    return (0, _languageHandler._t)(s, variables);
  }
  /**
   * @override
   */


  openDialog(title, body) {
    return new Promise(resolve => {
      _Modal.default.createDialog(_ModuleUiDialog.ModuleUiDialog, {
        title: title,
        contentFactory: body,
        contentProps: {
          moduleApi: this
        }
      }, "mx_CompoundDialog").finished.then(_ref => {
        let [didOkOrSubmit, model] = _ref;
        resolve({
          didOkOrSubmit,
          model
        });
      });
    });
  }
  /**
   * @override
   */


  async registerSimpleAccount(username, password, displayName) {
    const hsUrl = _SdkConfig.default.get("validated_server_config").hsUrl;

    const client = Matrix.createClient({
      baseUrl: hsUrl
    });

    const deviceName = _SdkConfig.default.get("default_device_display_name") || _PlatformPeg.default.get().getDefaultDeviceDisplayName();

    const req = {
      username,
      password,
      initial_device_display_name: deviceName,
      auth: undefined,
      inhibit_login: false
    };
    const creds = await client.registerRequest(req).catch(resp => client.registerRequest(_objectSpread(_objectSpread({}, req), {}, {
      auth: {
        session: resp.data.session,
        type: "m.login.dummy"
      }
    })));

    if (displayName) {
      const profileClient = Matrix.createClient({
        baseUrl: hsUrl,
        userId: creds.user_id,
        deviceId: creds.device_id,
        accessToken: creds.access_token
      });
      await profileClient.setDisplayName(displayName);
    }

    return {
      homeserverUrl: hsUrl,
      userId: creds.user_id,
      deviceId: creds.device_id,
      accessToken: creds.access_token
    };
  }
  /**
   * @override
   */


  async overwriteAccountAuth(accountInfo) {
    _dispatcher.default.dispatch({
      action: _actions.Action.OverwriteLogin,
      credentials: _objectSpread(_objectSpread({}, accountInfo), {}, {
        guest: false
      })
    }, true); // require to be sync to match inherited interface behaviour

  }
  /**
   * @override
   */


  async navigatePermalink(uri, andJoin) {
    (0, _navigator.navigateToPermalink)(uri);
    const parts = (0, _Permalinks.parsePermalink)(uri);

    if (parts.roomIdOrAlias && andJoin) {
      let roomId = parts.roomIdOrAlias;
      let servers = parts.viaServers;

      if (roomId.startsWith("#")) {
        roomId = (0, _RoomAliasCache.getCachedRoomIDForAlias)(parts.roomIdOrAlias);

        if (!roomId) {
          // alias resolution failed
          const result = await _MatrixClientPeg.MatrixClientPeg.get().getRoomIdForAlias(parts.roomIdOrAlias);
          roomId = result.room_id;
          if (!servers) servers = result.servers; // use provided servers first, if available
        }
      }

      _dispatcher.default.dispatch({
        action: _actions.Action.ViewRoom,
        room_id: roomId,
        via_servers: servers
      });

      if (andJoin) {
        _dispatcher.default.dispatch({
          action: _actions.Action.JoinRoom
        });
      }
    }
  }
  /**
   * @override
   */


  getConfigValue(namespace, key) {
    // Force cast to `any` because the namespace won't be known to the SdkConfig types
    const maybeObj = _SdkConfig.default.get(namespace);

    if (!maybeObj || !(typeof maybeObj === "object")) return undefined;
    return maybeObj[key];
  }

}

exports.ProxiedModuleApi = ProxiedModuleApi;
//# sourceMappingURL=ProxiedModuleApi.js.map