package com.yescirculation.nonblockinglife.alarm

import android.content.Context
import android.util.Log
import com.yescirculation.nonblockinglife.bridge.MessageSender
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Parses the `nbl:set-alarms` postMessage payload and dispatches each entry to
 * [ClockAlarmScheduler] (mode "clock") or [ExactAlarmScheduler] (mode "exact").
 * Expected payload shape:
 * {"type":"nbl:set-alarms","alarms":[
 * {"id":1001,"mode":"clock","time":[13,30],"label":"clock test1...","skipUi":true},
 * {"id":1002,"mode":"clock","time":[14,30],"label":"clock test2...","days":[2,3,4,5,6],"skipUi":true},
 * {"id":1003,"mode":"exact","time":[2026,8,23,13,03],"label":"..."}
 * ]}
 */
internal object AlarmMessageHandler {
    private const val TAG = "AlarmMessageHandler"
    const val SET_ALARMS_MESSAGE_TYPE: String = "nbl:set-alarms"

    fun handle(context: Context?, message: JSONObject, session: MessageSender?) {
        val alarms = message.optJSONArray("alarms")
        val requestId = message.optString("requestId", "")
        if (alarms == null) {
            Log.w(TAG, "nbl:set-alarms received without an alarms array.")
            return
        }

        val results = JSONArray()
        for (i in 0..<alarms.length()) {
            val alarm = alarms.optJSONObject(i) ?: continue
            results.put(scheduleOne(context, alarm))
        }

        if (session == null) {
            return
        }

        val reply = JSONObject()
        try {
            reply.put("type", "nbl:set-alarms-result")
            reply.put("requestId", requestId)
            reply.put("results", results)
        } catch (e: JSONException) {
            Log.e(TAG, "Failed building set-alarms-result payload", e)
            return
        }
        session.postMessage(reply.toString(), null)
    }

    private fun scheduleOne(context: Context?, alarm: JSONObject): JSONObject {
        val mode = alarm.optString("mode", "clock")
        val id = alarm.optInt("id", System.currentTimeMillis().toInt())
        var scheduleResult: AlarmScheduleResult
        var error: String? = null
        try {
            if (context == null) {
                return JSONObject()
            }
            scheduleResult = if ("exact" == mode)
                ExactAlarmScheduler.schedule(context, id, alarm)
            else
                ClockAlarmScheduler.schedule(context, id, alarm)
        } catch (e: Exception) {
            Log.e(TAG, "Failed scheduling alarm id=$id", e)
            scheduleResult = AlarmScheduleResult.failure(null)
            error = e.message
        }

        val result = JSONObject()
        try {
            result.put("id", id)
            result.put("mode", mode)
            result.put("ok", scheduleResult.ok)
            if (scheduleResult.reason != null) {
                result.put("reason", scheduleResult.reason)
            }
            if (error != null) {
                result.put("error", error)
            }
        } catch (e: JSONException) {
            Log.e(TAG, "Failed building result entry", e)
        }
        return result
    }
}