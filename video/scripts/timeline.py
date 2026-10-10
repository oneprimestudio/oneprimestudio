"""
The edit: places every voice line on a 120 BPM grid and writes src/timeline.json, which both the
audio mix (scripts/audio.py) and the picture (src/*.jsx) read — so cuts, hits and words agree to
the frame.

Rules per cue:
  gap   — minimum silence after the previous line's last word (s)
  land  — (word index, "bar" | "beat"): slide the line so that word starts exactly on the next
          downbeat / beat; otherwise the first word is snapped up to a 16th note.
"""

import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 60
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
SIXTEENTH = BEAT / 4

CUES = [
    ("hook1", dict(at=0.6)),
    ("hook2", dict(gap=0.4)),
    ("prob1", dict(gap=0.55, land=(0, "beat"))),
    ("prob2", dict(gap=0.22)),
    ("prob3", dict(gap=0.22)),
    ("prob4", dict(gap=0.22)),
    ("switch", dict(gap=0.85, land=(4, "bar"))),  # "switch" on the downbeat — the lights come on
    ("intro", dict(gap=0.7, land=(0, "beat"))),
    ("belief", dict(gap=0.35, land=(0, "bar"))),  # "Average" slams on the bar
    ("services", dict(gap=0.6, land=(0, "beat"))),
    ("zero", dict(gap=0.35)),
    ("why1", dict(gap=0.5, land=(0, "beat"))),
    ("why2", dict(gap=0.25)),
    ("why3", dict(gap=0.25)),
    ("why4", dict(gap=0.25)),
    ("solve", dict(gap=0.6, land=(0, "beat"))),
    ("ask", dict(gap=0.55, land=(0, "beat"))),
    ("cta", dict(gap=0.45, land=(3, "beat"))),  # "prime" on the beat — the final hit
]
END_HOLD = 3.2  # end card after the last word


def ceil_to(x, step):
    return math.ceil(x / step - 1e-9) * step


def main():
    vo = json.load(open(os.path.join(ROOT, "src", "vo.json"), encoding="utf-8"))
    cues = {}
    prev_end = 0.0
    for cue_id, rule in CUES:
        line = vo[cue_id]
        words = line["words"]
        first = words[0]["t"]
        if "at" in rule:
            speech_start = rule["at"]
        elif "land" in rule:
            index, unit = rule["land"]
            step = BAR if unit == "bar" else BEAT
            offset = words[index]["t"] - first  # from first word to the landing word
            hit = ceil_to(prev_end + rule["gap"] + offset, step)
            speech_start = hit - offset
        else:
            speech_start = ceil_to(prev_end + rule["gap"], SIXTEENTH)
        start = speech_start - first  # where the audio file itself begins
        abs_words = [
            {"w": w["w"].strip(".,?!"), "t": round(start + w["t"], 4), "e": round(start + w["t"] + w["d"], 4)}
            for w in words
        ]
        cues[cue_id] = {
            "start": round(start, 4),
            "speechStart": abs_words[0]["t"],
            "speechEnd": abs_words[-1]["e"],
            "fileDuration": line["duration"],
            "text": line["text"],
            "words": abs_words,
        }
        prev_end = abs_words[-1]["e"]

    duration = ceil_to(prev_end + END_HOLD, BEAT)

    c = cues
    word = lambda cue_id, i: c[cue_id]["words"][i]["t"]
    # Scenes, with the transition INTO each one: "dither" = Bayer dissolve, "cut" = hard cut on a hit.
    bounds = [
        ("hook", 0.0, None),
        ("problem", c["prob1"]["speechStart"] - 0.3, "dither"),
        ("switch", c["prob4"]["speechEnd"] + 0.75, "dither"),
        ("intro", c["intro"]["speechStart"] - 0.25, "dither"),
        ("belief", word("belief", 0), "cut"),
        ("services", c["services"]["speechStart"] - 0.3, "dither"),
        ("zero", c["zero"]["speechStart"] - 0.2, "dither"),
        ("why", c["why1"]["speechStart"] - 0.3, "dither"),
        ("solve", c["solve"]["speechStart"] - 0.3, "dither"),
        ("ask", c["ask"]["speechStart"] - 0.3, "dither"),
        ("cta", word("cta", 3), "cut"),
    ]
    scenes = []
    for i, (name, start, transition) in enumerate(bounds):
        end = bounds[i + 1][1] if i + 1 < len(bounds) else duration
        scenes.append({"id": name, "start": round(start, 4), "end": round(end, 4), "in": transition})
    hits = {
        "switch": word("switch", 4),
        "belief": word("belief", 0),
        "one": word("solve", 3),
        "prime": word("cta", 3),
    }
    timeline = {
        "fps": FPS,
        "bpm": BPM,
        "beat": BEAT,
        "bar": BAR,
        "duration": duration,
        "frames": round(duration * FPS),
        "cues": cues,
        "scenes": scenes,
        "hits": hits,
    }
    with open(os.path.join(ROOT, "src", "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, indent=1)
    for cue_id, c in cues.items():
        print(f'{cue_id:>9}  {c["speechStart"]:6.2f} -> {c["speechEnd"]:6.2f}   {c["text"][:60]}')
    for sc in scenes:
        print(f'  scene {sc["id"]:>9} {sc["start"]:6.2f} -> {sc["end"]:6.2f}  in: {sc["in"]}')
    print(f"duration {duration:.2f}s  ({timeline['frames']} frames @ {FPS})")


main()
