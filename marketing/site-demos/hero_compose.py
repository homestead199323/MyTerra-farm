#!/usr/bin/env python3
"""hero_compose.py <h|v> : frames/hero-<fmt>/{balcony,backyard,farm}/ → out/web/hero5-<fmt>.{mp4,webm,webp}
Each space plays for (N - X) frames; over its last X frames the next space fades in, and the farm fades back
into the balcony, so the loop has no jump. With N = 150 and X = 30: 3 x 4 s = 12 s."""
import glob, os, subprocess, sys
from PIL import Image
fmt = sys.argv[1]; ROOT = os.path.dirname(os.path.abspath(__file__)); X, FPS = 30, 30
W, H = (1280, 720) if fmt == "h" else (720, 1280)
segs = [sorted(glob.glob(f"{ROOT}/frames/hero-{fmt}/{e}/*.jpg")) for e in ("balcony", "backyard", "farm")]
N = min(len(s) for s in segs); assert N > 2 * X, "too few frames"; L = N - X
ease = lambda t: t * t * (3 - 2 * t)
load = lambda path: Image.open(path).convert("RGB").resize((W, H), Image.LANCZOS)
os.makedirs(f"{ROOT}/out/web", exist_ok=True); master = f"{ROOT}/out/hero-{fmt}-master.mp4"
if '--encode' not in sys.argv:   # --encode: keep the master, only make the web copies again
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", master], stdin=subprocess.PIPE)
    for f in range(3 * L):
        i, k = divmod(f, L); im = load(segs[i][k + X])
        if k >= L - X: im = Image.blend(im, load(segs[(i + 1) % 3][k - (L - X)]), ease((k - (L - X) + 1) / (X + 1)))
        enc.stdin.write(im.tobytes())
    enc.stdin.close(); assert enc.wait() == 0
o = f"{ROOT}/out/web/hero5-{fmt}"; run = lambda *a: subprocess.check_call(["ffmpeg", "-v", "error", "-y", *a])
crf = 25   # the page's budget is 1.6 MB a copy: step the quality down until the MP4 fits
while True:
    run("-i", master, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "60", "-movflags", "+faststart", o + ".mp4")
    if os.path.getsize(o + ".mp4") <= 1560 * 1024 or crf >= 31: break
    crf += 1
run("-i", master, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "37", "-row-mt", "1", "-threads", "2", "-deadline", "good", "-cpu-used", "2", o + ".webm")
run("-i", master, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", o + ".webp")
print("hero", fmt, 3 * L / FPS, "s", "crf", crf, " ".join(f"{e}={os.path.getsize(o + e) // 1024}kB" for e in (".mp4", ".webm", ".webp")))
