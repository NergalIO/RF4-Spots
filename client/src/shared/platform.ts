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
