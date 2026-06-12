# 桌面形式輸入會很容易失去 focus

## [2026-06-12] ychsue 錯誤描述

所附的這五個 tsx 在桌面形式(也就是使用 react table 的部分)， 除了@file:ResourceTable.tsx 點條目的任何地方都會打開 @file:EditDialog.tsx 即便我點在輸入文字的地方。
而其他四個則是點任何一個條目的輸入，輸入一個字之後就會失去 focus。

請問有可能讓這五個頁面的 reactTable 可以在條目中的輸入框可以連續輸入而focus 不會跑掉嗎？然後，點條目的非輸入區，就打開該條目的 @file:EditDialog.tsx 就好。

可以嗎？
請先計畫一下，謝謝。
