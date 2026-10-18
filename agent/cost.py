"""Per-episode cost log (estimates from API usage numbers) -> WORK/cost.json."""
import json
from .common import WORK

# USD per 1M tokens (update if prices change)
CLAUDE = {'in': 3.0, 'out': 15.0, 'cache_read': 0.3, 'search_each': 0.01}
IMAGE = {'text_in': 5.0, 'image_in': 10.0, 'out': 40.0}

def _log():
    p = WORK / 'cost.json'
    try: return json.loads(p.read_text())
    except Exception: return {'claude_usd': 0.0, 'images_usd': 0.0, 'claude_calls': 0, 'images': 0, 'items': []}

def _save(d):
    d['total_usd'] = round(d['claude_usd'] + d['images_usd'], 3)
    WORK.mkdir(parents=True, exist_ok=True); (WORK / 'cost.json').write_text(json.dumps(d, indent=1))

def claude(usage):
    if not usage: return
    d = _log()
    c = (usage.get('input_tokens', 0) * CLAUDE['in'] + usage.get('output_tokens', 0) * CLAUDE['out']
         + usage.get('cache_read_input_tokens', 0) * CLAUDE['cache_read']) / 1e6
    c += (usage.get('server_tool_use') or {}).get('web_search_requests', 0) * CLAUDE['search_each']
    d['claude_usd'] = round(d['claude_usd'] + c, 4); d['claude_calls'] += 1; _save(d)

def image(usage, label):
    d = _log(); c = 0.0
    if usage:
        det = usage.get('input_tokens_details') or {}
        c = (det.get('text_tokens', 0) * IMAGE['text_in'] + det.get('image_tokens', 0) * IMAGE['image_in']
             + usage.get('output_tokens', 0) * IMAGE['out']) / 1e6
    d['images_usd'] = round(d['images_usd'] + c, 4); d['images'] += 1
    d['items'].append({'img': label, 'usd': round(c, 4)}); _save(d)
