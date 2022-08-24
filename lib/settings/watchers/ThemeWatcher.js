"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _logger = require("matrix-js-sdk/src/logger");

var _SettingsStore = _interopRequireDefault(require("../SettingsStore"));

var _dispatcher = _interopRequireDefault(require("../../dispatcher/dispatcher"));

var _actions = require("../../dispatcher/actions");

var _ThemeController = _interopRequireDefault(require("../controllers/ThemeController"));

var _theme = require("../../theme");

var _SettingLevel = require("../SettingLevel");

/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
class ThemeWatcher {
  constructor() {
    (0, _defineProperty2.default)(this, "themeWatchRef", void 0);
    (0, _defineProperty2.default)(this, "systemThemeWatchRef", void 0);
    (0, _defineProperty2.default)(this, "dispatcherRef", void 0);
    (0, _defineProperty2.default)(this, "preferDark", void 0);
    (0, _defineProperty2.default)(this, "preferLight", void 0);
    (0, _defineProperty2.default)(this, "preferHighContrast", void 0);
    (0, _defineProperty2.default)(this, "currentTheme", void 0);
    (0, _defineProperty2.default)(this, "onChange", () => {
      this.recheck();
    });
    (0, _defineProperty2.default)(this, "onAction", payload => {
      if (payload.action === _actions.Action.RecheckTheme) {
        // XXX forceTheme
        this.recheck(payload.forceTheme);
      }
    });
    this.themeWatchRef = null;
    this.systemThemeWatchRef = null;
    this.dispatcherRef = null; // we have both here as each may either match or not match, so by having both
    // we can get the tristate of dark/light/unsupported

    this.preferDark = global.matchMedia("(prefers-color-scheme: dark)");
    this.preferLight = global.matchMedia("(prefers-color-scheme: light)");
    this.preferHighContrast = global.matchMedia("(prefers-contrast: more)");
    this.currentTheme = this.getEffectiveTheme();
  }

  start() {
    this.themeWatchRef = _SettingsStore.default.watchSetting("theme", null, this.onChange);
    this.systemThemeWatchRef = _SettingsStore.default.watchSetting("use_system_theme", null, this.onChange);

    if (this.preferDark.addEventListener) {
      this.preferDark.addEventListener('change', this.onChange);
      this.preferLight.addEventListener('change', this.onChange);
      this.preferHighContrast.addEventListener('change', this.onChange);
    }

    this.dispatcherRef = _dispatcher.default.register(this.onAction);
  }

  stop() {
    if (this.preferDark.addEventListener) {
      this.preferDark.removeEventListener('change', this.onChange);
      this.preferLight.removeEventListener('change', this.onChange);
      this.preferHighContrast.removeEventListener('change', this.onChange);
    }

    _SettingsStore.default.unwatchSetting(this.systemThemeWatchRef);

    _SettingsStore.default.unwatchSetting(this.themeWatchRef);

    _dispatcher.default.unregister(this.dispatcherRef);
  }

  // XXX: forceTheme param added here as local echo appears to be unreliable
  // https://github.com/vector-im/element-web/issues/11443
  recheck(forceTheme) {
    const oldTheme = this.currentTheme;
    this.currentTheme = forceTheme === undefined ? this.getEffectiveTheme() : forceTheme;

    if (oldTheme !== this.currentTheme) {
      (0, _theme.setTheme)(this.currentTheme);
    }
  }

  getEffectiveTheme() {
    // Dev note: Much of this logic is replicated in the AppearanceUserSettingsTab
    // XXX: checking the isLight flag here makes checking it in the ThemeController
    // itself completely redundant since we just override the result here and we're
    // now effectively just using the ThemeController as a place to store the static
    // variable. The system theme setting probably ought to have an equivalent
    // controller that honours the same flag, although probably better would be to
    // have the theme logic in one place rather than split between however many
    // different places.
    if (_ThemeController.default.isLogin) return 'light'; // If the user has specifically enabled the system matching option (excluding default),
    // then use that over anything else. We pick the lowest possible level for the setting
    // to ensure the ordering otherwise works.

    const systemThemeExplicit = _SettingsStore.default.getValueAt(_SettingLevel.SettingLevel.DEVICE, "use_system_theme", null, false, true);

    if (systemThemeExplicit) {
      _logger.logger.log("returning explicit system theme");

      const theme = this.themeBasedOnSystem();

      if (theme) {
        return theme;
      }
    } // If the user has specifically enabled the theme (without the system matching option being
    // enabled specifically and excluding the default), use that theme. We pick the lowest possible
    // level for the setting to ensure the ordering otherwise works.


    const themeExplicit = _SettingsStore.default.getValueAt(_SettingLevel.SettingLevel.DEVICE, "theme", null, false, true);

    if (themeExplicit) {
      _logger.logger.log("returning explicit theme: " + themeExplicit);

      return themeExplicit;
    } // If the user hasn't really made a preference in either direction, assume the defaults of the
    // settings and use those.


    if (_SettingsStore.default.getValue('use_system_theme')) {
      const theme = this.themeBasedOnSystem();

      if (theme) {
        return theme;
      }
    }

    _logger.logger.log("returning theme value");

    return _SettingsStore.default.getValue('theme');
  }

  themeBasedOnSystem() {
    let newTheme;

    if (this.preferDark.matches) {
      newTheme = 'dark';
    } else if (this.preferLight.matches) {
      newTheme = 'light';
    }

    if (this.preferHighContrast.matches) {
      const hcTheme = (0, _theme.findHighContrastTheme)(newTheme);

      if (hcTheme) {
        newTheme = hcTheme;
      }
    }

    return newTheme;
  }

  isSystemThemeSupported() {
    return this.preferDark.matches || this.preferLight.matches;
  }

}

exports.default = ThemeWatcher;
//# sourceMappingURL=ThemeWatcher.js.map