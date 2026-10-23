"""30-second POV test, FLAT version (owner's pick): MAX cut-outs on one flat background colour per beat, no camera zoom,
kinetic typography carries the words. Cut-outs are reusable (a growing pose library = cheaper videos).
Run: python -m agent.pov_flat  -> work/pov/pov_flat.mp4"""
import shutil
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, WORK, save, sh
from . import images, tts, audio

OUT = WORK / 'pov'
FPS = 30
SHEET = ROOT / 'assets/cast/max_sheet.png'
LOOK = ("Simple flat 2D cartoon exactly in the style of the reference character sheet: thick clean dark outlines, flat colours, minimal shading. "
        "Fully transparent background: no backdrop, no floor, no shadow, no frame, no text.")
MAX = ("MAX from the reference sheet (oversized round head, dot eyes, thick expressive eyebrows, messy dark-brown hair, mustard-yellow hoodie, "
       "dark jeans, white sneakers) — keep him EXACTLY the same. ")
POSES = {
    'max_shock_side': "MAX full body, jolting in shock, both hands clutching his lower side, mouth wide open in pain, sweat drops.",
    'max_floor': "MAX full body kneeling and curled on the floor holding his side, eyes squeezed shut in pain.",
    'max_think': "MAX full body standing, one hand on his chin, eyebrows raised, remembering something.",
    'max_laptop': "MAX sitting on an office chair typing on a laptop on a small desk, a full glass of water pushed aside and ignored, two coffee cups.",
    'max_dread': "MAX full body standing, looking down at his own belly in dread, sweating, hands raised slightly.",
}
PROPS = {
    'kidney': "A simple cartoon human kidney organ (bean shape, deep pink-red, a small tube coming out at the inner side), side view.",
    'crystals': "Three tiny sharp golden crystals stuck together into one small clump, sparkling.",
    'stone': "A jagged spiky golden-brown kidney stone, rough crystal texture, no face.",
}
NIGHT, CREAM, SAND, PINK, BLUE = '#1F2A44', '#F2E1C3', '#E8D5B5', '#F7D9D0', '#DDEBF2'

STORY = [  # line, beat builder
    ("It's 3 a.m. A pain like a knife stabs your side.",
     lambda: dict(bg=NIGHT, ink='#FFFFFF', items=[it('max_shock_side', 560, 860, 'pop', shake=5)], words=['3 A.M.', '|', 'LIKE', 'A', '*KNIFE'])),
    ("You can't sit. You can't lie still.",
     lambda: dict(bg=CREAM, items=[it('max_floor', 560, 640, 'up', shake=4)], words=["CAN'T", 'SIT.', '|', "CAN'T", 'LIE', '*STILL.'])),
    ("But this started months ago.",
     lambda: dict(bg=SAND, calendar=True, side='center', items=[it('max_think', 1500, 720, 'right')], words=['IT', 'STARTED', '*MONTHS', '*AGO'])),
    ("Inside your kidney, tiny crystals stuck together.",
     lambda: dict(bg=PINK, items=[it('kidney', 560, 640, 'pop'), it('crystals', 760, 200, 'pop', at=25, y=560)], words=['TINY', '*CRYSTALS'])),
    ("Every glass of water you skipped, they grew.",
     lambda: dict(bg=BLUE, side='center', items=[it('max_laptop', 560, 720, 'left'), it('stone', 1450, 380, 'pop', at=20, grow=[0.35, 1.25], y=520)],
                  words=['*SKIPPED', 'WATER', '|', 'IT', '*GREW'])),
    ("Tonight, the stone broke loose, into a tube thinner than spaghetti.",
     lambda: dict(bg=CREAM, tube=True, side='center', items=[it('stone', 300, 200, 'pop', slide=[0, 900], y=440)],
                  words=['THINNER', 'THAN', '*SPAGHETTI'])),
    ("Now it's stuck.",
     lambda: dict(bg=PINK, tube=True, side='center', items=[it('stone', 1150, 240, 'drop', shake=7, y=420)], words=['*STUCK.'])),
    ("And the only way out... is down.",
     lambda: dict(bg=NIGHT, ink='#FFFFFF', items=[it('max_dread', 560, 860, 'pop')], words=['THE', 'ONLY', 'WAY', 'OUT…', '|', 'IS', '*DOWN.'])),
]


def it(name, x, h, enter, at=0, y=None, **kw):
    return dict(src=f'pov/{name}.png', x=x, h=h, y=(1080 - h - 50) if y is None else y, enter=enter, at=at, **kw)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pub = ROOT / 'render/public/pov'; shutil.rmtree(pub, ignore_errors=True); pub.mkdir(parents=True)
    jobs = [(k, LOOK + ' ' + MAX + v, True) for k, v in POSES.items()] + [(k, LOOK + ' Object: ' + v, False) for k, v in PROPS.items()]
    def make(j):
        name, prompt, ref = j
        out = OUT / f'{name}.png'
        if not out.exists():
            images.edit(prompt, [str(SHEET)], out, size='1024x1024', transparent=True, quality='medium')
        if out.exists(): shutil.copy(out, pub / out.name)
    with ThreadPoolExecutor(5) as ex: list(ex.map(make, jobs))
    lines = [s[0] for s in STORY]
    wav = OUT / 'vo_flat.wav'
    segs = tts.synth_lines(lines, wav, groups=[len(lines)])
    total = segs[-1]['end'] + 0.9
    beats, sfx = [], []
    for li, (_, build) in enumerate(STORY):
        a = segs[li]['start']; b = segs[li + 1]['start'] if li + 1 < len(segs) else total
        f0 = 0 if li == 0 else int(a * FPS); f1 = int(b * FPS)
        d = build()
        span = max(1, (f1 - f0) - 18)
        toks = [w for w in d['words']]
        n = max(1, len([t for t in toks if t != '|']))
        words, k = [], 0
        for t in toks:
            if t == '|': continue
            words.append({'t': t.lstrip('*'), 'at': 6 + int(span * k / n), 'accent': t.startswith('*')}); k += 1
        for x in d['items']:
            if not (pub / x['src'].split('/')[1]).exists(): x['src'] = None
        d['items'] = [x for x in d['items'] if x['src']]
        beats.append({'from': f0, 'dur': f1 - f0, 'bg': d['bg'], 'ink': d.get('ink'), 'items': d['items'], 'words': words,
                      'side': d.get('side', 'right'), 'tube': d.get('tube', False), 'calendar': d.get('calendar', False)})
        sfx.append((a, ['impact2', 'pop1', 'whoosh1', 'sparkle', 'pop3', 'whoosh2', 'impact3', 'riser'][li]))
    frames = int(total * FPS)
    save(OUT / 'flat_props.json', {'beats': beats, 'frames': frames})
    silent = OUT / 'flat_silent.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', 'PovFlat', str(silent), f'--props={OUT / "flat_props.json"}', '--muted', '--log=warn'], cwd=ROOT / 'render')
    SR = 48000
    vo, vsr = sf.read(wav)
    if vo.ndim > 1: vo = vo.mean(1)
    vo = resample_poly(vo, SR, vsr); N = int(frames / FPS * SR)
    v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
    mus = audio.music(frames / FPS, 'tense'); fx = np.zeros(N)
    for t, n in sfx:
        try:
            x, sr = sf.read(ROOT / f'render/public/sfx2/{n}.wav')
            if x.ndim > 1: x = x.mean(1)
            x = resample_poly(x, SR, sr); x = x / max(1e-6, np.abs(x).max())
            audio.place(fx, x, max(0, t - (len(x) / SR if n == 'riser' else 0.1)), 0.2)
        except Exception as e: print('sfx', n, e)
    env = np.convolve(np.abs(v), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
    mix = v + mus[:N] * 0.15 * (1 - 0.6 * np.clip(env / 0.04, 0, 1)) + fx * 0.5
    mix /= np.abs(mix).max() / 0.95
    sf.write(OUT / 'flat_mix.wav', np.stack([mix, mix], 1).astype(np.float32), SR)
    sh(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(OUT / 'flat_mix.wav'), '-map', '0:v', '-map', '1:a', '-af', 'loudnorm=I=-14:TP=-1.5',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(OUT / 'pov_flat.mp4')])
    print('done', round(total, 1), 's')


if __name__ == '__main__':
    main()
