package com.meturtv.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.content.ContentValues;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.OutputStream;
import java.io.IOException;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import androidx.webkit.WebViewAssetLoader;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * Metur TV - Main Leanback Activity for Android TV
 * Provides Hardware-Accelerated WebView, D-Pad Remote Forwarding,
 * Voice Search permissions, and Immersive 4K/1080p playback.
 */
public class MainActivity extends AppCompatActivity {

    private WebView mWebView;
    private WebViewAssetLoader assetLoader;
    private boolean nativePlayerWasOpened = false;
    private static final int RECORD_AUDIO_PERMISSION_REQUEST = 101;
    private PermissionRequest mCurrentPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while TV is running
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.BLACK);
        mWebView.addJavascriptInterface(new SecureVaultBridge(this), "MeturSecureVault");
        mWebView.addJavascriptInterface(new NativeHttpBridge(mWebView), "MeturNativeHttp");
        mWebView.addJavascriptInterface(new NativePlayerBridge(this), "MeturNativePlayer");
        mWebView.addJavascriptInterface(this, "MeturAppControl");
        mWebView.addJavascriptInterface(this, "MeturDiagnosticsBridge");
        setContentView(mWebView);

        setupWebView();
        checkPermissions();

        // Load local bundled dist or remote dev server
        mWebView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html");
    }

    /** Called by the JavaScript bridge to launch the isolated native media player. */
    public void launchNativePlayer(Intent intent) {
        runOnUiThread(() -> {
            try {
                startActivity(intent);
                nativePlayerWasOpened = true;
            } catch (Exception exception) {
                if (mWebView != null) {
                    String message = "เปิด Native Player ไม่สำเร็จ: " + exception.getMessage();
                    mWebView.evaluateJavascript(
                            "window.__meturNativePlayerError && window.__meturNativePlayerError("
                                    + org.json.JSONObject.quote(message) + ");", null);
                }
            }
        });
    }

    public WebView getWebView() {
        return mWebView;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (nativePlayerWasOpened && mWebView != null) {
            nativePlayerWasOpened = false;
            mWebView.post(() -> mWebView.evaluateJavascript(
                    "window.dispatchEvent(new Event('metur-native-player-returned'));", null));
        }
    }

    private void setupWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Enable hardware rendering
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost())
                        && "https".equals(uri.getScheme())) {
                    return false;
                }
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        // Never navigate the trusted WebView to an external origin.
                    }
                }
                return true;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            // Auto-grant microphone for Voice Search
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    Uri requestOrigin = request.getOrigin();
                    if (requestOrigin == null
                            || !"https".equals(requestOrigin.getScheme())
                            || !"appassets.androidplatform.net".equals(requestOrigin.getHost())) {
                        request.deny();
                        return;
                    }
                    String[] requested = request.getResources();
                    if (requested.length != 1
                            || !PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(requested[0])) {
                        request.deny();
                        return;
                    }
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        mCurrentPermissionRequest = request;
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.RECORD_AUDIO},
                                RECORD_AUDIO_PERMISSION_REQUEST);
                    }
                });
            }
        });
    }

    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    RECORD_AUDIO_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RECORD_AUDIO_PERMISSION_REQUEST) {
            if (mCurrentPermissionRequest != null) {
                if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    mCurrentPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    mCurrentPermissionRequest.deny();
                }
                mCurrentPermissionRequest = null;
            }
        }
    }

    /**
     * Forward physical TV remote D-Pad buttons directly into the Web App
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            int keyCode = event.getKeyCode();

            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_UP:
                    dispatchKeyToJs("ArrowUp");
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    dispatchKeyToJs("ArrowDown");
                    return true;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    dispatchKeyToJs("ArrowLeft");
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    dispatchKeyToJs("ArrowRight");
                    return true;
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                    dispatchKeyToJs("Enter");
                    return true;
                case KeyEvent.KEYCODE_BACK:
                    dispatchKeyToJs("Escape");
                    return true;
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                    dispatchKeyToJs("MediaPlayPause");
                    return true;
                case KeyEvent.KEYCODE_0:
                case KeyEvent.KEYCODE_1:
                case KeyEvent.KEYCODE_2:
                case KeyEvent.KEYCODE_3:
                case KeyEvent.KEYCODE_4:
                case KeyEvent.KEYCODE_5:
                case KeyEvent.KEYCODE_6:
                case KeyEvent.KEYCODE_7:
                case KeyEvent.KEYCODE_8:
                case KeyEvent.KEYCODE_9:
                    dispatchKeyToJs(String.valueOf(keyCode - KeyEvent.KEYCODE_0));
                    return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void dispatchKeyToJs(String keyName) {
        if (mWebView == null) return;
        String script = "window.dispatchEvent(new KeyboardEvent('keydown', { key: '" + keyName
                + "', bubbles: true, cancelable: true }));";
        mWebView.evaluateJavascript(script, null);
    }

    /**
     * Save an opt-in diagnostics JSON report to the public Downloads/Metur TV folder.
     * MediaStore works on Android 10+ without broad storage permissions.
     */
    @JavascriptInterface
    public String saveReport(String filename, String json) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return "Android เวอร์ชันนี้ไม่รองรับการบันทึกแบบ Downloads อัตโนมัติ";
        }
        String safeName = (filename == null ? "metur-tv-diagnostics.json" : filename)
                .replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!safeName.endsWith(".json")) safeName += ".json";
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
        values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Metur TV");
        values.put(MediaStore.Downloads.IS_PENDING, 1);
        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) return "ไม่สามารถสร้างไฟล์รายงานใน Downloads ได้";
        try (OutputStream output = getContentResolver().openOutputStream(uri)) {
            if (output == null) throw new IOException("Output stream unavailable");
            output.write((json == null ? "{}" : json).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            output.flush();
            ContentValues complete = new ContentValues();
            complete.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, complete, null, null);
            return "บันทึกรายงานแล้ว: Downloads/Metur TV/" + safeName;
        } catch (Exception exception) {
            getContentResolver().delete(uri, null, null);
            return "บันทึกรายงานไม่สำเร็จ: " + exception.getClass().getSimpleName();
        }
    }

    /** Explicit app-exit bridge used only after the web UI has handled Back navigation. */
    @JavascriptInterface
    public void exitApp() {
        runOnUiThread(() -> {
            if (!isFinishing()) {
                finish();
            }
        });
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }
}
