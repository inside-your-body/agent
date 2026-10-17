"""Turn episode JSON + voice timings into Remotion props and render the video (silent; audio is muxed later)."""
import json, os
from .common import ROOT, CFG, load, save, sh
from . import assets

FPS = 30
MIN_BEAT = 0.7   # seconds

def _beats_from(scenes, segs, total_s, end_card=None):
    """scenes: [{narration:[...], beats:[{at,...}]}]; segs: sentence timings in order."""
    out, si = [], 0
    for sc in scenes:
        n = len(sc['narration'])
        starts = [segs[si + i]['start'] for i in range(n)]
        bs = sorted(sc.get('beats') or [], key=lambda b: b.get('at', 0))
        if not bs or bs[0].get('at', 0) != 0:
            bs = [{'at': 0, 'kind': 'kinetic', 'text': sc.get('title') or sc['narration'][0][:40]}] + bs
        for b in bs:
            at = min(max(int(b.get('at', 0)), 0), n - 1)
            out.append({**b, 'from_s': starts[at] - (0.15 if starts[at] > 0.3 else 0)})
        si += n
    out.sort(key=lambda b: b['from_s'])
    # merge beats that would be too short
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
        beats.append({'from': int(round(b['from_s'] * FPS)), 'to': int(round(b['to_s'] * FPS)), 'kind': b.get('kind', 'kinetic'),
                      'text': b.get('text'), 'value': b.get('value'), 'items': b.get('items'), 'img': b.get('img'), 'part': b.get('part')})
    return beats

def props(ep, style, ep_dir, kind):
    segs = load(ep_dir / f'segs_{kind}.json')
    words = load(ep_dir / f'words_{kind}.json', [])
    vo_end = segs[-1]['end']
    if kind == 'long':
        total = vo_end + 7.0          # end card
        beats = _beats_from(ep['scenes'], segs, total, end_card={'dur': 6.0, 'text': 'Thanks for watching', 'value': 'New video every 2 days'})
    else:
        total = vo_end + 0.4
        beats = _beats_from([{'narration': ep['short']['narration'], 'beats': ep['short'].get('beats', []), 'title': ep['title']}], segs, total)
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
