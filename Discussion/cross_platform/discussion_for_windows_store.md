# 產生 Windows Store App

## [2026-10-23] ychsue 您好，由於我想要將這個專案放到 Windows Store 上面，然而，發現我好像違反了一個原則，那就是當使用者解除安裝時，應該不可以在系統殘留垃圾，
但是，若搜尋 `Registry` 會發現有 @attachment:AutoStart.cs  與 @attachment:ProtocolRegistration.cs ，這兩個。
這兩個透過 @attachment:App.axaml.cs 會出現在 Tray 裡面，會有兩列 (TrayIcon?)，這樣很方便我開發，但現在要發布了，這可能成為問題，請問怎麼做才好呢？
需要我先在 Visual Studio 上面做些甚麼手續嗎？

### Copilot (Claude Sonnet 5.5) 回覆

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

---

## [2026-10-23] ychsue 前兩步我做了，第三步以後我不會，請問我要怎麼測試將要 publish 的程式呢？因為顯然到時我會有 debug 的與release 的版本，想確認 Store 版的行為，我怕測成 debug 的。

### Copilot (Claude Sonnet 5.5) 回覆：如何測試 Store 版

**重點**：Debug/Release 與「是否為 Store 版」是兩件獨立的事。Store 版行為的關鍵是**以套件身分（package identity）執行**，只有從「打包專案」部署／安裝才有，直接執行 Nbl.Desktop.exe 永遠不是。

**1. 日常檢查（Debug 也可以）**
- 把 **打包專案（.wapproj）設為啟動專案**，按 F5：VS 會部署並以套件身分執行（即使是 Debug 組態）。
- 若直接以 Nbl.Desktop 為啟動專案，則是非套件模式，測到的是開發行為。
- 確認方式：在 Tray 看「協定」項目是否被隱藏；或暫時 log `GetCurrentPackageFullName` 的結果。

**2. 發佈前驗證（Release，最接近 Store）**
1. 組態選 **Release**、平台 x64（及 ARM64 若有發布）。
2. 打包專案右鍵 > **Publish > Create App Packages…** > 選 **Sideloading**（不要選 Store，才能本機安裝）> 簽署選「Yes, use current/ create test certificate」。
3. 產生資料夾內有 `.msix` 與 `.cer`：先把 `.cer` 安裝到「本機電腦 > **受信任的人**」（系統管理員），再雙擊 `.msix` 安裝（或 `Add-AppxPackage .\xxx.msix`）。
4. 從開始功能表啟動，測：Tray、協定連結（瀏覽器開 `nonblockinglife://...`）、自動啟動（設定 > 應用程式 > 啟動 看是否出現、可切換）、重新開機後行為。
5. 注意：先從 Store 專案測試前，若本機還裝著開發版，請先解除；同 Identity 不同簽署的套件無法共存，需先 `Remove-AppxPackage`。

**3. 解除安裝無殘留檢查**
- 安裝前先備份基準：開 `regedit` 搜尋 `NonBlockingLife`、記下 `%LOCALAPPDATA%` 與 `%APPDATA%` 內相關資料夾。
- 設定 > 應用程式 解除安裝後再搜尋一次，應無 `Run\NonBlockingLife`、`Classes\nonblockinglife`，且 `%LOCALAPPDATA%\Packages\<PackageFamilyName>` 消失。
- 也要手動清掉你以前開發版寫過的 HKCU 鍵（用開發版 Tray 取消勾選兩項即可），否則會干擾判斷。

**4. 上傳前**
- 對 Store 組態的 `.msixupload` 跑 **Windows App Certification Kit（WACK）**（Create App Packages 最後一頁可勾選）。
- Store 上傳後會由 Microsoft 重新簽署，所以本機的測試憑證只用於 sideload 測試，不會上架。

---

## [2026-10-23] ychsue 我已經清理 Debug 版本的那些資料，現在請先讓release 版本準備好好了。目前卡在步驟3如下：
```md
3. 編輯 `Package.appxmanifest`：加上上述 protocol 與 startupTask 擴充，`runFullTrust` capability（桌面 App 必須）。
4. 確認其他資料（設定、音效等）寫在 `ApplicationData`/`%LOCALAPPDATA%`（MSIX 會虛擬化並於解除安裝時清除），避免寫到使用者文件夾外的任意位置。
5. 用 *Create App Packages* 產生 .msixupload，跑 WACK 測試後上傳。
```
如需要我參與的，請隨時告知，謝謝。
### Copilot (Claude Sonnet 5.5) 回覆：步驟 3～5 已完成的部分

**已由我修改（Release/Debug 皆適用）**
- [Package.appxmanifest](../../desktop/NBL.Platform.Windows/Package.appxmanifest)：協定 `nonblockinglife` 原本就有；新增 `uap5:StartupTask`（TaskId=`NblStartup`，預設停用），`runFullTrust` 已存在。
- 新增 `Nbl.Bridge/PackageIdentity.cs`：判斷是否以 MSIX 套件身分執行。套件內 `AutoStart` / `ProtocolRegistration` 不再碰 Registry。
- 新增 `Nbl.Desktop/StoreStartup.cs`：套件模式用 `StartupTask` 切換開機啟動，並偵測「由開機啟動」→ 縮到系統匣（StartupTask 無法帶 `--background`）。
- Tray：套件模式隱藏「協定」項目，「自動啟動」改走 StartupTask；非套件（開發/Linux）行為不變。
- `Nbl.Desktop.csproj`：Windows 上 TFM 改為 `net10.0-windows10.0.19041.0`（為了 WinRT），其他平台仍是 `net10.0`。Release 建置已通過。

**你要做的（Visual Studio）**
1. 選 **Release | x64**，以 `NBL.Platform.Windows` 為啟動專案，F5 確認可以部署並以套件身分執行（Tray 沒有「協定」項目）。
2. 測 StartupTask：Tray 勾選「自動啟動」→ 設定 > 應用程式 > 啟動 應出現 NonBlockingLife 且為開啟；登出再登入應只出現在系統匣。
3. 測協定：在「執行」輸入 `nonblockinglife://...` 應喚起套件版。
4. 步驟 4：資料目前寫 `%LOCALAPPDATA%\NonBlockingLife`（alarms.json、timers.json），MSIX 會虛擬化，OK；若 SoundLibrary 的音效資料夾在別處，請在套件版開啟確認位置。
5. 步驟 5：右鍵 `NBL.Platform.Windows` > Publish > Create App Packages > Microsoft Store（已關聯）> 勾 x64（ARM64 視需要）> 勾 WACK 測試。

**注意 / 待確認**
- 目前 `Nbl.Desktop` 是「依賴框架」的 net10.0 應用。MSIX 內若不含 .NET 10 runtime，使用者機器可能無法啟動。建議發佈設定使用 **self-contained**（如 `SelfContained=true` + `RuntimeIdentifier=win-x64`）；需要的話我可以加進專案，請告知。
- `tests/Nbl.Bridge.Tests` 目前本來就無法編譯（`FakeHost` 未實作 `IDesktopHost.BaseUri`），與本次修改無關，所以未能跑測試。

---

## [2026-10-23] ychsue 謝謝，我把那個 test 修好了，原來 windows 不會自己幫忙裝 net10.0 ，那麼，請幫我改成 self-contained 發佈設定。然後，我就來安裝看看，正式版發布會長怎樣。然後我只要`解除安裝`即可，對嗎？
前三步正常，太好了，
到第四步驟 `%LOCALAPPDATA%\NonBlockingLife` ，我由 tray 上面沒辦法打開該目錄，因為不存在(被我砍了)

### Copilot 回覆：self-contained 與資料夾問題

- `Nbl.Desktop.csproj`：Windows 上加 `RuntimeIdentifier=win-x64`、`SelfContained=true`（.NET runtime 隨 MSIX 附帶）。目前只支援 x64；要 ARM64 需另外處理。
- 開不了資料夾的原因：MSIX 會把對 `%LOCALAPPDATA%` 的寫入**虛擬化**到 `%LOCALAPPDATA%\Packages\<PFN>\LocalCache\Local\...`，檔案總管看的是真實路徑，所以找不到。新增 `DataPaths.Root`：套件模式改用 `ApplicationData.Current.LocalFolder`（`...\Packages\<PFN>\LocalState`，真實路徑、解除安裝時會刪除）；非套件模式維持 `%LOCALAPPDATA%\NonBlockingLife`。alarms.json、timers.json、sounds 都已改用它。
- 你刪掉資料夾是對的，新安裝本來就不會有；Tray 的「開啟音效資料夾」會自動建立。
- 注意：套件版的資料位置與開發版不同，舊資料不會自動搬過去。

**解除安裝**：是的，從「設定 > 應用程式」解除安裝即可；套件資料、StartupTask、協定都會一併移除。若用 sideload 測試憑證，可另外到 certmgr（本機電腦 > 受信任的人）刪掉測試 `.cer`，並用 `Remove-AppxPackage` 確認已移除。

---
## [2026-10-23] ychsue 我試著照您的第五步操作，沒看到 WACK 測試的選項，然後選擇 `包含公用符號` 與 `產生成品`，利用 windows 應用程式認證套件，驗證該應用程式，然後就得到以下的錯誤
```
找不到資產檔案 'C:\Users\hsuy1\source\repos\NonBlockingLife\desktop\src\Nbl.Desktop\obj\wappublish\win-x64\project.assets.json'。請執行 NuGet 套件還原，以產生此檔案。
```
### Copilot 回覆：Create App Packages 錯誤

- 錯誤 `obj\wappublish\win-x64\project.assets.json` 找不到：精靈用獨立的 `wappublish\win-x64` 中介目錄，而該目錄尚未還原過。我已手動還原一次；若仍出現，請先「方案 > 還原 NuGet 套件」（或刪除 `src\Nbl.Desktop\obj` 與 `bin` 後重試）。
- 我用 MSBuild 命令列以 Release|x64 實際打包，找到並修正兩個會導致失敗的問題：
  1. `Package.appxmanifest` 的 `startupTask` 的 `Executable` 不會被代換，已改為 `Nbl.Desktop\Nbl.Desktop.exe`。
  2. `Nbl.Bridge.csproj` 缺少 `RuntimeIdentifiers`（self-contained 需要），已加 `win-x64`。
  修正後命令列已能成功產生 `.msixbundle`。
- WACK 選項：該核取方塊只在 VS 所在機器已安裝 Windows App Certification Kit（Windows SDK 元件）時才會出現；你選的「驗證該應用程式」若在精靈最後一頁才會出現，建議先不勾，產生套件後再於「Windows App Cert Kit」手動執行。
