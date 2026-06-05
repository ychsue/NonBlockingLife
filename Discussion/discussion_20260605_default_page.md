# 2026-06-05 預設開啟頁面討論紀錄

## 背景

原本 `currentSheet` 預設是 `guide`，所以 PWA 打開後會先顯示說明頁。但使用久了之後，較常用的入口其實可能是 `selection_cache`，因此想讓使用者自行選擇「啟動時要先開哪一頁」。

## 討論結果

最後決定不要把這個選項放在 `App.tsx` 的 header，因為手機畫面太擠；也不另外做一個專門的 settings 頁，避免成本過高。最合適的位置是 `GuidePage.tsx`，因為那裡本來就有說明、通知與安裝設定，放「啟動偏好」最自然。

另外，除了「固定開 guide / selection_cache」之外，也一起納入「last_visited」的選項，讓老使用者可以直接回到上次停留的頁面，體驗會更順。

## 實作內容

已在 `pwa/src/store/appStore.ts` 加入啟動偏好與 last visited 的 localStorage 持久化，並讓 `currentSheet` 初始化時依設定決定預設頁面。

也已在 `pwa/src/components/GuidePage.tsx` 加上一個簡單的三選一按鈕區塊，讓使用者可以選擇：
- `guide`
- `selection_cache`
- `last_visited`

## 補充

URL action 與 iPhone Shortcut 的導頁優先級不受影響，若是從 Shortcut 或網址參數開啟，仍會先依 URL 指定頁面跳轉。

## 驗證

已執行 `npm run build`，PWA 可正常編譯通過。
