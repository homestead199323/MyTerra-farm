#!/bin/bash
# placeholders.sh : stand-in media so the new homepage can be built and tested before the real films exist.
# Cut from the OLD footage and stamped "PLACEHOLDER". They are written into public/landing/ and must never be
# committed: record the real ones (README) and they are overwritten file by file.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../../public/landing"
old() { git show "bddde99:public/landing/$1" > "/tmp/ph-$1"; echo "/tmp/ph-$1"; }
F=/usr/share/fonts/opentype/inter/Inter-Bold.otf
stamp="drawtext=fontfile=$F:text='PLACEHOLDER':fontcolor=white:fontsize=h/22:box=1:boxcolor=red@0.85:boxborderw=12:x=(w-text_w)/2:y=h*0.45"
enc() { ffmpeg -v error -y "$@"; }
mk() { # mk <src> <start> <dur> <w:h> <out-base>
  enc -ss $2 -t $3 -i "$1" -an -vf "scale=$4,$stamp" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -movflags +faststart "$5.mp4"
  enc -i "$5.mp4" -an -c:v libvpx-vp9 -b:v 0 -crf 44 -deadline realtime -cpu-used 8 "$5.webm"
}
b=$(old demo-balcony.mp4); y=$(old demo-backyard.mp4); f=$(old demo-farm.mp4)
mk $b 0 34 720:1280 first-minute; enc -ss 12 -i first-minute.mp4 -frames:v 1 -c:v libwebp -quality 70 first-minute-poster.webp
i=0; for id in b-jobs b-growth b-pots; do mk $b $((10 + i * 12)) 8 540:960 loop-$id; i=$((i + 1)); done
i=0; for id in y-build y-eggs y-frost; do mk $y $((10 + i * 12)) 8 540:960 loop-$id; i=$((i + 1)); done
i=0; for id in f-check f-milk f-orchard; do mk $f $((10 + i * 12)) 8 540:960 loop-$id; i=$((i + 1)); done
for id in b-jobs b-growth b-pots y-build y-eggs y-frost f-check f-milk f-orchard; do enc -ss 4 -i loop-$id.mp4 -frames:v 1 -c:v libwebp -quality 70 loop-$id-poster.webp; done
for o in h v; do src=$(old hero4-$o.mp4); if [ $o = h ]; then s=1280:720; else s=720:1280; fi; mk $src 0 12 $s hero5-$o; enc -i hero5-$o.mp4 -frames:v 1 -c:v libwebp -quality 70 hero5-$o.webp; done
st() { enc -i "$(old $1)" -vf "$stamp" -c:v libwebp -quality 70 "$2"; }
st p4-coop.webp s5-hero.webp; st why-jobs.webp s5-why-jobs.webp; st why-map.webp s5-why-map.webp; st why-frost.webp s5-why-frost.webp; st why-all.webp s5-why-all.webp
st p4-ob-plants.webp s5-kh-fit.webp; st p4-plan.webp s5-kh-sow.webp; st p4-guide.webp s5-kh-guide.webp; st p4-assistant.webp s5-kh-ask.webp

# remember what the stand-ins are, so check_media.py can refuse to pass while any of them is still in place
mkdir -p "$HERE/out"; sha256sum first-minute* loop-* hero5-* s5-* > "$HERE/out/placeholders.sha256"
