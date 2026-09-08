package com.yescirculation.nonblockinglife;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class AddInboxWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Intent intent = new Intent(context, WebViewActivity.class);
            intent.setData(Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=add&sheet=inbox"));
            intent.setAction(Intent.ACTION_VIEW);
            
            // 確保從 Widget 點擊啟動 Activity 時，能夠在新的任務中啟動，並清除頂部的 Activity
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            // requestCode 應該盡量不統一，避免不同 Widget 點擊時互相覆蓋
            PendingIntent pendingIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_add_inbox);
            views.setTextViewText(R.id.widget_text, "Add Inbox");
            views.setOnClickPendingIntent(R.id.widget_add_root, pendingIntent);
            
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
