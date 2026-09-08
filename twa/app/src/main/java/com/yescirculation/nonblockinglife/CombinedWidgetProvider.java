package com.yescirculation.nonblockinglife;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class CombinedWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_combined);

            // Add Inbox Intent
            Intent addIntent = new Intent(context, WebViewActivity.class);
            addIntent.setData(Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=add&sheet=inbox"));
            addIntent.setAction(Intent.ACTION_VIEW);
            
            // 確保從 Widget 點擊啟動 Activity 時，能夠在新的任務中啟動，並清除頂部的 Activity
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            // requestCode 應該盡量不統一，避免不同 Widget 點擊時互相覆蓋
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_add_inbox, addPendingIntent);

            // Query Intent
            Intent queryIntent = new Intent(context, WebViewActivity.class);
            queryIntent.setData(Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=query"));
            queryIntent.setAction(Intent.ACTION_VIEW);
            
            // 確保從 Widget 點擊啟動 Activity 時，能夠在新的任務中啟動，並清除頂部的 Activity
            queryIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            // requestCode 應該盡量不統一，避免不同 Widget 點擊時互相覆蓋
            PendingIntent queryPendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), queryIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_query, queryPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
