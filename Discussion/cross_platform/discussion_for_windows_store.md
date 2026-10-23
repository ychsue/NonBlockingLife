# 產生 Windows Store App

## [2026-10-23] ychsue 您好，由於我想要將這個專案放到 Windows Store 上面，然而，發現我好像違反了一個原則，那就是當使用者解除安裝時，應該不可以在系統殘留垃圾，
但是，若搜尋 `Registry` 會發現有 @attachment:AutoStart.cs  與 @attachment:ProtocolRegistration.cs ，這兩個。
這兩個透過 @attachment:App.axaml.cs 會出現在 Tray 裡面，會有兩列 (TrayIcon?)，這樣很方便我開發，但現在要發布了，這可能成為問題，請問怎麼做才好呢？
需要我先在 Visual Studio 上面做些甚麼手續嗎？

### Copilot (Claud Sonet 5.5) 回覆

**結論**：MSIX（Store 版）下，這兩個功能都**不該**用 Registry 寫入，改用 manifest 宣告；解除安裝時 Windows 會自動清除，不留垃圾。

**為什麼**
- MSIX 對 HKCU 的寫入會被虛擬化（寫到套件私有 hive，解除安裝時一併刪除），技術上通常不會殘留；但 `Run` 鍵與 `Classes\nonblockinglife` 在套件內**不會生效**（協定/啟動必須由 manifest 宣告），所以程式碼寫入是沒用的，且 Tray 的勾選狀態會誤導使用者。

**做法**
1. **協定 `nonblockinglife://`**：在 `Package.appxmanifest` 的 `<Application><Extensions>` 加 `uap:Extension Category="windows.protocol"`（Name = `nonblockinglife`）。
2. **開機自動啟動**：加 `desktop:Extension Category="windows.startupTask"`（TaskId=`NblStartup`, Enabled=`false`, DisplayName=…），程式用 `Windows.ApplicationModel.StartupTask.GetAsync("NblStartup")` 的 `RequestEnableAsync()` / `Disable()` 切換（使用者也可在「設定 > 應用程式 > 啟動」控制）。
3. **程式碼**：偵測是否以套件身分執行（`GetCurrentPackageFullName` P/Invoke，回傳 `APPMODEL_ERROR_NO_PACKAGE`=15700 表示非套件）：
   - 套件模式：**隱藏** Tray 的 `protocol` 項目；`autoStart` 改走 StartupTask；不呼叫 `Registry`。
   - 非套件（開發/portable/Linux）：維持現狀。
   在 [App.axaml.cs](../../desktop/src/Nbl.Desktop/App.axaml.cs) 約 95–125 行加此判斷即可，`AutoStart`/`ProtocolRegistration` 的 `IsSupported` 也可回傳 `!IsPackaged`（協定）。
4. 另外的 Tray 兩列（autoStart、protocol）不必在 Store 版同時保留：協定那列直接隱藏，自動啟動那列保留（改用 StartupTask）。

**需要你在 Visual Studio 做的**
1. 新增 **Windows Application Packaging Project**（或單一專案 MSIX 打包），參考 Nbl.Desktop（self-contained、win-x64/arm64）。
2. 在 Partner Center 保留 App 名稱，並用 *Project > Publish > Associate App with the Store* 套用 Identity/Publisher。
3. 編輯 `Package.appxmanifest`：加上上述 protocol 與 startupTask 擴充，`runFullTrust` capability（桌面 App 必須）。
4. 確認其他資料（設定、音效等）寫在 `ApplicationData`/`%LOCALAPPDATA%`（MSIX 會虛擬化並於解除安裝時清除），避免寫到使用者文件夾外的任意位置。
5. 用 *Create App Packages* 產生 .msixupload，跑 WACK 測試後上傳。

要我接著實作第 3 點（套件偵測 + 隱藏協定項目 + StartupTask）的話，請告訴我；StartupTask 需要 Windows TFM（`net8.0-windows10.0.19041`）或 WinRT 參考，我會先確認專案目標框架。
