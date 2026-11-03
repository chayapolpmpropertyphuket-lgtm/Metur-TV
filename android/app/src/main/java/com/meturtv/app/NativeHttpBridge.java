package com.meturtv.app;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Asynchronous HTTP bridge: network I/O never blocks the WebView JavaScript thread. */
public final class NativeHttpBridge {
    private static final int CONNECT_TIMEOUT_MS = 10000;
    private static final int READ_TIMEOUT_MS = 20000;
    private static final int MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
    private final WebView webView;
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    public NativeHttpBridge(WebView webView) {
        this.webView = webView;
    }

    @JavascriptInterface
    public void request(String requestId, String urlText, String method, String headersJson, String body, boolean allowRedirects) {
        if (requestId == null || !requestId.matches("[A-Za-z0-9_-]{1,80}")) return;
        executor.execute(() -> {
            String result = performRequest(urlText, method, headersJson, body, allowRedirects);
            String script = "window.__meturHttpResolve && window.__meturHttpResolve("
                    + JSONObject.quote(requestId) + "," + JSONObject.quote(result) + ");";
            webView.post(() -> webView.evaluateJavascript(script, null));
        });
    }

    private String performRequest(String urlText, String method, String headersJson, String body, boolean allowRedirects) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlText);
            String protocol = url.getProtocol();
            if (!"http".equalsIgnoreCase(protocol) && !"https".equalsIgnoreCase(protocol)) {
                return error(0, "Only HTTP and HTTPS URLs are allowed");
            }
            if (url.getUserInfo() != null || url.getHost() == null || url.getHost().isEmpty()) {
                return error(0, "Invalid server URL");
            }
            String verb = method == null ? "GET" : method.toUpperCase(java.util.Locale.ROOT);
            if (!"GET".equals(verb) && !"POST".equals(verb) && !"DELETE".equals(verb)) {
                return error(0, "Unsupported HTTP method");
            }
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(verb);
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            // Redirects are opt-in. Playlist downloads may use public redirect/CDN URLs;
            // authenticated API calls keep redirects disabled to avoid forwarding credentials.
            connection.setInstanceFollowRedirects(allowRedirects);
            connection.setUseCaches(false);
            connection.setRequestProperty("Accept", "application/json, application/xml, text/xml, */*");
            connection.setRequestProperty("User-Agent", "Metur-TV/1.0 Android");

            JSONObject headers = headersJson == null || headersJson.isEmpty()
                    ? new JSONObject() : new JSONObject(headersJson);
            Iterator<String> names = headers.keys();
            while (names.hasNext()) {
                String name = names.next();
                String value = headers.optString(name, "");
                if (name.matches("[A-Za-z0-9-]{1,64}") && value.length() <= 8192
                        && !value.contains("\r") && !value.contains("\n")) {
                    connection.setRequestProperty(name, value);
                }
            }
            if ("POST".equals(verb)) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                byte[] bytes = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > 1024 * 1024) return error(0, "Request body too large");
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            String response = "";
            if (stream != null) {
                try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int total = 0, count;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_RESPONSE_BYTES) throw new IllegalStateException("Response too large");
                        output.write(buffer, 0, count);
                    }
                    response = output.toString("UTF-8");
                }
            }
            JSONObject result = new JSONObject();
            result.put("status", status);
            result.put("body", response);
            result.put("ok", status >= 200 && status < 300);
            return result.toString();
        } catch (Exception exception) {
            return error(0, exception.getClass().getSimpleName() + ": " + exception.getMessage());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String error(int status, String message) {
        JSONObject result = new JSONObject();
        try {
            result.put("status", status);
            result.put("body", "");
            result.put("ok", false);
            result.put("error", message == null ? "Network request failed" : message);
        } catch (Exception ignored) { }
        return result.toString();
    }
}
