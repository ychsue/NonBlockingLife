package com.yescirculation.nonblockinglife;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.browser.customtabs.CustomTabsSession;

public class PostMessageBroadcastReceiver extends BroadcastReceiver {
    public static final String POST_MESSAGE_ACTION = "com.yescirculation.nonblockinglife.POST_MESSAGE_ACTION";

    private final CustomTabsSession customTabsSession;

    public PostMessageBroadcastReceiver(CustomTabsSession session) {
        this.customTabsSession = session;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (customTabsSession == null) {
            return;
        }

        customTabsSession.postMessage("Got it!", null);
    }
}
