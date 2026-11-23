import android.app.Activity
import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import android.widget.Toast
import kotlin.math.max

object ClockActions {
    private const val DEFAULT_TIMER_SECONDS = 600

    fun showTimers(
        context: Context,
        url: String? = null,
        onOpenUrl: ((String) -> Unit)? = null
    ) {
        try {
            val clockIntent = Intent(AlarmClock.ACTION_SHOW_TIMERS).apply {
                if (context !is Activity) {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            
            context.startActivity(clockIntent)
            
            if (!url.isNullOrBlank()) {
                onOpenUrl?.invoke(url)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Failed to show timers", Toast.LENGTH_SHORT).show()
        }
    }
    
    fun setTimer(
        context: Context,
        durationSeconds: Int = DEFAULT_TIMER_SECONDS,
        skipUi: Boolean = true,
        title: String? = null,
        url: String? = null,
        onOpenUrl: ((String) -> Unit)? = null
    ) {
        val safeSeconds = durationSeconds.coerceAtLeast(0)
        try {
            val timerIntent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(AlarmClock.EXTRA_LENGTH, safeSeconds)
                if (skipUi) {
                    putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                }
                if (!title.isNullOrBlank()) {
                    putExtra(AlarmClock.EXTRA_MESSAGE, title)
                }
                if (context !is Activity) {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            if (timerIntent.resolveActivity(context.packageManager) != null) {
                context.startActivity(timerIntent)
            } else {
                Toast.makeText(context, "No app available to set timer", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Failed to set timer", Toast.LENGTH_SHORT).show()
        }

        if (!url.isNullOrBlank()) {
            onOpenUrl?.invoke(url)
        }
    }

    fun parseDurationSeconds(rawDuration: String?): Int {
        if (rawDuration == null || rawDuration.trim { it <= ' ' }.isEmpty()) {
            return DEFAULT_TIMER_SECONDS
        }

        try {
            val seconds = rawDuration.trim { it <= ' ' }.toInt()
            return max(0, seconds)
        } catch (e: NumberFormatException) {
            return DEFAULT_TIMER_SECONDS
        }
    }
}

