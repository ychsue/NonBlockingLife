flatpak run --command=flatpak-builder-lint org.flatpak.Builder appstream io.github.ychsue.nonblockinglife.metainfo.xml

flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo

flatpak uninstall io.github.ychsue.nonblockinglife
rm -rf ~/.var/app/io.github.ychsue.nonblockinglife
rm -rf build-dir
rm -rf builddir
rm -rf repo
rm -rf .flatpak-builder

flatpak run org.flatpak.Builder --force-clean build-dir io.github.ychsue.nonblockinglife.yml

flatpak run --command=flathub-build org.flatpak.Builder --install io.github.ychsue.nonblockinglife.yml

## Please `cd pwa; npm run dev` at first so that you can run the app with the development server
flatpak run io.github.ychsue.nonblockinglife --source dev

flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest io.github.ychsue.nonblockinglife.yml

flatpak run --command=flatpak-builder-lint org.flatpak.Builder repo repo

# For debugging
flatpak run --command=sh --devel io.github.ychsue.nonblockinglife
python3 ./flatpak-dotnet-generator.py -f 26.08 -d 10 nuget-sources.json NBL.sln