"""Style test (owner, Oct 31): a new picture every 3-5 s. Same 3 sentences drawn in 4 candidate styles, low + medium quality,
so the owner can pick a look and we know the real cost per picture.  python -m agent.styletest"""
import json
from concurrent.futures import ThreadPoolExecutor
from .common import WORK
from . import images

OUT = WORK / 'styletest'
SCENES = [
    "a tired office worker at 3 pm reaching for a chocolate cookie next to a cup of coffee on a desk",
    "inside the human body: a liver with small yellow fat droplets slowly shrinking, glowing softly",
    "a person on day 3 without sugar holding their head with a headache, a sweet donut on the table they are resisting",
]
STYLES = {
    'ink': "Black-and-white ink and pencil sketch illustration, hand-drawn hatching, documentary notebook look, one single red accent "
           "colour on the key element, off-white paper background, clean composition, no text",
    'flat': "Modern flat 2D vector illustration for an adult science explainer (not childish), bold simple shapes, limited palette of "
            "navy, teal, warm yellow and coral, soft gradients and subtle grain, clean composition, no text",
    'render': "Glossy 3D medical illustration, dramatic studio lighting, dark navy background with soft teal rim light, high detail, "
              "cinematic depth of field, no text",
    'photo': "Cinematic photo-realistic still, moody natural lighting, shallow depth of field, documentary film look, 16:9 frame, no text",
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for sk, st in STYLES.items():
        for i, sc in enumerate(SCENES):
            jobs.append((f'{sk}_{i}_low.png', f'{sc}. {st}.', 'low'))
        jobs.append((f'{sk}_0_medium.png', f'{SCENES[0]}. {st}.', 'medium'))
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda j: images.gen(j[1], OUT / j[0], size='1536x1024', quality=j[2]), jobs))
    from PIL import Image
    tiles = [[Image.open(OUT / f'{sk}_{i}_low.png').convert('RGB').resize((640, 427)) if (OUT / f'{sk}_{i}_low.png').exists()
              else Image.new('RGB', (640, 427)) for i in range(3)] for sk in STYLES]
    grid = Image.new('RGB', (640 * 3, 427 * len(STYLES)), 'white')
    for r, row in enumerate(tiles):
        for c, im in enumerate(row): grid.paste(im, (c * 640, r * 427))
    grid.save(OUT / 'grid.jpg', quality=88)
    print('done', json.dumps(list(STYLES)))


if __name__ == '__main__':
    main()
