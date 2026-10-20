"""Generative motion graphics: for every key moment Claude designs and codes a BRAND-NEW animation (a Remotion/React component)
from scratch — no templates. Each component is syntax-checked, rendered as QA stills, judged by Claude vision, repaired once,
and only then used. Shots that still fail become a newly drawn storyboard frame (never a template, never an empty screen)."""
import json, re, shutil, subprocess, os, base64
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, load, save
from . import llm

GEN_DIR = ROOT / 'render/src/gen'
MAX_GEN_LONG, MAX_GEN_SHORT = 44, 10
FPS = 30

KIT_API = """THE CHANNEL'S PUPPET KIT (import it — characters must come from here so the cast looks the same in every video):
  import {lerp, pop, ease, rnd, POSES, mixPose, Stick, Kidney, Stone, KType, Label, Drop} from '../kit/Kit';
  import {STYLES, StyleBg, Riso, Hero, SStone} from '../kit/Styles';
  const S = STYLES[p.theme.kit] || STYLES.flat;   // THIS video's style pack: colours S.bg S.bg2 S.ink S.accent S.accent2 S.skin S.shirt S.pants S.hair,
                                                  // S.font (font-family name), S.upper (caps), S.lineOnly (pure line-art: no fills), S.line (outline width)
  Everything is SVG: draw inside ONE <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`}> filling an <AbsoluteFill>.
  - <StyleBg s={S} w={p.w} h={p.h}/>  the style's background (texture/grid/halftone/blobs). Put it first. <Riso s={S}>…</Riso> wraps groups for the riso look.
  - <Hero s={S} x y scale pose={POSES.x | mixPose(POSES.a, POSES.b, t)} mood flip? walk? blink? glow?/>  THE channel hero: a cartoon person
    (feet at x,y; ~330 px tall at scale 1 — use scale 1.2-2.6 so he is BIG). poses: stand holdSide doubled point shrug cheer holdHead holdChest
    holdBelly think drink wave run tired. moods: neutral happy pain shock worried determined. walk = phase in radians (f/4) makes legs swing.
    Recolour with s={{...S, shirt: '#hex'}} for a second person. Animate him: mixPose between poses over frames, move x, bob y, flip, mood changes.
  - <SStone s={S} x y scale rot mood/>  a character-like stone/crystal (kidney stone, gallstone, salt crystal...).
  - <Stick x y s pose mood color/> simple stick figure (crowds, small people). <Kidney x y s mood hat sweat swell flip/> kidney character.
  - <KType words={['BIG','WORDS']} at={frame} x y size color accent={[i]} accentColor={S.accent} font={S.font} align='middle'|'start' width/>  kinetic typography,
    words pop in one after another from frame `at`, real layout (never overlaps). <Label x y tx ty text at color/> leader-line label.
    <Drop x y s color o/> a liquid drop.
  - helpers: lerp(f, f0, f1, from, to) eased & clamped; pop(f, at) spring 0→1; rnd(i) seeded random.
  Draw organs, cells, vessels, molecules, objects YOURSELF with SVG paths in the style pack's look (same outline width/colours) — big and clear."""

CONTRACT = """Write ONE self-contained React component file (TypeScript/TSX) for Remotion 4.
- Imports allowed ONLY from 'react', 'remotion' (useCurrentFrame, interpolate, spring, Easing, AbsoluteFill, Sequence) and the channel kit
  ('../kit/Kit', '../kit/Styles'). NO images, NO AI drawings: everything is drawn in code (SVG) — this channel is pure motion graphics.
  No files/fonts/URLs, no Math.random, no Date, no window/document, no state/effects/hooks except useCurrentFrame.
- `export default function Shot(p: {dur: number; w: number; h: number; vertical: boolean; theme: any; words: [string, number][]; text: string})`
  dur = shot length in frames (30 fps), w×h = canvas in px. p.theme.kit = this video's style pack id (see kit).
  words = narrator words with the frame (relative to this shot) when each is spoken — sync key actions to them.
""" + KIT_API + """
- EVERY SHORT SENTENCE IS ACTED OUT: what the narrator says happens on screen at that moment (the stone moves → it moves; it gets stuck →
  it jams, squashes, the hero doubles over). Use the Hero / stick figures whenever a person, feeling or reaction is involved; otherwise
  animated diagrams, objects and characters (organs/cells/germs with faces when it helps the story).
- BOLD and READABLE on a phone: when the hero appears he is BIG (scale ≥1.7 on 16:9, ≥2.2 vertical); main shapes use the pack's
  strong colours with clear outlines (stroke ≥5 px), never pale/washed-out fills or hairlines; one clear focal action per moment.
- Full-bleed: the whole canvas painted in the style pack, the subject LARGE (40-70% of the frame) inside 8% safe margins,
  layered depth (background, subject, foreground particles), no big empty areas, nothing important tiny.
- Must ANIMATE the whole time: things enter, act, transform, react; secondary motion (drift, wobble, pulsing, particles, blinking) never stops.
  All timing scales with dur (main action done by ~0.75*dur).
- On-screen text: kinetic typography of 1-4 KEY words synced to the exact spoken word (KType), never a full sentence, never covering the subject.
- SOUND DESIGN: also export the sound effects for the events in your animation, frames relative to this part (same timing as the visuals):
  `export const SFX: {f: number; s: string}[] = [...]` with s one of: pop, click, tick, ding, whoosh, swish, zip, reveal, sparkle, bong,
  bubble, drip, goo, impact, stamp, boom, riser, shield, heartbeat. Pick the sound that fits THIS event (vary them — never the same one
  for everything): word lands → pop/click/ding; something appears → reveal/sparkle; fast move → swish/zip/whoosh; liquid → drip/bubble/goo;
  hit/jam → impact/stamp; build-up → riser. 1-3 effects per part, at least 45 frames apart, subtle, never annoying. [] if nothing deserves one.
- RENDER SPEED (thousands of frames on a small server): no SVG <filter>/feGaussianBlur/feTurbulence, no CSS filter/blur/backdrop-filter/
  box-shadow, no mix-blend-mode; at most ~120 animated elements; simple gradients and opacity for glow.
- Text: keep normal spaces between words; every word fully on screen.
- Keep it under 260 lines. Valid TSX. Output ONLY the code in one ```tsx block."""


def _durations(ep, ep_dir, kind):
    """Approximate frames for each shot from sentence timings (exact length is passed again at render time)."""
    segs = load(ep_dir / f'segs_{kind}.json')
    scenes = ep['scenes'] if kind == 'long' else [{'narration': ep['short']['narration'], 'beats': ep['short'].get('beats', [])}]
    out, si = [], 0
    starts = []
    for sc in scenes:
        for b in sc['beats']:
            at = min(max(int(b.get('at', 0)), 0), len(sc['narration']) - 1)
            starts.append((segs[si + at]['start'], b, sc['narration'][at]))
        si += len(sc['narration'])
    end = segs[-1]['end']
    starts.sort(key=lambda x: x[0])
    for i, (t, b, sent) in enumerate(starts):
        t1 = starts[i + 1][0] if i + 1 < len(starts) else end
        out.append((b, sent, max(36, int((t1 - t) * FPS)), t))
    return out


def _words(ep_dir, kind, t0, dur):
    ws = load(ep_dir / f'words_{kind}.json', [])
    return [[w['w'], int(round((w['s'] - t0) * FPS))] for w in ws if t0 - 0.05 <= w['s'] < t0 + dur / FPS]


def _code(txt):
    m = re.search(r'```(?:tsx|typescript|ts|jsx)?\s*\n(.*?)```', txt, re.S)
    return (m.group(1) if m else txt).strip()


def _static_ok(code, allowed=()):
    if 'export default' not in code: return 'missing export default'
    bad = [m for m in re.findall(r"from\s+['\"]([^'\"]+)['\"]", code) if m not in ('react', 'remotion', '../kit/Kit', '../kit/Styles')]
    if bad: return f'forbidden imports {bad}'
    for k in ('Math.random', 'Date.now', 'new Date', 'window.', 'document.', 'fetch(', '<img', 'http://', 'https://', '<filter', 'feGaussianBlur', 'feTurbulence', 'backdropFilter'):
        if k in code: return f'forbidden: {k}'
    files = re.findall(r"staticFile\(\s*['\"`]([^'\"`]+)['\"`]", code)
    unknown = [f for f in files if f not in allowed]
    if unknown: return f'unknown asset files {unknown} (only these exist: {list(allowed)})'
    if 'staticFile(' in code and len(files) < code.count('staticFile('): return 'staticFile must use literal file paths'
    return None


SFX_OK = {'pop', 'click', 'whoosh', 'reveal', 'sparkle', 'bubble', 'drip', 'goo', 'impact', 'boom', 'riser', 'shield', 'heartbeat', 'tick', 'bong', 'ding', 'stamp', 'swish', 'zip'}

def _sfx(code, dur):
    """Sound cues the animation exported -> [{'p': fraction of the part, 's': name}] (scaled to the real length at mix time)."""
    m = re.search(r'export\s+const\s+SFX[^=]*=\s*(\[.*?\])\s*;', code, re.S)
    if not m: return []
    out, last = [], -999
    for f, name in re.findall(r"f\s*:\s*(\d+(?:\.\d+)?)\s*,\s*s\s*:\s*['\"]([a-z]+)['\"]", m.group(1)):
        f = float(f)
        if name in SFX_OK and 0 <= f <= dur and f - last >= 40:
            out.append({'p': round(f / max(1, dur), 4), 's': name}); last = f
    return out[:4]

def _write(gid, code):
    (GEN_DIR / f'{gid}.tsx').write_text(code)


def _syntax(gids):
    files = [str(GEN_DIR / f'{g}.tsx') for g in gids]
    if not files: return {}
    r = subprocess.run(['node', 'scripts/checkgen.mjs', *files], cwd=ROOT / 'render', capture_output=True, text=True)
    try:
        res = json.loads(r.stdout or '{}')
    except Exception:
        return {g: 'checker failed' for g in gids}
    return {g: res.get(str(GEN_DIR / f'{g}.tsx')) for g in gids}


def _index(gids):
    lines = [f"import {g} from './{g}';" for g in gids]
    lines.append('export const GEN: Record<string, any> = {' + ', '.join(gids) + '};')
    (GEN_DIR / 'index.ts').write_text('\n'.join(lines) + '\n')


def _stills(items, theme, vertical, out_dir):
    """Render 2 stills per shot (35% and 75% of its time) through the QA gallery. Returns {gid: [paths], ...}, errors."""
    slot = 240
    props = {'items': [{'id': g, 'dur': min(d, slot)} for g, d in items], 'slot': slot, 'theme': theme, 'vertical': vertical}
    pf = out_dir / 'gallery.json'; save(pf, props)
    frames, where = [], {}
    for i, (g, d) in enumerate(items):
        dd = min(d, slot)
        for q in (0.35, 0.75):
            fr = i * slot + int(dd * q); frames.append(fr); where.setdefault(g, []).append(fr)
    if out_dir.exists(): shutil.rmtree(out_dir / 'st', ignore_errors=True)
    r = subprocess.run(['node', 'scripts/stills.mjs', str(pf), 'GenGalleryV' if vertical else 'GenGallery', str(out_dir / 'st'),
                        ','.join(map(str, frames))], cwd=ROOT / 'render', capture_output=True, text=True, timeout=1800)
    if r.returncode != 0: print('stills failed', r.stderr[-800:])
    errs = load(out_dir / 'st/errors.json', [])
    bad_frames = {e['frame'] for e in errs}
    res = {}
    for g, frs in where.items():
        paths = [out_dir / 'st' / f'f_{fr}.jpg' for fr in frs]
        res[g] = {'paths': [p for p in paths if p.exists()], 'error': any(fr in bad_frames for fr in frs)}
    return res


def _blank(path):
    try:
        from PIL import Image, ImageStat
        im = Image.open(path).convert('RGB').resize((96, 54))
        st = ImageStat.Stat(im)
        mean = st.mean
        if mean[0] > 230 and mean[1] < 40 and mean[2] > 230: return True        # magenta = crashed component
        return max(st.stddev) < 6                                                # flat / empty frame
    except Exception:
        return True


def _vision(batch):
    """batch: [(gid, brief, [paths])] -> {gid: (ok, problem)}"""
    content = []
    for gid, brief, paths in batch:
        content.append({'type': 'text', 'text': f'SHOT {gid} — must show: {brief}'})
        for p in paths[:2]:
            content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(p.read_bytes()).decode()}})
    content.append({'type': 'text', 'text': """You are the art director of an animated health channel. For each SHOT judge the two frames (early, late):
FAIL it ONLY for real defects: it is broken/empty/garbled, the subject the narrator talks about is missing or unrecognisable,
important elements are cut off or pile up into an unreadable mess, text is unreadable/joined/covering the subject,
or the frame is mostly empty with the subject tiny.
Simple-but-clean is a PASS (we pay for every redo).
Return JSON only: {"results": [{"id": str, "ok": bool, "problem": "short concrete fix if failed"}]}"""})
    try:
        txt = llm.ask(content, max_tokens=4000, retries=2)
        res = llm._repair(txt)
        res = json.loads(res) if isinstance(res, str) else res
        return {r['id']: (bool(r.get('ok')), r.get('problem') or '') for r in res.get('results', [])}
    except Exception as e:
        print('vision QA failed', e)
        return {}


def _prompt(lang, theme, brief, sentence, dur, words, vertical, others, fix=None, prev=None, assets=(), before=None):
    p = f"""You are a world-class motion designer making ONE shot of an animated health explainer ("Inside Your Body").
Style pack of THIS video: "{theme.get('kit', 'flat')}" (use STYLES[p.theme.kit]). Design language twist for this video (motion personality, camera, typography feel):
{json.dumps(lang, ensure_ascii=False)}
Palette: bg {theme['bg']}, bg2 {theme['bg2']}, fg {theme['fg']}, accents {theme['accent']}, {theme['accent2']}, {theme['accent3']}.
Canvas: {'1080×1520 vertical' if vertical else '1920×1080'}, duration {dur} frames ({dur / FPS:.1f} s).
The narrator says: "{sentence}"
Word timings (word, frame): {json.dumps(words[:40])}
Storyboard for this part (follow it): {brief}
Design it FROM SCRATCH for exactly this moment — a fresh composition and animation that does NOT resemble these other parts
already designed for this video: {json.dumps(others[-25:], ensure_ascii=False)}
{('CONTINUITY: this part directly continues the previous part of the same sequence. Start from where it ended (same set, same elements in the same places, same characters) and evolve it — the cut must feel seamless. Previous part code:' + chr(10) + '```tsx' + chr(10) + before[:9000] + chr(10) + '```') if before else 'This part opens a new sequence: establish its set clearly.'}
{CONTRACT}"""
    if fix:
        p += f"\n\nYour previous version FAILED review: {fix}\nRewrite it to fix that (keep what worked). Previous code:\n```tsx\n{prev}\n```"
    return p


def _gen_one(job, before=None):
    gid, lang, theme, brief, sentence, dur, words, vertical, others, fix, prev = job
    m = META.get(gid, {})
    allowed = [a['file'] for a in m.get('assets', [])]
    try:
        code = _code(llm.ask(_prompt(lang, theme, brief, sentence, dur, words, vertical, others, fix, prev,
                                     m.get('assets', []), before), max_tokens=14000, retries=2, effort='low'))
    except Exception as e:
        return gid, None, f'api: {e}'
    err = _static_ok(code, allowed)
    return gid, code, err

META = {}


def build(ep, style, short_style, ep_dir):
    """Turn every 'gen' shot into its own new animation component. Returns number of shots that made it."""
    if GEN_DIR.exists():
        for f in GEN_DIR.glob('g_*.tsx'): f.unlink()
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    gdir = ep_dir / 'gen'; gdir.mkdir(exist_ok=True)
    done = load(gdir / 'done.json', {})               # gid -> code (resume-safe)
    jobs, meta = [], {}
    for kind, theme, cap in (('long', style, MAX_GEN_LONG), ('short', short_style, MAX_GEN_SHORT)):
        lang = theme.get('lang') or {}
        n = 0; others = []
        for b, sentence, dur, t0 in _durations(ep, ep_dir, kind):
            if b.get('kind') != 'gen': continue
            brief = b.get('design') or b.get('see') or sentence
            if n >= cap:
                b['kind'] = 'gen'; b['text'] = b.get('text') or (b.get('see') or '')[:40]; continue      # kit fallback (no drawings)
            if not b.get('params'): b['params'] = {}
            gid = b['params'].get('gen') or f"g_{'v' if kind == 'short' else 'l'}{n:02d}"; n += 1
            b['params']['gen'] = gid; b['params']['see'] = b.get('see')
            act = b.get('act') or {}
            if act:
                brief = json.dumps({k: act.get(k) for k in ('sequence_idea', 'see', 'motion', 'hero', 'continuity', 'text')}, ensure_ascii=False)
                sentence = ' '.join(x[0] for x in _words(ep_dir, kind, t0, dur)) or sentence
            meta[gid] = dict(b=b, brief=brief, sentence=sentence, dur=dur, words=_words(ep_dir, kind, t0, dur), vertical=kind == 'short',
                             lang=lang, theme=theme, others=list(others), assets=act.get('assets', []), scene=act.get('scene') or gid)
            others.append(brief[:90])
            if gid not in done:
                jobs.append((gid, lang, theme, brief, sentence, dur, meta[gid]['words'], kind == 'short', list(others[:-1]), None, None))
    print(f'genmotion: {len(meta)} parts to design ({len(jobs)} new)')
    META.clear(); META.update(meta)
    codes = dict(done)
    def run(jobs, chain=False):
        if not chain:
            with ThreadPoolExecutor(6) as ex:
                for gid, code, err in ex.map(_gen_one, jobs):
                    if code and not err: codes[gid] = code
                    else: print('gen fail', gid, err)
            return
        # parts of one sequence are designed in order (each sees the previous part's code); sequences run in parallel
        groups = {}
        for j in jobs: groups.setdefault(meta[j[0]]['scene'], []).append(j)
        order = list(meta)
        def seq(js):
            for j in js:
                i = order.index(j[0]); prev = order[i - 1] if i else None
                before = codes.get(prev) if prev and meta[prev]['scene'] == meta[j[0]]['scene'] else None
                gid, code, err = _gen_one(j, before)
                if code and not err: codes[gid] = code
                else: print('gen fail', gid, err)
        with ThreadPoolExecutor(6) as ex:
            list(ex.map(seq, groups.values()))
    run(jobs, chain=True)
    # syntax check + one repair round
    for rnd in range(2):
        for g, c in codes.items(): _write(g, c)
        errs = {g: e for g, e in _syntax(list(codes)).items() if e}
        missing = [g for g in meta if g not in codes]
        if not errs and not missing: break
        fixjobs = []
        for g in list(errs) + missing:
            m = meta[g]
            fixjobs.append((g, m['lang'], m['theme'], m['brief'], m['sentence'], m['dur'], m['words'], m['vertical'], m['others'],
                            ('compile error: ' + errs[g]) if g in errs else None, codes.get(g)))
            codes.pop(g, None)
        if rnd == 0: run(fixjobs)
    for g in list(codes):
        if _syntax([g]).get(g): codes.pop(g)
    save(gdir / 'done.json', codes)

    # visual QA: stills -> blank/crash check -> Claude vision -> one repair -> re-check crash/blank
    from . import assets as _assets
    _assets.stage_for_render(ep_dir)
    def qa(gids, vision=True):
        bad = {}
        for vertical in (False, True):
            sel = [(g, meta[g]['dur']) for g in gids if meta[g]['vertical'] == vertical]
            if not sel: continue
            _index(list(codes))
            st = _stills(sel, (short_style if vertical else style), vertical, gdir / ('qa_v' if vertical else 'qa'))
            looks = []
            for g, _ in sel:
                s = st.get(g, {})
                if s.get('error') or not s.get('paths') or all(_blank(p) for p in s['paths']):
                    bad[g] = 'it crashed or rendered an empty/flat frame'
                else:
                    looks.append((g, meta[g]['brief'], s['paths']))
            if vision:
                for k in range(0, len(looks), 6):
                    for g, (ok, prob) in _vision(looks[k:k + 6]).items():
                        if g in meta and not ok: bad[g] = prob or 'did not pass art review'
        return bad
    bad = qa(list(codes))
    print('genmotion QA: failed', len(bad), 'of', len(codes))
    MAX_REDO = 12
    if len(bad) > MAX_REDO:      # crashes/empties first, then the rest in order
        keep = sorted(bad, key=lambda g: (0 if 'crashed' in bad[g] else 1, g))[:MAX_REDO]
        bad = {g: bad[g] for g in keep}
    if bad:
        fixjobs = [(g, meta[g]['lang'], meta[g]['theme'], meta[g]['brief'], meta[g]['sentence'], meta[g]['dur'], meta[g]['words'],
                    meta[g]['vertical'], meta[g]['others'], prob, codes[g]) for g, prob in bad.items()]
        for g in bad: codes.pop(g)
        run(fixjobs)
        fixed = [g for g in bad if g in codes]
        for g in fixed: _write(g, codes[g])
        for g, e in _syntax(fixed).items():
            if e: codes.pop(g, None)
        still_bad = qa([g for g in fixed if g in codes], vision=False)
        for g in still_bad: codes.pop(g, None)
    # final: failed shots -> the kit fallback scene (hero + key words in the style pack); never an AI drawing
    for g, m in meta.items():
        if g not in codes:
            b = m['b']; b['text'] = b.get('text') or ' '.join((b.get('see') or m['sentence']).split()[:4])
    for f in GEN_DIR.glob('g_*.tsx'):
        if f.stem not in codes: f.unlink()
    _index(sorted(codes))
    save(gdir / 'done.json', codes)
    for g, c in codes.items():
        (gdir / f'{g}.tsx').write_text(c)
        ev = _sfx(c, meta[g]['dur'])
        if ev: meta[g]['b']['sfx_events'] = ev
    save(ep_dir / 'episode.json', ep)
    print(f'genmotion: {len(codes)} new animations in the video, {len(meta) - len(codes)} use the kit fallback')
    return len(codes)


def stage(ep_dir):
    """Before the real render: put this episode's components back into render/src/gen (resume-safe)."""
    gdir = ep_dir / 'gen'
    codes = load(gdir / 'done.json', {})
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    for f in GEN_DIR.glob('g_*.tsx'): f.unlink()
    for g, c in codes.items(): _write(g, c)
    _index(sorted(codes))
