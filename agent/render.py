"""Turn episode JSON + voice timings into Remotion props and render the video (silent; audio is muxed later)."""
import json, os
from .common import ROOT, CFG, load, save, sh
from . import assets

FPS = 30
MIN_BEAT = 1.1   # seconds
import re as _re
_n = lambda w: _re.sub(r'[^a-z0-9%]', '', str(w).lower())

def _cue_time(words, word, t0, t1):
    if not word: return None
    alts = [_n(a) for a in str(word).split('|') if _n(a)]
    for w in words:
        if t0 - 0.05 <= w['s'] < t1 and any(_n(w['w']).startswith(a) or a.startswith(_n(w['w'])) and len(_n(w['w'])) > 3 for a in alts):
            return w['s']
    return None

def _beats_from(scenes, segs, total_s, words, end_card=None):
    """scenes: [{narration:[...], beats:[{at, cue,...}]}]; segs: sentence timings in order; words: whisper words."""
    out, si = [], 0
    for sc in scenes:
        n = len(sc['narration'])
        bs = sorted(sc.get('beats') or [], key=lambda b: b.get('at', 0))
        if not bs or bs[0].get('at', 0) != 0:
            bs = [{'at': 0, 'kind': 'slam', 'params': {'words': (sc.get('title') or '').split()[:3]}}] + bs
        for b in bs:
            at = min(max(int(b.get('at', 0)), 0), n - 1)
            st, en = segs[si + at]['start'], segs[si + at]['end']
            t = _cue_time(words, b.get('cue'), st, en) if b.get('cue') else None
            t = st if t is None else t
            out.append({**b, 'from_s': max(0.0, t - (0.12 if t > 0.3 else 0))})
        si += n
    out.sort(key=lambda b: b['from_s'])
    merged = []
    for b in out:
        if merged and b['from_s'] - merged[-1]['from_s'] < MIN_BEAT:
            continue
        merged.append(b)
    for i, b in enumerate(merged):
        b['to_s'] = merged[i + 1]['from_s'] if i + 1 < len(merged) else total_s
    if end_card:
        merged[-1]['to_s'] = total_s - end_card['dur']
        merged.append({'kind': 'endcard', 'text': end_card['text'], 'value': end_card.get('value'), 'from_s': total_s - end_card['dur'], 'to_s': total_s})
    beats = []
    for b in merged:
        f0, f1 = int(round(b['from_s'] * FPS)), int(round(b['to_s'] * FPS))
        bw = [[w['w'], int(round(w['s'] * FPS)) - f0] for w in words if b['from_s'] - 0.05 <= w['s'] < b['to_s']]
        beats.append({'from': f0, 'to': f1, 'kind': b.get('kind', 'slam'),
                      'text': b.get('text'), 'value': b.get('value'), 'items': b.get('items'), 'img': b.get('img'), 'part': b.get('part'),
                      'motion': b.get('motion'), 'cast': b.get('cast'), 'params': b.get('params') or {}, 'words': bw, 'sfx': b.get('sfx')})
    return beats

def props(ep, style, ep_dir, kind):
    segs = load(ep_dir / f'segs_{kind}.json')
    words = load(ep_dir / f'words_{kind}.json', [])
    vo_end = segs[-1]['end']
    if kind == 'long':
        total = vo_end + 7.0          # end card
        beats = _beats_from(ep['scenes'], segs, total, words, end_card={'dur': 6.0, 'text': 'Thanks for watching', 'value': 'New video every 2 days'})
    else:
        total = vo_end + 0.4
        beats = _beats_from([{'narration': ep['short']['narration'], 'beats': ep['short'].get('beats', []), 'title': ep['title']}], segs, total, words)
    p = {'kind': kind, 'fps': FPS, 'frames': int(round(total * FPS)), 'theme': style, 'beats': beats,
         'words': words if kind == 'short' else [], 'channel': CFG['channel']['name'], 'title': ep['title']}
    save(ep_dir / f'props_{kind}.json', p)
    return p, total

def render(ep, style, ep_dir, kind='long'):
    assets.stage_for_render(ep_dir)
    p, total = props(ep, style, ep_dir, kind)
    out = ep_dir / f'silent_{kind}.mp4'
    if out.exists():
        return out
    comp = 'Long' if kind == 'long' else 'Short'
    conc = os.environ.get('RENDER_CONCURRENCY', str(max(1, (os.cpu_count() or 2))))
    browser = os.environ.get('REMOTION_BROWSER')
    cmd = ['npx', 'remotion', 'render', 'src/index.ts', comp, str(out), f'--props={ep_dir / f"props_{kind}.json"}',
           f'--concurrency={conc}', '--muted', '--log=warn']
    if browser: cmd.append(f'--browser-executable={browser}')
    sh(cmd, cwd=ROOT / 'render')
    return out
