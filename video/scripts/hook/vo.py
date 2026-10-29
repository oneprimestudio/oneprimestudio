"""
Voice-over for the hook Reel (src/site/hook.json: beats[].vo, end.vo). Voices each line with edge-tts (the
films' narrator), then times the cut to the voice: a beat lasts at least its `min` and long enough for its
line plus a breath. Writes the beats' `dur` back to hook.json and one voice-only track,
public/site/hook-vo.wav (48 kHz mono, no music: the music is added in Instagram).

  python scripts/hook/vo.py
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
PATH = os.path.join(ROOT, "src", "site", "hook.json")
OUT = os.path.join(ROOT, "public", "site", "vo")
FFMPEG = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")
VOICE = "en-US-AndrewMultilingualNeural"
SR = 48000
LEAD = 0.08  # the line starts this long after its cut
BREATH = 0.28  # and the cut waits this long after the line ends


async def synth(i, text, rate):
    mp3 = os.path.join(OUT, f"{i}.mp3")
    wav = os.path.join(OUT, f"{i}.wav")
    with open(mp3, "wb") as f:
        async for chunk in edge_tts.Communicate(text, VOICE, rate=rate, pitch="-3Hz").stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", str(SR), "-ac", "1", wav], check=True)
    os.remove(mp3)
    with wave.open(wav) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    # trim the synthesiser's leading and trailing silence so lines land on their cuts
    on = np.where(np.abs(x) > 0.01)[0]
    return x[max(0, on[0] - 240): on[-1] + 2400] if len(on) else x


async def main():
    os.makedirs(OUT, exist_ok=True)
    h = json.load(open(PATH, encoding="utf-8"))
    lines = [b["vo"] for b in h["beats"]] + [h["end"]["vo"]]
    clips = []
    for i, text in enumerate(lines):
        # the hook is said a touch slower, the proof cuts quicker
        clips.append(await synth(i, text, "-4%" if i == 0 else "+6%"))
        print(f"{i:2d} {len(clips[-1]) / SR:4.2f}s  {text}")
    t = 0.0
    starts = []
    for b, x in zip(h["beats"], clips):
        b["dur"] = round(max(b["min"], LEAD + len(x) / SR + BREATH), 2)
        starts.append(t)
        t += b["dur"]
    starts.append(t)
    h["end"]["sec"] = round(max(3.6, LEAD + len(clips[-1]) / SR + 1.2), 2)
    total = t + h["end"]["sec"]
    track = np.zeros(int(total * SR) + SR)
    for s, x in zip(starts, clips):
        a = int((s + LEAD) * SR)
        track[a: a + len(x)] += x
    # clean the voice: rumble out, gentle compression, peak at -1 dB
    track = sosfilt(butter(2, 90, "highpass", fs=SR, output="sos"), track)
    env = np.abs(track)
    thr = 0.25
    gain = np.where(env > thr, (thr + (env - thr) / 3) / np.maximum(env, 1e-9), 1.0)
    gain = np.convolve(gain, np.ones(480) / 480, mode="same")
    track = track * gain
    track = track / np.max(np.abs(track)) * 10 ** (-1 / 20)
    with wave.open(os.path.join(ROOT, "public", "site", "hook-vo.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((track * 32767).astype(np.int16).tobytes())
    json.dump(h, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"cut {t:.2f}s + end {h['end']['sec']}s = {total:.2f}s")


asyncio.run(main())
