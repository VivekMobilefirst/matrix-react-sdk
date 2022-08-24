"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeMapSiteLink = exports.createMarker = exports.createMapSiteLinkFromEvent = exports.createMap = void 0;

var _maplibreGl = _interopRequireDefault(require("maplibre-gl"));

var _location = require("matrix-js-sdk/src/@types/location");

var _logger = require("matrix-js-sdk/src/logger");

var _languageHandler = require("../../languageHandler");

var _parseGeoUri = require("./parseGeoUri");

var _findMapStyleUrl = require("./findMapStyleUrl");

var _LocationShareErrors = require("./LocationShareErrors");

/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
const createMap = (interactive, bodyId, onError) => {
  try {
    const styleUrl = (0, _findMapStyleUrl.findMapStyleUrl)();
    const map = new _maplibreGl.default.Map({
      container: bodyId,
      style: styleUrl,
      zoom: 15,
      interactive,
      attributionControl: false,
      locale: {
        'AttributionControl.ToggleAttribution': (0, _languageHandler._t)('Toggle attribution'),
        'AttributionControl.MapFeedback': (0, _languageHandler._t)('Map feedback'),
        'FullscreenControl.Enter': (0, _languageHandler._t)('Enter fullscreen'),
        'FullscreenControl.Exit': (0, _languageHandler._t)('Exit fullscreen'),
        'GeolocateControl.FindMyLocation': (0, _languageHandler._t)('Find my location'),
        'GeolocateControl.LocationNotAvailable': (0, _languageHandler._t)('Location not available'),
        'LogoControl.Title': (0, _languageHandler._t)('Mapbox logo'),
        'NavigationControl.ResetBearing': (0, _languageHandler._t)('Reset bearing to north'),
        'NavigationControl.ZoomIn': (0, _languageHandler._t)('Zoom in'),
        'NavigationControl.ZoomOut': (0, _languageHandler._t)('Zoom out')
      }
    });
    map.addControl(new _maplibreGl.default.AttributionControl(), 'top-right');
    map.on('error', e => {
      _logger.logger.error("Failed to load map: check map_style_url in config.json has a " + "valid URL and API key", e.error);

      onError(new Error(_LocationShareErrors.LocationShareError.MapStyleUrlNotReachable));
    });
    return map;
  } catch (e) {
    _logger.logger.error("Failed to render map", e);

    throw e;
  }
};

exports.createMap = createMap;

const createMarker = (coords, element) => {
  const marker = new _maplibreGl.default.Marker({
    element,
    anchor: 'bottom',
    offset: [0, -1]
  }).setLngLat({
    lon: coords.longitude,
    lat: coords.latitude
  });
  return marker;
};

exports.createMarker = createMarker;

const makeMapSiteLink = coords => {
  return "https://www.openstreetmap.org/" + `?mlat=${coords.latitude}` + `&mlon=${coords.longitude}` + `#map=16/${coords.latitude}/${coords.longitude}`;
};

exports.makeMapSiteLink = makeMapSiteLink;

const createMapSiteLinkFromEvent = event => {
  const content = event.getContent();
  const mLocation = content[_location.M_LOCATION.name];

  if (mLocation !== undefined) {
    const uri = mLocation["uri"];

    if (uri !== undefined) {
      return makeMapSiteLink((0, _parseGeoUri.parseGeoUri)(uri));
    }
  } else {
    const geoUri = content["geo_uri"];

    if (geoUri) {
      return makeMapSiteLink((0, _parseGeoUri.parseGeoUri)(geoUri));
    }
  }

  return null;
};

exports.createMapSiteLinkFromEvent = createMapSiteLinkFromEvent;
//# sourceMappingURL=map.js.map