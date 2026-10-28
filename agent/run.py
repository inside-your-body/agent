"""Episode pipeline: topic -> research -> script -> style -> voice -> visuals -> render -> audio -> thumbnail -> upload."""
import argparse, datetime as dt, json, os
from .common import ROOT, WORK, load, save, sh, CFG
from . import llm, tts, timing

def pick_topic():
    topics = load(ROOT / 'data/topics.json')
    if CFG.get('format') == 'tl':      # timeline format: owner's own topics, then adaptations of proven viral videos
        tl_ = lambda x: x.get('format') == 'timeline'
        t = next((x for x in topics if x['status'] == 'next' and tl_(x)), None) or next((x for x in topics if x['status'] == 'todo' and tl_(x)), None) \
            or next((x for x in topics if x['status'] in ('next', 'todo') and x.get('source') == 'user'), None)
        if t: return t
    t = next((x for x in topics if x['status'] == 'next'), None) or next(x for x in topics if x['status'] == 'todo')
    return t

def mark_done(topic_id, entry):
    topics = load(ROOT / 'data/topics.json')
    for x in topics:
        if x['id'] == topic_id: x['status'] = 'done'
    if not any(x['status'] == 'next' for x in topics):
        nxt = next((x for x in topics if x['status'] == 'todo'), None)
        if nxt: nxt['status'] = 'next'
    save(ROOT / 'data/topics.json', topics)
    h = load(ROOT / 'data/history.json'); h['episodes'].append(entry)
    h['used_styles'] += [entry.get('style'), entry.get('short_style')]
    h.setdefault('used_kits', []).append(entry.get('kit'))
    h.setdefault('used_langs', []).extend([x for x in (entry.get('lang'), entry.get('short_lang')) if x])
    if entry.get('music'): h.setdefault('used_music', []).append(entry['music'])
    save(ROOT / 'data/history.json', h)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='build everything, do not upload')
    ap.add_argument('--topic', default=None)
    ap.add_argument('--stage', default='all', choices=['all', 'build', 'finish'],
                    help='build = everything up to the render (then shards render in parallel); finish = concat parts + audio + upload')
    a = ap.parse_args()
    cur = load(WORK / 'current.json', {})
    if a.stage == 'finish' and cur:
        return finish_from(cur, a)

    # run daily via cron, but only make an episode every ~2 days
    h = load(ROOT / 'data/history.json')
    last = max((e.get('built_at') for e in h['episodes'] if e.get('built_at')), default=None)
    if last and not a.topic and not a.dry_run:
        gap = (dt.datetime.utcnow() - dt.datetime.fromisoformat(last)).total_seconds() / 3600
        if gap < CFG['schedule']['min_hours_between_episodes']:
            print(f'last episode {gap:.0f} h ago -> skip today'); return
    if not a.topic:
        try:
            from . import scout
            if CFG.get('format') == 'tl': scout.run_viral()   # keep >= 4 viral-adapted timeline topics in the bank
            else: scout.run()          # weekly: refresh topic bank from what's getting views now
        except Exception as e:
            print('scout skipped:', e)
    if a.topic and a.topic.strip().isdigit():          # pick a topic from the bank by its number (keeps its angle/format)
        topic = next((t for t in load(ROOT / 'data/topics.json') if str(t.get('id')) == a.topic.strip()), None) or pick_topic()
    else:
        topic = {'id': None, 'title': a.topic} if a.topic else pick_topic()
    ep_dir = WORK / dt.datetime.utcnow().strftime('%Y%m%d'); ep_dir.mkdir(parents=True, exist_ok=True)
    if CFG.get('format') == 'tl':
        save(WORK / 'current.json', {'dir': ep_dir.name, 'topic': topic, 'format': 'tl'})
        return run_tl(a, topic, ep_dir)
    save(WORK / 'current.json', {'dir': ep_dir.name, 'topic': topic})
    run_episode(a, topic, ep_dir)

def finish_from(cur, a):
    if cur.get('format') == 'tl':
        return run_tl(a, cur['topic'], WORK / cur['dir'])
    run_episode(a, cur['topic'], WORK / cur['dir'])

def _at(hhmm, days=0):
    from . import youtube
    if not days: return youtube.publish_time(hhmm)
    h, m = map(int, hhmm.split(':'))
    t = (dt.datetime.utcnow() + dt.timedelta(days=days)).replace(hour=h, minute=m, second=0, microsecond=0)
    return t.isoformat() + 'Z'

SHORT_SLOTS = [('20:30', 0), ('20:00', 1)]   # owner (Oct 25): 2 Shorts — one with the episode, one the next day (23:00 Istanbul)

def run_tl(a, topic, ep_dir):
    from . import tl, package, audio, shard
    print('== topic (timeline format):', topic['title'])
    if a.stage != 'finish':
        tl.build(topic, ep_dir)
        if a.stage == 'build':
            print('build stage done:', ep_dir); return
    ep = load(ep_dir / 'episode.json')
    shard.concat(ep_dir)
    long_final, shorts, track = tl.finish(ep, ep_dir)
    pkg = package.build(ep, ep_dir)
    credit = audio.credit(track)
    pkg['description'] = (pkg['description'] + '\n\n' + credit)[:4900]
    tags = ' '.join('#' + h.lstrip('#') for h in ep['upload'].get('hashtags', [])[:3])
    spk = []
    for k, f, st in shorts:
        s = ep['shorts'][k]
        import re as _re
        title = _re.sub(r'\s*#shorts\b', '', (s.get('title') or ep['upload']['title']), flags=_re.I).strip()[:90]
        spk.append({'k': k, 'file': str(f), 'title': title + ' #Shorts',
                    'description': s['lines'][0]['text'] + '\n\nThe full timeline: {FULL_URL}\n\n' + tags + '\n\n' + audio.credit(st)})
    pkg['shorts'] = spk; save(ep_dir / 'package.json', pkg)
    if a.dry_run:
        print('dry run: outputs in', ep_dir); return
    from . import youtube
    yt = youtube.client()
    for old in [x for x in os.environ.get('REPLACE_IDS', '').replace(',', ' ').split() if x]:
        try: yt.videos().delete(id=old).execute(); print('deleted old upload', old)
        except Exception as e: print('could not delete', old, e)
    at = youtube.publish_time(CFG['schedule']['publish_long_utc'])
    thumb = ep_dir / 'thumbnail.jpg'
    vid = youtube.upload(yt, long_final, pkg['title'], pkg['description'], pkg['tags'], thumb if thumb.exists() else None, publish_at=at, synthetic=True)
    try: youtube.add_to_playlist(yt, vid)
    except Exception as e: print('playlist', e)
    sids = []
    for j, s in enumerate(spk):
        hhmm, days = SHORT_SLOTS[j % len(SHORT_SLOTS)]
        try:
            svid = youtube.upload(yt, s['file'], s['title'], s['description'].replace('{FULL_URL}', 'https://youtu.be/' + vid), pkg['tags'][:10],
                                  publish_at=_at(hhmm, days), synthetic=True)
            sids.append(svid)
            try: youtube.pin_comment_text(yt, svid, 'The full timeline is here: https://youtu.be/' + vid)
            except Exception as e: print('short comment not posted:', e)
        except Exception as e: print('short upload failed', j, e)
    try: youtube.pin_comment_text(yt, vid, pkg['pinned_comment'])
    except Exception as e: print('comment not posted (will work once public):', e)
    mark_done(topic['id'], {'topic': topic['title'], 'video_id': vid, 'short_ids': sids, 'publish_at': at, 'format': 'tl', 'music': track,
                            'built_at': dt.datetime.utcnow().isoformat(timespec='seconds')})
    save(ep_dir / 'result.json', {'video': vid, 'shorts': sids, 'publish_at': at, 'pinned_comment': pkg['pinned_comment']})
    print('DONE', vid, sids, at)

def run_episode(a, topic, ep_dir):
    print('== topic:', topic['title'])

    # 1. research + script
    ep = load(ep_dir / 'episode.json')
    notes = (ep_dir / 'research.md').read_text() if (ep_dir / 'research.md').exists() else ''
    if not ep:
        notes = llm.research(topic['title']); (ep_dir / 'research.md').write_text(notes)
        ep = llm.write_episode(topic['title'], notes, ' | '.join(x for x in (topic.get('angle'), topic.get('format') and 'format: ' + topic['format']) if x)); save(ep_dir / 'episode.json', ep)
        ep = llm.edit_episode(ep, notes); save(ep_dir / 'episode.json', ep)          # retention editor pass
        for _ in range(2):   # length guard
            if llm.long_words(ep) >= llm.WORDS_MIN - 60: break
            print('script too short:', llm.long_words(ep), 'words -> expanding')
            ep = llm.expand_long(ep, notes, llm.WORDS_MIN + 40); save(ep_dir / 'episode.json', ep)
        if llm._wc(ep['short']['narration']) < 110:
            ep = llm.expand_short(ep, 120); save(ep_dir / 'episode.json', ep)
        print('words: long', llm.long_words(ep), 'short', llm._wc(ep['short']['narration']))

    # 2. style (Pinterest board refs -> new style spec, never one of the last used)
    from . import styles
    hist = load(ROOT / 'data/history.json')
    style = load(ep_dir / 'style_long.json') if (ep_dir / 'style_long.json').exists() and load(ep_dir / 'style_long.json').get('kit') else \
        styles.choose(topic['title'], ep, hist['used_styles'], ep_dir, recent_langs=hist.get('used_langs', [])[-8:], recent_kits=hist.get('used_kits', []))
    short_style = load(ep_dir / 'style_short.json') if (ep_dir / 'style_short.json').exists() and load(ep_dir / 'style_short.json').get('kit') else \
        styles.choose(topic['title'] + ' short', ep, hist['used_styles'] + [style['id']], ep_dir, vertical=True, avoid=style,
                      recent_langs=hist.get('used_langs', [])[-8:] + [style.get('lang')], recent_kits=hist.get('used_kits', []))

    # 3. voice (fixed narrator) + word timings
    def voice(kind):
        lines = [s for sc in ep['scenes'] for s in sc['narration']] if kind == 'long' else ep['short']['narration']
        groups = [len(sc['narration']) for sc in ep['scenes']] if kind == 'long' else [len(lines)]
        wav = ep_dir / f'vo_{kind}.wav'
        if not wav.exists():
            segs = tts.synth_lines(lines, wav, groups=groups); save(ep_dir / f'segs_{kind}.json', segs)
            save(ep_dir / f'words_{kind}.json', timing.words(wav))
        return load(ep_dir / f'segs_{kind}.json')[-1]['end']
    need_long = CFG['long_video']['min_seconds'] - 7 + 5      # end card adds 7 s; keep 5 s margin
    need_short = CFG['short']['min_seconds'] - 0.4
    for kind, need in (('long', need_long), ('short', need_short)):
        for attempt in range(3):
            vo = voice(kind)
            print(f'voice {kind}: {vo:.1f}s (need {need:.0f}s)')
            if vo >= need or attempt == 2: break
            if kind == 'long':
                rate = llm.long_words(ep) / vo
                ep = llm.expand_long(ep, notes, int(need * rate * 1.06))
            else:
                rate = llm._wc(ep['short']['narration']) / vo
                ep = llm.expand_short(ep, int(need * rate * 1.08) + 4)
            save(ep_dir / 'episode.json', ep)
            for f in (f'vo_{kind}.wav', f'segs_{kind}.json', f'words_{kind}.json'):
                (ep_dir / f).unlink(missing_ok=True)

    # 3b. POV FLAT storyboard (owner, Oct 23): one beat per sentence — MAX pose / objects / custom motion graphics
    from . import flat, genmotion, assets
    if not ep.get('flat_planned'):
        reqs = {'poses': {}, 'props': {}}
        for kind in ('long', 'short'):
            r = flat.plan(ep, kind)
            for k in reqs: reqs[k].update(r[k])
        save(ep_dir / 'flat_requests.json', reqs)
        ep['flat_planned'] = True; save(ep_dir / 'episode.json', ep)
    # 3c. only the cut-outs the library does not have yet (reused across videos)
    if a.stage != 'finish':          # assets are made once, in the build stage (never re-tried at finish)
        flat.make_assets(load(ep_dir / 'flat_requests.json', {'poses': {}, 'props': {}}), ep_dir)
    flat.resolve(ep, ep_dir); save(ep_dir / 'episode.json', ep)
    # 3d. a brand-new motion-graphics animation for every 'motion' beat; QA'd + repaired (fallback = a flat beat)
    if not ep.get('gen_done'):
        genmotion.build(ep, style, short_style, ep_dir); ep['gen_done'] = True; save(ep_dir / 'episode.json', ep)
    if not (ep_dir / 'thumbnail.jpg').exists():     # thumbnail = MAX + topic line + hook line (3 variants, most clickable uploaded)
        from . import thumbmax
        try: thumbmax.build(ep, ep_dir)
        except Exception as e:
            print('thumbnail failed', e)
            from . import thumbgen; thumbgen.fallback(ep, ep_dir)
    genmotion.stage(ep_dir)
    from collections import Counter
    print('parts:', Counter(b['kind'] for sc in ep['scenes'] for b in sc['beats']))

    # 5. render long + short, 6. audio mix, 7. QA
    from . import render, audio, qa
    if a.stage == 'build':          # parallel render shards take over from here (see agent/shard.py)
        render.props(ep, style, ep_dir, 'long'); render.props(ep, short_style, ep_dir, 'short')
        print('build stage done:', ep_dir); return
    from . import shard
    shard.concat(ep_dir)            # parts rendered by the shard jobs -> silent_long/short.mp4 (no-op when rendering here)
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
    for old in [x for x in os.environ.get('REPLACE_IDS', '').replace(',', ' ').split() if x]:   # owner-approved replacement of a broken upload
        try: yt.videos().delete(id=old).execute(); print('deleted old upload', old)
        except Exception as e: print('could not delete', old, e)
    at = youtube.publish_time(CFG['schedule']['publish_long_utc'])
    vid = youtube.upload(yt, long_final, pkg['title'], pkg['description'], pkg['tags'], thumb, publish_at=at, synthetic=True)
    youtube.add_to_playlist(yt, vid)
    sdesc = pkg['short_description'].replace('{FULL_URL}', 'https://youtu.be/' + vid)
    svid = youtube.upload(yt, short_final, pkg['short_title'], sdesc, pkg['tags'][:10],
                          publish_at=youtube.publish_time(CFG['schedule']['publish_short_utc']), synthetic=True)
    try:
        youtube.pin_comment_text(yt, vid, pkg['pinned_comment'])
    except Exception as e:
        print('comment not posted (will work once public):', e)
    try:   # send Short viewers to the full episode
        youtube.pin_comment_text(yt, svid, 'Watch the full story here: https://youtu.be/' + vid)
    except Exception as e:
        print('short comment not posted:', e)
    try: flat.merge_library()          # new MAX poses / objects join the shared library (committed with data/ and assets/)
    except Exception as e: print('library merge failed', e)
    mark_done(topic['id'], {'topic': topic['title'], 'video_id': vid, 'short_id': svid,
                            'style': style['id'], 'short_style': short_style['id'], 'publish_at': at,
                            'kit': style.get('kit'), 'lang': style.get('lang'), 'short_lang': short_style.get('lang'),
                            'built_at': dt.datetime.utcnow().isoformat(timespec='seconds')})
    save(ep_dir / 'result.json', {'video': vid, 'short': svid, 'publish_at': at, 'pinned_comment': pkg['pinned_comment']})
    print('DONE', vid, svid, at)

if __name__ == '__main__':
    main()
