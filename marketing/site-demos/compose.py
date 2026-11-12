#!/usr/bin/env python3
"""Edit one demo: phone footage + captions + tap marker → 720x1280 scenes → one MP4, WebM, poster, chapters.
usage: compose.py <env> [--preview N] [--only chapterId]
One encoded file per chapter (same encoder settings), joined with the concat demuxer."""
import json, os, subprocess, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ENV = sys.argv[1]; ARGS = sys.argv[2:]
W, H, FPS = 720, 1280, 30
SX, SY, SW, SH = 56, 226, 608, 1029          # phone screen rect in the video
BEZ, RAD = 8, 40
K = SW / 390.0                                # CSS px → video px
ROOT = os.path.dirname(os.path.abspath(__file__))
FR = f"{ROOT}/frames/{ENV}"; OUT = f"{ROOT}/out"; SC = f"{OUT}/scenes_{ENV}"
os.makedirs(SC, exist_ok=True)
man = json.load(open(f"{FR}/manifest.json")); caps = json.load(open(f"{ROOT}/captions.json"))[ENV]
FONT = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
def font(w, s): return ImageFont.truetype(FONT % w, s)
MINT = (159, 214, 180); WHITE = (255, 255, 255); AMBER = (246, 185, 59)

# ── static background: deep green, soft glow behind the phone, device body with shadow ──
def background():
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    top, bot = (9, 52, 38), (6, 38, 28)
    for y in range(H):
        t = y / (H - 1); c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(W): px[x, y] = c
    glow = Image.new("L", (W, H), 0); ImageDraw.Draw(glow).ellipse((60, 420, W - 60, 1180), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    bg = Image.composite(Image.new("RGB", (W, H), (24, 110, 72)), bg, glow)
    sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle((SX - BEZ, SY - BEZ + 14, SX + SW + BEZ, SY + SH + BEZ + 14), RAD + BEZ, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    bg = Image.composite(Image.new("RGB", (W, H), (0, 14, 9)), bg, sh)
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle((SX - BEZ, SY - BEZ, SX + SW + BEZ, SY + SH + BEZ), RAD + BEZ, fill=(13, 18, 16), outline=(52, 62, 56), width=2)
    return bg
BG = background()
MASK = Image.new("L", (SW, SH), 0); ImageDraw.Draw(MASK).rounded_rectangle((0, 0, SW - 1, SH - 1), RAD, fill=255)

def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def caption_layer(idx, n, title, sub):
    """Kicker + title + sub line(s) for one chapter, on transparent. Sized to stay readable on a phone."""
    im = Image.new("RGBA", (W, SY - BEZ), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    kf = font("Bold", 17)
    d.text((SX, 42), f"{caps['label'].upper()}   {idx + 1} / {n}", font=kf, fill=MINT + (255,))
    size = 44
    while size > 32 and d.textlength(title, font=font("Bold", size)) > SW: size -= 1
    assert d.textlength(title, font=font("Bold", size)) <= SW, "title too long: " + title
    d.text((SX, 68), title, font=font("Bold", size), fill=WHITE + (255,))
    sf = font("Medium", 25.5); y = 68 + 44 + 16
    lines = wrap(d, sub, sf, SW); assert len(lines) <= 2, "caption needs more than two lines: " + sub
    for ln in lines:
        d.text((SX, y), ln, font=sf, fill=(255, 255, 255, 214)); y += 33
    return im

def progress(d, idx, n, frac):
    gap = 7; segw = (SW - gap * (n - 1)) / n; y0, y1 = 22, 27
    for i in range(n):
        x0 = SX + i * (segw + gap)
        d.rounded_rectangle((x0, y0, x0 + segw, y1), 3, fill=(255, 255, 255, 46))
        f = 1.0 if i < idx else (frac if i == idx else 0.0)
        if f > 0: d.rounded_rectangle((x0, y0, x0 + max(5, segw * f), y1), 3, fill=AMBER + (255,))

def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

class Finger:
    """Where the tap marker is on every frame of a take (None = hidden)."""
    def __init__(self, ev):
        self.ev = sorted(ev["events"], key=lambda e: e.get("f", e.get("f0")))
        self.cuts = set(ev.get("cuts", []))
    def seg_start(self, f):
        c = [x for x in self.cuts if x <= f]; return max(c) if c else 0
    def at(self, f):
        """→ (x, y, alpha, press 0..1, ripple 0..1 or None) in CSS px, or None"""
        TRAVEL, LINGER, FADE = 15, 13, 8
        best = None
        for i, e in enumerate(self.ev):
            f0 = e.get("f", e.get("f0")); f1 = e.get("f", e.get("f1"))
            seg = self.seg_start(f0)
            if self.seg_start(f) != seg: continue
            prev = self.ev[i - 1] if i > 0 else None
            if prev is not None and self.seg_start(prev.get("f", prev.get("f1"))) != seg: prev = None
            pend = prev.get("f", prev.get("f1")) if prev else None
            tx, ty = (e["x"], e["y"]) if e["type"] == "tap" else (e["x0"], e["y0"])
            if prev is not None and f0 - pend <= TRAVEL + LINGER + FADE + 10:
                # carries on from where the last touch ended
                px, py = (prev["x"], prev["y"]) if prev["type"] == "tap" else (prev["x1"], prev["y1"])
                start = max(pend + 2, f0 - max(TRAVEL, min(24, f0 - pend - 2))); fresh = False
            else:
                px, py = tx + 46, ty + 86; start = max(seg, f0 - TRAVEL); fresh = True
            if start <= f < f0:
                t = ease((f - start) / max(1, f0 - start))
                a = min(1.0, (f - start + 1) / 5.0) if fresh else 1.0
                return (px + (tx - px) * t, py + (ty - py) * t, a, 0.0, None)
            if e["type"] == "tap":
                if f0 <= f < f0 + LINGER + FADE:
                    k = f - f0; press = max(0.0, 1 - k / 5.0); rip = k / 12.0 if k < 12 else None
                    nxt = self.ev[i + 1] if i + 1 < len(self.ev) else None
                    keep = nxt is not None and self.seg_start(nxt.get("f", nxt.get("f0"))) == seg and nxt.get("f", nxt.get("f0")) - f0 <= TRAVEL + LINGER + FADE + 10
                    a = 1.0 if (k < LINGER or keep) else max(0.0, 1 - (k - LINGER) / FADE)
                    best = (e["x"], e["y"], a, press, rip)
            else:
                if f0 <= f <= f1:
                    t = (f - f0) / max(1, f1 - f0); t = 0.5 - 0.5 * math.cos(math.pi * t)
                    return (e["x0"] + (e["x1"] - e["x0"]) * t, e["y0"] + (e["y1"] - e["y0"]) * t, 1.0, 1.0, None)
                if f1 < f < f1 + FADE:
                    best = (e["x1"], e["y1"], 1 - (f - f1) / FADE, 0.0, None)
        return best

def draw_finger(frame, st):
    if not st: return
    x, y, a, press, rip = st
    if a <= 0.01: return
    cx, cy = SX + x * K, SY + y * K
    if not (SX - 30 <= cx <= SX + SW + 30 and SY - 30 <= cy <= SY + SH + 30): return
    S = 3; R = 80
    lay = Image.new("RGBA", (R * 2 * S, R * 2 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); c = R * S
    if rip is not None:
        rr = (20 + 30 * ease(rip)) * S; al = int(210 * (1 - rip) * a)
        d.ellipse((c - rr - S, c - rr - S, c + rr + S, c + rr + S), outline=(18, 44, 32, al // 2), width=5 * S)
        d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=(255, 255, 255, al), width=3 * S)
    r = (20 - 4 * press) * S
    d.ellipse((c - r - 3 * S, c - r - 1 * S, c + r + 3 * S, c + r + 5 * S), fill=(0, 20, 12, int(46 * a)))
    d.ellipse((c - r, c - r, c + r, c + r), fill=(18, 44, 32, int((118 + 70 * press) * a)), outline=(255, 255, 255, int(245 * a)), width=int(3.2 * S))
    lay = lay.resize((R * 2, R * 2), Image.LANCZOS)
    frame.alpha_composite(lay, (int(round(cx - R)), int(round(cy - R))))

_cache = {}
def screen(take, f):
    key = (take, f)
    if key not in _cache:
        if len(_cache) > 8: _cache.pop(next(iter(_cache)))
        im = Image.open(f"{FR}/{take}/{f:05d}.jpg").convert("RGB").resize((SW, SH), Image.LANCZOS)
        _cache[key] = im
    return _cache[key]

ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "15", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", "60"]
def encoder(path):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", *ENC, path], stdin=subprocess.PIPE)

segs = man["segments"]; N = len(segs)
for s in segs: s["title"], s["sub"] = caps["chapters"][s["id"]]
events = {}
for s in segs:
    if s["dir"] not in events: events[s["dir"]] = json.load(open(f"{FR}/{s['dir']}/events.json"))
fingers = {k: Finger(v) for k, v in events.items()}
XF = 6      # frames of dissolve at a chapter change
CF = 5      # frames of dissolve at a cut inside a chapter
END = 84    # end card frames

def render_chapter(i, limit=None):
    s = segs[i]; take = s["dir"]; cuts = set(events[take].get("cuts", []))
    cap = caption_layer(i, N, s["title"], s["sub"]); prevcap = caption_layer(i - 1, N, segs[i - 1]["title"], segs[i - 1]["sub"]) if i > 0 else None
    prev_last = screen(segs[i - 1]["dir"], segs[i - 1]["f1"] - 1).copy() if i > 0 else None
    n = s["f1"] - s["f0"]; frames = []
    last_cut = None
    for k in range(n if limit is None else min(n, limit)):
        f = s["f0"] + k
        scr = screen(take, f)
        if f in cuts and k > 0: last_cut = (f, screen(take, f - 1).copy())
        if k < XF and prev_last is not None: scr = Image.blend(prev_last, scr, ease((k + 1) / (XF + 1)))
        elif last_cut and f - last_cut[0] < CF: scr = Image.blend(last_cut[1], scr, ease((f - last_cut[0] + 1) / (CF + 1)))
        fr = BG.copy().convert("RGBA")
        fr.paste(scr, (SX, SY), MASK)
        draw_finger(fr, fingers[take].at(f))
        top = Image.new("RGBA", (W, SY - BEZ), (0, 0, 0, 0))
        t = ease((k + 1) / 9.0)
        if prevcap is not None and t < 1:
            pc = prevcap.copy(); pc.putalpha(pc.getchannel("A").point(lambda v: int(v * (1 - t)))); top.alpha_composite(pc)
        cc = cap.copy()
        if t < 1: cc.putalpha(cc.getchannel("A").point(lambda v: int(v * t)))
        top.alpha_composite(cc, (0, int(round((1 - t) * 8))))
        progress(ImageDraw.Draw(top), i, N, (k + 1) / n)
        fr.alpha_composite(top)
        frames.append(fr.convert("RGB"))
        yield frames[-1]; frames.pop()

def end_card(last):
    card = BG.copy().convert("RGBA")
    # the phone area is replaced by a centred brand card
    full = Image.new("RGB", (W, H)); px = full.load(); top, bot = (9, 52, 38), (6, 38, 28)
    for y in range(H):
        t = y / (H - 1); c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(W): px[x, y] = c
    glow = Image.new("L", (W, H), 0); ImageDraw.Draw(glow).ellipse((40, 330, W - 40, 950), fill=90); glow = glow.filter(ImageFilter.GaussianBlur(130))
    full = Image.composite(Image.new("RGB", (W, H), (24, 110, 72)), full, glow); d = ImageDraw.Draw(full)
    cx = W // 2
    logo = Image.open(f"{ROOT}/logo.png").convert("RGBA").resize((92, 92), Image.LANCZOS)
    full.paste(logo, (cx - 46, 416), logo)
    f1 = font("ExtraBold", 50); f2 = font("Medium", 24); f3 = font("Bold", 26)
    def centre(y, text, f, fill):
        w = d.textlength(text, font=f); d.text((cx - w / 2, y), text, font=f, fill=fill)
    w1 = d.textlength("Everyone can be a ", font=f1); w2 = d.textlength("farmer.", font=f1); x0 = cx - (w1 + w2) / 2
    d.text((x0, 548), "Everyone can be a ", font=f1, fill=WHITE); d.text((x0 + w1, 548), "farmer.", font=f1, fill=AMBER)
    centre(628, "Try the app now. No sign-up, no card.", f2, (255, 255, 255))
    bw = d.textlength("myterra.farm", font=f3) + 64; d.rounded_rectangle((cx - bw / 2, 700, cx + bw / 2, 760), 30, fill=AMBER)
    centre(713, "myterra.farm", f3, (63, 40, 5))
    for k in range(END):
        t = ease((k + 1) / 10.0)
        fr = Image.blend(last, full, t) if t < 1 else full
        yield fr

def main():
    only = ARGS[ARGS.index("--only") + 1] if "--only" in ARGS else None
    preview = int(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
    if preview is not None:   # a few full-size stills, no encode
        os.makedirs(f"{OUT}/preview_{ENV}", exist_ok=True)
        for i in range(N):
            n = segs[i]["f1"] - segs[i]["f0"]; want = {2, min(n - 1, preview), n - 1} | {e["f"] - segs[i]["f0"] + 2 for e in events[segs[i]["dir"]]["events"] if e["type"] == "tap" and segs[i]["f0"] <= e["f"] < segs[i]["f1"]}
            for k, fr in enumerate(render_chapter(i)):
                if k in want: fr.save(f"{OUT}/preview_{ENV}/c{i + 1}_{k:04d}.jpg", quality=88)
        last = None
        for k, fr in enumerate(end_card(Image.open(f"{OUT}/preview_{ENV}/c{N}_{segs[-1]['f1'] - segs[-1]['f0'] - 1:04d}.jpg"))):
            if k == END - 1: fr.save(f"{OUT}/preview_{ENV}/end.jpg", quality=88)
        return
    chapters, t, files, last = [], 0.0, [], None
    for i in range(N):
        s = segs[i]; n = s["f1"] - s["f0"]; path = f"{SC}/{i + 1:02d}_{s['id']}.mp4"; tmp = path.replace(".mp4", ".part.mp4")
        chapters.append({"id": s["id"], "t": round(t, 2), "title": s["title"], "sub": s["sub"]}); t += n / FPS; files.append(path)
        if only and s["id"] != only and os.path.exists(path): continue
        enc = encoder(tmp)
        for fr in render_chapter(i): enc.stdin.write(fr.tobytes()); last = fr
        enc.stdin.close()
        if enc.wait() != 0: sys.exit("ffmpeg failed on " + s["id"])
        os.replace(tmp, path); print("scene", s["id"], n, "frames", flush=True)
    if last is None: last = BG
    path = f"{SC}/99_end.mp4"; tmp = path.replace(".mp4", ".part.mp4"); enc = encoder(tmp)
    lastscr = None
    for fr in render_chapter(N - 1): lastscr = fr
    for fr in end_card(lastscr): enc.stdin.write(fr.tobytes())
    enc.stdin.close()
    if enc.wait() != 0: sys.exit("ffmpeg failed on end card")
    os.replace(tmp, path); files.append(path); total = t + END / FPS
    lst = f"{SC}/list.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in files))
    master = f"{OUT}/{ENV}-master.mp4"
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", master])
    json.dump({"env": ENV, "label": caps["label"], "tagline": caps["tagline"], "duration": round(total, 2), "chapters": chapters}, open(f"{OUT}/{ENV}-chapters.json", "w"), indent=1)
    print("master", master, round(total, 1), "s")

main()
