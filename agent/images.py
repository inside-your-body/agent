"""OpenAI image generation: 2D illustrations (transparent) + thumbnail art."""
import base64, os, time, requests, pathlib
from .common import CFG

API = 'https://api.openai.com/v1/images/generations'

def gen(prompt, out, size='1024x1024', transparent=False, quality='medium', retries=3):
    body = {'model': CFG['models']['openai_image'], 'prompt': prompt, 'size': size, 'quality': quality, 'n': 1}
    if transparent: body['background'] = 'transparent'; body['output_format'] = 'png'
    for a in range(retries):
        try:
            r = requests.post(API, headers={'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY']}, json=body, timeout=300)
            r.raise_for_status()
            pathlib.Path(out).write_bytes(base64.b64decode(r.json()['data'][0]['b64_json']))
            return out
        except Exception as e:
            print('image error', e, getattr(e, 'response', None) and e.response.text[:300]); time.sleep(8 * (a + 1))
    return None

def illustration(prompt, style_hint, out):
    p = (f"Flat 2D vector illustration for an animated health explainer, {style_hint}. Subject: {prompt}. "
         "Clean shapes, no text, no letters, no watermark, isolated on a transparent background, centered, friendly, not gory.")
    return gen(p, out, transparent=True)

def thumbnail_art(prompt, out):
    p = (f"YouTube thumbnail illustration, highly detailed, dramatic lighting, bold contrast, professional digital art. {prompt}. "
         "Leave clear empty space in the top third for a headline. No text, no letters, no watermark.")
    return gen(p, out, size='1536x1024', quality='high')
