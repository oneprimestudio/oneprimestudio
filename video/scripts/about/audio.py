"""
Score, sound design and mix for the About launch film, synthesised from scratch and locked to
src/about/timeline.json (which carries the voice placement, the scenes, the marks and every sound cue
written in src/about/script.json).

  music   120 BPM. D minor under the head (muted kick, plucks, sub), a build through the reveal, the
          first drop on "One" in F major (F – C – Dm – Bb: four-on-the-floor, claps, hats, pumping
          bass, chord stabs, pluck arp), a filtered breakdown under "why", a slam back on "one",
          half-time as the ink collapses, a build across the globe and a second drop on "everywhere",
          a final stab on the sign-off and a long Fmaj9 tail.
  sfx     the SaaS-launch kit: ticks, swooshes, slams, glitch stutters, data chatter, risers,
          drops, the switch, the dither seam (rising digital crackle), arcs (zips on 16ths), a ding.
  mix     VO: HPF, presence, 3:1 compression, a faint 12 ms doubler (the "agent" sheen), short room.
          Music ducks under the voice — mids −9 dB, lows −5 dB, 30 ms look-ahead, 280 ms release —
          and pumps off the kick in the drops. Master: glue, brickwall at −1 dBFS.

Writes public/about/master.wav (48 kHz stereo) and src/about/levels.json (per-frame kick + voice).
"""

import json
import os
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 48000
TL = json.load(open(os.path.join(ROOT, "src", "about", "timeline.json"), encoding="utf-8"))
DUR = TL["duration"]
N = int(DUR * SR) + SR
BEAT = TL["beat"]
BAR = TL["bar"]
S16 = BEAT / 4
CUES = TL["cues"]
SC = {s["id"]: s for s in TL["scenes"]}
MK = TL["marks"]
rng = np.random.default_rng(11)


def W(c, i):
    return CUES[c]["words"][i]["t"]


music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
kicks = []  # kick times, for the pump and the picture


def add(bus, t, x, pan=0.0, gain=1.0, send=0.0):
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
    if send:
        verb_send[i : i + len(x)] += x * gain * send


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
    """a filter whose cutoff glides f0 → f1 (mono or stereo)"""
    out = np.zeros_like(x)
    zi = None
    n = len(x)
    for s in range(0, n, block):
        q = (s / max(n - 1, 1)) ** curve
        so = sos(kind, f0 * (f1 / f0) ** q)
        if zi is None:
            zi = np.zeros((so.shape[0], 2) + x.shape[1:])
        out[s : s + block], zi = signal.sosfilt(so, x[s : s + block], axis=0, zi=zi)
    return out


def sine(f, d, phase=0.0):
    n = int(d * SR)
    ff = np.full(n, f) if np.isscalar(f) else f[:n]
    return np.sin(2 * np.pi * (phase + np.cumsum(ff) / SR))


def saw(f, d):
    n = int(d * SR)
    ph = (rng.random() + np.cumsum(np.full(n, f) if np.isscalar(f) else f[:n]) / SR) % 1.0
    return 2 * ph - 1


def noise(d):
    return rng.standard_normal(int(d * SR))


def pan_sweep(x, a, b):
    pans = np.linspace(a, b, len(x))
    ang = (pans + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], 1) * np.sqrt(2)


# ================================================================= INSTRUMENTS
def pluck(m, d=0.42, bright=1.0):
    """additive pluck: upper partials die first, like a filtered saw with a closing envelope"""
    t = tt(d)
    f = midi(m)
    x = np.zeros_like(t)
    for k in range(1, 14):
        if f * k > 12000:
            break
        x += (1 / k) * sine(f * k, d, rng.random()) * np.exp(-t * (6 + 9 * (k - 1) / bright))
    x *= np.minimum(1, t / 0.002)
    return x * 0.32


def stab(notes, d=0.42, cutoff=2600):
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for v in range(3):
            s = saw(midi(m) * 2 ** ((v - 1) * 0.12 / 12), d)
            a = ((v - 1) / 1.5 + 1) * np.pi / 4
            x[:, 0] += s * np.cos(a)
            x[:, 1] += s * np.sin(a)
    x = sweep(x, "low", cutoff, 500, curve=0.5)
    e = np.minimum(1, t / 0.004) * np.exp(-t / 0.16)
    return x * e[:, None] * 0.5 / len(notes)


def pad(notes, d, gain=0.1, cutoff=1800, attack=1.0, release=1.2):
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for v in range(4):
            s = saw(midi(m) * 2 ** ((v - 1.5) * 0.08 / 12), d)
            a = ((v - 1.5) / 2 + 1) * np.pi / 4
            x[:, 0] += s * np.cos(a)
            x[:, 1] += s * np.sin(a)
    x = filt(x, "low", cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, d - t) / release)
    return x * e[:, None] * gain / (len(notes) * 2)


def kick(g=1.0, d=0.45):
    t = tt(d)
    f = 46 + 120 * np.exp(-t / 0.03)
    x = sine(f, d) * np.exp(-t / 0.2)
    c = filt(noise(0.005), "high", 2500) * 0.35
    x[: len(c)] += c
    return np.tanh(1.8 * x) * g


def clap(g=1.0):
    d = 0.3
    x = np.zeros(int(d * SR))
    for off in (0.0, 0.011, 0.022):
        b = filt(noise(0.012), "bp", (900, 3500)) * np.exp(-tt(0.012) / 0.004)
        i = int(off * SR)
        x[i : i + len(b)] += b
    tail = filt(noise(d - 0.03), "bp", (1000, 4000)) * np.exp(-tt(d - 0.03) / 0.07)
    x[int(0.03 * SR) :][: len(tail)] += tail * 0.6
    return x * g * 0.7


def hat(g=1.0, d=0.05):
    return filt(noise(d), "high", 7500) * np.exp(-tt(d) / (d / 3)) * g * 0.45


def snare_tick(g=1.0):
    d = 0.12
    t = tt(d)
    return (filt(noise(d), "bp", (1500, 7000)) * np.exp(-t / 0.035) + sine(210, d) * np.exp(-t / 0.03) * 0.5) * g * 0.6


def bass(m, d, g=1.0):
    t = tt(d)
    x = 0.75 * sine(midi(m), d) + 0.25 * filt(saw(midi(m), d), "low", 420)
    e = np.minimum(1, t / 0.006) * np.minimum(1, np.maximum(0, d - t) / 0.03)
    return np.tanh(1.6 * x * e) * 0.6 * g


def sub(m, d, g=0.4):
    t = tt(d)
    return sine(midi(m), d) * np.minimum(1, t / 0.3) * np.minimum(1, np.maximum(0, d - t) / 0.4) * g


# ================================================================= SFX
def s_pop():
    d = 0.08
    t = tt(d)
    return sine(300 + 900 * (t / d) ** 0.5, d) * np.exp(-t / 0.02) * 0.8


def s_tick():
    x = filt(noise(0.003), "high", 4000) * 0.8
    return np.concatenate([x, sine(3200, 0.012) * np.exp(-tt(0.012) / 0.003) * 0.25])


def s_click():
    x = np.zeros(int(0.08 * SR))
    for off, g in ((0, 1.0), (0.012, 0.5)):
        b = filt(noise(0.003), "bp", (1800, 9000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    body = sine(1800, 0.015) * np.exp(-tt(0.015) / 0.003) * 0.35
    x[: len(body)] += body
    return x


def s_blip(note=76, d=0.14):
    t = tt(d)
    f = midi(note)
    return (sine(f, d) + 0.2 * sine(2 * f, d)) * np.minimum(1, t / 0.002) * np.exp(-t / 0.05) * 0.5


def s_chatter(d=0.8):
    """data chatter: tiny blips and ticks at random, a terminal printing"""
    x = np.zeros(int(d * SR) + SR // 4)
    k = 0.0
    while k < d:
        i = int(k * SR)
        y = s_tick() if rng.random() < 0.5 else s_blip(rng.integers(84, 100), 0.03) * 0.6
        x[i : i + len(y)] += y * rng.uniform(0.4, 1.0)
        k += rng.uniform(0.018, 0.05)
    return filt(x, "high", 1200) * 0.6


def s_swoosh(d=0.5, a=-0.6, b=0.6):
    n = int(d * SR)
    x = sweep(noise(d), "low", 500, 7000, curve=0.8)
    x = filt(x, "high", 300)
    q = np.linspace(0, 1, n)
    x = x * np.sin(np.pi * q**0.7) ** 2
    return pan_sweep(x, a, b) * 0.35


def s_riser(d=1.2):
    t = tt(d)
    q = t / d
    nz = sweep(noise(d), "high", 300, 9000, curve=1.6)
    tone = np.zeros_like(t)
    for m in (50, 57, 62):
        f = midi(m) * 2 ** (1.4 * q**1.8)
        tone += np.sin(2 * np.pi * np.cumsum(f) / SR)
    x = (nz * 0.5 + filt(tone, "low", 3000) * 0.18) * q**2.2
    return x


def s_impact(size=1.0):
    d = 2.0
    t = tt(d)
    body = sine(32 + 70 * np.exp(-t / 0.12), d) * np.exp(-t / (0.7 * size))
    crack = filt(noise(d), "low", 2500) * np.exp(-t / 0.04) * 0.6
    air = filt(noise(d), "high", 5000) * np.exp(-t / 0.25) * 0.15
    x = np.tanh(1.5 * (body + crack)) + air
    x[: int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    return x * 0.85


def s_drop():
    """the drop: sub boom + white crash + a downward tonal sweep"""
    d = 2.6
    t = tt(d)
    boom = sine(28 + 90 * np.exp(-t / 0.2), d) * np.exp(-t / 1.1)
    crash = filt(noise(d), "high", 3000) * np.exp(-t / 0.6) * 0.35
    down = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t / 0.25) + 60) / SR) * np.exp(-t / 0.35) * 0.2
    return np.tanh(1.4 * boom) * 0.9 + crash + down


def s_whoomp():
    d = 0.6
    t = tt(d)
    x = sweep(noise(d), "low", 4000, 200, curve=0.6) * np.exp(-t / 0.2)
    th = sine(70 + 60 * np.exp(-t / 0.05), d) * np.exp(-t / 0.15) * 0.7
    return x * 0.6 + th


def s_stagger(n=6, gap=0.06):
    x = np.zeros(int((n * gap + 0.2) * SR))
    for i in range(n):
        j = int(i * gap * SR)
        for y in (s_blip(79 + 2 * i, 0.06) * 0.5, s_tick() * 0.5):
            x[j : j + len(y)] += y
    return x


def s_switch():
    x = np.zeros(int(0.3 * SR))
    for off, g in ((0, 1.0), (0.018, 0.7)):
        b = filt(noise(0.004), "bp", (2000, 8000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    th = sine(90, 0.14) * np.exp(-tt(0.14) / 0.035) * 0.9
    x[: len(th)] += th
    chime = sine(midi(88), 0.25) * np.exp(-tt(0.25) / 0.08) * 0.12
    x[int(0.02 * SR) :][: len(chime)] += chime
    return x


def s_seam(d=1.6):
    """the dither seam: a rising field of digital crackle — square grains whose density climbs"""
    n = int(d * SR)
    x = np.zeros(n + SR // 5)
    k = 0.0
    while k < d:
        q = k / d
        i = int(k * SR)
        g = int(rng.integers(40, 160))  # a grain of a few ms, square-ish
        y = np.sign(np.sin(2 * np.pi * rng.uniform(800, 3000 + 6000 * q) * np.arange(g) / SR)) * np.hanning(g)
        x[i : i + g] += y * (0.25 + 0.75 * q) * rng.uniform(0.3, 1)
        k += 0.03 * (1 - 0.85 * q) * rng.uniform(0.5, 1.5)
    x = filt(x, "high", 600)
    swell = sweep(noise(d), "high", 400, 6000, curve=1.2)
    x[:n] += swell * np.linspace(0, 1, n) ** 2 * 0.3
    return pan_sweep(x * 0.4, -0.3, 0.3)


def s_rule():
    d = 0.5
    t = tt(d)
    f = 2000 + 7000 * (t / d) ** 0.6
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15) * 0.08
    x += filt(noise(d), "high", 6000) * np.sin(np.pi * t / d) ** 2 * 0.25
    return pan_sweep(x, -0.7, 0.7)


def s_slam():
    d = 0.5
    t = tt(d)
    th = sine(55 + 110 * np.exp(-t / 0.025), d) * np.exp(-t / 0.12)
    sn = filt(noise(d), "bp", (800, 5000)) * np.exp(-t / 0.03)
    return np.tanh(2.0 * (th + 0.6 * sn)) * 0.8


def s_snap():
    d = 0.15
    t = tt(d)
    return filt(noise(d), "bp", (1200, 6000)) * np.exp(-t / 0.012) + sine(1400, d) * np.exp(-t / 0.01) * 0.3


def s_glitch():
    """a stutter: one grain repeated, shorter and higher each time, bit-crushed"""
    base = filt(noise(0.05), "bp", (500, 4000)) + sine(midi(70), 0.05) * 0.6
    out = []
    L = 0.05
    for i in range(7):
        g = base[: int(L * SR)]
        g = np.round(g * 6) / 6
        out.append(g * np.hanning(len(g)) ** 0.3 * (1 - i * 0.08))
        L *= 0.82
    return np.concatenate(out) * 0.5


def s_suck(d=0.9):
    t = tt(d)
    x = filt(noise(d), "bp", (300, 6000)) * np.exp(-t / 0.25)
    tone = sum(sine(midi(m), d) for m in (62, 69, 74)) * np.exp(-t / 0.4) * 0.15
    return (x * 0.5 + tone)[::-1]


def s_lift():
    d = 0.7
    t = tt(d)
    x = sweep(noise(d), "low", 600, 5000, curve=0.7)
    x = x * np.sin(np.pi * t / d) ** 2 * 0.25
    tone = sine(midi(81) * 2 ** (t / d * 0.2), d) * np.sin(np.pi * t / d) ** 2 * 0.05
    return x + tone


def s_paper():
    d = 1.1
    t = tt(d)
    grain = filt(noise(d), "bp", (1500, 7000)) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 31 * t)))
    body = sweep(noise(d), "low", 300, 2500, curve=0.6)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return pan_sweep((grain * 0.25 + body * 0.35) * e, 0.0, 0.0)


def s_ping():
    d = 1.6
    x = np.zeros(int(d * SR))
    for i, g in enumerate((1.0, 0.45, 0.2, 0.08)):
        y = sine(midi(86), 0.4) * np.exp(-tt(0.4) / 0.09) * g
        j = int(i * 0.24 * SR)
        x[j : j + len(y)] += y
    return x * 0.4


def s_zip(note):
    d = 0.22
    t = tt(d)
    f = midi(note) * 2 ** (2 * (t / d))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * 0.3 + filt(noise(d), "high", 6000) * np.exp(-t / 0.03) * 0.3


def s_ding():
    d = 1.4
    t = tt(d)
    x = np.zeros(int((d + 0.12) * SR))
    for off, m in ((0, 88), (0.11, 95)):
        y = sum(a * sine(midi(m) * r, d, rng.random()) * np.exp(-t / dc) for r, a, dc in ((1, 1, 0.6), (2.76, 0.25, 0.2), (5.4, 0.1, 0.1)))
        i = int(off * SR)
        x[i : i + len(y)] += y * np.minimum(1, t / 0.002)
    return x * 0.3


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)


SOUNDS = {
    "pop": lambda c: s_pop(),
    "tick": lambda c: s_tick(),
    "click": lambda c: s_click(),
    "blip": lambda c: s_blip(c.get("note", 76)),
    "chatter": lambda c: s_chatter(c.get("dur", 0.8)),
    "swoosh": lambda c: s_swoosh(),
    "riser": lambda c: s_riser(c.get("dur", 1.2)),
    "impact": lambda c: s_impact(),
    "drop": lambda c: s_drop(),
    "whoomp": lambda c: s_whoomp(),
    "stagger": lambda c: s_stagger(),
    "switch": lambda c: s_switch(),
    "seam": lambda c: s_seam(),
    "rule": lambda c: s_rule(),
    "slam": lambda c: s_slam(),
    "snap": lambda c: s_snap(),
    "glitch": lambda c: s_glitch(),
    "suck": lambda c: s_suck(),
    "lift": lambda c: s_lift(),
    "paper": lambda c: s_paper(),
    "ping": lambda c: s_ping(),
    "ding": lambda c: s_ding(),
}
SEND = {"impact": 0.35, "drop": 0.3, "ping": 0.5, "ding": 0.5, "switch": 0.2, "slam": 0.15, "seam": 0.2, "blip": 0.3}

for c in TL["sfx"]:
    if c["sound"] == "arcs":
        # seven arcs fire on 16ths: a rising zip and a tick for each city
        for i in range(7):
            at = c["t"] + 0.12 + i * S16 * 1.5
            add(sfx, at, s_zip(72 + 2 * i), pan=-0.7 + 0.23 * i, gain=c["gain"], send=0.25)
            add(sfx, at + 0.18, s_tick(), pan=-0.7 + 0.23 * i, gain=c["gain"] * 0.8)
        continue
    x = SOUNDS[c["sound"]](c)
    add(sfx, c["t"], stereo(x, c.get("pan", 0.0)), gain=c["gain"], send=SEND.get(c["sound"], 0.08))

# ================================================================= SCORE
# key moments
t_head = W("h1", 0)  # 2.0
t_one = W("name", 2)  # first drop
t_why = SC["why"]["start"]
t_as_one = W("why2", 4)
t_where = SC["where"]["start"]
t_every = W("w2", 3)  # second drop
t_sign = W("sign", 0)

DM = [([50, 53, 57, 60], 38), ([46, 50, 53, 57], 34), ([50, 53, 57, 60], 38), ([48, 52, 55, 59], 36)]  # Dm7 Bbmaj7 Dm7 C
FM = [([53, 57, 60, 64], 41), ([48, 52, 55, 62], 36), ([50, 53, 57, 60], 38), ([46, 50, 53, 57], 34)]  # Fmaj7 Cadd9 Dm7 Bbmaj7


def arp_notes(chord):
    c = chord + [chord[1] + 12, chord[2] + 12]
    return [c[0] + 12, c[2] + 12, c[1] + 12, c[3] + 12, c[2] + 12, c[4] + 12, c[3] + 12, c[5]]


def bar_index(t):
    return int(round((t - t_head) / BAR))


def groove_bar(t0, chords, energy, kick_on=True, clap_on=True, half=False):
    """one bar of the groove; energy 0..1 shapes filters and density"""
    chord, root = chords[bar_index(t0) % 4]
    # plucked arpeggio on 8ths (16ths at full energy)
    notes = arp_notes(chord)
    step = S16 if energy > 0.85 else BEAT / 2
    for j in range(int(round(BAR / step))):
        add(music, t0 + j * step, pluck(notes[j % 8], 0.4, 0.6 + 0.6 * energy), pan=-0.5 + (j % 4) / 3, gain=0.5 + 0.2 * energy, send=0.25)
    add(music, t0, pad(chord, BAR + 0.3, gain=0.16 + 0.08 * energy, cutoff=900 + 2600 * energy, attack=0.3, release=0.4), send=0.2)
    if energy > 0.6:
        for q in (0, 1.5, 3) if not half else (0,):
            add(music, t0 + q * BEAT, stab(chord, 0.35, 1500 + 2500 * energy), gain=0.45)
    # bass on the off-beat 8ths (pumping)
    for q in range(4):
        if half and q % 2:
            continue
        add(music, t0 + q * BEAT + BEAT / 2, bass(root, BEAT / 2 - 0.02), gain=0.55 * (0.6 + 0.4 * energy))
    if kick_on:
        for q in range(4) if not half else (0, 2.5):
            add(drums, t0 + q * BEAT, kick(0.95))
            kicks.append(t0 + q * BEAT)
    if clap_on:
        for q in (1, 3) if not half else (2,):
            add(drums, t0 + q * BEAT, clap(0.8), send=0.2)
    for q in range(8 if energy > 0.5 else 4):
        tq = t0 + q * BEAT / (2 if energy > 0.5 else 1) + (BEAT / 4 if energy > 0.5 else BEAT / 2)
        add(drums, tq, hat(0.7 if q % 2 else 0.45), pan=0.3 if q % 2 else -0.2)
    if energy > 0.85:
        for q in range(16):
            if q % 4 == 2:
                continue
            add(drums, t0 + q * S16, hat(0.18, 0.03), pan=rng.uniform(-0.4, 0.4))


# boot: a held pad swelling in, the riser is in the cues
add(music, 0.0, pad([50, 57, 62, 65], t_head + 0.4, gain=0.35, cutoff=700, attack=1.6, release=0.3))
add(music, 0.0, stereo(sub(38, t_head + 0.3, 0.25)))

# head (D minor): muted kick on quarters, 8th plucks, sub — then a build through the reveal
t = t_head
while t < t_one - 1e-6:
    chord, root = DM[bar_index(t) % 4]
    notes = arp_notes(chord)
    build = max(0.0, (t - (t_one - 2 * BAR)) / (2 * BAR))
    for j in range(8):
        add(music, t + j * BEAT / 2, pluck(notes[j], 0.35, 0.5 + 0.5 * build), pan=-0.4 + 0.8 * (j % 4) / 3, gain=0.45, send=0.3)
    add(music, t, pad(chord, BAR + 0.3, gain=0.18, cutoff=800 + 900 * build, attack=0.4, release=0.4), send=0.2)
    add(music, t, stereo(sub(root, BAR, 0.3)))
    for q in range(4):
        add(drums, t + q * BEAT, filt(kick(0.55), "low", 260))
    if t >= t_one - BAR - 1e-6:  # snare roll into the drop
        for q in range(16):
            k = q / 16
            add(drums, t + q * S16, snare_tick(0.25 + 0.6 * k), pan=0.1)
    t += BAR

# drop 1 → the why breakdown
t = t_one
while t < t_why - 1e-6:
    groove_bar(t, FM, 0.95 if t < SC["what"]["start"] + 2 * BAR else 0.8)
    t += BAR
add(music, t_one, pad([41, 53, 57, 60, 64, 67], BAR * 1.5, gain=0.4, cutoff=3500, attack=0.02, release=1.2), send=0.4)

# why: filtered breakdown (no kick), heartbeat, build into "one"
t = t_why
while t < t_as_one - 1e-6:
    chord, root = DM[bar_index(t) % 4]
    add(music, t, pad(chord, BAR + 0.3, gain=0.24, cutoff=700, attack=0.5, release=0.5), send=0.35)
    notes = arp_notes(chord)
    for j in range(8):
        add(music, t + j * BEAT / 2, filt(pluck(notes[j], 0.4, 0.5), "low", 1400), pan=-0.4 + 0.8 * (j % 4) / 3, gain=0.4, send=0.4)
    add(music, t, stereo(sub(root, BAR, 0.32)))
    for q in (0, 0.5):
        add(drums, t + q * BEAT, filt(kick(0.4), "low", 180))
    if t >= t_as_one - BAR - 1e-6:
        for q in range(16):
            add(drums, t + q * S16, snare_tick(0.2 + 0.7 * q / 16), pan=-0.1)
    t += BAR
add(music, t_as_one - 1.0, stereo(s_riser(1.0)), gain=0.35)

# "one": the groove slams back under "Average was never an option", then half-time as the ink collapses
t = t_as_one
while t < t_where - 1e-6:
    groove_bar(t, FM, 0.9 if t < t_as_one + BAR else 0.55, half=t >= t_as_one + BAR)
    t += BAR

# where: the build (kick returns filtered, opens) → drop 2 on "everywhere"
t = t_where
while t < t_every - 1e-6:
    q_ = (t - t_where) / max(t_every - t_where, 1e-6)
    chord, root = FM[bar_index(t) % 4]
    notes = arp_notes(chord)
    for j in range(16):
        add(music, t + j * S16, filt(pluck(notes[j % 8], 0.3, 0.4 + 0.6 * q_), "low", 900 + 5000 * q_), pan=-0.5 + (j % 4) / 3, gain=0.4, send=0.25)
    add(music, t, pad(chord, BAR + 0.3, gain=0.18, cutoff=900 + 2200 * q_, attack=0.3, release=0.3), send=0.25)
    add(music, t, stereo(sub(root, BAR, 0.3)))
    for q in range(4):
        add(drums, t + q * BEAT, filt(kick(0.7), "low", 200 + 2000 * q_))
        kicks.append(t + q * BEAT)
    t += BAR
t = t_every
while t < MK["sign.seam"] + 0.2 - 1e-6:
    groove_bar(t, FM, 1.0)
    t += BAR
add(music, t_every, pad([41, 53, 57, 60, 64, 67], BAR * 1.5, gain=0.4, cutoff=3800, attack=0.02, release=1.2), send=0.4)

# sign: a beat of near-silence (the seam), then the final stab and the long tail
add(music, t_sign - 1.2, stereo(s_riser(1.2)), gain=0.4)
fin = [41, 48, 53, 57, 60, 64, 67]  # Fmaj9
add(music, t_sign, stab(fin, 0.8, 4000), gain=0.9)
add(music, t_sign, pad(fin, DUR - t_sign + 0.5, gain=0.42, cutoff=2600, attack=0.03, release=3.0), send=0.5)
add(music, t_sign, stereo(sub(29, DUR - t_sign, 0.45)))
add(drums, t_sign, kick(1.0))
kicks.append(t_sign)
for j, m in enumerate([77, 81, 84, 88, 89, 93, 96]):
    add(music, MK["sign.cta"] - 0.4 + j * S16 * 1.5, pluck(m, 0.6, 0.7), pan=0.4 - 0.12 * j, gain=0.35, send=0.6)

# ================================================================= VOICE
vo = np.zeros(N)
for cid, c in CUES.items():
    with wave.open(os.path.join(ROOT, "public", "about", "vo", f"{cid}.wav")) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    i = int(round(c["start"] * SR))
    vo[i : i + len(x)] += x[: N - i]
vo = filt(vo, "high", 90, 2)
bq, aq = signal.iirpeak(3000 / (SR / 2), 0.9)
vo = vo + 0.22 * signal.lfilter(bq, aq, vo)
bq, aq = signal.iirpeak(150 / (SR / 2), 1.2)
vo = vo + 0.12 * signal.lfilter(bq, aq, vo)
rms = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.01 * SR)), 0) + 1e-12)
db = 20 * np.log10(rms)
gdb = uniform_filter1d(np.where(db > -22, (db + 22) * (1 / 3 - 1), 0), int(0.02 * SR))
vo = vo * 10 ** (gdb / 20)
vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.74
# the agent sheen: a faint 12 ms doubler, slightly brighter, panned wide
dbl = np.zeros_like(vo)
d12 = int(0.012 * SR)
dbl[d12:] = filt(vo, "high", 1200)[:-d12]
vo_st = np.stack([vo + 0.08 * dbl, vo - 0.08 * dbl], 1)
verb_send += vo_st * 0.05

# ================================================================= MIX
# ducking: an envelope of the voice, looked ahead 30 ms, held through the words, released over 280 ms
env = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.02 * SR)), 0))
la = int(0.03 * SR)
env = np.concatenate([env[la:], np.zeros(la)])
env = maximum_filter1d(env, int(0.12 * SR))
rel = np.exp(-1 / (0.28 * SR))
sm = signal.lfilter([1 - rel], [1, -rel], env)
env = np.maximum(env, sm)
k = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
duck_mid = 10 ** (-9 * k / 20)
duck_low = 10 ** (-5 * k / 20)
duck_fx = 10 ** (-3 * k / 20)

# the pump: every kick in a groove pulls the music down and lets it breathe back
pump = np.ones(N)
pl = int(0.24 * SR)
shape = 1 - 0.45 * np.exp(-np.arange(pl) / (0.07 * SR))
for kt in kicks:
    i = int(kt * SR)
    seg = pump[i : i + pl]
    pump[i : i + pl] = np.minimum(seg, shape[: len(seg)])

music_low = filt(music, "low", 220)
music_mid = music - music_low
music_bus = music_low * (duck_low * pump)[:, None] + music_mid * (duck_mid * pump)[:, None]
drum_bus = drums * (0.75 + 0.25 * duck_mid)[:, None]

ir_len = int(2.6 * SR)
ir_t = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-ir_t * 6.91 / 2.2)[:, None]
ir = filt(ir, "low", 6000)
ir[: int(0.012 * SR)] = 0
ir /= np.sqrt(np.sum(ir**2, axis=0))
send = filt(verb_send, "high", 250)
verb = np.stack([signal.fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], 1) * 0.45

mix = vo_st * 1.0 + music_bus * 0.62 + drum_bus * 0.7 + sfx * (0.85 * duck_fx)[:, None] + verb
mix = np.tanh(mix * 1.15) / 1.15
ceiling = 10 ** (-1 / 20)
w_ = int(0.006 * SR)


def limit(x):
    peak = maximum_filter1d(np.max(np.abs(x), axis=1), int(0.004 * SR))
    g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (peak + 1e-9)), w_), w_)
    return x * g[:, None]


mix = limit(mix)
rms_all = np.sqrt(np.mean(mix**2))
mix *= min(10 ** (-14.5 / 20) / rms_all, 3.0)
mix = np.clip(limit(mix), -ceiling, ceiling)

n_out = int(DUR * SR)
mix = mix[:n_out]
f = int(0.01 * SR)
mix[:f] *= np.linspace(0, 1, f)[:, None]
tail = int(1.2 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2

os.makedirs(os.path.join(ROOT, "public", "about"), exist_ok=True)
with wave.open(os.path.join(ROOT, "public", "about", "master.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())

# per-frame envelopes for the picture: the kick (for pulses) and the voice (for the waveform chip)
fps = TL["fps"]
frames = TL["frames"]
kick_env = np.zeros(frames)
for kt in kicks:
    i0 = int(kt * fps)
    for j in range(12):
        if 0 <= i0 + j < frames:
            kick_env[i0 + j] = max(kick_env[i0 + j], np.exp(-j / 4))
hop = SR // fps
vo_env = np.array([np.sqrt(np.mean(vo[i * hop : (i + 1) * hop] ** 2)) for i in range(frames)])
vo_env = np.clip(vo_env / (np.percentile(vo_env[vo_env > 1e-4], 95) + 1e-9), 0, 1)
json.dump({"kick": [round(float(v), 3) for v in kick_env], "voice": [round(float(v), 3) for v in vo_env]}, open(os.path.join(ROOT, "src", "about", "levels.json"), "w"))
print(f"about/master.wav  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS  kicks {len(kicks)}")
