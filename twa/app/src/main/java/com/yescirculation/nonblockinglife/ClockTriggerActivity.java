package com.yescirculation.nonblockinglife;

import android.app.Activity;
import android.provider.AlarmClock;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.widget.ActionBarContextView;

public class ClockTriggerActivity extends Activity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Intent clockIntent = new Intent(AlarmClock.ACTION_SHOW_ALARMS);
            clockIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (clockIntent.resolveActivity(getPackageManager())!=null){
                startActivity(clockIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        finish();
    }
}
