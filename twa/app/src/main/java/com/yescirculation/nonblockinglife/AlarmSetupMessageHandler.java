package com.yescirculation.nonblockinglife;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.provider.AlarmClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsSession;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

/**
 * Handles the "which clock app / is exact alarm allowed" setup flow, so the PWA can render its
 * own picker UI and cache the answers (e.g. in localStorage) instead of relying on Android's own
 * default-app resolution each time.
 * Message types (PWA -> Android):
 *   "nbl:query-alarm-setup"              -> replies "nbl:alarm-setup" with the combined status below.
 *   "nbl:query-clock-apps"               -> replies "nbl:clock-apps" with the installable app list.
 *   "nbl:select-clock-app" {packageName} -> persists the choice used by {@link ClockAlarmScheduler}.
 *   "nbl:request-exact-alarm-permission" -> opens the system "Alarms & reminders" settings screen.
 */
final class AlarmSetupMessageHandler {
    private static final String TAG = "AlarmSetupMessageHandler";

    static final String QUERY_ALARM_SETUP_TYPE = "nbl:query-alarm-setup";
    static final String QUERY_CLOCK_APPS_TYPE = "nbl:query-clock-apps";
    static final String SELECT_CLOCK_APP_TYPE = "nbl:select-clock-app";
    static final String REQUEST_EXACT_ALARM_PERMISSION_TYPE = "nbl:request-exact-alarm-permission";

    private AlarmSetupMessageHandler() {
    }

    static void queryAlarmSetup(Context context, @Nullable CustomTabsSession session, String requestId) {
        if (session == null) {
            return;
        }
        JSONObject reply = new JSONObject();
        try {
            reply.put("type", "nbl:alarm-setup");
            reply.put("requestId", requestId);
            reply.put("selectedClockApp", describeSelectedClockApp(context));
            reply.put("exactAlarmAllowed", ExactAlarmPermissionHelper.canScheduleExactAlarms(context));
        } catch (JSONException e) {
            Log.e(TAG, "Failed building nbl:alarm-setup payload", e);
            return;
        }
        session.postMessage(reply.toString(), null);
    }

    static void queryClockApps(Context context, @Nullable CustomTabsSession session, String requestId) {
        if (session == null) {
            return;
        }
        JSONObject reply = new JSONObject();
        try {
            JSONArray apps = listClockApps(context);
            reply.put("type", "nbl:clock-apps");
            reply.put("requestId", requestId);
            reply.put("apps", apps);
            reply.put("selectedPackageName", ClockAppPreference.getSelectedPackage(context));
        } catch (JSONException e) {
            Log.e(TAG, "Failed building nbl:clock-apps payload", e);
            return;
        }
        session.postMessage(reply.toString(), null);
    }

    static void selectClockApp(Context context, JSONObject message, @Nullable CustomTabsSession session) {
        String packageName = message.optString("packageName", null);
        String requestId = message.optString("requestId", null);
        ClockAppPreference.setSelectedPackage(context, packageName);

        if (session == null) {
            return;
        }
        JSONObject reply = new JSONObject();
        try {
            reply.put("type", "nbl:select-clock-app-result");
            reply.put("requestId", requestId);
            reply.put("selectedClockApp", describeSelectedClockApp(context));
        } catch (JSONException e) {
            Log.e(TAG, "Failed building nbl:select-clock-app-result payload", e);
            return;
        }
        session.postMessage(reply.toString(), null);
    }

    static void requestExactAlarmPermission(Context context) {
        ExactAlarmPermissionHelper.requestPermission(context);
    }

    private static JSONArray listClockApps(Context context) throws JSONException {
        JSONArray apps = new JSONArray();
        PackageManager pm = context.getPackageManager();
        Intent probe = new Intent(AlarmClock.ACTION_SET_ALARM);
        List<ResolveInfo> resolveInfos = pm.queryIntentActivities(probe, PackageManager.MATCH_DEFAULT_ONLY);

        for (ResolveInfo resolveInfo : resolveInfos) {
            JSONObject app = new JSONObject();
            app.put("packageName", resolveInfo.activityInfo.packageName);
            app.put("label", resolveInfo.loadLabel(pm).toString());
            apps.put(app);
        }
        return apps;
    }

    @Nullable
    private static JSONObject describeSelectedClockApp(Context context) throws JSONException {
        String preferredPackage = ClockAppPreference.getSelectedPackage(context);
        PackageManager pm = context.getPackageManager();
        Intent probe = new Intent(AlarmClock.ACTION_SET_ALARM);
        if (preferredPackage != null) {
            probe.setPackage(preferredPackage);
        }

        ResolveInfo resolveInfo = pm.resolveActivity(probe, PackageManager.MATCH_DEFAULT_ONLY);
        if (resolveInfo == null || resolveInfo.activityInfo == null) {
            return null;
        }

        JSONObject app = new JSONObject();
        app.put("packageName", resolveInfo.activityInfo.packageName);
        app.put("label", resolveInfo.loadLabel(pm).toString());
        return app;
    }
}
