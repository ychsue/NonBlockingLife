package com.yescirculation.nonblockinglife;

import android.content.Context;
import android.content.Intent;
import android.provider.AlarmClock;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Sets alarms via the system Clock app ({@link AlarmClock#ACTION_SET_ALARM}).
 * Only supports a daily HH:mm time (no year/month/day) since that's all the Clock app intent accepts.
 * With {@code com.android.alarm.permission.SET_ALARM} granted (already declared in the manifest) and
 * skipUi=true, most clock apps (e.g. Google Clock) apply the alarm without showing any UI.
 */
final class ClockAlarmScheduler {
    private static final String TAG = "ClockAlarmScheduler";

    private ClockAlarmScheduler() {
    }

    static AlarmScheduleResult schedule(Context context, int id, JSONObject alarm) {
        JSONArray time = alarm.optJSONArray("time");
        if (time == null || time.length() < 2) {
            Log.w(TAG, "Alarm id=" + id + " is missing a [hour, minute] time array.");
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_INVALID_TIME);
        }

        int hour = time.optInt(0, -1);
        int minute = time.optInt(1, -1);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            Log.w(TAG, "Alarm id=" + id + " has an invalid time: " + hour + ":" + minute);
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_INVALID_TIME);
        }

        Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
        intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
        intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, alarm.optBoolean("skipUi", true));

        String label = alarm.optString("label", "");
        if (!label.isEmpty()) {
            intent.putExtra(AlarmClock.EXTRA_MESSAGE, label);
        }

        JSONArray days = alarm.optJSONArray("days");
        if (days != null && days.length() > 0) {
            ArrayList<Integer> dayList = new ArrayList<>();
            for (int i = 0; i < days.length(); i++) {
                dayList.add(days.optInt(i));
            }
            intent.putExtra(AlarmClock.EXTRA_DAYS, dayList);
        }

        // Context may not always be an Activity (e.g. called off a broadcast in the future).
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        String preferredPackage = ClockAppPreference.getSelectedPackage(context);
        if (preferredPackage != null) {
            intent.setPackage(preferredPackage);
        }

        if (intent.resolveActivity(context.getPackageManager()) == null) {
            Log.w(TAG, "No app can handle ACTION_SET_ALARM (preferredPackage=" + preferredPackage + ").");
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_NO_CLOCK_APP);
        }

        context.startActivity(intent);
        return AlarmScheduleResult.success();
    }
}
