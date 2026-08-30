package com.yescirculation.nonblockinglife;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
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
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

public class LauncherActivity extends AppCompatActivity {
    private static final String BROWSER_WAS_LAUNCHED_KEY = "twa_browser_was_launched";

    private CustomTabsClient mClient;
    private CustomTabsSession mSession;
    private final String TAG = "TwaPostMessageTester";

    // Use the same origin as your PWA host.
    private final Uri URL = Uri.parse("https://ychsue.github.io/NonBlockingLife/");
    private final Uri SOURCE_ORIGIN = Uri.parse("https://ychsue.github.io/");
    private final Uri TARGET_ORIGIN = Uri.parse("https://ychsue.github.io");
    private boolean mValidated = false;
    // Tracks whether the TWA has already been launched, so we can finish() this native
    // Activity instead of leaving activity_main.xml behind in the back stack.
    private boolean mBrowserWasLaunched = false;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 1001;
    // Holds the URL to launch once the first-run permission dialog has been answered, so
    // Chrome isn't started on top of (and covering) the still-pending system dialog.
    private Uri mPendingLaunchUri;

    private CustomTabsServiceConnection mConnection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (savedInstanceState != null && savedInstanceState.getBoolean(BROWSER_WAS_LAUNCHED_KEY)) {
            // We died in the background after launching the TWA; the user closed it and
            // ended up here. Just finish instead of showing activity_main.xml again.
            // finish();
            return;
        }

        setContentView(R.layout.activity_main);

        createNotificationChannel();

        // 取得 Launching URL
        Uri launchingUri = getLaunchingUrl(getIntent());

        if (requestNotificationPermissionIfNeeded()) {
            // Wait for onRequestPermissionsResult() before binding/launching the TWA, otherwise
            // Chrome comes to the front and covers the still-pending system permission dialog.
            mPendingLaunchUri = launchingUri;
            return;
        }

        // This is the right place to bind the service for postMessage testing.
        bindCustomTabsService(launchingUri);

    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE && mPendingLaunchUri != null) {
            Uri launchingUri = mPendingLaunchUri;
            mPendingLaunchUri = null;
            bindCustomTabsService(launchingUri);
        }
    }

    @Override
    protected void onRestart() {
        super.onRestart();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        // 當 Activity 結束時（例如使用者在首頁再按一次返回，或是從 Recents 清掉 App），
        // 顯式解綁 CustomTabsService，這會通知 Chrome 關閉對應的 Tab/Session。
        if (mClient != null) {
            try {
                unbindService(mConnection); // mConnection 為你的 CustomTabsServiceConnection 實體[cite: 1]
            } catch (Exception e) {
                Log.e(TAG, "Error unbinding service", e);
            }
        }
    }
    
    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(BROWSER_WAS_LAUNCHED_KEY, mBrowserWasLaunched);
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
            handleIncomingMessage(message);
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

            //睡個0.02秒好確定前端接到 postMessage channel的事件，否則前端可能還沒準備好就收到訊息
            try {
                Thread.sleep(20);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            
            boolean result = mSession.requestPostMessageChannel(SOURCE_ORIGIN, TARGET_ORIGIN, new Bundle());
            Log.d(TAG, "Request channel result: " + result);

            // The TWA is now showing its own content in its own task; drop this native
            // Activity from the back stack so back-navigation never falls through to it.
            mBrowserWasLaunched = true;
            // finish();
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            Log.d(TAG, "Message channel ready.");
            if (mSession != null) {
                int result = mSession.postMessage("{\"type\":\"android-ready\"}", null);
                Log.d(TAG, "postMessage result: " + result);
            }
            replyNotificationPermissionStatus(null);
        }
    };

    private void bindCustomTabsService(Uri launchingUri) {
        String packageName = CustomTabsClient.getPackageName(this, null);
        if (packageName == null) {
            Log.w(TAG, "No compatible browser package found. Cannot bind to CustomTabs service.");
            return;
        }

        // Toast.makeText(this, "Binding to " + packageName, Toast.LENGTH_SHORT).show();
        mConnection = new CustomTabsServiceConnection() {
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
        };
        CustomTabsClient.bindCustomTabsService(this, packageName, mConnection);
    }

    private void launch(Uri launchingUri) {
        // No NEW_TASK flag: finish() in onNavigationEvent already removes this Activity from
        // the back stack, which is enough to stop back-navigation from reaching activity_main.xml.
        // Adding NEW_TASK here caused a second Chrome task to spawn on repeated launches.
        new TrustedWebActivityIntentBuilder(launchingUri)
                .build(mSession)
                .launchTrustedWebActivity(LauncherActivity.this);
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

    private static final String NOTIFICATION_CHANNEL_ID = "nbl_pwa_notifications";
    // Convention agreed with the PWA: it posts {"type":"nbl:notify","title":..,"body":..,"id":..}
    // instead of calling the web Notification API, bypassing TWA notification delegation entirely.
    private static final String NOTIFY_MESSAGE_TYPE = "nbl:notify";
    private static final String QUERY_NOTIFICATION_PERMISSION_TYPE = "nbl:query-notification-permission";

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID,
                "NonBlockingLife", NotificationManager.IMPORTANCE_DEFAULT);
        NotificationManagerCompat.from(this).createNotificationChannel(channel);
    }

    /** Returns true if a permission dialog was shown and the caller should wait for its result. */
    private boolean requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return false;
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST_CODE);
            return true;
        }
        return false;
    }

    private void handleIncomingMessage(String message) {
        try {
            JSONObject json = new JSONObject(message);
            String type = json.optString("type");
            String requestId = json.optString("requestId", null);
            if (NOTIFY_MESSAGE_TYPE.equals(type)) {
                showNativeNotification(json.optString("title", getString(R.string.appName)),
                        json.optString("body", ""),
                        json.optInt("id", (int) System.currentTimeMillis()),
                        json.has("url") ? json.optString("url") : null,
                        json.optBoolean("dismissOnClick", true), requestId);
            } else if (QUERY_NOTIFICATION_PERMISSION_TYPE.equals(type)) {
                replyNotificationPermissionStatus(requestId);
            } else if (AlarmMessageHandler.SET_ALARMS_MESSAGE_TYPE.equals(type)) {
                AlarmMessageHandler.handle(this, json, mSession);
            } else if (AlarmSetupMessageHandler.QUERY_ALARM_SETUP_TYPE.equals(type)) {
                AlarmSetupMessageHandler.queryAlarmSetup(this, mSession, requestId);
            } else if (AlarmSetupMessageHandler.QUERY_CLOCK_APPS_TYPE.equals(type)) {
                AlarmSetupMessageHandler.queryClockApps(this, mSession, requestId);
            } else if (AlarmSetupMessageHandler.SELECT_CLOCK_APP_TYPE.equals(type)) {
                AlarmSetupMessageHandler.selectClockApp(this, json, mSession);
            } else if (AlarmSetupMessageHandler.REQUEST_EXACT_ALARM_PERMISSION_TYPE.equals(type)) {
                AlarmSetupMessageHandler.requestExactAlarmPermission(this);
            } else if ("nbl:ping".equals(type)) {
                if (mSession != null) {
                    mSession.postMessage("{\"type\":\"nbl:pong\",\"requestId\":\"" + requestId + "\"}", null);
                }
            } else {
                Log.w(TAG, "Unknown message type: " + type);
            }
        } catch (JSONException e) {
            // Not a JSON message we understand; ignore.
        }
    }

    private void replyNotificationPermissionStatus(String requestId) {
        if (mSession == null) {
            return;
        }
        boolean granted = ActivityCompat.checkSelfPermission(getApplicationContext(),
                Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        mSession.postMessage(
                "{\"type\":\"nbl:notification-permission-status\",\"granted\":" + granted + ",\"requestId\":\"" + requestId + "\"}", null);
    }

    private void showNativeNotification(String title, String body, int notificationId,
            @Nullable String url, boolean dismissOnClick, String requestId) {
        if (ActivityCompat.checkSelfPermission(getApplicationContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "POST_NOTIFICATIONS not granted; dropping native notification.");
            return;
        }
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(),
                NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(dismissOnClick)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        if (url != null && !url.isEmpty()) {
            Intent openIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url),
                    getApplicationContext(), LauncherActivity.class);
            openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(getApplicationContext(),
                    notificationId, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.setContentIntent(contentIntent);
        }

        NotificationManagerCompat.from(getApplicationContext()).notify(notificationId, builder.build());
        mSession.postMessage("{\"type\":\"nbl:notification-shown\",\"notificationId\":" + notificationId + ",\"requestId\":\"" + requestId + "\"}", null);
    }
}
