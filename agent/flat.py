"""POV FLAT format (owner's choice, Oct 2026) — the visual system of every video:
- The viewer is "you"; the channel's signature character MAX plays "you" (character sheet: assets/cast/max_sheet.png).
- Beats are one of: 'max' (a MAX pose cut-out + kinetic key words), 'prop' (1-2 object cut-outs + key words),
  'motion' (a brand-new code-drawn motion-graphics animation of the subject, by genmotion, in the same flat look).
- One flat background colour per beat, NO camera zoom; the layout is deterministic (character zone / text zone),
  so the character is always complete and words never touch the character.
- Cut-outs live in a growing LIBRARY (assets/cast/poses, assets/props, data/library.json) and are reused across videos;
  each video only generates the few poses/objects it is missing (cost control).
"""
import json, shutil
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, WORK, load, save
from . import llm, images
from .cutout import trim, touches_edge

SHEET = ROOT / 'assets/cast/max_sheet.png'
LIB = ROOT / 'data/library.json'
NEWLIB = WORK / 'newlib'              # new cut-outs made in this run (carried by the work artifact, merged into the repo at finish)
MAX_NEW_POSES, MAX_NEW_PROPS = 12, 16
MAX_MOTION = {'long': 24, 'short': 4}
PALETTE = {'cream': '#F2E1C3', 'sand': '#E8D5B5', 'pink': '#F7D9D0', 'blue': '#DDEBF2', 'mint': '#DDF0E3', 'lilac': '#E9E0F3',
           'peach': '#FBE3CF', 'night': '#1F2A44', 'deep': '#2E1F3B'}
DARK = {'night', 'deep'}
LOOK = ("Simple flat 2D cartoon exactly in the style of the reference character sheet: thick clean dark outlines, flat colours, minimal shading. "
        "Fully transparent background: no backdrop, no floor, no shadow, no frame, no text. The WHOLE subject is inside the image with generous "
        "empty margin on every side (nothing touches or is cut by the image edges).")
MAX = ("MAX from the reference sheet (oversized round head, dot eyes, thick expressive eyebrows, messy dark-brown hair, mustard-yellow hoodie, "
       "dark jeans, white sneakers) — keep him EXACTLY the same, full body from the top of his hair to his shoes. ")

RULES = """VISUAL SYSTEM (POV FLAT): MAX plays "you". For EVERY sentence choose one beat:
- "max": MAX acts the sentence (pose from the library, or a NEW pose described precisely: body action + facial expression + any small object he holds).
- "prop": the object/organ the sentence names, as 1-2 simple flat objects (from the library or NEW, e.g. "a glass of water", "a red blood cell").
- "motion": the PROCESS the sentence explains, as a professional custom motion-graphics animation (e.g. the stone sliding down the
  narrow ureter and jamming, crystals locking together layer by layer, a heart pumping, acid melting enamel). Use it for every key
  process and every number/comparison. Never people in motion beats (people = "max" beats).
Rules: about 45% max, 30% motion, 25% prop; never the same pose twice in a row and no pose more than 3 times in a video; vary the
background colour (cream, sand, pink, blue, mint, lilac, peach; night/deep for night or dramatic moments); "keys" = 1-4 key words
from the sentence (what the viewer must remember; the last one is highlighted); "fx" adds a small code-drawn effect next to MAX
(pain, shock, sweat, idea, question, zzz, heart, none)."""

SCHEMA = """{"beats": [{"scene_id": str, "at": sentence index in the scene (int), "type": "max"|"prop"|"motion",
  "pose": library pose name or null, "new_pose": "precise description" or null,
  "props": [library prop name or "NEW: precise description"], "keys": [str], "fx": str, "bg": colour name,
  "design": "for motion beats: what the animation shows and how it moves, synced to the words"}]}"""


def library():
    lib = load(LIB, {'poses': {}, 'props': {}})
    for kind in ('poses', 'props'):                 # include cut-outs made earlier in this run (resume-safe)
        for k, v in (load(NEWLIB / 'library.json', {}).get(kind) or {}).items():
            lib[kind].setdefault(k, v)
    return lib


def _file(kind, name):
    for base in (NEWLIB / kind, ROOT / ('assets/cast/poses' if kind == 'poses' else 'assets/props')):
        p = base / f'{name}.png'
        if p.exists(): return p
    return None


def plan(ep, kind):
    """One beat per sentence (POV flat). Writes ep beats; returns the asset requests."""
    lib = library()
    scenes = ([{'id': sc['id'], 'sentences': sc['narration']} for sc in ep['scenes']] if kind == 'long'
              else [{'id': 'short', 'sentences': ep['short']['narration']}])
    chunks = [scenes[i:i + 4] for i in range(0, len(scenes), 4)] if kind == 'long' else [scenes]
    out = []
    for ch in chunks:
        res = llm.ask_json(f"""You are the storyboard director of the animated health channel "Inside Your Body".
{RULES}
Pose library (reuse whenever one fits): {json.dumps({k: v['desc'] for k, v in lib['poses'].items()}, ensure_ascii=False)}
Prop library (reuse whenever one fits): {json.dumps({k: v['desc'] for k, v in lib['props'].items()}, ensure_ascii=False)}
{'Vertical Short: punchy, motion beats only for the single most striking process (max 4).' if kind == 'short' else ''}
Make exactly one beat for EVERY sentence of these scenes (sentence indexes start at 0 in each scene):
{json.dumps(ch, ensure_ascii=False)}
Return JSON exactly: {SCHEMA}""", max_tokens=16000)
        out += res.get('beats', [])
    return _apply(ep, kind, out, lib)


def _slug(s, n=4):
    import re
    return '_'.join(re.findall(r'[a-z]+', s.lower())[:n]) or 'x'


def _apply(ep, kind, raw, lib):
    scenes = ep['scenes'] if kind == 'long' else [ep['short']]
    ids = [sc['id'] for sc in ep['scenes']] if kind == 'long' else ['short']
    by = {}
    for b in raw:
        by.setdefault(b.get('scene_id') if kind == 'long' else 'short', []).append(b)
    req = {'poses': {}, 'props': {}}
    n_motion, last_pose, pose_count, n = 0, None, {}, 0
    for sid, sc in zip(ids, scenes):
        got = {int(b.get('at', -1)): b for b in by.get(sid, []) if str(b.get('at', '')).lstrip('-').isdigit()}
        beats = []
        for at, sent in enumerate(sc['narration']):
            b = got.get(at) or {'type': 'prop' if at % 2 else 'max', 'keys': sent.split()[:2], 'bg': 'cream', 'fx': 'none'}
            t = b.get('type')
            if t == 'motion' and n_motion >= MAX_MOTION[kind]: t = 'prop' if b.get('props') else 'max'
            keys = [str(k).upper() for k in (b.get('keys') or [])][:4] or [w.upper() for w in sent.split()[:2]]
            bg = b.get('bg') if b.get('bg') in PALETTE else 'cream'
            params = {'bg': PALETTE[bg], 'ink': '#FFFFFF' if bg in DARK else '#2B2B2B', 'keys': keys, 'fx': b.get('fx') or 'none',
                      'side': 'left' if n % 2 == 0 else 'right', 'cast': [], 'props': []}
            gid = f"a_{'v' if kind == 'short' else 'l'}{n:02d}"; n += 1
            if t == 'motion':
                n_motion += 1
                beats.append({'at': at, 'kind': 'gen', 'see': b.get('design') or sent, 'design': b.get('design') or sent, 'text': ' '.join(keys),
                              'act': {'see': b.get('design') or sent, 'motion': b.get('design') or sent, 'scene': gid, 'text': ' '.join(keys)},
                              'params': {'gen': gid, 'flat_fallback': params}})
                continue
            if t == 'max':
                pose = b.get('pose') if b.get('pose') in lib['poses'] else None
                if not pose and b.get('new_pose'):
                    pose = 'max_' + _slug(b['new_pose'])
                    if pose not in lib['poses'] and len(req['poses']) < MAX_NEW_POSES: req['poses'][pose] = b['new_pose']
                    elif pose not in lib['poses']: pose = None
                if pose and (pose == last_pose or pose_count.get(pose, 0) >= 3):
                    pose = next((p for p in lib['poses'] if p != last_pose and pose_count.get(p, 0) < 3), None)
                if pose:
                    params['cast'] = [pose]; last_pose = pose; pose_count[pose] = pose_count.get(pose, 0) + 1
            for p in (b.get('props') or [])[:2]:
                p = str(p)
                if p in lib['props']: params['props'].append(p)
                elif p.upper().startswith('NEW:') or p not in lib['props']:
                    desc = p.split(':', 1)[1].strip() if ':' in p else p
                    name = 'prop_' + _slug(desc)
                    if name in lib['props']: params['props'].append(name)
                    elif len(req['props']) < MAX_NEW_PROPS or name in req['props']: req['props'][name] = desc; params['props'].append(name)
            beats.append({'at': at, 'kind': 'flat', 'params': params})
        sc['beats'] = beats
    return req


def make_assets(req, ep_dir):
    """Generate missing cut-outs (regenerated once when the figure is cut by the image edge), then copy every used one to ep_dir/assets."""
    (NEWLIB / 'poses').mkdir(parents=True, exist_ok=True); (NEWLIB / 'props').mkdir(parents=True, exist_ok=True)
    newlib = load(NEWLIB / 'library.json', {'poses': {}, 'props': {}})
    jobs = [('poses', k, v) for k, v in req['poses'].items() if not _file('poses', k)] + \
           [('props', k, v) for k, v in req['props'].items() if not _file('props', k)]
    def one(j):
        kind, name, desc = j
        raw = ep_dir / f'raw_{name}.png'
        for attempt in range(2):
            prompt = LOOK + ' ' + (MAX + 'MAX ' + desc if kind == 'poses' else 'Object: ' + desc) + \
                     (' Leave even more empty space around it.' if attempt else '')
            images.edit(prompt, [str(SHEET)], raw, size='1024x1536' if kind == 'poses' else '1024x1024', transparent=True, quality='medium')
            if raw.exists() and not touches_edge(raw): break
        if not raw.exists(): return None
        ar = trim(raw, NEWLIB / kind / f'{name}.png', max_h=900 if kind == 'poses' else 700)
        return kind, name, {'desc': desc, 'ar': ar}
    with ThreadPoolExecutor(5) as ex:
        for r in ex.map(one, jobs):
            if r: newlib[r[0]][r[1]] = r[2]
    save(NEWLIB / 'library.json', newlib)
    print('flat assets: new', {k: len(v) for k, v in newlib.items()}, 'requested', {k: len(v) for k, v in req.items()})


def resolve(ep, ep_dir):
    """Turn cast/prop names into staged files + aspect ratios inside every flat beat (and gen fallbacks)."""
    lib = library(); out = ep_dir / 'assets'; out.mkdir(exist_ok=True)
    def conv(params):
        for key, kind in (('cast', 'poses'), ('props', 'props')):
            items = []
            for name in params.get(key) or []:
                if isinstance(name, dict): items.append(name); continue
                f = _file(kind, name)
                if not f or name not in lib[kind]: continue
                shutil.copy(f, out / f'{kind}_{name}.png')
                items.append({'src': f'ep/{kind}_{name}.png', 'ar': lib[kind][name]['ar']})
            params[key] = items
    for sc in ep['scenes'] + [ep['short']]:
        for b in sc.get('beats', []):
            if b.get('kind') == 'flat': conv(b['params'])
            elif (b.get('params') or {}).get('flat_fallback'): conv(b['params']['flat_fallback'])


def merge_library():
    """finish stage: copy this run's new cut-outs into the repo library (committed with data/)."""
    new = load(NEWLIB / 'library.json')
    if not new: return
    lib = load(LIB, {'poses': {}, 'props': {}})
    for kind, dst in (('poses', ROOT / 'assets/cast/poses'), ('props', ROOT / 'assets/props')):
        dst.mkdir(parents=True, exist_ok=True)
        for k, v in (new.get(kind) or {}).items():
            f = NEWLIB / kind / f'{k}.png'
            if f.exists():
                shutil.copy(f, dst / f.name); lib[kind][k] = v
    save(LIB, lib)
    print('library:', {k: len(v) for k, v in lib.items()})
