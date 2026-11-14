#!/usr/bin/env python3
"""check_media.py : every /landing/ file the homepage names exists, is not a stand-in, and fits its size budget.
Also fails while the page still carries a FILM-SECONDS token. Run before any commit of public/landing/."""
import hashlib, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__)); PUB = f"{ROOT}/../../public"; bad = 0
html = open(f"{PUB}/landing.html").read(); names = sorted(set(re.findall(r"/landing/([A-Za-z0-9._-]+)", html)))
stand = {}
if os.path.exists(f"{ROOT}/out/placeholders.sha256"):
    for line in open(f"{ROOT}/out/placeholders.sha256"): h, n = line.split(); stand[n.lstrip("*")] = h
def limit(n):
    if n.startswith("loop-") and n.endswith(".mp4"): return 600
    if n.startswith("loop-") and n.endswith(".webm"): return 600
    if n.startswith("first-minute.") : return 2500
    if n.startswith("hero5-") and not n.endswith(".webp"): return 1600
    if n.endswith(".webp"): return 120
    return None
total = 0
for n in names:
    p = f"{PUB}/landing/{n}"
    if not os.path.exists(p): print("MISSING    ", n); bad += 1; continue
    kb = os.path.getsize(p) / 1024; total += kb; lim = limit(n)
    if stand.get(n) == hashlib.sha256(open(p, "rb").read()).hexdigest(): print("PLACEHOLDER", n); bad += 1
    elif lim and kb > lim: print("TOO BIG    ", n, round(kb), "kB >", lim); bad += 1
if "FILM-SECONDS" in html: print("TOKEN       FILM-SECONDS still in landing.html (run apply_times.py)"); bad += 1
if total > 15000: print("TOO BIG     all media", round(total), "kB > 15000"); bad += 1
unused = sorted(f for f in os.listdir(f"{PUB}/landing") if f not in names)
if unused: print("not named by the page (delete?):", ", ".join(unused))
print(len(names), "files,", round(total), "kB.", f"RESULT: {bad} problem(s)" if bad else "RESULT: media ready")
sys.exit(1 if bad else 0)
