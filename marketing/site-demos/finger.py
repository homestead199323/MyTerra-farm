"""The tap marker: where the finger is on every frame of a take, and how it is drawn.
Shared by compose.py (the film) and loops_compose.py (the loops)."""
import math
from PIL import Image, ImageDraw

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

def draw_finger(frame, st, SX, SY, K, SW, SH):
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

