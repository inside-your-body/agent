"""30-second POV test (owner, Oct 2026): second-person story, one signature character, painted scenes changing every ~2.5 s.
Run: python -m agent.pov_sample  -> work/pov/pov_sample.mp4 (+ images, character sheet)."""
import json, shutil, subprocess
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, WORK, save, sh
from . import images, tts, audio

OUT = WORK / 'pov'
FPS = 30

STYLE = ("2D cartoon for an adult animated-documentary YouTube channel: bold clean dark outlines, flat colours with soft cel shading, "
         "richly detailed painted backgrounds, cinematic lighting and depth, warm muted palette with one strong accent colour, "
         "16:9 film still. Not childish, not 3D, no text, no letters, no numbers, no watermark, not gory.")
HERO = ("MAX, the channel's signature character: an adult man drawn with an oversized perfectly round head, small black dot eyes with very "
        "expressive thick eyebrows, a small nose, a messy tuft of dark brown hair, a thin simple body, mustard-yellow hoodie, dark blue jeans, "
        "white sneakers.")

# (narration line, [scene prompts...], headline words or None, sfx at line start)
STORY = [
    ("It's 3 a.m. You wake up with a pain so sharp, it feels like a knife in your side.",
     ["Night bedroom lit by blue moonlight through the window, MAX jolts upright in bed clutching his lower back side, eyes wide in shock, a glowing bedside clock",
      "Extreme close-up of MAX's round face in the dark, gritting his teeth, eyebrows twisted in pain, sweat drops, red pain glow behind him"],
     ['3 A.M.'], 'impact'),
    ("You crawl to the bathroom floor. You can't sit. You can't lie still.",
     ["MAX crawling on a cold tiled bathroom floor at night, one hand on his side, harsh bathroom light",
      "MAX twisting and curling on the bathroom floor, unable to find a position, motion lines, desperate expression"],
     ['NO', 'ESCAPE'], None),
    ("But this didn't start tonight.",
     ["Dramatic freeze: MAX on the floor seen as a glowing x-ray cutaway of his body, one kidney glowing orange inside, dark blue background"],
     ['IT', 'STARTED', 'MONTHS', 'AGO'], 'whoosh'),
    ("Months ago, deep inside your kidney, a few tiny crystals clumped together.",
     ["Inside a human kidney: a glowing pink-red organic cavern with flowing yellow fluid, tiny sharp sparkling crystals drifting and sticking together",
      "Macro view of three tiny jagged golden crystals locking together into one clump, floating in yellow fluid, soft light rays"],
     ['TINY', 'CRYSTALS'], 'sparkle'),
    ("Every glass of water you skipped, they grew. Layer by layer.",
     ["MAX at a cluttered office desk, busy on a laptop, three empty coffee cups, a full glass of water pushed aside and ignored, afternoon light",
      "Cross-section of a growing kidney stone showing rings of layers like a tree trunk, jagged spiky surface, glowing inside the kidney"],
     ['LAYER', 'BY', 'LAYER'], None),
    ("Tonight, that stone broke loose, and slid into a tube thinner than a strand of spaghetti.",
     ["A spiky kidney stone tumbling out of the kidney into the opening of a long narrow fleshy tube, dramatic perspective, wet pink walls",
      "Inside a very narrow pink tube (the ureter), the jagged stone sliding down toward the camera, the walls barely wider than the stone"],
     ['THINNER', 'THAN', 'SPAGHETTI'], 'whoosh'),
    ("Now it's stuck. Your ureter squeezes again and again to push it out, and the trapped urine stretches your kidney.",
     ["The jagged stone wedged tight inside the narrow pink tube, the tube walls clenching around it in waves, red pain glow pulsing",
      "The kidney swelling up like a balloon behind the blocked tube, yellow fluid trapped, stress cracks of red light",
      "MAX doubled over on the bathroom floor gripping his side, red pain lines radiating from his back, eyes squeezed shut"],
     ['STUCK'], 'impact'),
    ("And the only way out... is down.",
     ["Dramatic low angle: MAX on the bathroom floor slowly looking down in dread, the glowing path of the narrow tube drawn down through his body, cliffhanger lighting"],
     ['THE', 'ONLY', 'WAY', 'OUT'], 'riser'),
]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pub = ROOT / 'render/public/pov'
    shutil.rmtree(pub, ignore_errors=True); pub.mkdir(parents=True)
    # 1. character sheet (consistency reference for every scene)
    sheet = OUT / 'max_sheet.png'
    if not sheet.exists():
        images.gen(STYLE + " Character model sheet on a plain light background: " + HERO +
                   " Shown 4 times side by side: front view neutral, three-quarter view worried, side view in pain holding his side, front view shocked.",
                   sheet, size='1536x1024', quality='high')
    # 2. voice
    lines = [s[0] for s in STORY]
    wav = OUT / 'vo.wav'
    segs = tts.synth_lines(lines, wav, groups=[len(lines)])
    save(OUT / 'segs.json', segs)
    # 3. scenes (parallel), each act's images share its line time
    jobs = []
    for li, (_, prompts, _, _) in enumerate(STORY):
        for k, p in enumerate(prompts):
            jobs.append((f's{li}_{k}.png', p))
    def make(job):
        name, p = job
        out = OUT / name
        if out.exists(): return out
        refs = [str(sheet)] if 'MAX' in p else []
        prompt = STYLE + " Scene: " + p + (" " + HERO + " Keep MAX exactly like the character sheet." if refs else '')
        return images.edit(prompt, refs, out, size='1536x1024', quality='medium') if refs else images.gen(prompt, out, size='1536x1024', quality='medium')
    with ThreadPoolExecutor(5) as ex:
        list(ex.map(make, jobs))
    # 4. timeline
    total = segs[-1]['end'] + 0.8
    shots, heads, sfx, mv = [], [], [], 0
    for li, (line, prompts, head, fx) in enumerate(STORY):
        a = segs[li]['start']; b = segs[li + 1]['start'] if li + 1 < len(segs) else total
        n = len(prompts)
        for k in range(n):
            f0 = int((a + (b - a) * k / n) * FPS); f1 = int((a + (b - a) * (k + 1) / n) * FPS)
            name = f's{li}_{k}.png'
            if (OUT / name).exists():
                shutil.copy(OUT / name, pub / name)
                shots.append({'src': f'pov/{name}', 'from': 0 if not shots else f0, 'dur': max(20, f1 - (0 if not shots else f0)), 'move': mv}); mv += 1
        if head: heads.append({'w': head, 'from': int(a * FPS) + 4})
        if fx: sfx.append((a, fx))
    frames = int(total * FPS)
    props = {'shots': shots, 'heads': heads, 'frames': frames}
    save(OUT / 'props.json', props)
    silent = OUT / 'silent.mp4'
    sh(['npx', 'remotion', 'render', 'src/index.ts', 'Pov', str(silent), f'--props={OUT / "props.json"}', '--muted', '--log=warn'], cwd=ROOT / 'render')
    # 5. sound: voice + music bed + a few SFX
    SR = 48000
    vo, vsr = sf.read(wav)
    if vo.ndim > 1: vo = vo.mean(1)
    vo = resample_poly(vo, SR, vsr)
    N = int(frames / FPS * SR)
    v = np.zeros(N); v[:min(N, len(vo))] = vo[:N]
    mus = audio.music(frames / FPS, 'tense')
    fx = np.zeros(N)
    names = {'impact': 'impact2', 'whoosh': 'whoosh1', 'sparkle': 'sparkle', 'riser': 'riser'}
    for t, n in sfx:
        try:
            x, sr = sf.read(ROOT / f'render/public/sfx2/{names[n]}.wav')
            if x.ndim > 1: x = x.mean(1)
            x = resample_poly(x, SR, sr); x = x / max(1e-6, np.abs(x).max())
            audio.place(fx, x, max(0, t - (len(x) / SR if n == 'riser' else 0.15)), 0.22)
        except Exception as e:
            print('sfx', n, e)
    env = np.convolve(np.abs(v), np.ones(int(0.2 * SR)) / int(0.2 * SR), 'same')
    mix = v + mus[:N] * 0.16 * (1 - 0.6 * np.clip(env / 0.04, 0, 1)) + fx * 0.55
    mix /= np.abs(mix).max() / 0.95
    sf.write(OUT / 'mix.wav', np.stack([mix, mix], 1).astype(np.float32), SR)
    sh(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(OUT / 'mix.wav'), '-map', '0:v', '-map', '1:a', '-af', 'loudnorm=I=-14:TP=-1.5',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(OUT / 'pov_sample.mp4')])
    print('done', OUT / 'pov_sample.mp4', len(shots), 'images', round(total, 1), 's')


if __name__ == '__main__':
    main()
