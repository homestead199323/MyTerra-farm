#!/bin/bash
# hero_compose.sh <h|v> : loop the push-in. The last second dissolves into the first, so the loop has no jump.
set -e
cd "$(dirname "$0")"; f=$1; mkdir -p out/web
if [ $f = h ]; then size=1280:720; else size=720:1280; fi
n=$(ls frames/hero-$f/*.jpg | wc -l); X=30; keep=$((n - X))
# frames [X, n) play as they are; over the last X frames, the first X frames fade in on top and the last frame is
# frame X-1 on its own, so the restart at frame X is an ordinary step of the camera move (the fade starts one frame early for that)
ffmpeg -v error -y -framerate 30 -i frames/hero-$f/%05d.jpg -filter_complex "[0:v]scale=$size:flags=lanczos,split=2[a][b];[a]trim=start_frame=$X:end_frame=$n,setpts=PTS-STARTPTS[main];[b]trim=start_frame=0:end_frame=$X,setpts=PTS-STARTPTS,tpad=start=1:start_mode=clone[head];[main][head]xfade=transition=fade:duration=$(python3 -c "print($X/30)"):offset=$(python3 -c "print(($keep-$X-1)/30)"),format=yuv420p[v]" -map "[v]" -c:v libx264 -preset slow -crf 16 -r 30 out/hero-$f-master.part.mp4 && mv out/hero-$f-master.part.mp4 out/hero-$f-master.mp4
ffmpeg -v error -y -i out/hero-$f-master.mp4 -an -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p -g 60 -movflags +faststart out/web/hero4-$f.part.mp4 && mv out/web/hero4-$f.part.mp4 out/web/hero4-$f.mp4
ffmpeg -v error -y -i out/hero-$f-master.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 37 -row-mt 1 -threads 2 -deadline good -cpu-used 2 out/web/hero4-$f.part.webm && mv out/web/hero4-$f.part.webm out/web/hero4-$f.webm
ffmpeg -v error -y -i out/hero-$f-master.mp4 -frames:v 1 -c:v libwebp -quality 80 out/web/hero4-$f.webp
ffprobe -v error -show_entries format=duration -of csv=p=0 out/web/hero4-$f.mp4; ls -la out/web/hero4-$f*
