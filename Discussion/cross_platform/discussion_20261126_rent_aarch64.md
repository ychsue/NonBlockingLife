# 試著租用 AArch64 平台

## [2026-11-26] ychsue 請問一下，我有一個 flathub 的專案  https://github.com/ychsue/flathub/tree/io.github.ychsue.nonblockinglife ，需要 aarch64 上面測試，所以我想說在 azure 上租一台虛擬機，測完就關閉，請問由計畫->實行->檢驗->完成並且停止租用VM(免得一直扣錢)，您可以提出一個類似計畫書嗎？我好評估一下怎麼做，謝謝。

## [2026-11-26] Azure Copilot 的回覆

以下是使用 Azure CLI 來建立、測試和刪除一個用於 aarch64 測試的 Azure 虛擬機的計畫書：

1. **建立虛擬機**：
   - 使用以下命令來建立一個新的 Azure 虛擬機：
     ~~~bash
     az vm create --resource-group <yourResourceGroup> --name <yourVMName> --image <imageName> --size Standard_D2s_v3 --admin-username <yourUsername> --generate-ssh-keys
     ~~~
   - 這個命令會在指定的資源群組中建立一個虛擬機，並自動生成 SSH 金鑰。

2. **測試虛擬機**：
   - 列出虛擬機的 IP 地址以測試連接性：
     ~~~bash
     az vm list-ip-addresses --resource-group <yourResourceGroup> --name <yourVMName> --output table
     ~~~
   - 確保可以通過 SSH 連接到虛擬機進行測試。

3. **停止虛擬機**：
   - 測試完成後，停止虛擬機以避免不必要的費用：
     ~~~bash
     az vm stop --resource-group <yourResourceGroup> --name <yourVMName>
     ~~~

4. **刪除虛擬機**：
   - 測試完成並確認不再需要虛擬機後，刪除它：
     ~~~bash
     az vm delete --resource-group <yourResourceGroup> --name <yourVMName> --no-wait --yes
     ~~~
   - 請注意，這是一個破壞性命令，執行後虛擬機將被永久刪除。

5. **清理資源**：
   - 如果不再需要資源群組中的其他資源，可以刪除整個資源群組：
     ~~~bash
     az group delete --name <yourResourceGroup> --no-wait --yes
     ~~~
   - 這將刪除資源群組及其所有包含的資源。

請根據您的需求替換命令中的參數，例如 `<yourResourceGroup>`、`<yourVMName>`、`<imageName>` 和 `<yourUsername>`。這樣可以確保您能夠有效地管理虛擬機的生命週期，並避免不必要的費用。

## [2026-11-26] Gemini 的回答

要在 Azure 上開一台 ARM64 (`aarch64`) 虛擬機來測試 `io.github.ychsue.nonblockinglife` 的 Flatpak 建置與執行，最關鍵的財務原則是：**「測完不是只關機，而是刪除整個 Resource Group（含 OS Disk 與網路資源）」**。在 Azure 中，若只從 OS 內關機（`Stopped`）仍會收運算費；即便做到 `Stopped (deallocated)` 停掉運算費，硬碟（Managed Disk）與保留的 IP 仍會持續計費。

以下為你整理一份可直接照著執行的「Azure ARM64 Flatpak 測試與防扣款計畫書」：

---

## 一、 計畫階段（Plan）：規格、成本與防呆設計

### 1. 建議的 VM 規格與作業系統

* **架構與機型系列**：選擇 Azure Arm64（Ampere Altra）機型，例如通用型 `Standard_D2ps_v5`（2 vCPU / 8 GiB RAM，跑 `.NET` 編譯與 `flatpak-builder` 較充裕）或可突發的 `Bpsv2` 系列（視你的訂閱與區域配額可用性而定）。
* **作業系統**：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS（Arm64 映像檔），方便安裝 `flatpak`、`flatpak-builder` 與桌面/虛擬顯示工具。
* **磁碟選擇**：選用夠用的標準/一般 SSD（例如 30～64 GB），測試完直接整組刪除，避免留下孤兒磁碟。

### 2. 事前防呆與時間控管

* **獨立 Resource Group**：所有資源（VM、磁碟、網卡、公用 IP）全部放進同一個專用資源群組，例如 `rg-flatpak-arm64-test`。結束時只要刪掉這個 Resource Group，就不會漏掉附屬資源。
* **設定測試時限**：建議把建機、裝環境、跑測試、抓 Log 壓縮在 **1～2 小時內完成**，測試結束立刻拆機。
* **確認測試目標**：對齊你的 manifest 與相依檔（例如 `io.github.ychsue.nonblockinglife.yml` 與 `nuget-sources*.json`），確認 `aarch64` 建置能否通過、Flatpak 安裝後啟動與核心功能是否正常。



---

## 二、 實行階段（Execute）：建機、建置與測試流程

### 1. 建立 VM 與連線

1. 在 Azure Portal（或用 Azure CLI）建立 `rg-flatpak-arm64-test`，挑選支援 Arm64 VM 的區域並建立 Ubuntu Arm64 虛擬機（建議使用 SSH 金鑰登入）。
2. 透過 SSH 連入 VM，先更新套件並安裝 Flatpak 建置與測試所需工具：


```bash
sudo apt update
sudo apt install -y git flatpak flatpak-builder xvfb dbus-x11

```


(若需要看實際圖形介面，也可視需求安裝輕量桌面/遠端連線工具，或直接以 `xvfb-run` 做啟動與 log 驗證。)



### 2. 準備 Manifest 與拉取程式碼

1. 取得你的分支或檔案（例如 `[https://github.com/ychsue/flathub/tree/io.github.ychsue.nonblockinglife](https://github.com/ychsue/flathub/tree/io.github.ychsue.nonblockinglife)` 中的 manifest 與 `nuget-sources*.json`），並確認上游原始碼來源（例如 `[https://github.com/ychsue/NonBlockingLife](https://github.com/ychsue/NonBlockingLife)`）與分支/tag 一致。


2. 確認沒有把 `flathub.json` 寫死只允許 `x86_64`（若要測 `aarch64` 建置，需確保架構設定已放開或對應正確）。



### 3. 安裝 Runtime 並執行建置

1. 加入 Flathub 並安裝你的 `.yml` 對應的 Runtime、SDK 與 `.NET` Extension（例如 `org.gnome.Platform`、`org.gnome.Sdk`、`org.freedesktop.Sdk.Extension.dotnet10`）：


```bash
flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak --user install -y flathub <你的Runtime> <你的SDK> <你的DotnetExtension>

```


2. 執行 `flatpak-builder` 建置並安裝到 `--user`：
```bash
flatpak-builder --user --install --force-clean build-dir io.github.ychsue.nonblockinglife.yml

```


3. 若遇到編譯或 NuGet / 原生庫（如 `libbass.so` 或其他 `.so`）錯誤，把完整終端機輸出存成 log 檔備查。



---

## 三、 檢驗階段（Verify）：確認能編、能裝、能跑

建議分三層快速驗收，避免只看「有編過」就收工：

* **建置與打包檢查**：`flatpak-builder` 是否完整跑完且沒有缺少 `aarch64` 套件或路徑錯誤。


* **啟動冒煙測試（Smoke Test）**：執行 `flatpak run io.github.ychsue.nonblockinglife`（或在無桌面環境下用 `xvfb-run -a flatpak run io.github.ychsue.nonblockinglife` 搭配逾時測試），觀察是否秒退、Core Dump 或缺少動態函式庫。


* **功能與 Log 檢核**：確認視窗初始化、核心功能與音效/檔案路徑行為是否正常，並把關鍵錯誤訊息與測試結論整理下來，方便之後回覆 Flathub PR 或決定是否保留 `aarch64` 支援。



---

## 四、 完成與停止租用階段（Cleanup & Stop Billing）：徹底停止扣款

測試完成、Log 也確認拿回本機後，請務必依以下步驟**徹底刪除資源**，不要只按關機：

1. **刪除整個 Resource Group（最保險）**：
* 在 Azure Portal 前往 `rg-flatpak-arm64-test`，點選 **Delete resource group**，輸入資源群組名稱確認刪除。
* 或使用 Azure CLI 執行：
```bash
az group delete --name rg-flatpak-arm64-test --yes --no-wait

```




2. **二次確認殘留資源**：
* 幾分鐘後回到 Azure Portal 檢查 `rg-flatpak-arm64-test` 是否已消失；若你是把 VM 建在既有 Resource Group 裡，務必個別確認 **Virtual machine、OS Disk（受控磁碟）、Public IP address、Network interface** 都已刪除。


3. **檢查 Cost Management**：
* 隔天或稍後至 **Cost Management + Billing（成本管理與計費）** 查看該資源群組的帳單曲線是否已歸零/持平（注意 Azure 成本報表有時會有數小時延遲）。



---

你這次在 Azure 上主要是打算先跑通 **`flatpak-builder` 建置與 `xvfb-run` 啟動測試**，還是也需要裝桌面環境實際操作畫面？如果有貼出你目前 `io.github.ychsue.nonblockinglife.yml` 的 `sources` 與 `build-commands` 段落，我可以幫你先檢查有沒有 `aarch64` 路徑或架構變數的潛在問題。

## [2026-11-26] ychsue 
1. 所以，為了快速建置，我是否盡量使用 az 來管理租用、啟動、安裝、測試、UAT、以及最後的清理？這樣，我就可以把他們寫在一個列表，一個階段執行一條即可？
2. 然後也有個 SOP，類似這個 `flatpak_commands.md` ，進到 VM 安裝時，就按照這個一步一步安裝？
3. 遠端有辦法做UAT測試嗎？也是先寫出一個 script 我在遠端執行對接 VM，模擬使用者操作流程，確認功能是否正常？
4. 這樣，需要先準備哪些檔案呢？ (az 創建, 我進去部署, 遠端登入啟動， az 清理資源(就是退租啦))  還有甚麼要注意的呢？這樣，整趟大約會花多少錢呢？

## [2026-11-26] Gemini 的規劃

這四個問題切得非常務實，把「自動化指令」、「人工/半自動安裝 SOP」、「遠端 UAT 驗證」與「檔案準備／成本控管」都拆開來了。下面逐題給你最直接可落地的做法與估算：

---

### 1. 盡量用 `az` 串成「每階段一條指令」可以嗎？

**可以，而且非常推薦！** 把「建群組、開機、查 IP、刪群組」全部寫成 `az` 指令（甚至包成一個本機小腳本），好處是**可重現、不容易漏掉附屬資源、最後一鍵退租**。
不過要注意一個分界：**「租用／查狀態／清理」適合用 `az`；「安裝 runtime、跑 `flatpak-builder`、執行 App 測試」則建議用 `ssh` 連進 VM 執行**（`az vm run-command` 雖然也能遠端下指令，但互動性、看即時建置進度與抓 log 都不如直接 `ssh` 直覺）。

每階段代表性的 `az` 指令可以長這樣（假設資源群組叫 `rg-nbl-arm64`、VM 叫 `vm-nbl-arm64`）：

* **租用與啟動**：
```bash
az group create --name rg-nbl-arm64 --location eastus && \
az vm create --resource-group rg-nbl-arm64 --name vm-nbl-arm64 \
  --image Canonical:ubuntu-24_04-lts-arm64:server:latest \
  --size Standard_D2ps_v5 --admin-username azureuser --generate-ssh-keys

```


* **查詢連線 IP**：
```bash
az vm show -d --resource-group rg-nbl-arm64 --name vm-nbl-arm64 --query publicIps -o tsv

```


* **完成並停止租用（退租）**：
```bash
az group delete --name rg-nbl-arm64 --yes --no-wait

```



---

### 2. 進到 VM 安裝時，照著 `flatpak_commands.md` 一步步做可行嗎？

**非常可行，而且建議把 `flatpak_commands.md` 寫成「可複製貼上的分段步驟 + 檢查點」**，而不是整份盲目全貼。
因為第一次跑 `aarch64` 建置時，你很可能會遇到：

* Runtime / SDK / `.NET` extension 版本號對齊問題
* 專案裡是否有寫死 `linux-x64` 或架構相關參數需要調整


* 缺少原生相依庫（如 `libbass.so` / `gst-launch-1.0` / `vlc` / `WebKitGTK` / `SkiaSharp` 等）導致編譯或啟動失敗



一份好用的 `flatpak_commands.md` 建議包含四段：

1. **環境與 Flatpak 初始化**（裝 `flatpak`、`flatpak-builder`、`xvfb`、加 Flathub remote、裝對應 `aarch64` runtime/SDK）


2. **取得程式碼與 manifest**（抓你的 `feature/flatpak` 分支或對應目錄，確認 `./nuget-sources.json` 等路徑正確）


3. **執行建置與安裝**（`flatpak-builder --user --install --force-clean ...` 並把輸出導到 log 檔）
4. **啟動與錯誤排查指令**（先用 `xvfb-run` 測是否秒退、看 log 是否有缺 `.so` 或例外）

---

### 3. 遠端有辦法做 UAT 測試嗎？可以寫 script 遠端對接 VM 模擬操作嗎？

**可以做到「自動化 Smoke Test / CLI / Log 驗證」，但若是「Avalonia 圖形介面（GUI）的完整使用者操作流程（點按鈕、看畫面排版、聽音效）」，純遠端 script 只能測一半：**

* **遠端 script 能做的事（適合自動化與回歸驗證）**：
* 透過 SSH 在 VM 上用 `xvfb-run` 啟動你的 Flatpak App、跑指定參數或測試指令、檢查 exit code 與 stdout/stderr log 是否有 crash 或缺少相依庫。


* 檢查設定檔、資料目錄、同步/網路或音效初始化回傳狀態（例如 headless 環境下無音效卡時的初始化行為是否符合預期而非閃退）。




* **需要「人眼 / 桌面畫面」補齊的 UAT**：
* 因為是桌面 GUI 程式（Avalonia），視窗是否真的畫出來、版面是否錯亂、互動流程是否順暢，**最可靠的還是你在遠端連上桌面看一眼操作**（或搭配桌面工具/截圖查看），測完有問題再改 manifest 或程式碼，重跑建置即可。



---

### 4. 需要準備哪些檔案？注意事項與整趟花費估算？

#### （1）建議準備的本機檔案清單

* `azure_vm_flow.sh`：放 `az` 建機、查 IP、刪 Resource Group 的指令，避免手動打錯字或忘記刪群組。
* `flatpak_commands.md`：進 VM 後逐步執行的建置、安裝與除錯指令手冊。
* `uat_smoke_test.sh`：放遠端透過 `ssh` 呼叫 VM 執行的自動化驗證腳本（跑啟動測試、抓 log、打包結果回傳本機）。
* 你的 Flatpak 打包檔案（例如 manifest `.yml`、`./nuget-sources.json`、desktop/icon 等），確保在 `aarch64` 路徑與架構設定上已準備好。



#### （2）執行時最重要的注意事項

* **一定要「刪 Resource Group」才算退租**：只關機仍會計費；刪掉整個 Resource Group 才能把 VM、OS Disk、Public IP、NSG、VNet 一次清乾淨。
* **確認區域與 ARM64 配額**：不同 Azure 區域的 Arm64 機型（如 `Dpsv5`、`Bpsv2`）價格與配額不同，建機前先挑好支援的區域。
* **先測建置鏈再測功能**：若 manifest 還在調整 `aarch64` 建置，先求 `flatpak-builder` 成功產出並安裝，再做啟動與 UAT，排錯會快很多。
* **留意帳號額度與帳單延遲**：若你有 Azure 試用金/抵免額度，會先從額度扣；且 Cost Management 報表可能延遲數小時才顯示最新用量。

#### （3）整趟大約會花多少錢？

以測試用 ARM64 機型（例如 `Standard_D2ps_v5` 2 vCPU / 8 GiB RAM 或 `Bpsv2` 系列，加上小容量 OS Disk 與少量網路流量）來算，在 **按量計費（Pay-as-you-go）** 下：

* 每小時運算＋磁碟＋網路綜合成本大約在 **數十美分以內（約新台幣幾塊錢到十幾塊錢/小時等級，視機型與區域而定）**。
* 如果你把建機、裝環境、建置、UAT 與抓 log 控制在 **1～2 小時內完成並立刻刪除 Resource Group**，**整趟總花費通常只有約新台幣幾元到幾十元之間**（若忘記刪機讓它一路開著，才會變成按天甚至按月累積）。

你目前打算在 `flatpak_commands.md` 裡先建置哪一個 manifest 檔案（例如 `io.github.ychsue.nonblockinglife.yml`）？如果有需要，我可以幫你把 `azure_vm_flow.sh` 和 `uat_smoke_test.sh` 的草稿直接寫出來。

## [2026-11-26] ychsue 那麼，這三個檔案，麻煩您先寫 azure_vm_flow.sh 好了。請問，看起來，裡面只有一個變數我需要去查，那就是 admin-username 吧？我從來沒用 az跑過，還是直接在 portal.azure.com 上面跑即可？

## [2026-11-26] Gemini azure_vm_flow.sh 規劃

先直接回答你關於 `admin-username` 與 `az` vs `portal.azure.com` 的問題，再提供 `azure_vm_flow.sh` 草稿：

1. **關於 `admin-username**`：不用去「查」既有的值，而是「自己取一個合法的使用者名稱」（例如 `azureuser` 或 `nbltest`），在 `az vm create` 時建立該帳號；若加上 `--generate-ssh-keys`，Azure CLI 還會順便幫你在本機 `~/.ssh/` 產生 SSH 金鑰對並自動綁定，之後就能直接用 `ssh <admin-username>@<公用IP>` 登入。
2. **用 `az` 還是 `portal.azure.com`？**
* **建議裝好並登入 `az`（Azure CLI）在終端機跑 `azure_vm_flow.sh**`。好處是每一步都可重現、能直接印出公用 IP、最後一鍵 `az group delete` 整群清掉不容易漏掉磁碟或 IP。
* **Portal 則當作「肉眼二次確認（保險）」**：尤其是第一次用時，建完與退租後可以打開 `portal.azure.com` 看一眼 Resource Group 有沒有在、退租後有沒有消失，心裡會更踏實。
* *(小提醒：建機前若不確定哪個區域有 Arm64 機型配額，可先跑 `az vm list-skus --location eastus --size Standard_D2ps_v5 --output table` 確認一下。)*



---

### `azure_vm_flow.sh` 草稿

你可以存成 `azure_vm_flow.sh`（並執行 `chmod +x azure_vm_flow.sh`），透過 `./azure_vm_flow.sh <子指令>` 分階段執行：

```bash
#!/usr/bin/env bash
set -euo pipefail

# ====== 可自行調整的變數區 ======
RG_NAME="${RG_NAME:-rg-nbl-arm64}"
VM_NAME="${VM_NAME:-vm-nbl-arm64}"
LOCATION="${LOCATION:-eastus}"
VM_SIZE="${VM_SIZE:-Standard_D2ps_v5}"
ADMIN_USER="${ADMIN_USER:-azureuser}"
IMAGE="${IMAGE:-Canonical:ubuntu-24_04-lts-arm64:server:latest}"
# =================================

usage() {
  cat <<'EOF'
用法：
  ./azure_vm_flow.sh check-login   # 檢查 az 登入狀態與目前訂閱
  ./azure_vm_flow.sh check-sku     # 查詢指定區域與機型是否有可用配額
  ./azure_vm_flow.sh up            # 建立 Resource Group 與 ARM64 VM（含 SSH 金鑰）
  ./azure_vm_flow.sh ip            # 查詢 VM 公用 IP 與 SSH 連線指令
  ./azure_vm_flow.sh status        # 查看 VM 目前狀態
  ./azure_vm_flow.sh down          # 刪除整個 Resource Group（停止租用 / 停止計費）
EOF
}

cmd="${1:-}"
case "$cmd" in
  check-login)
    az account show --output table
    ;;

  check-sku)
    az vm list-skus \
      --location "$LOCATION" \
      --size "$VM_SIZE" \
      --all \
      --output table
    ;;

  up)
    echo "[1/2] 建立 Resource Group: $RG_NAME ($LOCATION)..."
    az group create \
      --name "$RG_NAME" \
      --location "$LOCATION" \
      --output table

    echo "[2/2] 建立 ARM64 VM: $VM_NAME ($VM_SIZE)..."
    az vm create \
      --resource-group "$RG_NAME" \
      --name "$VM_NAME" \
      --image "$IMAGE" \
      --size "$VM_SIZE" \
      --admin-username "$ADMIN_USER" \
      --generate-ssh-keys \
      --public-ip-sku Standard \
      --output table

    echo "建機完成！取得 IP 中..."
    "$0" ip
    ;;

  ip)
    IP="$(az vm show -d \
      --resource-group "$RG_NAME" \
      --name "$VM_NAME" \
      --query publicIps \
      -o tsv)"
    echo "Public IP: ${IP:-<尚未分配或已刪除>}"
    if [ -n "${IP:-}" ]; then
      echo "SSH 連線指令：ssh ${ADMIN_USER}@${IP}"
    fi
    ;;

  status)
    az vm get-instance-view \
      --resource-group "$RG_NAME" \
      --name "$VM_NAME" \
      --query "instanceView.statuses[?starts_with(code, 'PowerState/')].displayStatus" \
      -o tsv
    ;;

  down)
    echo "即將刪除整個 Resource Group（含 VM、OS Disk、Public IP、網路資源）：$RG_NAME"
    az group delete \
      --name "$RG_NAME" \
      --yes \
      --no-wait
    echo "已送出刪除指令（背景清理中）。請稍後至 Azure Portal 或用 'az group exists -n $RG_NAME' 確認是否已移除。"
    ;;

  *)
    usage
    exit 1
    ;;
esac

```

---

### 建議的執行順序小抄

1. 本機先登入 Azure：`az login`
2. 確認帳號與配額：`./azure_vm_flow.sh check-login` 與 `./azure_vm_flow.sh check-sku`
3. 開機：`./azure_vm_flow.sh up`（拿到輸出的 `ssh azureuser@...` 後直接連進去）
4. 進 VM 照 `flatpak_commands.md` 建置、安裝與測試
5. 測試結束回本機退租：`./azure_vm_flow.sh down`

你本機目前已經裝好 `az` CLI 了嗎？如果還沒裝或想改用 `eastasia` / `japaneast` 等區域，告訴我你要哪個區域，我幫你把預設值順便調好，接著再寫 `flatpak_commands.md` 或 `uat_smoke_test.sh`。

### Ubuntu 上安裝 az CLI

```bash
## 安裝依賴
sudo apt update
sudo apt install -y ca-certificates curl apt-transport-https lsb-release gnupg
## 導入 Microsoft GPG 金鑰與 Azure CLI 軟體源
curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/microsoft.gpg > /dev/null
## 設定 Azure CLI 軟體源
AZ_REPO=$(lsb_release -cs)
echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | sudo tee /etc/apt/sources.list.d/azure-cli.list
## 安裝 Azure CLI
sudo apt update
sudo apt install -y azure-cli
## 驗證安裝是否成功
az --version
```

然後跑
```bash
az login --use-device-code  # 因為我是使用 Windows Ubuntu 子系統，無法直接開瀏覽器登入
```
然後回到 windows 打開該網址完成登入。

## [2026-11-26] ychsue 檢查完 japaneast 有可用的 Standard_D2ps_v5 配額，接著就要在 VM 上面安裝了，可以寫個輔助指令集在 VM 上執行 Flatpak 建置與測試嗎？

## [2026-11-26] Gemini 關於 vm_commands.sh

先直接回答你關於流程與 UAT 的確認：

1. **流程順序完全正確**：進 VM 後 → 裝基礎套件（`git`、`flatpak`、`xvfb`、`dbus-x11`、`file` 等） → 加 Flathub 與安裝 `org.flatpak.Builder`、`org.gnome.Platform//51`、`org.gnome.Sdk//51`、`org.freedesktop.Sdk.Extension.dotnet10//26.08` → `git clone` 你的 Flathub 分支並用 `org.flatpak.Builder` 建置安裝 → 檢查安裝後產出的執行檔確實是 `ARM aarch64` → 跑 headless `xvfb-run` Smoke Test。


2. **UAT 指令在哪裡跑？**
* **「連線到 VM（例如開 SSH 視窗或遠端桌面 / X11 forwarding）」的指令是在你本機（Windows / WSL）執行**。
* **真正啟動 GUI 視窗讓你點按鈕、看畫面、操作功能（UAT）的指令（`flatpak run io.github.ychsue.nonblockinglife`）是在連上 VM 的那個終端機或遠端桌面裡執行**（除非你用 `ssh -X` 或遠端桌面，否則畫面不會自己跳回 Windows）。
* 為了讓你少裝一整套沉重的 Ubuntu Desktop，下面 `vm_commands.sh` 我順便幫你準備了最輕量的 **Xfce + xrdp（遠端桌面）** 選項：需要做人工 GUI UAT 時，只要跑 `./vm_commands.sh gui`，就能直接用 Windows 內建的「遠端桌面連線（mstsc）」輸入 VM IP 連進去開視窗操作！



---

### `vm_commands.sh`（上傳或貼到 Azure VM 執行）

你可以存成 `vm_commands.sh`（`chmod +x vm_commands.sh`），照順序分階段跑 `./vm_commands.sh <步驟>`：

```bash
#!/usr/bin/env bash
set -euo pipefail

# ====== 專案與 Flatpak 設定 ======
FLATHUB_REPO_URL="${FLATHUB_REPO_URL:-https://github.com/ychsue/flathub.git}"
FLATHUB_BRANCH="${FLATHUB_BRANCH:-io.github.ychsue.nonblockinglife}"
APP_ID="io.github.ychsue.nonblockinglife"
MANIFEST="${APP_ID}.yml"
WORK_DIR="${WORK_DIR:-$HOME/flathub-test}"

# 對齊 io.github.ychsue.nonblockinglife.yml 的版本
RUNTIME="org.gnome.Platform//51"
SDK="org.gnome.Sdk//51"
DOTNET_EXT="org.freedesktop.Sdk.Extension.dotnet10//26.08"
BUILDER_APP="org.flatpak.Builder"
# =================================

usage() {
  cat <<'EOF'
用法（請依序在 Azure ARM64 VM 上執行）：
  ./vm_commands.sh setup-os      # 1. 安裝系統基礎套件 (git, flatpak, xvfb, file 等)
  ./vm_commands.sh setup-flatpak # 2. 加入 Flathub 並安裝 Builder / GNOME 51 / dotnet10
  ./vm_commands.sh fetch         # 3. 抓回你的 flathub 分支程式碼並檢查架構設定
  ./vm_commands.sh build         # 4. 清理舊檔、執行 lint 並建置安裝 Flatpak
  ./vm_commands.sh verify-arch   # 5. 驗證安裝出的執行檔確實為 aarch64
  ./vm_commands.sh smoke         # 6. 無頭模式 (xvfb-run) 啟動冒煙測試與抓 log
  ./vm_commands.sh gui           # 7. (選用) 安裝輕量 Xfce + xrdp，供 Windows 遠端桌面做 GUI UAT
EOF
}

cmd="${1:-}"
case "$cmd" in
  setup-os)
    echo "[1/7] 確認主機架構與安裝系統套件..."
    uname -m
    sudo apt-get update
    sudo apt-get install -y git flatpak xvfb dbus-x11 file curl ca-certificates
    ;;

  setup-flatpak)
    echo "[2/7] 加入 Flathub (user) 並安裝 Runtime / SDK / dotnet10 / Builder..."
    flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    flatpak install -y --user flathub \
      "$BUILDER_APP" \
      "$RUNTIME" \
      "$SDK" \
      "$DOTNET_EXT"
    flatpak list --user
    ;;

  fetch)
    echo "[3/7] 取得 Flathub 分支: $FLATHUB_BRANCH ..."
    rm -rf "$WORK_DIR"
    git clone --branch "$FLATHUB_BRANCH" --single-branch "$FLATHUB_REPO_URL" "$WORK_DIR"
    cd "$WORK_DIR"
    ls -la
    if [ -f flathub.json ]; then
      echo "--- 檢查 flathub.json（確認未擋掉 aarch64）---"
      cat flathub.json
    fi
    ;;

  build)
    echo "[4/7] 清理舊建置、檢查 manifest 並開始建置..."
    cd "$WORK_DIR"
    flatpak uninstall -y --user "$APP_ID" 2>/dev/null || true
    rm -rf ~/.var/app/"$APP_ID" build-dir builddir repo .flatpak-builder

    echo "--- 執行 flatpak-builder-lint (manifest) ---"
    flatpak run --command=flatpak-builder-lint "$BUILDER_APP" manifest "$MANIFEST" || true

    echo "--- 執行 org.flatpak.Builder 建置並安裝到 --user ---"
    flatpak run "$BUILDER_APP" --user --install --force-clean build-dir "$MANIFEST" 2>&1 | tee build.log
    echo "建置完成！完整紀錄已存至: $WORK_DIR/build.log"
    ;;

  verify-arch)
    echo "[5/7] 驗證安裝結果與二進位檔架構..."
    flatpak info --user "$APP_ID"
    APP_DEPLOY="$(flatpak info --show-location --user "$APP_ID")/files"
    echo "--- 檢查主要執行檔架構（預期看到 ARM aarch64）---"
    file -L "$APP_DEPLOY/bin/$APP_ID"
    if [ -f "$APP_DEPLOY/lib/nonblockinglife/Nbl.Desktop" ]; then
      file "$APP_DEPLOY/lib/nonblockinglife/Nbl.Desktop"
    fi
    ;;

  smoke)
    echo "[6/7] 執行 headless 冒煙測試（15 秒逾時觀察是否閃退或缺 .so）..."
    set +e
    timeout 15s xvfb-run -a flatpak run --user "$APP_ID" > "$WORK_DIR/smoke.log" 2>&1
    EXIT_CODE=$?
    set -e
    echo "Smoke test exit code: $EXIT_CODE（124 代表撐滿 15 秒未閃退；非 0 且非 124 請檢查 log）"
    echo "--- smoke.log 輸出 ---"
    cat "$WORK_DIR/smoke.log"
    ;;

  gui)
    echo "[7/7] 安裝輕量 Xfce 桌面與 xrdp（供 Windows 遠端桌面連線做 GUI UAT）..."
    sudo apt-get install -y xfce4 xfce4-terminal xrdp dbus-x11
    echo "xfce4-session" > ~/.xsession
    sudo systemctl enable --now xrdp
    echo "請設定目前使用者密碼（xrdp 登入用）："
    sudo passwd "$USER"
    echo "設定完成！請在 Windows 開啟「遠端桌面連線」，輸入此 VM 的 Public IP 登入後，開啟終端機執行："
    echo "  flatpak run --user $APP_ID"
    ;;

  *)
    usage
    exit 1
    ;;
esac

```

---

### 本機（WSL）與 VM 之間的連動順序

1. **本機開機與拿 IP**：`./azure_vm_flow.sh up`
2. **把 `vm_commands.sh` 傳進 VM 並登入**（把 `<IP>` 換成上一步印出的 IP）：
```bash
scp vm_commands.sh azureuser@<IP>:~/
ssh azureuser@<IP>

```


3. **在 VM 裡依序跑完 1～6 步**：
```bash
chmod +x ~/vm_commands.sh
./vm_commands.sh setup-os
./vm_commands.sh setup-flatpak
./vm_commands.sh fetch
./vm_commands.sh build
./vm_commands.sh verify-arch
./vm_commands.sh smoke

```


4. **遠端 GUI UAT（如果第 6 步順利、想親眼操作畫面）**：
* 在 VM 執行 `./vm_commands.sh gui` 並設一組臨時密碼。
* 在你 **Windows 本機** 打開「遠端桌面連線（Remote Desktop Connection）」，輸入 VM 的 `<IP>` 登入 Xfce 桌面，開終端機執行 `flatpak run --user io.github.ychsue.nonblockinglife` 進行操作測試。


5. **測完回本機（WSL）立刻退租停扣款**：
```bash
./azure_vm_flow.sh down

```



*(小提醒：看你的 `io.github.ychsue.nonblockinglife.yml` 中使用了 `-p:NblUseSystemBass=true`，若 `build` 或 `smoke` 階段有報缺少 `libbass.so` 或相關依賴，直接把 `build.log` / `smoke.log` 錯誤段落貼上來，我們立刻調整！)*

---

### ychsue 找不到 image 耶？

### Gemini

這個錯誤是因為 `--image` 參數的 `Canonical:ubuntu-24_04-lts-arm64:server:latest` 這個 **URN（Publisher:Offer:Sku:Version）** 寫法不正確，Azure Marketplace 裡找不到對應的映像檔。

### 正確的 Ubuntu 24.04 ARM64 映像檔寫法

在 Azure Marketplace 中，Ubuntu Server 的 Publisher 是 `Canonical`，Offer 通常不是 `ubuntu-24_04-lts-arm64`，而是 **`ubuntu-24_04-lts`**，ARM64 的 SKU 通常是 **`arm64`**（或 **`server_arm64`**，視版本而定）：

* **建議先改用**：
```bash
IMAGE="Canonical:ubuntu-24_04-lts:arm64:latest"

```



---

### 如果這組也不行，用 `az vm image list` 查出確切名稱

你也可以直接在終端機查 `japaneast` 區域目前可用的 Ubuntu ARM64 映像檔，拿最精準的 `urn`：

```bash
az vm image list \
  --location japaneast \
  --publisher Canonical \
  --offer ubuntu-24_04-lts \
  --architecture arm64 \
  --all \
  --query "[].{urn:urn, sku:sku, version:version}" \
  --output table | tail -n 15

```

看到清單後，把 `urn` 欄位裡最新那一筆（例如 `Canonical:ubuntu-24_04-lts:arm64:24.04....` 或 `:latest`）填入 `azure_vm_flow.sh` 的 `IMAGE` 變數即可，再重跑 `./azure_vm_flow.sh up`。

---
經過一番折騰，我得先
```bash
az provider register --namespace Microsoft.Compute
```
一段短時間後
```bash
az vm list-usage --location japaneast --output table | head -n 40
```
這樣才有 Quota 可用，看看列表

然後要查詢哪些可用
``` bash
az vm list-skus \
  --location japaneast \
  --query "[?contains(name, 'D') && contains(name, 'ps_v7') || contains(name, 'dps_v7') || contains(name, 'Dpsv7') || contains(name, 'dpsv7')].{Name:name, Restrictions:restrictions[0].type}" \
  --output table
```