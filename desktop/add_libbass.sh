#!/usr/bin/env bash
mkdir -p runtimes/un4seen/x86_64
mkdir -p runtimes/un4seen/aarch64

# Download the zip file
wget https://www.un4seen.com/files/bass24-linux.zip
unzip bass24-linux.zip -d runtimes/un4seen
wget https://www.un4seen.com/files/bassflac24-linux.zip
unzip bassflac24-linux.zip -d runtimes/un4seen
rm bass24-linux.zip
rm bassflac24-linux.zip