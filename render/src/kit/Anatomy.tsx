// Signature "medical hologram" body: anatomically placed organs with gradients and detail lines.
// Off = faint hologram outline, on = full colour + glow + pulse. Body-local coordinates: x ±210, y -500..500.
import React from 'react';
import {spring, interpolate} from 'remotion';

export type Organ = 'brain' | 'heart' | 'lungs' | 'liver' | 'stomach' | 'pancreas' | 'gut' | 'kidneys' | 'bladder' | 'vessels' | 'muscle' | 'skin' | 'fat' | 'bones' | 'none';
const HOLO = '#36E0D0';

type Part = {c: string; c2: string; fill: string[]; detail?: string[]; tube?: {d: string; w: number}[]; cx: number; cy: number};
const P: Record<string, Part> = {
  brain: {c: '#FF9EB8', c2: '#C2557A', cx: 0, cy: -420,
    fill: ['M-4 -472 C-40 -480 -74 -460 -76 -426 C-78 -394 -60 -370 -32 -366 C-18 -364 -8 -370 -4 -380 Z',
      'M4 -472 C40 -480 74 -460 76 -426 C78 -394 60 -370 32 -366 C18 -364 8 -370 4 -380 Z'],
    detail: ['M-60 -440 C-48 -452 -36 -438 -24 -450 C-14 -460 -10 -446 -8 -440', 'M-66 -414 C-52 -426 -40 -408 -28 -420 C-18 -430 -12 -416 -8 -410',
      'M-56 -390 C-44 -400 -34 -384 -20 -394', 'M60 -440 C48 -452 36 -438 24 -450 C14 -460 10 -446 8 -440',
      'M66 -414 C52 -426 40 -408 28 -420 C18 -430 12 -416 8 -410', 'M56 -390 C44 -400 34 -384 20 -394']},
  lungs: {c: '#8FD3FF', c2: '#3D7FB8', cx: 0, cy: -170,
    fill: ['M-24 -246 C-52 -260 -92 -238 -106 -188 C-118 -140 -114 -104 -102 -90 C-80 -94 -52 -98 -30 -102 C-24 -150 -22 -200 -24 -246Z',
      'M24 -246 C52 -260 92 -238 106 -188 C118 -140 114 -104 102 -90 C82 -94 62 -98 48 -102 C40 -122 30 -132 26 -142 C24 -182 22 -220 24 -246Z'],
    detail: ['M0 -235 L-34 -200 L-60 -170 M-34 -200 L-44 -150 M-60 -170 L-84 -140 M-60 -170 L-70 -120',
      'M0 -235 L34 -200 L60 -170 M34 -200 L44 -160 M60 -170 L84 -140 M60 -170 L74 -122'],
    tube: [{d: 'M0 -300 L0 -235', w: 9}]},
  heart: {c: '#FF5A6E', c2: '#A3243A', cx: 14, cy: -134,
    fill: ['M0 -166 C-26 -172 -40 -146 -32 -122 C-24 -100 8 -86 30 -80 C46 -100 56 -126 50 -148 C44 -170 22 -174 0 -166Z'],
    detail: ['M8 -162 C18 -138 22 -112 30 -86', 'M-20 -150 C-10 -140 6 -138 20 -146'],
    tube: [{d: 'M2 -166 C0 -196 30 -204 36 -178', w: 10}, {d: 'M-10 -164 L-14 -190', w: 7}]},
  liver: {c: '#D9674E', c2: '#8A2E1E', cx: -50, cy: -68,
    fill: ['M-110 -94 C-60 -106 10 -106 42 -90 C36 -72 10 -58 -20 -48 C-60 -36 -98 -38 -110 -52 C-116 -68 -116 -86 -110 -94Z'],
    detail: ['M-14 -102 C-20 -84 -24 -66 -30 -50', 'M-90 -80 C-70 -76 -50 -74 -34 -74']},
  stomach: {c: '#FFB37A', c2: '#C46A2E', cx: 56, cy: -44,
    fill: ['M30 -86 C50 -96 84 -90 90 -66 C96 -36 86 -6 60 4 C40 10 20 0 14 -12 C24 -16 40 -14 50 -26 C58 -40 50 -56 36 -62 C30 -70 28 -80 30 -86Z'],
    detail: ['M44 -78 C62 -76 76 -60 76 -40', 'M40 -60 C56 -50 66 -34 60 -16']},
  pancreas: {c: '#FFD23F', c2: '#B8901A', cx: 30, cy: 4,
    fill: ['M-22 -2 C10 -14 50 -14 86 -8 C92 -2 88 6 80 6 C50 4 20 10 -6 16 C-18 18 -28 8 -22 -2Z'],
    detail: ['M-10 4 C20 -4 50 -6 78 -2']},
  kidneys: {c: '#E0708A', c2: '#8E2F48', cx: 0, cy: 8,
    fill: ['M-62 -24 C-84 -30 -98 -8 -92 18 C-86 40 -66 42 -60 28 C-68 20 -68 0 -60 -8 C-56 -16 -56 -22 -62 -24Z',
      'M62 -24 C84 -30 98 -8 92 18 C86 40 66 42 60 28 C68 20 68 0 60 -8 C56 -16 56 -22 62 -24Z'],
    tube: [{d: 'M-62 30 C-50 70 -24 110 -10 146', w: 4}, {d: 'M62 30 C50 70 24 110 10 146', w: 4}]},
  gut: {c: '#F2A6A0', c2: '#B5605A', cx: 0, cy: 86,
    fill: [],
    tube: [{d: 'M-58 136 L-68 44 Q-68 26 -50 26 L50 26 Q68 26 68 44 L64 122 Q58 140 30 140', w: 22},
      {d: 'M-40 60 C-20 46 0 74 20 58 C40 44 46 70 30 82 C10 96 -10 70 -30 86 C-46 100 -30 118 -10 108 C10 98 26 120 40 108', w: 10}]},
  bladder: {c: '#9FD8FF', c2: '#4C8BB5', cx: 0, cy: 156, fill: ['M-22 150 C-24 136 24 136 22 150 C20 168 -20 168 -22 150Z']},
};
const ORDER = ['kidneys', 'lungs', 'liver', 'stomach', 'pancreas', 'gut', 'bladder', 'heart', 'brain'];

const OUTLINE = 'M0 -500 Q-66 -500 -70 -430 Q-74 -360 -26 -334 L-30 -306 Q-120 -296 -150 -244 L-206 -44 Q-214 -12 -194 -2 Q-174 4 -166 -26 L-122 -186 L-114 -10 Q-120 80 -102 160 L-82 470 Q-80 496 -54 496 Q-30 496 -28 470 L-10 196 L10 196 L28 470 Q30 496 54 496 Q80 496 82 470 L102 160 Q120 80 114 -10 L122 -186 L166 -26 Q174 4 194 -2 Q214 -12 206 -44 L150 -244 Q120 -296 30 -306 L26 -334 Q74 -360 70 -430 Q66 -500 0 -500Z';

const VESSELS = ['M0 -170 L0 140', 'M0 140 L-40 200 L-56 460', 'M0 140 L40 200 L56 460', 'M0 -250 L-90 -250 L-160 -40', 'M0 -250 L90 -250 L160 -40', 'M0 -300 L-14 -380', 'M0 -300 L14 -380'];

export const Anatomy: React.FC<{x: number; y: number; s: number; focus: Organ | Organ[]; f: number; at: number; id?: string}> = ({x, y, s, focus, f, at, id = 'b'}) => {
  const foc = Array.isArray(focus) ? focus : [focus];
  const k = spring({frame: f - at, fps: 30, config: {damping: 14, stiffness: 120}});
  const pulse = 0.5 + 0.5 * Math.sin(f / 7);
  const scan = ((f * 6) % 1300) - 520;
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <defs>
      <filter id={`${id}glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
      <clipPath id={`${id}clip`}><path d={OUTLINE} /></clipPath>
      <linearGradient id={`${id}scan`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HOLO} stopOpacity="0" /><stop offset="0.8" stopColor={HOLO} stopOpacity="0.2" /><stop offset="1" stopColor={HOLO} stopOpacity="0" /></linearGradient>
      {Object.entries(P).map(([n, p]) => <radialGradient key={n} id={`${id}g${n}`} cx="40%" cy="35%" r="75%">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" /><stop offset="0.25" stopColor={p.c} /><stop offset="1" stopColor={p.c2} /></radialGradient>)}
    </defs>
    <path d={OUTLINE} fill="#0F1B30" opacity={0.92} />
    <g clipPath={`url(#${id}clip)`}>
      {Array.from({length: 26}).map((_, i) => <line key={i} x1={-220} x2={220} y1={-500 + i * 40} y2={-500 + i * 40} stroke={HOLO} strokeWidth={1} opacity={0.06} />)}
      <rect x={-220} y={scan - 120} width={440} height={120} fill={`url(#${id}scan)`} />
      {/* skeleton hint */}
      <g stroke={HOLO} strokeWidth={2} fill="none" opacity={0.12}>
        <path d="M0 -330 L0 150" strokeDasharray="10 6" />
        {[-230, -205, -180, -155, -130, -105].map((yy) => <path key={yy} d={`M0 ${yy} Q-80 ${yy - 14} -110 ${yy + 30} M0 ${yy} Q80 ${yy - 14} 110 ${yy + 30}`} />)}
        <path d="M-90 140 Q0 100 90 140 Q60 190 0 180 Q-60 190 -90 140Z" />
      </g>
      {/* vessels */}
      {(foc.includes('vessels')) && VESSELS.map((d, i) => <path key={i} d={d} stroke="#FF5A6E" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.5 + 0.5 * k}
        strokeDasharray="30 14" strokeDashoffset={-f * 3} />)}
      {foc.includes('fat') && [[-80, 70], [80, 70], [-60, 160], [60, 160], [-96, -20], [96, -20]].map(([cx, cy], i) =>
        <circle key={i} cx={cx} cy={cy} r={22} fill="#FFD23F" opacity={0.75 * k} stroke="#fff" strokeWidth={2} />)}
    </g>
    {ORDER.map((n) => {
      const p = P[n]; const on = foc.includes(n as Organ);
      const base = n === 'brain' ? 0.8 : 1;
      const sc = base * (on ? 1 + 0.1 * k + 0.02 * pulse : 1);
      const tr = `translate(${p.cx} ${p.cy}) scale(${sc}) translate(${-p.cx} ${-p.cy})`;
      return <g key={n} transform={tr}>
        {on && <g filter={`url(#${id}glow)`} opacity={0.7 * k}>
          {p.fill.map((d, i) => <path key={i} d={d} fill={p.c} />)}
          {(p.tube || []).map((t, i) => <path key={i} d={t.d} stroke={p.c} strokeWidth={t.w + 8} fill="none" strokeLinecap="round" />)}
        </g>}
        {(p.tube || []).map((t, i) => <path key={i} d={t.d} stroke={on ? p.c : HOLO} strokeWidth={t.w} fill="none" strokeLinecap="round" strokeLinejoin="round"
          opacity={on ? 1 : 0.32} />)}
        {p.fill.map((d, i) => <path key={i} d={d} fill={on ? `url(#${id}g${n})` : HOLO} fillOpacity={on ? 1 : 0.08}
          stroke={on ? '#FFFFFF' : HOLO} strokeOpacity={on ? 0.8 : 0.45} strokeWidth={on ? 2.5 : 2} />)}
        {(p.detail || []).map((d, i) => <path key={i} d={d} stroke={on ? p.c2 : HOLO} strokeWidth={on ? 3 : 1.5} fill="none" opacity={on ? 0.8 : 0.3} strokeLinecap="round" />)}
      </g>;
    })}
    <path d={OUTLINE} fill="none" stroke={HOLO} strokeWidth={4} opacity={0.8} />
    <path d={OUTLINE} fill="none" stroke={HOLO} strokeWidth={14} opacity={0.08} />
    {/* callout ring on the focused organ */}
    {foc.filter((n) => P[n]).slice(0, 1).map((n) => {
      const p = P[n]; const r = (n === 'brain' ? 60 : 70) + 10 * pulse;
      return <g key={n} opacity={interpolate(f, [at, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}>
        <circle cx={p.cx} cy={p.cy} r={r} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeDasharray="6 8" opacity={0.6}
          transform={`rotate(${f * 1.5} ${p.cx} ${p.cy})`} />
      </g>;
    })}
  </g>;
};
export const ORGAN_POS = Object.fromEntries(Object.entries(P).map(([n, p]) => [n, [p.cx, p.cy]]));
export const PARTS = P;
