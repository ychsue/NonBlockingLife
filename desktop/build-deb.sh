#!/usr/bin/env bash
# 建置 Debian 套件，使用目錄 nbl-desktop
# 1. 先 dot publish 到 nbl-desktop/usr/lib/nbl 裡面
dotnet publish src/Nbl.Desktop/Nbl.Desktop.csproj -c Release -r linux-x64 --self-contained true -p:PublishAot=false -p:RuntimeIdentifiers=linux-x64 --no-http-cache --source ./nuget-sources.json -o nbl-desktop/usr/lib/nbl
# 2. 產出 .deb
dpkg-deb --build nbl-desktop