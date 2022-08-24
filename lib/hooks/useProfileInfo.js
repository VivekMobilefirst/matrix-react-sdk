"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useProfileInfo = void 0;

var _react = require("react");

var _MatrixClientPeg = require("../MatrixClientPeg");

var _useLatestResult = require("./useLatestResult");

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
const useProfileInfo = () => {
  const [profile, setProfile] = (0, _react.useState)(null);
  const [loading, setLoading] = (0, _react.useState)(false);
  const [updateQuery, updateResult] = (0, _useLatestResult.useLatestResult)(setProfile);
  const search = (0, _react.useCallback)(async _ref => {
    let {
      query: term
    } = _ref;
    updateQuery(term);

    if (!term?.length || !term.startsWith('@') || !term.includes(':')) {
      setProfile(null);
      return true;
    }

    setLoading(true);

    try {
      const result = await _MatrixClientPeg.MatrixClientPeg.get().getProfileInfo(term);
      updateResult(term, {
        user_id: term,
        avatar_url: result.avatar_url,
        display_name: result.displayname
      });
      return true;
    } catch (e) {
      console.error("Could not fetch profile info for params", {
        term
      }, e);
      updateResult(term, null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateQuery, updateResult]);
  return {
    ready: true,
    loading,
    profile,
    search
  };
};

exports.useProfileInfo = useProfileInfo;
//# sourceMappingURL=useProfileInfo.js.map