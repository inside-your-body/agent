"""Quick check of the image models (after OpenAI shut down gpt-image-1)."""
from .common import WORK, ROOT
from . import images, flat

def main():
    out = WORK / 'imgtest'; out.mkdir(parents=True, exist_ok=True)
    desc = 'MAX sneezing into his elbow, eyes squeezed shut.'
    tests = [('fullsheet', [str(flat.SHEET)]), ('ref_half', [str(ROOT / 'assets/cast/max_ref.png')]), ('noref', [])]
    for name, refs in tests:
        for model in ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-1.5']:
            images._OK['model'] = model; images._OK['transparent'] = True
            p = out / f'{name}_{model}.png'
            try:
                r = images.edit(flat.LOOK + ' ' + flat.MAX + desc, refs, p, size='1024x1536', transparent=True, quality='medium') if refs else \
                    images.gen(flat.LOOK + ' ' + flat.MAX + desc, p, size='1024x1536', transparent=True, quality='medium')
            except Exception as e:
                r = None; print('EXC', e)
            print('RESULT', name, model, 'ok' if p.exists() else 'FAIL', images._OK)

if __name__ == '__main__':
    main()
