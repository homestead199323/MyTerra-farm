#!/usr/bin/env python3
"""One homepage loop: frames/loop-<id>/ → out/web/loop-<id>.{mp4,webm} + -poster.webp
usage: loops_compose.py <id> [poster_seconds]
540x960, tap marker drawn in, no caption (the line of text is on the page). The last X frames dissolve into
the first X, so the loop restarts without a jump even when the app's state changed during the clip."""
import json, os, subprocess, sys
from PIL import Image
from finger import ease, Finger, draw_finger

ID = sys.argv[1]; ROOT = os.path.dirname(os.path.abspath(__file__))
FR = f"{ROOT}/frames/loop-{ID}"; OUT = f"{ROOT}/out"; WEB = f"{OUT}/web"; os.makedirs(WEB, exist_ok=True)
W, H, FPS, X = 540, 960, 30, 14
ev = json.load(open(f"{FR}/events.json")); n = ev["frames"]; K = W / ev["viewport"]["width"]; finger = Finger(ev)

def frame(f):
    im = Image.open(f"{FR}/{f:05d}.jpg").convert("RGB").resize((W, round(ev["viewport"]["height"] * K)), Image.LANCZOS).crop((0, 0, W, H)).convert("RGBA")
    draw_finger(im, finger.at(f), 0, 0, K, W, H)
    return im.convert("RGB")

master = f"{OUT}/loop-{ID}-master.mp4"
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", str(FPS), master], stdin=subprocess.PIPE)
head = [frame(f) for f in range(X)]
for f in range(X, n):
    im = frame(f); k = f - (n - X)
    if k >= 0: im = Image.blend(im, head[k], ease((k + 1) / (X + 1)))
    enc.stdin.write(im.tobytes())
enc.stdin.close()
if enc.wait() != 0: sys.exit("ffmpeg failed")
dur = (n - X) / FPS
run = lambda *a: subprocess.check_call(["ffmpeg", "-v", "error", "-y", *a])
run("-i", master, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "60", "-movflags", "+faststart", f"{WEB}/loop-{ID}.mp4")
run("-i", master, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-threads", "2", "-deadline", "good", "-cpu-used", "2", "-g", "60", f"{WEB}/loop-{ID}.webm")
pt = float(sys.argv[2]) if len(sys.argv) > 2 else dur * 0.6
run("-ss", str(pt), "-i", master, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", f"{WEB}/loop-{ID}-poster.webp")
print(ID, f"{dur:.1f}s", " ".join(f"{e}={os.path.getsize(f'{WEB}/loop-{ID}{e}') // 1024}kB" for e in (".mp4", ".webm", "-poster.webp")))
