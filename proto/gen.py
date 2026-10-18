"""One-off prototype asset generator (runs in GitHub Actions where the API keys live)."""
import base64, json, os, pathlib, requests, time
OUT = pathlib.Path('proto_out'); OUT.mkdir(exist_ok=True)
OA = {'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY']}
SCRIPT = open('proto/script.txt').read().strip()
INSTR = ("Voice: a captivating documentary storyteller, warm and energetic, like a top science YouTuber. "
         "Tone: curious and dramatic — build suspense, lean into surprising words, short dramatic pauses before reveals "
         "(after 'vanish', before 'So where does it go?'). Pace: lively but clear. Never monotone. American English.")
log = {}
for v in ['ash', 'onyx', 'ballad', 'verse', 'cedar', 'echo']:
    try:
        r = requests.post('https://api.openai.com/v1/audio/speech', headers=OA, timeout=300,
                          json={'model': 'gpt-4o-mini-tts', 'voice': v, 'input': SCRIPT, 'instructions': INSTR, 'response_format': 'wav'})
        r.raise_for_status(); (OUT / f'voice_{v}.wav').write_bytes(r.content); log[v] = 'ok'
    except Exception as e:
        log[v] = str(e)[:200] + ' ' + (getattr(e, 'response', None) is not None and e.response.text[:200] or '')
print(log)

def edit(prompt, refs, out, size, quality='medium'):
    files = [('image[]', (pathlib.Path(r).name, open(r, 'rb'), 'image/png')) for r in refs]
    data = {'model': 'gpt-image-1', 'prompt': prompt, 'size': size, 'quality': quality, 'n': '1'}
    for a in range(3):
        try:
            r = requests.post('https://api.openai.com/v1/images/edits', headers=OA, data=data, files=files, timeout=300)
            r.raise_for_status(); (OUT / out).write_bytes(base64.b64decode(r.json()['data'][0]['b64_json'])); return
        except Exception as e:
            print('img err', out, e, getattr(e, 'response', None) is not None and e.response.text[:300]); time.sleep(8)

STYLE = "Polished 2D cartoon animation still, flat vector shapes, soft shading, bold clean outlines, expressive faces, high-end animated science explainer. No text, no letters."
CAST = "Maya: young woman, brown bob hair, mustard-yellow hoodie, jeans. Sal: a glowing light-blue water droplet character with big eyes, smile and a small white cape."
edit(f"{STYLE} {CAST} Wide shot inside a calm modern clinic at night, teal and warm lighting: Maya sits in a reclining chair looking pale and tired, "
     "an IV drip bag hangs on a metal stand beside her, clear tube running to a small bandage on her forearm. Leave the right third calmer for graphics.",
     ['proto/cast_maya.png'], 'scene_clinic.png', '1536x1024')
edit(f"{STYLE} {CAST} A cute kidney-bean shaped cartoon character in deep red with round glasses and a headset sits at a tiny desk at night, "
     "overwhelmed by a growing stack of blue water droplets, a wall clock shows late night, moon in a window. Funny, warm.",
     ['proto/cast_kip.png'], 'scene_kidney.png', '1536x1024')
TH = ("YouTube thumbnail, 2D cartoon, ultra eye-catching, huge contrast, saturated, one clear focal point readable on a phone. "
      "Leave the top-left area clear for a headline. No text, no letters. ")
edit(TH + f"{CAST} Close-up: Maya stares in shock at an IV bag that is three-quarters EMPTY with ghostly blue droplets flying OUT of it into darkness; "
     "Sal the droplet is being pulled away, reaching back. Dark teal background, a red glow.", ['proto/cast_maya.png', 'proto/cast_sal.png'], 'thumb_a.png', '1536x1024', 'high')
edit(TH + f"{CAST} Maya's arm in the foreground with an IV needle; a glowing cut-away of her body shows blue liquid escaping through tiny holes "
     "in the blood vessels into her whole body; Maya's shocked face on the right. Dark navy background, a big red arrow pointing at the leak.",
     ['proto/cast_maya.png'], 'thumb_b.png', '1536x1024', 'high')
edit(TH + f"{CAST} Sal the droplet hero squeezing through a giant wall full of holes like a sieve, half of him already on the other side, "
     "huge round protein balls stuck behind; dramatic lighting, curious mood, a red circle around the hole.", ['proto/cast_sal.png'], 'thumb_c.png', '1536x1024', 'high')
json.dump(log, open(OUT / 'log.json', 'w'))
