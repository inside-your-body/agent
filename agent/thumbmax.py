"""Thumbnails in the channel look (owner, Oct 23): MAX with a strong emotion + the subject circled in red + 2 text lines
(line 1 = the topic so viewers know what the video is about, line 2 = what they'll see / the hook). 3 variants; vision judge checks
them and picks the most clickable as thumbnail.jpg (others: _b, _c for Test & compare)."""
import json, os, shutil, subprocess
from .common import ROOT, WORK, save, load
from . import llm, flat
import base64
SCORES = {}


def _judge(items):
    content = []
    for i, brief, p in items:
        content.append({'type': 'text', 'text': f'THUMB {i} — text: {brief}'})
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(p.read_bytes()).decode()}})
    content.append({'type': 'text', 'text': """You are a YouTube thumbnail expert for an animated POV health channel (its cartoon character MAX is the brand — that is fine).
For each THUMB: ok=false only for real defects (text cut off/unreadable, elements overlapping the text, MAX's head cut off, broken image).
click = 1-10: would an adult scrolling YouTube understand the topic instantly AND want to click? Return JSON only:
{"results": [{"id": str, "ok": bool, "click": int, "problem": str}]}"""})
    try:
        r = llm._repair(llm.ask(content, max_tokens=1500, retries=2))
        r = json.loads(r) if isinstance(r, str) else r
        for x in r.get('results', []): SCORES[x['id']] = int(x.get('click') or 0)
        return {x['id']: (bool(x.get('ok')), x.get('problem') or '') for x in r.get('results', [])}
    except Exception as e:
        print('thumb judge failed', e); return {}

BGS = [('#0F2A4A', '#2F7DD1'), ('#3A0F14', '#D1342F'), ('#13321F', '#2FB06A'), ('#2A123F', '#9B4DE0'), ('#3A2A0F', '#E0A030')]


def build(ep, ep_dir):
    lib = flat.library()
    v = llm.ask_json(f"""You design YouTube thumbnails for the animated health channel "Inside Your Body" (POV style, character MAX).
Video title: {ep['title']}
Opening of the script: {json.dumps([s for sc in ep['scenes'][:2] for s in sc['narration']][:10], ensure_ascii=False)}
Prop library (reuse when it fits): {json.dumps({k: x['desc'] for k, x in lib['props'].items()}, ensure_ascii=False)}
Write 3 DIFFERENT thumbnails. Each: "line1" = the topic in 1-3 plain words people search (so the viewer instantly knows what the video
is about, e.g. "KIDNEY STONES"); "line2" = 2-5 words that tell what they'll see and make them NEED to click (a shocking claim or open
question, e.g. "HOW THEY GROW SILENTLY"); "pose" = MAX's pose with a strong emotion that matches (pain, shock, disgust, fear, awe);
"subject" = the object/organ to circle (library prop name or a precise description of a new one).
Return JSON: {{"variants": [{{"line1": str, "line2": str, "pose": str, "subject": str}}]}}""", max_tokens=2500)
    vs = (v.get('variants') or [])[:3]
    req = {'poses': {}, 'props': {}}
    for i, x in enumerate(vs):
        x['pose_name'] = 'max_thumb_' + flat._slug(x.get('pose', 'shock'))
        if x['pose_name'] not in lib['poses']: req['poses'][x['pose_name']] = (x.get('pose') or 'shocked') + ', big expressive face, upper body turned to the viewer'
        sub = x.get('subject') or ''
        x['prop_name'] = sub if sub in lib['props'] else 'prop_' + flat._slug(sub)
        if x['prop_name'] not in lib['props']: req['props'][x['prop_name']] = sub
    flat.make_assets(req, ep_dir)
    lib = flat.library()
    out_dir = ep_dir / 'thumbs'; out_dir.mkdir(exist_ok=True)
    pub = ROOT / 'render/public/ep'; pub.mkdir(parents=True, exist_ok=True)
    looks = []
    for i, x in enumerate(vs):
        props = {'line1': x.get('line1', ''), 'line2': x.get('line2', ''), 'bg': BGS[i % len(BGS)][0], 'glow': BGS[i % len(BGS)][1]}
        for key, kind, name in (('max', 'poses', x['pose_name']), ('subject', 'props', x['prop_name'])):
            f = flat._file(kind, name)
            if f and name in lib[kind]:
                shutil.copy(f, pub / f'th_{kind}_{name}.png'); props[key] = {'src': f'ep/th_{kind}_{name}.png', 'ar': lib[kind][name]['ar']}
        pf = out_dir / f'm{i}.json'; save(pf, props)
        r = subprocess.run(['node', 'scripts/stills.mjs', str(pf), 'ThumbMax', str(out_dir / f'm{i}'), '0', '0.6667'], cwd=ROOT / 'render',
                           capture_output=True, text=True, timeout=900)
        p = out_dir / f'm{i}' / 'f_0.jpg'
        if p.exists(): looks.append((f't{i}', f"{props['line1']} / {props['line2']}", p))
        else: print('thumb render failed', r.stderr[-300:])
    verdict = _judge(looks) if looks else {}
    ok = [x for x in looks if verdict.get(x[0], (True, ''))[0]] or looks
    ok.sort(key=lambda x: -SCORES.get(x[0], 0))
    print('thumb scores:', {x[0]: SCORES.get(x[0]) for x in looks})
    for n, (_, _, p) in enumerate(ok):
        shutil.copy(p, ep_dir / f"thumbnail{'' if n == 0 else '_' + 'bc'[n - 1]}.jpg")
    if not ok: raise RuntimeError('no thumbnail rendered')
