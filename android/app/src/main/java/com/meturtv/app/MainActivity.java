package com.meturtv.app;

import android.Manifest;
import android.content.pm.PackageManager;
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
    private static final int RECORD_AUDIO_PERMISSION_REQUEST = 101;
    private PermissionRequest mCurrentPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while TV is running
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(Color.BLACK);
        setContentView(mWebView);

        setupWebView();
        checkPermissions();

        // Load local bundled dist or remote dev server
        mWebView.loadUrl("file:///android_asset/dist/index.html");
    }

    private void setupWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Enable hardware rendering
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            // Auto-grant microphone for Voice Search
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            } else {
                                mCurrentPermissionRequest = request;
                                ActivityCompat.requestPermissions(MainActivity.this,
                                        new String[]{Manifest.permission.RECORD_AUDIO},
                                        RECORD_AUDIO_PERMISSION_REQUEST);
                            }
                            return;
                        }
                    }
                    request.grant(request.getResources());
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
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (mCurrentPermissionRequest != null) {
                    mCurrentPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    mCurrentPermissionRequest = null;
                }
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
        String script = "window.dispatchEvent(new KeyboardEvent('keydown', { key: '" + keyName + "', bubbles: true }));";
        mWebView.evaluateJavascript(script, null);
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
