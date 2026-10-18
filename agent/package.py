"""Upload package: chapters from real scene timings, description, tags, hashtags."""
from .common import load, save

def _ts(s):
    s = int(s); return f'{s // 60:02d}:{s % 60:02d}' if s < 3600 else f'{s // 3600}:{(s % 3600) // 60:02d}:{s % 60:02d}'

def build(ep, ep_dir):
    segs = load(ep_dir / 'segs_long.json')
    up = ep['upload']
    chapters, si = [], 0
    for sc in ep['scenes']:
        t = 0 if si == 0 else segs[si]['start']
        title = sc.get('title') or sc.get('part', '').title()
        if not chapters or t - chapters[-1][0] >= 15:
            chapters.append((t, title))
        si += len(sc['narration'])
    chapters[0] = (0, chapters[0][1])
    chap = '\n'.join(f'{_ts(t)} {name}' for t, name in chapters)
    desc = up['description']
    desc = desc.replace('{CHAPTERS}', chap) if '{CHAPTERS}' in desc else desc + '\n\nChapters\n' + chap
    if ep.get('sources') and 'Sources' not in desc:
        desc += '\n\nSources\n' + '\n'.join(f"- {s['title']}: {s['url']}" for s in ep['sources'][:8])
    tags = list(dict.fromkeys([t.strip() for t in up.get('tags', []) if t.strip()]))
    total = 0; keep = []
    for t in tags:
        if total + len(t) + 2 > 480: break
        keep.append(t); total += len(t) + 2
    hashtags = ' '.join('#' + h.lstrip('#') for h in up.get('hashtags', [])[:5])
    if hashtags and not any(('#' + h.lstrip('#')).lower() in desc.lower() for h in up.get('hashtags', [])[:2]): desc += '\n\n' + hashtags
    pkg = {'title': up['title'][:100], 'description': desc[:4900], 'tags': keep,
           'short_title': (up.get('short_title') or up['title'])[:95] + ('' if '#Shorts' in up.get('short_title', '') else ' #Shorts'),
           'short_description': (up.get('short_description') or '') + '\n\nFull episode: {FULL_URL}' + ('' if '#' in (up.get('short_description') or '') else '\n\n' + hashtags),
           'pinned_comment': up.get('pinned_comment', '')}
    save(ep_dir / 'package.json', pkg)
    return pkg
