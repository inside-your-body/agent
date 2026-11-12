// Persian thumbnail (Nov 2026): AI picture without text (subject on the left) + a big Persian headline set in code with the
// owner's fonts (image models cannot write Persian). line1 white, line2 in the accent colour, optional number badge.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import './theme';
import {faNum} from './PicEpisode';

export type ThumbFAProps = {img?: string; line1: string; line2?: string; badge?: string; accent?: string; bg?: string; side?: 'right' | 'left'};

export const ThumbFA: React.FC<ThumbFAProps> = ({img, line1, line2, badge, accent = '#FFD23F', bg = '#0B1220', side = 'right'}) => {
  const l1 = faNum(line1 || ''), l2 = faNum(line2 || '');
  const longest = Math.max(l1.length, l2.length);
  const size = Math.max(120, Math.min(230, 2300 / Math.max(1, longest)));
  const stroke = '0 0 0 #000, 5px 5px 0 #000, -5px 5px 0 #000, 5px -5px 0 #000, -5px -5px 0 #000, 0 12px 30px rgba(0,0,0,0.7)';
  const r = side === 'right';
  return <AbsoluteFill style={{background: bg, overflow: 'hidden'}}>
    {img && <Img src={staticFile(img)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />}
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${r ? 270 : 90}deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0) 62%)`}} />
    <div style={{position: 'absolute', top: 70, bottom: 70, [r ? 'right' : 'left']: 70, width: 1000, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: r ? 'flex-end' : 'flex-start', direction: 'rtl', gap: 0}}>
      <div style={{fontFamily: 'F_lalezar', fontSize: size, lineHeight: 1.3, color: '#fff', textShadow: stroke, textAlign: 'right', whiteSpace: 'nowrap'}}>{l1}</div>
      {l2 && <div style={{fontFamily: 'F_lalezar', fontSize: size * 1.08, lineHeight: 1.3, color: accent, textShadow: stroke, textAlign: 'right', whiteSpace: 'nowrap'}}>{l2}</div>}
      {badge && <div style={{marginTop: 30, transform: 'rotate(-4deg)', position: 'relative', padding: '0 40px 8px',
        background: `linear-gradient(135deg, ${accent}, #ffffff 160%)`, clipPath: 'polygon(4% 0, 100% 6%, 96% 100%, 0 92%)',
        boxShadow: '0 14px 30px rgba(0,0,0,0.6)'}}>
        <div style={{fontFamily: 'F_lalezar', fontSize: 92, lineHeight: 1.35, color: '#fff', textShadow: '0 0 0 #000, 4px 4px 0 #000, -4px 4px 0 #000, 4px -4px 0 #000, -4px -4px 0 #000'}}>{faNum(badge)}</div>
      </div>}
    </div>
  </AbsoluteFill>;
};
