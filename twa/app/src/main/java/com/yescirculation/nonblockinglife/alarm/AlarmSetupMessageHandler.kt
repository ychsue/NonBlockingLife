package com.yescirculation.nonblockinglife.alarm

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.AlarmClock
import android.util.Log
import com.yescirculation.nonblockinglife.bridge.MessageSender
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Handles the "which clock app / is exact alarm allowed" setup flow, so the PWA can render its
 * own picker UI and cache the answers (e.g. in localStorage) instead of relying on Android's own
 * default-app resolution each time.
 * Message types (PWA -> Android):
 * "nbl:query-alarm-setup"              -> replies "nbl:alarm-setup" with the combined status below.
 * "nbl:query-clock-apps"               -> replies "nbl:clock-apps" with the installable app list.
 * "nbl:select-clock-app" {packageName} -> persists the choice used by [ClockAlarmScheduler].
 * "nbl:request-exact-alarm-permission" -> opens the system "Alarms & reminders" settings screen.
 */
internal object AlarmSetupMessageHandler {
    private const val TAG = "AlarmSetupMessageHandler"

    const val QUERY_ALARM_SETUP_TYPE: String = "nbl:query-alarm-setup"
    const val QUERY_CLOCK_APPS_TYPE: String = "nbl:query-clock-apps"
    const val SELECT_CLOCK_APP_TYPE: String = "nbl:select-clock-app"
    const val REQUEST_EXACT_ALARM_PERMISSION_TYPE: String = "nbl:request-exact-alarm-permission"

    fun queryAlarmSetup(context: Context, session: MessageSender?, requestId: String?) {
        if (session == null) {
            return
        }
        val reply = JSONObject()
        try {
            reply.put("type", "nbl:alarm-setup")
            reply.put("requestId", requestId)
            reply.put("selectedClockApp", describeSelectedClockApp(context))
            reply.put(
                "exactAlarmAllowed",
                ExactAlarmPermissionHelper.canScheduleExactAlarms(context)
            )
        } catch (e: JSONException) {
            Log.e(TAG, "Failed building nbl:alarm-setup payload", e)
            return
        }
        session.postMessage(reply.toString(), null)
    }

    fun queryClockApps(context: Context, session: MessageSender?, requestId: String?) {
        if (session == null) {
            return
        }
        val reply = JSONObject()
        try {
            val apps = listClockApps(context)
            reply.put("type", "nbl:clock-apps")
            reply.put("requestId", requestId)
            reply.put("apps", apps)
            reply.put("selectedPackageName", ClockAppPreference.getSelectedPackage(context))
        } catch (e: JSONException) {
            Log.e(TAG, "Failed building nbl:clock-apps payload", e)
            return
        }
        session.postMessage(reply.toString(), null)
    }

    fun selectClockApp(context: Context, message: JSONObject, session: MessageSender?) {
        val packageName = message.optString("packageName", "")
        val requestId = message.optString("requestId", "")
        ClockAppPreference.setSelectedPackage(context, packageName)

        if (session == null) {
            return
        }
        val reply = JSONObject()
        try {
            reply.put("type", "nbl:select-clock-app-result")
            reply.put("requestId", requestId)
            reply.put("selectedClockApp", describeSelectedClockApp(context))
        } catch (e: JSONException) {
            Log.e(TAG, "Failed building nbl:select-clock-app-result payload", e)
            return
        }
        session.postMessage(reply.toString(), null)
    }

    fun requestExactAlarmPermission(context: Context?) {
        if (context == null) {
            return
        }
        ExactAlarmPermissionHelper.requestPermission(context)
    }

    @Throws(JSONException::class)
    private fun listClockApps(context: Context): JSONArray {
        val apps = JSONArray()
        val pm = context.packageManager
        val probe = Intent(AlarmClock.ACTION_SET_ALARM)
        val resolveInfos = pm.queryIntentActivities(probe, PackageManager.MATCH_DEFAULT_ONLY)

        for (resolveInfo in resolveInfos) {
            val app = JSONObject()
            app.put("packageName", resolveInfo.activityInfo.packageName)
            app.put("label", resolveInfo.loadLabel(pm).toString())
            apps.put(app)
        }
        return apps
    }

    @Throws(JSONException::class)
    private fun describeSelectedClockApp(context: Context): JSONObject? {
        val preferredPackage = ClockAppPreference.getSelectedPackage(context)
        val pm = context.packageManager
        val probe = Intent(AlarmClock.ACTION_SET_ALARM)
        if (preferredPackage != null) {
            probe.setPackage(preferredPackage)
        }

        val resolveInfo = pm.resolveActivity(probe, PackageManager.MATCH_DEFAULT_ONLY)
        if (resolveInfo == null || resolveInfo.activityInfo == null) {
            return null
        }

        val app = JSONObject()
        app.put("packageName", resolveInfo.activityInfo.packageName)
        app.put("label", resolveInfo.loadLabel(pm).toString())
        return app
    }
}