"""60 s sample of the new 'timeline inside the body' format (no AI images): voice + code-drawn visuals + SFX + light music."""
import json
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from .common import ROOT, WORK, sh
from . import tts, audio

OUT = WORK / 'pov'
FPS = 30
LINES = [
    "What happens to your body if sugar disappears from your life? Not for a day. Completely.",
    "Day one. Your blood sugar stops spiking, and your pancreas finally gets a break from pumping out insulin.",
    "Day three is the hard part. Cravings, headaches, a bad mood. Your brain is missing its daily reward.",
    "By day ten, something surprising happens. In one study, fat inside the liver started shrinking in about ten days.",
    "Week three. Your taste buds reset, and an ordinary apple starts to taste almost like candy.",
    "One month in, the afternoon energy crash is gone. Your energy stays steady all day.",
    "But what happens after one full year is the most surprising part.",
]
# per line: (offset seconds, sound)
SFX = [[(0.0, 'riser'), (0.3, 'pop1'), (0.5, 'pop2'), (0.7, 'pop3'), (2.4, 'impact2')],
       [(0.0, 'whoosh1'), (0.15, 'tick'), (1.6, 'bubble')],
       [(0.0, 'whoosh2'), (0.15, 'tick'), (1.2, 'heartbeat')],
       [(0.0, 'whoosh3'), (0.15, 'tick'), (1.6, 'goo')],
       [(0.0, 'whoosh1'), (0.15, 'tick'), (1.8, 'sparkle')],
       [(0.0, 'whoosh2'), (0.15, 'tick'), (1.0, 'shield')],
       [(0.0, 'boom'), (0.4, 'reveal')]]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / 'tl_vo.wav'
    segs = tts.synth_lines(LINES, wav, groups=[len(LINES)])
    total = segs[-1]['end'] + 1.2
    frames = int(total * FPS)
    seg = [int(s['start'] * FPS) for s in segs]
    (OUT / 'tl_props.json').write_text(json.dumps({'seg': seg, 'frames': frames}))
    silent = OUT / 'tl_silent.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', 'SugarTimeline', str(silent), f'--props={OUT / "tl_props.json"}', '--muted', '--log=warn'], cwd=ROOT / 'render')
    SR = 48000
    vo, vsr = sf.read(wav)
    if vo.ndim > 1: vo = vo.mean(1)
    vo = resample_poly(vo, SR, vsr); N = int(frames / FPS * SR)
    v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
    mus = audio.music(frames / FPS, 'light'); fx = np.zeros(N)
    for s, cues in zip(segs, SFX):
        for off, n in cues:
            try:
                x, sr = sf.read(ROOT / f'render/public/sfx2/{n}.wav')
                if x.ndim > 1: x = x.mean(1)
                x = resample_poly(x, SR, sr); x = x / max(1e-6, np.abs(x).max())
                t = s['start'] + off - (len(x) / SR if n == 'riser' else 0)
                audio.place(fx, x, max(0, t), 0.25 if n in ('tick', 'pop1', 'pop2', 'pop3') else 0.4)
            except Exception as e: print('sfx', n, e)
    env = np.convolve(np.abs(v), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
    mix = v + mus[:N] * 0.16 * (1 - 0.6 * np.clip(env / 0.04, 0, 1)) + fx * 0.45
    mix /= np.abs(mix).max() / 0.95
    sf.write(OUT / 'tl_mix.wav', np.stack([mix, mix], 1).astype(np.float32), SR)
    sh(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(OUT / 'tl_mix.wav'), '-map', '0:v', '-map', '1:a', '-af', 'loudnorm=I=-14:TP=-1.5',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(OUT / 'sugar_timeline.mp4')])
    print('done', round(total, 1), 's', seg)


if __name__ == '__main__':
    main()
