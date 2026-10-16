"""
Voice-over for the About launch film, read from src/about/script.json (voice.narrator, voice.styles,
scenes[].vo). `python scripts/about/vo.py f1 f2` re-voices only those lines.

Writes  public/about/vo/<id>.wav  (48 kHz mono)  and  src/about/vo.json  (durations + word timings, s).
"""

import asyncio
import json
import os
import subprocess
import sys
import wave

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILM = os.environ.get("FILM", "about")  # about | about2: which film's script to read
SCRIPT = json.load(open(os.path.join(ROOT, "src", FILM, "script.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "public", FILM, "vo")
FFMPEG = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
VOICE = SCRIPT["voice"]
LINES = [line for scene in SCRIPT["scenes"] for line in scene.get("vo", [])]


async def synth(line):
    style = VOICE["styles"][line["style"]]
    comm = edge_tts.Communicate(line.get("say", line["text"]), VOICE["narrator"], rate=style["rate"], pitch=style["pitch"], boundary="WordBoundary")
    mp3 = os.path.join(OUT, f'{line["id"]}.mp3')
    words = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    wav = os.path.join(OUT, f'{line["id"]}.wav')
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w:
        duration = w.getnframes() / w.getframerate()
    return {"id": line["id"], "style": line["style"], "text": line["text"], "duration": duration, "words": words}


async def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    path = os.path.join(ROOT, "src", FILM, "vo.json")
    result = json.load(open(path, encoding="utf-8")) if only and os.path.exists(path) else {}
    for line in LINES:
        if only and line["id"] not in only:
            continue
        entry = await synth(line)
        result[entry["id"]] = entry
        print(f'{entry["id"]:>6}  {entry["duration"]:5.2f}s  {len(entry["words"]):2d}w  {entry["text"]}')
    result = {line["id"]: result[line["id"]] for line in LINES}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)
    print("total speech", round(sum(e["duration"] for e in result.values()), 2), "s")


asyncio.run(main())
