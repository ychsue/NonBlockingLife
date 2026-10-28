#!/usr/bin/env bash
# 用法: ./build-flatpak.sh [build|install|run|uninstall|clean]  (預設 install)
set -euo pipefail
cd "$(dirname "$0")"
APP=com.yescirculation.nonblockinglife
YML=$APP.yml
case "${1:-install}" in
  build)
    flatpak-builder --force-clean --user build-dir "$YML" ;;
  install)
    flatpak-builder --force-clean --user --install --install-deps-from=flathub build-dir "$YML" ;;
  run) flatpak run "$APP" ;;
  uninstall)
    flatpak uninstall --user -y "$APP" || true
    flatpak uninstall --user --unused -y || true ;;
  clean) rm -rf build-dir .flatpak-builder ;;
  *) echo "usage: $0 [build|install|run|uninstall|clean]"; exit 1 ;;
esac

# <沒用> 請記得安裝 sudo apt install gnome-shell-extension-appindicator
# 以便支援系統托盤圖示 (Status Notifier)