"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getHostingLink = getHostingLink;

var _SdkConfig = _interopRequireDefault(require("../SdkConfig"));

var _MatrixClientPeg = require("../MatrixClientPeg");

/*
Copyright 2019 New Vector Ltd.

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
function getHostingLink(campaign) {
  const hostingLink = _SdkConfig.default.get().hosting_signup_link;

  if (!hostingLink) return null;
  if (!campaign) return hostingLink;
  if (_MatrixClientPeg.MatrixClientPeg.get().getDomain() !== 'matrix.org') return null;

  try {
    const hostingUrl = new URL(hostingLink);
    hostingUrl.searchParams.set("utm_campaign", campaign);
    return hostingUrl.toString();
  } catch (e) {
    return hostingLink;
  }
}
//# sourceMappingURL=HostingLink.js.map