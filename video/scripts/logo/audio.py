"""
Music + sound design for the One Prime logo film, locked to src/logo/cues.json.

  music   100 BPM: an ambient Am9 / Fmaj9 bed with a heartbeat under the point, a pulse that grows with
          each flip of the switch, a light groove through the "ne", the blueprint and the slices, the full
          groove under the colour fields, and one C major 9 chord blooming on the final click.
  sfx     every move of the mark has its sound — the point's bloop, the rubbery stretch, the hollow's
          suction, a water drop per droplet, switch clicks with booms as the world inverts, the letters'
          fall + squash, pen and ticks for the blueprint, swishes for each slice — through a plate, a
          ping-pong delay and a 4.6 s hall.

Writes public/logo/master.wav (48 kHz stereo).
"""

import json
import os
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 48000
Q = json.load(open(os.path.join(ROOT, "src", "logo", "cues.json"), encoding="utf-8"))
DUR = Q["duration"]
N = int(DUR * SR) + SR
BEAT = 60 / Q["bpm"]
BAR = 4 * BEAT
rng = np.random.default_rng(11)

music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
plate_send = np.zeros((N, 2))
hall_send = np.zeros((N, 2))


def add(bus, t, x, pan=0.0, gain=1.0, plate=0.0, hall=0.0):
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
    y = x * gain
    bus[i : i + len(y)] += y
    if plate:
        plate_send[i : i + len(y)] += y * plate
    if hall:
        hall_send[i : i + len(y)] += y * hall


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


def osc(f, d, shape="sine"):
    n = int(d * SR)
    ff = np.full(n, f) if np.isscalar(f) else np.asarray(f)[:n]
    ph = np.cumsum(ff) / SR
    if shape == "sine":
        return np.sin(2 * np.pi * ph)
    if shape == "tri":
        return 2 * np.abs(2 * (ph % 1) - 1) - 1
    return 2 * (ph % 1) - 1


def noise(d):
    return rng.standard_normal(int(d * SR))


def env(d, a=0.003, r=0.2):
    t = tt(d)
    return np.minimum(1, t / a) * np.exp(-t / r)


# ---------------------------------------------------------------- instruments
def pluck(m, d=0.5, bright=1.0):
    """marimba-ish: sine + 4th harmonic with a mallet click"""
    t = tt(d)
    f = midi(m)
    x = osc(f, d) * np.exp(-t / 0.28) + 0.35 * osc(f * 4, d) * np.exp(-t / 0.05) * bright + 0.15 * osc(f * 10, d) * np.exp(-t / 0.012) * bright
    return x * np.minimum(1, t / 0.002) * 0.4


def pad(notes, d, gain=0.1, cutoff=2000, attack=0.6, release=0.8):
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for v in range(3):
            s = osc(midi(m) * 2 ** ((v - 1) * 0.07 / 12), d, "saw")
            a = ((v - 1) / 1.5 + 1) * np.pi / 4
            x[:, 0] += s * np.cos(a)
            x[:, 1] += s * np.sin(a)
    x = filt(x, "low", cutoff)
    e = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, d - t) / release)
    return x * e[:, None] * gain / len(notes)


def kick(g=1.0):
    d = 0.4
    t = tt(d)
    x = osc(45 + 110 * np.exp(-t / 0.03), d) * np.exp(-t / 0.18)
    return np.tanh(1.6 * x) * g


def clap():
    d = 0.25
    x = np.zeros(int(d * SR))
    for k, off in enumerate((0, 0.01, 0.021)):
        b = filt(noise(0.02), "bp", (900, 5000)) * np.exp(-tt(0.02) / 0.004)
        i = int(off * SR)
        x[i : i + len(b)] += b
    tail = filt(noise(d), "bp", (900, 5000)) * np.exp(-tt(d) / 0.06) * 0.6
    return (x + tail) * 0.6


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    return filt(noise(d), "high", 7000) * np.exp(-tt(d) / (0.06 if open_ else 0.012)) * 0.35


def bass(m, d):
    t = tt(d)
    x = osc(midi(m), d) * 0.85 + 0.15 * filt(osc(midi(m), d, "saw"), "low", 500)
    return np.tanh(1.4 * x * np.minimum(1, t / 0.006) * np.exp(-t / 0.35)) * 0.7


# ---------------------------------------------------------------- sfx
def boing(f0=180, d=0.45, depth=0.5, rate=14):
    """a spring: pitch wobbles around f0 and settles, like the elastic it accompanies"""
    t = tt(d)
    f = f0 * (1 + depth * np.exp(-t * 7) * np.sin(2 * np.pi * rate * t)) * (1 + 0.6 * np.exp(-t * 25))
    x = osc(f, d, "tri") * 0.6 + osc(f, d) * 0.4
    return x * env(d, 0.002, 0.16) * 0.7


def pop(f=600, d=0.07):
    t = tt(d)
    return osc(f * (1 + 2.5 * np.exp(-t / 0.008)), d) * np.exp(-t / 0.018) * 0.8


def bloop(f0=200, f1=700, d=0.22):
    t = tt(d)
    f = f0 * (f1 / f0) ** np.minimum(1, t / (d * 0.6))
    return osc(f, d) * np.sin(np.pi * np.minimum(1, t / d)) ** 0.5 * np.exp(-t / 0.12) * 0.8


def whistle(f0, f1, d):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return osc(f, d) * np.sin(np.pi * t / d) * 0.35


def whoosh(d=0.5, lo=300, hi=6000, rising=True, pan_from=-0.6, pan_to=0.6):
    n = int(d * SR)
    x = sweep(noise(d), "low", lo, hi, 1.2) if rising else sweep(noise(d), "low", hi, lo, 0.7)
    x = filt(x, "high", 150)
    q = np.linspace(0, 1, n)
    x = x * np.sin(np.pi * q) ** 2
    a = (np.linspace(pan_from, pan_to, n) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.4


def zip_(d=0.18, up=True):
    t = tt(d)
    f = (300 * (6000 / 300) ** (t / d)) if up else (6000 * (300 / 6000) ** (t / d))
    x = osc(f, d, "saw") * 0.2 + filt(noise(d), "high", 2000) * 0.3
    return filt(x, "low", 7000) * np.sin(np.pi * t / d) * 0.6


def click():
    x = np.zeros(int(0.06 * SR))
    b = filt(noise(0.003), "bp", (2000, 8000))
    x[: len(b)] += b
    body = osc(2100, 0.01) * np.exp(-tt(0.01) / 0.002) * 0.3
    x[: len(body)] += body
    return x


def switch_click():
    x = np.zeros(int(0.25 * SR))
    for off, g in ((0, 1.0), (0.016, 0.7)):
        b = filt(noise(0.004), "bp", (2000, 8000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    th = osc(95, 0.12) * np.exp(-tt(0.12) / 0.03) * 0.8
    x[: len(th)] += th
    return x


def tick():
    x = osc(3200, 0.01) * np.exp(-tt(0.01) / 0.002) * 0.2
    x[: int(0.003 * SR)] += filt(noise(0.003), "high", 3000) * 0.8
    return x


def bell(f, d=1.6, bright=1.0):
    t = tt(d)
    x = sum(a * osc(f * r, d) * np.exp(-t / dc) for r, a, dc in ((1, 1, 1.1), (2, 0.4 * bright, 0.5), (2.76, 0.25 * bright, 0.35), (5.4, 0.1 * bright, 0.15)))
    return x * np.minimum(1, t / 0.002) * 0.35


def sparkle(d=0.9, n=9, base=88):
    out = np.zeros(int(d * SR))
    for k in range(n):
        m = base + rng.choice([0, 3, 5, 7, 10, 12, 15])
        b = bell(midi(m), 0.5, 0.6) * 0.5
        i = int(rng.uniform(0, d - 0.5) * SR)
        out[i : i + len(b)] += b[: len(out) - i]
    return out


def bwomp(d=0.7):
    """the ball filling the screen: a low sweep up + body"""
    t = tt(d)
    f = 60 * (240 / 60) ** (t / d) ** 0.6
    x = osc(f, d, "saw")
    x = sweep(x, "low", 150, 2500, 0.8) * np.sin(np.pi * np.minimum(1, t / d)) ** 0.6
    return np.tanh(x * 1.5) * 0.5


def impact():
    d = 2.0
    t = tt(d)
    s = osc(32 + 60 * np.exp(-t / 0.15), d) * np.exp(-t / 0.7)
    burst = filt(noise(d), "low", 1200) * np.exp(-t / 0.08) * 0.5
    return np.tanh(1.5 * (s + burst)) * 0.9


def riser(d):
    t = tt(d)
    q = t / d
    nz = sweep(noise(d), "high", 200, 9000, 1.6) * q**2
    tone = filt(osc(midi(60) * 2 ** (2 * q**1.5), d, "saw"), "low", 3000) * q**2.5
    return nz * 0.4 + tone * 0.25


def scribble(d=0.18):
    t = tt(d)
    x = filt(noise(d), "bp", (1800, 6000)) * (0.6 + 0.4 * np.sin(2 * np.pi * 40 * t))
    return x * np.sin(np.pi * t / d) * 0.35


delay_send = np.zeros((N, 2))


def addd(t, x, pan=0.0, gain=1.0, d=0.5, plate=0.0, hall=0.0):
    """music-bus add with a send into the ping-pong delay"""
    add(music, t, x, pan, gain, plate, hall)
    i = int(round(t * SR))
    if i >= N:
        return
    y = x * gain
    if y.ndim == 1:
        a = (pan + 1) * np.pi / 4
        y = np.stack([y * np.cos(a), y * np.sin(a)], 1) * np.sqrt(2)
    y = y[: N - i]
    delay_send[i : i + len(y)] += y * d


def reverse_swell(d=1.0, f=(400, 7000)):
    x = filt(noise(d), "bp", f) * np.exp(-tt(d) / (d * 0.3))
    tone = sum(osc(midi(m), d) for m in (69, 76, 81)) * np.exp(-tt(d) / (d * 0.35)) * 0.15
    return (x * 0.5 + tone)[::-1]


def shimmer(d=1.6, base=84):
    t = tt(d)
    x = sum(osc(midi(base + m), d) * np.exp(-t / 0.8) for m in (0, 7, 12, 16, 19))
    return x * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t / 0.08) * 0.06


def thud():
    d = 0.5
    t = tt(d)
    return osc(70 + 80 * np.exp(-t / 0.02), d) * np.exp(-t / 0.09) * 0.9 + filt(noise(d), "low", 900) * np.exp(-t / 0.02) * 0.3


def squelch(d=0.7):
    """the point stretching into a capsule: a rubbery low bend with wobble"""
    t = tt(d)
    f = 90 * (1 + 1.4 * (1 - np.exp(-t * 6))) * (1 + 0.12 * np.exp(-t * 4) * np.sin(2 * np.pi * 9 * t))
    x = osc(f, d, "tri") * 0.6 + osc(f * 2, d) * 0.25
    x = sweep(x, "low", 400, 2200, 0.6)
    return np.tanh(1.6 * x) * np.sin(np.pi * np.minimum(1, t / d)) ** 0.5 * 0.6


def droplet(f=1400):
    """water drop: a fast downward-then-up sine chirp"""
    d = 0.12
    t = tt(d)
    fr = f * (0.55 + 0.45 * np.exp(-t / 0.012)) * (1 + 0.8 * (t / d) ** 2)
    return osc(fr, d) * np.exp(-t / 0.035) * np.minimum(1, t / 0.001) * 0.6


def suction(d=0.45):
    t = tt(d)
    x = sweep(noise(d), "low", 6000, 300, 0.7) * np.sin(np.pi * t / d) ** 2
    return filt(x, "high", 150) * 0.5


def swish(d=0.16):
    t = tt(d)
    x = sweep(noise(d), "low", 1500, 9000, 1.0)
    return filt(x, "high", 800) * np.sin(np.pi * t / d) ** 2 * 0.5


def soft_kick():
    d = 0.6
    t = tt(d)
    return np.tanh(1.3 * osc(42 + 70 * np.exp(-t / 0.035), d) * np.exp(-t / 0.28)) * 0.8


def shaker():
    d = 0.08
    return filt(noise(d), "bp", (5000, 12000)) * np.exp(-tt(d) / 0.022) * 0.35


def heartbeat():
    out = np.zeros(int(0.6 * SR))
    for off, g in ((0, 1.0), (0.22, 0.6)):
        k = soft_kick() * g * 0.7
        i = int(off * SR)
        out[i : i + len(k)] += k[: len(out) - i]
    return filt(out, "low", 180)


# ================================================================= MUSIC
AMB = [(33, [57, 60, 64, 67, 71]), (29, [57, 60, 64, 65, 69])]  # Am9, Fmaj9
WORLD = [(36, [60, 64, 67, 71, 74]), (31, [55, 59, 62, 67, 69]), (33, [57, 60, 64, 67, 71]), (29, [57, 60, 64, 65, 69])]  # C G Am F (9ths)

# ambient opening: pad + sparse delayed plucks + a heartbeat under the point
t0, bi = 0.0, 0
while t0 < Q["on1"] - 0.2:
    root, tones = AMB[bi % 2]
    add(music, t0, pad(tones, BAR + 1.2, 0.11, 1400, 1.0, 1.0), plate=0.3, hall=0.6)
    for j, n in ((0, 4), (3, 2), (6, 3)):
        addd(t0 + j * BEAT / 2, pluck(tones[n] + 12, 0.9, 0.5), pan=-0.4 + 0.4 * (j / 3), gain=0.24, hall=0.5)
    t0 += BAR
    bi += 1
for hb in (Q["dot"], Q["dot"] + BEAT * 2, Q["stretch"] - 0.02):
    add(drums, hb, heartbeat(), gain=0.7, hall=0.1)

# the switch section: pulse that grows with every flip
for i, at in enumerate((Q["on1"], Q["off1"], Q["on2"])):
    root, tones = WORLD[i % 4]
    add(music, at, pad(tones, 0.85, 0.16, 2200, 0.03, 0.4), plate=0.3, hall=0.5)
    add(music, at, bass(root, 0.8), gain=0.7)
    for q in range(2):
        add(drums, at + q * BEAT, soft_kick(), gain=0.7, hall=0.1)

# a light groove from the "ne" through the blueprint and the slices
def groove(a, b, level=1.0, dense=False):
    t0, bi = a, 0
    while t0 < b - 0.05:
        root, tones = WORLD[bi % 4]
        add(music, t0, pad(tones, BAR + 0.4, 0.12 * level, 2000, 0.3, 0.5), plate=0.2, hall=0.4)
        for j in range(8):
            if not dense and j % 2:
                continue
            addd(t0 + j * BEAT / 2, pluck(tones[(j * 2) % 5] + 12, 0.6, 0.6), pan=-0.5 + (j % 4) / 3, gain=0.26 * level, d=0.4, plate=0.2, hall=0.3)
        for q in range(4):
            add(drums, t0 + q * BEAT, soft_kick(), gain=(0.65 if q % 2 == 0 else 0.45) * level, hall=0.08)
            add(drums, t0 + q * BEAT + BEAT / 2, shaker(), pan=0.3, gain=0.8 * level, plate=0.2)
            if dense:
                add(drums, t0 + q * BEAT + BEAT * 0.75, shaker(), pan=-0.3, gain=0.4 * level, plate=0.2)
                if q % 2:
                    add(drums, t0 + q * BEAT, clap(), gain=0.45 * level, plate=0.3)
        for q in (0, 1.5, 2, 3.5):
            add(music, t0 + q * BEAT, bass(root, BEAT * 0.9), gain=0.55 * level)
        t0 += BAR
        bi += 1


groove(Q["neMove"], Q["prime"] + 2.6, 0.85, dense=False)
add(sfx, Q["words"][0] - 2.0, riser(2.0), gain=0.45, hall=0.3)
groove(Q["words"][0], Q["final"], 1.0, dense=True)
# the end: one chord blooms
add(music, Q["click"], pad([48, 55, 64, 67, 71, 74, 79], DUR - Q["click"] + 0.5, 0.22, 2600, 0.04, 2.0), plate=0.4, hall=0.9)
for j, m in enumerate([60, 67, 71, 74, 79, 84]):
    addd(Q["click"] + j * 0.07, pluck(m + 12, 1.8, 0.5), pan=-0.5 + 0.2 * j, gain=0.28, d=0.5, hall=0.8)
add(music, Q["click"], bass(36, 2.0), gain=0.6)

# ================================================================= SOUND DESIGN
add(sfx, Q["dot"] - 0.9, reverse_swell(0.95), gain=0.45, hall=0.5)
add(sfx, Q["dot"], bloop(120, 420, 0.3), gain=0.7, plate=0.3, hall=0.4)
add(sfx, Q["dot"] + 0.02, bell(midi(81), 2.0, 0.6), gain=0.18, hall=0.8)
add(sfx, Q["tPoint"], shimmer(1.6, 81), gain=0.8, hall=0.7)

add(sfx, Q["stretch"], squelch(0.75), gain=0.8, plate=0.3, hall=0.4)
add(sfx, Q["stretch"] + 0.05, boing(110, 0.6, 0.45, 8), gain=0.4, hall=0.3)
for d, pan in ((0.25, -0.6), (0.32, 0.6)):
    add(sfx, Q["stretch"] + d, droplet(1600), gain=0.4, pan=pan, plate=0.4, hall=0.4)
add(sfx, Q["tCapsule"], shimmer(1.6, 84), gain=0.7, hall=0.7)
add(sfx, Q["hollow"] - 0.05, suction(0.45), gain=0.7, plate=0.3, hall=0.5)
add(sfx, Q["hollow"] + 0.3, bell(midi(88), 1.6, 0.5), gain=0.15, hall=0.8)

# droplets: one water drop per arrival — drop i lands at drops + order[i] * 0.08 + 0.55 (see DROPS in Logo.jsx)
for n in range(8):
    arrive = Q["drops"] + n * 0.08 + 0.55
    add(sfx, arrive, droplet(1100 + 110 * n), gain=0.45, pan=-0.7 + 0.2 * n, plate=0.4, hall=0.5)
add(sfx, Q["drops"], whoosh(0.7, 600, 7000, True, -0.6, 0.6), gain=0.3, hall=0.5)
add(sfx, Q["merge"], bloop(180, 520, 0.35), gain=0.7, plate=0.3, hall=0.5)
add(sfx, Q["merge"] + 0.02, boing(240, 0.4, 0.35), gain=0.3, hall=0.3)
add(sfx, Q["tIdea"], shimmer(1.6, 86), gain=0.7, hall=0.7)

# the switch flips the world
for i, (at, on) in enumerate(((Q["on1"], True), (Q["off1"], False), (Q["on2"], True))):
    add(sfx, at, switch_click(), gain=0.9, plate=0.5, hall=0.6)
    if on:
        add(sfx, at - 0.6, reverse_swell(0.62), gain=0.45, hall=0.3)
        add(sfx, at, whoosh(0.6, 300, 7000, True, -0.5, 0.5), gain=0.55, hall=0.6)
        add(sfx, at + 0.02, impact()[: int(1.6 * SR)], gain=0.55, hall=0.7)
    else:
        add(sfx, at, whoosh(0.5, 300, 6000, False, 0.5, -0.5), gain=0.45, hall=0.5)
add(sfx, Q["unInvert"], zip_(0.4, up=False), gain=0.45, plate=0.3, hall=0.4)

# "ne" falls in
for i, at in enumerate(Q["ne"]):
    add(sfx, at - 0.4, whistle(1700 - 200 * i, 500, 0.4), gain=0.3, hall=0.3)
    add(sfx, at, thud(), gain=0.65, pan=0.2 + 0.2 * i, plate=0.3, hall=0.4)
    add(sfx, at + 0.01, boing(200 + 60 * i, 0.4, 0.4), gain=0.4, pan=0.2 + 0.2 * i, hall=0.3)
add(sfx, Q["tO"], shimmer(1.6, 84), gain=0.6, hall=0.7)
add(sfx, Q["ring"], scribble(0.8), gain=0.5, plate=0.4, hall=0.4)
add(sfx, Q["ring"] + 0.75, bell(midi(91), 1.8, 0.8), gain=0.25, hall=0.8)

# blueprint: technical ticks as the lines draw, a blip per dimension
for i in range(8):
    add(sfx, Q["bp"] + i * 0.06, tick(), gain=0.3, pan=-0.7 + 0.2 * i, plate=0.5)
add(sfx, Q["bp"], whoosh(0.6, 1500, 9000, True, -0.8, 0.8), gain=0.3, hall=0.5)
for i, at in enumerate(Q["dims"]):
    add(sfx, at, pop(900 + 150 * i, 0.06), gain=0.35, plate=0.5, hall=0.3)
    add(sfx, at + 0.03, bell(midi(86 + 2 * i), 0.8, 0.6), gain=0.1, hall=0.6)
add(sfx, Q["tBp"], shimmer(1.6, 86), gain=0.6, hall=0.7)
add(sfx, Q["bpOut"], whoosh(0.5, 6000, 800, False, 0.6, -0.6), gain=0.3, hall=0.5)

# Prime Studio from slices
for i in range(11):
    for b in range(4):
        if (i + b) % 3:
            continue
        add(sfx, Q["prime"] + i * 0.035 + b * 0.05, swish(0.14), gain=0.35, pan=(-0.7 if b % 2 == 0 else 0.7), plate=0.3)
add(sfx, Q["prime"] + 0.75, impact()[: int(1.2 * SR)], gain=0.45, hall=0.6)
add(sfx, Q["tPrime"][0], shimmer(1.6, 84), gain=0.6, hall=0.7)
add(sfx, Q["tPrime"][1], shimmer(1.6, 88), gain=0.6, hall=0.7)

# colour fields
for i, at in enumerate(Q["words"]):
    add(sfx, at - 0.2, whoosh(0.5, 300, 8000, True, 0.0, 0.0), gain=0.5, hall=0.5)
    add(sfx, at + 0.02, impact()[: int(0.9 * SR)], gain=0.4 + 0.05 * i, hall=0.5)
    add(sfx, at + 0.55, pop(700 + 100 * i), gain=0.4, plate=0.3, hall=0.4)
    add(sfx, at + 0.56, boing(260 + 40 * i, 0.35, 0.35), gain=0.3, hall=0.3)

# the lockup returns and clicks on
add(sfx, Q["final"] - 0.7, reverse_swell(0.72), gain=0.55, hall=0.4)
add(sfx, Q["final"], whoosh(0.8, 200, 6000, True, 0.0, 0.0), gain=0.6, hall=0.7)
add(sfx, Q["click"], switch_click(), gain=1.0, plate=0.5, hall=0.8)
add(sfx, Q["click"] + 0.02, impact()[: int(2.0 * SR)], gain=0.55, hall=0.9)
add(sfx, Q["click"] + 0.03, bell(midi(84), 3.2, 0.8), gain=0.3, hall=1.0)
add(sfx, Q["tagline"], shimmer(2.0, 88), gain=0.8, hall=0.9)


# ================================================================= MIX
def ir(rt, length, pre, lp):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal((n, 2)) * np.exp(-t * 6.91 / rt)[:, None]
    x = filt(x, "low", lp)
    x[: int(pre * SR)] = 0
    return x / np.sqrt(np.sum(x**2, axis=0))


def conv(x, h):
    return np.stack([signal.fftconvolve(x[:, ch], h[:, ch])[:N] for ch in range(2)], 1)


# ping-pong delay (3/8 of a beat), repeats feed the hall
dly = np.zeros((N, 2))
step = int(BEAT * 0.75 * SR)
src = filt(delay_send, "high", 400)
for k in range(1, 7):
    off = step * k
    if off >= N:
        break
    g = 0.45 ** (k - 1)
    ch = (k - 1) % 2
    dly[off:, ch] += src[: N - off, 1 - ch] * g * 0.7 + src[: N - off, ch] * g * 0.3
dly = filt(dly, "low", 6000)
hall_send += dly * 0.6

plate = conv(filt(plate_send, "high", 300), ir(1.6, 1.8, 0.01, 9000)) * 0.5
hall = conv(filt(hall_send, "high", 180), ir(4.6, 5.0, 0.035, 6500)) * 0.7

mix = music * 0.85 + drums * 0.75 + sfx * 0.9 + dly * 0.5 + plate + hall
mix = np.tanh(mix * 1.05) / 1.05
ceiling = 10 ** (-1 / 20)
w_ = int(0.006 * SR)


def limit(x):
    peak = maximum_filter1d(np.max(np.abs(x), axis=1), int(0.004 * SR))
    g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (peak + 1e-9)), w_), w_)
    return x * g[:, None]


mix = limit(mix)
mix *= min(10 ** (-15 / 20) / np.sqrt(np.mean(mix**2)), 3)
mix = np.clip(limit(mix), -ceiling, ceiling)
n_out = int(DUR * SR)
mix = mix[:n_out]
f = int(0.01 * SR)
mix[:f] *= np.linspace(0, 1, f)[:, None]
tail = int(0.5 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
os.makedirs(os.path.join(ROOT, "public", "logo"), exist_ok=True)
with wave.open(os.path.join(ROOT, "public", "logo", "master.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"logo/master.wav  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS")
