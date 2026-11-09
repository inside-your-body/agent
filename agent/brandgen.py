"""Persian rebrand (Nov 2026): AI art for the new channel profile picture and banner background (text is added later in code
with the Persian fonts, image models cannot write Persian).   python -m agent.brandgen"""
from concurrent.futures import ThreadPoolExecutor
from .common import WORK
from . import images

OUT = WORK / 'brand'
NOTEXT = 'absolutely no text, no letters, no numbers, no watermark'
PROFILE = {
    'p1': ('Premium YouTube channel logo icon: a glowing translucent human head and torso in profile, x-ray style, with a warm glowing '
           'heart and a softly lit brain visible inside, deep teal-to-midnight gradient background, cinematic rim light, centered, bold '
           'simple silhouette that reads at tiny size, ' + NOTEXT),
    'p2': ('Modern flat 2D vector logo icon for a health science channel: a stylised human silhouette with a circular magnifying lens over '
           'the chest revealing a bright red heart and blue veins inside, coral and turquoise on deep navy circle, very clean, few shapes, '
           'centered, reads at tiny size, ' + NOTEXT),
    'p3': ('Minimal iconic logo: an anatomical heart made of glowing neon lines merged with a brain shape on top, electric cyan and warm '
           'orange on a dark purple background, centered, symmetrical, crisp, reads at tiny size, ' + NOTEXT),
    'p4': ('Friendly 3D clay-style logo icon: a cute but realistic little red heart character peeking out through an open door in a human '
           'chest silhouette, soft studio lighting, mint green background, centered, reads at tiny size, ' + NOTEXT),
}
BANNER = {
    'b1': ('Wide cinematic YouTube banner background: on the right a glowing translucent human body x-ray with visible heart, lungs and '
           'brain softly lit in teal and warm orange; on the left and centre a dark deep-teal empty space with subtle floating cells and '
           'particles for a big title; elegant, premium, ' + NOTEXT),
    'b2': ('Wide flat 2D vector YouTube banner background: a calm deep navy scene with a flowing pattern of stylised organs (heart, lungs, '
           'brain, stomach, cells, DNA) in coral, turquoise and yellow arranged along the left and right edges, the centre kept empty and '
           'dark for a big title, clean, modern, ' + NOTEXT),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [(k, v, '1024x1024') for k, v in PROFILE.items()] + [(k, v, '1536x1024') for k, v in BANNER.items()]
    def one(j):
        k, p, size = j
        return images.gen(p, OUT / f'{k}.png', size=size, quality='high')
    with ThreadPoolExecutor(3) as ex: print(list(ex.map(one, jobs)))


if __name__ == '__main__':
    main()
