package com.yescirculation.nonblockinglife.alarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.net.toUri

/** Checks/requests the SCHEDULE_EXACT_ALARM special permission required on API 31+ for exact alarms.  */
internal object ExactAlarmPermissionHelper {
    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true
        }
        val alarmManager = context.getSystemService<AlarmManager?>(AlarmManager::class.java)
        return alarmManager != null && alarmManager.canScheduleExactAlarms()
    }

    /** Sends the user to the system "Alarms & reminders" toggle for this app; no Play Console form needed.  */
    fun requestPermission(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return
        }
        val intent = Intent(
            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            ("package:" + context.packageName).toUri()
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}