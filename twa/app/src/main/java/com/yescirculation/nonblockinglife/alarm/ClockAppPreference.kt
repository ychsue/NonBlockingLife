package com.yescirculation.nonblockinglife.alarm

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/** Persists which clock app package the user picked to handle ACTION_SET_ALARM.  */
internal object ClockAppPreference {
    private const val PREFS_NAME = "nbl_clock_app_prefs"
    private const val KEY_SELECTED_PACKAGE = "selected_clock_package"

    fun getSelectedPackage(context: Context): String? {
        return prefs(context)!!.getString(KEY_SELECTED_PACKAGE, null)
    }

    fun setSelectedPackage(context: Context, packageName: String?) {
        prefs(context)!!.edit { putString(KEY_SELECTED_PACKAGE, packageName) }
    }

    private fun prefs(context: Context): SharedPreferences? {
        return context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
}