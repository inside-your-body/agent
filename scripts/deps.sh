#!/bin/bash
# System deps for every job (Nov 5: apt once hung for 8 min and killed a run). apt with short timeouts and retries; if apt still
# fails, fall back to a static ffmpeg build so the episode is never lost. Emoji fonts are nice-to-have only.
for i in 1 2 3; do
  timeout 120 sudo apt-get update -qq && timeout 240 sudo apt-get install -y -qq ffmpeg fonts-noto-color-emoji && exit 0
  echo "apt attempt $i failed"; sleep 10
done
if ! command -v ffmpeg >/dev/null; then
  echo "apt failed -> static ffmpeg"
  curl -sL --retry 3 -o /tmp/ff.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
  mkdir -p /tmp/ff && tar -xJf /tmp/ff.tar.xz -C /tmp/ff --strip-components=1
  sudo cp /tmp/ff/ffmpeg /tmp/ff/ffprobe /usr/local/bin/
fi
command -v ffmpeg
