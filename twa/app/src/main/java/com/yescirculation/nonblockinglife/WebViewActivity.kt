package com.yescirculation.nonblockinglife

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.media.metrics.Event
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.yescirculation.nonblockinglife.bridge.AndroidBridge
import com.yescirculation.nonblockinglife.notification.createNotificationChannel
import androidx.core.net.toUri
import androidx.core.view.WindowCompat

class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: AndroidBridge

    init {
//        createNotificationChannel(this)
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        //強制讓系統狀態列圖示永遠保持"深色"
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.isAppearanceLightStatusBars = true

        webView = WebView(this)
        setContentView(webView)

        // 開啟 WebView 遠端偵錯功能，Release 要拿掉
        if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }

        bridge = AndroidBridge(this, webView)

        // 在 JS 端可以使用 Android.postMessage("hello") 呼叫
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // 【新增】: 讓 JS 的 alert(), confirm() 可以運作
        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            // 您可以在這裡加入 page finish 的處理，確保每次載入完都重新注入或檢查
//            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
//                super.onReceivedError(view, request, error)
//                // 在 Logcat (底部面板) 搜尋 "WebViewError" 就可以看到具體原因
//                android.util.Log.e("WebViewError", "Error: ${error?.description}, Code: ${error?.errorCode}")
//            }
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                bridge.injectAndroidPortMock()
            }
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // 攔截自訂 Scheme
                if (url.startsWith("nonblockinglife://")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, url.toUri())
                        // 確保在 WebViewActivity context 外啟動時正常運作
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                        // 呼叫系統或對應 Activity 開啟
                        view?.context?.startActivity(intent)
                        return true // 回傳 true 代表 Native 已接管處理，WebView 不要嘗試載入該網址
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // 其他一般的 http/https 網址交給 WebView 正常載入
                return super.shouldOverrideUrlLoading(view, request)
            }
        }

        webView.loadUrl(this.getString(R.string.launchUrl)) // 換成您的網址
    }
}

//class WebAppInterface(private val activity: AppCompatActivity, private val webView: WebView) {
//    @JavascriptInterface
//    fun postMessage(message: String): String {
//        // 這裡處理從網頁傳過來的訊息
//        println("收到網頁訊息: $message")
//        return "I am a return value"
//    }
//    @JavascriptInterface
//    fun onmessage(message: String, event: Event) {
//        //模擬 postmessage 回傳的 onmessage
//    }
//
//    @JavascriptInterface
//    fun showlog(message: String) {
//        activity.runOnUiThread {
//            webView.evaluateJavascript("console.log('$message');", null)
//        }
//    }
//}