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
    body = {'model': model(), 'max_tokens': max_tokens, 'system': system,
            'messages': [{'role': 'user', 'content': prompt if not image_url else
                          [{'type': 'image', 'source': {'type': 'url', 'url': image_url}}, {'type': 'text', 'text': prompt}]}]}
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
 "thumbnail": {"image_prompt": str, "line1": str, "line2": str},   // line1+line2 = one plain sentence that names the topic and makes people curious,
                                                  // e.g. "WHAT AN IV DRIP" / "DOES INSIDE YOU"; max 4 words per line
 "sources": [{"title": str, "url": str}]
}"""

WORDS_MIN, WORDS_MAX = 1350, 1500

def write_episode(topic, notes, angle=None):
    return ask_json(f"""You are the head writer of the YouTube channel "Inside Your Body".
Follow these channel rules exactly:
{RULES}

Topic: "{topic}"
{('Story angle: ' + angle) if angle else ''}
Research notes (only use facts from here):
{notes}

Write the full episode as a cartoon story with a recurring cast, told by a narrator.
Narration must total {WORDS_MIN}–{WORDS_MAX} words (our narrator reads ~2.5 words/s → ≈ 9–10 minutes). Count carefully.
Use 10–14 scenes of 6–14 sentences. Every sentence must be something we can SHOW: an action, a place, a change, a number, a character.
Max 8 numbers in the whole script; round them and make them vivid ("enough tubes to circle the Earth twice").
Re-hook the viewer every 40–60 seconds with an open loop. Explain what happens — never lecture or tell the viewer what to do.
Then write the Short (115–135 words, ≈ 45–50 s; the single most surprising moment told as a mini story; last line loops into the first)
and the upload package. The description must include a "Chapters" section using the placeholder {{CHAPTERS}} which the system fills in.
Schema (comments after // are explanations, do not output them):
{EPISODE_SCHEMA}""", max_tokens=30000)

def edit_episode(ep, notes):
    """Retention editor: rewrites weak sentences, keeps facts and length."""
    out = ask_json(f"""You are the retention editor of a top animated science YouTube channel ("Inside Your Body").
Rules: {RULES}
Here is the draft script (JSON). Improve it for watch-time WITHOUT changing the facts:
- The first 15 seconds must hook hard (a striking moment or question, no intro).
- Every 40–60 s add/strengthen an open loop ("but at hour six, something strange happens...").
- Replace dry or list-like sentences with story beats: characters doing things, vivid comparisons, sensory details.
- Remove preaching or advice. Remove filler. Keep sentences short and spoken.
- Keep scene ids/titles, keep total words between {WORDS_MIN} and {WORDS_MAX}.
- Make thumbnail line1/line2 a plain sentence naming the topic + curiosity (max 4 words per line).
Research notes for fact-checking: {notes[:6000]}
Draft: {json.dumps({k: ep[k] for k in ('title', 'scenes', 'short', 'thumbnail', 'cast')}, ensure_ascii=False)}
Return JSON with the same keys: {{"title", "scenes", "short", "thumbnail", "cast"}}.""", max_tokens=30000)
    for k in ('scenes', 'short', 'thumbnail', 'cast', 'title'):
        if out.get(k): ep[k] = out[k]
    return ep

SHOT_CATALOG = """Shot kinds (pick the one that literally SHOWS what the sentence says):
- cartoon: full 2D cartoon scene of the story (AI image). fields: illustration (scene prompt), cast [ids], motion push|pan-left|pan-right|zoom-out|shake, text (short caption or null). Max 10 per long video, 3 per Short.
- illustration: a cast character cut-out that walks in / reacts. fields: illustration (prompt: character + pose/action), cast [ids], motion walk-in|bounce|float|shake|pop, text. Max 8.
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

def direct(ep, kind='long'):
    """The director: one shot per sentence (sometimes two), chosen to SHOW exactly what is said."""
    if kind == 'long':
        script = [{'id': sc['id'], 'title': sc.get('title'), 'sentences': {i: s for i, s in enumerate(sc['narration'])}} for sc in ep['scenes']]
        rule = 'Long video: 1 shot per sentence; a long sentence may get 2 shots (second one with "cue" = the word where it starts). Very short connected sentences may share one shot.'
    else:
        script = [{'id': 'short', 'sentences': {i: s for i, s in enumerate(ep['short']['narration'])}}]
        rule = 'Short (vertical): EVERY sentence gets its own shot; fast and punchy; up to 3 cartoon shots.'
    res = ask_json(f"""You are the motion-graphics director of an animated health channel. The viewer should feel the story is being
re-built in front of them, sentence by sentence, with motion graphics, 2D drawings and typography.
{SHOT_CATALOG}
Rules:
- {rule}
- The shot must depict the sentence's concrete content (the organ, the particle, the number, the action, the character). Never a generic visual.
- Never the same kind twice in a row. Vary layouts/actions. Use cartoon/illustration of the cast at story moments (characters acting).
- On-screen text max 6 words, never the whole sentence; put 1 key word in CAPS.
- "sfx": none|whoosh|pop|impact|tick|reveal|heartbeat|drip|bubble|riser|goo|shield|sparkle — only where it helps (about 1 in 3 shots), never harsh, never twice in a row.
Cast: {json.dumps(ep.get('cast', []), ensure_ascii=False)}
Script: {json.dumps(script, ensure_ascii=False)}
Return JSON: {{"scenes": [{{"id": scene id, "shots": [{{"at": sentence index, "cue": word or null, "kind": str, "text": str|null, "params": {{}}|null,
 "value": str|null, "items": [str]|null, "illustration": str|null, "cast": [str]|null, "motion": str|null, "sfx": str|null}}]}}]}}""",
        max_tokens=32000)
    shots = {s['id']: s.get('shots', []) for s in res.get('scenes', [])}
    return shots

KINDS_OK = {'cartoon', 'illustration', 'slam', 'type', 'counter', 'meter', 'vessel', 'heart', 'organ', 'membrane', 'cells', 'battle', 'spread',
            'clock', 'journey', 'zoom', 'compare', 'list', 'fact', 'stickman', 'chart', 'kinetic'}

def fix_shots(shots, n_sent):
    """Enforce: valid kinds, first shot at 0, no same kind twice in a row, caps."""
    out = []
    for s in sorted(shots, key=lambda x: (int(x.get('at', 0) or 0))):
        s['at'] = min(max(int(s.get('at', 0) or 0), 0), n_sent - 1)
        if s.get('kind') not in KINDS_OK: s['kind'] = 'slam'; s.setdefault('params', {'words': (s.get('text') or '').split()[:3]})
        if out and out[-1]['kind'] == s['kind']:
            s['kind'] = 'slam' if s['kind'] != 'slam' else 'type'
            if s['kind'] == 'slam': s['params'] = {'words': (s.get('text') or 'WAIT').split()[:3]}
            else: s['params'] = {'text': s.get('text') or '...'}
        out.append(s)
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
