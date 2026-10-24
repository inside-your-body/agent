"""Quick check of the image models (after OpenAI shut down gpt-image-1): one MAX pose via edits + transparency handling."""
from .common import WORK
from . import images, flat
from .cutout import touches_edge, trim

def main():
    out = WORK / 'imgtest'; out.mkdir(parents=True, exist_ok=True)
    p = out / 'pose.png'
    images.edit(flat.LOOK + ' ' + flat.MAX + 'MAX sneezing hard into his elbow, eyes squeezed shut.', [str(flat.SHEET)], p,
                size='1024x1536', transparent=True, quality='medium')
    print('model:', images._OK, 'exists:', p.exists())
    if p.exists():
        print('edge:', touches_edge(p), 'ar:', trim(p, out / 'pose_trim.png'))

if __name__ == '__main__':
    main()
