package com.yescirculation.nonblockinglife;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

public class RequestPortActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent intent = getIntent();
        Uri uri = intent.getData();

        if (uri != null) {
            Log.d("RequestPortActivity", "Received internal scheme request for port: " + intent.getData().toString());
            if (TwaPostMessageBridge.getInstance() != null) {
                // 這裡可以呼叫 TwaPostMessageBridge 的方法來處理 Port 請求
                TwaPostMessageBridge.getInstance().requestChannelAgain();
            }
        }

        finish();
    }
}
