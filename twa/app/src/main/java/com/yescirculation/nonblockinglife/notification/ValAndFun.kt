package com.yescirculation.nonblockinglife.notification

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.yescirculation.nonblockinglife.bridge.MockSession
import androidx.core.net.toUri
import com.yescirculation.nonblockinglife.WebViewActivity
import com.yescirculation.nonblockinglife.bridge.MessageSender


const val NOTIFICATION_CHANNEL_ID = "nbl_pwa_notifications"
const val NOTIFY_MESSAGE_TYPE = "nbl:notify"
const val QUERY_NOTIFICATION_PERMISSION_TYPE = "nbl:query-notification-permission"
const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1001
const val TAG_NOTIFICATION = "Notification"
fun createNotificationChannel(activity: Activity) {
    val channel = NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "NonBlockingLife", NotificationManager.IMPORTANCE_DEFAULT
    )
    NotificationManagerCompat.from(activity).createNotificationChannel(channel)
}

fun requestNotificationPermissionIfNeeded(activity: Activity): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        return false
    }
    if (ActivityCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED
    ) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf<String?>(Manifest.permission.POST_NOTIFICATIONS),
            NOTIFICATION_PERMISSION_REQUEST_CODE
        )
        return true
    }
    return false
}

fun replyNotificationPermissionStatus(requestId: String?, context: Context, mSession: MessageSender?) {
    if (mSession == null) {
        return
    }
    val granted = ActivityCompat.checkSelfPermission(
        context,
        Manifest.permission.POST_NOTIFICATIONS
    ) == PackageManager.PERMISSION_GRANTED
    mSession.postMessage(
        "{\"type\":\"nbl:notification-permission-status\",\"granted\":$granted,\"requestId\":\"$requestId\"}",
        null
    )
}

fun showNativeNotification(
    mSession: MockSession,
    context: Context,
    title: String?, body: String?, notificationId: Int,
    url: String?, dismissOnClick: Boolean, requestId: String?
) {
    if (ActivityCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS
        )
        != PackageManager.PERMISSION_GRANTED
    ) {
        Log.w(TAG_NOTIFICATION, "POST_NOTIFICATIONS not granted; dropping native notification.")
        return
    }
    val builder: NotificationCompat.Builder = NotificationCompat.Builder(
        context,
        NOTIFICATION_CHANNEL_ID
    )
        .setSmallIcon(com.yescirculation.nonblockinglife.R.drawable.ic_notification_icon)
        .setContentTitle(title)
        .setContentText(body)
        .setAutoCancel(dismissOnClick)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)

    if (!url.isNullOrEmpty()) {
        val openIntent = Intent(
            Intent.ACTION_VIEW, url.toUri(),
            context, WebViewActivity::class.java
        )
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val contentIntent = PendingIntent.getActivity(
            context,
            notificationId, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        builder.setContentIntent(contentIntent)
    }

    NotificationManagerCompat.from(context).notify(notificationId, builder.build())
    mSession.postMessage(
        "{\"type\":\"nbl:notification-shown\",\"notificationId\":$notificationId,\"requestId\":\"$requestId\"}",
        null
    )
}
