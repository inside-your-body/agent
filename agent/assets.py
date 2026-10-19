"""Illustrations (OpenAI, transparent PNG) for beats + YouTube thumbnail."""
import json, pathlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from .common import ROOT, save, load
from . import images

FONTS = ROOT / 'render/public/fonts'
MAX_ILLUSTRATIONS = 30   # character cut-outs in new poses, low quality (cheap)

MAX_CARTOONS = 90        # every drawn shot gets its OWN storyboard frame (first 12 medium quality, rest low) — no reused images
MAX_CARTOONS_SHORT = 16
HQ_CARTOONS = 12

def _hint(style):
    art = style.get('art_style') or 'polished flat 2D vector cartoon, soft shading, bold clean outlines'
    return (f"ART STYLE (follow strictly): {art}. Texture: {(style.get('lang') or {}).get('texture', '')}. "
            f"Palette built around {style['accent']}, {style['accent2']} and {style['accent3']} on {style['bg']}")

def build(ep, style, ep_dir, short_style=None):
    """Cast reference sheets -> storyboard frames (cartoon) + character cut-outs, all consistent with the cast.
    Images are generated in parallel; shots over the caps reuse an earlier drawing with a different camera move."""
    from concurrent.futures import ThreadPoolExecutor
    out = ep_dir / 'assets'; out.mkdir(exist_ok=True)
    hint = _hint(style); hint_v = _hint(short_style or style)
    cast = ep.get('cast') or []
    refs = {}
    with ThreadPoolExecutor(4) as ex:
        futs = {c['id']: ex.submit(lambda c=c: (out / f"cast_{c['id']}.png").exists() or images.cast_ref(c, hint, out / f"cast_{c['id']}.png")) for c in cast[:4]}
        for cid, fu in futs.items():
            if fu.result(): refs[cid] = str(out / f'cast_{cid}.png')
    groups = [(b, False) for sc in ep['scenes'] for b in sc['beats']] + [(b, True) for b in ep['short'].get('beats', [])]
    jobs, n_img, n_cart, n_cart_v = [], 0, 0, 0
    for b, vertical in groups:
        ids = [i for i in (b.get('cast') or []) if i in refs]
        r = [refs[i] for i in ids] or list(refs.values())[:1]
        if b.get('kind') == 'cartoon' and b.get('illustration'):
            k = n_cart_v if vertical else n_cart
            if k < (MAX_CARTOONS_SHORT if vertical else MAX_CARTOONS):
                key = ('cartoon_v_%02d.png' if vertical else 'cartoon_%02d.png') % k
                q = 'medium' if (k < HQ_CARTOONS and not vertical) or (vertical and k < 4) else 'low'
                jobs.append((b, 'cartoon', key, vertical, ids, lambda b=b, ids=ids, r=r, p=out / key, v=vertical, q=q:
                             p.exists() or images.cartoon_scene(b['illustration'], cast, ids, r, hint_v if v else hint, p, v, q)))
                if vertical: n_cart_v += 1
                else: n_cart += 1
                continue
        if b.get('kind') in ('cartoon', 'illustration') and b.get('illustration') and n_img < MAX_ILLUSTRATIONS:
            key = 'img_%02d.png' % n_img; n_img += 1
            jobs.append((b, 'illustration', key, None, ids, lambda b=b, ids=ids, r=r, p=out / key:
                         p.exists() or (images.sprite(b['illustration'], cast, ids, r, hint, p) if ids else images.illustration(b['illustration'], hint, p))))
            continue
        if b.get('kind') in ('cartoon', 'illustration'):
            b['_reuse'] = vertical
    with ThreadPoolExecutor(4) as ex:
        results = list(ex.map(lambda j: j[5](), jobs))
    made = []
    for (b, kind, key, vertical, ids, _), ok in zip(jobs, results):
        if ok:
            b['kind'], b['img'] = kind, 'ep/' + key
            made.append([kind, b['img'], ids, 1, vertical])
        else:
            b['_reuse'] = vertical if vertical is not None else False
    # failed/over-cap drawn shots: one more low-quality attempt; if that fails too, show the subject with a motion-graphics organ shot
    retry = [(b, v) for b, v in groups if '_reuse' in b]
    def _again(bv):
        b, v = bv; key = f"retry_{abs(hash(b.get('illustration', ''))) % 10**8}.png"
        ids = [i for i in (b.get('cast') or []) if i in refs]
        ok = images.cartoon_scene(b.get('illustration') or b.get('see') or '', cast, ids, [refs[i] for i in ids], hint_v if v else hint, out / key, v, 'low')
        return key if ok else None
    with ThreadPoolExecutor(4) as ex:
        got = list(ex.map(_again, retry))
    for (b, v), key in zip(retry, got):
        b.pop('_reuse', None)
        if key: b['kind'], b['img'] = 'cartoon', 'ep/' + key
        else: b['kind'] = 'kinetic'; b['text'] = b.get('text') or (b.get('see') or '')[:60]
    save(ep_dir / 'episode.json', ep)
    print('cast:', len(refs), 'storyboard frames:', n_cart, '+ short', n_cart_v, 'cut-outs:', n_img, 'images ok:', sum(bool(x) for x in results), '/', len(results))

def _font(name, size):
    try:
        from fontTools.ttLib import TTFont  # woff2 -> ttf conversion if available
        ttf = pathlib.Path('/tmp') / (name + '.ttf')
        if not ttf.exists():
            f = TTFont(str(FONTS / (name + '.woff2'))); f.flavor = None; f.save(str(ttf))
        return ImageFont.truetype(str(ttf), size)
    except Exception:
        return ImageFont.truetype('DejaVuSans-Bold.ttf', size)

def _compose(art, l1, l2, style, out):
    W, H = 1280, 720
    if art.exists():
        im = Image.open(art).convert('RGB')
        r = max(W / im.width, H / im.height)
        im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        x0, y0 = (im.width - W) // 2, (im.height - H) // 2
        im = im.crop((x0, y0, x0 + W, y0 + H))
        im = ImageEnhance.Contrast(im).enhance(1.12); im = ImageEnhance.Color(im).enhance(1.15)
    else:
        im = Image.new('RGB', (W, H), style['bg'])
    # bottom gradient + two big lines bottom-left: line1 white, line2 yellow (plain sentence naming the topic + curiosity)
    grad = Image.new('L', (1, H)); [grad.putpixel((0, y), int(max(0, (y - H * 0.45) / (H * 0.55)) * 190)) for y in range(H)]
    im.paste(Image.new('RGB', (W, H), '#000'), (0, 0), grad.resize((W, H)))
    d = ImageDraw.Draw(im)
    lines = [x for x in (l1.upper().strip(), l2.upper().strip()) if x]
    size = 112
    while size > 60 and max(d.textlength(l, font=_font('anton', size)) for l in lines) > W - 90: size -= 4
    f = _font('anton', size)
    y = H - 40 - int(size * 1.1) * len(lines)
    for i, l in enumerate(lines):
        d.text((44, y), l, font=f, fill='#FFFFFF' if i == 0 and len(lines) > 1 else '#FFD23D', stroke_width=11, stroke_fill='#000000')
        y += int(size * 1.1)
    im.save(out, quality=92)
    return out

def thumbnail(ep, style, ep_dir):
    """Main thumbnail (uploaded) + up to 2 variants (thumbnail_b/c.jpg) for YouTube's Test & compare."""
    th = ep.get('thumbnail', {})
    refs = [str(x) for x in sorted((ep_dir / 'assets').glob('cast_*.png'))[:2]]
    cast = images.cast_text(ep.get('cast') or [], [c['id'] for c in (ep.get('cast') or [])][:2])
    opts = [th] + [v for v in (th.get('variants') or []) if isinstance(v, dict)][:2]
    outs = []
    for i, o in enumerate(opts):
        suf = '' if i == 0 else '_' + 'bc'[i - 1]
        art = ep_dir / f'thumb_art{suf}.png'
        if not art.exists():
            try:
                images.thumbnail_art(o.get('image_prompt') or ep['title'], art, refs, cast, quality='high' if i == 0 else 'medium')
            except Exception as e:
                print('thumbnail art failed', suf or 'main', e)
                if i: continue
        if i and not art.exists(): continue
        l1 = o.get('line1') or o.get('big_text') or (ep['title'] if i == 0 else '')
        l2 = o.get('line2') or o.get('small_text') or ''
        if not (l1 or l2): continue
        outs.append(_compose(art, l1, l2, style, ep_dir / f'thumbnail{suf}.jpg'))
    return outs[0]

def stage_for_render(ep_dir):
    """Copy generated images into render/public/ep for Remotion staticFile()."""
    dst = ROOT / 'render/public/ep'
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    for p in (ep_dir / 'assets').glob('*.png'):
        shutil.copy(p, dst / p.name)
