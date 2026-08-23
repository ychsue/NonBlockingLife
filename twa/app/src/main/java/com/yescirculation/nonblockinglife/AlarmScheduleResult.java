package com.yescirculation.nonblockinglife;

/** Outcome of a single alarm scheduling attempt, with a machine-readable reason on failure. */
final class AlarmScheduleResult {
    static final String REASON_INVALID_TIME = "invalid_time";
    static final String REASON_PAST_TIME = "past_time";
    static final String REASON_NO_CLOCK_APP = "no_clock_app";
    static final String REASON_EXACT_ALARM_PERMISSION_REQUIRED = "permission_required";
    static final String REASON_ALARM_MANAGER_UNAVAILABLE = "alarm_manager_unavailable";

    final boolean ok;
    final String reason;

    private AlarmScheduleResult(boolean ok, String reason) {
        this.ok = ok;
        this.reason = reason;
    }

    static AlarmScheduleResult success() {
        return new AlarmScheduleResult(true, null);
    }

    static AlarmScheduleResult failure(String reason) {
        return new AlarmScheduleResult(false, reason);
    }
}
