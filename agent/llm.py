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
    return ask_json(prompt, image_url=url, max_tokens=600)

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
 "scenes": [ {"id": "s1", "part": "hook|problem|explain|solution|wrap", "title": str,   // chapter title, 2-5 words
   "narration": [str, ...],                       // short spoken sentences
   "beats": [ {"at": int,                         // index of the narration sentence this visual starts on
      "kind": "cartoon|kinetic|illustration|stickman|body|icon|counter|timeline|chart|split|checklist|quote",
      "text": str,                                // on-screen words (max 6), keyword UPPERCASE allowed
      "value": str|null,                          // counter: number with unit e.g. "7,000+" "50%"; body: organ name;
                                                  // stickman: pose idle|walk|run|happy|sad|point|think|tired|drink; quote: source
      "items": [str]|null,                        // timeline steps (max 6) / checklist (max 5) / split [left,right] / chart ["Label:123", ...]
      "illustration": str|null,                   // illustration: prompt for ONE cut-out subject (transparent bg)
                                                  // cartoon: prompt for a FULL 2D cartoon scene with background (what we see, action, setting)
      "cast": [str]|null,                         // ids of cast characters appearing in this illustration/cartoon
      "motion": str|null                          // illustration: walk-in|bounce|float|shake|pop ; cartoon: push|pan-left|pan-right|zoom-out|shake
   } ] } ],
 "short": {"narration": [str, ...], "beats": [same as above]},
 "upload": {"title": str, "description": str, "tags": [str], "hashtags": [str], "pinned_comment": str,
            "short_title": str, "short_description": str},
 "thumbnail": {"image_prompt": str, "big_text": str, "small_text": str},
 "sources": [{"title": str, "url": str}]
}"""

def write_episode(topic, notes, angle=None):
    return ask_json(f"""You are the head writer of the YouTube channel "Inside Your Body".
Follow these channel rules exactly:
{RULES}

Topic: "{topic}"
{('Story angle: ' + angle) if angle else ''}
Research notes (only use facts from here):
{notes}

Write the full episode as a cartoon story with a recurring cast.
Narration must total 1500–1600 words (our narrator reads ~2.9 words/s → ≈ 8:30–9:10). Count carefully: under 1480 words is a failure.
Use 10–14 scenes. Every scene needs 3–8 beats so the visuals change every 6–12 seconds; the first beat of every scene has "at": 0.
Visual mix: "cartoon" full scenes with the cast for exactly 10–12 key story moments; "illustration" cut-outs (often a cast member with a motion)
for 6–8 moments; the rest kinetic, body, counter, chart, timeline, split, checklist, stickman (no kind more than 35% of beats).
"body" when an organ is discussed; numbers from research go in "counter" or "chart".
On-screen "text" is short (max 7 words) and never just repeats the whole sentence. Mark 1 key word per text in CAPS.
Explain what happens — never lecture or tell the viewer what to do.
Then write the Short (115–135 words, ≈ 40–46 s; loops back to its first line; it may use up to 3 "cartoon" beats) and the upload package.
The description must include a "Chapters" section using the placeholder {{CHAPTERS}} which the system fills in.
Schema (comments after // are explanations, do not output them):
{EPISODE_SCHEMA}""", max_tokens=40000)

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
open loops that carry viewers to the next scene. You may add 1–3 new scenes. Add beats for the new sentences ("at" = sentence index in that scene)
so visuals still change every 6–12 seconds; reuse the existing cast ids for cartoon/illustration beats. Total narration MUST be at least {target} words.""", max_tokens=32000)
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
