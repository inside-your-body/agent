"""PERSIAN channel «درون بدن» (owner, Nov 2026).
Monthly batch (ElevenLabs credits last one month):
  topics  -> 30 viral topics (proven English + Persian videos), re-made in Persian in our own format
  scripts -> Persian script per topic (+ a TTS copy with diacritics on ambiguous words, numbers spelled out) + 1 Short
  voices  -> ElevenLabs "Aran - Parsi" (Eleven v4, owner's settings, 1.2x); mp3s kept as GitHub release assets, timings in the repo
Daily (episode.yml): build the next voiced episode (pictures every 4-5 s, Persian typography, thumbnail), render, upload and SCHEDULE it:
one long video + one Short every other day. Up to MAX_PER_DAY episodes per day (YouTube upload quota); the rest the next day.
usage: python -m agent.fa topics [--n 30] | scripts [--limit N] | voices [--limit N] | status"""
import argparse, datetime as dt, json, os, re, shutil, subprocess
from .common import ROOT, WORK, CFG, load, save, sh
from . import llm

FA_DIR = ROOT / 'data/fa'
BATCH = FA_DIR / 'batch.json'
EPS = FA_DIR / 'eps'
RELEASE = 'fa-voices'
MAX_PER_DAY = 2                      # 2 x (long + Short + 2 thumbnails) ~ 6,600 of the 10,000 daily YouTube quota units
PUBLISH_LONG, PUBLISH_SHORT = '17:00', '17:30'   # UTC = 20:30 / 21:00 Tehran, 20:00 / 20:30 Istanbul
WORDS_MIN, WORDS_MAX = 1100, 1200       # measured Nov 11: Aran v4 at 1.2x reads ~2.1 Persian words/s -> 8:30-9:30
SECONDS_MIN = CFG['long_video']['min_seconds']    # 8:05 -> mid-rolls
FA_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def batch():
    return load(BATCH, {'episodes': [], 'uploads': {}, 'next_slot': None})


def save_batch(b): save(BATCH, b)


def git_commit(msg):
    """Persist progress after every episode (long batch jobs must survive a timeout)."""
    if not os.environ.get('GITHUB_ACTIONS'): return
    try:
        sh('git config user.name "iyb-agent" && git config user.email "agent@users.noreply.github.com"')
        sh(f'git add data/fa && (git commit -qm "{msg} [skip ci]" || true)')
        for _ in range(3):
            if subprocess.run('git pull -q --rebase --autostash origin main && git push -q', shell=True).returncode == 0: break
    except Exception as e: print('commit failed', e)


# ------------------------------------------------------------------------------------------------ topics
FA_SEEDS = ['چه اتفاقی در بدن می افتد', 'اگر هر روز', 'بدن انسان', 'وقتی نمی خوابی چه می شود', 'ترک قند', 'روزه داری بدن']


def topics(n=30):
    from .youtube import client
    from .scout import _viral, VIRAL_SEEDS
    yt = client()
    en = _viral(yt, VIRAL_SEEDS)[:120]
    fa = []
    for q in FA_SEEDS:
        try:
            r = yt.search().list(part='snippet', q=q, type='video', order='viewCount', maxResults=25, relevanceLanguage='fa').execute()
            ids = [i['id']['videoId'] for i in r.get('items', [])]
            if ids:
                for v in yt.videos().list(part='snippet,statistics', id=','.join(ids)).execute().get('items', []):
                    fa.append({'title': v['snippet']['title'], 'channel': v['snippet']['channelTitle'], 'views': int(v['statistics'].get('viewCount', 0))})
        except Exception as e: print('fa search failed', q, e)
    fa = sorted(fa, key=lambda x: -x['views'])[:60]
    b = batch()
    done = [e['title'] for e in b['episodes']] + [e.get('topic', '') for e in load(ROOT / 'data/history.json', {}).get('episodes', [])]
    res = llm.ask_json(f"""You choose topics for «درون بدن» (Darun-e Badan, "Inside Your Body"), a PERSIAN-language YouTube channel for adults
(Iranians in Iran and abroad). Format: animated explainers of WHAT HAPPENS INSIDE THE BODY when/if X, usually told on a timeline
(minutes → hours → days → weeks → months). We explain, we never preach. The owner's strategy: take ideas that ALREADY went viral and make
our own Persian version.

Viral English videos (title, channel, views, subscribers, outlier = views / subscribers, minutes):
{json.dumps(en, ensure_ascii=False)}

Most-viewed Persian videos for similar searches (title, channel, views):
{json.dumps(fa, ensure_ascii=False)}

Already made (do not repeat closely): {json.dumps(done, ensure_ascii=False)}

Pick the {n} strongest ideas. Mix: habits, foods & drinks Iranians love (tea, rice, bread, sugar, salt, nuts, dates...), fasting, sleep,
stress, quitting (smoking, sugar, caffeine), common illnesses, body mysteries. Skip music, pranks, kids, religion, gore, sexual content,
dangerous challenges and medical-advice topics. Prefer huge view counts and high outliers.
Each topic: "title" = the Persian YouTube title the way Iranians SEARCH (≤ 70 characters, main keyword first, a number or time span when it
fits, e.g. «اگر ۳ روز نخوابی چه اتفاقی در بدنت می‌افتد؟»); "en" = the same topic in English (for research); "angle" (one line, Persian);
"stamps" (the timeline stamps, Persian); "ref_title", "ref_views" of the proven video it is based on.
Return JSON: {{"topics": [{{"title": str, "en": str, "angle": str, "stamps": str, "ref_title": str, "ref_views": int}}]}}""", max_tokens=12000)
    nid = max([e['id'] for e in b['episodes']] + [0]) + 1
    for k, t in enumerate(res.get('topics', [])[:n]):
        if not t.get('title'): continue
        b['episodes'].append({'id': nid + k, 'title': t['title'], 'en': t.get('en'), 'angle': t.get('angle'), 'stamps': t.get('stamps'),
                              'ref': {'title': t.get('ref_title'), 'views': t.get('ref_views')}, 'status': 'todo'})
    save_batch(b); git_commit('fa: topics')
    print('topics:', [e['title'] for e in b['episodes'] if e['status'] == 'todo'])


# ------------------------------------------------------------------------------------------------ scripts
STYLE = """زبان و لحن: فارسی روان و صمیمی، خطاب به «تو»، مثل یک راوی جذاب مستند علمی؛ جمله‌های کوتاه گفتاری (هر جمله یک ایده)، بدون
کلمات انگلیسی (اسم علمی را فارسی بنویس، مثلاً «انسولین»، «کورتیزول»)، بدون عدد لاتین. نوشتاری استاندارد ولی گرم و زنده (نه کتابی خشک).
هیچ‌وقت نصیحت نکن و به بیننده نگو چه کار کند؛ فقط توضیح بده درون بدن چه اتفاقی می‌افتد. توصیه‌ی پزشکی نده."""

HOOK = """قلاب (۳۰ ثانیه‌ی اول): جمله‌ی اول (حداکثر ۱۵ کلمه) یک عدد مشخص + اتفاقی که برای بدن «تو» می‌افتد + یک سؤال بی‌جواب.
هیچ‌وقت با توصیف صحنه یا «سلام» یا «در این ویدیو» شروع نکن. تا ثانیه‌ی ۱۰ قول بده که در ایستگاه‌های زمانی چه می‌بینیم.
یک حلقه‌ی باز (سؤال بی‌جواب) در قلاب بگذار و در آخرین ایستگاه جوابش را بده. هر ۶۰ تا ۹۰ ثانیه ریتم را بشکن (یک واقعیت شوکه‌کننده،
یک سؤال مستقیم از بیننده، یک مقایسه‌ی عجیب)."""


def write(ep, notes):
    return llm.ask_json(f"""تو نویسنده‌ی اصلی کانال یوتیوب فارسی «درون بدن» هستی (انیمیشن علمی: درون بدن چه اتفاقی می‌افتد).
موضوع: «{ep['title']}»   (English: {ep.get('en')})
زاویه: {ep.get('angle') or ''}   ایستگاه‌های زمانی پیشنهادی: {ep.get('stamps') or ''}
{('این نسخه‌ی خودِ ما از یک ویدیوی وایرال است: "' + str(ep['ref'].get('title')) + '" — همان کنجکاوی، با کلمات و ساختار خودمان، هرگز کپی.') if (ep.get('ref') or {}).get('title') else ''}
یادداشت‌های پژوهشی (فقط از همین واقعیت‌ها استفاده کن، عددها را گرد کن، دقیق باش):
{notes[:14000]}

{STYLE}
{HOOK}
ساختار: صحنه‌ی ۱ = قلاب (stage = null). بعد ۵ تا ۸ صحنه‌ی ایستگاه زمانی به ترتیب زمان؛ هر صحنه یک "stage" کوتاه فارسی (حداکثر ۱۲ حرف،
مثلاً «۲۰ دقیقه اول»، «ساعت ۲۴»، «روز ۳»، «ماه اول») و ۱۰ تا ۱۸ جمله با یک غافلگیری. صحنه‌ی آخر (stage = null): جمع‌بندی بزرگ + یک
سؤال برای کامنت‌ها. هر جمله باید «قابل نمایش» باشد (یک عدد، یک اندام، یک شیء یا یک تغییر). حداکثر ۱۲ عدد در کل متن.
طول متن ویدیوی بلند: {WORDS_MIN} تا {WORDS_MAX} کلمه (≈ ۸ تا ۹ دقیقه با سرعت ۱.۲). با دقت بشمار؛ کمتر نباشد.

بعد یک SHORT (۶۵ تا ۸۵ کلمه، حداکثر ۴۰ ثانیه): جمله‌ی اول یک سؤال کنجکاوکننده یا ادعای شوکه‌کننده که در ثانیه‌ی اول کار کند؛ یک
تایم‌لاین کوچک ۲-۳ ایستگاهی؛ جمله‌ی یکی‌مانده‌به‌آخر بیننده را به ویدیوی کامل می‌فرستد («نسخه‌ی کامل را در ویدیوی بالا ببین»)؛ جمله‌ی
آخر به جمله‌ی اول وصل شود (حلقه). عنوان Short کوتاه (حداکثر ۶ کلمه) و کنجکاوکننده.

آپلود (سئو فارسی): main_keyword = پرجست‌وجوترین اسم موضوع به فارسی؛ title = همان موضوع (حداکثر ۷۰ حرف، کلمه‌ی اصلی اول، ترجیحاً
سؤالی و با عدد)؛ description = ۳ تا ۵ جمله‌ی فارسی که کلمه‌ی اصلی در جمله‌ی اول باشد + جای فصل‌ها با {{CHAPTERS}}؛ tags = ۱۵ تا ۲۰
عبارت جست‌وجوی واقعی (فارسی، چند تا هم فینگلیش/انگلیسی)؛ hashtags = ۳ (اولی کلمه‌ی اصلی بدون فاصله)؛ pinned_comment = یک سؤال فارسی.
تامبنیل: line1 = موضوع با کلمات ساده (حداکثر ۴ کلمه)، line2 = یک پیچ کنجکاوکننده یا سؤال (حداکثر ۴ کلمه)، badge = یک عدد/زمان کوتاه
(مثلاً «۷۲ ساعت») یا خالی، subject = توصیف ENGLISH یک تصویر خیره‌کننده‌ی واقع‌گرایانه از سوژه برای مدل تصویر (بدون متن).

JSON برگردان:
{{"title": str, "main_keyword": str,
 "scenes": [{{"title": "عنوان فصل ۲ تا ۵ کلمه", "stage": str|null, "lines": [str]}}],
 "shorts": [{{"title": str, "lines": [str]}}],
 "upload": {{"title": str, "description": str, "tags": [str], "hashtags": [str], "pinned_comment": str}},
 "thumbnail": {{"line1": str, "line2": str, "badge": str, "subject": str}},
 "sources": [{{"title": str, "url": str}}]}}""", max_tokens=32000)


def _wc(lines): return sum(len(x.split()) for x in lines)
def long_texts(ep): return [l for s in ep['scenes'] for l in s['lines']]


def expand(ep, notes, target):
    out = llm.ask_json(f"""این متن ویدیوی فارسی «{ep['title']}» کوتاه است ({_wc(long_texts(ep))} کلمه). آن را به {target} تا {target + 120} کلمه برسان.
قلاب، ایستگاه‌ها و سبک را نگه دار؛ هر ایستگاه را با یک مثال روزمره، توضیح دقیق‌تر اتفاق درون بدن و یک واقعیت غافلگیرکننده از یادداشت‌ها
عمیق‌تر کن (می‌توانی یک ایستگاه اضافه کنی). جمله‌های کوتاه گفتاری.
{STYLE}
یادداشت‌ها: {notes[:10000]}
صحنه‌ها: {json.dumps(ep['scenes'], ensure_ascii=False)}
فقط این JSON را برگردان: {{"scenes": [{{"title": str, "stage": str|null, "lines": [str]}}]}}""", max_tokens=24000)
    if out.get('scenes') and _wc([l for s in out['scenes'] for l in s['lines']]) > _wc(long_texts(ep)):
        ep['scenes'] = out['scenes']
    return ep


def tts_prep(lines):
    """A copy of every sentence for the voice: diacritics (اعراب) ONLY on words the TTS could misread, numbers and symbols spelled out as
    Persian words, Latin letters/abbreviations written in Persian. The on-screen text stays the clean original."""
    out = []
    for k in range(0, len(lines), 60):
        part = lines[k:k + 60]
        try:
            r = llm.ask_json(f"""این جمله‌ها را یک موتور تبدیل متن به گفتار فارسی (ElevenLabs) می‌خواند. برای هر جمله نسخه‌ی «آماده‌ی خواندن» بنویس:
- فقط روی کلمه‌هایی اعراب (فتحه، کسره، ضمه، تشدید، سکون) بگذار که ممکن است اشتباه خوانده شوند (هم‌نویسه‌ها مثل مَرد/مُرد، کُشتی/کِشتی،
  سِحر/سَحَر، کِرم/کَرَم، اسم‌های علمی و کلمه‌های کم‌کاربرد، کسره‌ی اضافه وقتی ابهام دارد). بقیه‌ی کلمه‌ها را دست نزن.
- همه‌ی عددها، درصدها، واحدها و نمادها را با حروف فارسی بنویس (۷۲ ← هفتاد و دو، ٪ ← درصد، ۲۰۲۴ ← دو هزار و بیست و چهار).
- حروف و مخفف‌های لاتین را فارسی بنویس (DNA ← دی‌اِن‌اِی).
- معنی، ترتیب و کلمه‌ها را عوض نکن؛ جمله‌ای را حذف یا اضافه نکن؛ نیم‌فاصله‌ها را نگه دار.
جمله‌ها: {json.dumps({i: t for i, t in enumerate(part)}, ensure_ascii=False)}
JSON برگردان: {{"lines": {{"0": str, "1": str, ...}}}} — دقیقاً {len(part)} مورد.""", max_tokens=16000)
            got = r.get('lines') or {}
            for i, t in enumerate(part):
                v = got.get(str(i)) if isinstance(got, dict) else (got[i] if isinstance(got, list) and i < len(got) else None)
                ok = isinstance(v, str) and v.strip() and 0.6 < len(v) / max(1, len(t)) < 2.5
                out.append(v.strip() if ok else t)
        except Exception as e:
            print('tts prep failed, using plain text:', e); out += part
    return out


def scripts(limit=None):
    b = batch(); n = 0
    for e in b['episodes']:
        if e['status'] != 'todo': continue
        if limit is not None and n >= limit: break
        d = EPS / str(e['id']); d.mkdir(parents=True, exist_ok=True)
        print('== script', e['id'], e['title'], flush=True)
        notes = (d / 'research.md').read_text() if (d / 'research.md').exists() else ''
        if not notes:
            notes = llm.research((e.get('en') or e['title']) + ' — what happens inside the body over time (minutes, hours, days, weeks, months)')
            (d / 'research.md').write_text(notes)
        ep = write(e, notes)
        for _ in range(2):
            if _wc(long_texts(ep)) >= WORDS_MIN - 50: break
            print('script short:', _wc(long_texts(ep)), '-> expanding'); ep = expand(ep, notes, WORDS_MIN + 40)
        ep['tts'] = {'long': tts_prep(long_texts(ep)), 'shorts': [tts_prep(s['lines']) for s in ep.get('shorts', [])[:1]]}
        save(d / 'episode.json', ep)
        e.update(status='scripted', words=_wc(long_texts(ep)), title=(ep.get('upload') or {}).get('title') or e['title'])
        save_batch(b); git_commit(f"fa: script {e['id']}"); n += 1
        print('words:', e['words'])


# ------------------------------------------------------------------------------------------------ voices
def _gh(*args, check=True):
    return subprocess.run(['gh', *args], check=check, capture_output=True, text=True)


def _ensure_release():
    if _gh('release', 'view', RELEASE, check=False).returncode != 0:
        _gh('release', 'create', RELEASE, '--title', 'Persian voices (ElevenLabs)', '--notes', 'Narration for «درون بدن» episodes (made by the agent).')


def voices(limit=None):
    from . import eleven
    b = batch(); n = 0
    _ensure_release()
    for e in b['episodes']:
        if e['status'] != 'scripted': continue
        if limit is not None and n >= limit: break
        d = EPS / str(e['id']); ep = load(d / 'episode.json')
        tmp = WORK / f"fa_{e['id']}"; tmp.mkdir(parents=True, exist_ok=True)
        print('== voice', e['id'], e['title'], flush=True)
        groups = [len(s['lines']) for s in ep['scenes']]
        segs = eleven.synth(ep['tts']['long'], tmp / 'vo_long.wav', groups)
        dur = segs[-1]['end']
        print(f'long voice {dur:.0f}s')
        if dur < SECONDS_MIN:          # too short for mid-rolls: add one more stamp before the ending and voice only the new lines
            ep, segs = _extend(ep, d, tmp, segs, groups)
        for s, t in zip(segs, long_texts(ep)): s['text'] = t          # on-screen text = clean version
        save(d / 'segs_long.json', segs)
        eleven.to_mp3(tmp / 'vo_long.wav', tmp / f"{e['id']}_long.mp3")
        files = [tmp / f"{e['id']}_long.mp3"]
        for k, s in enumerate(ep.get('shorts', [])[:1]):
            sseg = eleven.synth(ep['tts']['shorts'][k], tmp / f'vo_short{k}.wav')
            if sseg[-1]['end'] > 45: print('WARNING short is', sseg[-1]['end'], 's')
            for x, t in zip(sseg, s['lines']): x['text'] = t
            save(d / f'segs_short{k}.json', sseg)
            eleven.to_mp3(tmp / f'vo_short{k}.wav', tmp / f"{e['id']}_short{k}.mp3"); files.append(tmp / f"{e['id']}_short{k}.mp3")
        _gh('release', 'upload', RELEASE, *map(str, files), '--clobber')
        save(d / 'episode.json', ep)
        e.update(status='voiced', seconds=round(dur), chars=eleven._state['chars'])
        save_batch(b); git_commit(f"fa: voice {e['id']}"); n += 1
    print('ElevenLabs characters used this run:', eleven._state['chars'])


def _extend(ep, d, tmp, segs, groups):
    from . import eleven
    import numpy as np, soundfile as sf
    notes = (d / 'research.md').read_text() if (d / 'research.md').exists() else ''
    need = SECONDS_MIN + 10 - segs[-1]['end']
    words = int(need * _wc(long_texts(ep)) / segs[-1]['end']) + 20
    r = llm.ask_json(f"""ویدیوی فارسی «{ep['title']}» حدود {int(need)} ثانیه کوتاه است. یک صحنه‌ی ایستگاه زمانی تازه بنویس که منطقاً قبل از صحنه‌ی آخر
می‌آید ({words} تا {words + 30} کلمه)، با یک غافلگیری تازه از یادداشت‌ها. {STYLE}
صحنه‌های فعلی: {json.dumps([{'stage': s.get('stage'), 'title': s['title']} for s in ep['scenes']], ensure_ascii=False)}
یادداشت‌ها: {notes[:8000]}
JSON: {{"title": str, "stage": str, "lines": [str]}}""", max_tokens=6000)
    if not r.get('lines'): return ep, segs
    new_tts = tts_prep(r['lines'])
    extra = eleven.synth(new_tts, tmp / 'vo_extra.wav')
    # rebuild the long voice: [all scenes but the last] + extra + [last scene]
    a, sr = sf.read(tmp / 'vo_long.wav', dtype='float32'); x, _ = sf.read(tmp / 'vo_extra.wav', dtype='float32')
    n_last = groups[-1]; cut_i = len(segs) - n_last
    cut_t = segs[cut_i]['start'] - 0.2
    gap = np.zeros(int(0.45 * sr), np.float32)
    y = np.concatenate([a[:int(cut_t * sr)], gap, x, gap, a[int(cut_t * sr):]])
    sf.write(tmp / 'vo_long.wav', y, sr)
    off1 = cut_t + 0.45; off2 = len(x) / sr + 0.9
    new = segs[:cut_i] + [{**s, 'start': s['start'] + off1, 'end': s['end'] + off1} for s in extra] + \
          [{**s, 'start': s['start'] + off2, 'end': s['end'] + off2} for s in segs[cut_i:]]
    ep['scenes'].insert(len(ep['scenes']) - 1, {'title': r.get('title') or r['stage'], 'stage': r.get('stage'), 'lines': r['lines']})
    ep['tts']['long'] = ep['tts']['long'][:cut_i] + new_tts + ep['tts']['long'][cut_i:]
    for i, s in enumerate(new): s['i'] = i
    print(f"extended: +{len(r['lines'])} lines, now {new[-1]['end']:.0f}s")
    return ep, new


# ------------------------------------------------------------------------------------------------ daily build / finish
def _today(): return dt.datetime.utcnow().strftime('%Y-%m-%d')


def next_episode():
    b = batch()
    if not b.get('approved'):        # the owner approves the first (sample) episode before the automatic uploads start
        print('batch not approved yet (sample first) -> nothing to build'); return None
    if b['uploads'].get(_today(), 0) >= MAX_PER_DAY:
        print('daily upload limit reached -> tomorrow'); return None
    return next((e for e in b['episodes'] if e['status'] == 'voiced'), None)


def build(e, ep_dir):
    from . import pics, eleven
    d = EPS / str(e['id']); ep = load(d / 'episode.json')
    ep_dir.mkdir(parents=True, exist_ok=True)
    for kind in ['long'] + [f'short{k}' for k in range(len(ep.get('shorts', [])[:1]))]:
        mp3 = ep_dir / f'{kind}.mp3'
        if not (ep_dir / f'vo_{kind}.wav').exists():
            _gh('release', 'download', RELEASE, '-p', f"{e['id']}_{kind}.mp3", '-O', str(mp3), '--clobber')
            eleven.from_mp3(mp3, ep_dir / f'vo_{kind}.wav')
        shutil.copy(d / f'segs_{kind}.json', ep_dir / f'segs_{kind}.json')
    save(ep_dir / 'episode.json', ep)
    title = (ep.get('upload') or {}).get('title') or e['title']
    hist = load(ROOT / 'data/history.json', {})
    if not ep.get('palette'):
        ep['palette'] = pics.choose_palette(e.get('en') or title, hist.get('used_palettes', [])); save(ep_dir / 'episode.json', ep)
    pal = pics.PALETTES[ep['palette']]
    texts = long_texts(ep); segs = load(ep_dir / 'segs_long.json')
    stages = [sc.get('stage') for sc in ep['scenes'] for _ in sc['lines']]
    groups = pics.group(texts, min_words=11, max_words=20)        # Persian at 1.2x ≈ 2.6 words/s -> a new picture every ~4-5 s
    gtexts = [' '.join(texts[i] for i in g) for g in groups]
    if not (ep_dir / 'pics_long.json').exists():
        pb, cast = pics.plan(gtexts, e.get('en') or title, fa=True); save(ep_dir / 'pics_long.json', {'beats': pb, 'cast': cast})
    pb = load(ep_dir / 'pics_long.json')['beats']
    files = pics.draw(pb, gtexts, pal, ep_dir / 'pics' / 'long')
    print(f'pictures long: {sum(1 for f in files if f)}/{len(files)}, palette {ep["palette"]}')
    save(ep_dir / 'props_long.json', pics.build_props(groups, segs, pb, files, stages, ep['palette'], f'pics/{ep_dir.name}/long', rtl=True, texts=gtexts))
    for k, s in enumerate(ep.get('shorts', [])[:1]):
        sg = load(ep_dir / f'segs_short{k}.json'); st = s['lines']
        sgroups = pics.group(st, min_words=7, max_words=14); sgt = [' '.join(st[i] for i in g) for g in sgroups]
        if not (ep_dir / f'pics_short{k}.json').exists():
            spb, _ = pics.plan(sgt, e.get('en') or title, vertical=True, fa=True); save(ep_dir / f'pics_short{k}.json', {'beats': spb})
        spb = load(ep_dir / f'pics_short{k}.json')['beats']
        sfiles = pics.draw(spb, sgt, pal, ep_dir / 'pics' / f'short{k}', vertical=True)
        stitle = re.sub(r'#\S+', '', s.get('title') or title).strip()
        save(ep_dir / f'props_short{k}.json', pics.build_props(sgroups, sg, spb, sfiles, [None] * len(st), ep['palette'], f'pics/{ep_dir.name}/short{k}',
                                                              vertical=True, title=stitle, rtl=True, texts=sgt))
    pics.stage_public(ep_dir)
    try:
        for k in range(len(ep.get('shorts', [])[:1])):
            sh(['npx', 'remotion', 'still', 'src/index.ts', 'PicShort', str(ep_dir / f'short{k}_cover.jpg'), f'--props={ep_dir / f"props_short{k}.json"}',
                '--frame=12', '--jpeg-quality=88', '--log=warn'], cwd=ROOT / 'render')
    except Exception as ex: print('short cover failed', ex)
    if not (ep_dir / 'thumbnail.jpg').exists():
        try: thumb(ep, ep_dir, pal)
        except Exception as ex: print('thumbnail failed:', ex)
    return ep


def thumb(ep, ep_dir, pal):
    """AI picture (no text, subject on the left) + the Persian headline set in code with the owner's fonts."""
    from . import images
    t = ep.get('thumbnail') or {}
    raw = ep_dir / 'thumb_art.png'
    subj = t.get('subject') or ep.get('title')
    images.gen(f"""YouTube thumbnail background art, 16:9. {subj}. Photo-real / glossy 3D medical illustration, dramatic cinematic studio
lighting, glowing rim light, saturated colours, very high contrast, ONE clear focal subject placed on the LEFT 45% of the frame; the RIGHT half
is a dark, calm, empty background (for a big headline added later). Absolutely no text, no letters, no numbers, no watermark.""",
               raw, size='1536x1024', quality='high')
    pub = ROOT / 'render/public/ep'; pub.mkdir(parents=True, exist_ok=True)
    props = {'line1': t.get('line1') or ep.get('title'), 'line2': t.get('line2') or '', 'badge': t.get('badge') or '', 'accent': pal['accent'],
             'bg': pal['bg'], 'side': 'right'}
    if raw.exists():
        shutil.copy(raw, pub / f'{ep_dir.name}_thumb.png'); props['img'] = f'ep/{ep_dir.name}_thumb.png'
    save(ep_dir / 'thumb_props.json', props)
    sh(['npx', 'remotion', 'still', 'src/index.ts', 'ThumbFA', str(ep_dir / 'thumbnail.jpg'), f'--props={ep_dir / "thumb_props.json"}',
        '--jpeg-quality=90', '--log=warn'], cwd=ROOT / 'render')


def _ts(s):
    s = int(s); return f'{s // 60:02d}:{s % 60:02d}'


def package(ep, ep_dir, track, short_track):
    from . import audio
    up = ep.get('upload') or {}
    segs = load(ep_dir / 'segs_long.json')
    chapters, si = [], 0
    for sc in ep['scenes']:
        t = 0 if si == 0 else segs[si]['start']
        if not chapters or t - chapters[-1][0] >= 15: chapters.append((t, sc.get('title') or sc.get('stage') or ''))
        si += len(sc['lines'])
    chap = '\n'.join(f'{_ts(t)} {n}' for t, n in chapters)
    desc = up.get('description') or ''
    desc = desc.replace('{CHAPTERS}', 'فصل‌ها:\n' + chap) if '{CHAPTERS}' in desc else desc + '\n\nفصل‌ها:\n' + chap
    if ep.get('sources'): desc += '\n\nمنابع:\n' + '\n'.join(f"- {s.get('title')}: {s.get('url')}" for s in ep['sources'][:8])
    tags_h = ' '.join('#' + h.lstrip('#').replace(' ', '_') for h in up.get('hashtags', [])[:3])
    desc += '\n\n⚠️ این ویدیو فقط آموزشی است و جایگزین مشاوره با پزشک نیست.\n\n' + tags_h + '\n\n' + audio.credit(track)
    tags, total = [], 0
    for t in [up.get('main_keyword') or ''] + up.get('tags', []):
        t = t.strip()
        if t and t not in tags and total + len(t) + 2 <= 480: tags.append(t); total += len(t) + 2
    s = (ep.get('shorts') or [{}])[0]
    stitle = re.sub(r'#\S+', '', s.get('title') or up.get('title') or '').strip()[:85] + ' #Shorts'
    sdesc = (s.get('lines') or [''])[0] + '\n\nویدیوی کامل: {FULL_URL}\n\n' + tags_h + '\n\n' + audio.credit(short_track)
    return {'title': (up.get('title') or ep['title'])[:100], 'description': desc[:4900], 'tags': tags, 'short_title': stitle,
            'short_description': sdesc, 'pinned_comment': up.get('pinned_comment', '')}


def _slot():
    """Next free publish day: every other day, never earlier than tomorrow."""
    b = batch()
    tomorrow = (dt.datetime.utcnow() + dt.timedelta(days=1)).date()
    nxt = dt.date.fromisoformat(b['next_slot']) if b.get('next_slot') else tomorrow
    return max(nxt, tomorrow)


def finish(cur, dry_run=False):
    from . import tl, shard, audio, youtube
    ep_dir = WORK / cur['dir']; eid = cur['fa']
    ep = load(ep_dir / 'episode.json')
    shard.concat(ep_dir)
    long_final, shorts, track = tl.finish(ep, ep_dir)
    st = shorts[0][2] if shorts else track
    pkg = package(ep, ep_dir, track, st); save(ep_dir / 'package.json', pkg)
    if dry_run:
        print('dry run: outputs in', ep_dir); return
    day = _slot()
    at = f'{day.isoformat()}T{PUBLISH_LONG}:00Z'; sat = f'{day.isoformat()}T{PUBLISH_SHORT}:00Z'
    yt = youtube.client()
    thumb_f = ep_dir / 'thumbnail.jpg'
    vid = youtube.upload(yt, long_final, pkg['title'], pkg['description'], pkg['tags'], thumb_f if thumb_f.exists() else None,
                         publish_at=at, synthetic=True, lang='fa')
    try: youtube.add_to_playlist(yt, vid, 'درون بدن — چه اتفاقی در بدن می‌افتد')
    except Exception as ex: print('playlist', ex)
    sids = []
    for k, f, _ in shorts:
        cover = ep_dir / f'short{k}_cover.jpg'
        try:
            sids.append(youtube.upload(yt, f, pkg['short_title'], pkg['short_description'].replace('{FULL_URL}', 'https://youtu.be/' + vid),
                                       pkg['tags'][:10], cover if cover.exists() else None, publish_at=sat, synthetic=True, lang='fa'))
        except Exception as ex: print('short upload failed', ex)
    b = batch()
    for e in b['episodes']:
        if e['id'] == eid: e.update(status='uploaded', video_id=vid, short_ids=sids, publish_at=at)
    b['uploads'][_today()] = b['uploads'].get(_today(), 0) + 1
    b['next_slot'] = (day + dt.timedelta(days=CFG['schedule'].get('every_days', 2))).isoformat()
    save_batch(b)
    h = load(ROOT / 'data/history.json', {'episodes': []})
    h['episodes'].append({'topic': ep.get('title'), 'video_id': vid, 'short_ids': sids, 'publish_at': at, 'format': 'fa', 'music': track,
                          'palette': ep.get('palette'), 'built_at': dt.datetime.utcnow().isoformat(timespec='seconds')})
    h.setdefault('used_music', []).append(track); h.setdefault('used_palettes', []).append(ep.get('palette'))
    save(ROOT / 'data/history.json', h)
    save(ep_dir / 'result.json', {'video': vid, 'shorts': sids, 'publish_at': at})
    print('DONE', vid, sids, at)


def status():
    b = batch()
    from collections import Counter
    print(Counter(e['status'] for e in b['episodes']), 'next slot', b.get('next_slot'))
    for e in b['episodes']: print(e['id'], e['status'], e['title'], e.get('seconds', ''), e.get('publish_at', ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['topics', 'scripts', 'voices', 'status', 'all'])
    ap.add_argument('--n', type=int, default=30)
    ap.add_argument('--limit', type=int, default=None)
    a = ap.parse_args()
    if a.cmd in ('topics', 'all') and (a.cmd == 'topics' or not any(e['status'] == 'todo' for e in batch()['episodes'])):
        if a.cmd == 'topics' or not batch()['episodes'] or all(e['status'] == 'uploaded' for e in batch()['episodes']): topics(a.n)
    if a.cmd in ('scripts', 'all'): scripts(a.limit)
    if a.cmd in ('voices', 'all'): voices(a.limit)
    if a.cmd == 'status': status()


if __name__ == '__main__':
    main()
