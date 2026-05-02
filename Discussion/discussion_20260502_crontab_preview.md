# 做出 CronExpr 的預覽功能

## GitHub Copilot 的建議

先確認 EditDialog 的使用面與 FieldType 範圍，避免把新型別加進去後影響其他表單；確認後我會直接把 cron 做成獨立欄位型別，並接上同樣的預覽功能。

做法我會定成這樣：把 cronExpr 升成獨立的 `FieldType = 'cron'`，在 EditDialog 內顯示五段式欄位（分、時、日、月、週）加預覽按鈕，按下後在欄位下方展開未來執行清單；ScheduledTable 的編輯彈窗再改用這個型別。

新型別已經接進 EditDialog，但我先不加別的功能，直接做同一輪驗證，抓出型別或命名衝突後立刻修正。

問題是局部命名遮蔽，不是設計本身。我把 ScheduledTable 內的本地函式改名後，再跑一次 editor diagnostics 確認乾淨。

同一個檢查再跑一次，只確認這三個 touched files，避免再擴 scope。

可以，現在已經加進 EditDialog 了，而且我把 cronExpr 做成獨立的 `FieldType = 'cron'`。在 EditDialog.tsx 裡，這個欄位不再走一般文字輸入，而是改成五段式顯示：分鐘、小时、日、月、週，各自一個小輸入框，下面有預覽按鈕與目前組合出的 cron 字串。按下預覽後，會在欄位下方展開接下來幾次執行時間清單，讓使用者在儲存前先確認排程是否符合預期。

這次也順手把共用邏輯抽到 cronUtils.ts，包含 cron 分段、重組，以及 next runs 計算，避免 ScheduledTable.tsx 和 EditDialog 各自維護一套。ScheduledTable 的編輯彈窗欄位也已經改成使用這個新型別，所以 `cronExpr` 在表格內和彈窗內的操作模型現在是一致的。

我已經重新檢查 editor diagnostics，並跑過 `npm run build`，目前通過；仍只有既有的 bundle size 警告，這次改動沒有新增錯誤。

如果你要，我下一步可以再做其中一個：

1. 讓 EditDialog 裡的 cron 預覽也顯示「距今多久」
2. 在 cron 欄位下加常用範本快捷鍵，例如每天 9 點、平日 9 點
3. 把 ScheduledTable 表格內的 cron 編輯，也統一抽成同一個小元件，完全消除重複 UI

已進行變更。
