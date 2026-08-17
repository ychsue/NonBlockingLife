package com.yescirculation.nonblockinglife;

import android.content.ComponentName;
import android.content.Context;
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

public class TwaPostMessageBridge {
    private static final String TAG = "NBL/TwaBridge";
    private static final Uri TARGET_ORIGIN = Uri.parse("https://ychsue.github.io");

    private final Context context;
    private CustomTabsSession session;
    private boolean validated;
    private boolean channelRequested;

    private TwaPostMessageBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    public static void bindFrom(Context context) {
        TwaPostMessageBridge bridge = new TwaPostMessageBridge(context);
        bridge.bind();
    }

    private void bind() {
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

                        Log.d(TAG, "CustomTabsService connected.");
                        client.warmup(0L);
                        session = mClient.newSession(customTabsCallback);
                        if (session == null) {
                            Log.w(TAG, "CustomTabsSession is null; postMessage cannot start.");
                            return;
                        }

                        Log.i(TAG, "CustomTabsSession created. Requesting relationship validation.");
                        // 主動要求驗證網域關係
                        session.validateRelationship(
                                CustomTabsService.RELATION_USE_AS_ORIGIN,
                                TARGET_ORIGIN,
                                null
                        );
                    }

                    @Override
                    public void onServiceDisconnected(ComponentName name) {
                        Log.w(TAG, "TWA CustomTabs service disconnected.");
                        session = null;
                    }
                }
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
            Log.i(TAG, "Relationship validation: " + requestedOrigin + " => " + result + " (relation=" + relation + ")");
            
            if (result && relation == CustomTabsService.RELATION_USE_AS_ORIGIN && session != null) {
                if (!channelRequested) {
                    Log.d(TAG, "USE_AS_ORIGIN validated. Requesting postMessage channel.");
                    channelRequested = session.requestPostMessageChannel(
                            TARGET_ORIGIN,
                            TARGET_ORIGIN,
                            new Bundle()
                    );
                    Log.i(TAG, "requestPostMessageChannel => " + channelRequested);
                } else {
                    Log.d(TAG, "Channel already requested previously.");
                }
            }
        }

        @Override
        public void onNavigationEvent(int navigationEvent, @Nullable Bundle extras) {
            Log.d(TAG, "onNavigationEvent: " + navigationEvent);
            if (navigationEvent != NAVIGATION_FINISHED) {
                return;
            }

            if (session == null) {
                Log.w(TAG, "Session is null when navigation event occurred.");
                return;
            }

            // If validation was already successful but channel wasn't requested, try one more time
            if (validated && !channelRequested) {
                Log.d(TAG, "Navigation finished. Requesting channel (validated=" + validated + ")");
                channelRequested = session.requestPostMessageChannel(
                        TARGET_ORIGIN,
                        TARGET_ORIGIN,
                        new Bundle()
                );
                Log.i(TAG, "requestPostMessageChannel (fallback) => " + channelRequested);
            }
        }

        @Override
        public void onMessageChannelReady(@Nullable Bundle extras) {
            Log.i(TAG, "Message channel ready. Sending Android-ready message.");
            if (session != null) {
                int result = session.postMessage(buildAndroidReadyMessage(), null);
                Log.i(TAG, "postMessage(android-ready) result = " + result);
            }
        }

        @Override
        public void onPostMessage(@NonNull String message, @Nullable Bundle extras) {
            Log.i(TAG, "Received message from PWA: " + message);
            if (session != null) {
                String response = buildReplyMessage(message);
                int result = session.postMessage(response, null);
                Log.i(TAG, "Reply result = " + result + ", payload = " + response);
            }
        }
    };

    private String buildAndroidReadyMessage() {
        return "{\"type\":\"nbl:android-ready\",\"source\":\"twa\",\"status\":\"ready\",\"sentAt\":" + System.currentTimeMillis() + "}";
    }

    private String buildReplyMessage(String receivedMessage) {
        return "{\"type\":\"nbl:android-reply\",\"source\":\"twa\",\"status\":\"ok\",\"received\":"
                + (receivedMessage == null ? "\"\"" : "\"" + receivedMessage.replace("\"", "\\\"") + "\"") + ",\"sentAt\":" + System.currentTimeMillis() + "}";
    }
}
