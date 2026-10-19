"""Claude API: research + episode writing (structured JSON)."""
import json, os, re, time, requests
from .common import CFG, ROOT

API = 'https://api.anthropic.com/v1/messages'

_MODEL = None
def model():
    """Use the configured model if it exists, else the newest Sonnet available to this key."""
    global _MODEL
    if _MODEL: return _MODEL
    want = CFG['models']['claude']
    try:
        r = requests.get('https://api.anthropic.com/v1/models?limit=100', headers={'x-api-key': os.environ['ANTHROPIC_API_KEY'],
                         'anthropic-version': '2023-06-01'}, timeout=30).json()
        ids = [m['id'] for m in r.get('data', [])]
        _MODEL = want if want in ids else next((i for i in ids if 'sonnet' in i), ids[0] if ids else want)
    except Exception as e:
        print('model list failed', e); _MODEL = want
    print('claude model:', _MODEL)
    return _MODEL

def ask(prompt, system='', max_tokens=16000, web_search=False, retries=4, image_url=None):
    headers = {'x-api-key': os.environ['ANTHROPIC_API_KEY'], 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}
    content = prompt
    if image_url:   # download ourselves (Pinterest blocks Anthropic's URL fetcher via robots.txt) and send base64
        import base64 as _b64
        ir = requests.get(image_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30); ir.raise_for_status()
        mt = ir.headers.get('content-type', 'image/jpeg').split(';')[0]
        if mt not in ('image/jpeg', 'image/png', 'image/gif', 'image/webp'): mt = 'image/jpeg'
        content = [{'type': 'image', 'source': {'type': 'base64', 'media_type': mt, 'data': _b64.b64encode(ir.content).decode()}}, {'type': 'text', 'text': prompt}]
        retries = 1
    body = {'model': model(), 'max_tokens': max_tokens, 'system': system, 'messages': [{'role': 'user', 'content': content}]}
    if web_search:
        body['tools'] = [{'type': 'web_search_20250305', 'name': 'web_search', 'max_uses': 8}]
    # Sonnet 5.5 thinks by default and thinking counts toward max_tokens -> keep it minimal.
    # Try the lowest setting first; fall back for models that don't know these fields.
    variants = [{'thinking': {'type': 'between_tools'}, 'output_config': {'effort': 'medium'}},
                {'output_config': {'effort': 'low'}}, {}]
    for a in range(retries):
        try:
            for v in variants:
                b = {**body, **v}
                r = requests.post(API, headers=headers, json=b, timeout=900)
                if r.status_code == 400 and any(k in r.text for k in ('thinking', 'output_config', 'effort')):
                    print('param not accepted:', r.text[:200]); continue
                break
            r.raise_for_status()
            j = r.json()
            txt = ''.join(b.get('text', '') for b in j.get('content', []) if b.get('type') == 'text')
            from . import cost; cost.claude(j.get('usage'))
            print(f"claude: stop={j.get('stop_reason')} usage={j.get('usage')} blocks={[b.get('type') for b in j.get('content', [])]} chars={len(txt)}", flush=True)
            return txt
        except Exception as e:
            resp = getattr(e, 'response', None)
            print('claude error', e, resp.text[:300] if resp is not None else ''); time.sleep(10 * (a + 1))
    raise RuntimeError('Claude API failed')

def _repair(txt):
    txt = re.sub(r'^```(?:json)?|```$', '', txt.strip(), flags=re.M)
    i, j = txt.find('{'), txt.rfind('}')
    if i < 0 or j < 0: return None
    t = txt[i:j + 1]
    for cand in (t, re.sub(r',\s*([}\]])', r'\1', re.sub(r'(?m)^\s*//.*$|(?<=[,\[{])\s*//[^\n]*', '', t))):
        try: return json.loads(cand)
        except Exception as e: err = e
    print('json parse error', err)
    return None

def ask_json(prompt, **kw):
    from .common import WORK
    for a in range(3):
        txt = ask(prompt + '\n\nReturn ONLY one valid JSON object (no comments, no markdown fences, no text before or after).', **kw)
        obj = _repair(txt)
        if obj is not None: return obj
        kw['max_tokens'] = min(64000, int(kw.get('max_tokens', 16000) * 1.5))
        (WORK / f'raw_fail_{a}.txt').write_text(txt or '<empty>')
        print('bad JSON, first chars:', (txt or '')[:300].replace('\n', ' '))
    raise RuntimeError('no JSON from Claude')

def ask_json_image(url, prompt):
    return ask_json(prompt, image_url=url, max_tokens=3000)

RULES = (ROOT / 'config/rules.md').read_text()

def research(topic):
    return ask(f"""Research the YouTube health topic: "{topic}".
Use web search. Collect 12–20 accurate, specific, surprising facts with numbers and timelines, each with its source
(WHO, CDC, NHS, NIH/PubMed, Mayo Clinic, major journals). Focus on WHAT HAPPENS inside the body step by step
(a timeline: seconds, minutes, hours, days), which organs/cells/molecules are involved, the most surprising moments,
common myths, and everyday situations the viewer recognises. Output as a compact bullet list with URLs.""", web_search=True, max_tokens=6000)

EPISODE_SCHEMA = """{
 "title": str, "angle": str,
 "cast": [ {"id": str, "name": str, "look": str} ],  // 2-4 recurring cartoon characters: usually one named human + body agents
                                                  // (pill hero, white blood cell guard, virus villain, liver worker...).
                                                  // "look": precise visual description (shape, colours, face, outfit) reused in every image
 "scenes": [ {"id": "s1", "part": "hook|situation|journey|climax|resolution", "title": str,   // chapter title, 2-5 words
   "narration": [str, ...] } ],                   // short spoken sentences (one idea each)
 "short": {"narration": [str, ...]},
 "upload": {"title": str, "description": str, "tags": [str], "hashtags": [str], "pinned_comment": str,
            "short_title": str, "short_description": str},
 "thumbnail": {"image_prompt": str, "line1": str, "line2": str,   // line1+line2 = one plain sentence that names the topic and makes people curious,
                                                  // e.g. "WHAT AN IV DRIP" / "DOES INSIDE YOU"; max 4 words per line
   "variants": [ {"image_prompt": str, "line1": str, "line2": str} ] },  // exactly 2 alternative thumbnails with a DIFFERENT concept each
                                                  // (e.g. extreme close-up of the body part with a shocking detail / a character's shocked
                                                  // reaction / before-vs-after split) and different wording, for A/B testing
 "sources": [{"title": str, "url": str}]
}"""

WORDS_MIN, WORDS_MAX = 1200, 1320   # ≈ 8:30–9:15 with pauses (analytics: 10:50 was too long for our retention)

HOOK_RULES = """OPENING = the first 30 seconds (analytics: this is where we lose 1/3 of viewers). The hook scene has 5–7 short sentences:
- Sentence 1 is a COLD OPEN in the middle of the most surprising, most visual moment of the whole story (no "hi", no "in this video", no definition).
- Sentences 2–3 turn it into a burning question the viewer needs answered.
- By ~20 seconds, promise the payoff concretely ("by the end, you'll know exactly where that smell is coming from — and it's not where you think").
- No background, history, definitions or statistics before 0:30. Every sentence must be instantly visual."""

SEO_RULES = """SEARCH (analytics: viewers find us with concrete searches like "tonsil stones", "first cigarette"):
- upload.title contains the exact phrase people type into YouTube search for this topic, front-loaded, ≤ 60 characters, still a plain clear question/statement.
- The first 5 tags are exact search phrases people type (short, lowercase); then related phrases (15–20 tags total).
- The first line of the description repeats the main search phrase naturally."""

def write_episode(topic, notes, angle=None):
    return ask_json(f"""You are the head writer of the YouTube channel "Inside Your Body".
Follow these channel rules exactly:
{RULES}

Topic: "{topic}"
{('Story angle: ' + angle) if angle else ''}
Research notes (only use facts from here):
{notes}

Write the full episode as a cartoon story with a recurring cast, told by a narrator.
Narration must total {WORDS_MIN}–{WORDS_MAX} words (≈ 8:30–9 minutes with pauses). Count carefully.
{HOOK_RULES}
{SEO_RULES}
Use 10–14 scenes of 6–14 sentences. Every sentence must be something we can SHOW: an action, a place, a change, a number, a character.
Max 8 numbers in the whole script; round them and make them vivid ("enough tubes to circle the Earth twice").
Re-hook the viewer every 40–60 seconds with an open loop. Explain what happens — never lecture or tell the viewer what to do.
Then write the Short (115–135 words, ≈ 45–50 s; the single most surprising moment told as a mini story; the second-to-last line sends
viewers to the full episode ("the whole story is in the full video, linked above"); the last line loops into the first)
and the upload package. The description must include a "Chapters" section using the placeholder {{CHAPTERS}} which the system fills in.
Schema (comments after // are explanations, do not output them):
{EPISODE_SCHEMA}""", max_tokens=30000)

def edit_episode(ep, notes):
    """Retention editor: rewrites weak sentences, keeps facts and length."""
    out = ask_json(f"""You are the retention editor of a top animated science YouTube channel ("Inside Your Body").
Rules: {RULES}
Here is the draft script (JSON). Improve it for watch-time WITHOUT changing the facts:
{HOOK_RULES}
- Every 40–60 s add/strengthen an open loop ("but at hour six, something strange happens...").
- Replace dry or list-like sentences with story beats: characters doing things, vivid comparisons, sensory details.
- Remove preaching or advice. Remove filler. Keep sentences short and spoken.
- Keep scene ids/titles, keep total words between {WORDS_MIN} and {WORDS_MAX}.
- Make thumbnail line1/line2 a plain sentence naming the topic + curiosity (max 4 words per line); keep 2 "variants" with different concepts.
- Short: keep the second-to-last line pointing to the full episode and the loop back to the first line.
Research notes for fact-checking: {notes[:6000]}
Draft: {json.dumps({k: ep[k] for k in ('title', 'scenes', 'short', 'thumbnail', 'cast')}, ensure_ascii=False)}
Return JSON with the same keys: {{"title", "scenes", "short", "thumbnail", "cast"}}.""", max_tokens=30000)
    for k in ('scenes', 'short', 'thumbnail', 'cast', 'title'):
        if out.get(k): ep[k] = out[k]
    return ep

SHOT_CATALOG = """Shot kinds (pick the one that literally SHOWS what the sentence says):
- cartoon: a hand-drawn 2D storyboard frame of exactly this moment (AI drawing made from "see"). fields: illustration (detailed drawing prompt
  = the storyboard frame: setting, characters, action, emotion, what body part/object is shown), cast [ids], motion push|pan-left|pan-right|zoom-out|shake,
  focus center|left|right|top|bottom (where the camera drifts), text (short caption or null),
  params {overlay: {particles: particle type drifting over the frame | null, arrow: left|right|up|down|null, label: short label for the arrow | null, counter: "value" | null}}.
- illustration: a cast character cut-out in a NEW pose/expression for this moment (AI drawing). fields: illustration (character + pose + action + emotion), cast [ids],
  motion walk-in|bounce|float|shake|pop, text.
- slam: 1-4 big words slammed on the exact words the narrator says. params {words:[...], highlight: index, ghost: optional big faded number}. Max 20% of shots.
- type: typewriter question with floating symbols. params {text, symbol: "?"|"!"|"Z"}. For questions/mysteries.
- counter: a number counting up on cue. params {value: "60,000"|"75%"|"3 h", label, style: odometer|gauge|slam, cue: word}. Max 10%.
- meter: HUD bars filling/draining. params {title, bars:[{label, from:0-100, to:0-100, good:bool, cue}]}.
- vessel: inside a blood vessel, things flowing. params {particles:[rbc|water|virus|bacteria|pill|sugar|fat|oxygen|smoke|alcohol|protein|platelet|wbc|toxin|drug], flow: slow|normal|fast|stopped, blockage: 0-1 (plaque narrowing), cue, label}.
- heart: animated heart. params {mode: beat|squeeze|race|attack|stop, cue, label}.
- organ: one organ close-up doing something. params {organ: brain|lungs|liver|stomach|kidney|intestine|tooth|tongue|bone|eye|skin|bladder,
  action: glow|pulse|breathe|damage|heal|fill|shrink|inflame|gas|bacteria|signal, cue, label}.
- membrane: a wall with gaps (capillary, gut wall, blood-brain barrier, kidney filter). params {pass: particle, block: particle, wall: capillary|gut|brain|kidney, leftLabel, rightLabel, label, cue}.
- cells: a field of cells with a wave. params {action: fill|infect|die|heal|multiply, label, cue}.
- battle: white blood cells vs invaders. params {invader: virus|bacteria|toxin, outcome: win|lose|ongoing, label, cue}.
- spread: one person infecting many (network). params {label, unit, cue}.
- clock: time jump. params {label: "HOUR 6"|"DAY 3"|"MINUTE 1", sub}.
- journey: a particle travelling through the body. params {stops:[mouth|nose|throat|brain|lungs|heart|stomach|liver|kidneys|intestine|bladder|blood|arm|skin|bones|muscles|eyes], particle, label}.
- zoom: zoom from the whole body into one spot (use when going from outside to inside). params {target, label}.
- compare: two sides with VS. params {title, left:{label, big?, particle?}, right:{label, big?, particle?, cue}}.
- list: numbered reveal (max 4). params {title, items:[{text, cue}]}.
- fact: a fact card. params {tag, text, source}.
- stickman: a stick figure in an everyday situation. value: pose idle|walk|run|happy|sad|point|think|tired|drink, text.
- chart: bars. text = title, items ["Label:123", ...].
"""

DRAWN = ('cartoon', 'illustration')
TEXT_ONLY = ('slam', 'type', 'fact', 'list', 'counter', 'meter', 'chart', 'kinetic')

def direct(ep, kind='long'):
    """Storyboard + director: for every sentence decide what we SEE (storyboard frame), then the shot that shows it."""
    if kind == 'long':
        scenes = [{'id': sc['id'], 'title': sc.get('title'), 'sentences': {i: s for i, s in enumerate(sc['narration'])}} for sc in ep['scenes']]
        rule = ('Long video: 1 shot per sentence; a long sentence may get 2 shots (second one with "cue" = the word where it starts). '
                'In this part: about 55% DRAWN shots (cartoon storyboard frames / character illustrations), the rest motion-graphics kinds '
                'that literally show the subject (organ, vessel, cells, battle, journey, heart, membrane, zoom...). Text-only kinds '
                '(slam, type, fact, list, counter, meter, chart) at most 15% of shots.')
        chunks = [scenes[k:k + 4] for k in range(0, len(scenes), 4)]
    else:
        chunks = [[{'id': 'short', 'sentences': {i: s for i, s in enumerate(ep['short']['narration'])}}]]
        rule = 'Short (vertical): EVERY sentence gets its own shot; fast and punchy; about 60% drawn shots; keep on-screen text minimal (captions are added automatically).'
    shots, used = {}, {}
    for ch in chunks:
        res = ask_json(f"""You are the storyboard artist AND motion-graphics director of an animated health channel. The viewer must SEE what the
narrator says at every moment — the story is re-built in front of them, sentence by sentence (talking about the tongue → we see a tongue;
about bacteria eating food → we see the bacteria eating). First imagine the storyboard frame for each sentence ("see"), then pick the shot.
{SHOT_CATALOG}
Rules:
- {rule}
- OPENING (hook scene / first 30 s): every shot is a drawn shot or a dramatic motion shot of the subject (no text-only kinds), the most striking image first, faster cuts (a long sentence gets 2 shots), "riser"/"impact" sfx on the reveal.
- "see" (required): one concrete sentence describing exactly what is on screen — subject, action, emotion. Never empty, never generic.
- Characters change with the story: new pose, expression, action in each drawn shot (worried, sleeping, fighting, celebrating...).
- NO REPETITION: never the same kind within 5 consecutive shots; every drawn shot is a NEW drawing (new composition, new pose/action); text-only kinds are never back to back and never longer than one sentence. Vary camera moves, layouts, actions, colours.
- NO EMPTY SCREEN: the subject the narrator names must be visible in every shot (drawn or as motion graphics).
- Kinds already used earlier in this video (avoid overusing them): {json.dumps(used)}
- On-screen text max 6 words, never the whole sentence; 1 key word in CAPS. Many drawn shots need no text at all.
- "sfx": none|whoosh|pop|impact|tick|reveal|heartbeat|drip|bubble|riser|goo|shield|sparkle — only where it helps (about 1 in 3 shots), never twice in a row.
Cast: {json.dumps(ep.get('cast', []), ensure_ascii=False)}
Script part: {json.dumps(ch, ensure_ascii=False)}
Return JSON: {{"scenes": [{{"id": scene id, "shots": [{{"at": sentence index, "cue": word or null, "see": str, "kind": str, "text": str|null,
 "params": {{}}|null, "value": str|null, "items": [str]|null, "illustration": str|null, "cast": [str]|null, "motion": str|null, "focus": str|null, "sfx": str|null}}]}}]}}""",
            max_tokens=32000)
        for sc in res.get('scenes', []):
            shots[sc['id']] = sc.get('shots', [])
            for b in shots[sc['id']]: used[b.get('kind')] = used.get(b.get('kind'), 0) + 1
    return shots

KINDS_OK = {'cartoon', 'illustration', 'slam', 'type', 'counter', 'meter', 'vessel', 'heart', 'organ', 'membrane', 'cells', 'battle', 'spread',
            'clock', 'journey', 'zoom', 'compare', 'list', 'fact', 'stickman', 'chart', 'kinetic'}

def fix_shots(shots, n_sent, recent=None):
    """Enforce: valid kinds, first shot at 0, a kind never repeats within 3 shots (across scenes via `recent`)."""
    recent = recent if recent is not None else []
    out = []
    for s_ in sorted(shots, key=lambda x: (int(x.get('at', 0) or 0))):
        s_['at'] = min(max(int(s_.get('at', 0) or 0), 0), n_sent - 1)
        if s_.get('kind') not in KINDS_OK:
            s_['kind'] = 'cartoon'
        if s_['kind'] in recent[-4:] or (s_['kind'] in TEXT_ONLY and recent and recent[-1] in TEXT_ONLY):
            # swap to a drawn storyboard frame of the same moment (keeps the subject on screen)
            alt = next((k for k in ('cartoon', 'illustration', 'organ', 'zoom') if k not in recent[-4:]), 'cartoon')
            s_['kind'] = alt
            if alt in DRAWN and not s_.get('illustration'): s_['illustration'] = s_.get('see') or s_.get('text') or ''
            if alt == 'organ': s_['params'] = {'organ': (s_.get('see') or ''), 'action': 'glow', 'label': s_.get('text')}
            if alt == 'zoom': s_['params'] = {'label': s_.get('text'), 'target': s_.get('see') or ''}
        if s_['kind'] in DRAWN and not s_.get('illustration'): s_['illustration'] = s_.get('see') or ''
        if s_.get('focus') and s_['kind'] == 'cartoon': s_['params'] = {**(s_.get('params') or {}), 'focus': s_['focus']}
        out.append(s_); recent.append(s_['kind'])
    if out and out[0]['at'] != 0: out[0]['at'] = 0
    return out

def _wc(lines):
    return sum(len(x.split()) for x in lines)

def long_words(ep):
    return _wc([s for sc in ep['scenes'] for s in sc['narration']])

def expand_long(ep, notes, target):
    """Rewrite the scenes so narration reaches `target` words, keeping style, story and beat format."""
    cur = long_words(ep)
    out = ask_json(f"""You are the head writer of "Inside Your Body". This episode script is too SHORT: {cur} words of narration.
It must reach {target}–{target + 100} words (videos must be over 8 minutes). Explain what happens; never lecture. Follow the channel rules:
{RULES}

Research notes (only use facts from here):
{notes}

Current scenes JSON:
{json.dumps(ep['scenes'], ensure_ascii=False)}

Return ONLY a JSON object {{"scenes": [...]}} with the same schema. Keep the hook and the story arc, keep scene ids/titles where possible,
but deepen every scene: add a concrete everyday example, a "what's happening inside" explanation, a surprising fact from the notes, and
open loops that carry viewers to the next scene. You may add 1–3 new scenes. Keep the cast. Total narration MUST be at least {target} words.""", max_tokens=32000)
    if out.get('scenes') and long_words(out) > cur:
        ep['scenes'] = out['scenes']
    return ep

def expand_short(ep, target_words):
    sh = ep['short']; cur = _wc(sh['narration'])
    out = ask_json(f"""This YouTube Short script for "Inside Your Body" is too short ({cur} words). Rewrite it to {target_words}–{target_words + 12} words
(40–46 seconds). Keep the hook as the first line, fast punchy sentences, and make the last line loop back into the first.
Current short JSON:
{json.dumps(sh, ensure_ascii=False)}
Return ONLY the full short JSON object with the same keys (narration list, beats with "at" sentence indexes, etc.).""", max_tokens=8000)
    if out.get('narration') and _wc(out['narration']) > cur:
        ep['short'] = {**sh, **out}
    return ep
