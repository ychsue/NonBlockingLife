/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.yescirculation.nonblockinglife;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    

    

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // 瞬間重新啟動自己，並移除動畫，避免「縮回桌面」的視覺感
        finish();
        overridePendingTransition(0, 0);
        startActivity(intent);
        overridePendingTransition(0, 0);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        Intent intent = getIntent();

        // 1. 處理分享 (Web Share Target 手動實現)
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            if ("text/plain".equals(intent.getType())) {
                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);

                // 當text不是以http開頭的話，需要調整 text 與 title，text原則上由選取的文字再加上http....，而title則是說明來自哪
                // 所以，title -> text的上半部 + 原title ，而 text -> 原text 下半部，也就是 url 的部分
                if (text != null && !text.startsWith("http")) {
                    var index_url = text.indexOf("http");
                    var url = text.substring(index_url);
                    var title_upper = text.substring(0, index_url-1);
                    title = title_upper + ((title!=null && title.length()<10)?"":title);
                    text = url;
                }

                // 手動構建目標 URL，確保路徑正確
                // 注意：這裡的路徑要跟你的 PWA 路由一致
                Uri.Builder builder = Uri.parse("https://ychsue.github.io/NonBlockingLife/share-to-inbox").buildUpon();

                if (text != null) {
                    builder.appendQueryParameter("text", text);
                    // 很多 Android App 會把 URL 放在 text 裡面傳過來
                    builder.appendQueryParameter("url", text);
                }
                if (title != null) {
                    builder.appendQueryParameter("title", title);
                }

                return builder.build();
            }
        }

        // 2. 處理一般的 Deep Link (例如點擊連結開啟 App)
        if (intent != null && intent.getData() != null) {
            return intent.getData();
        }

        // 3. 預設行為
        return super.getLaunchingUrl();
    }
}
