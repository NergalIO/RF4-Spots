import { useEffect, useState } from "react";

const MOBILE_MQ = "(max-width: 860px)";

function queryWantsMobile() {
  if (typeof location === "undefined") return false;
  try {
    return new URLSearchParams(location.search).has("mobile");
  } catch {
    return false;
  }
}

export function isAndroidApp() {
  return typeof navigator !== "undefined" && /RF4SpotsAndroid/.test(navigator.userAgent);
}

export function isBrowserClient() {
  return typeof window !== "undefined" && !window.rf4 && !window.rf4Android;
}

export function isMobileLayout() {
  if (isAndroidApp() || queryWantsMobile()) return true;
  if (typeof window !== "undefined" && isBrowserClient()) {
    return window.matchMedia(MOBILE_MQ).matches;
  }
  return false;
}

export function applyPlatformFlag() {
  const apply = () => {
    if (typeof document === "undefined") return;
    if (isMobileLayout()) document.documentElement.dataset.platform = "android";
    else delete document.documentElement.dataset.platform;
  };
  apply();
  if (typeof window === "undefined" || !isBrowserClient()) return;
  window.matchMedia(MOBILE_MQ).addEventListener("change", apply);
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(isMobileLayout);
  useEffect(() => {
    if (!isBrowserClient()) {
      setMobile(isMobileLayout());
      return;
    }
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setMobile(isMobileLayout());
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

export function hasNativeNotify() {
  return Boolean(typeof window !== "undefined" && (window.rf4?.showNotify || window.rf4Android));
}

export function appIsHidden() {
  if (typeof window !== "undefined" && window.__rf4AppFocused === false) return true;
  return typeof document !== "undefined" && document.hidden;
}

export function appIsFocused() {
  if (appIsHidden()) return false;
  return typeof document === "undefined" || document.hasFocus();
}
