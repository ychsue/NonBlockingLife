package com.yescirculation.nonblockinglife;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.AlarmClock;
import android.widget.Toast;

import androidx.annotation.Nullable;

public class ClockTriggerActivity extends Activity {
    private static final int DEFAULT_TIMER_SECONDS = 600;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        Uri uri = intent.getData();

        if (uri != null) {
            String host = uri.getHost();
            if ("show-clock".equals(host)) {
                launchShowTimers();
            } else if ("set-timer".equals(host)) {
                launchSetTimer(uri);
            }
        }

        finish();
    }

    private void launchShowTimers() {
        try {
            Intent clockIntent = new Intent(AlarmClock.ACTION_SHOW_TIMERS);
            startActivity(clockIntent);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Cannot Open Clock", Toast.LENGTH_SHORT).show();
        }
    }

    private void launchSetTimer(Uri uri) {
        int durationSeconds = parseDurationSeconds(uri.getQueryParameter("duration"));
        boolean skipUi = parseBoolean(uri.getQueryParameter("skipUi"), true);
        String title = uri.getQueryParameter("title");

        try {
            Intent timerIntent = new Intent(AlarmClock.ACTION_SET_TIMER);
            timerIntent.putExtra(AlarmClock.EXTRA_LENGTH, durationSeconds);
            timerIntent.putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi);

            if (title != null && !title.isEmpty()) {
                timerIntent.putExtra(AlarmClock.EXTRA_MESSAGE, title);
            }

            if (timerIntent.resolveActivity(getPackageManager()) != null) {
                startActivity(timerIntent);
            } else {
                Toast.makeText(this, "No timer handler available", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Cannot Start Timer", Toast.LENGTH_SHORT).show();
        }
    }

    private int parseDurationSeconds(String rawDuration) {
        if (rawDuration == null || rawDuration.trim().isEmpty()) {
            return DEFAULT_TIMER_SECONDS;
        }

        try {
            int seconds = Integer.parseInt(rawDuration.trim());
            return Math.max(0, seconds);
        } catch (NumberFormatException e) {
            return DEFAULT_TIMER_SECONDS;
        }
    }

    private boolean parseBoolean(String rawValue, boolean fallback) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return fallback;
        }

        String normalized = rawValue.trim().toLowerCase();
        if ("true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized)) {
            return true;
        }
        if ("false".equals(normalized) || "0".equals(normalized) || "no".equals(normalized)) {
            return false;
        }
        return fallback;
    }
}
