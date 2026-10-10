"""
Voice-over for the One Prime intro.

Each line is synthesised on its own so the edit can place it on the music grid, with a delivery
("style") per act: the problem is read low and slow, the turn lands with weight, the services move
quickly, the client questions switch to a second voice. Word timings are kept so on-screen type can
hit the exact spoken word.

Writes  public/vo/<id>.wav  (48 kHz mono)  and  src/vo.json  (durations + word timings, seconds).
"""

import asyncio
import json
import os
import subprocess
import wave

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "vo")
FFMPEG = os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")

NARRATOR = "en-US-AndrewMultilingualNeural"  # warm, confident
ASKER = "en-US-AvaMultilingualNeural"  # the client's questions — a second voice

# delivery presets: (rate, pitch)
STYLE = {
    "intimate": ("-10%", "-6Hz"),  # the problem: low, unhurried, a little tired of it
    "flat": ("+2%", "-4Hz"),
    "turn": ("-6%", "+0Hz"),  # the switch: deliberate
    "assured": ("+7%", "+0Hz"),
    "weight": ("-14%", "-3Hz"),  # the belief: every word on its own
    "brisk": ("+16%", "+2Hz"),  # services: momentum
    "warm": ("+3%", "+0Hz"),
    "bright": ("+12%", "+4Hz"),  # the questions
    "close": ("-8%", "-2Hz"),  # the sign-off
}

LINES = [
    ("hook1", NARRATOR, "intimate", "Most software works."),
    ("hook2", NARRATOR, "intimate", "Nobody wants to use it."),
    ("prob1", NARRATOR, "flat", "Fourteen clicks, to do one thing."),
    ("prob2", NARRATOR, "flat", "Dashboards nobody reads."),
    ("prob3", NARRATOR, "flat", "Websites that look like everyone else's."),
    ("prob4", NARRATOR, "flat", "Systems your team quietly works around."),
    ("switch", NARRATOR, "turn", "So we flipped the switch."),
    ("intro", NARRATOR, "assured", "One Prime Studio. A design and development studio, built on one belief."),
    ("belief", NARRATOR, "weight", "Average, is not an option."),
    ("services", NARRATOR, "brisk", "Websites. Apps. CRMs and ERPs. SaaS products. Shopify stores. Brand identity."),
    ("zero", NARRATOR, "assured", "We take ideas from zero, to their most refined, most premium form."),
    ("why1", NARRATOR, "warm", "Every solution starts with a purpose."),
    ("why2", NARRATOR, "warm", "The small things make the big difference."),
    ("why3", NARRATOR, "warm", "Built to grow with your business."),
    ("why4", NARRATOR, "warm", "And we stay for the journey."),
    ("solve", NARRATOR, "warm", "Fourteen clicks, became one. Complex, made clear. For everyone."),
    ("ask", ASKER, "bright", "Have an idea? A new business? A system to be built? A brand that needs a new identity?"),
    ("cta", NARRATOR, "close", "Let's build something prime."),
]


async def synth(line_id, voice, style, text):
    rate, pitch = STYLE[style]
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    mp3 = os.path.join(OUT, f"{line_id}.mp3")
    words = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append(
                    {
                        "w": chunk["text"],
                        "t": chunk["offset"] / 1e7,
                        "d": chunk["duration"] / 1e7,
                    }
                )
    wav = os.path.join(OUT, f"{line_id}.wav")
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav],
        check=True,
    )
    os.remove(mp3)
    with wave.open(wav) as w:
        duration = w.getnframes() / w.getframerate()
    return {"id": line_id, "voice": voice, "style": style, "text": text, "duration": duration, "words": words}


async def main():
    os.makedirs(OUT, exist_ok=True)
    result = {}
    for line in LINES:
        entry = await synth(*line)
        result[entry["id"]] = entry
        print(f'{entry["id"]:>9}  {entry["duration"]:5.2f}s  {entry["text"]}')
    with open(os.path.join(ROOT, "src", "vo.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1)
    print("total speech", round(sum(e["duration"] for e in result.values()), 2), "s")


asyncio.run(main())
