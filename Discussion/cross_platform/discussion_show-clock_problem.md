# 使用 nonblockinglife://show-clock 的問題

## [2026-11-07] ychsue 我遇到一個很奇怪的問題，當我沒開啟這個 App，然後在瀏覽器下達 `nonblockinglife://show-clock`，
ClockWindow 很正常的出現，但是，MainWindow 卻只有最上面顯示他是mainWindow 的 header 與外框，裡面是透明的，連Menu 也看不見，奇怪，在 @attachment:App.axaml.cs 他不是一定會被 new 產生嗎？
對了，我是用 flatpak 打包的

## [2026-11-07] GitHub Copilot GPT 6.1 的回覆

我會先追蹤冷啟動時的 URI 處理、MainWindow 初始化與 Flatpak 啟動設定，確認「建立視窗」和「視窗內容完成載入」之間發生了什麼。


程式確實會建立 MainWindow，但冷啟動 `show-clock` 時也刻意在它開啟後立即隱藏；我正在確認這個時序與 Linux 原生 WebView 是否足以解釋殘留的空白外框。

是的，你的理解沒有錯：**冷啟動時，程式確實會 `new MainWindow`**。但 `new` 只是建立視窗物件和控制項，不代表視窗已經完成顯示或繪製。

我追到的流程是：

1. `App.axaml.cs` 建立 `MainWindow`，並把它指定給 `desktop.MainWindow`。
2. 如果啟動參數是 `show-clock`，同一段程式會在 MainWindow 的 `Opened` 事件中**立即呼叫 `Hide()`**，並另外排程顯示 ClockWindow。
3. Avalonia 的 desktop lifetime 會在啟動時呼叫 MainWindow 的 `Show()`；因此目前的設計其實是「先顯示主視窗，再立刻隱藏」，而不是不建立主視窗。

**我最懷疑的是這個 Show → 立即 Hide 的時序**，造成 Linux/X11 視窗顯示或繪製狀態異常。這可以解釋為什麼你會看到一個只有標題列和外框的殘影，但目前還不能確認它就是根因，我沒有重現或驗證這個顯示問題。

另外，`MainWindow.axaml` 的選單是 Avalonia 控制項，不在 WebView 網頁裡。**連選單都消失**，所以不能單純歸咎於網頁沒有載入。

Flatpak 的設定也值得注意：`manifest` 目前只開啟 X11 socket；你目前的桌面 session 是 Wayland，因此這個 Flatpak 會走 X11／XWayland，而不是原生 Wayland。不過，這只能作為排查方向，還不足以證明 Flatpak 本身有問題。

可以先做兩個對照：

- 完全結束程式後，**正常啟動**，確認 MainWindow 的選單與網頁是否正常。
- 再完全結束後，用 `show-clock` 冷啟動；若出現空框，嘗試從系統匣選擇「開啟主視窗」，看內容是否恢復。

若正常啟動沒問題，而 `show-clock` 才出現空框，會更支持啟動時顯示／隱藏時序的假設。這次我沒有修改程式碼。

---

已修改 App.axaml.cs：冷啟動 show-clock 時仍會建立 MainWindow，但不再先顯示它再立即隱藏，只顯示 ClockWindow。背景啟動也採用相同方式。

按視窗右上角 X 原本就是隱藏視窗，不是結束程式；要結束程式，請用主視窗或系統匣選單的「結束」。主視窗的網頁現在會等到首次開啟主視窗時才載入。

驗證結果：

桌面程式編譯成功；11 個 protocol 解析測試通過。
在隔離的 X11 環境確認：時鐘可見、主視窗未顯示，之後也能叫出主視窗。
另外兩個 Windows 路徑相關的既有測試在 Linux 上失敗；與這次修改無關。
尚未重建或實測 Flatpak 安裝版。要讓已安裝的版本套用修改，需要重新打包安裝；build-flatpak.sh 的 install 指令會清理其 build-dir 後重新建置。建議安裝後再用瀏覽器冷啟動一次確認。