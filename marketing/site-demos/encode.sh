#!/bin/bash
# encode.sh : web copies of the finished film (the master is re-encoded; nothing is drawn again)
# → out/web/first-minute.{mp4,webm} and first-minute-poster.webp. Poster: chapter $1 (default 2, the map), $2 s in.
set -e
cd "$(dirname "$0")/out"; e=first_minute; o=web/first-minute; mkdir -p web
ffmpeg -v error -y -i $e-master.mp4 -an -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.0 -pix_fmt yuv420p -g 90 -movflags +faststart $o.part.mp4 && mv $o.part.mp4 $o.mp4
ffmpeg -v error -y -i $e-master.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -threads 2 -deadline good -cpu-used 2 -g 90 $o.part.webm && mv $o.part.webm $o.webm
t=$(python3 -c "import json;d=json.load(open('$e-chapters.json'));print(d['chapters'][${1:-1}]['t']+${2:-2.2})")
ffmpeg -v error -y -ss $t -i $e-master.mp4 -frames:v 1 -c:v libwebp -quality 82 $o-poster.webp
ls -la $o*
