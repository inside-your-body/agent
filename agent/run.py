"""Episode pipeline: topic -> research -> script -> style -> voice -> visuals -> render -> audio -> thumbnail -> upload."""
import argparse, datetime as dt, json, os
from .common import ROOT, WORK, load, save, sh, CFG
from . import llm, tts, timing

def pick_topic():
    topics = load(ROOT / 'data/topics.json')
    t = next((x for x in topics if x['status'] == 'next'), None) or next(x for x in topics if x['status'] == 'todo')
    return t

def mark_done(topic_id, entry):
    topics = load(ROOT / 'data/topics.json')
    for x in topics:
        if x['id'] == topic_id: x['status'] = 'done'
    nxt = next((x for x in topics if x['status'] == 'todo'), None)
    if nxt: nxt['status'] = 'next'
    save(ROOT / 'data/topics.json', topics)
    h = load(ROOT / 'data/history.json'); h['episodes'].append(entry)
    h['used_styles'] += [entry.get('style'), entry.get('short_style')]
    save(ROOT / 'data/history.json', h)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='build everything, do not upload')
    ap.add_argument('--topic', default=None)
    a = ap.parse_args()

    # run daily via cron, but only make an episode every ~2 days
    h = load(ROOT / 'data/history.json')
    last = max((e.get('built_at') for e in h['episodes'] if e.get('built_at')), default=None)
    if last and not a.topic and not a.dry_run:
        gap = (dt.datetime.utcnow() - dt.datetime.fromisoformat(last)).total_seconds() / 3600
        if gap < CFG['schedule']['min_hours_between_episodes']:
            print(f'last episode {gap:.0f} h ago -> skip today'); return
    topic = {'id': None, 'title': a.topic} if a.topic else pick_topic()
    ep_dir = WORK / dt.datetime.utcnow().strftime('%Y%m%d'); ep_dir.mkdir(parents=True, exist_ok=True)
    print('== topic:', topic['title'])

    # 1. research + script
    ep = load(ep_dir / 'episode.json')
    if not ep:
        notes = llm.research(topic['title']); (ep_dir / 'research.md').write_text(notes)
        ep = llm.write_episode(topic['title'], notes); save(ep_dir / 'episode.json', ep)

    # 2. style (Pinterest board refs -> new style spec, never one of the last used)
    from . import styles
    style = styles.choose(topic['title'], ep, load(ROOT / 'data/history.json')['used_styles'], ep_dir)
    short_style = styles.choose(topic['title'] + ' short', ep, load(ROOT / 'data/history.json')['used_styles'] + [style['id']], ep_dir, vertical=True)

    # 3. voice (fixed narrator) + word timings
    for kind, lines in (('long', [s for sc in ep['scenes'] for s in sc['narration']]), ('short', ep['short']['narration'])):
        wav = ep_dir / f'vo_{kind}.wav'
        if not wav.exists():
            segs = tts.synth_lines(lines, wav); save(ep_dir / f'segs_{kind}.json', segs)
            save(ep_dir / f'words_{kind}.json', timing.words(wav))

    # 4. illustrations + thumbnail art
    from . import assets
    assets.build(ep, style, ep_dir)

    # 5. render long + short, 6. audio mix, 7. QA
    from . import render, audio, qa
    long_mp4 = render.render(ep, style, ep_dir, kind='long')
    short_mp4 = render.render(ep, short_style, ep_dir, kind='short')
    long_final = audio.finish(long_mp4, ep_dir, 'long', style)
    short_final = audio.finish(short_mp4, ep_dir, 'short', short_style)
    qa.check(long_final, ep_dir, 'long'); qa.check(short_final, ep_dir, 'short')
    thumb = assets.thumbnail(ep, style, ep_dir)

    # 8. upload package
    from . import package
    pkg = package.build(ep, ep_dir)
    if a.dry_run:
        print('dry run: outputs in', ep_dir); return

    from . import youtube
    yt = youtube.client()
    at = youtube.publish_time(CFG['schedule']['publish_long_utc'])
    vid = youtube.upload(yt, long_final, pkg['title'], pkg['description'], pkg['tags'], thumb, publish_at=at)
    youtube.add_to_playlist(yt, vid)
    sdesc = pkg['short_description'].replace('{FULL_URL}', 'https://youtu.be/' + vid)
    svid = youtube.upload(yt, short_final, pkg['short_title'], sdesc, pkg['tags'][:10],
                          publish_at=youtube.publish_time(CFG['schedule']['publish_short_utc']))
    try:
        youtube.pin_comment_text(yt, vid, pkg['pinned_comment'])
    except Exception as e:
        print('comment not posted (will work once public):', e)
    mark_done(topic['id'], {'topic': topic['title'], 'video_id': vid, 'short_id': svid,
                            'style': style['id'], 'short_style': short_style['id'], 'publish_at': at,
                            'built_at': dt.datetime.utcnow().isoformat(timespec='seconds')})
    save(ep_dir / 'result.json', {'video': vid, 'short': svid, 'publish_at': at, 'pinned_comment': pkg['pinned_comment']})
    print('DONE', vid, svid, at)

if __name__ == '__main__':
    main()
