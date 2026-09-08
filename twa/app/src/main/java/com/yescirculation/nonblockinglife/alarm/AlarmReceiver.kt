package com.yescirculation.nonblockinglife.alarm

import android.Manifest
import android.util.Log
import com.yescirculation.nonblockinglife.R
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.yescirculation.nonblockinglife.WebViewActivity

/** Fires when an [ExactAlarmScheduler]-scheduled alarm is due; shows the alarm as a notification.  */
class AlarmReceiver : BroadcastReceiver() {
    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(EXTRA_ALARM_ID, System.currentTimeMillis().toInt())
        val label = intent.getStringExtra(EXTRA_LABEL)
        Log.d("AlarmReceiver", "鬧鐘觸發！ID: $id, Label: $label")
        showAlarmNotification(context, id, label)
    }

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    private fun showAlarmNotification(context: Context, id: Int, label: String?) {
        ensureChannel(context)
        val permission =ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
        if (permission
            != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val openIntent = Intent(context, WebViewActivity::class.java)
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val contentIntent = PendingIntent.getActivity(
            context, id, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder: NotificationCompat.Builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setContentTitle(if (label.isNullOrEmpty()) context.getString(R.string.appName) else label)
            .setContentText("鬧鐘時間到了")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)

        NotificationManagerCompat.from(context).notify(id, builder.build())
    }

    private fun ensureChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_ID, "NonBlockingLife 鬧鐘",
            NotificationManager.IMPORTANCE_HIGH
        )
        NotificationManagerCompat.from(context).createNotificationChannel(channel)
    }

    companion object {
        const val EXTRA_ALARM_ID: String = "alarm_id"
        const val EXTRA_LABEL: String = "alarm_label"
        private const val CHANNEL_ID = "nbl_alarms"
    }
}