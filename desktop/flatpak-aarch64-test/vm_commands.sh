#!/usr/bin/env bash
## VM 上執行 Flatpak 建置與測試的輔助指令集
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