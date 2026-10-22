// Thumbnails as code-drawn stills: GenThumb renders a Claude-written thumbnail component; ThumbT is the template fallback (concept 1).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {THUMBS} from './gen/thumbs';

class Boundary extends React.Component<{children: React.ReactNode}, {err: boolean}> {
  state = {err: false};
  static getDerivedStateFromError() { return {err: true}; }
  componentDidCatch(e: any) { console.error('GEN_SHOT_ERROR', String(e)); }
  render() { return this.state.err ? <AbsoluteFill style={{background: '#FF00FF'}} /> : this.props.children; }
}

export const GenThumb: React.FC<{id: string; kit: string}> = ({id, kit}) => {
  const C = THUMBS[id];
  if (!C) { console.error('GEN_SHOT_ERROR missing ' + id); return <AbsoluteFill style={{background: '#FF00FF'}} />; }
  return <Boundary><AbsoluteFill><C kit={kit} /></AbsoluteFill></Boundary>;
};

export const ThumbT: React.FC<{lines: string[]; title: string}> = ({lines, title}) => {
  const L = (lines && lines.length ? lines : [title.toUpperCase()]).slice(0, 3);
  const size = Math.min(230, Math.floor(1500 / Math.max(...L.map((x) => x.length), 6) * 1.75));
  return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs><radialGradient id="tg" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#5A0E14" /><stop offset="100%" stopColor="#050304" /></radialGradient></defs>
    <rect width={1920} height={1080} fill="url(#tg)" />
    {L.map((x, i) => <text key={i} x={960} y={540 - (L.length - 1) * size * 0.52 + i * size * 1.04 + size * 0.35} textAnchor="middle" fontFamily="F_anton" fontSize={size}
      fill={i === 0 ? '#FFFFFF' : '#FFD21F'} stroke="#000" strokeWidth={size * 0.06} paintOrder="stroke">{x}</text>)}
  </svg></AbsoluteFill>;
};
