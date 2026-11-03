package com.meturtv.app;

import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.Iterator;

/** Opens authenticated media in the Android Media3 player. */
public final class NativePlayerBridge {
    private final MainActivity activity;

    public NativePlayerBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void play(String urlText, String title, String headersJson) {
        try {
            Uri uri = Uri.parse(urlText == null ? "" : urlText);
            String scheme = uri.getScheme();
            if (uri.getHost() == null || uri.getUserInfo() != null
                    || !("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))) {
                notifyError("URL ไม่ถูกต้อง: รองรับเฉพาะ HTTP และ HTTPS");
                return;
            }

            JSONObject input = headersJson == null || headersJson.isEmpty()
                    ? new JSONObject() : new JSONObject(headersJson);
            JSONObject safeHeaders = new JSONObject();
            Iterator<String> names = input.keys();
            int count = 0;
            while (names.hasNext()) {
                String name = names.next();
                String value = input.optString(name, "");
                if (!name.matches("[A-Za-z0-9-]{1,64}") || value.length() > 8192
                        || value.contains("\r") || value.contains("\n")
                        || name.matches("(?i)host|content-length|connection|transfer-encoding|upgrade")) {
                    continue;
                }
                if (++count > 32) break;
                safeHeaders.put(name, value);
            }

            Intent intent = new Intent(activity, NativePlayerActivity.class);
            intent.putExtra(NativePlayerActivity.EXTRA_URL, uri.toString());
            intent.putExtra(NativePlayerActivity.EXTRA_TITLE, title == null ? "Metur TV" : title);
            intent.putExtra(NativePlayerActivity.EXTRA_HEADERS, safeHeaders.toString());
            activity.launchNativePlayer(intent);
        } catch (Exception exception) {
            notifyError("เปิด Native Player ไม่สำเร็จ: " + exception.getMessage());
        }
    }

    private void notifyError(String message) {
        WebView webView = activity.getWebView();
        if (webView == null) return;
        String script = "window.__meturNativePlayerError && window.__meturNativePlayerError("
                + JSONObject.quote(message) + ");";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
