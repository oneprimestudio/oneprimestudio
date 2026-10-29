"""
Voice-over for the documentary Reel, read from src/story/script.json. Each line is voiced with edge-tts (the films'
narrator) with its word timings, laid end to end with the pause after it, and mixed into one voice-only
track: public/story/vo.wav (48 kHz mono; no music, that is added in Instagram). The timeline the film is cut
to, every line's start and end and every word's start (s, absolute), goes to src/story/vo.json.

  python scripts/story/vo.py
"""

import asyncio
import json
import os
import subprocess
import wave

import edge_tts
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT = json.load(open(os.path.join(ROOT, "src", "story", "script.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "public", "story")
FFMPEG = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
SR = 48000


async def synth(line):
    mp3 = os.path.join(OUT, f'{line["id"]}.mp3')
    words = []
    comm = edge_tts.Communicate(line["say"], SCRIPT["voice"], rate=SCRIPT["rate"], pitch=SCRIPT["pitch"], boundary="WordBoundary")
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"w": chunk["text"], "t": chunk["offset"] / 1e7, "d": chunk["duration"] / 1e7})
    wav = mp3[:-4] + ".wav"
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", str(SR), "-ac", "1", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    os.remove(wav)
    # trim the synthesiser's silence; word times move with the trimmed head
    on = np.where(np.abs(x) > 0.01)[0]
    head = max(0, on[0] - 240)
    x = x[head: on[-1] + 2400]
    for w in words:
        w["t"] -= head / SR
    return x, words


async def main():
    os.makedirs(OUT, exist_ok=True)
    t = SCRIPT["start"]
    clips, lines = [], []
    for line in SCRIPT["lines"]:
        x, words = await synth(line)
        shown = line["show"].split()
        if len(shown) == len(words):
            # the captions spell names as the clients do (Maéra), while the voice says them as they sound
            for w, s in zip(words, shown):
                w["show"] = s
        for w in words:
            w["t"] = round(t + max(0.0, w["t"]), 3)
            w["d"] = round(w["d"], 3)
        dur = len(x) / SR
        lines.append({"id": line["id"], "start": round(t, 3), "end": round(t + dur, 3), "show": line["show"], "words": words})
        clips.append((t, x))
        print(f'{line["id"]:>6} {t:6.2f}s  {dur:4.2f}s  {line["say"]}')
        t += dur + line["after"]
    total = round(t, 3)
    track = np.zeros(int(total * SR) + SR // 2)
    for s, x in clips:
        a = int(s * SR)
        track[a: a + len(x)] += x
    track = sosfilt(butter(2, 90, "highpass", fs=SR, output="sos"), track)
    env = np.abs(track)
    thr = 0.25
    gain = np.where(env > thr, (thr + (env - thr) / 3) / np.maximum(env, 1e-9), 1.0)
    track = track * np.convolve(gain, np.ones(480) / 480, mode="same")
    track = track / np.max(np.abs(track)) * 10 ** (-1 / 20)
    with wave.open(os.path.join(OUT, "vo.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((track * 32767).astype(np.int16).tobytes())
    json.dump({"fps": 60, "total": total, "lines": lines}, open(os.path.join(ROOT, "src", "story", "vo.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("total", total, "s")


asyncio.run(main())
