package com.yescirculation.nonblockinglife;

import android.app.Activity;
import android.provider.AlarmClock;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.Nullable;

public class ClockTriggerActivity extends Activity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        var uri = intent.getData();
        if (uri != null) {
            String host = uri.getHost();
            if ("show-clock".equals(host)){
                try {
                    Intent clockIntent = new Intent(AlarmClock.ACTION_SHOW_TIMERS);
                    startActivity(clockIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Cannot Open Clock", Toast.LENGTH_SHORT).show();
                }
            }
        }
        finish();
    }
}
