"""60 s sample of the PICTURE format (owner, Oct 31): a new picture every 3-5 s — people/everyday scenes as black-and-white ink
sketches with one red accent, inside-the-body scenes as simple flat 2D — plus kinetic typography, number badges, time-stamp
badges, transitions and matching sound effects. No timeline bar, no hologram figure.   python -m agent.picsample"""
import json
from concurrent.futures import ThreadPoolExecutor
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from .common import ROOT, WORK, load, save, sh
from . import llm, tts, images, audio

OUT = WORK / 'pics'
FPS = 30
INK = ("Black-and-white ink and pencil sketch illustration, hand-drawn hatching, documentary notebook look, ONE single red accent "
       "colour only on the key element, off-white paper background, clean uncluttered composition, main subject in the centre-right, "
       "nothing important in the bottom quarter, no text, no letters")
FLAT = ("Simple modern flat 2D vector illustration for an adult science explainer (not childish), very few clean shapes, limited "
        "palette: deep navy background, teal, warm yellow and coral, no gradients clutter, clean uncluttered composition, main subject "
        "centred, nothing important in the bottom quarter, no text, no letters")
CAST = "the recurring character: a woman in her early 30s, dark hair in a loose bun, navy sweater"


def group(lines, min_words=9, max_words=20):
    out, cur = [], []
    for ln in lines:
        cur.append(ln)
        if sum(len(x.split()) for x in cur) >= min_words: out.append(cur); cur = []
    if cur:
        if out and sum(len(x.split()) for x in out[-1] + cur) <= max_words: out[-1] += cur
        else: out.append(cur)
    return out


def plan(beats, title):
    return llm.ask_json(f"""You are the motion-graphics director of a premium YouTube science explainer: "{title}".
Every beat below gets ONE full-screen picture plus motion-graphics typography on top. Picture styles:
- "ink": everyday life, people, objects, places (black-and-white ink sketch, one red accent) — {CAST} appears whenever a person is needed.
- "flat": anything INSIDE the body (organs, blood, cells, molecules) as simple flat 2D.
For each beat return:
- "style": "ink" | "flat"
- "picture": one clear visual idea that literally shows what is said (describe composition, the red accent / colours), different from the previous picture
- "words": 2-4 key words to animate on screen (from the sentence, punchy)
- "accent": index of the word to highlight in yellow
- "stat": a big number badge if the beat has a number, e.g. {{"value": "9", "unit": "DAYS"}}, else null
- "sfx": one of whoosh, pop, ding, tick, heartbeat, bubble, impact, sparkle, reveal, bong (what fits the moment)
Beats: {json.dumps({i: ' '.join(b) for i, b in enumerate(beats)}, ensure_ascii=False)}
Return JSON {{"beats": [{{"i": int, "style": str, "picture": str, "words": [str], "accent": int, "stat": object|null, "sfx": str}}]}}""",
                        max_tokens=6000)


SFX_FILE = {'whoosh': 'whoosh1', 'pop': 'pop2', 'ding': 'sparkle', 'tick': 'tick', 'heartbeat': 'heartbeat', 'bubble': 'bubble',
            'impact': 'impact2', 'sparkle': 'sparkle', 'reveal': 'reveal', 'bong': 'bong'}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pub = ROOT / 'render/public/pics'; pub.mkdir(parents=True, exist_ok=True)
    ep = load(ROOT / 'tests/sugar_episode.json')
    lines = [(s.get('stage'), l['text'] if isinstance(l, dict) else l) for s in ep['scenes'] for l in s['lines']][:24]
    stage_of = {t: st for st, t in lines}
    beats = group([t for _, t in lines])
    p = load(OUT / 'plan.json') or plan(beats, ep['upload']['title']); save(OUT / 'plan.json', p)
    pb = {b['i']: b for b in p.get('beats', [])}

    def draw(i):
        b = pb.get(i, {}); f = OUT / f'p{i:02d}.png'
        if not f.exists():
            st = FLAT if b.get('style') == 'flat' else INK
            images.gen(f"{b.get('picture') or ' '.join(beats[i])}. {st}.", f, size='1536x1024', quality='low')
        return f
    with ThreadPoolExecutor(6) as ex: files = list(ex.map(draw, range(len(beats))))
    wav = OUT / 'vo.wav'
    segs = tts.synth_lines([' '.join(b) for b in beats], wav, groups=[len(beats)])
    out_beats = []
    for i, (b, sg) in enumerate(zip(beats, segs)):
        x = pb.get(i, {})
        if files[i].exists(): sh(['cp', str(files[i]), str(pub / files[i].name)])
        out_beats.append({'start': 0 if i == 0 else int(sg['start'] * FPS), 'img': f'pics/{files[i].name}' if files[i].exists() else None,
                          'style': x.get('style', 'ink'), 'words': x.get('words') or b[0].split()[:3], 'accent': x.get('accent', -1),
                          'stat': x.get('stat'), 'stage': stage_of.get(b[0]), 'sfx': x.get('sfx', 'pop')})
    total = int((segs[-1]['end'] + 1.2) * FPS)
    for k, b in enumerate(out_beats): b['end'] = out_beats[k + 1]['start'] if k + 1 < len(out_beats) else total
    props = {'beats': out_beats, 'frames': total}; save(OUT / 'props.json', props)
    silent = OUT / 'silent.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', 'PicEpisode', str(silent), f'--props={OUT / "props.json"}', '--muted', '--log=warn'], cwd=ROOT / 'render')
    # sound: voice + music (ducked) + one matching effect per picture change
    SR = 48000; N = int(total / FPS * SR)
    vo, vsr = sf.read(wav); vo = vo.mean(1) if vo.ndim > 1 else vo
    vo = resample_poly(vo, SR, vsr); v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
    mus = audio.library_music(total / FPS, audio.pick_track())[:N]; fx = np.zeros(N)
    for k, b in enumerate(out_beats):
        for name, off, g in (('whoosh2' if k % 2 else 'whoosh3', -0.12, 0.22), (SFX_FILE.get(b['sfx'], 'pop1'), 0.35, 0.3)):
            try:
                x, sr = sf.read(ROOT / f'render/public/sfx2/{name}.wav'); x = x.mean(1) if x.ndim > 1 else x
                x = resample_poly(x, SR, sr); x = x / max(1e-6, np.abs(x).max())
                audio.place(fx, x, max(0, b['start'] / FPS + off), g)
            except Exception as e: print('sfx', name, e)
    env = np.convolve(np.abs(v), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same')
    m = v + mus * 0.13 * (1 - 0.55 * np.clip(env / 0.04, 0, 1)) + fx * 0.5
    m /= np.abs(m).max() / 0.95
    sf.write(OUT / 'mix.wav', np.stack([m, m], 1).astype(np.float32), SR)
    sh(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(OUT / 'mix.wav'), '-map', '0:v', '-map', '1:a', '-af', 'loudnorm=I=-14:TP=-1.5',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(OUT / 'pic_sample.mp4')])
    print('done', len(out_beats), 'pictures', round(total / FPS, 1), 's')


if __name__ == '__main__':
    main()
