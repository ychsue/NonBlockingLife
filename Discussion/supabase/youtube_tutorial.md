# Supabase YouTube Tutorial 

## 講稿
### 1. 註冊 -> 建立專案
1. 首先，請打開 Supabase 官方網站。
2. 點擊「Start your project」按鈕。
2. 如果還沒註冊，會跳出註冊畫面。建議使用 GitHub 帳號進行註冊，方便後續與 GitHub 的整合。
2. 然後請按「+ New project」按鈕。
2. 填寫專案名稱、選擇資料庫地區與密碼，然後點擊「Create Project」。
3. 等待專案建立完成，進入專案管理介面。
### 2. 初始化 Tables
1. 進入專案管理介面後，點擊左側選單的「Table Editor」。
2. 這裡我們看到都是空的，表示目前還沒有任何資料表。
3. 這次點擊左側選單的「SQL Editor」按鈕，開始建立新的資料表。
4. 回到 NonBlockingLife，點擊「設置」按鈕，在這個窗格裡，按「複製 SQL 程式碼」按鈕，將 SQL 程式碼複製下來。
5. 回到 Supabase 的 SQL Editor，將剛剛複製的 SQL 程式碼貼上，然後點擊「執行」按鈕，建立資料表。
6. 完成後，可以回到「Table Editor」確認資料表是否已成功建立。
7. 至此，資料表的初始化就完成了，可以開始進行資料的操作與應用程式的開發。
### 3. 輸入 URL & API Key
1. 回到 NonBlockingLife，可以看到下一步是給定 URL & API KEY
2. 這次，我們回到 「Project Overview」......
3. 複製這兩行，貼到 NonBlockingLife裡面的對應欄位。
4. 按綠色鈕就會會開始測試連線。
5. 如果測試成功，就表示 NonBlockingLife 已經成功連接到 Supabase。
### 4. 每小時自動生成ics檔案
1. 這裡有三個步驟
2. 第一步，新增 storage bucket，名為 ics-exports。
3. 第二步，設定 Edge Function，名為 export-ics。
---- 另一個影片
4. 複製 curl 的字串，擷取當中的文字
5. 第三步，再回到 SQL Editor，執行相應的 SQL 指令，就能根據 ics_export_config 表的設定，自動生成 ICS 檔案。
### 5. 由實驗區按鈕將所有 tables 內容寫入 Supabase
1. 進入 NonBlockingLife 的實驗區。
2. 找到「將所有 tables 內容寫入 Supabase」的按鈕。
3. 點擊按鈕，系統會自動將所有 tables 的內容寫入 Supabase。
4. 完成後，可以回到 Supabase 的 Table Editor，確認資料是否已成功寫入。