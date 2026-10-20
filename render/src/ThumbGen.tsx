// Thumbnails as code-drawn stills: GenThumb renders a Claude-written thumbnail component; ThumbT is the template fallback (concept 1).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {THUMBS} from './gen/thumbs';
import {POSES} from './kit/Kit';
import {STYLES, Hero} from './kit/Styles';

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
  const t = (title || '').toLowerCase();
  const pose = /head|brain|migraine|sleep|memory|dizz/.test(t) ? POSES.holdHead : /heart|chest|lung|breath|smok|cough/.test(t) ? POSES.holdChest
    : /stomach|gut|kidney|liver|belly|bloat|digest|stone|bladder|pee|urin/.test(t) ? POSES.holdBelly : POSES.holdSide;
  const S = {...STYLES.flat, shirt: '#2E7DF6', skin: '#F6C7A1'};
  const L = (lines && lines.length ? lines : [title.toUpperCase()]).slice(0, 3);
  const size = Math.min(210, Math.floor(1150 / Math.max(...L.map((x) => x.length), 6) * 1.75));
  return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <defs><radialGradient id="tg"><stop offset="0%" stopColor="#FF3B30" stopOpacity={0.85} /><stop offset="100%" stopColor="#FF3B30" stopOpacity={0} /></radialGradient></defs>
    <rect width={1920} height={1080} fill="#0B1E3A" />
    <circle cx={520} cy={560} r={640} fill="url(#tg)" />
    <Hero s={S} x={480} y={1110} scale={3.2} pose={pose} mood="pain" />
    {L.map((x, i) => <text key={i} x={1860} y={330 + i * size * 1.05} textAnchor="end" fontFamily="F_anton" fontSize={size}
      fill={i === 0 ? '#FFFFFF' : '#FFD23D'} stroke="#000" strokeWidth={size * 0.07} paintOrder="stroke">{x}</text>)}
  </svg></AbsoluteFill>;
};
