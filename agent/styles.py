"""Visual style per episode.
Base themes live in config/styles.json. Pinterest refs (public RSS feeds) are analysed once by Claude vision
and stored in data/refs.json. For each episode Claude picks a base theme that was not used recently and may
re-tint it using ideas from the refs; colours are validated for contrast before use."""
import json, random, re, xml.etree.ElementTree as ET
import requests
from .common import ROOT, CFG, load, save
from . import llm

BASE = json.loads((ROOT / 'config/styles.json').read_text())
REFS = ROOT / 'data/refs.json'

# ---------- Pinterest RSS ----------
def fetch_refs():
    refs = load(REFS, {})
    new = []
    for url in CFG.get('pinterest', {}).get('feeds', []):
        try:
            x = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30).text
            for it in ET.fromstring(x).iter('item'):
                guid = (it.findtext('guid') or '').strip()
                desc = it.findtext('description') or ''
                m = re.search(r'src="(https://i\.pinimg\.com/[^"]+)"', desc)
                if guid and m and guid not in refs:
                    img = re.sub(r'/\d+x/', '/474x/', m.group(1))
                    refs[guid] = {'img': img, 'title': (it.findtext('title') or '').strip()}
                    new.append(guid)
        except Exception as e:
            print('pinterest feed error', url, e)
    # analyse up to 12 new pins per run (cost control)
    for g in new[:12]:
        try:
            refs[g]['analysis'] = llm.ask_json_image(
                refs[g]['img'],
                'This is a motion-graphics / design reference. Describe its visual style for an animated health explainer. '
                'Return JSON: {"palette": [5 hex colours, background first], "dark": bool, "typography": "e.g. heavy condensed sans / rounded / serif", '
                '"motion": "how elements would animate", "mood": "3-6 words", "fit_topics": "what health topics it suits"}')
        except Exception as e:
            print('ref analysis failed', e)
    save(REFS, refs)
    return refs

# ---------- contrast check ----------
def _lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast(a, b):
    la, lb = sorted([_lum(a), _lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)

def _valid(t):
    try:
        return contrast(t['fg'], t['bg']) >= 7 and contrast(t['accent'], t['bg']) >= 2.6 and contrast(t['muted'], t['bg']) >= 3
    except Exception:
        return False

# ---------- choose ----------
def choose(topic, ep, used, ep_dir, vertical=False):
    recent = [u for u in used if u][-5:]
    candidates = [k for k in BASE if k not in [r.split('+')[0] for r in recent]] or list(BASE)
    refs = {}
    try:
        refs = fetch_refs()
    except Exception as e:
        print('refs unavailable', e)
    analysed = [r['analysis'] for r in refs.values() if r.get('analysis')]
    random.shuffle(analysed)
    pick = None
    try:
        pick = llm.ask_json(f"""Pick the visual style for a {'vertical YouTube Short' if vertical else '16:9 YouTube video'} about "{topic}".
Base themes (choose one id from this list only): {json.dumps({k: BASE[k]['mood'] for k in candidates})}
Design references the channel owner saved on Pinterest (use them as inspiration for colours/mood): {json.dumps(analysed[:8])}
You may re-tint the chosen theme: return replacement hex colours ONLY if they keep strong contrast
(fg on bg ≥ 7:1, accent on bg ≥ 3:1). Return JSON: {{"base": id, "bg": hex|null, "bg2": hex|null, "fg": hex|null, "muted": hex|null,
"accent": hex|null, "accent2": hex|null, "accent3": hex|null, "why": "one sentence"}}""", max_tokens=800)
    except Exception as e:
        print('style pick failed', e)
    base_id = pick.get('base') if pick and pick.get('base') in candidates else random.choice(candidates)
    theme = dict(BASE[base_id]); theme['id'] = base_id
    if pick:
        tinted = dict(theme)
        for k in ('bg', 'bg2', 'fg', 'muted', 'accent', 'accent2', 'accent3'):
            v = pick.get(k)
            if isinstance(v, str) and re.fullmatch(r'#[0-9A-Fa-f]{6}', v): tinted[k] = v
        if tinted != theme and _valid(tinted):
            theme = tinted; theme['id'] = base_id + '+tint'
    save(ep_dir / f"style_{'short' if vertical else 'long'}.json", {**theme, 'why': (pick or {}).get('why')})
    print('style:', theme['id'])
    return theme
