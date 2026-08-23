package com.yescirculation.nonblockinglife;

import android.content.Context;
import android.content.SharedPreferences;

/** Persists which clock app package the user picked to handle ACTION_SET_ALARM. */
final class ClockAppPreference {
    private static final String PREFS_NAME = "nbl_clock_app_prefs";
    private static final String KEY_SELECTED_PACKAGE = "selected_clock_package";

    private ClockAppPreference() {
    }

    static String getSelectedPackage(Context context) {
        return prefs(context).getString(KEY_SELECTED_PACKAGE, null);
    }

    static void setSelectedPackage(Context context, String packageName) {
        prefs(context).edit().putString(KEY_SELECTED_PACKAGE, packageName).apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
