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
            Intent addIntent = new Intent(context, LauncherActivity.class);
            addIntent.setData(Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=add&sheet=inbox"));
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 2, addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_add_inbox, addPendingIntent);

            // Query Intent
            Intent queryIntent = new Intent(context, LauncherActivity.class);
            queryIntent.setData(Uri.parse("https://ychsue.github.io/NonBlockingLife/?action=query"));
            queryIntent.setAction(Intent.ACTION_VIEW);
            queryIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent queryPendingIntent = PendingIntent.getActivity(context, 1, queryIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.btn_query, queryPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
