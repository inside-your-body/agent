"""Test the ChatGPT thumbnail step on a saved episode: python -m agent.thumbtest tests/sugar_episode.json"""
import sys, pathlib
from .common import WORK, load
from . import tl

ep = load(pathlib.Path(sys.argv[1]))
d = WORK / 'thumbtest'; d.mkdir(parents=True, exist_ok=True)
(d / 'thumbnail.jpg').unlink(missing_ok=True)
tl.thumbs(ep, d)
print('summary:', (d / 'thumbs' / 'summary.txt').read_text())
