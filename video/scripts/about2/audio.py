"""
Score, sound design and mix for the v2 launch film (problem to solution), locked to
src/about2/timeline.json (voice placement, scenes, marks and every sound cue from script.json).

  music   original funk / phonk at 130 BPM in F# minor. Act 1 (the problem): a sub drone, a dark pad
          and a slowed, reverbed cowbell line over a muted kick. "Not anymore": the drop (tamborzao-
          style kick, claps on 2 and 4, rolling hats, distorted 808 slides, the phonk cowbell melody,
          a formant "hey" chop). A breakdown under "Built as", a build across the globe, a second drop
          on "everywhere", one last hit on the sign-off.
          A licensed track can replace it: put a WAV at public/about2/music.wav and re-run; it is
          ducked the same way.
  voice   problem lines go dark: dotted-eighth echo and a long hall. The rest is close and dry.
  mix     music dips under every word (mids -9 dB, lows -5 dB, 30 ms look-ahead, 280 ms release) and
          pumps off the kick; effects get a hall; master to -1 dBFS.

Writes public/about2/master.wav, public/about2/master-nomusic.wav (voice + effects, for adding a
licensed song inside Instagram) and src/about2/levels.json (per-frame kick + voice for the picture).
"""

import json
import os
import sys
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *  # noqa: E402,F403

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TL = json.load(open(os.path.join(ROOT, "src", "about2", "timeline.json"), encoding="utf-8"))
DUR = TL["duration"]
N = int(DUR * SR) + SR
BEAT = TL["beat"]
BAR = TL["bar"]
STEP = BAR / 16
CUES = TL["cues"]
SC = {s["id"]: s for s in TL["scenes"]}
MK = TL["marks"]


def W(c, i):
    return CUES[c]["words"][i]["t"]


music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send_room = np.zeros((N, 2))
send_hall = np.zeros((N, 2))
kicks = []


def add(bus, t, x, pan=0.0, gain=1.0, room=0.0, hall=0.0):
    i = int(round(t * SR))
    if i >= N or len(x) == 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    x = x[: N - i]
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)
    bus[i : i + len(x)] += x * gain
    if room:
        send_room[i : i + len(x)] += x * gain * room
    if hall:
        send_hall[i : i + len(x)] += x * gain * hall


# ================================================================= SOUND EFFECTS (from the script)
SOUNDS = {
    "swoosh": (lambda c: s_swoosh(), 0.1, 0.2),
    "riser": (lambda c: s_riser(c.get("dur", 1.4)), 0.0, 0.25),
    "hit": (lambda c: s_hit(), 0.1, 0.6),
    "drop": (lambda c: s_drop(), 0.0, 0.35),
    "shock": (lambda c: s_shock(), 0.0, 0.4),
    "slam": (lambda c: s_slam(), 0.1, 0.25),
    "glitch": (lambda c: s_glitch(), 0.1, 0.2),
    "buzz": (lambda c: s_buzz(), 0.15, 0.3),
    "type": (lambda c: s_type(), 0.1, 0.0),
    "shuffle": (lambda c: s_shuffle(), 0.1, 0.1),
    "thud": (lambda c: s_thud(), 0.0, 0.4),
    "drops": (lambda c: s_drops(), 0.1, 0.2),
    "snap": (lambda c: s_snap(), 0.1, 0.3),
    "heartbeat": (lambda c: s_heartbeat(), 0.1, 0.3),
    "flatline": (lambda c: s_flatline(), 0.2, 0.5),
    "absorb": (lambda c: s_absorb(), 0.0, 0.3),
    "switch": (lambda c: s_switch(), 0.2, 0.2),
    "cash": (lambda c: s_cash(), 0.2, 0.3),
    "coins": (lambda c: s_coins(), 0.2, 0.2),
    "lock": (lambda c: s_lock(), 0.1, 0.2),
    "ping": (lambda c: s_ping(), 0.2, 0.5),
    "seam": (lambda c: s_seam(), 0.1, 0.2),
}

for c in TL["sfx"]:
    s = c["sound"]
    if s == "arcs":
        for i in range(7):
            at = c["t"] + 0.12 + i * STEP * 1.5
            add(sfx, at, s_zip(72 + 2 * i), pan=-0.7 + 0.23 * i, gain=c["gain"], room=0.2)
            add(sfx, at + 0.6, s_pop(), pan=-0.7 + 0.23 * i, gain=c["gain"] * 0.5)
        continue
    if s == "notes":
        # enquiry, booking, order: a ping, a coin and a small cash each, on the beat
        for i in range(3):
            at = c["t"] + i * BEAT
            add(sfx, at, s_notify(), pan=0.3 - 0.3 * i, gain=c["gain"], room=0.2)
            add(sfx, at + 0.04, s_coins(4, 0.2), pan=0.3 - 0.3 * i, gain=c["gain"] * 0.8, room=0.2)
        continue
    gen, room, hall = SOUNDS[s]
    add(sfx, c["t"], gen(c), pan=c.get("pan", 0.0), gain=c["gain"], room=room, hall=hall)

# ================================================================= SCORE
t_drop = W("turn", 0)
t_one_scene = SC["one"]["start"]
t_absorb = W("o2", 2)
t_every = W("w2", 3)
t_seam = MK["sign.seam"]
t_sign = W("sign", 0)
ROOT_M = 66  # F#4

# the cowbell line, two bars of 16ths (semitones above F#4, None = rest)
MEL = [
    [12, None, 12, 15, None, 12, None, 19, 17, None, 15, None, 12, None, 10, None],
    [12, None, 12, 15, None, 12, None, 19, 22, None, 19, None, 17, None, 15, None],
]
# the 808: (step, note, length in steps, glide to)
BASS = [
    [(0, 30, 6, None), (6, 30, 4, 33), (10, 37, 6, None)],
    [(0, 30, 6, None), (6, 28, 4, None), (10, 33, 6, 30)],
]


def bar_no(t):
    return int(round((t - t_drop) / BAR))


def phonk_bar(t0, energy=1.0, kick_on=True):
    b = bar_no(t0) % 2
    for k, n in enumerate(MEL[b]):
        if n is None:
            continue
        add(music, t0 + k * STEP, cowbell(ROOT_M + n), pan=0.15 * (1 if k % 4 < 2 else -1), gain=0.55 * energy, room=0.15)
    for k, m, ln, gl in BASS[b]:
        add(music, t0 + k * STEP, bass808(m, ln * STEP, gl), gain=0.75 * energy)
    if kick_on:
        for k in (0, 3, 6, 10) + ((14,) if energy > 0.9 else ()):
            add(drums, t0 + k * STEP, kick(0.95))
            kicks.append(t0 + k * STEP)
    for k in (4, 12):
        add(drums, t0 + k * STEP, clap(0.85), room=0.25)
    for k in range(0, 16, 2):
        add(drums, t0 + k * STEP, hat(0.5 if k % 4 else 0.3), pan=0.25)
    if b == 1:  # a roll into the next phrase
        for j in range(8):
            add(drums, t0 + 12 * STEP + j * STEP / 2, hat(0.2 + 0.05 * j, 0.025), pan=-0.2)
        if energy > 0.8:
            add(music, t0 + 8 * STEP, chop(ROOT_M, "e"), gain=0.5, hall=0.3)
    else:
        add(drums, t0 + 14 * STEP, hat(0.35, open_=True), pan=0.3)


# Act 1: the problem, dark and slow
add(music, 0.0, pad([54, 57, 61, 66], t_drop + 0.2, gain=0.42, cutoff=650, attack=2.0, release=0.4), hall=0.2)
add(music, 0.0, sub(30, t_drop - 0.4, 0.3))
t = TL["cues"]["p1"]["speechStart"] - BAR / 2
k = 0
while t < SC["walk"]["start"] + BAR:
    for j, n in enumerate(MEL[k % 2]):
        if n is None or j % 2:  # half the notes, slowed in feel
            continue
        add(music, t + j * STEP, filt(cowbell(ROOT_M + n - 12, 0.5, 1.4), "low", 2400), pan=0.3 * (-1) ** j, gain=0.35, hall=0.5)
    if t >= SC["brand"]["start"] - 0.1:
        for q in (0, 8):
            add(drums, t + q * STEP, filt(kick(0.6), "low", 220))
    t += BAR
    k += 1
# the last bar before the drop: a snare roll, everything filtered, then a beat of silence
roll0 = t_drop - BAR
for j in range(16):
    add(drums, roll0 + j * STEP * 0.875, clap(0.12 + 0.5 * j / 16), room=0.1)

# drop 1: from "Not anymore" through the solutions
add(music, t_drop, pad([42, 54, 57, 61, 64], BAR * 2, gain=0.4, cutoff=4000, attack=0.02, release=1.5), hall=0.3)
t = t_drop
while t < t_one_scene - 1e-6:
    phonk_bar(t, 1.0 if t >= t_drop + BAR * 2 else 0.85)
    t += BAR

# "Design, development and software": breakdown, "Built as one": the absorb
t = t_one_scene
while t < t_absorb - 1e-6:
    b = bar_no(t) % 2
    for k_, n in enumerate(MEL[b]):
        if n is not None:
            add(music, t + k_ * STEP, filt(cowbell(ROOT_M + n), "low", 1500), gain=0.45, hall=0.35)
    add(music, t, bass808(30, BAR * 0.95), gain=0.5)
    for q in (4, 12):
        add(drums, t + q * STEP, clap(0.5), room=0.3)
    t += BAR
add(music, t_absorb, pad([42, 54, 61, 66, 69], BAR * 1.2, gain=0.42, cutoff=3500, attack=0.01, release=1.0), hall=0.4)
add(music, t_absorb, bass808(30, BAR * 1.2), gain=0.7)

# the globe: a build, kick opening up, into drop 2 on "everywhere"
t = t_absorb + BAR
while t < t_every - 1e-6:
    q = (t - t_absorb) / max(t_every - t_absorb, 1e-6)
    b = bar_no(t) % 2
    for k_, n in enumerate(MEL[b]):
        if n is not None:
            add(music, t + k_ * STEP, filt(cowbell(ROOT_M + n), "low", 1200 + 6000 * q), gain=0.5)
    for k_ in range(0, 16, 4):
        add(drums, t + k_ * STEP, filt(kick(0.75), "low", 250 + 3000 * q))
        kicks.append(t + k_ * STEP)
    add(music, t, sub(30, BAR, 0.35))
    t += BAR
t = t_every
while t < t_seam + 0.2 - 1e-6:
    phonk_bar(t, 1.0)
    t += BAR

# sign-off: the seam, the hit, the last phrase ringing out
fin = [42, 54, 57, 61, 66, 69]
add(music, t_sign, pad(fin, DUR - t_sign + 0.5, gain=0.45, cutoff=2800, attack=0.02, release=2.6), hall=0.4)
add(music, t_sign, bass808(30, 2.2), gain=0.9)
add(drums, t_sign, kick(1.0))
kicks.append(t_sign)
add(music, t_sign, chop(ROOT_M, "a", 0.3), gain=0.6, hall=0.5)
for j, n in enumerate(MEL[0]):
    if n is not None:
        add(music, MK["sign.cta"] - 0.5 + j * STEP, cowbell(ROOT_M + n), gain=0.32, hall=0.6)

# a licensed song instead of the score: public/about2/music.wav (any rate, mono or stereo)
override = os.path.join(ROOT, "public", "about2", "music.wav")
if os.path.exists(override):
    with wave.open(override) as w:
        sr_in, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64)
    raw = raw.reshape(-1, ch) / (2 ** (8 * sw - 1))
    if ch == 1:
        raw = np.repeat(raw, 2, axis=1)
    if sr_in != SR:
        raw = signal.resample_poly(raw, SR, sr_in, axis=0)
    music = np.zeros((N, 2))
    music[: min(N, len(raw))] = raw[:N, :2] * 0.9
    drums = np.zeros((N, 2))
    print("music: using public/about2/music.wav")

# ================================================================= VOICE
HALL_V = hall_ir(2.6, 3.0, 0.02, 5500, seed=9)
vo = np.zeros(N)
vo_prob = np.zeros(N)
for cid, c in CUES.items():
    with wave.open(os.path.join(ROOT, "public", "about2", "vo", f"{cid}.wav")) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    i = int(round(c["start"] * SR))
    (vo_prob if c["style"] == "problem" else vo)[i : i + len(x)] += x[: N - i]


def voice_chain(v):
    v = filt(v, "high", 90, 2)
    bq, aq = signal.iirpeak(3000 / (SR / 2), 0.9)
    v = v + 0.22 * signal.lfilter(bq, aq, v)
    rms = np.sqrt(np.maximum(uniform_filter1d(v**2, int(0.01 * SR)), 0) + 1e-12)
    db = 20 * np.log10(rms)
    v = v * 10 ** (uniform_filter1d(np.where(db > -22, (db + 22) * (1 / 3 - 1), 0), int(0.02 * SR)) / 20)
    return v


vo = voice_chain(vo)
vo_prob = filt(voice_chain(vo_prob), "low", 6000, 2)
peak = max(np.max(np.abs(vo)), np.max(np.abs(vo_prob))) + 1e-9
vo *= 0.74 / peak
vo_prob *= 0.74 / peak
# the problem voice: a dotted-eighth echo with feedback, then a long hall
echo = np.zeros(N)
dl = int(0.75 * BEAT * SR)
src = filt(vo_prob, "bp", (300, 3500))
for r in range(1, 5):
    echo[dl * r :] += src[: N - dl * r] * (0.32 * 0.55 ** (r - 1))
prob_wet = np.stack([echo * 0.9, np.roll(echo, int(0.011 * SR))], 1)
prob_hall = np.stack([signal.fftconvolve(vo_prob, HALL_V[:, ch])[:N] for ch in range(2)], 1)
dbl = np.zeros_like(vo)
d12 = int(0.012 * SR)
dbl[d12:] = filt(vo, "high", 1200)[:-d12]
vo_all = vo + vo_prob
vo_st = np.stack([vo + 0.08 * dbl, vo - 0.08 * dbl], 1) + np.stack([vo_prob, vo_prob], 1) + prob_wet * 0.6 + prob_hall * 0.34
send_room += np.stack([vo, vo], 1) * 0.04

# ================================================================= MIX
envv = np.sqrt(np.maximum(uniform_filter1d(vo_all**2, int(0.02 * SR)), 0))
la = int(0.03 * SR)
envv = np.concatenate([envv[la:], np.zeros(la)])
envv = maximum_filter1d(envv, int(0.12 * SR))
rel = np.exp(-1 / (0.28 * SR))
envv = np.maximum(envv, signal.lfilter([1 - rel], [1, -rel], envv))
k = np.clip(envv / (np.percentile(envv[envv > 1e-4], 60) + 1e-9), 0, 1)
duck_mid = 10 ** (-9 * k / 20)
duck_low = 10 ** (-5 * k / 20)
duck_fx = 10 ** (-3 * k / 20)

pump = np.ones(N)
pl = int(0.22 * SR)
shape = 1 - 0.5 * np.exp(-np.arange(pl) / (0.06 * SR))
for kt in kicks:
    i = int(kt * SR)
    seg = pump[i : i + pl]
    pump[i : i + pl] = np.minimum(seg, shape[: len(seg)])
if os.path.exists(override):
    pump[:] = 1.0

music_low = filt(music, "low", 220)
music_bus = music_low * (duck_low * pump)[:, None] + (music - music_low) * (duck_mid * pump)[:, None]
drum_bus = drums * (0.78 + 0.22 * duck_mid)[:, None]

ROOM = hall_ir(1.2, 1.4, 0.01, 7000, seed=3)
HALL = hall_ir(3.4, 3.8, 0.03, 6500, seed=4)
room = np.stack([signal.fftconvolve(filt(send_room, "high", 250)[:, ch], ROOM[:, ch])[:N] for ch in range(2)], 1) * 0.35
hall = np.stack([signal.fftconvolve(filt(send_hall, "high", 180)[:, ch], HALL[:, ch])[:N] for ch in range(2)], 1) * 0.5
hall *= (0.55 + 0.45 * duck_mid)[:, None]
fx_bus = sfx * (0.9 * duck_fx)[:, None] + hall


def master(x, target_db=-14.5):
    x = np.tanh(x * 1.15) / 1.15
    ceiling = 10 ** (-1 / 20)
    w_ = int(0.006 * SR)

    def limit(y):
        pk = maximum_filter1d(np.max(np.abs(y), axis=1), int(0.004 * SR))
        g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (pk + 1e-9)), w_), w_)
        return y * g[:, None]

    x = limit(x)
    x *= min(10 ** (target_db / 20) / np.sqrt(np.mean(x**2)), 3.0)
    x = np.clip(limit(x), -ceiling, ceiling)[: int(DUR * SR)]
    f = int(0.01 * SR)
    x[:f] *= np.linspace(0, 1, f)[:, None]
    tail = int(1.2 * SR)
    x[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
    return x


def write(name, x):
    with wave.open(os.path.join(ROOT, "public", "about2", name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(f"about2/{name}  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(x))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(x**2))):.2f} dBFS")


os.makedirs(os.path.join(ROOT, "public", "about2"), exist_ok=True)
write("master.wav", master(vo_st + music_bus * 0.6 + drum_bus * 0.72 + fx_bus + room))
write("master-nomusic.wav", master(vo_st + sfx * 0.9 + hall + room, -16.0))

fps = TL["fps"]
frames = TL["frames"]
kick_env = np.zeros(frames)
for kt in kicks:
    i0 = int(kt * fps)
    for j in range(12):
        if 0 <= i0 + j < frames:
            kick_env[i0 + j] = max(kick_env[i0 + j], np.exp(-j / 4))
hop = SR // fps
vo_env = np.array([np.sqrt(np.mean(vo_all[i * hop : (i + 1) * hop] ** 2)) for i in range(frames)])
vo_env = np.clip(vo_env / (np.percentile(vo_env[vo_env > 1e-4], 95) + 1e-9), 0, 1)
json.dump({"kick": [round(float(v), 3) for v in kick_env], "voice": [round(float(v), 3) for v in vo_env]}, open(os.path.join(ROOT, "src", "about2", "levels.json"), "w"))
print("kicks", len(kicks))
