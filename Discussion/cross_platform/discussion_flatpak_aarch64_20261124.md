# 如何測試在 aarch64 上的 Flatpak

## 目前進度：
1. [ ] 使用 GitHub Action [test-flatpak-arm64.yml](/.github/workflows/test-flatpak-arm64.yml) 利用 branch `feature/flatpak` ，然後由 VSCode 的 Action 跑看看。
    - 可能很大吧，還在 Queue當中，畢竟這個要在 aarch64 上面跑，還要有 flatpak xvfb 等環境，恐怕很大吧?

2. [ ] 利用 qemu user mode 在 x86_64 上模擬 aarch64 環境，測試 Flatpak。
``` bash
sudo apt update
sudo apt install -y qemu-user-static binfmt-support flatpak flatpak-builder xvfb dbus-x11

flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

flatpak --user install -y --arch=aarch64 flathub \
  org.gnome.Platform//51 \
  org.gnome.Sdk//51 \
  org.freedesktop.Sdk.Extension.dotnet10//26.08

flatpak-builder --user --install --force-clean --ccache \
  --arch=aarch64 \
  build-dir-arm64 io.github.ychsue.nonblockinglife.yml
```

利用 `--arch=aarch64` 就可以使用 qemu user mode 了，但是，編譯到後來，無論怎麼設定，都會吐出 `core dumped`。

3. [-] 利用 PRi 3B 1GB RAM 測試 Flatpak。
抱歉，無法直接在上面編 flatpak ，因為記憶體應該不夠才對。
- [x] 所以，改成在 x86_64 上編輯時加上 `--arch=aarch64`，再將編譯好的 `Nbl.Desktop` 所在的目錄整個複製到 Raspberry Pi 3B 上測試跑 `./Nbl.Desktop`。可以跑，但是，有點卡。
- [ ] 實際安裝 flatpak 測試。

4. [ ] 去借一台虛擬機器測試 Flatpak。