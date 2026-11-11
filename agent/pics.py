"""PICTURE format (owner approved Oct 31): a new picture every 3-5 s. Everyday life / people = black-and-white ink sketch with one
accent colour; inside the body = simple flat 2D in the video's palette. The palette is chosen per topic (never the same as the last
2 videos), typography rotates through 6 templates, every picture change gets a matching sound. ~$0.007 per picture (low quality)."""
import json, random, shutil
from concurrent.futures import ThreadPoolExecutor
from .common import ROOT, load, save
from . import llm, images

PALETTES = {   # bg (flat pictures + fallback), accent (badges, key words), accent2, text on accent, card behind text, ink accent for sketches
    'ocean':    dict(bg='#06263A', accent='#3DD6F5', accent2='#FF7A59', text='#04121C', card='rgba(4,24,38,0.88)', ink='deep cyan blue'),
    'sunset':   dict(bg='#2B1B3F', accent='#FF6B5B', accent2='#FFB547', text='#1B0F26', card='rgba(27,15,38,0.88)', ink='coral red'),
    'forest':   dict(bg='#0F2A1E', accent='#5BE3A8', accent2='#D4F25C', text='#08180F', card='rgba(8,24,15,0.88)', ink='emerald green'),
    'crimson':  dict(bg='#1E0B10', accent='#FF3B4E', accent2='#FFE8C2', text='#FFFFFF', card='rgba(20,6,10,0.88)', ink='crimson red'),
    'amber':    dict(bg='#1C1408', accent='#FFB300', accent2='#FF5E3A', text='#1C1408', card='rgba(24,17,6,0.88)', ink='amber orange'),
    'lavender': dict(bg='#1B1533', accent='#A78BFA', accent2='#FF8FB1', text='#120D24', card='rgba(18,13,36,0.88)', ink='violet purple'),
    'electric': dict(bg='#111418', accent='#2F80FF', accent2='#FFE14D', text='#FFFFFF', card='rgba(12,14,18,0.88)', ink='electric blue'),
    'navy':     dict(bg='#0B1220', accent='#FFD23F', accent2='#36E0D0', text='#0B1220', card='rgba(11,18,32,0.88)', ink='red'),
}
INK = ("Black-and-white ink and pencil sketch illustration, hand-drawn hatching, documentary notebook look, ONE single {ink} accent colour "
       "only on the key element, off-white paper background, clean uncluttered composition, nothing important in the bottom quarter, "
       "no text, no letters, no numbers")
FLAT = ("Simple modern flat 2D vector illustration for an adult science explainer (not childish), very few clean shapes, limited palette: "
        "background {bg}, main colours {accent} and {accent2} plus soft neutrals, clean uncluttered composition, nothing important in the "
        "bottom quarter, no text, no letters, no numbers")
SFX_FILE = {'whoosh': 'whoosh3', 'pop': 'pop2', 'ding': 'sparkle', 'tick': 'tick', 'heartbeat': 'heartbeat', 'bubble': 'bubble',
            'impact': 'impact2', 'sparkle': 'sparkle', 'reveal': 'reveal', 'bong': 'bong', 'click': 'click', 'drip': 'drip', 'goo': 'goo'}


FA_NOTE = ("""The video is in PERSIAN (Farsi). Write "picture" in ENGLISH (it goes to the image model). "words" must be 2-4 key words copied
EXACTLY from the Persian beat (Persian script, no translation, no diacritics). In "stat", "value" uses digits (e.g. "72") and "unit" is a short
PERSIAN word (e.g. "ساعت", "درصد", "روز").
""")


def choose_palette(title, recent=()):
    keys = [k for k in PALETTES if k not in list(recent)[-2:]]
    try:
        r = llm.ask_json(f"""Pick the colour palette that best fits the mood of this YouTube science video: "{title}".
Options: {json.dumps({k: {x: v[x] for x in ('bg', 'accent', 'accent2')} for k, v in PALETTES.items() if k in keys})}
Return JSON {{"palette": "<name>", "why": "<5 words>"}}""", max_tokens=300)
        if r.get('palette') in keys: return r['palette']
    except Exception as e: print('palette pick failed', e)
    return random.choice(keys)


def group(lines, min_words=9, max_words=20):
    """Merge very short sentences so a picture stays 3-5 s. Returns lists of line indexes."""
    out, cur, n = [], [], 0
    for i, ln in enumerate(lines):
        cur.append(i); n += len(ln.split())
        if n >= min_words: out.append(cur); cur, n = [], 0
    if cur:
        if out and sum(len(lines[i].split()) for i in out[-1] + cur) <= max_words: out[-1] += cur
        else: out.append(cur)
    return out


def time_groups(lines, segs, beat=4.5, min_d=3.4):
    """Owner (Nov 2026): a new picture every 4-5 s of NARRATION TIME. Short sentences are merged until >= min_d seconds; a long
    sentence is cut into several pictures (its words split evenly, timed proportionally). Returns [{'idx', 'start', 'text'}]."""
    out, cur = [], []
    def flush():
        if cur:
            out.append({'idx': list(cur), 'start': segs[cur[0]]['start'], 'text': ' '.join(lines[i] for i in cur)}); cur.clear()
    for i, ln in enumerate(lines):
        d = segs[i]['end'] - segs[i]['start']
        if d > beat + 1.6:
            flush()
            k = max(2, round(d / beat)); w = ln.split()
            for j in range(k):
                part = ' '.join(w[len(w) * j // k: len(w) * (j + 1) // k])
                if part: out.append({'idx': [i], 'start': segs[i]['start'] + d * j / k, 'text': part})
            continue
        cur.append(i)
        if segs[i]['end'] - segs[cur[0]]['start'] >= min_d: flush()
    if cur:
        if out and segs[cur[-1]]['end'] - segs[cur[0]]['start'] < 2.0 and len(out[-1]['idx']) and out[-1]['idx'][-1] == cur[0] - 1:
            out[-1]['idx'] += cur; out[-1]['text'] += ' ' + ' '.join(lines[i] for i in cur); cur.clear()
        flush()
    return out


def _plan_chunk(texts, offset, title, cast, vertical, fa=False):
    return llm.ask_json(f"""{FA_NOTE if fa else ''}You are the motion-graphics director of a premium YouTube science explainer: "{title}"{' (vertical Short)' if vertical else ''}.
Every beat gets ONE full-screen picture plus animated typography. Picture styles:
- "ink": everyday life, people, objects, places (black-and-white ink sketch, one accent colour on the key element). Recurring character: {cast}.
- "flat": anything INSIDE the body (organs, blood, cells, molecules, hormones) as simple flat 2D.
Rules: the picture literally shows what the beat says; never two pictures of the same kind in a row (no chart after chart, no two
close-ups of the same organ in a row); vary framing (close-up, wide shot, over-the-shoulder, cut-away diagram, split before/after);
charts/graphs at most 1 in 8 beats; the accent colour marks the one thing that matters.
For each beat return: "style": "ink"|"flat"; "picture": the visual idea (composition, what carries the accent colour);
"words": 2-4 punchy key words from the beat; "accent": index of the word to highlight; "stat": {{"value": "9", "unit": "DAYS"}} if the beat
says a number, else null; "sfx": one of whoosh, pop, ding, tick, heartbeat, bubble, impact, sparkle, reveal, bong, click, drip.
Beats: {json.dumps({offset + i: t for i, t in enumerate(texts)}, ensure_ascii=False)}
Return JSON {{"beats": [{{"i": int, "style": str, "picture": str, "words": [str], "accent": int, "stat": object|null, "sfx": str}}]}}""",
                        max_tokens=9000)


def plan(texts, title, vertical=False, fa=False):
    cast = llm.ask(f"""Describe in English, in one line, the recurring everyday character for the YouTube video "{title}"{' (Persian-speaking audience: an Iranian-looking person)' if fa else ''} (age, look, clothes), so a sketch
artist draws the same person every time. One line, no intro.""", max_tokens=120).strip().split('\n')[0][:200]
    out = {}
    for k in range(0, len(texts), 24):
        try:
            r = _plan_chunk(texts[k:k + 24], k, title, cast, vertical, fa)
            for b in r.get('beats', []):
                if isinstance(b, dict) and isinstance(b.get('i'), int): out[b['i']] = b
        except Exception as e: print('picture plan chunk failed', k, e)
    return [out.get(i, {}) for i in range(len(texts))], cast


import threading, time
_RATE = {'lock': threading.Lock(), 'next': 0.0}
GAP = 3.6          # OpenAI image limit is 20 pictures / minute -> one start every 3.6 s (~16-17 / min) keeps us under it


def _slot():
    with _RATE['lock']:
        now = time.time(); t = max(now, _RATE['next']); _RATE['next'] = t + GAP
    if t > now: time.sleep(t - now)


def draw(plan_beats, texts, pal, folder, vertical=False):
    folder.mkdir(parents=True, exist_ok=True)
    size = '1024x1536' if vertical else '1536x1024'
    def one(i):
        f = folder / f'p{i:03d}.jpg'
        if f.exists(): return f
        b = plan_beats[i]
        st = (FLAT.format(**pal) if b.get('style') == 'flat' else INK.format(**pal))
        png = folder / f'p{i:03d}.png'
        r = None
        for attempt in range(4):           # throttled; a rate-limit miss waits for the next minute window and tries again
            _slot()
            r = images.gen(f"{b.get('picture') or texts[i]}. {st}.", png, size=size, quality='low', retries=1)
            if r and png.exists(): break
            time.sleep(20)
        if not (r and png.exists()): return None
        from PIL import Image          # jpg keeps the work artifact small (it travels to every render shard)
        Image.open(png).convert('RGB').save(f, quality=88); png.unlink()
        return f
    with ThreadPoolExecutor(6) as ex: return list(ex.map(one, range(len(texts))))


def build_props(groups, line_segs, plan_beats, files, stages, pal_name, folder_rel, FPS=30, vertical=False, title=None, rtl=False, texts=None, starts=None):
    pal = {k: v for k, v in PALETTES[pal_name].items() if k != 'ink'}
    order = list(range(6)); random.Random(pal_name + str(len(groups))).shuffle(order)
    beats, last_tpl = [], -1
    files = list(files)
    for g in range(len(files)):         # a picture that could not be made reuses the closest one (never a blank screen)
        if not files[g]:
            files[g] = next((files[j] for j in list(range(g - 1, -1, -1)) + list(range(g + 1, len(files))) if files[j]), None)
    for g, (idx, pb, f) in enumerate(zip(groups, plan_beats, files)):
        start = 0 if g == 0 else int(round((starts[g] if starts else line_segs[idx[0]]['start']) * 30))
        tpl = order[g % 6]
        if tpl == last_tpl: tpl = order[(g + 1) % 6]
        last_tpl = tpl
        words = [w for w in (pb.get('words') or []) if isinstance(w, str)][:4] or ((texts[g].split()[:3]) if texts else [])
        stat = pb.get('stat') if isinstance(pb.get('stat'), dict) and str(pb['stat'].get('value', '')).strip() else None
        beats.append({'start': start, 'img': f'{folder_rel}/{f.name}' if f else None, 'style': pb.get('style', 'ink'),
                      'words': words, 'accent': pb.get('accent') if isinstance(pb.get('accent'), int) else -1, 'stat': stat,
                      'stage': stages[idx[0]], 'sfx': pb.get('sfx') or 'pop', 'tpl': tpl})
    total = int(round((line_segs[-1]['end'] + 1.5) * 30))
    for k, b in enumerate(beats): b['end'] = beats[k + 1]['start'] if k + 1 < len(beats) else total
    pr = {'beats': beats, 'frames': total, 'vertical': vertical, 'palette': pal, 'pic': True}
    if rtl: pr.update(rtl=True, brand='درون بدن')
    if title: pr['title'] = title
    return pr


def stage_public(ep_dir):
    """Copy this episode's pictures into render/public so Remotion can load them (needed on every render shard)."""
    src = ep_dir / 'pics'
    if not src.exists(): return
    dst = ROOT / 'render/public/pics' / ep_dir.name
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(src, dst)
