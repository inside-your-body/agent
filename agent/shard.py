"""Parallel rendering: the long video is split into N frame ranges rendered by separate GitHub jobs (+ one job for the Short),
then concatenated losslessly. usage: python -m agent.shard <index> <count>   (last index = the Short)"""
import os, sys, subprocess
from .common import ROOT, WORK, load, sh
from . import assets, genmotion

def run(i, n):
    cur = load(WORK / 'current.json')
    ep_dir = WORK / cur['dir']
    assets.stage_for_render(ep_dir); genmotion.stage(ep_dir)
    parts = ep_dir / 'parts'; parts.mkdir(exist_ok=True)
    if i == n - 1:
        kind, comp, rng = 'short', 'Short', None
    else:
        kind, comp = 'long', 'Long'
        total = load(ep_dir / 'props_long.json')['frames']
        k = n - 1; step = -(-total // k)
        a, b = i * step, min(total, (i + 1) * step) - 1
        if a > b: return
        rng = f'{a}-{b}'
    out = parts / (f'{kind}_{i:02d}.mp4' if rng else f'{kind}.mp4')
    conc = os.environ.get('RENDER_CONCURRENCY', str(max(1, os.cpu_count() or 2)))
    cmd = ['npx', 'remotion', 'render', 'src/index.ts', comp, str(out), f'--props={ep_dir / f"props_{kind}.json"}',
           f'--concurrency={conc}', '--muted', '--log=warn']
    if rng: cmd.append(f'--frames={rng}')
    sh(cmd, cwd=ROOT / 'render')
    print('shard done', out)

def concat(ep_dir):
    parts = ep_dir / 'parts'
    if not parts.exists(): return
    longs = sorted(parts.glob('long_*.mp4'))
    if longs and not (ep_dir / 'silent_long.mp4').exists():
        lst = parts / 'list.txt'; lst.write_text(''.join(f"file '{p.resolve()}'\n" for p in longs))
        sh(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(ep_dir / 'silent_long.mp4')])
    if (parts / 'short.mp4').exists() and not (ep_dir / 'silent_short.mp4').exists():
        (parts / 'short.mp4').rename(ep_dir / 'silent_short.mp4')

if __name__ == '__main__':
    run(int(sys.argv[1]), int(sys.argv[2]))
