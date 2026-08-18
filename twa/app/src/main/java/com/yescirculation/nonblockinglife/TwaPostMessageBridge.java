package com.yescirculation.nonblockinglife;

import android.annotation.SuppressLint;
import android.os.Handler;
import android.os.Looper;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import androidx.core.content.ContextCompat;

public class TwaPostMessageBridge {
    private static TwaPostMessageBridge instance;

    private static final String TAG = "NBL/TwaBridge";
    private static final Uri TARGET_ORIGIN = Uri.parse("https://ychsue.github.io");
    private static final Uri URL = Uri.parse("https://ychsue.github.io/NonBlockingLife/");

    private final Activity context;
    private CustomTabsClient mClient;
    private CustomTabsSession mSession;
    private boolean validated = false;
    private boolean channelRequested = false;

    // Debugging only \\
    private final Handler pingHandler = new Handler(Looper.getMainLooper());
    private final Runnable pingRunnable = new Runnable() {
        @Override
        public void run() {
            if (mSession != null) {
                String msg = "{\"type\":\"nbl:ping\",\"source\":\"android\",\"ts\":" + System.currentTimeMillis() + "}";
                int result = mSession.postMessage(msg, null);
                Log.d(TAG, "ping result = " + result + " / " + msg);
            }
            pingHandler.postDelayed(this, 2000);
        }
    };
    //\\ Debugging only //

    TwaPostMessageBridge(Activity activity) {
        this.context = activity;
    }

    public static void bindFrom(Activity activity) {
        instance = new TwaPostMessageBridge(activity);
        instance.bind();
    }

    public static TwaPostMessageBridge getInstance() {
        return instance;
    }

    public void requestChannelAgain() {
        if (mSession != null) {
            Log.d(TAG, "Requesting postMessage channel again.");
            channelRequested = mSession.requestPostMessageChannel(
                    TARGET_ORIGIN,
                    TARGET_ORIGIN,
                    new Bundle()
            );
            Log.d(TAG, "requestPostMessageChannel (manual) => " + channelRequested);
        } else {
            Log.w(TAG, "Cannot request postMessage channel; session is null.");
        }
    }

    void bind() {
        String packageName = CustomTabsClient.getPackageName(context, null);
        if (packageName == null) {
            Log.w(TAG, "No Chrome/CustomTabs package available for postMessage testing.");
            return;
        }

        Log.d(TAG, "Binding to CustomTabsService in package: " + packageName);
        CustomTabsClient.bindCustomTabsService(
                context,
                packageName,
                new CustomTabsServiceConnection() {
                    @Override
                    public void onCustomTabsServiceConnected(
                            @NonNull ComponentName name,
                            @NonNull CustomTabsClient client
                    ) {
                        mClient = client;
                        client.warmup(0L);
                        mSession = mClient.newSession(customTabsCallback);
                        if (mSession == null) {
                            Log.w(TAG, "CustomTabsSession is null; postMessage cannot start.");
                            return;
                        }

                        Log.d(TAG, "CustomTabsSession created.");
                        launchTrustedWebActivity();
                        registerBroadcastReceiver();
                    }

                    @Override
                    public void onServiceDisconnected(ComponentName name) {
                        Log.w(TAG, "TWA CustomTabs service disconnected.");
                        mClient = null;
                    }
                }
        );
    }

    private void launchTrustedWebActivity() {
        TrustedWebActivityIntentBuilder builder = new TrustedWebActivityIntentBuilder(URL);
        Intent intent = builder.build(mSession).getIntent();
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    @SuppressLint("WrongConstant")
    private void registerBroadcastReceiver() {
        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(PostMessageBroadcastReceiver.POST_MESSAGE_ACTION);
        ContextCompat.registerReceiver(
                context,
                new PostMessageBroadcastReceiver(mSession),
                intentFilter,
                ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    private final CustomTabsCallback customTabsCallback = new CustomTabsCallback() {
        @Override
        public void onRelationshipValidationResult(
                int relation,
                @NonNull Uri requestedOrigin,
                boolean result,
                @Nullable Bundle extras
        ) {
            validated = result;
            Log.d(TAG, "Relationship validation: " + requestedOrigin + " => " + result + " (relation=" + relation + ")");

        if (result && relation == CustomTabsService.RELATION_USE_AS_ORIGIN && mSession != null) {
                Log.d(TAG, "USE_AS_ORIGIN validated. Requesting postMessage channel.");
                Log.d(TAG, "requestPostMessageChannel => " + channelRequested);
            }
        }

        @Override
        public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
            Log.d(TAG, "[" + System.identityHashCode(this) + "] onNavigationEvent: " + navigationEvent);
            if (navigationEvent != NAVIGATION_FINISHED) {
                return;
            }

            if (mSession == null) {
                Log.w(TAG, "Session is null when navigation finished.");
                return;
            }

            if (!validated) {
                Log.w(TAG, "Validation did not succeed before requesting postMessage channel.");
            }

            //睡 0.1 秒，避免在某些情況下，TWA 還沒完全啟動就去 requestPostMessageChannel，導致失敗
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Log.w(TAG, "Sleep interrupted: " + e.getMessage());
            }

            Log.d(TAG, "Navigation finished. Requesting channel.");
            channelRequested = mSession.requestPostMessageChannel(
                    TARGET_ORIGIN,
                    TARGET_ORIGIN,
                    new Bundle()
            );
            Log.d(TAG, "requestPostMessageChannel (fallback) => " + channelRequested);
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            Log.d(TAG, "Message channel ready.");
//            pingHandler.postDelayed(pingRunnable, 5000); //Debugging only: start pinging every 2 seconds
            if (mSession != null) {
                int result = mSession.postMessage(buildAndroidReadyMessage(), null);
                Log.d(TAG, "postMessage(android-ready) result = " + result);
            }
        }

        @Override
        public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
            super.onPostMessage(message, extras);
            Log.d(TAG, "Received from PWA: " + message);

            if (mSession != null) {
                String response = buildReplyMessage(message);
                int result = mSession.postMessage(response, null);
                Log.d(TAG, "PostMessage reply result = " + result + ", payload = " + response);
            }
        }
    };

    private String buildAndroidReadyMessage() {
        return "{\"type\":\"nbl:android-ready\",\"source\":\"twa\",\"status\":\"ready\",\"sentAt\":" + System.currentTimeMillis() + "}";
    }

    private String buildReplyMessage(String receivedMessage) {
        String safeReceived = receivedMessage == null ? "" : receivedMessage.replace("\"", "\\\"");
        return "{\"type\":\"nbl:android-reply\",\"source\":\"twa\",\"status\":\"ok\",\"received\":\"" + safeReceived + "\",\"sentAt\":" + System.currentTimeMillis() + "}";
    }
}
