"""Illustrations (OpenAI, transparent PNG) for beats + YouTube thumbnail."""
import json, pathlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from .common import ROOT, save, load
from . import images

FONTS = ROOT / 'render/public/fonts'
MAX_ILLUSTRATIONS = 14

def build(ep, style, ep_dir):
    """Generate images for illustration beats (long + short share the cache)."""
    out = ep_dir / 'assets'; out.mkdir(exist_ok=True)
    hint = f"style: {style.get('mood', '')}, colours {style['accent']} and {style['accent2']} on {'dark' if style['bg'].startswith('#0') or style['bg'].startswith('#1') else 'light'} background"
    n = 0
    beats = [b for sc in ep['scenes'] for b in sc['beats']] + ep['short'].get('beats', [])
    for b in beats:
        if b.get('kind') != 'illustration' or not b.get('illustration'):
            continue
        key = 'img_%02d.png' % n
        p = out / key
        if n < MAX_ILLUSTRATIONS and (p.exists() or images.illustration(b['illustration'], hint, p)):
            b['img'] = 'ep/' + key
            n += 1
        else:
            b['kind'] = 'icon'   # graceful fallback
    save(ep_dir / 'episode.json', ep)
    print('illustrations:', n)

def _font(name, size):
    try:
        from fontTools.ttLib import TTFont  # woff2 -> ttf conversion if available
        ttf = pathlib.Path('/tmp') / (name + '.ttf')
        if not ttf.exists():
            f = TTFont(str(FONTS / (name + '.woff2'))); f.flavor = None; f.save(str(ttf))
        return ImageFont.truetype(str(ttf), size)
    except Exception:
        return ImageFont.truetype('DejaVuSans-Bold.ttf', size)

def thumbnail(ep, style, ep_dir):
    th = ep.get('thumbnail', {})
    art = ep_dir / 'thumb_art.png'
    if not art.exists():
        images.thumbnail_art(th.get('image_prompt', ep['title']), art)
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
    # top gradient for the headline
    grad = Image.new('L', (1, H)); [grad.putpixel((0, y), int(max(0, 210 - y * 0.75))) for y in range(H)]
    im.paste(Image.new('RGB', (W, H), '#000'), (0, 0), grad.resize((W, H)))
    d = ImageDraw.Draw(im)
    big = (th.get('big_text') or ep['title']).upper()
    words = big.split()
    lines, cur = [], ''
    for w in words:
        if len(cur + ' ' + w) > 16 and cur: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    lines.append(cur); lines = lines[:2]
    size = 118 if max(len(l) for l in lines) <= 12 else 96
    f = _font('anton', size)
    y = 26
    for i, l in enumerate(lines):
        col = style['accent'] if i == len(lines) - 1 else '#FFFFFF'
        tw = d.textlength(l, font=f)
        d.text(((W - tw) / 2, y), l, font=f, fill=col, stroke_width=8, stroke_fill='#000000')
        y += int(size * 1.02)
    small = th.get('small_text')
    if small:
        fs = _font('anton', 54); tw = d.textlength(small.upper(), font=fs)
        bx = (W - tw) / 2 - 22
        d.rounded_rectangle([bx, H - 110, bx + tw + 44, H - 34], radius=12, fill=style['accent'])
        d.text((bx + 22, H - 106), small.upper(), font=fs, fill='#000000' if style['accent'] not in ('#111111',) else '#FFFFFF')
    out = ep_dir / 'thumbnail.jpg'
    im.save(out, quality=92)
    return out

def stage_for_render(ep_dir):
    """Copy generated images into render/public/ep for Remotion staticFile()."""
    dst = ROOT / 'render/public/ep'
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir(parents=True)
    for p in (ep_dir / 'assets').glob('*.png'):
        shutil.copy(p, dst / p.name)
