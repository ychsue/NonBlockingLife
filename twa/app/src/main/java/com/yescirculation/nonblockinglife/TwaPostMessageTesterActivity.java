package com.yescirculation.nonblockinglife;

import android.annotation.SuppressLint;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import androidx.core.content.ContextCompat;

public class TwaPostMessageTesterActivity extends AppCompatActivity {
    private CustomTabsClient mClient;
    private CustomTabsSession mSession;
    private final String TAG = "TwaPostMessageTester";

    // Use the same origin as your PWA host.
    private final Uri URL = Uri.parse("https://ychsue.github.io/NonBlockingLife/");
    private final Uri SOURCE_ORIGIN = Uri.parse("https://ychsue.github.io/");
    private final Uri TARGET_ORIGIN = Uri.parse("https://ychsue.github.io");
    private boolean mValidated = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 取得 Launching URL
        Uri launchingUri = getLaunchingUrl(getIntent());

        // This is the right place to bind the service for postMessage testing.
        bindCustomTabsService(launchingUri);

    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // 取得 Launching URL
        Uri launchingUri = getLaunchingUrl(getIntent());
        launch(launchingUri);
    }

    private Uri getLaunchingUrl(Intent intent) {
        // 1. 處理分享 (Web Share Target 手動實現)
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            if ("text/plain".equals(intent.getType())) {
                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);

                // 當text不是以http開頭的話，需要調整 text 與 title，text原則上由選取的文字再加上http....，而title則是說明來自哪
                // 所以，title -> text的上半部 + 原title ，而 text -> 原text 下半部，也就是 url 的部分
                if (text != null && !text.startsWith("http")) {
                    var index_url = text.indexOf("http");
                    var url = text.substring(index_url);
                    var title_upper = text.substring(0, index_url-1);
                    title = title_upper + ((title!=null && title.length()>10)?"":title);
                    text = url;
                }

                // 手動構建目標 URL，確保路徑正確
                // 使用根路徑 + query 參數，避免 GitHub Pages 的子路徑 404
                Uri.Builder builder = Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=share-to-inbox").buildUpon();

                if (text != null) {
//                    builder.appendQueryParameter("text", text);
                    // 很多 Android App 會把 URL 放在 text 裡面傳過來
                    builder.appendQueryParameter("url", text);
                }
                if (title != null) {
                    builder.appendQueryParameter("title", title);
                }

                return builder.build();
            }
        }

        // 2. 處理一般的 Deep Link (例如點擊連結開啟 App)
        if (intent != null && intent.getData() != null) {
            return intent.getData();
        }

        // 3. 預設行為
        return URL;
    }

    private final CustomTabsCallback customTabsCallback = new CustomTabsCallback() {
        @Override
        public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
            super.onPostMessage(message, extras);
            Log.d(TAG, "Got message: " + message);
            if (mSession != null) {
                String response = buildReplyMessage(message);
                int result = mSession.postMessage(response, null);
                Log.d(TAG, "PostMessage reply result = " + result + ", payload = " + response);
            }
        }

        @Override
        public void onRelationshipValidationResult(int relation, @NonNull Uri requestedOrigin,
                boolean result, @Nullable Bundle extras) {
            Log.d(TAG, "Relationship result: " + result + " for " + requestedOrigin);
            mValidated = result;
        }

        @Override
        public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
            if (navigationEvent != NAVIGATION_FINISHED) {
                return;
            }

            if (mSession == null) {
                Log.w(TAG, "Session is null; cannot request postMessage channel.");
                return;
            }

            if (!mValidated) {
                Log.w(TAG, "Validation didn't succeed before requesting channel.");
            }

            boolean result = mSession.requestPostMessageChannel(SOURCE_ORIGIN, TARGET_ORIGIN, new Bundle());
            Log.d(TAG, "Request channel result: " + result);
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            Log.d(TAG, "Message channel ready.");
            if (mSession != null) {
                int result = mSession.postMessage("{\"type\":\"android-ready\"}", null);
                Log.d(TAG, "postMessage result: " + result);
            }
        }
    };

    private void bindCustomTabsService(Uri launchingUri) {
        String packageName = CustomTabsClient.getPackageName(this, null);
        if (packageName == null) {
            Log.w(TAG, "No compatible browser package found. Cannot bind to CustomTabs service.");
            return;
        }

        Toast.makeText(this, "Binding to " + packageName, Toast.LENGTH_SHORT).show();
        CustomTabsClient.bindCustomTabsService(this, packageName,
                new CustomTabsServiceConnection() {
                    @Override
                    public void onCustomTabsServiceConnected(@NonNull ComponentName name,
                            @NonNull CustomTabsClient client) {
                        mClient = client;
                        client.warmup(0L);
                        mSession = mClient.newSession(customTabsCallback);
                        if (mSession != null) {
                            launch(launchingUri);
                            registerBroadcastReceiver();
                        }
                    }

                    @Override
                    public void onServiceDisconnected(ComponentName componentName) {
                        mClient = null;
                    }
                });
    }

    private void launch(Uri launchingUri) {
        new TrustedWebActivityIntentBuilder(launchingUri)
                .build(mSession)
                .launchTrustedWebActivity(TwaPostMessageTesterActivity.this);
    }

    @SuppressLint("WrongConstant")
    private void registerBroadcastReceiver() {
        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(PostMessageBroadcastReceiver.POST_MESSAGE_ACTION);
        ContextCompat.registerReceiver(this,
                new PostMessageBroadcastReceiver(mSession),
                intentFilter,
                ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private String buildReplyMessage(String receivedMessage) {
        String safeReceived = receivedMessage == null ? "" : receivedMessage.replace("\"", "\\\"");
        return "{\"type\":\"nbl:android-reply\",\"source\":\"twa\",\"status\":\"ok\",\"received\":\"" + safeReceived + "\",\"sentAt\":" + System.currentTimeMillis() + "}";
    }
}
