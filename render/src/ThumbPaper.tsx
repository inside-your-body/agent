// The channel's thumbnail template (owner, Nov 12), made in code for free (Nov 18): warm paper background, a black-and-white photo of a
// person in the centre, the HUGE topic word on the left in rough black lettering, a tilted red box with the white curiosity question on the
// right, one red accent arrow. Persian, right-to-left, the owner's fonts.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import './theme';
import {faNum} from './PicEpisode';

export type ThumbPaperProps = {img?: string; keyword: string; question: string};

const grain = 'repeating-radial-gradient(circle at 17% 23%, rgba(0,0,0,0.025) 0 1px, transparent 1px 3px), repeating-radial-gradient(circle at 71% 64%, rgba(0,0,0,0.02) 0 1px, transparent 1px 4px)';

export const ThumbPaper: React.FC<ThumbPaperProps> = ({img, keyword, question}) => {
  const kw = faNum(keyword || ''), q = faNum(question || '');
  const words = q.split(/\s+/).filter(Boolean);
  const half = Math.ceil(words.length / 2);
  const lines = words.length > 3 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [q];
  const kwSize = Math.max(180, Math.min(340, 1900 / Math.max(2, kw.length)));
  const qSize = Math.max(86, Math.min(128, 1050 / Math.max(4, Math.max(...lines.map((l) => l.length)))));
  return <AbsoluteFill style={{background: '#EEE7DA', overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, backgroundImage: grain}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(120,100,70,0.22) 100%)'}} />
    {img && <Img src={staticFile(img)} style={{position: 'absolute', left: 560, top: 60, width: 800, height: 1020, objectFit: 'cover',
      filter: 'grayscale(1) contrast(1.25) brightness(1.02)',
      WebkitMaskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, #000 50%, transparent 98%)',
      maskImage: 'radial-gradient(ellipse 55% 65% at 50% 45%, #000 50%, transparent 98%)'}} />}
    {/* red accent arrow */}
    <svg width="230" height="230" viewBox="0 0 100 100" style={{position: 'absolute', left: 1260, top: 30, transform: 'rotate(-8deg)'}}>
      <path d="M8 88 L38 58 L52 70 L84 22" fill="none" stroke="#D7261E" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 18 L90 14 L86 38 Z" fill="#D7261E" />
    </svg>
    {/* topic word, left */}
    <div style={{position: 'absolute', left: 50, top: 170, width: 640, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      direction: 'rtl', transform: 'rotate(-4deg)'}}>
      <div style={{fontFamily: 'F_lalezar', fontSize: kwSize, lineHeight: 1.15, color: '#111', textAlign: 'center',
        textShadow: '3px 3px 0 rgba(0,0,0,0.15), -2px 1px 0 rgba(255,255,255,0.35)', letterSpacing: -2}}>{kw}</div>
    </div>
    {/* curiosity question, right, in a tilted red box */}
    <div style={{position: 'absolute', right: 40, top: 300, transform: 'rotate(-3deg)', background: '#D7261E', padding: '18px 40px 30px',
      boxShadow: '0 18px 40px rgba(0,0,0,0.35)', direction: 'rtl', maxWidth: 700}}>
      {lines.map((l, i) => <div key={i} style={{fontFamily: 'F_sfblack', fontSize: qSize, lineHeight: 1.35, color: '#fff', textAlign: 'center',
        whiteSpace: 'nowrap'}}>{l}</div>)}
    </div>
  </AbsoluteFill>;
};
