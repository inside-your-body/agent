// Thumbnail in the channel look (owner, Oct 23): MAX big with a strong emotion + the subject with a red circle + 2 lines:
// line 1 = what the video is about (topic, white), line 2 = what you'll see / the hook (yellow). Fixed layout: nothing overlaps.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {fitText} from './FlatShot';

type Cut = {src: string; ar: number};
export type ThumbMaxProps = {max?: Cut; subject?: Cut; line1: string; line2: string; bg: string; glow: string};

const fit = (ar: number, b: {x: number; y: number; w: number; h: number}) => {
  let h = b.h, w = h * ar; if (w > b.w) { w = b.w; h = w / ar; }
  return {left: b.x + (b.w - w) / 2, top: b.y + b.h - h, width: w, height: h};
};

const Lines: React.FC<{text: string; color: string; box: {x: number; y: number; w: number; h: number}; max: number}> = ({text, color, box, max}) => {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const s = fitText(words, box.w, box.h, max, 60);
  return <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', flexWrap: 'wrap', alignContent: 'center',
    gap: `0 ${s * 0.28}px`, fontFamily: 'F_anton', fontSize: s, lineHeight: 1.04, color, WebkitTextStroke: `${Math.round(s * 0.05)}px #111`,
    paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,0.35)'}}>{words.map((w, i) => <span key={i}>{w}</span>)}</div>;
};

export const ThumbMax: React.FC<ThumbMaxProps> = ({max, subject, line1, line2, bg, glow}) => {
  const sub = {x: 650, y: 560, w: 420, h: 440};
  const s = subject ? fit(subject.ar, sub) : null;
  return <AbsoluteFill style={{background: `radial-gradient(circle at 28% 55%, ${glow} 0%, ${bg} 62%)`}}>
    {max && <Img src={staticFile(max.src)} style={{position: 'absolute', ...fit(max.ar, {x: 30, y: 40, w: 700, h: 1010})}} />}
    {s && <>
      <div style={{position: 'absolute', left: s.left - 30, top: s.top - 30, width: s.width + 60, height: s.height + 60, borderRadius: '50%',
        background: 'rgba(255,255,255,0.92)', border: '16px solid #E4252B'}} />
      <Img src={staticFile(subject!.src)} style={{position: 'absolute', ...s}} />
    </>}
    <Lines text={line1} color="#FFFFFF" box={{x: 1100, y: 70, w: 780, h: 380}} max={210} />
    <Lines text={line2} color="#FFD21F" box={{x: 1100, y: 470, w: 780, h: 470}} max={190} />
  </AbsoluteFill>;
};
