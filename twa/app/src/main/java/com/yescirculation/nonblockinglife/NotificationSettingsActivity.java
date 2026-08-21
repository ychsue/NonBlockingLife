package com.yescirculation.nonblockinglife;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

/**
 * Trampoline started by the PWA navigating to nonblockinglife://notification-settings.
 * Because Chrome (foreground) issues the VIEW intent, Android treats this as a
 * user-initiated Activity start, unlike calling startActivity() from our app's
 * background postMessage handler, which gets silently blocked.
 */
public class NotificationSettingsActivity extends Activity {
    private static final int REQUEST_CODE = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_CODE);
            return;
        }

        openAppNotificationSettings();
        finish();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_CODE) {
            return;
        }
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        // If the system dialog didn't grant it (e.g. already permanently denied and no dialog
        // was shown at all), fall back to the settings screen so the user can enable it manually.
        if (!granted) {
            openAppNotificationSettings();
        }
        finish();
    }

    private void openAppNotificationSettings() {
        Intent settingsIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settingsIntent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        } else {
            settingsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.parse("package:" + getPackageName()));
        }
        startActivity(settingsIntent);
    }
}
