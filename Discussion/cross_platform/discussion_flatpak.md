# 在flatpak 離線編輯遇到的問題

## [2026-10-28] Gemini 的回答

這是一次非常扎實的除錯經驗！把 .NET 專案（尤其是帶有 Avalonia、多專案 Monorepo 架構）成功用 Flatpak 打包並在 Linux 上跑起來，確實需要跨過好幾道障礙。

為了解除你心中的疑惑並讓你有一份「未來可以隨時拿出來複習的完整筆記」，我幫你將整個過程的核心觀念、關鍵細節與防坑指南統合梳理如下：

---

## 🛡️ .NET 專案 Flatpak 打包速查與避坑指南

### 1. 核心觀念：`nuget-sources.json` 的本質

* **它是什麼？**
`nuget-sources.json` 並不是把 JSON 轉換成 YAML 的語法糖，而是 **「NuGet 套件的離線清單與下載對應表」**。
* **為什麼需要它？**
Flatpak 的雲端伺服器（或沙箱環境）為了確保可重現性與安全性，預設是 **完全斷網（Offline Build）** 的。當 .NET 的 `dotnet restore` 或 `dotnet publish` 執行時，如果本地沒有對應套件，就會去敲官方的 `api.nuget.org`。而 `nuget-sources.json` 就是事先把所有會用到的 `.nupkg` 檔案載點與 SHA512 驗證碼全部羅列好，讓 Flatpak 在斷網前先下載備妥。



---

### 2. Monorepo 專案結構與路徑對應

* **工作目錄基準**：
Flatpak 的 `.yml` 檔案放在哪裡，它的相對路徑（`path: .`）就是以該資料夾為基準。如果你的專案是 Monorepo（例如把桌面端獨立放在 `desktop/`），**所有 Flatpak 相關設定（`.yml`、`.desktop`、圖示）都必須放在 `desktop/` 裡面**。
* **精準指向專案**：
不要傻傻去編譯整個方案檔（`.sln`），在 `build-commands` 中要直接指定真正的專案檔路徑：
```yaml
build-commands:
  - dotnet publish src/Nbl.Desktop/Nbl.Desktop.csproj -c Release -r linux-x64 --self-contained true -p:PublishAot=false -p:RuntimeIdentifiers=linux-x64 -o /app/lib/nonblockinglife

```


* **確保程式碼被複製進沙箱**：
在 `.yml` 的 `sources` 中，要確保把原始碼資料夾包含進去，否則編譯時會找不到檔案：
```yaml
sources:
  - type: dir
    path: .
  - type: dir
    path: src
    dest: src
  - ./nuget-sources.json #這樣，才能引入所有的nuget package

```



---

### 3. 常見大魔王與破解絕招

#### 🔴 大魔王一：離線還原報錯 `NU1301`（找不到 `api.nuget.org`）

* **解法 A（本機測試爽快版）**：
如果是自己在家裡或本機測試，不需要跟離線沙箱死磕。在 `.yml` 模組的 `build-options` 加上網路開關即可瞬間通關：


```yaml
build-args:
  - --share=network

```


* **解法 B（正式上架 Flathub 離線版）**：
使用官方產生器工具來爬取相依性：
```bash
python3 flatpak-dotnet-generator.py -f 25.08 -d 10 nuget-sources.json Nbl.sln

```



#### 🔴 大魔王二：編譯過關，但缺 Linux 執行階段套件

* **現象**：即使有了 `nuget-sources.json`，編譯時還是報錯說找不到 `Microsoft.NETCore.App.Runtime.linux-x64` 或 `Microsoft.AspNetCore.App.Runtime.linux-x64`。
* **解法**：手動把這兩個對應版本的 Linux 平台 Runtime 封裝 `.nupkg` 補進 `nuget-sources.json` 中（記得要算好正確的 `sha512` 雜湊值），就能補上最後一塊拼圖。



---

### 4. 驗證與本機測試指令清單

當你每次修改完 `.yml` 或 `nuget-sources.json` 後，可以用這套標準流程在本機重新建置並啟動：

1. **清除並建置/安裝**：
```bash
flatpak run --command=flathub-build org.flatpak.Builder --install --force-clean com.yescirculation.nonblockinglife.yml

```


2. **直接執行打包好的應用程式**：
```bash
flatpak run com.yescirculation.nonblockinglife

```



把這篇筆記存起來，下次要處理 .NET 跨平台桌面應用（Avalonia / WebView）的 Flatpak 打包時，就能夠秒速抓到重點了！