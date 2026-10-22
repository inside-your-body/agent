"""Topic scout: once a week, look at what health videos are actually getting views on YouTube right now
and add fresh, high-curiosity topics to the bank (owner's own topics always stay first)."""
import datetime as dt, json, re
from .common import ROOT, load, save
from . import llm

SEEDS = ["what happens to your body when", "what happens inside your body", "what happens if you", "body explained animation",
         "how your body", "why does your body", "every body explained", "hour by hour body", "what if you never",
         "the real reason you", "science of your brain", "how a disease spreads", "what happens when you get sick",
         "weird body facts", "health myths explained", "your body on",
         "silently in your body", "starts silently", "hidden inside your body", "you didn't know your body", "slowly damaging your body"]
EVERY_DAYS = 7

def _videos(yt, queries):
    since = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=365)).strftime('%Y-%m-%dT%H:%M:%SZ')
    ids = {}
    for q in queries:
        r = yt.search().list(part='snippet', q=q, type='video', order='viewCount', maxResults=25,
                             relevanceLanguage='en', publishedAfter=since).execute()
        for i in r.get('items', []): ids[i['id']['videoId']] = q
    out = []
    vids = list(ids)
    for k in range(0, len(vids), 50):
        r = yt.videos().list(part='snippet,statistics,contentDetails', id=','.join(vids[k:k + 50])).execute()
        for v in r.get('items', []):
            m = re.search(r'(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$', v['contentDetails'].get('duration', 'PT0S'))
            sec = int(m[1] or 0) * 3600 + int(m[2] or 0) * 60 + int(m[3] or 0)
            pub = dt.datetime.fromisoformat(v['snippet']['publishedAt'].replace('Z', '+00:00'))
            days = max(1, (dt.datetime.now(dt.timezone.utc) - pub).days)
            views = int(v['statistics'].get('viewCount', 0))
            out.append({'title': v['snippet']['title'], 'channel': v['snippet']['channelTitle'], 'views': views,
                        'views_per_day': round(views / days), 'minutes': round(sec / 60, 1)})
    return sorted(out, key=lambda x: -x['views_per_day'])

def run(force=False):
    state = load(ROOT / 'data/scout.json', {})
    last = state.get('last_run')
    if last and not force and (dt.datetime.utcnow() - dt.datetime.fromisoformat(last)).days < EVERY_DAYS:
        return
    from .youtube import client
    yt = client()
    n = state.get('seed_i', 0)
    queries = [SEEDS[(n + i) % len(SEEDS)] for i in range(6)]          # ~600 quota units per run
    vids = _videos(yt, queries)[:120]
    topics = load(ROOT / 'data/topics.json')
    existing = [t['title'] for t in topics]
    res = llm.ask_json(f"""You run topic research for "Inside Your Body", an English animated health-curiosity channel
(we EXPLAIN what happens inside the body — never preach or tell people what to do; no kids content).
Here are videos getting the most views per day on YouTube right now (title, channel, views/day, minutes):
{json.dumps(vids, ensure_ascii=False)}

Our existing topics (do not repeat or closely duplicate): {json.dumps(existing, ensure_ascii=False)}

Find what health/body themes and title patterns are pulling views (ignore music, games, kids, religion, non-health).
OUR OWN DATA (Oct 2026): our best video by far was 'How Kidney Stones Start Silently' (64% of viewers watched to the end, double the revenue) — HIDDEN / SILENT processes inside the body ('X starts silently', 'what is slowly happening inside you', 'the hidden damage of Y') beat everything else. Prefer those angles. US/Canada/UK viewers bring most of the revenue: pick topics they search.
Topics that already pulled millions of views are the best bets: propose 6 NEW topics that are our own version of those proven ideas (same curiosity, our story angle, never a copy), each with a curiosity-gap title (not copied from any video), a story angle
for an 8–9 minute animated story, a format (timeline|journey|mystery|compilation|outbreak|habit|signs) and the evidence.
Return JSON: {{"trends": "2-3 sentences", "topics": [{{"title": str, "angle": str, "format": str, "evidence": str}}]}}""",
        max_tokens=6000)
    low = {t.lower() for t in existing}
    new = [t for t in res.get('topics', []) if t.get('title') and t['title'].lower() not in low]
    nid = max([t['id'] for t in topics if isinstance(t.get('id'), int)] + [0]) + 1
    # insert after the owner's own topics, before the rest of the bank
    pos = max([i for i, t in enumerate(topics) if t.get('source') == 'user' and t['status'] != 'done'] + [
        max([i for i, t in enumerate(topics) if t['status'] == 'done'] + [-1])]) + 1
    for k, t in enumerate(new):
        topics.insert(pos + k, {'id': nid + k, 'title': t['title'], 'angle': t.get('angle'), 'format': t.get('format'),
                                'status': 'todo', 'source': 'scout', 'evidence': t.get('evidence')})
    if not any(t['status'] == 'next' for t in topics):
        nxt = next((t for t in topics if t['status'] == 'todo'), None)
        if nxt: nxt['status'] = 'next'
    save(ROOT / 'data/topics.json', topics)
    state.update({'last_run': dt.datetime.utcnow().isoformat(timespec='seconds'), 'seed_i': (n + 6) % len(SEEDS),
                  'last_trends': res.get('trends'), 'last_added': [t['title'] for t in new]})
    save(ROOT / 'data/scout.json', state)
    print('scout added:', [t['title'] for t in new])
