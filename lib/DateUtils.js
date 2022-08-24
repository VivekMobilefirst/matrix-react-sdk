"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatCallTime = formatCallTime;
exports.formatDate = formatDate;
exports.formatDuration = formatDuration;
exports.formatFullDate = formatFullDate;
exports.formatFullDateNoDay = formatFullDateNoDay;
exports.formatFullDateNoDayNoTime = formatFullDateNoDayNoTime;
exports.formatFullDateNoTime = formatFullDateNoTime;
exports.formatFullTime = formatFullTime;
exports.formatRelativeTime = formatRelativeTime;
exports.formatSeconds = formatSeconds;
exports.formatTime = formatTime;
exports.wantsDateSeparator = wantsDateSeparator;

var _languageHandler = require("./languageHandler");

/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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
function getDaysArray() {
  return [(0, _languageHandler._t)('Sun'), (0, _languageHandler._t)('Mon'), (0, _languageHandler._t)('Tue'), (0, _languageHandler._t)('Wed'), (0, _languageHandler._t)('Thu'), (0, _languageHandler._t)('Fri'), (0, _languageHandler._t)('Sat')];
}

function getMonthsArray() {
  return [(0, _languageHandler._t)('Jan'), (0, _languageHandler._t)('Feb'), (0, _languageHandler._t)('Mar'), (0, _languageHandler._t)('Apr'), (0, _languageHandler._t)('May'), (0, _languageHandler._t)('Jun'), (0, _languageHandler._t)('Jul'), (0, _languageHandler._t)('Aug'), (0, _languageHandler._t)('Sep'), (0, _languageHandler._t)('Oct'), (0, _languageHandler._t)('Nov'), (0, _languageHandler._t)('Dec')];
}

function pad(n) {
  return (n < 10 ? '0' : '') + n;
}

function twelveHourTime(date) {
  let showSeconds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  let hours = date.getHours() % 12;
  const minutes = pad(date.getMinutes());
  const ampm = date.getHours() >= 12 ? (0, _languageHandler._t)('PM') : (0, _languageHandler._t)('AM');
  hours = hours ? hours : 12; // convert 0 -> 12

  if (showSeconds) {
    const seconds = pad(date.getSeconds());
    return `${hours}:${minutes}:${seconds}${ampm}`;
  }

  return `${hours}:${minutes}${ampm}`;
}

function formatDate(date) {
  let showTwelveHour = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  const now = new Date();
  const days = getDaysArray();
  const months = getMonthsArray();

  if (date.toDateString() === now.toDateString()) {
    return formatTime(date, showTwelveHour);
  } else if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
    // TODO: use standard date localize function provided in counterpart
    return (0, _languageHandler._t)('%(weekDayName)s %(time)s', {
      weekDayName: days[date.getDay()],
      time: formatTime(date, showTwelveHour)
    });
  } else if (now.getFullYear() === date.getFullYear()) {
    // TODO: use standard date localize function provided in counterpart
    return (0, _languageHandler._t)('%(weekDayName)s, %(monthName)s %(day)s %(time)s', {
      weekDayName: days[date.getDay()],
      monthName: months[date.getMonth()],
      day: date.getDate(),
      time: formatTime(date, showTwelveHour)
    });
  }

  return formatFullDate(date, showTwelveHour);
}

function formatFullDateNoTime(date) {
  const days = getDaysArray();
  const months = getMonthsArray();
  return (0, _languageHandler._t)('%(weekDayName)s, %(monthName)s %(day)s %(fullYear)s', {
    weekDayName: days[date.getDay()],
    monthName: months[date.getMonth()],
    day: date.getDate(),
    fullYear: date.getFullYear()
  });
}

function formatFullDate(date) {
  let showTwelveHour = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  let showSeconds = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  const days = getDaysArray();
  const months = getMonthsArray();
  return (0, _languageHandler._t)('%(weekDayName)s, %(monthName)s %(day)s %(fullYear)s %(time)s', {
    weekDayName: days[date.getDay()],
    monthName: months[date.getMonth()],
    day: date.getDate(),
    fullYear: date.getFullYear(),
    time: showSeconds ? formatFullTime(date, showTwelveHour) : formatTime(date, showTwelveHour)
  });
}

function formatFullTime(date) {
  let showTwelveHour = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (showTwelveHour) {
    return twelveHourTime(date, true);
  }

  return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

function formatTime(date) {
  let showTwelveHour = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (showTwelveHour) {
    return twelveHourTime(date);
  }

  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatCallTime(delta) {
  const hours = delta.getUTCHours();
  const minutes = delta.getUTCMinutes();
  const seconds = delta.getUTCSeconds();
  let output = "";
  if (hours) output += `${hours}h `;
  if (minutes || output) output += `${minutes}m `;
  if (seconds || output) output += `${seconds}s`;
  return output;
}

function formatSeconds(inSeconds) {
  const hours = Math.floor(inSeconds / (60 * 60)).toFixed(0).padStart(2, '0');
  const minutes = Math.floor(inSeconds % (60 * 60) / 60).toFixed(0).padStart(2, '0');
  const seconds = Math.floor(inSeconds % (60 * 60) % 60).toFixed(0).padStart(2, '0');
  let output = "";
  if (hours !== "00") output += `${hours}:`;
  output += `${minutes}:${seconds}`;
  return output;
}

const MILLIS_IN_DAY = 86400000;

function withinPast24Hours(prevDate, nextDate) {
  return Math.abs(prevDate.getTime() - nextDate.getTime()) <= MILLIS_IN_DAY;
}

function withinCurrentYear(prevDate, nextDate) {
  return prevDate.getFullYear() === nextDate.getFullYear();
}

function wantsDateSeparator(prevEventDate, nextEventDate) {
  if (!nextEventDate || !prevEventDate) {
    return false;
  } // Return early for events that are > 24h apart


  if (!withinPast24Hours(prevEventDate, nextEventDate)) {
    return true;
  } // Compare weekdays


  return prevEventDate.getDay() !== nextEventDate.getDay();
}

function formatFullDateNoDay(date) {
  return (0, _languageHandler._t)("%(date)s at %(time)s", {
    date: date.toLocaleDateString().replace(/\//g, '-'),
    time: date.toLocaleTimeString().replace(/:/g, '-')
  });
}

function formatFullDateNoDayNoTime(date) {
  return date.getFullYear() + "/" + pad(date.getMonth() + 1) + "/" + pad(date.getDate());
}

function formatRelativeTime(date) {
  let showTwelveHour = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  const now = new Date(Date.now());

  if (withinPast24Hours(date, now)) {
    return formatTime(date, showTwelveHour);
  } else {
    const months = getMonthsArray();
    let relativeDate = `${months[date.getMonth()]} ${date.getDate()}`;

    if (!withinCurrentYear(date, now)) {
      relativeDate += `, ${date.getFullYear()}`;
    }

    return relativeDate;
  }
}
/**
 * Formats duration in ms to human readable string
 * Returns value in biggest possible unit (day, hour, min, second)
 * Rounds values up until unit threshold
 * ie. 23:13:57 -> 23h, 24:13:57 -> 1d, 44:56:56 -> 2d
 */


const MINUTE_MS = 60000;
const HOUR_MS = MINUTE_MS * 60;
const DAY_MS = HOUR_MS * 24;

function formatDuration(durationMs) {
  if (durationMs >= DAY_MS) {
    return (0, _languageHandler._t)('%(value)sd', {
      value: Math.round(durationMs / DAY_MS)
    });
  }

  if (durationMs >= HOUR_MS) {
    return (0, _languageHandler._t)('%(value)sh', {
      value: Math.round(durationMs / HOUR_MS)
    });
  }

  if (durationMs >= MINUTE_MS) {
    return (0, _languageHandler._t)('%(value)sm', {
      value: Math.round(durationMs / MINUTE_MS)
    });
  }

  return (0, _languageHandler._t)('%(value)ss', {
    value: Math.round(durationMs / 1000)
  });
}
//# sourceMappingURL=DateUtils.js.map