"""
Voice-over for "One Prime — a short film" (documentary-style SaaS intro, white, 9:16, 60 fps).

A single narrator in a measured documentary read: the problem low and unhurried, the product with
weight, the modules brisk, the real-world vignettes warm. Word timings drive the kinetic type and
the burnt-in subtitles.

Writes  public/doc/vo/<id>.wav  (48 kHz mono)  and  src/doc/vo.json  (durations + word timings, s).
"""

import asyncio
import sys
import json
import os
import subprocess
import wave

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "doc", "vo")
FFMPEG = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")

NARRATOR = "en-US-ChristopherNeural"  # news / documentary: reliable, authority

# delivery presets: (rate, pitch)
STYLE = {
    "open": ("-8%", "-3Hz"),
    "low": ("-6%", "-4Hz"),
    "turn": ("-10%", "+0Hz"),
    "name": ("-14%", "-2Hz"),
    "assured": ("+0%", "+0Hz"),
    "brisk": ("+8%", "+1Hz"),
    "warm": ("-2%", "+0Hz"),
    "close": ("-10%", "-2Hz"),
}

LINES = [
    ("open1", "open", "Every business today runs on software."),
    ("open2", "open", "Most of it was never built for them."),
    ("prob1", "low", "Spreadsheets holding the whole company together."),
    ("prob2", "low", "Five tools that never talk to each other."),
    ("prob3", "low", "A website that looks good, and sells nothing."),
    ("turn", "turn", "So we built something different."),
    ("name", "name", "One Prime Studio."),
    ("what", "assured", "One studio, for every product your business runs on."),
    ("mods", "brisk", "Websites. Apps. CRM and ERP systems. SaaS platforms. Shopify stores. Brand identity."),
    ("real1", "warm", "Maera, a salon academy in Hyderabad, runs its whole front desk from one calm screen."),
    ("real2", "warm", "A store that sells while its owner sleeps."),
    ("real3", "warm", "A team that finally works from one system."),
    ("close", "close", "Design and development, built as one."),
    ("sign", "close", "One Prime Studio. Average is not an option."),
]


async def synth(line_id, style, text):
    rate, pitch = STYLE[style]
    comm = edge_tts.Communicate(text, NARRATOR, rate=rate, pitch=pitch, boundary="WordBoundary")
    mp3 = os.path.join(OUT, f"{line_id}.mp3")
    words = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    wav = os.path.join(OUT, f"{line_id}.wav")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w:
        duration = w.getnframes() / w.getframerate()
    return {"id": line_id, "style": style, "text": text, "duration": duration, "words": words}


async def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "src", "doc"), exist_ok=True)
    # `python vo.py real1 sign` re-voices only those lines and keeps the rest
    only = set(sys.argv[1:])
    path = os.path.join(ROOT, "src", "doc", "vo.json")
    result = json.load(open(path, encoding="utf-8")) if only and os.path.exists(path) else {}
    for line in LINES:
        if only and line[0] not in only:
            continue
        entry = await synth(*line)
        result[entry["id"]] = entry
        print(f'{entry["id"]:>6}  {entry["duration"]:5.2f}s  {len(entry["words"]):2d}w  {entry["text"]}')
    result = {k: result[k] for k, *_ in LINES}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)
    print("total speech", round(sum(e["duration"] for e in result.values()), 2), "s")


asyncio.run(main())
