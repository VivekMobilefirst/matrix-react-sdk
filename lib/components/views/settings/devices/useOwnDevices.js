"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useOwnDevices = exports.OwnDevicesError = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _react = require("react");

var _logger = require("matrix-js-sdk/src/logger");

var _MatrixClientContext = _interopRequireDefault(require("../../../../contexts/MatrixClientContext"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

const isDeviceVerified = (matrixClient, crossSigningInfo, device) => {
  try {
    const deviceInfo = matrixClient.getStoredDevice(matrixClient.getUserId(), device.device_id);
    return crossSigningInfo.checkDeviceTrust(crossSigningInfo, deviceInfo, false, true).isCrossSigningVerified();
  } catch (error) {
    _logger.logger.error("Error getting device cross-signing info", error);

    return null;
  }
};

const fetchDevicesWithVerification = async matrixClient => {
  const {
    devices
  } = await matrixClient.getDevices();
  const crossSigningInfo = matrixClient.getStoredCrossSigningForUser(matrixClient.getUserId());
  const devicesDict = devices.reduce((acc, device) => _objectSpread(_objectSpread({}, acc), {}, {
    [device.device_id]: _objectSpread(_objectSpread({}, device), {}, {
      isVerified: isDeviceVerified(matrixClient, crossSigningInfo, device)
    })
  }), {});
  return devicesDict;
};

let OwnDevicesError;
exports.OwnDevicesError = OwnDevicesError;

(function (OwnDevicesError) {
  OwnDevicesError["Unsupported"] = "Unsupported";
  OwnDevicesError["Default"] = "Default";
})(OwnDevicesError || (exports.OwnDevicesError = OwnDevicesError = {}));

const useOwnDevices = () => {
  const matrixClient = (0, _react.useContext)(_MatrixClientContext.default);
  const currentDeviceId = matrixClient.getDeviceId();
  const [devices, setDevices] = (0, _react.useState)({});
  const [isLoading, setIsLoading] = (0, _react.useState)(true);
  const [error, setError] = (0, _react.useState)();
  (0, _react.useEffect)(() => {
    const getDevicesAsync = async () => {
      setIsLoading(true);

      try {
        const devices = await fetchDevicesWithVerification(matrixClient);
        setDevices(devices);
        setIsLoading(false);
      } catch (error) {
        if (error.httpStatus == 404) {
          // 404 probably means the HS doesn't yet support the API.
          setError(OwnDevicesError.Unsupported);
        } else {
          _logger.logger.error("Error loading sessions:", error);

          setError(OwnDevicesError.Default);
        }

        setIsLoading(false);
      }
    };

    getDevicesAsync();
  }, [matrixClient]);
  return {
    devices,
    currentDeviceId,
    isLoading,
    error
  };
};

exports.useOwnDevices = useOwnDevices;
//# sourceMappingURL=useOwnDevices.js.map