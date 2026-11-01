flatpak run --command=flatpak-builder-lint org.flatpak.Builder appstream io.github.ychsue.nonblockinglife.metainfo.xml

flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo

flatpak run --command=flathub-build org.flatpak.Builder --install io.github.ychsue.nonblockinglife.yml

flatpak run io.github.ychsue.nonblockinglife

flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest io.github.ychsue.nonblockinglife.yml

flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo