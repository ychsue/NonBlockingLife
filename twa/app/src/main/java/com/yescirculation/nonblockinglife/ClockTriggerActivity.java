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
            if("alarm".equals(host)) {
                String hourStr = uri.getQueryParameter("hour");
                String minuteStr = uri.getQueryParameter("minute");
                if(hourStr == null || minuteStr == null) return;

                int hour = Integer.parseInt(hourStr);
                int minute = Integer.parseInt(minuteStr);
                Intent clockIntent = new Intent(AlarmClock.ACTION_SET_ALARM)
                    .putExtra(AlarmClock.EXTRA_HOUR, hour)
                    .putExtra(AlarmClock.EXTRA_MINUTES, minute)
                    .putExtra(AlarmClock.EXTRA_SKIP_UI, true);

                try {
                    startActivity(clockIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Cannot Open Alarm Clock", Toast.LENGTH_SHORT).show();
                }
            }

            if ("show-clock".equals(host)){
                Intent clockIntent = new Intent(AlarmClock.ACTION_SHOW_TIMERS);
                startActivity(clockIntent);
            }
        }
        finish();
    }
}
