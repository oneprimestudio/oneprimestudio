"""
The edit for the About launch film: places every voice line of src/about/script.json on the 120 BPM
grid, opens each scene `lead` seconds before its first word, resolves the named marks and the sound
cues, and writes src/about/timeline.json — read by the mix (scripts/about/audio.py) and the picture.

Per line:  gap — minimum silence after the previous line (s);  land — [word index, "bar" | "beat"]:
the line slides so that word starts on the next downbeat / beat.
Anchors:   scene:<id> · word:<line>:<i> · end:<line> · mark:<name>, plus an `offset` in seconds.
"""

import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILM = os.environ.get("FILM", "about")  # about | about2: which film's script to read
SRC = os.path.join(ROOT, "src", FILM)
SCRIPT = json.load(open(os.path.join(SRC, "script.json"), encoding="utf-8"))
VO = json.load(open(os.path.join(SRC, "vo.json"), encoding="utf-8"))
FPS = SCRIPT["format"]["fps"]
BEAT = 60 / SCRIPT["bpm"]
BAR = 4 * BEAT


def ceil_to(x, step):
    return math.ceil(x / step - 1e-9) * step


cues = {}
scenes = []
prev_end = 0.0
for sc in SCRIPT["scenes"]:
    first_line = None
    for line in sc.get("vo", []):
        words = VO[line["id"]]["words"]
        first = words[0]["t"]
        index, unit = line["land"]
        step = BAR if unit == "bar" else BEAT
        offset = words[index]["t"] - first
        speech_start = ceil_to(max(prev_end + line["gap"], BAR) + offset, step) - offset
        start = speech_start - first
        abs_words = [
            {"w": w["w"].strip(".,?!—"), "t": round(start + w["t"], 4), "e": round(start + w["t"] + w["d"], 4)}
            for w in words
        ]
        abs_words = [w for w in abs_words if w["w"]]
        cues[line["id"]] = {
            "start": round(start, 4),
            "speechStart": abs_words[0]["t"],
            "speechEnd": abs_words[-1]["e"],
            "text": line["text"],
            "style": line["style"],
            "words": abs_words,
        }
        prev_end = abs_words[-1]["e"]
        first_line = first_line or line["id"]
    begin = sc.get("start", None)
    if begin is None:
        begin = cues[first_line]["speechStart"] - sc.get("lead", 0.5)
    scenes.append({"id": sc["id"], "title": sc["title"], "start": round(begin, 4)})

duration = ceil_to(prev_end + SCRIPT["endHold"], BEAT)
for i, sc in enumerate(scenes):
    sc["end"] = scenes[i + 1]["start"] if i + 1 < len(scenes) else duration


def resolve(at, offset=0.0, marks=None):
    kind, _, rest = at.partition(":")
    if kind == "scene":
        t = next(s for s in scenes if s["id"] == rest)["start"]
    elif kind == "word":
        line, i = rest.rsplit(":", 1)
        t = cues[line]["words"][int(i)]["t"]
    elif kind == "end":
        t = cues[rest]["speechEnd"]
    elif kind == "mark":
        t = marks[rest]
    else:
        raise ValueError(at)
    return round(t + offset, 4)


marks = {}
for name, m in SCRIPT["marks"].items():
    marks[name] = resolve(m["at"], m.get("offset", 0.0), marks)

sfx = []
for sc in SCRIPT["scenes"]:
    for cue in sc.get("sfx", []):
        extra = {k: v for k, v in cue.items() if k not in ("at", "offset")}
        sfx.append({"t": resolve(cue["at"], cue.get("offset", 0.0), marks), **extra})
sfx.sort(key=lambda c: c["t"])

timeline = {
    "fps": FPS,
    "bpm": SCRIPT["bpm"],
    "beat": BEAT,
    "bar": BAR,
    "duration": duration,
    "frames": round(duration * FPS),
    "cues": cues,
    "scenes": scenes,
    "marks": marks,
    "sfx": sfx,
}
with open(os.path.join(SRC, "timeline.json"), "w", encoding="utf-8") as f:
    json.dump(timeline, f, indent=1)
for cid, c in cues.items():
    print(f'{cid:>6}  {c["speechStart"]:6.2f} -> {c["speechEnd"]:6.2f}   {c["text"][:60]}')
for s in scenes:
    print(f'  scene {s["id"]:>9} {s["start"]:6.2f} -> {s["end"]:6.2f}')
for k, v in marks.items():
    print(f"  mark {k:>15} {v:6.2f}")
print(f"duration {duration:.2f}s  ({timeline['frames']} frames @ {FPS}), {len(sfx)} sound cues")
