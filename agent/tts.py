"""Fixed narrator voice (locked in config): Kokoro, am_michael 0.55 + am_fenrir 0.45."""
import numpy as np, soundfile as sf, urllib.request, pathlib
from .common import CFG, WORK

V = CFG['voice']
MODEL_DIR = WORK / 'tts_model'

def _model():
    from kokoro_onnx import Kokoro
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    m, v = MODEL_DIR / 'kokoro.onnx', MODEL_DIR / 'voices.bin'
    for url, p in ((V['model_url'], m), (V['voices_url'], v)):
        if not p.exists():
            print('downloading', url); urllib.request.urlretrieve(url, p)
    k = Kokoro(str(m), str(v))
    style = sum(k.get_voice_style(name) * w for name, w in V['blend'].items())
    return k, style

def _trim(a, sr):
    idx = np.where(np.abs(a) > 0.01)[0]
    return a if len(idx) == 0 else a[max(0, idx[0] - int(0.01 * sr)): idx[-1] + int(0.02 * sr)]

def synth_lines(lines, out_wav, gap=0.22, long_gap_after=()):
    """lines: list of sentences. Returns list of {text,start,end} in seconds."""
    k, style = _model()
    sr = 24000; chunks = []; segs = []; t = 0.0
    for i, txt in enumerate(lines):
        a, sr = k.create(txt, voice=style, speed=V['speed'], lang='en-us')
        a = _trim(np.asarray(a, np.float32), sr)
        segs.append({'i': i, 'text': txt, 'start': t, 'end': t + len(a) / sr})
        chunks.append(a); t += len(a) / sr
        if i < len(lines) - 1:
            g = 0.45 if i in long_gap_after else gap
            chunks.append(np.zeros(int(g * sr), np.float32)); t += g
    y = np.concatenate(chunks); y = y / max(1e-6, np.abs(y).max()) * 0.95
    sf.write(out_wav, y, sr)
    return segs
