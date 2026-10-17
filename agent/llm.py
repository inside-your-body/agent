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
    # keep extended thinking off/small: it otherwise eats the whole output budget and truncates the JSON
    body['thinking'] = {'type': 'disabled'}
    for a in range(retries):
        try:
            r = requests.post(API, headers=headers, json=body, timeout=900)
            if r.status_code == 400 and 'thinking' in r.text and body.get('thinking', {}).get('type') == 'disabled':
                print('thinking:disabled not accepted, using a small thinking budget'); body['thinking'] = {'type': 'enabled', 'budget_tokens': 2048}
                if body['max_tokens'] <= 2048: body['max_tokens'] = 4096
                r = requests.post(API, headers=headers, json=body, timeout=900)
            r.raise_for_status()
            j = r.json()
            txt = ''.join(b.get('text', '') for b in j.get('content', []) if b.get('type') == 'text')
            print(f"claude: stop={j.get('stop_reason')} usage={j.get('usage')} blocks={[b.get('type') for b in j.get('content', [])]} chars={len(txt)}", flush=True)
            return txt
        except Exception as e:
            print('claude error', e, getattr(e, 'response', None) and e.response.text[:300]); time.sleep(10 * (a + 1))
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
(WHO, CDC, NHS, NIH/PubMed, Mayo Clinic, major journals). Also list common myths, everyday situations the viewer
recognises, and safe practical solutions. Output as a compact bullet list with URLs.""", web_search=True, max_tokens=6000)

EPISODE_SCHEMA = """{
 "title": str, "angle": str,
 "scenes": [ {"id": "s1", "part": "hook|problem|explain|solution|wrap", "title": str,   // chapter title, 2-5 words
   "narration": [str, ...],                       // short spoken sentences
   "beats": [ {"at": int,                         // index of the narration sentence this visual starts on
      "kind": "kinetic|illustration|stickman|body|icon|counter|timeline|chart|split|checklist|quote",
      "text": str,                                // on-screen words (max 6), keyword UPPERCASE allowed
      "value": str|null,                          // counter: number with unit e.g. "7,000+" "50%"; body: organ name;
                                                  // stickman: pose idle|walk|run|happy|sad|point|think|tired|drink; quote: source
      "items": [str]|null,                        // timeline steps (max 6) / checklist (max 5) / split [left,right] / chart ["Label:123", ...]
      "illustration": str|null                    // short prompt for a flat 2D illustration (transparent bg) if needed
   } ] } ],
 "short": {"narration": [str, ...], "beats": [same as above]},
 "upload": {"title": str, "description": str, "tags": [str], "hashtags": [str], "pinned_comment": str,
            "short_title": str, "short_description": str},
 "thumbnail": {"image_prompt": str, "big_text": str, "small_text": str},
 "sources": [{"title": str, "url": str}]
}"""

def write_episode(topic, notes):
    return ask_json(f"""You are the head writer of the YouTube channel "Inside Your Body".
Follow these channel rules exactly:
{RULES}

Topic: "{topic}"
Research notes (only use facts from here):
{notes}

Write the full episode. Narration must total 1250–1350 words (≈ 8:15 at our narrator speed).
Use 9–13 scenes. Every scene needs 3–8 beats so the visuals change every 6–12 seconds; the first beat of every scene has "at": 0.
Mix beat kinds (no kind more than 30% of beats). Use "illustration" for 8–12 key moments (characters, organs, objects, situations);
"body" when an organ is discussed; "stickman" for everyday human situations; numbers from research go in "counter" or "chart".
On-screen "text" is short (max 7 words) and never just repeats the whole sentence. Mark 1 key word per text in CAPS.
Then write the Short (95–120 words, loops back to its first line) and the upload package.
The description must include a "Chapters" section using the placeholder {{CHAPTERS}} which the system fills in.
Schema (comments after // are explanations, do not output them):
{EPISODE_SCHEMA}""", max_tokens=32000)
