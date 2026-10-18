"""OpenAI image generation: 2D illustrations (transparent) + thumbnail art."""
import base64, os, time, requests, pathlib
from .common import CFG

API = 'https://api.openai.com/v1/images/generations'
EDIT_API = 'https://api.openai.com/v1/images/edits'

def gen(prompt, out, size='1024x1024', transparent=False, quality='medium', retries=3):
    body = {'model': CFG['models']['openai_image'], 'prompt': prompt, 'size': size, 'quality': quality, 'n': 1}
    if transparent: body['background'] = 'transparent'; body['output_format'] = 'png'
    for a in range(retries):
        try:
            r = requests.post(API, headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY']}, json=body, timeout=300)
            r.raise_for_status()
            from . import cost; cost.image(r.json().get('usage'), f"{pathlib.Path(out).name} {size} {quality}")
            pathlib.Path(out).write_bytes(base64.b64decode(r.json()['data'][0]['b64_json']))
            return out
        except Exception as e:
            print('image error', e, getattr(e, 'response', None) and e.response.text[:300]); time.sleep(8 * (a + 1))
    return None

def illustration(prompt, style_hint, out):
    p = (f"Flat 2D vector illustration for an animated health explainer, {style_hint}. Subject: {prompt}. "
         "Clean shapes, no text, no letters, no watermark, isolated on a transparent background, centered, friendly, not gory.")
    return gen(p, out, transparent=True, quality='low')

def thumbnail_art(prompt, out, refs=None, cast_desc=''):
    p = (f"YouTube thumbnail, 2D cartoon style matching the reference characters, ultra eye-catching, huge contrast, saturated colours, "
         f"dramatic lighting, one clear focal point readable on a small phone screen, big expressive emotion. {prompt}. "
         + (f"Characters: {cast_desc} " if cast_desc else '')
         + "Keep the bottom-left area simple and darker for a big headline. No text, no letters, no watermark.")
    return edit(p, refs or [], out, size='1536x1024', quality='high')

def edit(prompt, refs, out, size='1536x1024', transparent=False, quality='medium', retries=2):
    """gpt-image edits endpoint with reference images (keeps the cast consistent). Falls back to plain generation."""
    refs = [r for r in refs if r and pathlib.Path(r).exists()][:4]
    if refs:
        data = {'model': CFG['models']['openai_image'], 'prompt': prompt, 'size': size, 'quality': quality, 'n': '1'}
        if transparent: data['background'] = 'transparent'; data['output_format'] = 'png'
        for a in range(retries):
            try:
                files = [('image[]', (pathlib.Path(r).name, open(r, 'rb'), 'image/png')) for r in refs]
                r = requests.post(EDIT_API, headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY']}, data=data, files=files, timeout=300)
                r.raise_for_status()
                from . import cost; cost.image(r.json().get('usage'), f"{pathlib.Path(out).name} {size} {quality} edit")
                pathlib.Path(out).write_bytes(base64.b64decode(r.json()['data'][0]['b64_json']))
                return out
            except Exception as e:
                print('image edit error', e, getattr(e, 'response', None) is not None and e.response.text[:300]); time.sleep(8 * (a + 1))
    return gen(prompt, out, size=size, transparent=transparent, quality=quality)

CARTOON = ("Polished 2D cartoon animation still, flat vector shapes with soft shading, bold clean outlines, expressive faces, "
           "like a high-end animated science explainer. {style}. No text, no letters, no numbers, no watermark, not gory.")

def cast_ref(c, style_hint, out):
    p = (CARTOON.format(style=style_hint) + f" Character design reference: {c['name']} — {c['look']}. "
         "Single full-body character, front three-quarter view, friendly pose, centered. Fully transparent background: no backdrop, no frame, no panel, no decorative lines or icons behind the character.")
    return gen(p, out, size='1024x1024', transparent=True)

def cast_text(cast, ids):
    return ' '.join(f"{c['name']} looks like: {c['look']}." for c in cast if c['id'] in (ids or []))

def cartoon_scene(prompt, cast, ids, refs, style_hint, out, vertical=False, quality='medium'):
    p = (CARTOON.format(style=style_hint) + f" Storyboard frame, full scene with background, cinematic composition, the subject large and clearly readable: {prompt}. "
         + (f"Characters (keep them EXACTLY as in the reference images): {cast_text(cast, ids)}" if ids else ''))
    return edit(p, refs, out, size='1024x1536' if vertical else '1536x1024', quality=quality)

def sprite(prompt, cast, ids, refs, style_hint, out):
    p = (CARTOON.format(style=style_hint) + f" Subject: {prompt}. "
         + (f"Characters (keep them EXACTLY as in the reference images): {cast_text(cast, ids)} " if ids else '')
         + "Cut-out isolated on a fully transparent background: no backdrop, no frame, no panel, no decorative lines; centered, full body visible.")
    return edit(p, refs, out, size='1024x1024', transparent=True, quality='low')
