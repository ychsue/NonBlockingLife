package com.yescirculation.nonblockinglife;

import android.content.Context;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsSession;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Parses the {@code nbl:set-alarms} postMessage payload and dispatches each entry to
 * {@link ClockAlarmScheduler} (mode "clock") or {@link ExactAlarmScheduler} (mode "exact").
 * Expected payload shape:
 * {"type":"nbl:set-alarms","alarms":[
 *   {"id":1001,"mode":"clock","time":[13,30],"label":"clock test1...","skipUi":true},
 *   {"id":1002,"mode":"clock","time":[14,30],"label":"clock test2...","days":[2,3,4,5,6],"skipUi":true},
 *   {"id":1003,"mode":"exact","time":[2026,8,23,13,03],"label":"..."}
 * ]}
 */
final class AlarmMessageHandler {
    private static final String TAG = "AlarmMessageHandler";
    static final String SET_ALARMS_MESSAGE_TYPE = "nbl:set-alarms";

    private AlarmMessageHandler() {
    }

    static void handle(Context context, JSONObject message, @Nullable CustomTabsSession session) {
        JSONArray alarms = message.optJSONArray("alarms");
        String requestId = message.optString("requestId", null);
        if (alarms == null) {
            Log.w(TAG, "nbl:set-alarms received without an alarms array.");
            return;
        }

        JSONArray results = new JSONArray();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm == null) {
                continue;
            }
            results.put(scheduleOne(context, alarm));
        }

        if (session == null) {
            return;
        }

        JSONObject reply = new JSONObject();
        try {
            reply.put("type", "nbl:set-alarms-result");
            reply.put("requestId", requestId);
            reply.put("results", results);
        } catch (JSONException e) {
            Log.e(TAG, "Failed building set-alarms-result payload", e);
            return;
        }
        session.postMessage(reply.toString(), null);
    }

    private static JSONObject scheduleOne(Context context, JSONObject alarm) {
        String mode = alarm.optString("mode", "clock");
        int id = alarm.optInt("id", (int) System.currentTimeMillis());
        AlarmScheduleResult scheduleResult;
        String error = null;
        try {
            scheduleResult = "exact".equals(mode)
                    ? ExactAlarmScheduler.schedule(context, id, alarm)
                    : ClockAlarmScheduler.schedule(context, id, alarm);
        } catch (Exception e) {
            Log.e(TAG, "Failed scheduling alarm id=" + id, e);
            scheduleResult = AlarmScheduleResult.failure(null);
            error = e.getMessage();
        }

        JSONObject result = new JSONObject();
        try {
            result.put("id", id);
            result.put("mode", mode);
            result.put("ok", scheduleResult.ok);
            if (scheduleResult.reason != null) {
                result.put("reason", scheduleResult.reason);
            }
            if (error != null) {
                result.put("error", error);
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed building result entry", e);
        }
        return result;
    }
}
