# 桌面形式輸入會很容易失去 focus

## [2026-06-12] ychsue 錯誤描述

所附的這五個 tsx 在桌面形式(也就是使用 react table 的部分)， 除了@file:ResourceTable.tsx 點條目的任何地方都會打開 @file:EditDialog.tsx 即便我點在輸入文字的地方。
而其他四個則是點任何一個條目的輸入，輸入一個字之後就會失去 focus。

請問有可能讓這五個頁面的 reactTable 可以在條目中的輸入框可以連續輸入而focus 不會跑掉嗎？然後，點條目的非輸入區，就打開該條目的 @file:EditDialog.tsx 就好。

可以嗎？
請先計畫一下，謝謝。

## [2026-06-12] 本次修改重點

已經先做完兩個核心修正：

1. [pwa/src/i18n/index.ts](pwa/src/i18n/index.ts) 的 `useT()` 改成穩定回傳 `t`，避免桌面表格在輸入時因為 `columns` 重建而失焦。
2. 新增共用判斷 [rowEditUtils.ts](pwa/src/components/tables/rowEditUtils.ts)，讓桌面列只在點到非互動區時才開啟 [EditDialog.tsx](pwa/src/components/EditDialog.tsx)。
3. 五個桌面表格已統一行為：
  - [ResourceTable.tsx](pwa/src/components/tables/ResourceTable.tsx)
  - [InboxTable.tsx](pwa/src/components/tables/InboxTable.tsx)
  - [MicroTasksTable.tsx](pwa/src/components/tables/MicroTasksTable.tsx)
  - [TaskPoolTable.tsx](pwa/src/components/tables/TaskPoolTable.tsx)
  - [ScheduledTable.tsx](pwa/src/components/tables/ScheduledTable.tsx)

另外也補了一個小型互動測試，鎖定 row click gate 的規則：輸入框內點擊不開編輯、非互動區點擊才開編輯。
