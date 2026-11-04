package com.meturtv.app;

import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/** Full-screen Media3 playback for streams requiring custom HTTP headers. */
public final class NativePlayerActivity extends AppCompatActivity {
    public static final String EXTRA_URL = "metur.player.url";
    public static final String EXTRA_TITLE = "metur.player.title";
    public static final String EXTRA_HEADERS = "metur.player.headers";
    public static final String EXTRA_MEDIA_TYPE = "metur.player.media_type";

    private ExoPlayer player;
    private PlayerView playerView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String url = getIntent().getStringExtra(EXTRA_URL);
        if (url == null || url.isEmpty()) {
            finish();
            return;
        }

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS);
        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
        playerView.setBackgroundColor(android.graphics.Color.BLACK);
        setContentView(playerView);

        Map<String, String> headers = readHeaders(getIntent().getStringExtra(EXTRA_HEADERS));
        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory()
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(30000)
                .setAllowCrossProtocolRedirects(false)
                .setDefaultRequestProperties(headers);
        DefaultDataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, httpFactory);

        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSourceFactory))
                .build();
        playerView.setPlayer(player);

        String title = getIntent().getStringExtra(EXTRA_TITLE);
        MediaItem.Builder mediaBuilder = new MediaItem.Builder()
                .setUri(Uri.parse(url))
                .setMediaId(title == null ? "Metur TV" : title);
        String mediaType = getIntent().getStringExtra(EXTRA_MEDIA_TYPE);
        if ("channel".equals(mediaType) || url.toLowerCase(java.util.Locale.ROOT).contains(".m3u8")) {
            mediaBuilder.setMimeType(androidx.media3.common.MimeTypes.APPLICATION_M3U8);
        }
        player.setMediaItem(mediaBuilder.build());
        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Toast.makeText(NativePlayerActivity.this,
                        "เล่นวิดีโอไม่สำเร็จ: " + error.getErrorCodeName(),
                        Toast.LENGTH_LONG).show();
            }
        });
        player.prepare();
        player.play();
    }

    private Map<String, String> readHeaders(String json) {
        Map<String, String> result = new HashMap<>();
        try {
            JSONObject object = json == null ? new JSONObject() : new JSONObject(json);
            Iterator<String> names = object.keys();
            while (names.hasNext()) {
                String name = names.next();
                String value = object.optString(name, "");
                if (name.matches("[A-Za-z0-9-]{1,64}") && value.length() <= 8192
                        && !value.contains("\r") && !value.contains("\n")) {
                    result.put(name, value);
                }
            }
        } catch (Exception ignored) { }
        return result;
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
