package com.yescirculation.nonblockinglife;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Schedules a one-off exact alarm via {@link AlarmManager#setAlarmClock}, fired by {@link AlarmReceiver}.
 * Even setAlarmClock needs SCHEDULE_EXACT_ALARM granted on API 31+; see {@link ExactAlarmPermissionHelper}.
 */
final class ExactAlarmScheduler {
    private static final String TAG = "ExactAlarmScheduler";

    private ExactAlarmScheduler() {
    }

    static boolean schedule(Context context, int id, JSONObject alarm) {
        if (!ExactAlarmPermissionHelper.canScheduleExactAlarms(context)) {
            Log.w(TAG, "Missing SCHEDULE_EXACT_ALARM permission; opening settings for the user to grant it.");
            ExactAlarmPermissionHelper.requestPermission(context);
            return false;
        }

        JSONArray time = alarm.optJSONArray("time");
        if (time == null || time.length() < 5) {
            Log.w(TAG, "Alarm id=" + id + " is missing a [year, month, day, hour, minute] time array.");
            return false;
        }

        Calendar calendar = Calendar.getInstance();
        calendar.set(time.optInt(0), time.optInt(1) - 1, time.optInt(2), time.optInt(3), time.optInt(4), 0);
        calendar.set(Calendar.MILLISECOND, 0);

        long triggerAtMillis = calendar.getTimeInMillis();
        if (triggerAtMillis <= System.currentTimeMillis()) {
            Log.w(TAG, "Alarm id=" + id + " time is in the past: " + calendar.getTime());
            return false;
        }

        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        if (alarmManager == null) {
            Log.w(TAG, "AlarmManager unavailable.");
            return false;
        }

        Intent fireIntent = new Intent(context, AlarmReceiver.class);
        fireIntent.putExtra(AlarmReceiver.EXTRA_ALARM_ID, id);
        fireIntent.putExtra(AlarmReceiver.EXTRA_LABEL, alarm.optString("label", ""));
        PendingIntent operation = PendingIntent.getBroadcast(context, id, fireIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Shown when the user taps the alarm icon in the status bar.
        Intent showIntent = new Intent(context, LauncherActivity.class);
        showIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent showPendingIntent = PendingIntent.getActivity(context, id, showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        alarmManager.setAlarmClock(
                new AlarmManager.AlarmClockInfo(triggerAtMillis, showPendingIntent), operation);
        return true;
    }
}
