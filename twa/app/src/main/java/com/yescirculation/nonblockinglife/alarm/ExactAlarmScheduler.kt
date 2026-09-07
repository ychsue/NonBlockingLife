package com.yescirculation.nonblockinglife.alarm

import android.app.AlarmManager
import android.app.AlarmManager.AlarmClockInfo
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import com.yescirculation.nonblockinglife.WebViewActivity
import org.json.JSONObject
import java.util.Calendar

/**
 * Schedules a one-off exact alarm via [AlarmManager.setAlarmClock], fired by [AlarmReceiver].
 * Even setAlarmClock needs SCHEDULE_EXACT_ALARM granted on API 31+; see [ExactAlarmPermissionHelper].
 */
internal object ExactAlarmScheduler {
    private const val TAG = "ExactAlarmScheduler"

    fun schedule(context: Context, id: Int, alarm: JSONObject): AlarmScheduleResult {
        if (!ExactAlarmPermissionHelper.canScheduleExactAlarms(context)) {
            Log.w(
                TAG,
                "Missing SCHEDULE_EXACT_ALARM permission; opening settings for the user to grant it."
            )
            ExactAlarmPermissionHelper.requestPermission(context)
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_EXACT_ALARM_PERMISSION_REQUIRED)
        }

        val time = alarm.optJSONArray("time")
        if (time == null || time.length() < 5) {
            Log.w(
                TAG,
                "Alarm id=$id is missing a [year, month, day, hour, minute] time array."
            )
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_INVALID_TIME)
        }

        val calendar = Calendar.getInstance()
        calendar.set(
            time.optInt(0),
            time.optInt(1) - 1,
            time.optInt(2),
            time.optInt(3),
            time.optInt(4),
            0
        )
        calendar.set(Calendar.MILLISECOND, 0)

        val triggerAtMillis = calendar.getTimeInMillis()
        if (triggerAtMillis <= System.currentTimeMillis()) {
            Log.w(TAG, "Alarm id=" + id + " time is in the past: " + calendar.getTime())
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_PAST_TIME)
        }

        val alarmManager = context.getSystemService<AlarmManager?>(AlarmManager::class.java)
        if (alarmManager == null) {
            Log.w(TAG, "AlarmManager unavailable.")
            return AlarmScheduleResult.failure(AlarmScheduleResult.REASON_ALARM_MANAGER_UNAVAILABLE)
        }

        val fireIntent = Intent(context, AlarmReceiver::class.java)
        fireIntent.putExtra(AlarmReceiver.EXTRA_ALARM_ID, id)
        fireIntent.putExtra(AlarmReceiver.EXTRA_LABEL, alarm.optString("label", ""))
        val operation = PendingIntent.getBroadcast(
            context, id, fireIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Shown when the user taps the alarm icon in the status bar.
        val showIntent = Intent(context, WebViewActivity::class.java)
        showIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val showPendingIntent = PendingIntent.getActivity(
            context, id, showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        alarmManager.setAlarmClock(
            AlarmClockInfo(triggerAtMillis, showPendingIntent), operation
        )
        return AlarmScheduleResult.success()
    }
}