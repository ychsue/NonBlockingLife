package com.yescirculation.nonblockinglife;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Fires when an {@link ExactAlarmScheduler}-scheduled alarm is due; shows the alarm as a notification. */
public class AlarmReceiver extends BroadcastReceiver {
    static final String EXTRA_ALARM_ID = "alarm_id";
    static final String EXTRA_LABEL = "alarm_label";
    private static final String CHANNEL_ID = "nbl_alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra(EXTRA_ALARM_ID, (int) System.currentTimeMillis());
        String label = intent.getStringExtra(EXTRA_LABEL);
        showAlarmNotification(context, id, label);
    }

    private void showAlarmNotification(Context context, int id, String label) {
        ensureChannel(context);

        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        Intent openIntent = new Intent(context, LauncherActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(context, id, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(label == null || label.isEmpty() ? context.getString(R.string.appName) : label)
                .setContentText("鬧鐘時間到了")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        NotificationManagerCompat.from(context).notify(id, builder.build());
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "NonBlockingLife 鬧鐘",
                NotificationManager.IMPORTANCE_HIGH);
        NotificationManagerCompat.from(context).createNotificationChannel(channel);
    }
}
