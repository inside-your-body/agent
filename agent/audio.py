"""Generated music bed (mood per style) + sparse SFX on beats + narration, ducked and loudness-normalised, muxed onto video."""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
from .common import ROOT, CFG, load, sh

SR = 48000
SFX = ROOT / 'render/public/sfx'
rng = np.random.default_rng(11)

MOODS = {  # bpm, kick, hats, bass, arp, pad, timbre
    'warm':   dict(bpm=92,  kick=0.5, hats=0.10, bass=0.25, arp=0.10, pad=0.10, timbre='rhodes', key=50),
    'synth':  dict(bpm=124, kick=0.9, hats=0.25, bass=0.35, arp=0.07, pad=0.06, timbre='square', key=45),
    'light':  dict(bpm=104, kick=0.35, hats=0.12, bass=0.20, arp=0.10, pad=0.08, timbre='pluck', key=48),
    'upbeat': dict(bpm=128, kick=0.95, hats=0.28, bass=0.35, arp=0.08, pad=0.05, timbre='square', key=52),
    'dreamy': dict(bpm=84,  kick=0.25, hats=0.06, bass=0.20, arp=0.09, pad=0.16, timbre='rhodes', key=47),
    'piano':  dict(bpm=80,  kick=0.0,  hats=0.0,  bass=0.18, arp=0.12, pad=0.10, timbre='piano', key=50),
    'bouncy': dict(bpm=112, kick=0.6,  hats=0.18, bass=0.28, arp=0.11, pad=0.05, timbre='marimba', key=53),
    'tense':  dict(bpm=100, kick=0.7,  hats=0.15, bass=0.38, arp=0.06, pad=0.10, timbre='square', key=45),
}
PROG = [[0, 7, 12, 16, 19], [-3, 4, 9, 12, 16], [-7, 0, 5, 9, 12], [-5, 2, 7, 11, 14]]  # I vi IV V (semitones from key)

T = lambda n: np.arange(n) / SR
nf = lambda m: 440 * 2 ** ((m - 69) / 12)
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'bp', fs=SR, output='sos'), x)
lp = lambda x, f: sosfilt(butter(2, f, 'lp', fs=SR, output='sos'), x)
hp = lambda x, f: sosfilt(butter(2, f, 'hp', fs=SR, output='sos'), x)

def place(buf, x, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf): buf[i:j] += x[:j - i] * g

def note(f, dur, timbre):
    n = int(dur * SR); t = T(n); att = np.minimum(1, t / 0.004)
    if timbre == 'rhodes':
        x = np.sin(2 * np.pi * f * t + 2 * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.6)
    elif timbre == 'square':
        x = np.tanh(3 * np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.18)
    elif timbre == 'marimba':
        x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)) * np.exp(-t / 0.22)
    elif timbre == 'piano':
        x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.5 for k in (1, 2, 3, 4)) * np.exp(-t / 0.9)
    else:  # pluck
        x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.15)
    return x * att

def music(dur, mood, calm_ranges=()):
    m = MOODS.get(mood, MOODS['warm'])
    N = int(dur * SR); out = np.zeros(N); pad = np.zeros(N)
    beat = 60 / m['bpm']; bar = beat * 4
    kn = int(0.3 * SR); tk = T(kn)
    kick = np.sin(2 * np.pi * np.cumsum(48 + 80 * np.exp(-tk / 0.03)) / SR) * np.exp(-tk / 0.12)
    hn = int(0.05 * SR); hat = hp(rng.standard_normal(hn), 7000) * np.exp(-T(hn) / 0.012)
    for b in range(int(dur / beat) + 1):
        t0 = b * beat
        calm = any(a <= t0 < c for a, c in calm_ranges)
        g = 0.35 if calm else 1.0
        ch = PROG[(b // 8) % 4]
        if m['kick'] and b % 2 == 0: place(out, kick, t0, m['kick'] * g * 0.6)
        if m['hats']:
            for h in (0.5,): place(out, hat, t0 + h * beat, m['hats'] * g)
        if m['bass'] and b % 2 == 0: place(out, note(nf(m['key'] + ch[0] - 12), beat * 1.6, 'pluck'), t0, m['bass'] * g)
        for q in range(2):
            place(out, note(nf(m['key'] + 12 + ch[(b * 2 + q) % 5]), beat * 1.2, m['timbre']), t0 + q * beat / 2, m['arp'] * g)
    for i in range(int(dur / bar) + 1):
        ch = PROG[(i // 2) % 4]; n = int(bar * 2 * SR); t = T(n)
        x = sum(np.sin(2 * np.pi * nf(m['key'] + 12 + c) * t) for c in ch[1:4]) / 3
        x *= np.minimum(1, np.minimum(t / 0.8, (bar * 2 - t) / 0.8))
        place(pad, lp(x, 1500), i * bar * 2, m['pad'])
    x = hp(out + pad, 35)
    ir_n = int(1.5 * SR); ir = rng.standard_normal(ir_n) * np.exp(-T(ir_n) / 0.4); ir = lp(ir, 5000); ir /= np.abs(ir).sum() ** 0.5 * 10
    x = x * 0.8 + fftconvolve(x, ir)[:N] * 0.25
    fade = int(1.5 * SR); x[-fade:] *= np.linspace(1, 0, fade)
    return x / (np.abs(x).max() + 1e-9)

def _load(name):
    x, sr = sf.read(SFX / name)
    if x.ndim > 1: x = x.mean(1)
    return resample_poly(x, SR, sr) if sr != SR else x

def finish(video, ep_dir, kind, style):
    p = load(ep_dir / f'props_{kind}.json')
    dur = p['frames'] / p['fps']
    N = int(dur * SR)
    vo, vsr = sf.read(ep_dir / f'vo_{kind}.wav')
    if vo.ndim > 1: vo = vo.mean(1)
    vo = resample_poly(vo, SR, vsr) if vsr != SR else vo
    v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
    mus = music(dur, style.get('music', 'warm'))
    fx = np.zeros(N)
    whoosh, pop, ding, impact = _load('whoosh.wav'), _load('pop.wav'), _load('ding.wav'), _load('impact.wav')
    last = -9
    for i, b in enumerate(p['beats']):
        t = b['from'] / p['fps']
        if i == 0: place(fx, impact, 0, 0.5); continue
        if t - last < (1.5 if kind == 'short' else 5):   # sparse
            continue
        place(fx, whoosh, max(0, t - 0.25), 0.25); last = t
        if b['kind'] == 'counter': place(fx, ding, t + 1.4, 0.18)
        if b['kind'] in ('checklist', 'timeline'): place(fx, pop, t + 0.3, 0.3)
        if b['kind'] == 'endcard': place(fx, pop, t + 1.5, 0.5)
    env = np.convolve(np.abs(v), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
    duck = 1 - 0.6 * np.clip(env / 0.04, 0, 1)
    mix = v * 1.0 + mus * (0.16 if kind == 'long' else 0.22) * duck + fx * 0.5
    mix /= np.abs(mix).max() / 0.95
    wav = ep_dir / f'mix_{kind}.wav'
    sf.write(wav, np.stack([mix, mix], 1).astype(np.float32), SR)
    out = ep_dir / f'final_{kind}.mp4'
    lufs = CFG['audio']['target_lufs']
    sh(['ffmpeg', '-v', 'error', '-y', '-i', str(video), '-i', str(wav), '-map', '0:v', '-map', '1:a',
        '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-shortest', '-movflags', '+faststart', str(out)])
    return out
