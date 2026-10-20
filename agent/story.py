"""Storyboard first (owner's workflow): script -> a storyboard for every SEQUENCE (scene), split into continuous ACTS
(2-5 sentences each) -> a creative-director review pass that fixes it against the channel rules -> the drawn assets the
storyboard asks for (character poses as cut-outs, painted backdrops) -> one continuous animation per act (genmotion).
Acts of the same sequence share and evolve the same elements, so a sequence plays like one piece, not a slideshow."""
import json, html
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, load, save
from . import llm, images

RULES = (ROOT / 'config/rules.md').read_text()
MAX_POSES, MAX_BACKDROPS = 24, 22
MAX_POSES_SHORT, MAX_BACKDROPS_SHORT = 5, 4

SCHEMA = """{"sequences": [{"scene_id": str, "idea": "the visual concept of the whole sequence in one sentence (its set, its main elements, how it evolves)",
  "acts": [{"from": first sentence index (int, in this scene), "see": "what is on screen during this act, concretely",
            "motion": "how it moves, step by step, synced to the words (what enters, transforms, reacts; camera)",
            "continuity": "which elements carry over from the previous act and how they changed",
            "text": "≤4 on-screen words or null",
            "hero": "what the hero/characters do and feel in this act (pose + mood changes), or null"}]}]}"""


def _scenes(ep, kind):
    if kind == 'long':
        return [{'id': sc['id'], 'title': sc.get('title'), 'part': sc.get('part'), 'sentences': sc['narration']} for sc in ep['scenes']]
    return [{'id': 'short', 'title': 'Short', 'sentences': ep['short']['narration']}]


def plan(ep, kind, theme):
    lang = theme.get('lang') or {}
    scenes = _scenes(ep, kind)
    rule = ('Long video: each act covers 2-4 consecutive sentences (≈8-15 s); about 3 acts per scene, 32-38 acts in total. ' if kind == 'long' else
            'Vertical Short (1080×1520 visual area): each act covers 1-3 sentences (fast), 4-7 acts in total. ')
    out = []
    chunks = [scenes[i:i + 4] for i in range(0, len(scenes), 4)] if kind == 'long' else [scenes]
    for ch in chunks:
        res = llm.ask_json(f"""You are the storyboard artist and motion director of the animated health channel "Inside Your Body".
Channel rules: {RULES}
Design language of this video: {json.dumps(lang, ensure_ascii=False)}
Style pack: "{theme.get('kit', 'flat')}". Everything is CODE-DRAWN motion graphics with the channel's puppet kit — NO painted images.
Puppets: the HERO (a cartoon person with poses stand/holdSide/doubled/point/shrug/cheer/holdHead/holdChest/holdBelly/think/drink/wave/run/tired
and moods neutral/happy/pain/shock/worried/determined), stick figures, a stone/crystal character, a kidney character; organs, cells, germs,
vessels, objects and diagrams are drawn in code in the same pack. Story cast (play them with these puppets): {json.dumps(ep.get('cast', []), ensure_ascii=False)}
Make the STORYBOARD for these sequences. {rule}
- Each sequence is ONE continuous motion-graphics piece: a set/world that the acts build on — elements stay, move, transform and react
  as the narration goes on (like a professional explainer), never a slideshow of unrelated pictures.
- Whatever the narrator names is visible at that moment (tongue → a tongue; bacteria eating → bacteria eating). Never an empty screen.
- Every act is a different composition/action from every other act in the video. Characters change pose/expression with the story.
- MOTION GRAPHICS TELL THE STORY (the channel's core): animated diagrams of the biology, shapes, particles, icons and KINETIC TYPOGRAPHY
  of key words carry the explanation. A hero / stick figures / cartoon characters appear when the topic needs them (a person, a pill hero,
  white-blood-cell guards...), acting inside the motion graphics — not as a slideshow of drawings.
- Note in "motion" the key word(s) that appear as typography and the moments that deserve a subtle sound effect.
- PATTERN INTERRUPTS in the visuals: every 60-90 s one act breaks the visual rhythm on purpose (sudden zoom 1000× into a cell, a split
  screen, a freeze-frame with a big typographic fact, a change of palette/lighting, a countdown, "myth vs fact" card) — matching the
  script's interrupt. Emotional beats get visuals that make the feeling land (awe = scale reveal, gross-out = close-up, tension = slow push-in).
- EVERY SHORT SENTENCE IS ACTED OUT on screen (e.g. "the stone moves" → it travels; "it gets stuck" → it jams and the hero doubles over).
- Acts stay short: never more than ~15 s of narration in one act.
Scenes (sentence indexes start at 0 in each scene): {json.dumps(ch, ensure_ascii=False)}
Return JSON exactly: {SCHEMA}""", max_tokens=24000)
        out += res.get('sequences', [])
    sb = {'kind': kind, 'sequences': out}
    # creative-director review: check against the rules and fix (automatic control, no human waiting)
    try:
        rev = llm.ask_json(f"""You are the creative director of "Inside Your Body". Review this storyboard against the channel rules and the
owner's instructions (continuous sequences, the subject always visible, no repeated compositions or templates, characters change,
story told visually, hook in the first 30 s, professional motion design). Fix every weak act directly (rewrite see/motion/continuity),
keep the same structure, sentence indexes and number of acts (do NOT split acts — each act spans several sentences). Rules: {RULES}
Script: {json.dumps(_scenes(ep, kind), ensure_ascii=False)}
Storyboard: {json.dumps(sb, ensure_ascii=False)}
Return the full corrected storyboard JSON in the same schema plus "review": "what you changed (2-4 sentences)".""", max_tokens=32000)
        if rev.get('sequences') and len(rev['sequences']) >= len(out) * 0.8:
            sb = {'kind': kind, 'sequences': rev['sequences'], 'review': rev.get('review')}
    except Exception as e:
        print('storyboard review failed', e)
    return sb


MAX_ACTS = {'long': 38, 'short': 7}

def _cap(sb, kind):
    """Too many acts = choppy + slow + expensive: merge neighbouring acts of a sequence until the total fits."""
    seqs = sb['sequences']
    while sum(len(q.get('acts') or []) for q in seqs) > MAX_ACTS[kind]:
        q = max(seqs, key=lambda q: len(q.get('acts') or []))
        acts = sorted(q['acts'], key=lambda a: int(a.get('from', 0) or 0))
        if len(acts) < 2: break
        j = min(range(1, len(acts)), key=lambda j: len(str(acts[j].get('see', ''))))   # merge the lightest act into its predecessor
        a, b = acts[j - 1], acts[j]
        a['see'] = f"{a.get('see', '')} Then: {b.get('see', '')}"
        a['motion'] = f"{a.get('motion', '')} Then: {b.get('motion', '')}"
        a['hero'] = ' Then: '.join(x for x in (a.get('hero'), b.get('hero')) if x) or None
        del acts[j]; q['acts'] = acts
    return sb

def apply(ep, sb, kind):
    """Turn storyboard acts into render beats (one 'gen' beat per act)."""
    sb = _cap(sb, kind)
    by = {s.get('scene_id'): s for s in sb['sequences']}
    scenes = ep['scenes'] if kind == 'long' else [ep['short']]
    ids = [sc['id'] for sc in ep['scenes']] if kind == 'long' else ['short']
    n = 0
    for sid, sc in zip(ids, scenes):
        seq = by.get(sid) or {'idea': sc.get('title', ''), 'acts': [{'from': 0, 'see': ' '.join(sc['narration'][:2]), 'motion': ''}]}
        acts = sorted(seq.get('acts') or [], key=lambda a: int(a.get('from', 0) or 0))
        beats, seen = [], set()
        for a in acts:
            at = min(max(int(a.get('from', 0) or 0), 0), len(sc['narration']) - 1)
            if at in seen: continue
            seen.add(at)
            gid = f"a_{'v' if kind == 'short' else 'l'}{n:02d}"; n += 1
            beats.append({'at': at, 'kind': 'gen', 'text': a.get('text'), 'see': a.get('see'), 'design': a.get('motion'),
                          'act': {**a, 'sequence_idea': seq.get('idea'), 'scene': sid}, 'params': {'gen': gid}})
        if not beats or beats[0]['at'] != 0:
            beats.insert(0, {'at': 0, 'kind': 'gen', 'see': seq.get('idea'), 'design': seq.get('idea'), 'act': {'see': seq.get('idea'), 'scene': sid},
                             'params': {'gen': f"a_{'v' if kind == 'short' else 'l'}{n:02d}"}}); n += 1
        sc['beats'] = beats
    return n


def _hint(style):
    art = style.get('art_style') or 'polished flat 2D vector cartoon, soft shading, bold clean outlines'
    return (f"ART STYLE (follow strictly): {art}. Texture: {(style.get('lang') or {}).get('texture', '')}. "
            f"Palette built around {style['accent']}, {style['accent2']} and {style['accent3']} on {style['bg']}")


def assets(ep, style, short_style, ep_dir):
    """Cast reference sheets, then the poses and backdrops the storyboard asked for (parallel). Fills act['assets']."""
    out = ep_dir / 'assets'; out.mkdir(exist_ok=True)
    cast = ep.get('cast') or []
    hint_l, hint_v = _hint(style), _hint(short_style)
    refs = {}
    with ThreadPoolExecutor(4) as ex:
        futs = {c['id']: ex.submit(lambda c=c: (out / f"cast_{c['id']}.png").exists() or images.cast_ref(c, hint_l, out / f"cast_{c['id']}.png")) for c in cast[:4]}
        for cid, fu in futs.items():
            try:
                if fu.result(): refs[cid] = str(out / f'cast_{cid}.png')
            except Exception as e: print('cast failed', cid, e)
    jobs = []
    for kind, scenes, hint, caps in (('long', ep['scenes'], hint_l, (MAX_POSES, MAX_BACKDROPS)),
                                     ('short', [ep['short']], hint_v, (MAX_POSES_SHORT, MAX_BACKDROPS_SHORT))):
        np_, nb = 0, 0
        for sc in scenes:
            for b in sc.get('beats', []):
                a = b.get('act') or {}; a['assets'] = []
                for p in (a.get('poses') or [])[:2]:
                    cid = p.get('cast')
                    if cid not in refs or np_ >= caps[0]: continue
                    key = f"pose_{b['params']['gen']}_{np_}.png"; np_ += 1
                    a['assets'].append({'file': 'ep/' + key, 'type': 'character cut-out (transparent PNG, square)', 'what': f"{cid}: {p.get('pose')}"})
                    jobs.append(lambda key=key, p=p, cid=cid, hint=hint: (out / key).exists() or images.sprite(p.get('pose', ''), cast, [cid], [refs[cid]], hint, out / key))
                if a.get('backdrop') and nb < caps[1]:
                    key = f"bg_{b['params']['gen']}.png"; nb += 1
                    v = kind == 'short'
                    a['assets'].append({'file': 'ep/' + key, 'type': f"painted backdrop ({'1024×1536' if v else '1536×1024'}, opaque)", 'what': a['backdrop']})
                    jobs.append(lambda key=key, a=a, v=v, hint=hint: (out / key).exists() or images.cartoon_scene(
                        'Background setting only, NO characters, leave the centre calm for animated elements: ' + a['backdrop'], cast, [], [], hint, out / key, v, 'low'))
    with ThreadPoolExecutor(4) as ex:
        ok = list(ex.map(lambda j: _safe(j), jobs))
    # drop assets that failed to generate
    for scenes in (ep['scenes'], [ep['short']]):
        for sc in scenes:
            for b in sc.get('beats', []):
                a = b.get('act') or {}
                a['assets'] = [x for x in a.get('assets', []) if (out / x['file'].split('/', 1)[1]).exists()]
    print('story assets:', sum(bool(x) for x in ok), '/', len(jobs), 'cast', len(refs))
    return refs


def _safe(fn):
    try: return fn()
    except Exception as e:
        print('asset failed', e); return False


def fallback_frames(ep, style, short_style, ep_dir, refs):
    """Acts whose animation failed QA twice: draw a new storyboard frame for them (never a template)."""
    out = ep_dir / 'assets'; cast = ep.get('cast') or []
    jobs = []
    for kind, scenes, hint in (('long', ep['scenes'], _hint(style)), ('short', [ep['short']], _hint(short_style))):
        for sc in scenes:
            for b in sc.get('beats', []):
                if b.get('kind') == 'cartoon' and not b.get('img'):
                    key = f"fb_{(b.get('params') or {}).get('gen', 'x')}.png"
                    ids = [i for i in refs][:1]
                    jobs.append((b, key, lambda b=b, key=key, v=kind == 'short', hint=hint, ids=ids:
                                 (out / key).exists() or images.cartoon_scene(b.get('illustration') or b.get('see') or '', cast, ids, [refs[i] for i in ids], hint, out / key, v, 'low')))
    with ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda j: _safe(j[2]), jobs))
    for (b, key, _), ok in zip(jobs, res):
        if ok: b['img'] = 'ep/' + key
        else: b['kind'] = 'kinetic'; b['text'] = b.get('text') or (b.get('see') or '')[:60]


def export(ep, sbs, style, ep_dir):
    """Human-readable storyboard (HTML) saved with the run outputs."""
    rows = []
    for sb in sbs:
        rows.append(f"<h2>{'Long video' if sb['kind'] == 'long' else 'Short'}</h2>")
        if sb.get('review'): rows.append(f"<p class=r><b>Director review:</b> {html.escape(sb['review'])}</p>")
        scenes = {sc['id']: sc for sc in ep['scenes']} if sb['kind'] == 'long' else {'short': ep['short']}
        for seq in sb['sequences']:
            sc = scenes.get(seq.get('scene_id'), {})
            rows.append(f"<h3>{html.escape(str(sc.get('title') or seq.get('scene_id')))}</h3><p><i>{html.escape(seq.get('idea') or '')}</i></p><ol>")
            for a in seq.get('acts', []):
                n = sc.get('narration', [])
                fr = int(a.get('from', 0) or 0)
                rows.append(f"<li><b>Narration:</b> {html.escape(n[fr] if fr < len(n) else '')}<br><b>See:</b> {html.escape(a.get('see') or '')}"
                            f"<br><b>Motion:</b> {html.escape(a.get('motion') or '')}<br><b>Continuity:</b> {html.escape(a.get('continuity') or '')}</li>")
            rows.append('</ol>')
    page = f"""<!doctype html><meta charset=utf-8><title>Storyboard — {html.escape(ep['title'])}</title>
<style>body{{font:15px/1.5 system-ui;max-width:900px;margin:30px auto;padding:0 16px}}li{{margin:10px 0}}.r{{background:#eef;padding:8px}}</style>
<h1>{html.escape(ep['title'])}</h1><p><b>Design language:</b> {html.escape(json.dumps(style.get('lang'), ensure_ascii=False))}</p>{''.join(rows)}"""
    (ep_dir / 'storyboard.html').write_text(page)
