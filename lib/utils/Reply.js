"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addReplyToMessageContent = addReplyToMessageContent;
exports.getNestedReplyText = getNestedReplyText;
exports.getParentEventId = getParentEventId;
exports.makeReplyMixIn = makeReplyMixIn;
exports.shouldDisplayReply = shouldDisplayReply;
exports.stripHTMLReply = stripHTMLReply;
exports.stripPlainReply = stripPlainReply;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _sanitizeHtml = _interopRequireDefault(require("sanitize-html"));

var _escapeHtml = _interopRequireDefault(require("escape-html"));

var _thread = require("matrix-js-sdk/src/models/thread");

var _event = require("matrix-js-sdk/src/@types/event");

var _beacon = require("matrix-js-sdk/src/@types/beacon");

var _HtmlUtils = require("../HtmlUtils");

var _Permalinks = require("./permalinks/Permalinks");

var _SettingsStore = _interopRequireDefault(require("../settings/SettingsStore"));

var _location = require("./location");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function getParentEventId(ev) {
  if (!ev || ev.isRedacted()) return;

  if (ev.replyEventId) {
    return ev.replyEventId;
  }
} // Part of Replies fallback support


function stripPlainReply(body) {
  // Removes lines beginning with `> ` until you reach one that doesn't.
  const lines = body.split('\n');

  while (lines.length && lines[0].startsWith('> ')) lines.shift(); // Reply fallback has a blank line after it, so remove it to prevent leading newline


  if (lines[0] === '') lines.shift();
  return lines.join('\n');
} // Part of Replies fallback support


function stripHTMLReply(html) {
  // Sanitize the original HTML for inclusion in <mx-reply>.  We allow
  // any HTML, since the original sender could use special tags that we
  // don't recognize, but want to pass along to any recipients who do
  // recognize them -- recipients should be sanitizing before displaying
  // anyways.  However, we sanitize to 1) remove any mx-reply, so that we
  // don't generate a nested mx-reply, and 2) make sure that the HTML is
  // properly formatted (e.g. tags are closed where necessary)
  return (0, _sanitizeHtml.default)(html, {
    allowedTags: false,
    // false means allow everything
    allowedAttributes: false,
    // we somehow can't allow all schemes, so we allow all that we
    // know of and mxc (for img tags)
    allowedSchemes: [..._HtmlUtils.PERMITTED_URL_SCHEMES, 'mxc'],
    exclusiveFilter: frame => frame.tag === "mx-reply"
  });
} // Part of Replies fallback support


function getNestedReplyText(ev, permalinkCreator) {
  if (!ev) return null;
  let {
    body,
    formatted_body: html,
    msgtype
  } = ev.getContent();

  if (getParentEventId(ev)) {
    if (body) body = stripPlainReply(body);
  }

  if (!body) body = ""; // Always ensure we have a body, for reasons.

  if (html) {
    // sanitize the HTML before we put it in an <mx-reply>
    html = stripHTMLReply(html);
  } else {
    // Escape the body to use as HTML below.
    // We also run a nl2br over the result to fix the fallback representation. We do this
    // after converting the text to safe HTML to avoid user-provided BR's from being converted.
    html = (0, _escapeHtml.default)(body).replace(/\n/g, '<br/>');
  } // dev note: do not rely on `body` being safe for HTML usage below.


  const evLink = permalinkCreator.forEvent(ev.getId());
  const userLink = (0, _Permalinks.makeUserPermalink)(ev.getSender());
  const mxid = ev.getSender();

  if (_beacon.M_BEACON_INFO.matches(ev.getType())) {
    const aTheir = (0, _location.isSelfLocation)(ev.getContent()) ? "their" : "a";
    return {
      html: `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>shared ${aTheir} live location.</blockquote></mx-reply>`,
      body: `> <${mxid}> shared ${aTheir} live location.\n\n`
    };
  } // This fallback contains text that is explicitly EN.


  switch (msgtype) {
    case _event.MsgType.Text:
    case _event.MsgType.Notice:
      {
        html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>${html}</blockquote></mx-reply>`;
        const lines = body.trim().split('\n');

        if (lines.length > 0) {
          lines[0] = `<${mxid}> ${lines[0]}`;
          body = lines.map(line => `> ${line}`).join('\n') + '\n\n';
        }

        break;
      }

    case _event.MsgType.Image:
      html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>sent an image.</blockquote></mx-reply>`;
      body = `> <${mxid}> sent an image.\n\n`;
      break;

    case _event.MsgType.Video:
      html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>sent a video.</blockquote></mx-reply>`;
      body = `> <${mxid}> sent a video.\n\n`;
      break;

    case _event.MsgType.Audio:
      html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>sent an audio file.</blockquote></mx-reply>`;
      body = `> <${mxid}> sent an audio file.\n\n`;
      break;

    case _event.MsgType.File:
      html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>sent a file.</blockquote></mx-reply>`;
      body = `> <${mxid}> sent a file.\n\n`;
      break;

    case _event.MsgType.Location:
      {
        const aTheir = (0, _location.isSelfLocation)(ev.getContent()) ? "their" : "a";
        html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> <a href="${userLink}">${mxid}</a>` + `<br>shared ${aTheir} location.</blockquote></mx-reply>`;
        body = `> <${mxid}> shared ${aTheir} location.\n\n`;
        break;
      }

    case _event.MsgType.Emote:
      {
        html = `<mx-reply><blockquote><a href="${evLink}">In reply to</a> * ` + `<a href="${userLink}">${mxid}</a><br>${html}</blockquote></mx-reply>`;
        const lines = body.trim().split('\n');

        if (lines.length > 0) {
          lines[0] = `* <${mxid}> ${lines[0]}`;
          body = lines.map(line => `> ${line}`).join('\n') + '\n\n';
        }

        break;
      }

    default:
      return null;
  }

  return {
    body,
    html
  };
}

function makeReplyMixIn(ev) {
  if (!ev) return {};
  const mixin = {
    'm.in_reply_to': {
      'event_id': ev.getId()
    }
  };

  if (ev.threadRootId) {
    if (_SettingsStore.default.getValue("feature_thread")) {
      mixin.is_falling_back = false;
    } else {
      // Clients that do not offer a threading UI should behave as follows when replying, for best interaction
      // with those that do. They should set the m.in_reply_to part as usual, and then add on
      // "rel_type": "m.thread" and "event_id": "$thread_root", copying $thread_root from the replied-to event.
      const relation = ev.getRelation();
      mixin.rel_type = relation.rel_type;
      mixin.event_id = relation.event_id;
    }
  }

  return mixin;
}

function shouldDisplayReply(event) {
  if (event.isRedacted()) {
    return false;
  }

  const inReplyTo = event.getWireContent()?.["m.relates_to"]?.["m.in_reply_to"];

  if (!inReplyTo) {
    return false;
  }

  const relation = event.getRelation();

  if (_SettingsStore.default.getValue("feature_thread") && relation?.rel_type === _thread.THREAD_RELATION_TYPE.name && relation?.is_falling_back) {
    return false;
  }

  return !!inReplyTo.event_id;
}

function addReplyToMessageContent(content, replyToEvent) {
  let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
    includeLegacyFallback: true
  };
  content["m.relates_to"] = _objectSpread(_objectSpread({}, content["m.relates_to"] || {}), makeReplyMixIn(replyToEvent));

  if (opts.includeLegacyFallback) {
    // Part of Replies fallback support - prepend the text we're sending with the text we're replying to
    const nestedReply = getNestedReplyText(replyToEvent, opts.permalinkCreator);

    if (nestedReply) {
      if (content.formatted_body) {
        content.formatted_body = nestedReply.html + content.formatted_body;
      }

      content.body = nestedReply.body + content.body;
    }
  }
}
//# sourceMappingURL=Reply.js.map