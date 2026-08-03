# 讓使用者可以選擇timer啟用方式

## [2026-08-03] ychsue 因為TWA 好像可以透過 `AlarmClock.ACTION_SET_TIMER` 來啟動timer，所以想要當使用者是在使用TWA的時候，可以選擇在 [shortcutUtils.ts](/pwa/src/utils/shortcutUtils.ts) 裡
1. 不自動顯現 timer
2. 自動顯現 timer (目前就是這樣，透過 `nonblockinglife://show-clock`來調用 [ClockTriggerActivity](/twa/app/src/main/java/com/yescirculation/nonblockinglife/ClockTriggerActivity.java))
3. 下達比方說 `nonblockinglife://set-timer?duration=600&skipUi=true&title=MyTimer` 這樣的指令，直接啟動 timer(因此，JAVA的部分要多加這個部分，而 [AndroidManifest.xml](/twa/app/src/main/AndroidManifest.xml) 可能也要修改，好讓他可以SET_ALARM or SET_TIMER)

而這個可以讓使用者選擇的UI，我想先寫在 [MorePage.tsx](/pwa/src/components/MorePage.tsx) 裡面，因為還不確定是否能成功。
對了，MorePage 可以幫我把它變成是 Experiment 與 Setting 的分頁嗎？這樣就可以把這個功能放在 Experiment 裡面，然後把其他的設定放在 Setting 裡面。目前他只歸給Experiment，您覺得像 `chrome://settings/` 那樣用側邊欄的方式好嗎？還是有更好的辦法？

---

## 對話總結

這次討論的核心，是希望讓 Android/TWA 的 timer 啟動方式變得更可控與更不打擾使用者。最初是因為 TWA 可以透過 `AlarmClock.ACTION_SET_TIMER` 來啟動 timer，因此想讓使用者在使用 TWA 時，可以選擇三種模式：

1. 不自動顯示 timer
2. 自動顯示 timer（目前方式，透過 `nonblockinglife://show-clock` 觸發）
3. 直接啟動 timer（透過 `nonblockinglife://set-timer?...` 直接設定計時器）

為了實現這個功能，討論也順帶延伸到：
- 在 [shortcutUtils.ts](/pwa/src/utils/shortcutUtils.ts) 裡增加不同的啟動模式
- 在 [ClockTriggerActivity.java](/twa/app/src/main/java/com/yescirculation/nonblockinglife/ClockTriggerActivity.java) 補上對 `set-timer` 的支援
- 修改 [AndroidManifest.xml](/twa/app/src/main/AndroidManifest.xml) 讓 TWA 能夠處理相關的 alarm/timer intent

此外，還討論了 UI 的安排方式。原本想先把設定入口放在 [MorePage.tsx](/pwa/src/components/MorePage.tsx) 中，但後來也提出一個更清楚的整理方式：把 MorePage 拆成 Experiment 與 Setting 兩個分頁，讓 timer 啟動方式這類實驗性功能放在 Experiment，其他一般設定則放在 Setting。對於呈現方式，討論到像 `chrome://settings/` 那樣採用側邊欄切換的作法，會比單純堆在同一頁更容易理解。