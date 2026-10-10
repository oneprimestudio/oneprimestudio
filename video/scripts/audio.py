"""
Score, sound design and mix for the One Prime intro — synthesised from scratch, locked to
src/timeline.json.

  music   120 BPM in D. Act 1 (the problem) is a dark drone + muted heartbeat pulse in D minor(b6);
          the switch flips it to an open D major 9 world; the groove (D–Bm–G–A) carries the services,
          drops to half-time for "why", returns for the payoff and ends on one ringing chord.
  sfx     every visual event has a sound: mouse clicks for the 14 clicks, blips for widgets,
          stamps for cloned templates, the switch's mechanical click + chime, Bayer "pixel
          dissolve" sweeps on every dither transition, impacts on the three hits.
  mix     VO: high-pass, presence lift, compression, short room. Music is side-chained under the
          voice and pumped by the kick. Master: reverb bus, glue, look-ahead brickwall at −1 dBFS.

Writes public/master.wav (48 kHz stereo) and src/levels.json (per-frame voice / kick / energy
envelopes, so the picture can breathe with the sound).
"""

import json
import os
import wave

import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TL = json.load(open(os.path.join(ROOT, "src", "timeline.json"), encoding="utf-8"))
DUR = TL["duration"]
N = int(DUR * SR) + SR  # one second of tail room, trimmed at the end
BEAT = TL["beat"]
BAR = TL["bar"]
CUES = TL["cues"]
HITS = TL["hits"]
SCENES = {s["id"]: s for s in TL["scenes"]}
rng = np.random.default_rng(1)


def W(cue, i):
    """absolute time of word i of a cue"""
    return CUES[cue]["words"][i]["t"]


# ---------------------------------------------------------------- buses
music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))
verb_send = np.zeros((N, 2))
kick_env = np.zeros(N)  # for side-chain pump + picture


def add(bus, t, x, pan=0.0, gain=1.0, send=0.0):
    """place a mono (n,) or stereo (n,2) signal at time t, equal-power pan in [-1, 1]"""
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


def tt(dur):
    return np.arange(int(dur * SR)) / SR


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
    """time-varying low/high-pass, exponential in frequency"""
    out = np.zeros_like(x)
    n = len(x)
    zi = None
    for s in range(0, n, block):
        p = (s / max(n - 1, 1)) ** curve
        f = f0 * (f1 / f0) ** p
        so = sos(kind, f)
        if zi is None:
            zi = np.zeros((so.shape[0], 2))
        out[s : s + block], zi = signal.sosfilt(so, x[s : s + block], zi=zi)
    return out


def env_ar(n, a, r, sustain=None):
    """attack / exponential release envelope, seconds"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.exp(-np.maximum(0, t - a) / r)
    return e * rel


def adsr(dur, a, d, s, r):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    tail = int(r * SR)
    e[-tail:] *= np.linspace(1, 0, tail) ** 2 if tail < n else 1
    return e


def polyblep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m] if np.ndim(dt) else t[m] / dt
    out[m] = x + x - x * x - 1
    m2 = t > 1 - (dt if not np.ndim(dt) else dt)
    x2 = (t[m2] - 1) / (dt[m2] if np.ndim(dt) else dt)
    out[m2] = x2 * x2 + x2 + x2 + 1
    return out


def saw(freq, dur, phase=0.0):
    n = int(dur * SR)
    f = np.full(n, freq) if np.isscalar(freq) else freq[:n]
    dt = f / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    return 2 * ph - 1 - polyblep(ph, dt)


def sine(freq, dur, phase=0.0):
    n = int(dur * SR)
    f = np.full(n, freq) if np.isscalar(freq) else freq[:n]
    return np.sin(2 * np.pi * (phase + np.cumsum(f) / SR))


def noise(dur):
    return rng.standard_normal(int(dur * SR))


# ---------------------------------------------------------------- instruments
def supersaw_note(m, dur, cutoff=2400, voices=7, detune=0.18, attack=0.9, release=1.2):
    out = np.zeros((int(dur * SR), 2))
    for v in range(voices):
        cents = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune * 100
        x = saw(midi(m) * 2 ** (cents / 1200), dur, phase=rng.random())
        pan = (v / (voices - 1)) * 1.6 - 0.8
        a = (pan + 1) * np.pi / 4
        out[:, 0] += x * np.cos(a)
        out[:, 1] += x * np.sin(a)
    out = filt(out, "low", cutoff, 2) / voices
    e = adsr(dur, attack, 2.0, 0.85, release)
    return out * e[:, None]


def pad_chord(t, notes, dur, gain=0.16, cutoff=2400, attack=0.9):
    for m in notes:
        add(music, t, supersaw_note(m, dur, cutoff=cutoff, attack=attack), gain=gain, send=0.35)


def kick(gain=1.0, soft=False):
    d = 0.5
    t = tt(d)
    f = (40 if soft else 46) + (70 if soft else 120) * np.exp(-t / (0.05 if soft else 0.032))
    body = sine(f, d) * np.exp(-t / (0.22 if soft else 0.3))
    click = filt(noise(0.004), "high", 2500) * 0.35
    body[: len(click)] += 0 if soft else click
    body = np.tanh(body * 1.6) / np.tanh(1.6)
    if soft:
        body = filt(body, "low", 400)
    return body * gain


def clap():
    d = 0.35
    x = np.zeros(int(d * SR))
    for k, off in enumerate([0, 0.011, 0.023]):
        b = noise(0.008) * np.exp(-np.arange(int(0.008 * SR)) / SR / 0.003)
        i = int(off * SR)
        x[i : i + len(b)] += b * (0.8 + 0.1 * k)
    tail = noise(d) * np.exp(-tt(d) / 0.11)
    x += tail * 0.55
    return filt(x, "bp", (900, 3200), 2) * 1.6


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    x = filt(noise(d), "high", 7500, 2) * np.exp(-tt(d) / (0.09 if open_ else 0.018))
    return x


def pluck(m, dur=0.32):
    t = tt(dur)
    x = 0.6 * saw(midi(m), dur) + 0.4 * np.sign(sine(midi(m) * 1.002, dur))
    x = sweep(x * np.exp(-t / 0.12), "low", 5200, 500, curve=0.5)
    return x


def bass_note(m, dur):
    t = tt(dur)
    x = 0.75 * sine(midi(m), dur) + 0.25 * filt(saw(midi(m), dur), "low", 420)
    e = np.minimum(1, t / 0.005) * np.exp(-t / 0.42)
    return np.tanh(1.8 * x * e) * 0.8


# ---------------------------------------------------------------- sfx
def whoosh(dur=0.55, rising=True, pan_from=-0.7, pan_to=0.7):
    n = int(dur * SR)
    x = noise(dur)
    x = sweep(x, "low", 350, 7000, curve=1.4) if rising else sweep(x, "low", 7000, 350, curve=0.7)
    x = filt(x, "high", 160)
    p = np.linspace(0, 1, n)
    e = np.sin(np.pi * np.clip(p if rising else 1 - p, 0, 1) ** (1.6 if rising else 0.6)) ** 2
    x = x * e
    pans = np.linspace(pan_from, pan_to, n)
    a = (pans + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2) * 0.5


def pixel_dissolve(dur=0.6):
    """Bayer dissolve: sample-and-hold noise whose hold length shrinks — coarse pixels to fine"""
    n = int(dur * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        p = i / n
        hold = int(np.interp(p, [0, 1], [180, 6]))
        out[i : i + hold] = rng.uniform(-1, 1)
        i += hold
    gate = (np.floor(np.arange(n) / (SR * BEAT / 8)) % 2 == 0) * 0.5 + 0.5
    out = filt(out * gate, "bp", (500, 9000), 2)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return out * e * 0.5


def impact(size=1.0):
    d = 3.0
    t = tt(d)
    f = 30 + 32 * np.exp(-t / 0.35)
    sub = sine(f, d) * np.exp(-t / (0.9 * size))
    crack = filt(noise(d), "low", 2400) * np.exp(-t / 0.07)
    click = np.zeros_like(t)
    click[: int(0.003 * SR)] = 1
    x = np.tanh(1.4 * (sub * 1.0 + crack * 0.6 + click * 0.4))
    return x


def riser(dur):
    t = tt(dur)
    p = t / dur
    nz = sweep(noise(dur), "high", 180, 9000, curve=1.6) * p**2.2
    tone = saw(midi(50) * 2 ** (2 * p**1.4), dur) * p**2.5
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(2 + 22 * p**2) / SR)
    x = (nz * 0.55 + filt(tone, "low", 3500) * 0.28) * trem
    return x


def reverse_swell(dur=0.9):
    x = filt(noise(dur), "bp", (300, 6000)) * np.exp(-tt(dur) / 0.25)
    return x[::-1] * 0.6


def mouse_click():
    x = np.zeros(int(0.09 * SR))
    for off, g in [(0, 1.0), (0.055, 0.55)]:
        b = filt(noise(0.003), "bp", (1800, 7000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    body = sine(1900, 0.012) * np.exp(-tt(0.012) / 0.002) * 0.35
    x[: len(body)] += body
    return x * 0.9


def tick():
    return filt(noise(0.0025), "high", 4000) * 0.7


def blip(freq, dur=0.11):
    t = tt(dur)
    return (sine(freq, dur) + 0.18 * sine(freq * 2, dur)) * np.minimum(1, t / 0.002) * np.exp(-t / 0.035)


def bell(freq, dur=2.4, bright=1.0):
    t = tt(dur)
    x = np.zeros_like(t)
    for ratio, amp, dec in [(1, 1, 1.4), (2.0, 0.45 * bright, 0.7), (2.76, 0.28 * bright, 0.45), (5.4, 0.12 * bright, 0.2)]:
        x += amp * sine(freq * ratio, dur, phase=rng.random()) * np.exp(-t / dec)
    return x * np.minimum(1, t / 0.002) * 0.4


def stamp():
    d = 0.22
    t = tt(d)
    thud = sine(110 * np.exp(-t / 0.05) + 60, d) * np.exp(-t / 0.06)
    paper = filt(noise(d), "bp", (1200, 5000)) * np.exp(-t / 0.025) * 0.4
    return thud + paper


def error_tone():
    out = np.concatenate([np.sign(sine(midi(69), 0.09)), np.zeros(int(0.03 * SR)), np.sign(sine(midi(65), 0.14))])
    out = filt(out, "low", 1800) * np.concatenate([np.ones(len(out) - 2000), np.linspace(1, 0, 2000)])
    return out * 0.25


def pop():
    d = 0.08
    t = tt(d)
    return sine(300 + 900 * (t / d) ** 0.5, d) * np.exp(-t / 0.02) * 0.9


def switch_click():
    x = np.zeros(int(0.25 * SR))
    for off, g in [(0, 1.0), (0.018, 0.7)]:
        b = filt(noise(0.004), "bp", (2000, 8000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    thump = sine(95, 0.12) * np.exp(-tt(0.12) / 0.03) * 0.8
    x[: len(thump)] += thump
    return x


def glitch(dur=0.5):
    n = int(dur * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        seg = int(rng.uniform(0.012, 0.05) * SR)
        kind = rng.integers(0, 4)
        if kind == 0:
            s = np.sign(sine(rng.uniform(200, 2400), seg / SR)) * 0.4
        elif kind == 1:
            s = np.repeat(rng.uniform(-1, 1, seg // 40 + 1), 40)[:seg] * 0.5
        elif kind == 2:
            s = np.zeros(seg)
        else:
            s = filt(noise(seg / SR), "high", 3000) * 0.4
        s = np.pad(s, (0, max(0, seg - len(s))))[:seg]
        out[i : i + seg] = s[: n - i]
        i += seg
    return out


def shimmer(dur=3.0):
    t = tt(dur)
    x = np.zeros_like(t)
    for m in [86, 90, 93, 97, 100]:
        x += sine(midi(m), dur, rng.random()) * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(3, 7) * t + rng.random() * 6))
    return x * np.minimum(1, t / 0.4) * np.exp(-t / 1.2) * 0.12


def counter_run(t0, t1, f0, f1, count):
    for k in range(count):
        p = k / max(count - 1, 1)
        add(sfx, t0 + (t1 - t0) * p, blip(f0 * (f1 / f0) ** p, 0.05), pan=0.3 * np.sin(k), gain=0.22)


# ================================================================= SCORE
# ---- act 1: the problem (dark) -------------------------------------------------------------
switch_t = HITS["switch"]
cut_t = switch_t - 1.0  # music drops out a bar-half before "switch"

# drone: D1 + A1, air on top, fading up from black
d_len = cut_t + 0.05
drone = 0.6 * sine(midi(26), d_len) + 0.3 * filt(saw(midi(33), d_len), "low", 160) + 0.25 * filt(saw(midi(38), d_len), "low", 220)
drone *= np.minimum(1, tt(d_len) / 2.5) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.25 * tt(d_len)))
drone[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
add(music, 0, drone, gain=0.32)
air = filt(noise(d_len), "bp", (2500, 9000)) * np.minimum(1, tt(d_len) / 4) * 0.04
add(music, 0, air, pan=0.2)

# tense pad Dm(b6) across the problem, opening up
prob_start = SCENES["problem"]["start"]
pad_chord(prob_start, [50, 53, 57, 58], cut_t - prob_start, gain=0.07, cutoff=900, attack=1.5)

# heartbeat kick + 8th bass pulse with an opening filter + ticking 16ths
first_beat = np.ceil(prob_start / BEAT) * BEAT
t = first_beat
k = 0
while t < cut_t - 1e-6:
    add(drums, t, kick(soft=True), gain=0.55)
    kick_env[int(t * SR)] = 0.5
    k += 1
    t += BEAT
pulse_len = cut_t - first_beat
steps = int(pulse_len / (BEAT / 2))
for s in range(steps):
    tt0 = first_beat + s * BEAT / 2
    p = s / steps
    note = [38, 38, 41, 38, 38, 44, 38, 36][s % 8]
    x = saw(midi(note), BEAT / 2) * np.exp(-tt(BEAT / 2) / 0.09)
    x = filt(x, "low", 220 + 1400 * p**1.5)
    add(music, tt0, x, pan=0.15 * (-1) ** s, gain=0.18)
for s in range(int(pulse_len / (BEAT / 4))):
    tt0 = first_beat + s * BEAT / 4
    add(drums, tt0, hat(), pan=0.5 * np.sin(s * 1.3), gain=0.05 + 0.04 * (s % 4 == 2))

# riser into the drop, then silence — and a reverse swell that pulls into "switch"
add(sfx, cut_t - 2.4, riser(2.4), gain=0.5, send=0.2)
add(sfx, switch_t - 0.9, reverse_swell(0.9), gain=0.55, send=0.3)

# ---- the switch: lights on -----------------------------------------------------------------
add(sfx, switch_t - 0.005, switch_click(), gain=0.9, send=0.15)
add(sfx, switch_t, impact(1.1), gain=0.85, send=0.5)
for i, m in enumerate([74, 78, 81, 85]):  # D5 F#5 A5 C#6 — a chime that opens the major world
    add(sfx, switch_t + 0.03 + i * 0.06, bell(midi(m), 3.0), pan=-0.45 + i * 0.3, gain=0.3, send=0.6)
add(sfx, switch_t, shimmer(3.5), gain=0.9, send=0.6)

belief_t = HITS["belief"]
# open Dmaj9 → Gmaj9 under the introduction
pad_chord(switch_t, [50, 54, 57, 61, 64], 4.0, gain=0.11, cutoff=2600, attack=0.25)
pad_chord(switch_t + 4.0, [50, 54, 55, 57, 59], belief_t - switch_t - 4.0, gain=0.11, cutoff=2200, attack=1.2)
# soft plucks drifting through the intro (two per bar, sparse)
for b in range(int((belief_t - switch_t - 2) / BEAT)):
    tb = switch_t + 2 + b * BEAT
    if b % 2 == 0:
        add(music, tb, pluck([74, 69, 76, 73, 71, 69, 74, 78][b % 8]), pan=0.4 * (-1) ** b, gain=0.06, send=0.5)
add(sfx, belief_t - 1.2, riser(1.2), gain=0.35)

# ---- the belief: slams ---------------------------------------------------------------------
add(sfx, belief_t, impact(1.3), gain=1.0, send=0.55)
add(drums, belief_t, kick(), gain=0.9)
add(music, belief_t, supersaw_note(38, 2.2, cutoff=900, attack=0.01) * 1.0, gain=0.25)
for i in [1, 2, 4]:  # is · not · option
    add(sfx, W("belief", i), kick(), gain=0.45 if i != 2 else 0.7)
    add(sfx, W("belief", i), filt(noise(0.06), "high", 3000) * np.exp(-tt(0.06) / 0.015), gain=0.25)
add(sfx, W("belief", 4) + 0.35, whoosh(0.5, rising=False), gain=0.6)  # the strike-through

# ---- the groove: D – Bm – G – A -------------------------------------------------------------
CHORDS = [
    ([50, 54, 57, 61, 64], 38),  # Dmaj9
    ([50, 54, 57, 59, 61], 35),  # Bm9
    ([50, 54, 55, 57, 59], 31),  # Gmaj9
    ([52, 57, 59, 61, 64], 33),  # A add9
]
groove_start = np.ceil((SCENES["services"]["start"] - 0.3) / BAR) * BAR  # 26.0
why_start = SCENES["why"]["start"]
solve_start = SCENES["solve"]["start"]
prime_t = HITS["prime"]
end_t = DUR


def section_of(t):
    if t < why_start - 0.2:
        return "full"
    if t < solve_start - 0.2:
        return "half"
    return "full"


bar_t = groove_start
bar_i = 0
while bar_t < prime_t - 1e-6:
    notes, root = CHORDS[bar_i % 4]
    length = min(BAR, prime_t - bar_t)
    sec = section_of(bar_t)
    pad_chord(bar_t, notes, length + 0.6, gain=0.085 if sec == "full" else 0.11, cutoff=2600, attack=0.15)
    for b in range(4):
        tb = bar_t + b * BEAT
        if tb >= prime_t - 1e-6:
            break
        if sec == "full" or b == 0:
            add(drums, tb, kick(), gain=0.75 if sec == "full" else 0.5)
            kick_env[int(tb * SR)] = 1.0 if sec == "full" else 0.6
        if sec == "full" and b in (1, 3):
            add(drums, tb, clap(), gain=0.32, send=0.25)
        if sec == "full":
            add(drums, tb + BEAT / 2, hat(open_=(b == 3)), pan=0.25, gain=0.16)
        for s in range(4):  # 16th ghost hats
            add(drums, tb + s * BEAT / 4, hat(), pan=-0.3, gain=0.035 + 0.03 * (s == 2))
        # sub bass: root on the beat and the "and"
        for off in (0, BEAT / 2) if sec == "full" else (0,):
            if tb + off < prime_t:
                add(music, tb + off, bass_note(root, BEAT / 2 if sec == "full" else BEAT * 2), gain=0.42)
    # 16th pluck arp up the chord
    arp = [notes[i] + 12 for i in (0, 2, 4, 3, 1, 3, 2, 4)]
    for s in range(16):
        ts = bar_t + s * BEAT / 4
        if ts >= prime_t - 1e-6:
            break
        add(music, ts, pluck(arp[s % 8], 0.25), pan=0.5 * np.sin(s * 0.9), gain=0.05 + 0.02 * (s % 4 == 0), send=0.35)
    bar_t += BAR
    bar_i += 1

# ---- the payoff: one ringing chord ---------------------------------------------------------
add(sfx, prime_t - 2.0, riser(2.0), gain=0.5, send=0.2)
add(sfx, prime_t, impact(1.4), gain=1.0, send=0.6)
add(drums, prime_t, kick(), gain=1.0)
pad_chord(prime_t, [38, 50, 54, 57, 61, 64, 69], end_t - prime_t + 0.5, gain=0.12, cutoff=3200, attack=0.02)
add(music, prime_t, bass_note(26, 3.0), gain=0.5)
for i, m in enumerate([62, 69, 74, 78, 81]):
    add(sfx, prime_t + i * 0.045, bell(midi(m), 4.0), pan=-0.5 + i * 0.25, gain=0.22, send=0.6)
add(sfx, prime_t + 0.2, shimmer(4.0), gain=1.0, send=0.7)

# ================================================================= SOUND DESIGN (picture-locked)
# transitions: a Bayer pixel dissolve + whoosh on every dither cut
for sc in TL["scenes"]:
    if sc["in"] == "dither":
        add(sfx, sc["start"] - 0.3, pixel_dissolve(0.6), pan=0, gain=0.45, send=0.1)
        add(sfx, sc["start"] - 0.35, whoosh(0.6), gain=0.5)

# hook: cold open — sub drop, static, typing, the break
add(sfx, 0.0, impact(0.7), gain=0.45, send=0.4)
add(sfx, 0.02, glitch(0.35), gain=0.25)
for k in range(10):
    add(sfx, 0.6 + k * 0.07 + rng.uniform(0, 0.02), tick(), pan=rng.uniform(-0.3, 0.3), gain=0.6)
add(sfx, W("hook2", 0) - 0.05, glitch(0.55), gain=0.32)
add(sfx, W("hook2", 0) - 0.05, whoosh(0.35, rising=False), gain=0.4)

# problem 1: fourteen clicks — one click per count
c0, c1 = W("prob1", 0) + 0.12, W("prob1", 5) + 0.25
for k in range(14):
    add(sfx, c0 + (c1 - c0) * (k / 13) ** 0.85, mouse_click(), pan=0.3 * np.sin(k * 0.7), gain=0.55)
# problem 2: widgets pop in, then go dim
for k in range(16):
    add(sfx, W("prob2", 0) + k * 0.055, blip(1200 + 140 * (k % 6), 0.06), pan=np.sin(k * 1.7) * 0.6, gain=0.13)
add(sfx, W("prob2", 2) + 0.15, sweep(noise(0.5), "low", 3000, 200) * np.exp(-tt(0.5) / 0.2) * 0.4, gain=0.5)
# problem 3: the template clones itself, faster and faster
for k in range(12):
    add(sfx, W("prob3", 0) + 0.15 + 1.6 * (k / 11) ** 0.7, stamp(), pan=np.sin(k) * 0.5, gain=0.35)
# problem 4: error modal + sticky-note slaps
add(sfx, W("prob4", 0) + 0.15, error_tone(), gain=0.6)
for k, i in enumerate([2, 3, 4, 5]):
    slap = stamp() * 0.7
    slap[: int(0.05 * SR)] += filt(noise(0.05), "bp", (800, 4000)) * np.exp(-tt(0.05) / 0.012) * 0.5
    add(sfx, W("prob4", i) + 0.05, slap, pan=(-1) ** k * 0.4, gain=0.35)
add(sfx, CUES["prob4"]["speechEnd"] + 0.05, glitch(0.6), gain=0.3)

# switch: typewriter for "SO WE FLIPPED THE"
for k in range(15):
    add(sfx, W("switch", 0) + k * 0.034, tick(), gain=0.5)

# intro: logo assembles, lines arrive
add(sfx, W("intro", 0) - 0.08, switch_click(), gain=0.5)
add(sfx, W("intro", 0), bell(midi(81), 2.0, 0.5), gain=0.12, send=0.5)
for i in (3, 8):
    add(sfx, W("intro", i) - 0.1, whoosh(0.4), gain=0.25)

# services: an ascending D-pentatonic blip per item + a soft swish
pent = [74, 76, 78, 81, 83, 86, 88]
for n, i in enumerate([0, 1, 2, 4, 5, 7, 9]):
    add(sfx, W("services", i), blip(midi(pent[n]), 0.14), pan=-0.3 + n * 0.1, gain=0.28, send=0.3)
    add(sfx, W("services", i) - 0.12, whoosh(0.3), gain=0.18)

# zero: resolution steps (coarse → fine), counter run, sparkle on "form"
for n, i in enumerate([4, 7, 8, 9, 10]):
    add(sfx, W("zero", i), blip(midi(62 + 5 * n), 0.12) + pixel_dissolve(0.12) * 0.3, gain=0.3, send=0.25)
counter_run(W("zero", 4), W("zero", 11), 500, 2600, 26)
add(sfx, W("zero", 11), bell(midi(86), 2.4), gain=0.2, send=0.6)

# why: a node lands for each point, the path draws on
for c in ("why1", "why2", "why3", "why4"):
    add(sfx, W(c, 0) - 0.05, blip(midi(69), 0.18), gain=0.22, send=0.4)
    add(sfx, W(c, 0) - 0.3, whoosh(0.45), gain=0.22)

# solve: 14 → 1 counts down, "one" rings, "clear" washes the screen light
counter_run(W("solve", 1), HITS["one"] - 0.04, 2400, 600, 13)
add(sfx, HITS["one"], bell(midi(81), 2.6), gain=0.35, send=0.5)
add(sfx, HITS["one"], switch_click(), gain=0.5)
add(sfx, W("solve", 4) - 0.05, glitch(0.4), gain=0.22)
add(sfx, W("solve", 6) - 0.4, whoosh(0.8), gain=0.5, send=0.3)
add(sfx, W("solve", 6), shimmer(2.0), gain=0.6, send=0.5)
for k in range(5):
    add(sfx, W("solve", 8) + k * 0.07, pop(), pan=-0.5 + k * 0.25, gain=0.25)

# ask: each question pops in like a message
for i in (0, 3, 6, 11):
    add(sfx, W("ask", i) - 0.03, pop(), gain=0.45)
    add(sfx, W("ask", i) - 0.03, blip(midi(88), 0.08), gain=0.12)
for i in (0, 1, 2):
    add(sfx, W("cta", i), kick(), gain=0.35)

# end card: the switch clicks on once more
end_click = prime_t + 1.6
add(sfx, end_click, switch_click(), gain=0.7, send=0.2)
add(sfx, end_click + 0.02, bell(midi(86), 2.0), gain=0.18, send=0.6)
add(sfx, end_click + 0.6, pop(), gain=0.3)

# ================================================================= VOICE
vo = np.zeros(N)
for cid, c in CUES.items():
    with wave.open(os.path.join(ROOT, "public", "vo", f"{cid}.wav")) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    i = int(round(c["start"] * SR))
    vo[i : i + len(x)] += x[: N - i]

vo = filt(vo, "high", 75, 2)
b, a = signal.iirpeak(3200 / (SR / 2), 0.9)
vo = vo + 0.22 * signal.lfilter(b, a, vo)  # presence
b, a = signal.iirpeak(180 / (SR / 2), 1.2)
vo = vo + 0.12 * signal.lfilter(b, a, vo)  # chest
# compressor: 3:1 above −20 dBFS RMS, 10 ms window
rms = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.01 * SR)), 0) + 1e-12)
db = 20 * np.log10(rms)
gain_db = np.where(db > -20, (db + 20) * (1 / 3 - 1), 0)
gain_db = uniform_filter1d(gain_db, int(0.02 * SR))
vo = vo * 10 ** (gain_db / 20)
vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.7
vo_st = np.stack([vo, vo], 1)
verb_send += vo_st * 0.08

# ================================================================= MIX
# side-chain: music ducks under the voice (and drums a touch), kick pumps the pad + bass
vo_env = np.sqrt(np.maximum(uniform_filter1d(vo**2, int(0.03 * SR)), 0))
vo_env = maximum_filter1d(vo_env, int(0.25 * SR))
vo_env = uniform_filter1d(vo_env, int(0.12 * SR))
duck = 1 - 0.55 * np.clip(vo_env / (np.max(vo_env) * 0.35 + 1e-9), 0, 1)

pump = np.zeros(N)
idx = np.nonzero(kick_env)[0]
pt = np.arange(int(0.35 * SR)) / SR
shape = 1 - 0.45 * np.exp(-pt / 0.09)
pump[:] = 1
for i in idx:
    seg = shape[: N - i]
    pump[i : i + len(seg)] = np.minimum(pump[i : i + len(seg)], 1 - (1 - seg) * kick_env[i])

music_bus = music * (duck * pump)[:, None]
drum_bus = drums * (0.75 + 0.25 * duck)[:, None]

# reverb: stereo exponential-decay noise IR (RT60 ≈ 2.6 s), darkened
ir_len = int(2.8 * SR)
ir_t = np.arange(ir_len) / SR
ir = rng.standard_normal((ir_len, 2)) * np.exp(-ir_t * 6.91 / 2.6)[:, None]
ir = filt(ir, "low", 5500)
ir[: int(0.012 * SR)] = 0  # pre-delay
ir /= np.sqrt(np.sum(ir**2, axis=0))
send = filt(verb_send, "high", 250)
verb = np.stack([signal.fftconvolve(send[:, ch], ir[:, ch])[:N] for ch in range(2)], 1) * 0.55

mix = vo_st * 1.0 + music_bus * 0.9 + drum_bus * 0.85 + sfx * 0.8 + verb

# glue: gentle bus saturation, then look-ahead brickwall at −1 dBFS
mix = np.tanh(mix * 1.15) / 1.15
ceiling = 10 ** (-1 / 20)
peak = maximum_filter1d(np.max(np.abs(mix), axis=1), int(0.004 * SR))
g = np.minimum(1, ceiling / (peak + 1e-9))
w = int(0.006 * SR)
g = uniform_filter1d(minimum_filter1d(g, w), w)
mix = mix * g[:, None]
# loudness target ≈ −14 LUFS-ish (RMS proxy), re-limited
rms_all = np.sqrt(np.mean(mix**2))
target = 10 ** (-15.5 / 20)
mix *= min(target / rms_all, 2.5)
peak = maximum_filter1d(np.max(np.abs(mix), axis=1), int(0.004 * SR))
g = uniform_filter1d(minimum_filter1d(np.minimum(1, ceiling / (peak + 1e-9)), w), w)
mix = np.clip(mix * g[:, None], -ceiling, ceiling)

# fades
n_out = int(DUR * SR)
mix = mix[:n_out]
fade = int(0.012 * SR)
mix[:fade] *= np.linspace(0, 1, fade)[:, None]
tail = int(1.2 * SR)
mix[-tail:] *= np.linspace(1, 0, tail)[:, None] ** 2

pcm = (mix * 32767).astype(np.int16)
with wave.open(os.path.join(ROOT, "public", "master.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# ================================================================= LEVELS for the picture
fps = TL["fps"]
frames = TL["frames"]
hop = SR / fps


def per_frame(x, smooth=1):
    out = np.zeros(frames)
    for f in range(frames):
        a = int(f * hop)
        out[f] = np.sqrt(np.mean(x[a : a + int(hop)] ** 2)) if a < len(x) else 0
    out = uniform_filter1d(out, smooth) if smooth > 1 else out
    return out / (out.max() + 1e-9)


kick_frames = np.zeros(frames)
for i in idx:
    f = int(i / hop)
    for k in range(12):
        if f + k < frames:
            kick_frames[f + k] = max(kick_frames[f + k], kick_env[i] * np.exp(-k / 3.5))
levels = {
    "voice": np.round(per_frame(vo[:n_out], 3), 3).tolist(),
    "energy": np.round(per_frame(np.mean(mix, 1), 9), 3).tolist(),
    "kick": np.round(kick_frames, 3).tolist(),
}
with open(os.path.join(ROOT, "src", "levels.json"), "w") as f:
    json.dump(levels, f)

print(f"master.wav  {DUR:.2f}s  peak {20*np.log10(np.max(np.abs(mix))):.2f} dBFS  rms {20*np.log10(np.sqrt(np.mean(mix**2))):.2f} dBFS")
