#!/usr/bin/env python3
"""apply_times.py : write the film's chapter start times and length into public/landing.html.
Run after compose.py first_minute. Reads out/first_minute-chapters.json."""
import json, os, re
ROOT = os.path.dirname(os.path.abspath(__file__)); page = f"{ROOT}/../../public/landing.html"
d = json.load(open(f"{ROOT}/out/first_minute-chapters.json")); s = open(page).read()
for c in d["chapters"]:
    pat = re.compile(r'(<button type="button" class="chap" data-t=")[0-9.]+("(?: aria-current="true")? data-umami-event="first-chapter" data-umami-event-chapter="%s")' % c["id"])
    s, n = pat.subn(lambda m: m.group(1) + "%.2f" % c["t"] + m.group(2), s); assert n == 1, c["id"]
secs = str(round(d["duration"]))
s, n1 = re.subn(r'(<span class="size">A few pots count · )(?:FILM-SECONDS|\d+)( seconds</span>)', r'\g<1>' + secs + r'\2', s)
s, n2 = re.subn(r'(<p class="sr-only" id="firstText">A )(?:FILM-SECONDS|\d+)(-second film)', r'\g<1>' + secs + r'\2', s)
assert n1 == 1 and n2 == 1, (n1, n2)
open(page, "w").write(s); print("film", d["duration"], "s;", ", ".join("%s %.2f" % (c["id"], c["t"]) for c in d["chapters"]))
