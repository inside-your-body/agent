// Shorts cover (owner, Oct 30): a designed vertical cover made in code (no AI image, $0) — huge headline, a time-stamp badge
// and the glowing hologram body with the Short's organ lit, in the channel colours. Uploaded as the Short's thumbnail.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Anatomy, Organ} from './kit/Anatomy';
import {TL} from './Timeline';

export const ShortCover: React.FC<{title: string; organ?: string; stamp?: string}> = ({title, organ = 'none', stamp}) => {
  const ws = (title || '').replace(/#\w+/g, '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const total = ws.join(' ').length;
  const size = total > 34 ? 104 : total > 22 ? 124 : 150;
  const maxW = 960, wid = (a: string[]) => a.join(' ').length * size * 0.47;
  const lines: string[][] = [[]];
  ws.forEach((w) => { const cur = lines[lines.length - 1]; if (cur.length && wid([...cur, w]) > maxW) lines.push([w]); else cur.push(w); });
  const top = 200, lh = size * 1.06;
  const hEnd = top + lines.length * lh;
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 68%, #1D3A6B 0%, #0B1220 62%)'}}>
    <svg width={1080} height={1920} viewBox="0 0 1080 1920">
      <text x={540} y={120} textAnchor="middle" fontFamily="F_inter" fontWeight={800} fontSize={34} letterSpacing={10} fill={TL.mute}>INSIDE YOUR BODY</text>
      {lines.map((ln, i) => <text key={i} x={540} y={top + size * 0.9 + i * lh} textAnchor="middle" fontFamily="F_anton" fontSize={size}
        stroke="#000" strokeWidth={10} paintOrder="stroke" strokeLinejoin="round">
        {ln.map((w, j) => <tspan key={j} fill={i === lines.length - 1 && j === ln.length - 1 ? '#FFD23F' : '#FFFFFF'}>{w + (j < ln.length - 1 ? ' ' : '')}</tspan>)}
      </text>)}
      {stamp && <g transform={`translate(540 ${hEnd + 110})`}>
        <rect x={-stamp.length * 34 - 50} y={-62} width={stamp.length * 68 + 100} height={124} rx={62} fill="#FFD23F" />
        <text y={36} textAnchor="middle" fontFamily="F_anton" fontSize={96} fill="#0B1220">{stamp}</text>
      </g>}
      <circle cx={540} cy={1380} r={430} fill="#36E0D0" opacity={0.07} />
      <Anatomy x={540} y={1370} s={Math.min(0.95, (1840 - (hEnd + 220)) / 1000)} focus={(organ || 'none') as Organ} f={30} at={0} id="cv" />
    </svg>
    <div style={{position: 'absolute', inset: 0, border: '16px solid #36E0D0', opacity: 0.85}} />
  </AbsoluteFill>;
};
