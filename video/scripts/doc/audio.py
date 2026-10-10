"""
Score, sound design and mix for "One Prime — a short film", synthesised from scratch and locked to
src/doc/timeline.json.

  music   100 BPM. The problem sits in A minor: a felt piano that keeps asking the same question
          over a low drone and a muted pulse. The turn drains to near silence and swells into "One",
          where the world opens into C major (C – G/B – Am7 – Fmaj7). A soft kick and shaker carry
          the modules; the real-world scenarios breathe at half-time; the sign-off rings out on Cmaj9.
  fx      every laser / flash / flare / leak in the timeline has its sound: FM laser zaps, flash cracks
          over booms + trailer braams with reverse-reverb lead-ins, shimmer tails, all into a 4.8 s hall.
  sfx     masks get air whooshes, the switch has a mechanical click + chime, modules toggle on with
          rising blips, cells tick in, links snap, the booking confirms, orders ding at night.
  mix     VO: HPF, presence, 3:1 compression, short room. Music ducks under the voice. Master: reverb,
          gentle glue, look-ahead brickwall at −1 dBFS.

Writes public/doc/master.wav (48 kHz stereo).
"""

import json
import os
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 48000
TL = json.load(open(os.path.join(ROOT, "src", "doc", "timeline.json"), encoding="utf-8"))
DUR = TL["duration"]
N = int(DUR * SR) + SR
BEAT = TL["beat"]
BAR = TL["bar"]
CUES = TL["cues"]
SC = {s["id"]: s for s in TL["scenes"]}
rng = np.random.default_rng(7)


def W(c, i):
    return CUES[c]["words"][i]["t"]


music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
hall_send = np.zeros((N, 2))  # long cinematic hall for the FX


def add(bus, t, x, pan=0.0, gain=1.0, send=0.0, hall=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    x = x[: N - i]
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)
    bus[i : i + len(x)] += x * gain
    if send:
        verb_send[i : i + len(x)] += x * gain * send
    if hall:
        hall_send[i : i + len(x)] += x * gain * hall


def tt(d):
    return np.arange(int(d * SR)) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def sos(kind, f, order=2):
    nyq = SR / 2
    if kind == "bp":
        return signal.butter(order, [f[0] / nyq, min(f[1] / nyq, 0.99)], "bandpass", output="sos")
    return signal.butter(order, min(f / nyq, 0.99), kind, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(sos(kind, f, order), x, axis=0)


def sweep(x, kind, f0, f1, curve=1.0, block=256):
    out = np.zeros_like(x)
    zi = None
    n = len(x)
    for s in range(0, n, block):
        q = (s / max(n - 1, 1)) ** curve
        so = sos(kind, f0 * (f1 / f0) ** q)
        if zi is None:
            zi = np.zeros((so.shape[0], 2))
        out[s : s + block], zi = signal.sosfilt(so, x[s : s + block], zi=zi)
    return out


def sine(f, d, phase=0.0):
    n = int(d * SR)
    ff = np.full(n, f) if np.isscalar(f) else f[:n]
    return np.sin(2 * np.pi * (phase + np.cumsum(ff) / SR))


def saw(f, d):
    n = int(d * SR)
    ph = (rng.random() + np.cumsum(np.full(n, f)) / SR) % 1.0
    return 2 * ph - 1


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------------------------------------------------------------- instruments
def piano(m, d=3.2, vel=1.0, felt=0.6):
    """felt piano: slightly inharmonic partials, two decay stages, hammer thump"""
    t = tt(d)
    f = midi(m)
    B = 0.0004
    x = np.zeros_like(t)
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (1 / k**1.25) * (1 if k == 1 else 0.85)
        dec = (2.6 if m < 60 else 1.9) / (1 + 0.45 * (k - 1))
        e = 0.7 * np.exp(-t / (dec * 0.18)) + 0.3 * np.exp(-t / dec)
        x += amp * sine(fk * (1 + 0.0007 * rng.standard_normal()), d, rng.random()) * e
    x *= np.minimum(1, t / 0.004)
    thump = filt(noise(0.03), "low", 900) * np.exp(-tt(0.03) / 0.008) * 0.25
    x[: len(thump)] += thump
    x = filt(x, "low", 1800 + 3200 * (1 - felt) * vel)
    rel = int(0.25 * SR)
    x[-rel:] *= np.linspace(1, 0, rel)
    return x * vel * 0.32


def pad(notes, d, gain=0.1, cutoff=1800, attack=1.4, release=1.6):
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for v in range(4):
            det = (v - 1.5) * 0.08
            s = saw(midi(m) * 2 ** (det / 12), d)
            pan = (v - 1.5) / 2
            a = (pan + 1) * np.pi / 4
            x[:, 0] += s * np.cos(a)
            x[:, 1] += s * np.sin(a)
    x = filt(x, "low", cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return x * e[:, None] * gain / (len(notes) * 2)


def sub(m, d, gain=0.5):
    t = tt(d)
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8)
    return sine(midi(m), d) * e * gain


def kick(g=1.0):
    d = 0.5
    t = tt(d)
    f = 48 + 90 * np.exp(-t / 0.035)
    x = sine(f, d) * np.exp(-t / 0.22)
    click = filt(noise(0.004), "high", 3000) * 0.3
    x[: len(click)] += click
    return np.tanh(1.4 * x) * g


def shaker():
    d = 0.09
    return filt(noise(d), "bp", (5000, 12000)) * np.exp(-tt(d) / 0.025) * 0.5


def bass(m, d):
    t = tt(d)
    x = 0.8 * sine(midi(m), d) + 0.2 * filt(saw(midi(m), d), "low", 380)
    e = np.minimum(1, t / 0.01) * np.exp(-t / 0.9)
    return np.tanh(1.5 * x * e) * 0.7


# ---------------------------------------------------------------- sfx
def whoosh(d=0.8, pan_from=-0.6, pan_to=0.6, lo=300, hi=5200):
    n = int(d * SR)
    x = sweep(noise(d), "low", lo, hi, curve=1.1)
    x = filt(x, "high", 140)
    q = np.linspace(0, 1, n)
    x = x * np.sin(np.pi * q) ** 2
    pans = np.linspace(pan_from, pan_to, n)
    a = (pans + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.35


def air(d=0.6):
    """softer, darker mask swish"""
    n = int(d * SR)
    x = filt(noise(d), "bp", (400, 2600))
    q = np.linspace(0, 1, n)
    return x * np.sin(np.pi * q) ** 3 * 0.35


def click():
    x = np.zeros(int(0.06 * SR))
    b = filt(noise(0.003), "bp", (2000, 8000))
    x[: len(b)] += b
    body = sine(2100, 0.01) * np.exp(-tt(0.01) / 0.002) * 0.3
    x[: len(body)] += body
    return x


def tick():
    return filt(noise(0.002), "high", 5000) * 0.6


def blip(f, d=0.14):
    t = tt(d)
    return (sine(f, d) + 0.15 * sine(f * 2, d)) * np.minimum(1, t / 0.002) * np.exp(-t / 0.045)


def bell(f, d=2.4, bright=1.0):
    t = tt(d)
    x = np.zeros_like(t)
    for r, a, dec in [(1, 1, 1.4), (2.0, 0.42 * bright, 0.7), (2.76, 0.25 * bright, 0.45), (5.4, 0.1 * bright, 0.2)]:
        x += a * sine(f * r, d, rng.random()) * np.exp(-t / dec)
    return x * np.minimum(1, t / 0.002) * 0.4


def pop():
    d = 0.08
    t = tt(d)
    return sine(320 + 820 * (t / d) ** 0.5, d) * np.exp(-t / 0.02) * 0.8


def switch_click():
    x = np.zeros(int(0.25 * SR))
    for off, g in [(0, 1.0), (0.016, 0.7)]:
        b = filt(noise(0.004), "bp", (2000, 8000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    th = sine(95, 0.12) * np.exp(-tt(0.12) / 0.03) * 0.8
    x[: len(th)] += th
    return x


def snap():
    d = 0.12
    t = tt(d)
    return filt(noise(d), "bp", (900, 4000)) * np.exp(-t / 0.015) + sine(180, d) * np.exp(-t / 0.03) * 0.4


def error_blip():
    return np.concatenate([blip(midi(70), 0.08), blip(midi(66), 0.12)]) * 0.6


def soft_impact():
    d = 2.2
    t = tt(d)
    s = sine(36 + 30 * np.exp(-t / 0.25), d) * np.exp(-t / 0.8)
    crack = filt(noise(d), "low", 1500) * np.exp(-t / 0.05) * 0.35
    return np.tanh(1.2 * (s + crack))


def reverse_swell(d=1.6):
    x = filt(noise(d), "bp", (300, 5000)) * np.exp(-tt(d) / 0.35)
    tone = sum(sine(midi(m), d) for m in (60, 67, 72)) * np.exp(-tt(d) / 0.5) * 0.2
    return (x * 0.5 + tone)[::-1]


# ---------------------------------------------------------------- cinematic
def hall_ir(rt=4.8, length=5.2, pre=0.03, lp=7000):
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.91 / rt)[:, None]
    ir = filt(ir, "low", lp)
    ir[: int(pre * SR)] = 0
    return ir / np.sqrt(np.sum(ir**2, axis=0))


HALL = hall_ir()


def braam(root=36, d=3.6, bright=1.0):
    """trailer brass: detuned saw stack, the filter blooms open then closes, saturated"""
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m, g in ((root, 1.0), (root + 12, 0.8), (root + 19, 0.45), (root - 12, 0.6)):
        for v in range(5):
            sgl = saw(midi(m) * 2 ** ((v - 2) * 0.09 / 12), d) * g
            a = ((v - 2) / 2.5 + 1) * np.pi / 4
            x[:, 0] += sgl * np.cos(a)
            x[:, 1] += sgl * np.sin(a)
    env_f = np.minimum(1, t / 0.18) * np.exp(-np.maximum(0, t - 0.18) / 0.9)
    out = np.zeros_like(x)
    zi = [None, None]
    for st in range(0, len(t), 256):
        so = sos("low", 180 + (1400 * bright - 180) * env_f[st])
        for ch in range(2):
            if zi[ch] is None:
                zi[ch] = np.zeros((so.shape[0], 2))
            out[st : st + 256, ch], zi[ch] = signal.sosfilt(so, x[st : st + 256, ch], zi=zi[ch])
    amp = np.minimum(1, t / 0.04) * (0.35 + 0.65 * np.exp(-t / 1.4)) * np.minimum(1, (d - t) / 0.8)
    return np.tanh(out * amp[:, None] * 0.55) * 0.8


def boom(size=1.0):
    """sub drop + low burst + a metallic ping"""
    d = 3.2
    t = tt(d)
    sub_ = sine(30 + 55 * np.exp(-t / 0.18), d) * np.exp(-t / (1.1 * size))
    burst = filt(noise(d), "low", 900) * np.exp(-t / 0.12) * 0.6
    ping = sum(a * sine(f, d, rng.random()) * np.exp(-t / dc) for f, a, dc in ((523, 0.25, 0.9), (1231, 0.15, 0.6), (2213, 0.08, 0.4)))
    x = np.tanh(1.6 * (sub_ + burst)) + ping * 0.5
    ramp = int(0.002 * SR)
    x[:ramp] *= np.linspace(0, 1, ramp)
    return x * 0.9


def laser_zap(d=0.55, pan_from=-0.8, pan_to=0.8):
    """FM zap that sweeps down and across as the beam crosses the frame"""
    t = tt(d)
    q = t / d
    fc = 4200 * (180 / 4200) ** (q**0.7)
    mod = np.sin(2 * np.pi * np.cumsum(fc * 1.5) / SR) * 6 * np.exp(-q * 3)
    x = np.sin(2 * np.pi * np.cumsum(fc) / SR + mod)
    x += filt(noise(d), "high", 5000) * 0.25 * np.exp(-q * 4)
    x *= np.minimum(1, t / 0.006) * np.exp(-q * 2.2)
    a = (np.linspace(pan_from, pan_to, len(t)) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.4


def flash_hit():
    """bright camera-flash crack: sizzle + glassy partials"""
    d = 1.4
    t = tt(d)
    sizzle = filt(noise(d), "high", 3500) * np.exp(-t / 0.09)
    glass = sum(sine(f, d, rng.random()) * np.exp(-t / dc) * a for f, a, dc in ((3520, 0.3, 0.5), (5274, 0.2, 0.35), (7040, 0.12, 0.25), (2637, 0.2, 0.7)))
    return (sizzle * 0.7 + glass) * np.minimum(1, t / 0.001)


def shimmer(d=2.6):
    t = tt(d)
    x = sum(sine(midi(m), d, rng.random()) * np.exp(-t / 1.2) for m in (91, 95, 98, 103))
    return x * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t)) * np.minimum(1, t / 0.05) * 0.12


def riser2(d=2.0):
    """tonal glissando + noise, accelerating into the hit"""
    t = tt(d)
    q = t / d
    gl = np.zeros_like(t)
    for m in (48, 55, 60):
        f = midi(m) * 2 ** (q**1.6)
        gl += np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    nz = sweep(noise(d), "high", 200, 8000, curve=1.8)
    return (filt(gl, "low", 2600) * 0.3 + nz * 0.45) * q**2.4


def reverse_reverb(x, length=1.2):
    """the hall tail of x, reversed — it sucks into the hit"""
    tail = np.stack([signal.fftconvolve(x, HALL[:, ch])[: int(length * SR)] for ch in range(2)], 1)
    tail = tail[::-1] * np.linspace(0.2, 1, len(tail))[:, None] ** 2
    return tail / (np.max(np.abs(tail)) + 1e-9) * 0.5


def leak_swell(d=3.0):
    t = tt(d)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    x = filt(noise(d), "bp", (1500, 6000)) * 0.15 + sum(sine(midi(m), d, rng.random()) for m in (79, 86)) * 0.05
    return x * e


# ================================================================= SCORE
first = SC["hook"]["start"]
turn_hit = W("name", 0)
groove_start = W("mods", 0)
groove_end = SC["maera"]["start"] + 0.95
real_start = W("real1", 0)
close_t = W("close", 0)
sign_t = W("sign", 0)

# ---- prologue + act 1: A minor ---------------------------------------------------------------
add(music, 0.0, pad([45, 52], turn_hit - 1.6, gain=0.5, cutoff=600, attack=2.0, release=2.4), gain=0.9)
add(music, 0.0, np.stack([sub(33, turn_hit - 1.8, 0.35)] * 2, 1))
A1 = [  # (chord tones for the pad, piano ostinato) per bar
    ([57, 60, 64, 71], [57, 64, 71, 72]),  # Am(add9)
    ([53, 57, 60, 64], [53, 60, 64, 69]),  # Fmaj7
    ([57, 60, 64, 71], [57, 64, 71, 72]),  # Am
    ([52, 55, 59, 62], [52, 59, 62, 67]),  # Em7
]
bar0 = 0.0
b = 0
while bar0 + b * BAR < turn_hit - BAR * 1.5:
    t0 = bar0 + b * BAR
    chord, arp = A1[b % 4]
    add(music, t0, pad(chord, BAR + 0.8, gain=0.22, cutoff=1300 + 120 * b, attack=0.8, release=0.8))
    if t0 >= first - 0.1:
        for j, m in enumerate(arp):
            tj = t0 + j * BEAT
            add(music, tj, piano(m + 12 * (j == 3), 2.6, vel=0.75 - 0.1 * (j % 2)), pan=-0.3 + 0.2 * j, send=0.35)
    else:
        add(music, t0 + 0.4, piano(arp[0] + 12, 3.0, vel=0.6), send=0.5)
    # a muted heartbeat pulse from chapter 01
    if t0 >= SC["sheets"]["start"] - 0.1:
        for q in (0, 2):
            add(drums, t0 + q * BEAT, filt(kick(0.35), "low", 220), send=0.05)
    b += 1

# ---- the turn: drain, swell, bloom ------------------------------------------------------------
add(sfx, turn_hit - 1.6, reverse_swell(1.6), gain=0.7, send=0.4)
C_WORLD = [
    ([48, 55, 60, 64, 67], [60, 64, 67, 72], 36),  # C
    ([47, 55, 59, 62, 67], [59, 62, 67, 71], 35),  # G/B
    ([45, 52, 57, 60, 64], [57, 60, 64, 69], 33),  # Am7
    ([41, 53, 57, 60, 64], [57, 60, 64, 65], 29),  # Fmaj7
]
add(music, turn_hit, pad([48, 55, 64, 67, 71, 74], BAR * 2.2, gain=0.42, cutoff=2600, attack=0.05, release=2.0), send=0.4)
add(music, turn_hit, piano(48, 4, 0.9), send=0.5)
add(music, turn_hit, piano(64, 4, 0.7), send=0.5)
add(music, turn_hit, piano(67, 4, 0.7), send=0.5)
add(sfx, turn_hit, bell(midi(84), 2.6), gain=0.22, send=0.6)

t0 = turn_hit + BAR
b = 0
while t0 < sign_t - 0.05:
    chord, arp, root = C_WORLD[b % 4]
    in_groove = groove_start - BAR <= t0 < groove_end
    in_real = groove_end <= t0 < close_t - 0.3
    in_close = t0 >= close_t - 0.3
    gain = 0.26 if in_groove else 0.22
    add(music, t0, pad(chord, BAR + 0.6, gain=gain, cutoff=2200 if in_groove else 1700, attack=0.5, release=0.7))
    # piano: 8th arpeggio in the groove, quarter notes elsewhere
    step = BEAT / 2 if (in_groove or in_close) else BEAT
    nsteps = int(round(BAR / step))
    for j in range(nsteps):
        m = arp[j % len(arp)] + (12 if (in_groove and j % 4 == 3) else 0)
        add(music, t0 + j * step, piano(m, 2.0, vel=0.62 if j % 2 else 0.72, felt=0.5), pan=-0.35 + 0.7 * ((j % 4) / 3), send=0.3)
    add(music, t0, bass(root, BAR), gain=0.6 if (in_groove or in_close) else 0.4)
    if in_groove or in_close:
        for q in range(4):
            add(drums, t0 + q * BEAT, kick(0.6 if q % 2 == 0 else 0.4))
            add(drums, t0 + q * BEAT + BEAT / 2, shaker(), pan=0.3, gain=0.6)
            add(drums, t0 + q * BEAT + BEAT / 4 * 3, shaker(), pan=-0.3, gain=0.3)
    elif in_real:
        add(drums, t0, kick(0.45))
        add(drums, t0 + 2.5 * BEAT, kick(0.3))
        for q in range(4):
            add(drums, t0 + q * BEAT + BEAT / 2, shaker(), pan=0.25, gain=0.35)
    t0 += BAR
    b += 1

# the final bloom on "One" of the sign-off: Cmaj9, let ring
add(music, sign_t, pad([36, 48, 55, 59, 62, 64, 67], DUR - sign_t + 0.5, gain=0.5, cutoff=2400, attack=0.05, release=3.2), send=0.5)
for j, m in enumerate([48, 55, 59, 62, 64, 71]):
    add(music, sign_t + j * 0.06, piano(m, 5.5, 0.75), pan=-0.4 + 0.16 * j, send=0.55)
add(music, sign_t, np.stack([sub(36, DUR - sign_t, 0.4)] * 2, 1))
add(sfx, sign_t, soft_impact(), gain=0.55, send=0.2)
add(sfx, sign_t, bell(midi(84), 3.5), gain=0.2, send=0.7)
# a quiet arpeggio under the CTA
cta = CUES["sign"]["speechEnd"] + 0.35
for j, m in enumerate([72, 76, 79, 83, 84, 88]):
    add(music, cta + 0.6 + j * BEAT / 2, piano(m, 2.4, 0.4), pan=0.3 - 0.12 * j, send=0.6)

# ================================================================= SOUND DESIGN (picture-locked)
# prologue: a soft tone and the rule
add(sfx, 0.15, air(1.0), gain=0.6, send=0.3)
add(sfx, 0.9, bell(midi(76), 2.0, 0.6), gain=0.12, send=0.6)

# scene masks
for s in TL["scenes"][1:]:
    if s["id"] in ("hook",):
        continue
    if s["id"] == "turn":
        add(sfx, s["start"], whoosh(0.6, 0.6, -0.6, hi=3000)[::-1], gain=0.6)
        continue
    add(sfx, s["start"] - 0.05, whoosh(0.85, -0.5, 0.5), gain=0.55, send=0.15, hall=0.35)
# chapter cards: rule draw + soft tone
for sid, m in (("sheets", 69), ("mods", 72), ("maera", 76)):
    at = SC[sid]["start"]
    add(sfx, at + 0.1, bell(midi(m), 2.0, 0.5), gain=0.12, send=0.6)
    add(sfx, at + 0.95, air(0.7), gain=0.5)

# hook: windows pop in, then break
for i in range(6):
    add(sfx, W("open1", 5) - 0.2 + i * 0.07 + 0.1, pop(), pan=-0.6 + 0.24 * i, gain=0.25)
add(sfx, W("open2", 4), error_blip(), gain=0.35)

# spreadsheet: cells tick in, errors blip
fill0 = SC["sheets"]["start"] + 0.95 + 0.25
for k in range(0, 96, 2):
    add(sfx, fill0 + k * 0.022, tick(), pan=rng.uniform(-0.5, 0.5), gain=0.35)
for j, dt in enumerate((0.0, 0.45, 0.8, 1.3)):
    add(sfx, W("prob1", 2) + dt, blip(midi(70 - j), 0.1), gain=0.18, pan=0.3 - 0.2 * j)

# five tools: tiles land, links draw, links snap
for i in range(5):
    add(sfx, W("prob2", 0) + i * 0.09, pop(), pan=-0.5 + 0.25 * i, gain=0.3)
add(sfx, W("prob2", 1) + 0.15, whoosh(0.7, -0.3, 0.3, lo=800, hi=6000), gain=0.25)
for k in range(5):
    add(sfx, W("prob2", 3) + k * 0.06, snap(), pan=-0.4 + 0.2 * k, gain=0.4)
add(sfx, W("prob2", 3), error_blip(), gain=0.3)

# website: hover tick, "nothing" thud
add(sfx, SC["site"]["start"] + 2.1, click(), gain=0.25)
add(sfx, W("prob3", 7), blip(midi(57), 0.3), gain=0.35)
add(sfx, W("prob3", 7), soft_impact()[: int(0.8 * SR)], gain=0.25)

# turn: switch on
add(sfx, turn_hit - 0.05, switch_click(), gain=0.8, send=0.2)

# product deck fan
for i in range(6):
    add(sfx, W("what", 4) - 0.1 + i * 0.06, pop(), pan=-0.6 + 0.24 * i, gain=0.22)

# modules: a switch click + rising blip on each
mods_words = (0, 1, 2, 6, 8, 10)
for j, wi in enumerate(mods_words):
    at = W("mods", wi) - 0.1
    add(sfx, at, switch_click(), gain=0.45, pan=0.3)
    add(sfx, at + 0.04, blip(midi(72 + [0, 2, 4, 7, 9, 12][j]), 0.16), gain=0.2, send=0.4)
    add(sfx, at - 0.05, air(0.5), gain=0.35)

# maera: a soft shutter on each cut of the real footage
card_m = SC["maera"]["start"] + 0.95
for at in (card_m + 0.15, W("real1", 5) - 0.1, W("real1", 7) - 0.1, W("real1", 11) - 0.1):
    add(sfx, at - 0.05, air(0.5), gain=0.45, hall=0.2)
    add(sfx, at, click(), gain=0.35, hall=0.25)
for i in range(4):
    add(sfx, W("real1", 8) + i * 0.09, pop(), pan=-0.4 + 0.27 * i, gain=0.2)

# store: night dings
for i in range(4):
    at = W("real2", 3) - 0.2 + i * 0.42
    add(sfx, at, bell(midi(88), 1.0, 0.4), gain=0.14, pan=0.2, send=0.5)
    add(sfx, at, pop(), gain=0.2)

# team: tiles pop, merge, one system opens
for i in range(5):
    add(sfx, SC["team"]["start"] + 0.1 + i * 0.07, pop(), pan=-0.5 + 0.25 * i, gain=0.22)
one = W("real3", 6) - 0.1
add(sfx, one - 0.35, whoosh(0.8, -0.6, 0.0, lo=500, hi=4000), gain=0.5)
add(sfx, one + 0.35, soft_impact()[: int(1.2 * SR)], gain=0.35)
add(sfx, one + 0.8, switch_click(), gain=0.4)

# close: converge
add(sfx, W("close", 3) - 0.25, whoosh(0.7, 0.6, -0.6, lo=400, hi=3500), gain=0.4)
add(sfx, W("close", 5), bell(midi(79), 1.8), gain=0.14, send=0.6)

# sign-off: switch on, strike, CTA click
add(sfx, sign_t - 0.05, switch_click(), gain=0.7, send=0.2)
add(sfx, W("sign", 5), filt(noise(0.25), "bp", (1500, 6000)) * np.exp(-tt(0.25) / 0.06) * 0.4, gain=0.6)
add(sfx, cta, air(0.8), gain=0.4)
add(sfx, cta + 1.6, click(), gain=0.7, hall=0.3)
add(sfx, cta + 1.62, bell(midi(91), 1.6), gain=0.14, send=0.6, hall=0.5)

# ================================================================= CINEMATIC FX (timeline fx)
for f in TL["fx"]:
    t0 = f["t"]
    if f["kind"] == "laser":
        dirn = 1 if f["angle"] < 0 else -1
        add(sfx, t0, laser_zap(0.55, -0.8 * dirn, 0.8 * dirn), gain=0.55, hall=0.55)
        add(sfx, t0 + 0.06, laser_zap(0.45, -0.5 * dirn, 0.9 * dirn), gain=0.2, hall=0.5)
        add(sfx, t0 - 0.05, whoosh(0.7, -0.7 * dirn, 0.7 * dirn, lo=600, hi=8000), gain=0.35, hall=0.4)
    elif f["kind"] == "flash":
        k = f.get("k", 1.0)
        big = k >= 0.95
        add(sfx, t0, flash_hit(), gain=0.5 * k, hall=0.7)
        add(sfx, t0, boom(1.0 if big else 0.6), gain=0.75 * k, hall=0.45)
        add(sfx, t0 - 1.2, reverse_reverb(flash_hit() + boom()[: int(1.4 * SR)] * 0.5), gain=0.55 * k)
        add(sfx, t0, braam(36 if big else 33, 3.8 if big else 2.6, 1.0 if big else 0.7), gain=0.5 * k, hall=0.5)
    elif f["kind"] == "flare":
        add(sfx, t0, shimmer(2.6), gain=0.7, hall=0.9)
    elif f["kind"] == "leak":
        add(sfx, t0, leak_swell(f["dur"]), gain=0.5, hall=0.8)

# risers into the two big hits
for hit in (turn_hit, sign_t):
    add(sfx, hit - 2.0, riser2(2.0), gain=0.45, hall=0.3)

# ================================================================= VOICE
vo = np.zeros(N)
for cid, c in CUES.items():
    with wave.open(os.path.join(ROOT, "public", "doc", "vo", f"{cid}.wav")) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    i = int(round(c["start"] * SR))
    vo[i : i + len(x)] += x[: N - i]
vo = filt(vo, "high", 80, 2)
bq, aq = signal.iirpeak(3000 / (SR / 2), 0.9)
vo = vo + 0.2 * signal.lfilter(bq, aq, vo)
bq, aq = signal.iirpeak(160 / (SR / 2), 1.2)
vo = vo + 0.14 * signal.lfilter(bq, aq, vo)
rms = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.01 * SR)), 0) + 1e-12)
db = 20 * np.log10(rms)
gdb = uniform_filter1d(np.where(db > -20, (db + 20) * (1 / 3 - 1), 0), int(0.02 * SR))
vo = vo * 10 ** (gdb / 20)
vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.72
vo_st = np.stack([vo, vo], 1)
verb_send += vo_st * 0.06

# ================================================================= MIX
env = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.03 * SR)), 0))
env = uniform_filter1d(maximum_filter1d(env, int(0.25 * SR)), int(0.12 * SR))
duck = 1 - 0.5 * np.clip(env / (np.max(env) * 0.35 + 1e-9), 0, 1)
music_bus = music * duck[:, None]
drum_bus = drums * (0.8 + 0.2 * duck)[:, None]

ir_len = int(3.0 * SR)
ir_t = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-ir_t * 6.91 / 2.8)[:, None]
ir = filt(ir, "low", 5000)
ir[: int(0.015 * SR)] = 0
ir /= np.sqrt(np.sum(ir**2, axis=0))
send = filt(verb_send, "high", 250)
verb = np.stack([signal.fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], 1) * 0.5
hsend = filt(hall_send, "high", 180)
hall = np.stack([signal.fftconvolve(hsend[:, ch], HALL[:, ch])[:N] for ch in range(2)], 1) * 0.6
hall *= (0.55 + 0.45 * duck)[:, None]  # the tail tucks under the voice

mix = vo_st + music_bus * 0.85 + drum_bus * 0.75 + sfx * (0.8 * (0.7 + 0.3 * duck))[:, None] + verb + hall
mix = np.tanh(mix * 1.1) / 1.1
ceiling = 10 ** (-1 / 20)
w_ = int(0.006 * SR)


def limit(x):
    peak = maximum_filter1d(np.max(np.abs(x), axis=1), int(0.004 * SR))
    g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (peak + 1e-9)), w_), w_)
    return x * g[:, None]


mix = limit(mix)
rms_all = np.sqrt(np.mean(mix**2))
mix *= min(10 ** (-16 / 20) / rms_all, 2.5)
mix = np.clip(limit(mix), -ceiling, ceiling)

n_out = int(DUR * SR)
mix = mix[:n_out]
f = int(0.01 * SR)
mix[:f] *= np.linspace(0, 1, f)[:, None]
tail = int(1.5 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2

os.makedirs(os.path.join(ROOT, "public", "doc"), exist_ok=True)
with wave.open(os.path.join(ROOT, "public", "doc", "master.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"doc/master.wav  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS")
