"""Free pictures (owner, Nov 18: no OpenAI credit) — Pexels photos and Pixabay photos/illustrations, both free for commercial use
without attribution. One search per picture beat (simple English keywords from the planner), never the same picture twice in a video,
cropped to the frame. Keys: PEXELS_API_KEY, PIXABAY_API_KEY (either one is enough)."""
import io, os, threading, time, requests
from PIL import Image, ImageOps

_lock = threading.Lock()
_cache = {}


def _pexels(q, vertical):
    key = os.environ.get('PEXELS_API_KEY')
    if not key: return []
    k = ('px', q, vertical)
    if k not in _cache:
        for a in range(3):
            r = requests.get('https://api.pexels.com/v1/search', headers={'Authorization': key}, timeout=30,
                             params={'query': q, 'per_page': 20, 'orientation': 'portrait' if vertical else 'landscape'})
            if r.status_code == 429: time.sleep(20 * (a + 1)); continue
            _cache[k] = [('pexels:%s' % p['id'], p['src'].get('large2x') or p['src']['original']) for p in r.json().get('photos', [])] if r.ok else []
            break
        else: _cache[k] = []
    return _cache[k]


def _pixabay(q, vertical, kind):
    key = os.environ.get('PIXABAY_API_KEY')
    if not key: return []
    k = ('pb', q, vertical, kind)
    if k not in _cache:
        for a in range(3):
            r = requests.get('https://pixabay.com/api/', timeout=30,
                             params={'key': key, 'q': q[:100], 'image_type': kind, 'orientation': 'vertical' if vertical else 'horizontal',
                                     'safesearch': 'true', 'per_page': 30, 'order': 'popular'})
            if r.status_code == 429: time.sleep(20 * (a + 1)); continue
            _cache[k] = [('pixabay:%s' % h['id'], h.get('largeImageURL') or h['webformatURL']) for h in r.json().get('hits', [])] if r.ok else []
            break
        else: _cache[k] = []
    return _cache[k]


def _queries(q):
    w = [x for x in (q or '').replace(',', ' ').split() if x]
    out = [' '.join(w)]
    if len(w) > 2: out.append(' '.join(w[:2]))
    if len(w) > 1: out.append(w[0])
    return [x for x in dict.fromkeys(out) if x]


def find(query, vertical=False, inside=False, used=None):
    """Best unused picture URL for the query. inside=True (organs, cells...) prefers illustrations."""
    used = used if used is not None else set()
    for q in _queries(query):
        srcs = ([lambda: _pixabay(q, vertical, 'illustration'), lambda: _pexels(q, vertical), lambda: _pixabay(q, vertical, 'photo')] if inside
                else [lambda: _pexels(q, vertical), lambda: _pixabay(q, vertical, 'photo'), lambda: _pixabay(q, vertical, 'illustration')])
        for s in srcs:
            try: items = s()
            except Exception as e: print('stock search failed', q, e); items = []
            with _lock:
                for pid, url in items:
                    if pid not in used:
                        used.add(pid); return url
    return None


def fetch(url, out, vertical=False):
    W, H = (1080, 1920) if vertical else (1920, 1080)
    r = requests.get(url, timeout=60); r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert('RGB')
    ImageOps.fit(im, (W, H), Image.LANCZOS).save(out, quality=88)
    return out


def available():
    return bool(os.environ.get('PEXELS_API_KEY') or os.environ.get('PIXABAY_API_KEY'))
