"""
The edit for the short film: places every voice line on a 100 BPM grid and writes
src/doc/timeline.json, read by both the mix (scripts/doc/audio.py) and the picture (src/doc/*.jsx).

Rules per cue:
  at    — absolute start of the first word (s)
  gap   — minimum silence after the previous line's last word (s)
  land  — (word index, "bar" | "beat"): slide the line so that word starts on the next downbeat / beat;
          otherwise the first word is snapped up to an 8th note.
"""

import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FPS = 60
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
EIGHTH = BEAT / 2

CUES = [
    ("open1", dict(at=2.4)),  # after the title card, on bar 2
    ("open2", dict(gap=0.45)),
    ("prob1", dict(gap=0.7, land=(0, "bar"))),  # chapter 01 card sits in the gap
    ("prob2", dict(gap=0.55, land=(0, "beat"))),
    ("prob3", dict(gap=0.55, land=(0, "beat"))),
    ("turn", dict(gap=1.0, land=(0, "beat"))),
    ("name", dict(gap=0.45, land=(0, "bar"))),  # "One" on the downbeat — the switch flips on
    ("what", dict(gap=0.5, land=(0, "beat"))),
    ("mods", dict(gap=0.9, land=(0, "bar"))),  # chapter 02 card
    ("real1", dict(gap=0.9, land=(0, "bar"))),  # chapter 03 card
    ("real2", dict(gap=0.5, land=(0, "beat"))),
    ("real3", dict(gap=0.5, land=(0, "beat"))),
    ("close", dict(gap=0.7, land=(0, "bar"))),
    ("sign", dict(gap=0.7, land=(0, "beat"))),
]
END_HOLD = 3.4


def ceil_to(x, step):
    return math.ceil(x / step - 1e-9) * step


def main():
    vo = json.load(open(os.path.join(ROOT, "src", "doc", "vo.json"), encoding="utf-8"))
    cues = {}
    prev_end = 0.0
    for cue_id, rule in CUES:
        words = vo[cue_id]["words"]
        first = words[0]["t"]
        if "at" in rule:
            speech_start = rule["at"]
        elif "land" in rule:
            index, unit = rule["land"]
            step = BAR if unit == "bar" else BEAT
            offset = words[index]["t"] - first
            speech_start = ceil_to(prev_end + rule["gap"] + offset, step) - offset
        else:
            speech_start = ceil_to(prev_end + rule["gap"], EIGHTH)
        start = speech_start - first
        abs_words = [
            {"w": w["w"].strip(".,?!"), "t": round(start + w["t"], 4), "e": round(start + w["t"] + w["d"], 4)}
            for w in words
        ]
        cues[cue_id] = {
            "start": round(start, 4),
            "speechStart": abs_words[0]["t"],
            "speechEnd": abs_words[-1]["e"],
            "text": vo[cue_id]["text"],
            "words": abs_words,
        }
        prev_end = abs_words[-1]["e"]

    duration = ceil_to(prev_end + END_HOLD, BEAT)
    c = cues
    pre = 0.35  # scenes open a beat-ish before their first word
    bounds = [
        ("title", 0.0),
        ("hook", c["open1"]["speechStart"] - pre),
        ("sheets", c["prob1"]["speechStart"] - 1.15),  # includes the chapter card
        ("tools", c["prob2"]["speechStart"] - pre),
        ("site", c["prob3"]["speechStart"] - pre),
        ("turn", c["turn"]["speechStart"] - 0.5),
        ("product", c["what"]["speechStart"] - pre),
        ("mods", c["mods"]["speechStart"] - 1.15),
        ("maera", c["real1"]["speechStart"] - 1.15),
        ("store", c["real2"]["speechStart"] - pre),
        ("team", c["real3"]["speechStart"] - pre),
        ("close", c["close"]["speechStart"] - pre),
        ("sign", c["sign"]["speechStart"] - pre),
    ]
    scenes = []
    for i, (name, start) in enumerate(bounds):
        end = bounds[i + 1][1] if i + 1 < len(bounds) else duration
        scenes.append({"id": name, "start": round(start, 4), "end": round(end, 4)})
    # cinematic accents, shared by the picture (src/doc/fx.jsx) and the mix (scripts/doc/audio.py)
    #   laser  — light beams sweep the frame          flash — bloom white-out on a hit
    #   flare  — anamorphic streak + ghosts at (x, y) leak  — soft colour light leak drifting across
    sc = {s["id"]: s["start"] for s in scenes}
    w = lambda cid, i: c[cid]["words"][i]["t"]
    one = w("real3", 6) - 0.1
    fx = [
        ("leak", 0.1, dict(dur=2.4)),
        ("laser", w("open1", 5) - 0.1, dict(angle=-14, n=3)),
        ("laser", sc["sheets"] - 0.2, dict(angle=-18, n=5)),
        ("flash", sc["sheets"] - 0.02, dict(k=0.8)),
        ("laser", w("prob2", 3) - 0.1, dict(angle=12, n=3)),
        ("flash", w("name", 0) - 0.02, dict(k=1.0)),
        ("flare", w("name", 0), dict(x=380, y=865)),
        ("leak", w("name", 0) + 0.1, dict(dur=3.0)),
        ("laser", sc["product"] - 0.2, dict(angle=-16, n=4)),
        ("laser", sc["mods"] - 0.2, dict(angle=-18, n=5)),
        ("flash", sc["mods"] - 0.02, dict(k=0.8)),
        ("laser", w("mods", 10) - 0.25, dict(angle=14, n=3)),
        ("laser", sc["maera"] - 0.2, dict(angle=-18, n=5)),
        ("flash", sc["maera"] - 0.02, dict(k=0.8)),
        ("flare", sc["maera"] + 1.2, dict(x=540, y=620)),
        ("laser", sc["store"] - 0.2, dict(angle=16, n=3)),
        ("laser", sc["team"] - 0.2, dict(angle=-16, n=3)),
        ("flash", one + 0.3, dict(k=0.7)),
        ("flare", one + 0.35, dict(x=540, y=830)),
        ("laser", sc["close"] - 0.2, dict(angle=-18, n=4)),
        ("flare", w("close", 5) + 0.05, dict(x=760, y=880)),
        ("flash", w("sign", 0) - 0.02, dict(k=1.0)),
        ("flare", w("sign", 0), dict(x=380, y=865)),
        ("leak", w("sign", 0) + 0.1, dict(dur=3.2)),
        ("laser", c["sign"]["speechEnd"] + 0.25, dict(angle=-18, n=5)),
        ("leak", c["sign"]["speechEnd"] + 0.5, dict(dur=3.5)),
    ]
    fx = [dict(kind=k, t=round(t_, 4), **o) for k, t_, o in sorted(fx, key=lambda e: e[1])]
    timeline = {
        "fps": FPS,
        "bpm": BPM,
        "beat": BEAT,
        "bar": BAR,
        "duration": duration,
        "frames": round(duration * FPS),
        "cues": cues,
        "scenes": scenes,
        "fx": fx,
    }
    with open(os.path.join(ROOT, "src", "doc", "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, indent=1)
    for cue_id, cc in cues.items():
        print(f'{cue_id:>6}  {cc["speechStart"]:6.2f} -> {cc["speechEnd"]:6.2f}   {cc["text"][:60]}')
    for sc in scenes:
        print(f'  scene {sc["id"]:>8} {sc["start"]:6.2f} -> {sc["end"]:6.2f}')
    print(f"duration {duration:.2f}s  ({timeline['frames']} frames @ {FPS})")


main()
