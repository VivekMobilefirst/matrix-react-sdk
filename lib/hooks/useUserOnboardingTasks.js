"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useUserOnboardingTasks = useUserOnboardingTasks;

var _react = require("react");

var _AppDownloadDialog = require("../components/views/dialogs/AppDownloadDialog");

var _UserTab = require("../components/views/dialogs/UserTab");

var _actions = require("../dispatcher/actions");

var _dispatcher = _interopRequireDefault(require("../dispatcher/dispatcher"));

var _languageHandler = require("../languageHandler");

var _Modal = _interopRequireDefault(require("../Modal"));

var _Notifier = require("../Notifier");

var _PosthogTrackers = _interopRequireDefault(require("../PosthogTrackers"));

var _UseCase = require("../settings/enums/UseCase");

var _useSettings = require("./useSettings");

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
const hasOpenDMs = ctx => Boolean(Object.entries(ctx.dmRooms).length);

const onClickStartDm = ev => {
  _PosthogTrackers.default.trackInteraction("WebUserOnboardingTaskSendDm", ev);

  _dispatcher.default.dispatch({
    action: 'view_create_chat'
  });
};

const tasks = [{
  id: "create-account",
  title: (0, _languageHandler._t)("Create account"),
  description: (0, _languageHandler._t)("You made it!"),
  completed: () => true
}, {
  id: "find-friends",
  title: (0, _languageHandler._t)("Find and invite your friends"),
  description: (0, _languageHandler._t)("It’s what you’re here for, so lets get to it"),
  completed: hasOpenDMs,
  relevant: [_UseCase.UseCase.PersonalMessaging, _UseCase.UseCase.Skip],
  action: {
    label: (0, _languageHandler._t)("Find friends"),
    onClick: onClickStartDm
  }
}, {
  id: "find-coworkers",
  title: (0, _languageHandler._t)("Find and invite your co-workers"),
  description: (0, _languageHandler._t)("Get stuff done by finding your teammates"),
  completed: hasOpenDMs,
  relevant: [_UseCase.UseCase.WorkMessaging],
  action: {
    label: (0, _languageHandler._t)("Find people"),
    onClick: onClickStartDm
  }
}, {
  id: "find-community-members",
  title: (0, _languageHandler._t)("Find and invite your community members"),
  description: (0, _languageHandler._t)("Get stuff done by finding your teammates"),
  completed: hasOpenDMs,
  relevant: [_UseCase.UseCase.CommunityMessaging],
  action: {
    label: (0, _languageHandler._t)("Find people"),
    onClick: onClickStartDm
  }
}, {
  id: "download-apps",
  title: (0, _languageHandler._t)("Download Element"),
  description: (0, _languageHandler._t)("Don’t miss a thing by taking Element with you"),
  completed: ctx => {
    return Boolean(ctx.devices.filter(it => it.device_id !== ctx.myDevice).length);
  },
  action: {
    label: (0, _languageHandler._t)("Download apps"),
    onClick: ev => {
      _PosthogTrackers.default.trackInteraction("WebUserOnboardingTaskDownloadApps", ev);

      _Modal.default.createDialog(_AppDownloadDialog.AppDownloadDialog, {}, "mx_AppDownloadDialog_wrapper", false, true);
    }
  }
}, {
  id: "setup-profile",
  title: (0, _languageHandler._t)("Set up your profile"),
  description: (0, _languageHandler._t)("Make sure people know it’s really you"),
  completed: info => Boolean(info.avatar),
  action: {
    label: (0, _languageHandler._t)("Your profile"),
    onClick: ev => {
      _PosthogTrackers.default.trackInteraction("WebUserOnboardingTaskSetupProfile", ev);

      _dispatcher.default.dispatch({
        action: _actions.Action.ViewUserSettings,
        initialTabId: _UserTab.UserTab.General
      });
    }
  }
}, {
  id: "permission-notifications",
  title: (0, _languageHandler._t)("Turn on notifications"),
  description: (0, _languageHandler._t)("Don’t miss a reply or important message"),
  completed: () => _Notifier.Notifier.isPossible(),
  action: {
    label: (0, _languageHandler._t)("Enable notifications"),
    onClick: ev => {
      _PosthogTrackers.default.trackInteraction("WebUserOnboardingTaskEnableNotifications", ev);

      _Notifier.Notifier.setEnabled(true);
    },
    hideOnComplete: true
  }
}];

function useUserOnboardingTasks(context) {
  const useCase = (0, _useSettings.useSettingValue)("FTUE.useCaseSelection") ?? _UseCase.UseCase.Skip;

  const relevantTasks = (0, _react.useMemo)(() => tasks.filter(it => !it.relevant || it.relevant.includes(useCase)), [useCase]);
  const completedTasks = relevantTasks.filter(it => context && it.completed(context));
  return [completedTasks, relevantTasks.filter(it => !completedTasks.includes(it))];
}
//# sourceMappingURL=useUserOnboardingTasks.js.map