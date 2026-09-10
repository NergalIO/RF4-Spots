package com.rf4spots.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
  private static final String ASSET_HOST = "appassets.androidplatform.net";

  private WebView webView;
  private ValueCallback<Uri[]> filePathCallback;
  private boolean pageLoaded;
  private String pendingPostId;

  private final ActivityResultLauncher<Intent> fileChooser =
      registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
        Uri[] uris = WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData());
        if (filePathCallback != null) {
          filePathCallback.onReceiveValue(uris);
          filePathCallback = null;
        }
      });

  private final ActivityResultLauncher<String> notifyPermissionLauncher =
      registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted ->
          deliverNotifyPermission(granted ? "granted" : "denied"));

  @Override
  @SuppressLint("SetJavaScriptEnabled")
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Rf4Notifier.ensureChannel(this);
    webView = new WebView(this);
    webView.setBackgroundColor(0xFF07131C);

    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(0xFF07131C);
    root.addView(
        webView,
        new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    setContentView(root);
    applyWindowInsets(root);

    WebViewAssetLoader assetLoader =
        new WebViewAssetLoader.Builder()
            .setDomain(ASSET_HOST)
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(false);
    settings.setTextZoom(100);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    settings.setUserAgentString(settings.getUserAgentString() + " RF4SpotsAndroid");
    CookieManager.getInstance().setAcceptCookie(true);
    CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
    webView.addJavascriptInterface(new Rf4JsBridge(this), "rf4Android");
    webView.setDownloadListener(
        (url, userAgent, contentDisposition, mimeType, contentLength) -> openExternally(Uri.parse(url)));

    webView.setWebViewClient(
        new WebViewClientCompat() {
          @Override
          public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
          }

          @Override
          public void onPageFinished(WebView view, String url) {
            pageLoaded = true;
            evalJs("window.__rf4AppFocused=true");
            if (pendingPostId != null) {
              deliverPostClick(pendingPostId);
              pendingPostId = null;
            }
          }

          /** WebViewClientCompat сводит все переходы к этой перегрузке. */
          @Override
          @SuppressWarnings("deprecation")
          public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri parsed = Uri.parse(url);
            if (ASSET_HOST.equals(parsed.getHost())) return false;
            openExternally(parsed);
            return true;
          }
        });

    webView.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public boolean onShowFileChooser(
              WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
              filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;
            try {
              fileChooser.launch(params.createIntent());
            } catch (Exception e) {
              filePathCallback = null;
              return false;
            }
            return true;
          }
        });

    getOnBackPressedDispatcher()
        .addCallback(
            this,
            new OnBackPressedCallback(true) {
              @Override
              public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                  webView.goBack();
                } else {
                  moveTaskToBack(true);
                }
              }
            });

    queuePostFromIntent(getIntent());
    webView.loadUrl("https://" + ASSET_HOST + "/index.html");
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    queuePostFromIntent(intent);
    if (pageLoaded && pendingPostId != null) {
      deliverPostClick(pendingPostId);
      pendingPostId = null;
    }
  }

  @Override
  protected void onPause() {
    super.onPause();
    evalJs("window.__rf4AppFocused=false");
  }

  @Override
  protected void onResume() {
    super.onResume();
    evalJs("window.__rf4AppFocused=true;document.dispatchEvent(new Event('visibilitychange'))");
  }

  String notifyPermissionState() {
    if (Build.VERSION.SDK_INT < 33) return "granted";
    int check = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS);
    return check == PackageManager.PERMISSION_GRANTED ? "granted" : "denied";
  }

  void requestNotifyPermissionFromJs() {
    if (Build.VERSION.SDK_INT < 33) {
      deliverNotifyPermission("granted");
      return;
    }
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        == PackageManager.PERMISSION_GRANTED) {
      deliverNotifyPermission("granted");
      return;
    }
    notifyPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
  }

  boolean postNotification(String title, String body, String postId, boolean silent) {
    try {
      return Rf4Notifier.show(this, title, body, postId, silent);
    } catch (SecurityException e) {
      return false;
    }
  }

  private void deliverNotifyPermission(String state) {
    evalJs("window.__rf4NotifyPermission && window.__rf4NotifyPermission(" + JSONObject.quote(state) + ")");
  }

  private void queuePostFromIntent(Intent intent) {
    if (intent == null) return;
    String postId = intent.getStringExtra(Rf4Notifier.EXTRA_POST_ID);
    if (postId == null || postId.isEmpty()) return;
    intent.removeExtra(Rf4Notifier.EXTRA_POST_ID);
    pendingPostId = postId;
  }

  private void deliverPostClick(String postId) {
    evalJs("window.__rf4NotifyClicked && window.__rf4NotifyClicked(" + JSONObject.quote(postId) + ")");
  }

  private void evalJs(String js) {
    if (webView == null) return;
    runOnUiThread(() -> webView.evaluateJavascript(js, null));
  }

  /** Внешние сайты (rf4-cafe.ru, rf4-stat.ru, ссылки на клиенты) уходят в системный браузер. */
  private void openExternally(Uri url) {
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, url));
    } catch (Exception ignored) {
      /* нет приложения, готового открыть ссылку */
    }
  }

  /**
   * Начиная с Android 15 окно всегда рисуется под системными панелями, а клавиатура больше не
   * ужимает его сама. На более старых версиях декор гасит эти вставки и отступы выходят нулевыми.
   */
  private void applyWindowInsets(FrameLayout root) {
    ViewCompat.setOnApplyWindowInsetsListener(
        root,
        (view, windowInsets) -> {
          Insets bars =
              windowInsets.getInsets(
                  WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
          Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
          view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
          return WindowInsetsCompat.CONSUMED;
        });
    ViewCompat.requestApplyInsets(root);
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.removeJavascriptInterface("rf4Android");
      webView.destroy();
    }
    super.onDestroy();
  }
}
