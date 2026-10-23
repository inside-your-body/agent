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
    # analyse up to 12 not-yet-analysed pins per run (cost control); give up on a pin after 2 failures
    todo = [g for g, v in refs.items() if not v.get('analysis') and v.get('fails', 0) < 2][:12]
    for g in todo:
        try:
            refs[g]['analysis'] = llm.ask_json_image(
                refs[g]['img'],
                'This is a motion-graphics / design reference. Describe its visual style for an animated health explainer. '
                'Return JSON: {"palette": [5 hex colours, background first], "dark": bool, "typography": "e.g. heavy condensed sans / rounded / serif", '
                '"motion": "how elements would animate", "mood": "3-6 words", "fit_topics": "what health topics it suits"}')
        except Exception as e:
            refs[g]['fails'] = refs[g].get('fails', 0) + 1
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
FONTS = ['anton', 'inter', 'spacemono', 'bebas', 'montserrat', 'playfair', 'poppins', 'archivoblack', 'dmserif', 'fredoka']
TRANSITIONS = ['slide', 'rise', 'zoom', 'fade', 'wipe', 'glitch', 'bounce', 'cut']
PATTERNS = ['grid', 'dots', 'halftone', 'scan', 'gradient', 'paper', 'grain']

KITS = {'flat': 'Flat 2D — bold flat colours, thick dark outlines, chunky friendly hero (owner favourite)',
        'line': 'Line Art — black ink lines on cream paper, no fills, one warm accent, elegant serif type (owner favourite)',
        'pop': 'Pop Art — yellow halftone, thick black outlines, comic bursts, loud condensed caps',
        'swiss': 'Swiss — off-white grid, black + one red, strict geometric layout, huge bold caps',
        'riso': 'Risograph — pink/teal/navy inks on paper, grain, slight misregistration, playful caps',
        'glass': 'Glassmorphism — deep purple night, frosted glass panels, glowing cyan/pink'}
KITS['maxflat'] = 'Max Flat — the channel look: flat colour backgrounds, thick dark outlines, flat fills, the signature character MAX'
KIT_W = {'maxflat': 1, 'flat': 3, 'line': 3, 'pop': 2, 'swiss': 1.5, 'riso': 1.5, 'glass': 1}
KIT_FONT = {'maxflat': 'anton', 'flat': 'poppins', 'line': 'dmserif', 'pop': 'anton', 'swiss': 'inter', 'riso': 'archivoblack', 'glass': 'montserrat'}
KIT_PAL = {'maxflat': ('#F2E1C3', '#E8D5B5', '#2B2B2B', '#B23A1C', '#2F3B52', '#6B5B45'), 'flat': ('#13233B', '#1C3150', '#F5EFE6', '#FF6B5B', '#FFC845', '#8FA3BF'), 'line': ('#F3EEE3', '#E9E2D3', '#1E1E1E', '#D9774E', '#1E1E1E', '#6B6457'),
           'swiss': ('#F4F4F0', '#E6E6E1', '#111111', '#E3241B', '#111111', '#5A5A5A'), 'pop': ('#FFD23D', '#FFB800', '#111111', '#E8263A', '#1E5BFF', '#4A3B00'),
           'riso': ('#F1E9DA', '#E8DCC6', '#2A2A6E', '#E0457A', '#00A6A6', '#5B5B8A'), 'glass': ('#1B1446', '#3B1C6B', '#FFFFFF', '#7CF3FF', '#FF7AD9', '#B9AEE0')}

def choose(topic, ep, used, ep_dir, vertical=False, avoid=None, recent_langs=None, recent_kits=None):
    import random as _r
    recent_k = [k for k in (recent_kits or []) if k][-2:] + ([avoid.get('kit')] if avoid and avoid.get('kit') else [])
    kit_cands = [k for k in KITS if k not in recent_k] or list(KITS)
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
"accent": hex|null, "accent2": hex|null, "accent3": hex|null,
"fontHead": one of {FONTS}|null, "fontBody": one of {FONTS}|null, "upper": bool|null,
"transition": one of {TRANSITIONS}|null, "pattern": one of {PATTERNS}|null,
"refs_used": [short description of the Pinterest refs whose typography/motion ideas you borrowed],
"kit": one of {json.dumps({k: KITS[k] for k in kit_cands})} — the puppet/style pack that fits THIS topic best and is most likely to hook
  viewers of viral health animations (favour flat and line, the owner's favourites, but never the same look as the previous video),
"kit_tint": {{"bg": hex|null, "bg2": hex|null, "accent": hex|null, "accent2": hex|null, "shirt": hex|null}} — optional new colours for the pack so this
  video does not look like the last one with the same pack (keep its character: line stays light paper, glass stays dark),
"lang": {{"name": "2-4 word name of this video's DESIGN LANGUAGE",
  "art_style": "how every drawing/illustration in this video looks (medium, rendering, line, shading, texture) — 1-2 sentences",
  "shape_language": "geometric / blobby / hand-cut / technical... and how organs, cells and characters are built from it",
  "line_quality": "e.g. thick wobbly ink, no outlines, thin technical lines, chalk strokes",
  "texture": "e.g. paper grain, halftone dots, glossy gradients, risograph misregistration, none",
  "motion_personality": "how things move: snappy overshoot / slow organic / stop-motion jitter / mechanical easing ...",
  "camera": "camera habits: flat 2D pans, push-ins, split screens, isometric cutaways ...",
  "typography_feel": "how the few on-screen words look and animate"}},
"why": "one sentence"}}
DESIGN LANGUAGE: invent a complete, distinctive visual language for THIS video (like a different studio made it) — inspired by the
Pinterest references and the topic. It must be clearly DIFFERENT from these recent videos' languages: {json.dumps(recent_langs or [])}
(different medium/art style, shape language, texture and motion personality — not just new colours).
{('This Short must look clearly different from the long video, which uses: ' + json.dumps({k: avoid.get(k) for k in ('id', 'fontHead', 'transition', 'pattern', 'bg', 'lang')}) + ' -> use a different fontHead, transition and design language.') if avoid else ''}
Borrow the TYPOGRAPHY and MOTION-GRAPHICS feel (font character, caps, transitions, backgrounds) from the references, not just colours.""", max_tokens=3000)
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
        for k, allowed in (('fontHead', FONTS), ('fontBody', FONTS), ('transition', TRANSITIONS), ('pattern', PATTERNS)):
            if pick.get(k) in allowed: theme[k] = pick[k]
        if isinstance(pick.get('upper'), bool): theme['upper'] = pick['upper']
    lang = (pick or {}).get('lang') if isinstance((pick or {}).get('lang'), dict) else None
    theme['lang'] = lang or {'name': theme['id'], 'art_style': 'polished flat 2D vector cartoon with soft shading and bold clean outlines',
                             'motion_personality': 'snappy with soft overshoot'}
    theme['art_style'] = theme['lang'].get('art_style')
    if avoid:   # guarantee the Short differs from the long video
        if theme.get('fontHead') == avoid.get('fontHead'):
            theme['fontHead'] = random.choice([f for f in ('anton', 'bebas', 'archivoblack', 'fredoka', 'poppins', 'playfair') if f != avoid.get('fontHead')])
        if theme.get('transition') == avoid.get('transition'):
            theme['transition'] = random.choice([x for x in TRANSITIONS if x not in (avoid.get('transition'), 'cut')])
    # puppet-kit style pack — POV FLAT format (owner, Oct 23): always the Max Flat pack
    kit = 'maxflat'
    if kit not in KITS:
        kit = _r.choices(kit_cands, weights=[KIT_W[k] for k in kit_cands])[0]
    bg, bg2, fg, acc, acc2, mut = KIT_PAL[kit]
    theme.update(kit=kit, bg=bg, bg2=bg2, fg=fg, accent=acc, accent2=acc2, accent3=acc2 if acc2 != fg else acc, muted=mut,
                 fontHead=KIT_FONT[kit], fontBody='inter' if kit != 'line' else 'dmserif', upper=kit in ('pop', 'swiss', 'riso', 'maxflat'))
    tint = (pick or {}).get('kit_tint') if isinstance((pick or {}).get('kit_tint'), dict) else {}
    tint = {k: v for k, v in tint.items() if k in ('bg', 'bg2', 'accent', 'accent2', 'shirt') and isinstance(v, str) and re.fullmatch(r'#[0-9A-Fa-f]{6}', v)}
    if kit == 'maxflat': tint = {}           # the flat format keeps one consistent channel look
    if tint:
        t2 = {**theme, **{k: v for k, v in tint.items() if k != 'shirt'}}
        if contrast(fg, t2['bg']) >= 7 and contrast(t2['accent'], t2['bg']) >= 2.6 and contrast(mut, t2['bg']) >= 3:
            theme.update({k: v for k, v in tint.items() if k != 'shirt'}); theme['kitTint'] = tint
    lang_ = dict(theme.get('lang') or {})
    lang_['art_style'] = KITS[kit] + ' — everything drawn in code with the channel puppet kit, no painted images'
    theme['lang'] = lang_; theme['art_style'] = lang_['art_style']
    save(ep_dir / f"style_{'short' if vertical else 'long'}.json", {**theme, 'why': (pick or {}).get('why'), 'refs_used': (pick or {}).get('refs_used')})
    print('style:', theme['id'], 'kit:', theme['kit'], theme.get('kitTint') or '')
    return theme
