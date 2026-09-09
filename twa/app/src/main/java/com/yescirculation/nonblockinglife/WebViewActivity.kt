package com.yescirculation.nonblockinglife

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateLayoutParams
import com.yescirculation.nonblockinglife.bridge.AndroidBridge
import com.yescirculation.nonblockinglife.notification.createNotificationChannel
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.graphics.toColorInt

class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: AndroidBridge
    private var isWebLoaded = false

    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        // 必須在 super.onCreate() 之前安裝 SplashScreen!
        val splashScreen = installSplashScreen()

        // 啟用 Edge-to-Edge 並設定導覽列為半透明色 (例如 50% 透明的白色)
        // 這能讓 WebView 延伸到導覽列下方，同時確保導覽按鈕清晰可見
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(
                Color.TRANSPARENT,
                Color.TRANSPARENT
            ),
//            navigationBarStyle = SystemBarStyle.light(
//                Color.parseColor("#80FFFFFF"), // 淺色主題下的半透明背景
//                Color.parseColor("#80000000")  // 深色主題下的半透明背景
//            )
        )

        super.onCreate(savedInstanceState)
        // 保持 splashScreen 顯示，直到 WebView 網頁渲染完畢才退場
        splashScreen.setKeepOnScreenCondition {
            !isWebLoaded // 當 isWebLoaded 為 false 時，SplashScreen 會顯示
        }

        createNotificationChannel(this)

        // 1. 建立根容器以支援自定義導覽列遮罩
        val rootLayout = FrameLayout(this)
        webView = WebView(this)
        webView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        rootLayout.addView(webView)

        // 2. 建立自定義導覽列半透明遮罩 (Scrim)
        val navBarScrim = View(this).apply {
            // 根據主題設定半透明底色 (這裡預設淺色半透明，可視需求調整)
            setBackgroundColor("#93FFFFFF".toColorInt())
            isClickable = false
            isFocusable = false
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        rootLayout.addView(navBarScrim)

        setContentView(rootLayout)

        // 3. 監聽導覽列位置，自動追蹤底部或側邊
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { _, insets ->
            val navInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            navBarScrim.updateLayoutParams<FrameLayout.LayoutParams> {
                when {
                    navInsets.bottom > 0 -> {
                        gravity = Gravity.BOTTOM
                        width = FrameLayout.LayoutParams.MATCH_PARENT
                        height = navInsets.bottom
                    }
                    navInsets.right > 0 -> {
                        gravity = Gravity.END
                        width = navInsets.right
                        height = FrameLayout.LayoutParams.MATCH_PARENT
                    }
                    navInsets.left > 0 -> {
                        gravity = Gravity.START
                        width = navInsets.left
                        height = FrameLayout.LayoutParams.MATCH_PARENT
                    }
                    else -> {
                        width = 0
                        height = 0
                    }
                }
            }
            insets
        }

        // 開啟 WebView 遠端偵錯功能，Release 要拿掉
        if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT //善用 HTTP/ServiceWorker 快取
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

        val context = this
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
                // 當網頁載入完成，就將旗標設為true，Splash Screen 就會優雅地淡出關閉！
                isWebLoaded = true
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
                } else if (!url.startsWith(context.getString(R.string.launchUrl))) {
                    try {
                        // 建立一個標準的Intent，讓 Android 系統交給預設的 App 開啟(例如 YouTube or Chrome)
                        val intent = Intent(Intent.ACTION_VIEW, url.toUri())
                        view?.context?.startActivity(intent)
                    } catch (e: Exception){
                        e.printStackTrace()
                    }
                    return true
                }

                // 其他一般的 http/https 網址交給 WebView 正常載入
                return super.shouldOverrideUrlLoading(view, request)
            }
        }

        webView.loadUrl(this.getString(R.string.launchUrl)) // 換成您的網址

        // 處理 Back 鍵
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val backCallback = OnBackInvokedCallback {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                (OnBackInvokedDispatcher.PRIORITY_DEFAULT),
                backCallback
            )
        }

        // 處理啟動時的 Intent
        handleIntent(intent, webView)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent?.let { handleIntent(intent, webView) }
    }
    private fun handleIntent(intent: Intent?, webView: WebView): Uri? {
        // 1. 處理分享 (Web Share Target 手動實現)
        if (intent != null && Intent.ACTION_SEND == intent.action && intent.type != null) {
            if ("text/plain" == intent.type) {
                var text = intent.getStringExtra(Intent.EXTRA_TEXT)
                var title = intent.getStringExtra(Intent.EXTRA_SUBJECT)

                // 當text不是以http開頭的話，需要調整 text 與 title，text原則上由選取的文字再加上http....，而title則是說明來自哪
                // 所以，title -> text的上半部 + 原title ，而 text -> 原text 下半部，也就是 url 的部分
                if (text != null && !text.startsWith("http")) {
                    val indexUrl = text.indexOf("http")
                    val url = text.substring(indexUrl)
                    val titleUpper = text.substring(0, indexUrl - 1)
                    title = titleUpper + (if (title != null && title.length > 10) "" else title)
                    text = url
                }

                // 手動構建目標 URL，確保路徑正確
                // 使用根路徑 + query 參數，避免 GitHub Pages 的子路徑 404
                val builder =
                    "https://ychsue.github.io/NonBlockingLife/?action=share-to-inbox".toUri()
                        .buildUpon()

                if (text != null) {
                    //builder.appendQueryParameter("text", text);
                    // 很多 Android App 會把 URL 放在 text 裡面傳過來
                    builder.appendQueryParameter("url", text)
                }
                if (title != null) {
                    builder.appendQueryParameter("title", title)
                }

                val url = builder.build()
                webView.loadUrl(url.toString())
                return url
            }
        }

        // 2. 處理一般的 Deep Link (例如點擊連結開啟 App)
        if (intent != null && intent.data != null) {
            webView.loadUrl(intent.data.toString())
            return intent.data
        }

        // 3. 預設行為
        return this.getString(R.string.launchUrl).toUri()
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