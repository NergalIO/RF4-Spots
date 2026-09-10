const MOBILE = detect();

function detect() {
  if (typeof navigator === "undefined") return false;
  if (/RF4SpotsAndroid/.test(navigator.userAgent)) return true;
  try {
    return new URLSearchParams(location.search).has("mobile");
  } catch {
    return false;
  }
}

export function isAndroidApp() {
  return MOBILE;
}

export function applyPlatformFlag() {
  if (MOBILE) document.documentElement.dataset.platform = "android";
}

export function useIsMobile() {
  return MOBILE;
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
