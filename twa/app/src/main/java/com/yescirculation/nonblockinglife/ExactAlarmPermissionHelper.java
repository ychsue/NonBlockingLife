package com.yescirculation.nonblockinglife;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

/** Checks/requests the SCHEDULE_EXACT_ALARM special permission required on API 31+ for exact alarms. */
final class ExactAlarmPermissionHelper {
    private ExactAlarmPermissionHelper() {
    }

    static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    /** Sends the user to the system "Alarms & reminders" toggle for this app; no Play Console form needed. */
    static void requestPermission(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
