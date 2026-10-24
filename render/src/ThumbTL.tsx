// Thumbnail of the timeline format: one big clear subject image + a huge number + 2-3 words, in the channel colours.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {fitText} from './FlatShot';

const NUM = ['#FFD23F', '#FF5A4E', '#36E0D0'];
export const ThumbTL: React.FC<{number: string; words: string; subject?: string; ar?: number; v?: number}> = ({number, words, subject, ar = 1, v = 0}) => {
  const col = NUM[(v || 0) % 3];
  const ws = (words || '').toUpperCase().split(/\s+/).filter(Boolean);
  const wSize = fitText(ws, 860, 330, 190, 90);
  const nSize = Math.min(330, Math.floor(860 / Math.max(2, (number || '').length * 0.5)));
  let h = 980, w = h * ar; if (w > 1000) { w = 1000; h = w / ar; }
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 72% 50%, #1D3A6B 0%, #0B1220 62%)'}}>
    <div style={{position: 'absolute', left: 1400 - 430, top: 540 - 430, width: 860, height: 860, borderRadius: 430,
      background: `radial-gradient(circle, ${col}55 0%, transparent 65%)`}} />
    {subject && <Img src={staticFile(subject)} style={{position: 'absolute', left: 1420 - w / 2, top: 540 - h / 2, width: w, height: h, objectFit: 'contain',
      filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))'}} />}
    <div style={{position: 'absolute', left: 70, top: 70, width: 900, fontFamily: 'F_anton', fontSize: nSize, lineHeight: 1, color: col,
      textShadow: '0 8px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.6)', whiteSpace: 'nowrap'}}>{number}</div>
    <div style={{position: 'absolute', left: 70, top: 120 + nSize, width: 880, height: 330, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start',
      gap: `0 ${wSize * 0.25}px`, fontFamily: 'F_anton', fontSize: wSize, lineHeight: 1.04}}>
      {ws.map((x, i) => <span key={i} style={{color: i === ws.length - 1 ? '#36E0D0' : '#FFFFFF', textShadow: '0 6px 0 rgba(0,0,0,0.6)'}}>{x}</span>)}
    </div>
    <div style={{position: 'absolute', inset: 0, border: '14px solid #36E0D0', opacity: 0.85}} />
  </AbsoluteFill>;
};
