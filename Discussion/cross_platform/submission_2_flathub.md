# 修改成 ManagedBass 之後遇到的問題

## [2026-11-07] ychsue 我把常用的命令放在
[常用的 Flatpak 命令](/desktop/flatpak_commands.md) 的裡面，
其實我也跟reviewer 一樣也覺得雖然 VLC 很全面，但若只是播放音訊，ManagedBass 可能更輕量。
然而，我修改後，如果 uninstall 與 rm 所有相關的，然後登出後登入，
第一次執行 `flatpak run --command=flathub-build org.flatpak.Builder --install io.github.ychsue.nonblockinglife.yml`
會失敗，
再執行第二次，才會成功。
可是這樣，應該過不了 flathub bot 的自動編譯，怎麼辦呢？
我其實是在另一個 [repository](https://github.com/ychsue/flathub) 來發布。我這裡的是測試用的。

我在跑 flatpak install 遇到困難，請問您覺得可以怎麼解決呢？
還是就順應它必須跑兩次，就在 io.github.ychsue.nonblockinglife.yml 裡面壞掉的地方丟掉第一次的錯誤，讓它再跑第二次？

---

## [2026-11-07] GitHub Copilot 的回覆

我會先對照打包筆記、manifest 和現有建置紀錄，釐清第一次失敗的位置與第二次成功的條件，再判斷是否適合重試或應修正根因。


Ran terminal command: git status --short; ls -lh desktop/*log desktop/nuget-sources.json; flatpak --version; flatpak info org.flatpak.Builder 2>/dev/null | sed -n '1,30p'


Ran terminal command: for f in 'desktop/flatpak fail.log' desktop/flatpak.log desktop/flatpak_success.log desktop/build_network.log; do printf '\n===== %s =====\n' "$f"; grep -inE '(^|[[:space:]])(error|failed|failure|exception)|NU[0-9]{4}|error:|failed:|找不到' "$f" | head -35 | cut -c 1-400; printf '\n--- last 35 lines ---\n'; tail -35 "$f" | cut -c 1-500; done


Ran terminal command: flatpak run --command=flathub-build org.flatpak.Builder --help | head -100; printf '\nBuilder filesystem permissions:\n'; flatpak info --show-permissions org.flatpak.Builder

Ran terminal command: ls -la desktop | grep -E 'flatpak|builddir|build-dir|repo'; ls -la desktop/.flatpak-builder 2>/dev/null | head -30; ls -la desktop/builddir 2>/dev/null | head -30

Search for `error |error:|failed|FAILED|NU[0-9]{4}|error MSB|MSB[0-9]+|Unable to|No such ...`


Ran terminal command: stat -c '%y %n' 'desktop/flatpak fail.log' desktop/flatpak.log desktop/flatpak_commands.md desktop/io.github.ychsue.nonblockinglife.yml desktop/src/Nbl.Desktop/Nbl.Desktop.csproj desktop/src/Nbl.Bridge/Nbl.Bridge.csproj; grep -nE 'error |NETSDK|Succeeded|succeeded|成功|完成|Cache hit|Starting build|Starting.*module|restore|publish' desktop/flatpak.log | tail -40 | cut -c 1-280


Ran terminal command: nl -ba desktop/io.github.ychsue.nonblockinglife.yml | sed -n '30,88p'; nl -ba 'desktop/flatpak fail.log' | tail -15; nl -ba desktop/flatpak.log | tail -18

Ran terminal command: git ls-files desktop/runtimes desktop/src/Nbl.Desktop/obj desktop/src/Nbl.Bridge/obj | head -25; printf '\nProject native files:\n'; ls -lh desktop/runtimes/un4seen/libs/x86_64/libbass.so desktop/runtimes/un4seen/libs/x86_64/libbassflac.so; git check-ignore -v desktop/runtimes/un4seen/libs/x86_64/libbass.so desktop/src/Nbl.Desktop/obj/project.assets.json

現有失敗紀錄指出問題發生在 `dotnet publish`，不是 `flatpak install` 本身；而成功紀錄與失敗紀錄的 publish 參數並不相同。我會再驗證這個差異，以及是否有本機檔案讓乾淨建置與第二次建置不同。

Ran terminal command: ls -ld desktop/.flatpak-builder/build/NonBlockingLife-*/nuget-packages desktop/.flatpak-builder/build/NonBlockingLife-*/nuget-sources 2>/dev/null; grep -nE 'Building module|error NETSDK1047|Running: dotnet publish|Nbl.Bridge ->|Nbl.Desktop ->|export|Installing|Installation complete' 'desktop/flatpak fail.log' desktop/flatpak.log | tail -25 | cut -c 1-400; git --no-pager diff -- desktop/io.github.ychsue.nonblockinglife.yml | sed -n '1,150p'

Ran terminal command: git ls-files desktop/runtimes; ls -ld desktop/.flatpak-builder/build/NonBlockingLife-1/runtimes/un4seen/libs/x86_64; ls -la desktop/.flatpak-builder/build/NonBlockingLife-1/src/Nbl.Bridge/obj | head -15; find desktop/.flatpak-builder/build -maxdepth 2 -name nuget-packages -print

我確認到另一個會影響 Flathub 乾淨建置的具體問題：專案檔要求複製本機 `runtimes` 裡的 BASS 函式庫，但這個目錄被 Git 忽略；在隔離環境移除它後，publish 確實失敗。我正在測試避免重複複製的做法。

我不建議吞掉第一次的錯誤再重跑。第二次成功可能依賴第一次留下的建置檔案或快取；Flathub 的乾淨建置不一定有這些狀態，吞錯也會掩蓋真正原因。

我查到**兩個需要分開看待的問題**：

### 1. 現有失敗紀錄：發生在 `dotnet publish`

`flatpak fail.log` 顯示的是 `NETSDK1047`：`Nbl.Bridge` 的 assets 檔缺少 `net10.0/linux-x64` 目標，並非安裝階段失敗。

有趣的是，publish 之前的紀錄顯示 Bridge 的 assets **曾經包含**該目標。失敗紀錄的 publish 命令沒有指定 `RestorePackagesPath`，而後來的`成功紀錄`有指定；目前的 `manifest` 也已包含該參數。

但我用隔離的 Flatpak SDK 環境測試舊參數時，並沒有重現同樣的錯誤。因此**不能斷定這個參數差異就是根因**，也不能確定舊紀錄正是你現在第一次失敗的那次。建議保留目前的 `RestorePackagesPath`，並取得最新的第一次失敗完整紀錄。

### 2. 已確認：乾淨 checkout 會缺少 BASS 檔案

`Nbl.Desktop.csproj` 要從本機 `desktop/runtimes/un4seen/...` 複製兩個 `.so`，但 `.gitignore` 排除了 `desktop/runtimes`。

我在隔離環境移除這些本機檔案後，publish 確實出現 **MSB3030：找不到 libbass.so 和 libbassflac.so**。另一方面，manifest 的 `libbass` 模組已經將它們安裝到 `/app/lib`，所以 Flatpak 建置不應再依賴 checkout 裡的另一份。

建議做法是：

1. 在專案檔的 BASS `ItemGroup` 加條件，例如：

   ```xml
   <ItemGroup Condition="'$(NblUseSystemBass)' != 'true'">
   ```

2. Flatpak 的 `dotnet publish` 加上：

   ```text
   -p:NblUseSystemBass=true
   ```

這會讓一般本機建置維持原有複製行為，Flatpak 則使用 manifest 安裝的 `/app/lib` 函式庫。我已在**暫存專案**驗證這個條件可讓缺少本機 `runtimes` 的 publish 通過；但還沒驗證完整 Flatpak 打包及播放音效，也沒有修改你的專案檔。

### 下一步

在包含上述修改的**乾淨、獨立 checkout** 中執行一次不安裝的建置，保留日誌：

```bash
set -o pipefail
flatpak run --command=flathub-build org.flatpak.Builder \
  --disable-cache io.github.ychsue.nonblockinglife.yml 2>&1 | tee first-build.log
```

成功後再測試安裝與播放；Flathub 使用的是另一個 repository，也要確認那邊的 manifest 和來源版本一致。

另外，`flatpak_commands.md` 中刪除 `~/.var/app/io.github.ychsue.nonblockinglife` 的命令會刪掉應用程式資料；**排查建置問題不需要執行它**。

---

## [2026-11-07] ychsue 我已經改了那個 desktop/src/Nbl.Desktop/Nbl.Desktop.csproj 裡面的 ItemGroup 的 condition，也在 desktop/io.github.ychsue.nonblockinglife.yml 加了 `-p:NblUseSystemBass=true`。
rm 之後登出再登入，跑 --disable-cache 那個還是一樣有錯誤訊息。
我是在想，由於我的 desktop/NBL.sln 關聯到 windows 的 build，而 Nbl.Desktop.csproj 有用到 Nbl.Bridge.csproj
還是我們先寫一個給 Linux 的，裡面自然就關聯了 Desktop & Bridge，在 dotnet build （或run)確定能動後，再來改寫 flatpak，您覺得這構想如何？

---

## [2026-11-07] GitHub Copilot（Terra）的補充
不奇怪，現在看起來是**兩個不同階段的問題**：Flatpak 一旦成功建置並安裝，BASS 音效可以正常運作；卡住的是第一次建置時的 NuGet restore 狀態。

我在失敗後留下的 `Desktop assets 檔` 找到很關鍵的線索：

- 它的套件路徑是主機上的 `~/.nuget/packages/`，而不是 manifest 指定的 `/run/build/NonBlockingLife/nuget-packages`。
- 它包含 `net10.0/win-x64` 等目標，卻**沒有** `net10.0/linux-x64`。
- 相對地，`first-build.log` 顯示 Flatpak restore 後曾檢查到 `net10.0/linux-x64`；接著 publish 又報缺少該目標。

這強烈暗示：**Flatpak 的 build 目錄內，有另一個主機端的 restore 產生或覆寫了中間檔**。我看到 VS Code 的 C#／MSBuild 服務正在運行，因此它是值得懷疑的來源，但目前還不能證明一定是它，也不能確定覆寫發生在 publish 前還是之後。

第二次成功可能與快取、建置目錄或時序不同有關；目前沒有足夠證據確定是哪一個。

### 建議驗證

先儲存工作、**完全關閉 VS Code**，在獨立的系統終端機執行一次不安裝、停用快取的建置：

```bash
cd ~/repos/NonBlockingLife/desktop
set -o pipefail

flatpak run --command=flathub-build org.flatpak.Builder \
  --disable-cache io.github.ychsue.nonblockinglife.yml \
  2>&1 | tee /tmp/nbl-flatpak-no-vscode.log
```

這個命令會重建 `builddir` 和 repo 輸出，但不會移除已安裝的應用程式或其資料。若關閉 VS Code 後第一次就成功，會大幅支持主機端工具競爭中間檔的假設；若仍失敗，新的 log 和當下留下的 assets 檔則可繼續查。

我目前沒有修改任何檔案，也沒有再次執行 Flatpak 建置。

---

關閉 VS Code 後，這次 `--disable-cache` 建置成功，接著安裝、執行及播放音效也正常。Flatpak 直接建置 Desktop 專案，而 Desktop 已參照 Bridge；目前不需要另外建立 Linux solution。

先前的 `NETSDK1047` 是 publish 時找不到 `net10.0/linux-x64` 的 restore 資料。失敗後的 assets 檔卻指向主機的 NuGet 目錄，與 Flatpak 的離線 restore 設定不同。**可能**是 VS Code 或其他主機端程序在建置期間改寫了中間檔，但這次也清理了建置狀態並重新登入，因此還不能確定原因；第二次成功也可能受快取或時序影響。

[project.assets.json](\desktop/.flatpak-builder/build/NonBlockingLife-1/src/Nbl.Desktop/obj/project.assets.json) 裡面有我local NuGet 的目錄？

接下來建議：

1. **本 repository**：確認並提交 Desktop 的 BASS 相關修改，包括尚未追蹤的 `BassAudioPlayer.cs`，以及專案檔的 `NblUseSystemBass` 條件。用包含這些修改的乾淨 checkout，關閉 VS Code 後再次執行 `--disable-cache` 建置並測試音效。若要驗證 VS Code 是否干擾，可再開啟 VS Code 做一次對照；不必刪除 `~/.var/app` 中的使用者資料。
2. **Flathub repository**：把 manifest 的應用程式來源更新到包含上述修改的 commit 或 release；同步 `-p:NblUseSystemBass=true`、離線 NuGet 來源及其他必要的打包修改，但保留適合 Flathub 的來源設定，不要直接照搬本機 `type: dir`。確認 `nuget-sources.json` 與該版本相符，再用 Flathub 的乾淨建置與 lint 驗證，成功後提交並觀察 bot 結果。

本機 `dotnet run -r linux-x64` 的無聲問題則與這次 Flatpak 建置錯誤分開處理：測試時設定 BASS 函式庫搜尋路徑後已有聲音。