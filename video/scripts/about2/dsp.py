"""
Signal generators for the v2 launch film: instruments for the funk / phonk score and the sound
effects kit (hits, risers, cash, coins, glitches, the absorb). Pure functions of time: no buses here.
"""

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(23)


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
            zi = np.zeros((so.shape[0], 2) + x.shape[1:])
        out[s : s + block], zi = signal.sosfilt(so, x[s : s + block], axis=0, zi=zi)
    return out


def osc(f, d, phase=0.0):
    n = int(d * SR)
    ff = np.full(n, f) if np.isscalar(f) else f[:n]
    return 2 * np.pi * (phase + np.cumsum(ff) / SR)


def sine(f, d, phase=0.0):
    return np.sin(osc(f, d, phase))


def square(f, d):
    return np.sign(np.sin(osc(f, d, rng.random())))


def saw(f, d):
    ph = (rng.random() + osc(f, d) / (2 * np.pi)) % 1.0
    return 2 * ph - 1


def noise(d):
    return rng.standard_normal(int(d * SR))


def env(d, a=0.002, dec=0.2):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / dec)


def pan_sweep(x, a, b):
    ang = (np.linspace(a, b, len(x)) + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], 1) * np.sqrt(2)


def hall_ir(rt=2.6, length=3.0, pre=0.02, lp=6500, seed=5):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)) * np.exp(-t * 6.91 / rt)[:, None]
    ir = filt(ir, "low", lp)
    ir[: int(pre * SR)] = 0
    return ir / np.sqrt(np.sum(ir**2, axis=0))


# ================================================================= the phonk / funk kit
def cowbell(m, d=0.32, drive=2.2):
    """the phonk cowbell: two square partials a fifth-ish apart (the 808's 540/800 ratio), band-passed, driven"""
    f = midi(m)
    x = 0.6 * square(f, d) + 0.4 * square(f * 1.48, d)
    x = filt(x, "bp", (f * 0.9, min(f * 6, 9000)))
    e = np.minimum(1, tt(d) / 0.001) * (0.75 * np.exp(-tt(d) / 0.05) + 0.25 * np.exp(-tt(d) / 0.22))
    return np.tanh(drive * x * e) * 0.35


def bass808(m, d, glide_to=None, drive=3.0):
    t = tt(d)
    f0 = midi(m)
    f = np.full(len(t), f0)
    f *= 1 + 0.9 * np.exp(-t / 0.012)  # the click of the attack
    if glide_to is not None:
        k = np.clip((t - d * 0.55) / (d * 0.3), 0, 1)
        f *= 2 ** ((glide_to - m) * k / 12)
    x = np.sin(osc(f, d))
    e = np.minimum(1, t / 0.003) * np.exp(-t / max(0.35, d * 0.9)) * np.minimum(1, (d - t) / 0.02)
    return np.tanh(drive * x * e) * 0.55


def kick(g=1.0, d=0.38):
    t = tt(d)
    x = np.sin(osc(48 + 160 * np.exp(-t / 0.022), d)) * np.exp(-t / 0.16)
    c = filt(noise(0.006), "high", 2500) * 0.5
    x[: len(c)] += c
    return np.tanh(2.2 * x) * g


def clap(g=1.0):
    d = 0.42
    x = np.zeros(int(d * SR))
    for off in (0.0, 0.009, 0.019, 0.03):
        b = filt(noise(0.012), "bp", (900, 4200)) * np.exp(-tt(0.012) / 0.004)
        i = int(off * SR)
        x[i : i + len(b)] += b
    tail = filt(noise(d - 0.04), "bp", (1000, 5000)) * np.exp(-tt(d - 0.04) / 0.09)
    x[int(0.04 * SR) :][: len(tail)] += tail * 0.7
    return np.tanh(1.5 * x) * g * 0.75


def hat(g=1.0, d=0.04, open_=False):
    d = 0.22 if open_ else d
    return filt(noise(d), "high", 7800) * np.exp(-tt(d) / (0.08 if open_ else d / 3)) * g * 0.42


def chop(m=66, vowel="a", d=0.2):
    """a formant 'hey' / 'ah' chop: a saw through vowel resonances"""
    F = {"a": (800, 1150, 2900), "e": (400, 2000, 2600), "o": (450, 800, 2830)}[vowel]
    src = saw(midi(m), d) + 0.3 * saw(midi(m) * 1.005, d)
    x = sum(filt(src, "bp", (f * 0.88, f * 1.12)) * g for f, g in zip(F, (1.0, 0.6, 0.3)))
    e = np.minimum(1, tt(d) / 0.008) * np.exp(-tt(d) / 0.09)
    return np.tanh(2.5 * x * e) * 0.45


def pad(notes, d, gain=0.1, cutoff=1400, attack=0.8, release=1.0):
    t = tt(d)
    x = np.zeros((len(t), 2))
    for m in notes:
        for v in range(4):
            s = saw(midi(m) * 2 ** ((v - 1.5) * 0.09 / 12), d)
            a = ((v - 1.5) / 2 + 1) * np.pi / 4
            x[:, 0] += s * np.cos(a)
            x[:, 1] += s * np.sin(a)
    x = filt(x, "low", cutoff, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, d - t) / release)
    return x * e[:, None] * gain / (len(notes) * 2)


def sub(m, d, g=0.4):
    t = tt(d)
    return np.sin(osc(midi(m), d)) * np.minimum(1, t / 0.3) * np.minimum(1, np.maximum(0, d - t) / 0.4) * g


# ================================================================= sound effects
def s_swoosh(d=0.45, a=-0.6, b=0.6):
    x = sweep(noise(d), "low", 500, 8000, curve=0.8)
    x = filt(x, "high", 300) * np.sin(np.pi * np.linspace(0, 1, len(x)) ** 0.7) ** 2
    return pan_sweep(x, a, b) * 0.4


def s_riser(d=1.4):
    t = tt(d)
    q = t / d
    nz = sweep(noise(d), "high", 300, 10000, curve=1.6)
    tone = sum(np.sin(osc(midi(m) * 2 ** (1.6 * q**1.8), d)) for m in (54, 61, 66))
    return (nz * 0.55 + filt(tone, "low", 3500) * 0.16) * q**2.2


def s_hit():
    """the flash hit: sub punch, a white crack, a crash wash; meant to be sent to the hall"""
    d = 2.2
    t = tt(d)
    body = np.sin(osc(30 + 90 * np.exp(-t / 0.09), d)) * np.exp(-t / 0.6)
    crack = filt(noise(d), "low", 4000) * np.exp(-t / 0.03) * 0.8
    crash = filt(noise(d), "high", 4000) * np.exp(-t / 0.5) * 0.25
    x = np.tanh(1.8 * (body + crack)) * 0.8 + crash
    return x


def s_drop():
    d = 2.8
    t = tt(d)
    boom = np.sin(osc(26 + 100 * np.exp(-t / 0.2), d)) * np.exp(-t / 1.2)
    down = np.sin(osc(1200 * np.exp(-t / 0.22) + 50, d)) * np.exp(-t / 0.35) * 0.18
    return np.tanh(1.6 * boom) * 0.95 + down + filt(noise(d), "high", 3000) * np.exp(-t / 0.7) * 0.25


def s_shock():
    """shockwave: a fast descending air sweep around a sub thump"""
    d = 1.4
    t = tt(d)
    air = sweep(noise(d), "low", 9000, 300, curve=0.5) * np.exp(-t / 0.35)
    th = np.sin(osc(60 + 40 * np.exp(-t / 0.05), d)) * np.exp(-t / 0.25)
    return pan_sweep(air * 0.5 + th * 0.6, 0.0, 0.0)


def s_slam():
    d = 0.5
    t = tt(d)
    th = np.sin(osc(55 + 120 * np.exp(-t / 0.02), d)) * np.exp(-t / 0.12)
    sn = filt(noise(d), "bp", (800, 6000)) * np.exp(-t / 0.03)
    return np.tanh(2.2 * (th + 0.6 * sn)) * 0.8


def s_glitch():
    base = filt(noise(0.05), "bp", (500, 5000)) + np.sin(osc(midi(70), 0.05)) * 0.6
    out = []
    L = 0.05
    for i in range(9):
        g = base[: int(L * SR)]
        g = np.round(g * 5) / 5
        out.append(g * (1 - i * 0.06))
        L *= 0.84
    return np.concatenate(out) * 0.55


def s_buzz():
    """error buzzer: two short square pulses, band-limited"""
    x = np.zeros(int(0.5 * SR))
    for off in (0.0, 0.17):
        b = filt(square(110, 0.12) + 0.5 * square(220.5, 0.12), "bp", (200, 2500)) * env(0.12, 0.002, 0.2)
        i = int(off * SR)
        x[i : i + len(b)] += b
    return np.tanh(1.5 * x) * 0.4


def s_type(n=10, span=0.7):
    x = np.zeros(int((span + 0.1) * SR))
    for k in range(n):
        i = int((k / n * span + rng.uniform(0, 0.03)) * SR)
        b = filt(noise(0.01), "bp", (1500, 7000)) * np.exp(-tt(0.01) / 0.002)
        x[i : i + len(b)] += b * rng.uniform(0.5, 1)
    return x * 0.8


def s_shuffle(d=0.6):
    x = np.zeros(int((d + 0.05) * SR))
    k = 0.0
    while k < d:
        i = int(k * SR)
        b = filt(noise(0.02), "bp", (800, 5000)) * np.exp(-tt(0.02) / 0.006)
        x[i : i + len(b)] += b * rng.uniform(0.3, 1)
        k += rng.uniform(0.012, 0.03)
    return pan_sweep(x * 0.6, -0.5, 0.5)


def s_thud():
    d = 0.6
    t = tt(d)
    return np.tanh(2 * np.sin(osc(45 + 50 * np.exp(-t / 0.04), d)) * np.exp(-t / 0.18)) * 0.8


def s_pop():
    d = 0.08
    t = tt(d)
    return np.sin(osc(300 + 900 * (t / d) ** 0.5, d)) * np.exp(-t / 0.02) * 0.8


def s_drops(n=5, gap=0.09):
    x = np.zeros(int((n * gap + 0.6) * SR))
    for i in range(n):
        y = s_thud() * 0.5
        j = int(i * gap * SR)
        x[j : j + len(y)] += y
        p = s_pop() * 0.4
        x[j : j + len(p)] += p
    return x


def s_snap():
    d = 0.15
    t = tt(d)
    return filt(noise(d), "bp", (1200, 7000)) * np.exp(-t / 0.012) + np.sin(osc(1400, d)) * np.exp(-t / 0.01) * 0.3


def s_heartbeat(n=3):
    x = np.zeros(int((n * 1.0 + 0.6) * SR))
    k = 0.0
    for i in range(n):
        for off, g in ((0, 1.0), (0.2, 0.7)):
            d = 0.25
            t = tt(d)
            b = np.tanh(2 * np.sin(osc(48 + 20 * np.exp(-t / 0.03), d)) * np.exp(-t / 0.08)) * g
            j = int((k + off) * SR)
            x[j : j + len(b)] += b
        k += 0.8 + 0.18 * i  # slowing down
    return x * 0.8


def s_flatline(d=1.4):
    return np.sin(osc(988, d)) * np.minimum(1, tt(d) / 0.01) * np.linspace(1, 0, int(d * SR)) ** 0.5 * 0.12


def s_absorb(d=1.0):
    """everything pulled into one point: a rising reversed swell into a sub pressure, cut dead"""
    t = tt(d)
    q = t / d
    x = sweep(noise(d), "low", 400, 9000, curve=1.5)
    tone = np.sin(osc(midi(42) * 2 ** (2.5 * q**2), d)) * 0.25
    sub_ = np.sin(osc(35, d)) * q**2 * 0.6
    return (x * 0.4 + tone + sub_) * q**2.5


def s_switch():
    x = np.zeros(int(0.3 * SR))
    for off, g in ((0, 1.0), (0.018, 0.7)):
        b = filt(noise(0.004), "bp", (2000, 8000)) * g
        i = int(off * SR)
        x[i : i + len(b)] += b
    th = np.sin(osc(90, 0.14)) * np.exp(-tt(0.14) / 0.035) * 0.9
    x[: len(th)] += th
    return x


def _bell(f, d, bright=1.0):
    t = tt(d)
    return sum(a * np.sin(osc(f * r, d, rng.random())) * np.exp(-t / dc) for r, a, dc in ((1, 1, 0.5 * d), (2.76, 0.4 * bright, 0.15 * d), (5.4, 0.2 * bright, 0.08 * d), (8.9, 0.1 * bright, 0.05 * d)))


def s_coins(n=10, span=0.45):
    x = np.zeros(int((span + 0.5) * SR))
    for k in range(n):
        f = rng.uniform(3200, 6800)
        d = 0.18
        b = _bell(f, d, 0.8) * np.minimum(1, tt(d) / 0.0005) * 0.25
        i = int((rng.uniform(0, 1) ** 1.6 * span) * SR)
        x[i : i + len(b)] += b * rng.uniform(0.4, 1)
    return x


def s_cash():
    """the register: a drawer thunk, the 'ka', the bright 'ching' and the coins"""
    x = np.zeros(int(1.6 * SR))
    ka = filt(noise(0.03), "bp", (1500, 6000)) * np.exp(-tt(0.03) / 0.006) * 0.8
    x[: len(ka)] += ka
    th = np.tanh(2 * np.sin(osc(80 + 60 * np.exp(-tt(0.15) / 0.02), 0.15)) * np.exp(-tt(0.15) / 0.05)) * 0.6
    x[: len(th)] += th
    i = int(0.07 * SR)
    ching = (_bell(2093, 1.2) * 0.6 + _bell(2637, 1.2) * 0.45) * np.minimum(1, tt(1.2) / 0.001)
    x[i : i + len(ching)] += ching * 0.5
    c = s_coins(8, 0.4)
    j = int(0.12 * SR)
    x[j : j + len(c)] += c[: len(x) - j]
    return x


def s_notify():
    d = 0.35
    x = np.zeros(int(d * SR))
    for off, m in ((0, 88), (0.07, 93)):
        b = np.sin(osc(midi(m), 0.2)) * env(0.2, 0.002, 0.06) * 0.35
        i = int(off * SR)
        x[i : i + len(b)] += b
    return x


def s_lock():
    d = 0.5
    t = tt(d)
    clunk = np.tanh(2 * (np.sin(osc(70 + 80 * np.exp(-t / 0.02), d)) * np.exp(-t / 0.08) + filt(noise(d), "bp", (1000, 5000)) * np.exp(-t / 0.015)))
    up = np.sin(osc(midi(76) * 2 ** (t / d), d)) * np.exp(-t / 0.12) * 0.2
    return clunk * 0.6 + up


def s_ping():
    d = 1.6
    x = np.zeros(int(d * SR))
    for i, g in enumerate((1.0, 0.45, 0.2, 0.08)):
        y = np.sin(osc(midi(86), 0.4)) * np.exp(-tt(0.4) / 0.09) * g
        j = int(i * 0.23 * SR)
        x[j : j + len(y)] += y
    return x * 0.4


def s_zip(note):
    d = 0.22
    t = tt(d)
    return np.sin(osc(midi(note) * 2 ** (2 * (t / d)), d)) * np.exp(-t / 0.06) * 0.3 + filt(noise(d), "high", 6000) * np.exp(-t / 0.03) * 0.3


def s_seam(d=1.5):
    n = int(d * SR)
    x = np.zeros(n + SR // 5)
    k = 0.0
    while k < d:
        q = k / d
        i = int(k * SR)
        g = int(rng.integers(40, 160))
        y = np.sign(np.sin(2 * np.pi * rng.uniform(800, 3000 + 6000 * q) * np.arange(g) / SR)) * np.hanning(g)
        x[i : i + g] += y * (0.25 + 0.75 * q) * rng.uniform(0.3, 1)
        k += 0.03 * (1 - 0.85 * q) * rng.uniform(0.5, 1.5)
    x = filt(x, "high", 600)
    x[:n] += sweep(noise(d), "high", 400, 6000, curve=1.2) * np.linspace(0, 1, n) ** 2 * 0.3
    return pan_sweep(x * 0.4, -0.3, 0.3)
