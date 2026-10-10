"""
Music + sound design for the One Prime launch intro (no voice), locked to src/launch/cues.json.

  music   120 BPM in C, bouncy: kick / clap / hats, a marimba-ish pluck riding C – G – Am – F, a round
          bass. Airy half-time while the mark forms, a dreamy pad inside the orb, the full groove under
          the services, a riser into the finale and a drop when the ball fills the screen.
  sfx     every elastic move has a sound — boings that bend with the spring, pops per letter, zips,
          whooshes, a slot-machine roll for the counter, sparkles, the switch click — all through a
          plate reverb and a longer hall.

Writes public/launch/master.wav (48 kHz stereo).
"""

import json
import os
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 48000
Q = json.load(open(os.path.join(ROOT, "src", "launch", "cues.json"), encoding="utf-8"))
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


# ================================================================= MUSIC
CH = [(48, [60, 64, 67, 72]), (43, [59, 62, 67, 71]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69])]  # C G Am F
PATTERN = [0, 2, 1, 3, 2, 1, 3, 2]  # arpeggio order per 8th


def bar_at(t0, bi, mode):
    root, tones = CH[bi % 4]
    if mode in ("groove", "drop", "bounce"):
        for j in range(8):
            m = tones[PATTERN[j]] + (12 if mode == "drop" and j % 4 == 3 else 0)
            add(music, t0 + j * BEAT / 2, pluck(m, 0.45, 1.0 if j % 2 == 0 else 0.7), pan=-0.4 + 0.8 * (j % 4) / 3, gain=0.55, plate=0.25)
        for q in range(4):
            add(drums, t0 + q * BEAT, kick(0.8))
            add(drums, t0 + q * BEAT + BEAT / 2, hat(), pan=0.3)
            add(drums, t0 + q * BEAT + BEAT / 4 * 3, hat(), pan=-0.3, gain=0.5)
            if q % 2 == 1:
                add(drums, t0 + q * BEAT, clap(), gain=0.7, plate=0.2)
        for q in (0, 1.5, 2, 3.5):
            add(music, t0 + q * BEAT, bass(root - 12, BEAT * 0.9), gain=0.75)
        add(music, t0, pad(tones, BAR + 0.3, 0.1 if mode != "drop" else 0.16, 2400 if mode == "drop" else 1800, 0.05, 0.3), plate=0.2)
    elif mode == "air":
        add(music, t0, pad(tones, BAR + 0.6, 0.14, 1500, 0.4, 0.6), plate=0.3)
        for j in (0, 3, 6):
            add(music, t0 + j * BEAT / 2, pluck(tones[j % 4] + 12, 0.8, 0.6), pan=0.3 - 0.3 * j / 3, gain=0.4, plate=0.5)
        add(drums, t0, kick(0.6))
        add(drums, t0 + 2 * BEAT, clap(), gain=0.5, plate=0.3)
    elif mode == "dream":
        add(music, t0, pad([m + 12 for m in tones], BAR + 0.8, 0.12, 3000, 0.3, 0.8), plate=0.4, hall=0.3)
        for j in range(8):
            add(music, t0 + j * BEAT / 2, pluck(tones[(j * 3) % 4] + 24, 0.6, 0.5), pan=np.sin(j) * 0.6, gain=0.28, plate=0.6)


sections = [
    (0.5, 3.0, "bounce"),
    (3.0, 6.5, "air"),
    (7.0, 9.0, "dream"),
    (9.0, 16.0, "groove"),
    (16.0, 18.0, "air"),
    (19.05, 22.6, "drop"),
]
for a, b, mode in sections:
    t0 = a
    bi = 0
    while t0 < b - 0.05:
        bar_at(t0, bi, mode)
        t0 += BAR
        bi += 1
# end chord rings out
add(music, 22.6, pad([48, 55, 64, 67, 71, 74], 1.6, 0.18, 2600, 0.02, 1.2), plate=0.4, hall=0.5)
add(music, 22.6, pluck(72, 1.5), gain=0.6, plate=0.5, hall=0.4)
add(music, 22.6, bass(36, 1.2), gain=0.6)

# ================================================================= SOUND DESIGN
# A · bounce
add(sfx, 0.05, whistle(1800, 500, 0.45), gain=0.5, plate=0.2)
for i, b in enumerate(Q["bounce"]):
    add(sfx, b, boing(200 + 40 * i, 0.42), gain=0.6, pan=-0.3 + 0.2 * i, plate=0.2)
    add(sfx, b + 0.01, pop(500 + 120 * i), gain=0.35, plate=0.2)
    if i in (1, 3):
        add(sfx, b, filt(noise(0.12), "low", 900) * np.exp(-tt(0.12) / 0.03), gain=0.6)  # the flip
add(sfx, Q["bounce"][3] + 0.05, whistle(500, 1600, 0.45), gain=0.35, plate=0.3)
add(sfx, Q["bounce"][3] + 0.5, whistle(1600, 400, 0.5), gain=0.35, plate=0.3)
add(sfx, Q["land"], boing(140, 0.5, 0.6), gain=0.7, plate=0.2)
add(sfx, Q["fill"], bwomp(0.6), gain=0.8, plate=0.3, hall=0.2)
add(sfx, Q["fill"] + 0.3, impact(), gain=0.5, hall=0.3)

# B · introducing → mark
add(sfx, Q["introducing"], sparkle(0.6, 10, 86), gain=0.5, plate=0.4, hall=0.4)
add(sfx, Q["shrink"], zip_(0.4, up=False), gain=0.6, plate=0.2)
add(sfx, Q["shrink"] + 0.55, boing(260, 0.35, 0.4), gain=0.45)
add(sfx, Q["pillDraw"], whoosh(0.45, 1500, 7000, True, -0.5, 0.5), gain=0.4, plate=0.2)
add(sfx, Q["switchOn"], switch_click(), gain=0.9, plate=0.3)
add(sfx, Q["switchOn"] + 0.02, boing(320, 0.35, 0.3), gain=0.35)
add(sfx, Q["switchOn"] + 0.05, bell(midi(84), 1.4), gain=0.25, plate=0.4, hall=0.4)
for i in range(2):
    add(sfx, Q["name"] + i * 0.06, pop(700 + 80 * i), gain=0.3)
for i in range(11):
    add(sfx, Q["name"] + 0.18 + i * 0.03, pop(800 + 40 * i, 0.05), gain=0.18, pan=-0.5 + i * 0.1)
add(sfx, Q["tag"], tick(), gain=0.3)

# C · punch + orb
add(sfx, Q["punch"], riser(0.5), gain=0.6)
add(sfx, Q["punch"], whoosh(0.5, 200, 3000, True, 0, 0), gain=0.6, hall=0.3)
add(sfx, Q["orb"], impact(), gain=0.7, hall=0.5)
add(sfx, Q["orb"] + 0.02, bloop(150, 600, 0.35), gain=0.6, plate=0.4)
for i, w in enumerate(Q["orbWords"]):
    add(sfx, w, bloop(400 + 120 * i, 900 + 150 * i, 0.16), gain=0.35, plate=0.4)
add(sfx, Q["orbOut"], whoosh(0.45, 400, 5000, False, 0.5, -0.5), gain=0.5, plate=0.2)
add(sfx, Q["plus"] - 0.05, pop(520), gain=0.4)

# D · services card
c = Q["click"]
add(sfx, c, click(), gain=0.9)
add(sfx, c + 0.02, boing(220, 0.5, 0.45), gain=0.5, plate=0.2)
add(sfx, c + 0.05, whoosh(0.4, 600, 7000, True, 0.4, -0.2), gain=0.45, plate=0.2)
for i, a in enumerate(Q["items"]):
    add(sfx, a, whoosh(0.3, 1500, 9000, True, 0.7, -0.1), gain=0.25)
    add(sfx, a + 0.22, pop(660 * 2 ** ([0, 2, 4, 7, 9, 12][i] / 12)), gain=0.4, pan=0.1, plate=0.3)
    add(sfx, a + 0.24, bell(midi(84 + [0, 2, 4, 7, 9, 12][i]), 0.5, 0.5), gain=0.12, plate=0.4)
add(sfx, Q["cardOut"], whistle(1400, 250, 0.5), gain=0.4)
add(sfx, Q["cardOut"] + 0.1, whoosh(0.5, 2000, 200, False, 0, 0), gain=0.4)

# E · launch day
add(sfx, Q["cal"], bloop(180, 650, 0.3), gain=0.6, plate=0.3)
# slot-machine roll: ticks that slow down into the landing
roll_t = Q["roll"]
span = Q["rollLand"] - Q["roll"]
k = 0
while True:
    u = k / 34
    if u > 1:
        break
    at = roll_t + span * (1 - (1 - u) ** 1.7)
    add(sfx, at, tick(), gain=0.35, pan=np.sin(k) * 0.3)
    k += 1
add(sfx, Q["rollLand"], bell(midi(88), 1.6), gain=0.35, plate=0.4, hall=0.5)
add(sfx, Q["rollLand"], boing(300, 0.4, 0.3), gain=0.35)
add(sfx, Q["rollLand"], impact()[: int(1.0 * SR)], gain=0.4, hall=0.3)
for i in range(7):
    add(sfx, Q["rollLand"] + 0.08 + i * 0.045, pop(600 + 60 * i, 0.05), gain=0.2)
add(sfx, Q["rollLand"] + 0.3, sparkle(0.6, 6, 91), gain=0.3, plate=0.4, hall=0.4)
add(sfx, Q["calOut"], whistle(1300, 260, 0.5), gain=0.35)

# F · text → pill → banner
add(sfx, Q["cta"], whoosh(0.4, 2000, 9000, True, 0.8, -0.2), gain=0.4)
for i in range(16):
    add(sfx, Q["cta"] + i * 0.022, tick(), gain=0.12, pan=0.6 - i * 0.05)
add(sfx, Q["pill"], boing(240, 0.45, 0.45), gain=0.55, plate=0.2)
add(sfx, Q["pill"], bloop(200, 800, 0.25), gain=0.4)
add(sfx, Q["banner"] - 0.05, whoosh(0.55, 300, 6000, True, -0.6, 0.6), gain=0.6, plate=0.2, hall=0.2)
add(sfx, Q["sparkle"], sparkle(0.8, 10, 93), gain=0.45, plate=0.4, hall=0.5)
add(sfx, 16.0, riser(2.0), gain=0.35)

# G · finale
add(sfx, Q["ball2"], zip_(0.35, up=False), gain=0.6)
for i, b in enumerate(Q["ball2Bounce"]):
    add(sfx, b, boing(220 + 50 * i, 0.4), gain=0.6, plate=0.2)
add(sfx, Q["ball2Bounce"][1] - 0.6, riser(0.65), gain=0.5)
add(sfx, Q["fill2"], bwomp(0.6), gain=0.8, plate=0.3)
add(sfx, Q["fill2"] + 0.25, impact(), gain=0.8, hall=0.5)
for i in range(11):
    add(sfx, Q["write"] + i * 0.06, scribble(0.22), gain=0.4, pan=-0.5 + 0.1 * i)
add(sfx, Q["icon"], pop(480), gain=0.6, plate=0.3)
add(sfx, Q["icon"] + 0.02, boing(260, 0.45, 0.4), gain=0.45)
add(sfx, Q["icon"] + 0.25, switch_click(), gain=0.8, plate=0.3)
add(sfx, Q["icon"] + 0.3, bell(midi(84), 1.8), gain=0.3, plate=0.4, hall=0.5)
add(sfx, Q["unfill"], zip_(0.5, up=False), gain=0.5, plate=0.2)
for i in range(5):
    add(sfx, Q["tagline"] + i * 0.08, pop(560 + 70 * i), gain=0.3)
add(sfx, Q["tagline"] + 0.5, whoosh(0.3, 3000, 9000, True, -0.5, 0.5), gain=0.3)
add(sfx, Q["dm"], boing(300, 0.4, 0.4), gain=0.45, plate=0.2)
add(sfx, Q["collapse"], zip_(0.3, up=False), gain=0.5)
for i in range(12):
    add(sfx, Q["collapse"] + i * 0.02, pop(1200 - 50 * i, 0.04), gain=0.12)
add(sfx, Q["collapse"] + 0.7, boing(180, 0.45, 0.5), gain=0.5)
add(sfx, Q["end"] - 0.05, pop(900), gain=0.4, plate=0.4, hall=0.6)

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


plate = conv(filt(plate_send, "high", 300), ir(1.4, 1.6, 0.008, 9000)) * 0.45
hall = conv(filt(hall_send, "high", 200), ir(3.8, 4.2, 0.03, 6500)) * 0.5

# kick pumps the music a little
pump = np.ones(N)
for kt in np.arange(0.5, DUR, BEAT):
    i = int(kt * SR)
    seg = 1 - 0.3 * np.exp(-np.arange(int(0.25 * SR)) / SR / 0.07)
    pump[i : i + len(seg)] = np.minimum(pump[i : i + len(seg)], seg[: N - i])
mix = music * pump[:, None] * 0.8 + drums * 0.7 + sfx * 0.9 + plate + hall
mix = np.tanh(mix * 1.1) / 1.1
ceiling = 10 ** (-1 / 20)
w_ = int(0.006 * SR)


def limit(x):
    peak = maximum_filter1d(np.max(np.abs(x), axis=1), int(0.004 * SR))
    g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (peak + 1e-9)), w_), w_)
    return x * g[:, None]


mix = limit(mix)
mix *= min(10 ** (-14.5 / 20) / np.sqrt(np.mean(mix**2)), 3)
mix = np.clip(limit(mix), -ceiling, ceiling)
n_out = int(DUR * SR)
mix = mix[:n_out]
f = int(0.01 * SR)
mix[:f] *= np.linspace(0, 1, f)[:, None]
tail = int(0.4 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2
os.makedirs(os.path.join(ROOT, "public", "launch"), exist_ok=True)
with wave.open(os.path.join(ROOT, "public", "launch", "master.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"launch/master.wav  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS")
