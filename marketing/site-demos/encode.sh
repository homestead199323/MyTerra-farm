#!/bin/bash
# encode.sh <env> : web copies of a finished demo (the master is re-encoded; nothing is drawn again)
set -e
cd "$(dirname "$0")/out"; e=$1; mkdir -p web
ffmpeg -v error -y -i $e-master.mp4 -an -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.0 -pix_fmt yuv420p -g 90 -movflags +faststart web/demo-$e.part.mp4 && mv web/demo-$e.part.mp4 web/demo-$e.mp4
ffmpeg -v error -y -i $e-master.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -threads 2 -deadline good -cpu-used 2 -g 90 web/demo-$e.part.webm && mv web/demo-$e.part.webm web/demo-$e.webm
# poster: a still from the second chapter (the 3D map), a second and a half in
t=$(python3 -c "import json;d=json.load(open('$e-chapters.json'));print(d['chapters'][${2:-1}]['t']+${3:-2.2})")
ffmpeg -v error -y -ss $t -i $e-master.mp4 -frames:v 1 -c:v libwebp -quality 82 web/demo-$e-poster.webp
ls -la web/demo-$e*
