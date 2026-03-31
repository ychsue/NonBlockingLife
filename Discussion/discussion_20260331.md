# 移動 inbox 條目

我想在 #file:InboxTable.tsx 多一個功能，那就是將所選的row移動到 Task Pool, Micro Task 或 Scheduled 中，簡單想法就是取得該 row 的 title & url -> 在想移動到的 table 新增一個 row with title & url，新增完成後，delete inbox 裡面的，然後跳到該table，然後，設editingRow 為剛剛複製的那一個，您覺得呢？怎麼設計使用者才容易使用呢？

## 2026-03-31 設計定案（簡版）

1. 桌機：Inbox 每列 Actions 直接提供三個 Move 按鈕（Task Pool / Micro Tasks / Scheduled），降低操作步驟。
2. 手機：保留現有滑動語意（右滑 Edit、左滑 Delete），不新增第三種滑動；Move 放在 Inbox 編輯對話框底部，避免誤觸。
3. 資料流：Move 採「先新增目標，再刪來源 Inbox」；若任一步失敗，保守處理並顯示錯誤，不自動丟資料。
4. 導航與編輯：Move 成功後自動切到目標表，並自動打開剛建立那筆的編輯視窗。
5. ID 策略：目標表使用目標前綴新 ID（T / t / S），保留表別語意清楚。
