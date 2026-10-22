"""Thumbnails as code-drawn stills (no AI images). Owner's rule (Oct 22): thumbnails must look PREMIUM and CLICKABLE like top adult
science channels — never childish/cute. Three concepts are written by Claude as TSX, rendered at 1280x720, judged by vision
(fails childish or broken ones), and the vision judge picks the MOST CLICKABLE one as the uploaded thumbnail; the other two are
kept as _b/_c for YouTube's Test & compare."""
import json, subprocess, base64, os
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, load, save
from . import llm
from .genmotion import _code, _static_ok, _syntax, GEN_DIR, KIT_API

EXAMPLE = (ROOT / 'render/src/ThumbPro.tsx').read_text()

CONCEPTS = [
    "CONCEPT A — DRAMATIC SUBJECT: the subject of the video (organ, tooth, stone, cell, object...) HUGE and DETAILED like a premium"
    " illustration (gradients, shading, specular highlight, cracks/texture, damage shown truthfully), cinematic dark background with a red"
    " or teal rim glow; ONE thick red circle on the key detail + a red arrow to the words; right side 2-3 huge words (white + yellow).",
    "CONCEPT B — HUMAN REACTION: a big close-up of an adult person's face/upper body drawn semi-realistically with gradients (NOT the"
    " cartoon kit hero): real proportions, eyebrows/eyes/mouth showing pain, shock or disbelief, hand on the affected spot; next to it the"
    " cause shown dramatic and detailed (or an x-ray cut-away on the body); 2-3 huge words.",
    "CONCEPT C — CONTRAST: a split image — healthy vs destroyed / before vs after / normal vs what happens inside — both halves detailed and"
    " lit dramatically, a red divider or arrow; 2-3 huge words (e.g. 'DAY 1' vs 'DAY 30', or one short shocking claim).",
]

RULES = """Write ONE TSX file: `export default function Thumb(p: {kit: string})` rendering a 1920×1080 YouTube THUMBNAIL as a single still frame.
- Imports ONLY from 'react' and 'remotion' (AbsoluteFill). Draw EVERYTHING yourself with SVG (paths, gradients, radialGradient glows).
  It is a STILL: no useCurrentFrame/animation, no Math.random, no images/URLs, no <filter>.
- MUST LOOK PREMIUM AND ADULT, like the top science/explainer channels with millions of views — NEVER childish: no smiley/cute faces on
  objects or organs, no googly eyes, no comic starbursts, no stick figures or the cartoon kit hero, no pastel kid colours, no clip-art.
  Detailed shading (2-3 gradient stops), highlights, texture and real proportions; cinematic lighting (dark background + one strong
  coloured glow); high contrast; ONE focal point big enough to read at 160 px wide.
- WORDS: 2-4 words total in 1-3 lines, ≤10 characters a line, fontFamily 'F_anton', 190-240 px, white + yellow #FFD21F (or red #FF1E1E
  for one word), black stroke ~6% of size with paintOrder="stroke". The words create a curiosity gap that only the video answers
  (a shocking claim or question), and do NOT repeat the title. Never overlap words with the focal detail; nothing in the bottom-right
  300×130 (timestamp); nothing cut off.
- Optional: one thick red circle (stroke 14-18) on the key detail + a red curved arrow — the classic high-CTR cue.
Reference — an approved premium thumbnail (tooth decay video). Match this LEVEL of finish, not its content:
```tsx
""" + EXAMPLE + """
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


SCORES = {}

def _judge(items):
    content = []
    for i, brief, p in items:
        content.append({'type': 'text', 'text': f'THUMB {i} — intended: {brief}'})
        content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(p.read_bytes()).decode()}})
    content.append({'type': 'text', 'text': """You are a YouTube thumbnail expert (health explainer channel). For each THUMB: FAIL it only for real defects —
text cut off/overlapping/unreadable, words covering the focal detail, a broken or empty-looking image, elements piled into a mess,
the subject not recognisable, or it looks CHILDISH/cute/clip-art (smiley objects, kid cartoon style) instead of a premium adult science
thumbnail. Also give each a clickability score 1-10 (would an adult scrolling YouTube click it?).
Return JSON only: {"results": [{"id": str, "ok": bool, "click": int, "problem": "concrete fix"}]}"""})
    try:
        r = llm._repair(llm.ask(content, max_tokens=2000, retries=2))
        r = json.loads(r) if isinstance(r, str) else r
        for x in r.get('results', []): SCORES[x['id']] = int(x.get('click') or 0)
        return {x['id']: (bool(x.get('ok')), x.get('problem') or '') for x in r.get('results', [])}
    except Exception as e:
        print('thumb QA failed', e); return {}


def build(ep, style, ep_dir):
    """Writes ep_dir/thumbnail.jpg (+ thumbnail_b/c.jpg). Returns list of paths."""
    th = ep.get('thumbnail') or {}
    kit = style.get('kit', 'flat')
    brief_base = (f"Video title: {ep['title']}. Thumbnail idea from the writer: {json.dumps({k: th.get(k) for k in ('line1', 'line2', 'image_prompt')}, ensure_ascii=False)}. "
                  f"Variants: {json.dumps([{k: v.get(k) for k in ('line1', 'line2')} for v in (th.get('variants') or []) if isinstance(v, dict)][:2], ensure_ascii=False)}. "
                  "Write the thumbnail WORDS yourself (2-4 words, CAPS): a shocking claim or question that makes adults NEED to click and that "
                  "only the video answers (e.g. 'IT ROTS FROM INSIDE', 'WORST PAIN EVER?', 'YOUR BRAIN SHRINKS'). Different words per concept.")
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
                os.replace(p, out_dir / f'ok_{i}.jpg'); pending.discard(i)
            else: probs[i] = prob
        todo = [(i, probs.get(i, 'failed'), codes.get(i)) for i in ids if i in pending]
        print(f'thumbs round {rnd}: done {sorted(set(ids) - pending)}, redo {[(i, probs.get(i, "")[:80]) for i in pending]}')
    ok = sorted([i for i in ids if (out_dir / f'ok_{i}.jpg').exists()], key=lambda i: -SCORES.get(i, 0))
    print('thumb click scores:', {i: SCORES.get(i) for i in ok})
    for n, i in enumerate(ok):          # most clickable -> thumbnail.jpg (uploaded), the others -> _b, _c
        os.replace(out_dir / f'ok_{i}.jpg', ep_dir / f"thumbnail{'' if n == 0 else '_' + 'bc'[n - 1]}.jpg")
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
