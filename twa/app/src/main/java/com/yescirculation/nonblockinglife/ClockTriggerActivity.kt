package com.yescirculation.nonblockinglife

import ClockActions.parseDurationSeconds
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.yescirculation.nonblockinglife.utils.toSafeAbsoluteUri
import java.lang.Boolean.parseBoolean

class ClockTriggerActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val intent = getIntent()
        val uri = intent.data

        if (uri != null) {
            val host = uri.host
            if ("show-clock" == host) {
                launchShowTimers(uri)
            } else if ("set-timer" == host) {
                launchSetTimer(uri)
            }
        }

        finish()
    }

    private fun launchShowTimers(uri: Uri) {
        ClockActions.showTimers(this, uri.getQueryParameter("url"), onOpenUrl = { openUrl(it) })
    }

    private fun launchSetTimer(uri: Uri) {
        
        ClockActions.setTimer(
            context = this,
            durationSeconds = parseDurationSeconds(uri.getQueryParameter("duration")),
            skipUi = parseBoolean(uri.getQueryParameter("skipUi")),
            title = uri.getQueryParameter("title"),
            url = uri.getQueryParameter("url"),
            onOpenUrl = { openUrl(it) }
        )

    }

    private fun openUrl(url: String?) {
        if (url == null || url.trim { it <= ' ' }.isEmpty()) {
            return
        }

        val protocolName = getString(R.string.protocolName)
        val launchUrl = getString(R.string.launchUrl)
        val uri = url.toSafeAbsoluteUri(launchUrl, protocolName) ?: return
        // 打開 WebViewActivity 來處理該 URL
        val webViewIntent = Intent(this, WebViewActivity::class.java)
        webViewIntent.setData(uri)
        startActivity(webViewIntent)
    }

}
