package com.rf4spots.app;

import android.webkit.JavascriptInterface;

public final class Rf4JsBridge {
  private final MainActivity activity;

  Rf4JsBridge(MainActivity activity) {
    this.activity = activity;
  }

  @JavascriptInterface
  public String notifyPermission() {
    return activity.notifyPermissionState();
  }

  @JavascriptInterface
  public void requestNotifyPermission() {
    activity.runOnUiThread(activity::requestNotifyPermissionFromJs);
  }

  @JavascriptInterface
  public boolean showNotify(String title, String body, String postId, boolean silent) {
    return activity.postNotification(title, body, postId, silent);
  }
}
