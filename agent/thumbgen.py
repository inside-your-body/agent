"""Thumbnails as code-drawn motion-graphics stills (no AI drawings). Owner's chosen concept (#1):
a BIG cartoon hero showing the feeling on the affected body part, a glow behind him, an 'x-ray' inset circle zooming into the
cause with a dashed highlight + arrow, and 2-3 lines of HUGE condensed text (≤3 words a line) — topic + an open question.
Claude writes each thumbnail as a TSX component with the puppet kit; it is rendered at 1280×720, checked by vision, fixed once.
Main = concept 1 (uploaded); _b/_c = two other concepts for YouTube's Test & compare."""
import json, subprocess, base64, os
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, load, save
from . import llm
from .genmotion import _code, _static_ok, _syntax, GEN_DIR, KIT_API

EXAMPLE = (ROOT / 'agent/thumb_example.tsx.txt').read_text()

CONCEPTS = [
    "CONCEPT 1 (main, the owner's favourite): the hero HUGE on the left half (scale 3.2-4, face fully visible, strong emotion — pain/shock/worried),"
    " hands on the affected body part; a soft accent glow behind him; an inset circle (r≈150, dark fill, white ring + dashed accent ring) placed on"
    " that body part showing a tiny drawn close-up of the CAUSE (the organ/stone/germ/vessel...); a thick arrow from the circle to the text;"
    " right side: 3 lines of huge text (Anton-like condensed: fontFamily 'F_anton', 170-200 px, black stroke ~7% of size, paintOrder stroke),"
    " line 1 white = the subject, lines 2-3 yellow/accent = the twist or question.",
    "CONCEPT 2: one GIANT expressive villain/object (the cause, with a face) filling the left half on a loud burst/halftone background,"
    " right side 2-3 lines of huge text in contrasting colours ending with a question.",
    "CONCEPT 3: the hero (big, reacting) face-to-face with the cause shown huge and glowing/dangerous; big 2-line headline across the top.",
]

RULES = """Write ONE TSX file: `export default function Thumb(p: {kit: string})` rendering a 1920×1080 YouTube THUMBNAIL as a single still frame.
- Imports ONLY from 'react', 'remotion' (AbsoluteFill) and the kit ('../kit/Kit', '../kit/Styles'). It is a STILL: do NOT use useCurrentFrame,
  pop() or lerp() for appearance (everything fully visible), no Math.random, no images/URLs.
- Wrap in <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">…</svg></AbsoluteFill>. Paint the whole background.
- Thumbnail craft: readable on a phone at 160 px wide → max 3 short lines, ≤3 words each, huge; one clear focal point; strong contrast;
  nothing important in the bottom-right 300×120 (YouTube timestamp); text never overlaps the hero's face or the inset; nothing cut off
  except deliberate cropping of the hero's legs.
- The hero comes from the kit (Hero + POSES + mood); use S = {...STYLES.flat, shirt: <bright colour>} or the video's pack if it reads well big.
- Dark rich background (navy/near-black or a saturated colour) with a radial glow; colours: white, yellow #FFD23D, red #FF3B30 or the accent.
""" + KIT_API.split('Everything is SVG')[0] + """
Hero: <Hero s={S} x y scale pose mood />, poses: stand holdSide doubled point shrug cheer holdHead holdChest holdBelly think drink wave run tired;
feet at (x,y), ~330 px tall at scale 1 (scale 3.5 → the head is ~ y-1150 above the feet: place feet BELOW the frame, e.g. y 1150-1250, so the
head and torso fill the frame). SStone, Kidney, Stick, Drop also available. Draw anything else with SVG paths.
Reference — the owner's approved thumbnail (concept 1 for a kidney-stone video):
```tsx
""" + EXAMPLE[:5200] + """
```
Output ONLY the code in one ```tsx block."""


def _render(ids, out_dir, kit):
    """Render each thumbnail component to out_dir/<id>.jpg (1280×720). Returns {id: path or None}."""
    lines = [f"import {i} from './{i}';" for i in ids] + ['export const THUMBS: Record<string, any> = {' + ', '.join(ids) + '};']
    (GEN_DIR / 'thumbs.ts').write_text('\n'.join(lines) + '\n')
    out_dir.mkdir(parents=True, exist_ok=True)
    res = {}
    for i in ids:
        pf = out_dir / f'{i}.json'; save(pf, {'id': i, 'kit': kit})
        r = subprocess.run(['node', 'scripts/stills.mjs', str(pf), 'GenThumb', str(out_dir / i), '0', '0.6667'], cwd=ROOT / 'render',
                           capture_output=True, text=True, timeout=900)
        p = out_dir / i / 'f_0.jpg'
        errs = load(out_dir / i / 'errors.json', [])
        res[i] = p if p.exists() and not errs else None
        if r.returncode or errs: print('thumb render problem', i, (r.stderr or '')[-300:], errs[:1])
    return res


def _judge(items):
    content = []
    for i, brief, p in items:
        content.append({'type': 'text', 'text': f'THUMB {i} — intended: {brief}'})
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(p.read_bytes()).decode()}})
    content.append({'type': 'text', 'text': """You are a YouTube thumbnail expert (health explainer channel). For each THUMB: FAIL it only for real defects —
text cut off/overlapping/unreadable, words overlapping the face or the inset, the hero's face hidden/cut, a broken or empty-looking image,
elements piled into a mess, or the subject not recognisable. Return JSON only: {"results": [{"id": str, "ok": bool, "problem": "concrete fix"}]}"""})
    try:
        r = llm._repair(llm.ask(content, max_tokens=2000, retries=2))
        r = json.loads(r) if isinstance(r, str) else r
        return {x['id']: (bool(x.get('ok')), x.get('problem') or '') for x in r.get('results', [])}
    except Exception as e:
        print('thumb QA failed', e); return {}


def build(ep, style, ep_dir):
    """Writes ep_dir/thumbnail.jpg (+ thumbnail_b/c.jpg). Returns list of paths."""
    th = ep.get('thumbnail') or {}
    kit = style.get('kit', 'flat')
    brief_base = (f"Video title: {ep['title']}. Thumbnail idea from the writer: {json.dumps({k: th.get(k) for k in ('line1', 'line2', 'image_prompt')}, ensure_ascii=False)}. "
                  f"Variants: {json.dumps([{k: v.get(k) for k in ('line1', 'line2')} for v in (th.get('variants') or []) if isinstance(v, dict)][:2], ensure_ascii=False)}. "
                  "Write the thumbnail TEXT yourself (2-3 lines, ≤3 words each, CAPS): line 1 names the subject in plain words, the last line is a "
                  "curiosity twist/question that makes people NEED to click (like '3 MM STONE / WORST PAIN / EVER?'). Make the wording different per concept.")
    ids = ['t_main', 't_b', 't_c']
    briefs = {i: brief_base + '\n' + c for i, c in zip(ids, CONCEPTS)}
    codes, probs = {}, {}
    def gen(i, fix=None, prev=None):
        p = briefs[i] + '\n' + RULES
        if fix: p += f"\n\nYour previous version FAILED review: {fix}\nFix it. Previous code:\n```tsx\n{prev}\n```"
        try:
            c = _code(llm.ask(p, max_tokens=9000, retries=2, effort='low'))
        except Exception as e:
            return i, None, str(e)
        e = _static_ok(c) or ('must not animate (useCurrentFrame)' if 'useCurrentFrame' in c else None)
        return i, c, e
    todo = [(i, None, None) for i in ids]
    out_dir = ep_dir / 'thumbs'
    pending = set(ids)
    for rnd in range(3):
        if not todo: break
        probs = {}
        with ThreadPoolExecutor(3) as ex:
            for i, c, e in ex.map(lambda j: gen(*j), todo):
                if c and not e: codes[i] = c
                else: probs[i] = e or 'no code'
        cur = [j[0] for j in todo if j[0] not in probs]
        for i in cur: (GEN_DIR / f'{i}.tsx').write_text(codes[i])
        for i, e in _syntax(cur).items():
            if e: probs[i] = 'compile error: ' + e
        good = [i for i in cur if i not in probs]
        shots = _render(good, out_dir, kit) if good else {}
        for i in good:
            if not shots.get(i): probs[i] = 'it crashed when rendering'
        looks = [(i, CONCEPTS[ids.index(i)][:200], shots[i]) for i in good if shots.get(i)]
        verdict = _judge(looks) if looks and rnd < 2 else {}
        for i, _, p in looks:
            ok, prob = verdict.get(i, (True, ''))
            if ok:
                os.replace(p, ep_dir / f"thumbnail{'' if i == 't_main' else '_' + i[-1]}.jpg"); pending.discard(i)
            else: probs[i] = prob
        todo = [(i, probs.get(i, 'failed'), codes.get(i)) for i in ids if i in pending]
        print(f'thumbs round {rnd}: done {sorted(set(ids) - pending)}, redo {[(i, probs.get(i, "")[:80]) for i in pending]}')
    outs = sorted(ep_dir.glob('thumbnail*.jpg'))
    if not (ep_dir / 'thumbnail.jpg').exists():
        fallback(ep, ep_dir)
        outs = sorted(ep_dir.glob('thumbnail*.jpg'))
    for i in ids: (GEN_DIR / f'{i}.tsx').unlink(missing_ok=True)
    (GEN_DIR / 'thumbs.ts').write_text('export const THUMBS: Record<string, any> = {};\n')
    print('thumbnails:', [p.name for p in outs])
    return outs


def fallback(ep, ep_dir):
    """Template version of concept 1 (hero in pain + 3 huge lines) when the generated one failed."""
    th = ep.get('thumbnail') or {}
    words = ' '.join(x for x in (th.get('line1'), th.get('line2')) if x).upper().split() or ep['title'].upper().split()
    lines, cur = [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > 11: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    lines = (lines + [cur])[:3]
    pf = ep_dir / 'thumbs/fallback.json'; pf.parent.mkdir(parents=True, exist_ok=True)
    save(pf, {'lines': lines, 'title': ep['title']})
    subprocess.run(['node', 'scripts/stills.mjs', str(pf), 'ThumbT', str(ep_dir / 'thumbs/fb'), '0', '0.6667'], cwd=ROOT / 'render',
                   capture_output=True, text=True, timeout=900)
    p = ep_dir / 'thumbs/fb/f_0.jpg'
    if p.exists(): os.replace(p, ep_dir / 'thumbnail.jpg')
