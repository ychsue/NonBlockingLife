package com.yescirculation.nonblockinglife.alarm

/** Outcome of a single alarm scheduling attempt, with a machine-readable reason on failure.  */
internal class AlarmScheduleResult private constructor(val ok: Boolean, val reason: String?) {
    companion object {
        const val REASON_INVALID_TIME: String = "invalid_time"
        const val REASON_PAST_TIME: String = "past_time"
        const val REASON_NO_CLOCK_APP: String = "no_clock_app"
        const val REASON_EXACT_ALARM_PERMISSION_REQUIRED: String = "permission_required"
        const val REASON_ALARM_MANAGER_UNAVAILABLE: String = "alarm_manager_unavailable"

        fun success(): AlarmScheduleResult {
            return AlarmScheduleResult(true, null)
        }

        fun failure(reason: String?): AlarmScheduleResult {
            return AlarmScheduleResult(false, reason)
        }
    }
}