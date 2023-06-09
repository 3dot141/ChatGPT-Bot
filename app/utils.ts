import { EmojiStyle } from "emoji-picker-react";
import { showToast } from "./components/ui-lib";
import Locale from "./locales";
import { requestAnalysisLike } from "@/app/requests";

export function trimTopic(topic: string) {
  return topic.replace(/[，。！？”“"、,.!?]*$/, "");
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(Locale.Copy.Success);
  } catch (error) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToast(Locale.Copy.Success);
    } catch (error) {
      showToast(Locale.Copy.Failed);
    }
    document.body.removeChild(textArea);
  }
}

export function qyWxOAuthLogin() {
  fetch("/api/config", {
    method: "post",
    body: null,
  })
    .then((res) => res.json())
    .then((res: WeComAPI) => {
      console.log("[Config] got config from server", res);

      const appId = res.corpId;
      const origin_uri = encodeURIComponent(location.origin);
      const redirect_uri = encodeURIComponent(
        location.origin + "/" + "api/wecom/oauth",
      );
      const wxLoginUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirect_uri}&response_type=code&scope=snsapi_base&state=${origin_uri}#wechat_redirect`;

      console.error(`login uri is ${wxLoginUrl}`);
      location.href = wxLoginUrl;
    })
    .catch(() => {
      console.error("[Config] failed to fetch config");
    })
    .finally(() => {});
}

/**
 * 微信直接登录
 */
export function qyWxLogin() {
  fetch("/api/config", {
    method: "post",
    body: null,
  })
    .then((res) => res.json())
    .then((res: WeComAPI) => {
      console.log("[Config] got config from server", res);
      const appId = res.corpId;
      const agentId = res.agentId;
      const origin_uri = encodeURIComponent(location.origin);
      const redirect_uri = encodeURIComponent(
        location.origin + "/" + "api/wecom/web-login",
      );
      const wxLoginUrl = `https://login.work.weixin.qq.com/wwlogin/sso/login?login_type=CorpApp&appid=${appId}&agentid=${agentId}&redirect_uri=${redirect_uri}&state=${origin_uri}`;

      console.error(`login uri is ${wxLoginUrl}`);
      location.href = wxLoginUrl;
    })
    .catch(() => {
      console.error("[Config] failed to fetch config");
    })
    .finally(() => {});
}

export enum LikeType {
  Like = 0,
  UnLike = 1,
}

export async function recordLikeOrUnlike(
  messages: Message[],
  index: number,
  type: LikeType,
) {
  requestAnalysisLike(messages[index - 1], messages[index], type);
  showToast("反馈成功, 感谢您的小手，喝杯茶歇一下吧～");
}

export function downloadAs(text: string, filename: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text),
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function isIOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function isMobileScreen() {
  return window.innerWidth <= 600;
}

export function isFirefox() {
  return (
    typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)
  );
}

export function selectOrCopy(el: HTMLElement, content: string) {
  const currentSelection = window.getSelection();

  if (currentSelection?.type === "Range") {
    return false;
  }

  copyToClipboard(content);

  return true;
}

export function getEmojiUrl(unified: string, style: EmojiStyle) {
  return `https://cdn.staticfile.org/emoji-datasource-apple/14.0.0/img/${style}/64/${unified}.png`;
}

function getDomContentWidth(dom: HTMLElement) {
  const style = window.getComputedStyle(dom);
  const paddingWidth =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const width = dom.clientWidth - paddingWidth;
  return width;
}

function getOrCreateMeasureDom(id: string, init?: (dom: HTMLElement) => void) {
  let dom = document.getElementById(id);

  if (!dom) {
    dom = document.createElement("span");
    dom.style.position = "absolute";
    dom.style.wordBreak = "break-word";
    dom.style.fontSize = "14px";
    dom.style.transform = "translateY(-200vh)";
    dom.style.pointerEvents = "none";
    dom.style.opacity = "0";
    dom.id = id;
    document.body.appendChild(dom);
    init?.(dom);
  }

  return dom!;
}

export function autoGrowTextArea(dom: HTMLTextAreaElement) {
  const measureDom = getOrCreateMeasureDom("__measure");
  const singleLineDom = getOrCreateMeasureDom("__single_measure", (dom) => {
    dom.innerText = "TEXT_FOR_MEASURE";
  });

  const width = getDomContentWidth(dom);
  measureDom.style.width = width + "px";
  measureDom.innerHTML = dom.value.trim().length > 0 ? dom.value : "1";

  const lineWrapCount = Math.max(0, dom.value.split("\n").length - 1);
  const height = parseFloat(window.getComputedStyle(measureDom).height);
  const singleLineHeight = parseFloat(
    window.getComputedStyle(singleLineDom).height,
  );

  const rows = Math.round(height / singleLineHeight) + lineWrapCount;

  return rows;
}

export function getCSSVar(varName: string) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim();
}
