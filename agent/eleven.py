"""Persian narrator (owner, Nov 2026): ElevenLabs, voice "Aran - Parsi", model Eleven v4, the owner's site settings, always a bit faster
(1.2x). Text is sent in chunks of a few sentences (same scene) with the neighbouring text for natural flow; the character timestamps of
each chunk give every sentence's start/end, so pictures change exactly on the words."""
import base64, os, subprocess, tempfile, time, json, pathlib
import numpy as np, soundfile as sf, requests
from .common import ROOT, load

VC = load(ROOT / 'config/voice.json')
API = 'https://api.elevenlabs.io/v1/text-to-speech/{}/with-timestamps?output_format=mp3_44100_128'
SR = 44100
SPEED = 1.2
_state = {'native_speed': True, 'chars': 0}


def _post(text, prev='', nxt=''):
    vs = dict(VC.get('voice_settings', {}))
    if _state['native_speed']: vs['speed'] = SPEED
    body = {'text': text, 'model_id': VC.get('model_id', 'eleven_v4'), 'voice_settings': vs}
    if prev: body['previous_text'] = prev[-300:]
    if nxt: body['next_text'] = nxt[:300]
    for a in range(5):
        r = requests.post(API.format(VC['voice_id']), json=body, timeout=300,
                          headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json'})
        if r.status_code == 200:
            _state['chars'] += len(text)
            return r.json()
        msg = r.text[:400]
        print('elevenlabs', r.status_code, msg)
        if r.status_code in (400, 422) and 'speed' in msg and _state['native_speed']:
            _state['native_speed'] = False; body['voice_settings'].pop('speed', None); continue
        if r.status_code in (400, 422) and ('previous_text' in msg or 'next_text' in msg):
            body.pop('previous_text', None); body.pop('next_text', None); continue
        if r.status_code == 401 or 'quota' in msg.lower() or 'credits' in msg.lower():
            raise RuntimeError('ElevenLabs: no credits / key problem: ' + msg)
        time.sleep(10 * (a + 1))
    raise RuntimeError('ElevenLabs failed: ' + msg)


def _decode(b64):
    with tempfile.TemporaryDirectory() as d:
        mp3, wav = pathlib.Path(d) / 'a.mp3', pathlib.Path(d) / 'a.wav'
        mp3.write_bytes(base64.b64decode(b64))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', str(SR), str(wav)], check=True)
        a, _ = sf.read(wav, dtype='float32')
    return a


def _chunks(lines, groups, max_chars=420):
    """Consecutive lines of the same scene, up to ~max_chars per request."""
    scene_of = [g for g, n in enumerate(groups) for _ in range(n)]
    out, cur = [], []
    for i, ln in enumerate(lines):
        if cur and (scene_of[i] != scene_of[cur[-1]] or sum(len(lines[j]) + 1 for j in cur) + len(ln) > max_chars):
            out.append(cur); cur = []
        cur.append(i)
    if cur: out.append(cur)
    return out, scene_of


def synth(lines, out_wav, groups=None, gap=0.12, scene_gap=0.45):
    """lines: TTS texts (diacritics where needed). Returns segs [{i, text, start, end}] in seconds of out_wav (already 1.2x)."""
    groups = groups or [len(lines)]
    chunks, scene_of = _chunks(lines, groups)
    audio, segs, t = [], [None] * len(lines), 0.0
    for c, idx in enumerate(chunks):
        text = ' '.join(lines[i] for i in idx)
        prev = ' '.join(lines[i] for i in chunks[c - 1]) if c else ''
        nxt = ' '.join(lines[i] for i in chunks[c + 1]) if c + 1 < len(chunks) else ''
        j = _post(text, prev, nxt)
        a = _decode(j['audio_base64'])
        al = j.get('alignment') or j.get('normalized_alignment') or {}
        starts, ends = al.get('character_start_times_seconds') or [], al.get('character_end_times_seconds') or []
        dur = len(a) / SR
        # trim the silence the model leaves at the end of the chunk (keeps pacing tight)
        last = (ends[-1] if ends else dur)
        a = a[:min(len(a), int((last + 0.08) * SR))]
        pos = 0
        for k, i in enumerate(idx):
            s_char = pos; e_char = pos + len(lines[i]) - 1; pos += len(lines[i]) + 1
            st = starts[min(s_char, len(starts) - 1)] if starts else dur * k / len(idx)
            en = ends[min(e_char, len(ends) - 1)] if ends else dur * (k + 1) / len(idx)
            segs[i] = {'i': i, 'text': lines[i], 'start': round(t + st, 3), 'end': round(t + en, 3)}
        audio.append(a); t += len(a) / SR
        if c + 1 < len(chunks):
            g = scene_gap if scene_of[chunks[c + 1][0]] != scene_of[idx[-1]] else gap
            audio.append(np.zeros(int(g * SR), np.float32)); t += g
        print(f'  voice chunk {c + 1}/{len(chunks)}: {len(text)} chars, {len(a) / SR:.1f}s', flush=True)
    y = np.concatenate(audio)
    if not _state['native_speed']:      # the API refused 'speed' -> speed the finished voice up with ffmpeg (pitch kept)
        with tempfile.TemporaryDirectory() as d:
            src, dst = pathlib.Path(d) / 's.wav', pathlib.Path(d) / 'd.wav'
            sf.write(src, y, SR)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', f'atempo={SPEED}', str(dst)], check=True)
            y, _ = sf.read(dst, dtype='float32')
        for s in segs: s['start'] = round(s['start'] / SPEED, 3); s['end'] = round(s['end'] / SPEED, 3)
    y = y / max(1e-6, np.abs(y).max()) * 0.95
    sf.write(out_wav, y, SR)
    return segs


def to_mp3(wav, mp3):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '160k', str(mp3)], check=True)


def from_mp3(mp3, wav):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp3), '-ac', '1', '-ar', str(SR), str(wav)], check=True)
