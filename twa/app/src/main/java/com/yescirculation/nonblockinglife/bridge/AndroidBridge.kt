package com.yescirculation.nonblockinglife.bridge

import com.yescirculation.nonblockinglife.R
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.yescirculation.nonblockinglife.alarm.AlarmMessageHandler
import com.yescirculation.nonblockinglife.alarm.AlarmSetupMessageHandler
import com.yescirculation.nonblockinglife.notification.NOTIFY_MESSAGE_TYPE
import com.yescirculation.nonblockinglife.notification.QUERY_NOTIFICATION_PERMISSION_TYPE
import com.yescirculation.nonblockinglife.notification.replyNotificationPermissionStatus
import com.yescirculation.nonblockinglife.notification.showNativeNotification
import org.json.JSONException
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AndroidBridge (
    private val context: Context,
    private val webView: WebView
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var mSession: MockSession = MockSession(this)
    private var executorService: ExecutorService = Executors.newSingleThreadExecutor()

    companion object {
        private const val TAG = "AndroidBridge"
    }

    /**
     * PWA 透過 window.AndroidBridge.postMessage(jsonString) 呼叫 Kotlin
     */
    @JavascriptInterface
    fun postMessage(message: String) {
        Log.d(TAG, "postMessage from PWA: $message")

        //解析PWA訊息並且處理
        //有可能要更新UI，需要切換回主執行緒
        mainHandler.post {
            handleClientMessage(message)
        }
    }

    /**
     * 主動發送訊息給 PWA (需要模擬 mSession.postMessage)
     */
    fun sendToPwa(message: String) {
        mainHandler.post {
            //透過 window.AndroidPort.onmessage 來 mimic 原本 TWA 通道
            val quotedMessage = JSONObject.quote(message) // Escape the message for safe injection into JavaScript
            val js = """
                if (window.AndroidPort && window.AndroidPort.onmessage) {
                    window.AndroidPort.onmessage({data:$quotedMessage});
                } else {
                    console.log('AndroidPort not found');
                }
            """.trimIndent()

            webView.evaluateJavascript(js, null)
        }
    }

    /**
     * 前端如果不改，那麼，就需要在Native端載入時，直接 Inject 假的 window.AndroidPort
     */
    fun injectAndroidPortMock() {
        val mockJs = """
            (function(){
                // 1. 插入 window.AndroidPort
                if (!window.AndroidPort) {
                    window.AndroidPort = {
                        onmessage: null,
                        postMessage: (msg) => window.AndroidBridge.postMessage(msg)
                    }
                    console.log('[Native Inject] window.AndroidPort initialized.');
                }
                // 2. 送出 message 好 mimic 原本 TWA messageChannel 的走法
                //  window.dispatchEvent(new MessageEvent('message', {data:{ports: [window.AndroidPort]}}));
                window.__NBL_TWA_BRIDGE__.setPort(window.AndroidPort);
                console.log('[Native Inject] window.AndroidPort injected as a port.');
            })();
        """.trimIndent()

        webView.evaluateJavascript(mockJs, null)
    }

    fun handleClientMessage(jsonMessage: String) {
        try {
            val json = JSONObject(jsonMessage)
            val type = json.optString("type")
            val requestId = json.optString("requestId", "")
            if (NOTIFY_MESSAGE_TYPE == type) {
                showNativeNotification(
                    mSession,
                    context,
                    json.optString("title", context.getString(R.string.appName)),
                    json.optString("body", ""),
                    json.optInt("id", System.currentTimeMillis().toInt()),
                    if (json.has("url")) json.optString("url") else null,
                    json.optBoolean("dismissOnClick", true), requestId
                )
            } else if (QUERY_NOTIFICATION_PERMISSION_TYPE == type) {
                replyNotificationPermissionStatus(requestId, context, mSession)
            } else if (AlarmMessageHandler.SET_ALARMS_MESSAGE_TYPE == type) {
                AlarmMessageHandler.handle(context, json, mSession)
            } else if (AlarmSetupMessageHandler.QUERY_ALARM_SETUP_TYPE == type) {
                AlarmSetupMessageHandler.queryAlarmSetup(context, mSession, requestId)
            } else if (AlarmSetupMessageHandler.QUERY_CLOCK_APPS_TYPE == type) {
                AlarmSetupMessageHandler.queryClockApps(context, mSession, requestId)
            } else if (AlarmSetupMessageHandler.SELECT_CLOCK_APP_TYPE == type) {
                AlarmSetupMessageHandler.selectClockApp(context, json, mSession)
            } else if (AlarmSetupMessageHandler.REQUEST_EXACT_ALARM_PERMISSION_TYPE == type) {
                AlarmSetupMessageHandler.requestExactAlarmPermission(context)
            } else if ("nbl:ping" == type) {
                mSession.postMessage(
                    "{\"type\":\"nbl:pong\",\"requestId\":\"$requestId\"}",
                    null
                )
            } else if ("nbl:fetch-ics" == type) {
                val targetUrl = json.optString("url", "")
                Log.d(TAG, "Fetching ICS from URL: $targetUrl")
                executorService.execute({
                    fetchAndReplyIcs(requestId, targetUrl)
                })
            } else {
                Log.w(TAG, "Unknown message type: $type")
            }
        } catch (e: JSONException) {
            // Not a JSON message we understand; ignore.
        }
    }

    private fun fetchAndReplyIcs(requestId: String?, targetUrl: String) {
        // Implement the logic to fetch the ICS file from the target URL and reply to the session.
        // This is a placeholder implementation.
        var connection: HttpURLConnection? = null
        try {
            val url = URL(targetUrl)
            connection = url.openConnection() as HttpURLConnection?
            connection!!.setRequestMethod("GET")
            connection.setConnectTimeout(10000)
            connection.setReadTimeout(10000)
            val responseCode = connection.getResponseCode()
            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "Failed to fetch ICS: HTTP response code $responseCode")
                return
            }
            // 讀取 ICS 內容
            val inputStream = connection.getInputStream()
            val reader = BufferedReader(InputStreamReader(inputStream))
            val icsBuilder = StringBuilder()
            var line: String?
            while ((reader.readLine().also { line = it }) != null) {
                icsBuilder.append(line).append("\n")
            }
            reader.close()
            val icsContent = icsBuilder.toString()

            // 準備回傳 ICS 內容
            // 這裡可以添加額外的處理邏輯，例如日曆事件解析等。
            val response = JSONObject()
            response.put("type", "nbl:fetch-ics-response")
            response.put("requestId", requestId)
            response.put("icsContent", icsContent)
            mSession.postMessage(response.toString(), null)
        } catch (e: JSONException) {
            Log.e(TAG, "Failed to create fetch-ics response", e)
        } catch (e: IOException) {
            Log.e(TAG, "Failed to fetch ICS content", e)
        } finally {
            connection?.disconnect()
        }
    }
}