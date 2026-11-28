#!/usr/bin/env bash
## 由本機 Azure CLI 上建立與管理 ARM64 VM 的輔助指令集
set -euo pipefail

# ====== 可自行調整的變數區 ======
RG_NAME="${RG_NAME:-rg-nbl-arm64}"
VM_NAME="${VM_NAME:-vm-nbl-arm64}"
LOCATION="${LOCATION:-japaneast}"
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