#!/usr/bin/env python3
"""stills_web.py : out/stills/*.png (780x1688, phone at 2x) → out/web/s5-*.webp for the homepage.
Phone frames (hero, know-how) keep the whole screen at 720x1558; the Why cards use the top 780x1080 at 720x997."""
import glob, os
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__)); os.makedirs(f"{ROOT}/out/web", exist_ok=True)
for f in sorted(glob.glob(f"{ROOT}/out/stills/*.png")):
    name = os.path.basename(f)[:-4]; im = Image.open(f).convert("RGB")
    if name.startswith("why-"): im = im.crop((0, 0, 780, 1080)).resize((720, 997), Image.LANCZOS)
    else: im = im.resize((720, 1558), Image.LANCZOS)
    out = f"{ROOT}/out/web/s5-{name}.webp"; im.save(out, "WEBP", quality=80, method=6); print(name, im.size, os.path.getsize(out) // 1024, "kB")
