# 講解 SyncStatus.tsx 的作用

大家好
這個影片裡我想講解一下與其他裝置同步的部分

我會分介面展示、Google同步設定與日常使用三個部分來講解，  
首先是介面展示

畫面上看到的
左邊是PWA，然後，已經設定好Google同步了。右邊則是一般的網頁版，還沒有設定同步。
看您的視窗大小，若沒看到，請按一下右上角的三條線，就可以看到選項們了。

首先，這一塊由於不常用到，因此我並沒把他多國語化，請使用瀏覽器的翻譯來改成你需要的語言，這裡我切換成英文。
順帶一提，設定Google同步的部分，必須是在電腦上使用，因為手機的Google Sheets App沒有辦法使用App Script，設定好後，把該API網址複製給手機就可以使用了。

切換好了。

按一下`設置`或`Setting`鈕，就會跳到設定的教學頁面，請依步驟往下做。

第一步，請到Google Sheets 新增一個工作表

順便改一下他的名字，您容易記即可

存檔

回來看到第二步是要設定App Script

我們切換回Google Sheets，點選上方的`擴充功能`或`Extensions`，然後選擇`Apps Script`

點擊後，就會跳轉到GAS的編輯畫面

再回到原本的頁面，點選第三步的`複製 Apps Script 程式碼`，把裡面的程式碼複製起來

回到GAS的編輯畫面，把剛剛複製的程式碼覆蓋原本預設的程式碼，然後按下 Ctrl + S 儲存

順便改一下專案名稱，這樣以後就知道這個專案是做什麼的了

接著，回到原本的頁面，點選第四步的`部署為網路應用程式`，然後按照步驟進行部署

再回到GAS頁面，點選右上角的`部署`或`Deploy`，然後選擇`新建部署`或`New deployment`

在部署的設定頁面，選擇`網路應用程式`或`Web app`，然後填寫相關資訊，例如專案名稱、描述等

在`執行應用程式的使用者`或`Execute as`選項中，選擇`我自己`或`Me`

在`誰有權訪問`或`Who has access`選項中，選擇`任何人`或`Anyone`

最後，點擊`部署`或`Deploy`，

然後她會跳警告，說未經審核，請按 Advanced 或進階，然後再按 Go to xxx (unsafe) 或前往 xxx (不安全)，

然後複製部署完成後的API的URL

回到原本的頁面，按第四步的按鈕，

然後把剛剛複製的URL貼上去，按下確認，就完成了。

按下同步按鈕，就會看到同步的狀態了，這樣就完成了。

[iPhone]
剛剛的API網址，請複製到手機上，然後貼到這裡，按下設置，就完成了。

如果想要完全使用 Google Sheets 的資料覆蓋也可以，請按此鈕
這樣就會把 Google Sheets 的資料完全覆蓋到本地端，請注意，這個動作是不可逆的，請確定你要這麼做。

由於這動作太少用，所以，一旦覆蓋後，您要切換 tab ，畫面才會更新，這樣才會看到最新的資料。

最右邊的兩個鈕是用來匯出與匯入用的，我們先匯出

有兩種格式，我建議匯出 markdown，這樣，我們和 AI 就可以直接讀取，甚至可以貼給 Copilot 或 Gemini 請他們幫您把markdown變為整張Excel或Google Sheets表格。

看，使用VSCode 的 extension 就可以看到表格形式了。

匯入的話，請按最右邊這個鈕

確認

完成後，會告訴您匯入成功的彙報。

這樣就完成了，這裡的同步功能，主要是讓您在不同裝置之間可以同步資料，或者是備份資料用的，如果您有其他的需求，也歡迎提出來，我們可以一起研究。

謝謝觀賞

---

## YouTube 發布所需資訊

### 影片標題

**NonBlockingLife - 跨裝置同步設置教學 (Google Sheets + Google Apps Script)**

### 影片描述

在這部影片中，我將帶您完整講解如何在 NonBlockingLife 上設置 Google Sheets 同步功能，讓您在多個裝置間無縫同步資料。
此影片也教您如何藉由JSON或Markdown匯出與匯入資料。

**您會學到：**

- 如何建立 Google Sheets 連接
- Google Apps Script 部署設置步驟
- 如何在電腦和手機上完成同步配置
- 資料匯出與匯入的使用方法
- 資料覆蓋與備份的注意事項

**適用對象：**
想要在不同裝置間同步 NonBlockingLife 資料的使用者

**相關連結：**

- Web App網站+教學：[NonBlockingLife Web App](https://ychsue.github.io/NonBlockingLife/)
- GitHub Repository：[NonBlockingLife Repository](https://github.com/ychsue/NonBlockingLife)

**時間戳記：**

- 00:00 簡介與概覽
- 00:16 軟體介面展示
- 01:11 第一步：建立 Google Sheets
- 01:50 第二步：設定 Google Apps Script
- 03:09 第三步與第四步：部署 Web 應用程式
- 05:00 iPhone 同步設置
- 05:20 資料管理功能（覆蓋）
- 05:52 資料匯出與匯入
- 06:43 結語

### 標籤（Tags）

NonBlockingLife, Google Sheets, Google Apps Script, Markdown, 同步, 跨裝置, 教學, 資料同步, PWA, 生產力工具

### 縮圖設計建議

- 主視覺：左側PWA + 右側網頁版的分屏對比圖
- 文字覆蓋：「跨裝置同步設置」
- 顏色：亮眼的互補色（建議根據應用品牌色）

### 字幕建議

- **中文字幕**：逐字記錄此腳本
- **英文字幕**：建議翻譯重點段落，特別是技術步驟部分

### 播放列表分類

- 建議納入：「NonBlockingLife 教學系列」
- 順序位置：同步功能教學系列中的第 X 部

### SEO 優化

- **關鍵詞**：Google Sheets 同步、Apps Script 教學、跨裝置同步、工作管理工具
- **描述中強調**：免費、簡單設置、支持多裝置

### 預期觀眾互動

- 在描述中邀請提問：「有任何問題或建議嗎？歡迎在留言區提出」
- 引導訂閱與分享：「如果這個教學對您有幫助，請訂閱並分享給朋友」

### 發布前檢查清單

- [x] 確認所有步驟說明清晰無誤
- [x] 測試同步功能是否如影片所示正常運作
- [x] 準備高品質縮圖
- [x] 準備字幕檔案（.vtt 或 .srt 格式）
- [x] 驗證相關連結的有效性
- [x] 確認隱私設置（個人資訊是否已隱蔽）

=================================================

---

## [2026-05-20] ychsue 中文的部分已經拍好了，主要就是在講怎麼與Google Sheets 同步，或者匯出成 Markdown (或 JSON) 來給AI 分析或匯入到另一個裝置。

可以幫我把它改成英文的稿嗎？因為我想給外國人還是有另一個相同的影片，但是全英文的可能比較好。您覺得呢？

---

## English Script (Voiceover)

Hi everyone,

In this video, I will walk you through how to sync NonBlockingLife across devices.

I will cover three parts:
interface overview, Google sync setup, and daily usage.

Let's start with the interface.

On screen now:
the left side is the PWA version, and Google sync is already configured.
The right side is the regular web version, and sync is not configured yet.

Depending on your window size, if you do not see the menu, click the three-line icon in the top-right corner.

This sync area is not frequently used, so it is not fully localized.
Please use your browser translation feature if needed.
Here I switch it to English.

One quick note:
Google sync setup must be done on a desktop computer,
because the Google Sheets mobile app cannot run Apps Script deployment steps.
After setup is complete, you can copy the API URL to your phone.

Now it is switched.

Click the Setup or Setting button.
It will open the setup tutorial page.
Follow the steps there.

Step 1:
Create a new Google Sheet.

Rename it to something easy to remember.

Save it.

Step 2 is Apps Script setup.

Go back to Google Sheets,
click Extensions,
then choose Apps Script.

This opens the GAS editor.

Go back to the tutorial page,
click Step 3, Copy Apps Script Code,
and copy the code.

Return to the GAS editor,
replace the default code with the copied code,
then press Ctrl + S to save.

You can also rename the GAS project,
so it is easier to identify later.

Next, return to the tutorial page,
Look at Step 4, Deploy as Web App,
and follow the deployment instructions.

In the GAS editor,
click Deploy in the top-right corner,
then click New deployment.

For deployment type, choose Web app.
Fill in project details if needed.

Set Execute as to Me.

Set Who has access to Anyone.

Then click Deploy.

Google may show an unverified app warning.
Click Advanced,
then click Go to your-project-name (unsafe).

After deployment,
copy the API URL.

Go back to the app,
click the Step 4 button,
paste the URL,
and confirm.

Setup is done.

Now click Sync,
and you will see sync status updates.

[iPhone]
Copy the API URL to your phone,
paste it into the same setup field,
tap Set,
and you are done.

If you want to fully overwrite local data with Google Sheets data,
use the overwrite button.

Important:
this action is irreversible.
Please confirm before you proceed.

Because this feature is rarely used,
after overwrite you may need to switch tabs once,
then the UI will refresh with the latest data.

The two rightmost buttons are for Export and Import.
Let's do Export first.

You can export in two formats.
I recommend Markdown,
because both humans and AI tools can read it easily.

You can even paste Markdown into tools like Copilot or Gemini,
and ask them to convert it into a full Excel or Google Sheets table if available.

In VS Code, you can also view it in table-like format with extensions.

For Import,
click the rightmost import button,
confirm,
and wait for completion.

After import,
you will see a success summary.

That is it.

This sync feature is mainly for cross-device continuity and backup.
If you have other use cases,
feel free to share,
and we can explore them together.

Thanks for watching.

---

## English YouTube Publish Info

### Video Title

**NonBlockingLife - Cross-Device Sync Setup Tutorial (Google Sheets + Google Apps Script)**

### Video Description

In this tutorial, I will show you how to set up Google Sheets sync in NonBlockingLife so your data stays in sync across devices.
You will also learn how to export and import data using JSON or Markdown.

**What you will learn:**

- How to connect NonBlockingLife to Google Sheets
- How to deploy Google Apps Script as a Web App
- How to configure sync on desktop and iPhone
- How to export/import data for backup and migration
- What to watch out for when using full overwrite

**Who this is for:**
Anyone who wants to keep NonBlockingLife data synced across multiple devices.

**Links:**

- Web App + Tutorial: [NonBlockingLife Web App](https://ychsue.github.io/NonBlockingLife/)
- GitHub Repository: [NonBlockingLife Repository](https://github.com/ychsue/NonBlockingLife)

**Timestamps:**

- 00:00 Intro
- 00:17 Interface overview
- 01:16 Step 1: Create Google Sheets
- 01:58 Step 2: Configure Google Apps Script
- 03:24 Step 3 and 4: Deploy as Web App
- 05:15 iPhone setup
- 05:26 Data tools: overwrite
- 06:05 Data export/import
- 07:03 Wrap-up

### Tags

NonBlockingLife, Google Sheets, Google Apps Script, Markdown, sync, cross-device, tutorial, productivity, PWA, data backup

### Thumbnail Idea

- Split screen: PWA on the left, web version on the right
- Overlay text: Cross-Device Sync Setup
- High-contrast colors aligned with your brand

### Subtitle Suggestion

- English subtitles: full transcript
- Optional localized subtitles for broader reach

### Playlist

- Add to: NonBlockingLife Tutorial Series
- Suggested order: sync tutorial episode

### SEO Keywords

- Google Sheets sync
- Apps Script tutorial
- cross-device sync
- productivity app workflow

### Engagement Prompt

- Have questions or ideas? Leave a comment below.
- If this helped, please subscribe and share.

### Pre-Publish Checklist

- [ ] Verify each setup step is accurate
- [ ] Confirm sync works exactly as shown
- [ ] Prepare high-quality thumbnail
- [ ] Prepare subtitle files (.vtt or .srt)
- [ ] Verify all links work
- [ ] Hide personal/private information in screen recordings
