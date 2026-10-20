// Style packs + an upgraded hero character. The same puppets render in each design style from the owner's list.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {pop, lerp, rnd, Pose, POSES, mixPose} from './Kit';

export type Sty = {
  id: string; name: string; bg: string; bg2: string; ink: string; accent: string; accent2: string;
  skin: string; shirt: string; pants: string; hair: string; stone: string; wall: string; lumen: string; urine: string;
  line: number; lineColor: string; lineOnly?: boolean; halftone?: boolean; riso?: boolean; grid?: boolean; glass?: boolean;
  font: string; upper?: boolean; swissDot?: string;
};

export const STYLES: Record<string, Sty> = {
  flat: {id: 'flat', name: 'Flat 2D', bg: '#13233B', bg2: '#1C3150', ink: '#F5EFE6', accent: '#FF6B5B', accent2: '#FFC845',
    skin: '#F2C6A0', shirt: '#3DDC97', pants: '#2B4C7E', hair: '#3A2A20', stone: '#FFC845', wall: '#E07A80', lumen: '#25406A', urine: '#F2C14E',
    line: 6, lineColor: '#0B1626', font: 'F_poppins'},
  line: {id: 'line', name: 'Line Art', bg: '#F3EEE3', bg2: '#E9E2D3', ink: '#1E1E1E', accent: '#F2A07B', accent2: '#1E1E1E',
    skin: 'none', shirt: 'none', pants: 'none', hair: '#1E1E1E', stone: '#F2A07B', wall: 'none', lumen: 'none', urine: '#1E1E1E',
    line: 5, lineColor: '#1E1E1E', lineOnly: true, font: 'F_dmserif'},
  swiss: {id: 'swiss', name: 'Swiss', bg: '#F4F4F0', bg2: '#E6E6E1', ink: '#111111', accent: '#E3241B', accent2: '#111111',
    skin: '#111111', shirt: '#E3241B', pants: '#111111', hair: '#111111', stone: '#E3241B', wall: '#111111', lumen: '#F4F4F0', urine: '#111111',
    line: 0, lineColor: '#111111', grid: true, font: 'F_inter', upper: true},
  pop: {id: 'pop', name: 'Pop Art', bg: '#FFD23D', bg2: '#FFB800', ink: '#111111', accent: '#E8263A', accent2: '#1E5BFF',
    skin: '#FFC9A8', shirt: '#1E5BFF', pants: '#111111', hair: '#111111', stone: '#E8263A', wall: '#E8263A', lumen: '#FFF4D6', urine: '#1E5BFF',
    line: 10, lineColor: '#111111', halftone: true, font: 'F_anton', upper: true},
  riso: {id: 'riso', name: 'Risograph', bg: '#F1E9DA', bg2: '#E8DCC6', ink: '#2A2A6E', accent: '#FF5C8A', accent2: '#00A6A6',
    skin: '#FF5C8A', shirt: '#00A6A6', pants: '#2A2A6E', hair: '#2A2A6E', stone: '#FF5C8A', wall: '#00A6A6', lumen: '#F1E9DA', urine: '#FF5C8A',
    line: 0, lineColor: '#2A2A6E', riso: true, font: 'F_archivoblack', upper: true},
  glass: {id: 'glass', name: 'Glassmorphism', bg: '#1B1446', bg2: '#3B1C6B', ink: '#FFFFFF', accent: '#7CF3FF', accent2: '#FF7AD9',
    skin: '#FFD9C2', shirt: '#7CF3FF', pants: '#5B4BD6', hair: '#2A1A4A', stone: '#FF7AD9', wall: 'rgba(255,255,255,0.18)', lumen: 'rgba(255,255,255,0.06)', urine: '#7CF3FF',
    line: 3, lineColor: 'rgba(255,255,255,0.7)', glass: true, font: 'F_montserrat'},
};

// The pack for a video theme ({kit, kitTint}): registers the tinted pack as STYLES[<kit>_ep] and returns its key.
export const kitKey = (t: any): string => {
  const base = STYLES[t?.kit] ? t.kit : 'flat';
  if (!t?.kitTint || !Object.keys(t.kitTint).length) return base;
  const key = base + '_ep';
  const tint = {...t.kitTint};
  if (STYLES[base].lineOnly) delete tint.shirt;
  STYLES[key] = {...STYLES[base], ...tint, id: key};
  return key;
};

// ---------- background per style ----------
export const StyleBg: React.FC<{s: Sty; w?: number; h?: number}> = ({s, w = 1920, h = 1080}) => {
  const f = useCurrentFrame();
  return <g>
    <rect width={w} height={h} fill={s.bg} />
    {s.glass && <><circle cx={420 + Math.sin(f / 40) * 40} cy={260} r={300} fill="#FF7AD9" opacity={0.22} />
      <circle cx={1650} cy={900 + Math.cos(f / 50) * 40} r={340} fill="#4CC9FF" opacity={0.18} /></>}
    {s.grid && Array.from({length: 13}).map((_, i) => <line key={i} x1={i * 160} y1={0} x2={i * 160} y2={h} stroke="#000" strokeWidth={1} opacity={0.08} />)}
    {s.halftone && Array.from({length: 22 * 12}).map((_, i) => { const x = (i % 22) * 90 + ((Math.floor(i / 22) % 2) * 45), y = Math.floor(i / 22) * 90;
      return <circle key={i} cx={x} cy={y} r={14 + 10 * Math.sin(x / 300 + y / 260)} fill={s.bg2} />; })}
    {s.riso && Array.from({length: 900}).map((_, i) => <circle key={i} cx={rnd(i) * w} cy={rnd(i + 0.5) * h} r={1.6} fill={s.ink} opacity={0.12} />)}
    {s.lineOnly && <rect x={30} y={30} width={w - 60} height={h - 60} fill="none" stroke={s.ink} strokeWidth={2} opacity={0.15} />}
  </g>;
};

// riso: draw twice, slightly misregistered, multiply-like
export const Riso: React.FC<{s: Sty; children: React.ReactNode}> = ({s, children}) => s.riso
  ? <g><g transform="translate(5 3)" opacity={0.55}>{children}</g><g>{children}</g></g> : <>{children}</>;

const seg = (x: number, y: number, len: number, deg: number) => [x + Math.cos(deg * Math.PI / 180) * len, y + Math.sin(deg * Math.PI / 180) * len];

// ---------- Hero: a friendlier, chunkier character with eyebrows, clothes, hands and shoes ----------
export type HMood = 'neutral' | 'happy' | 'pain' | 'shock' | 'worried' | 'determined';
export const Hero: React.FC<{s: Sty; x: number; y: number; scale?: number; pose: Pose; mood?: HMood; walk?: number; blink?: boolean; flip?: boolean;
  glow?: number}> = ({s, x, y, scale = 1, pose, mood = 'neutral', walk = 0, blink, flip, glow = 0}) => {
  const L = 78, lean = pose.lean ?? 0, crouch = (pose.crouch ?? 0) * L * 2;
  const hipY = -L * 2.05 + crouch;
  const w = walk ? Math.sin(walk) * 26 : 0;
  const [nx, ny] = seg(0, hipY, L * 1.15, -90 + lean);
  const [hx, hy] = seg(nx, ny, 58, -90 + lean + (pose.head ?? 0));
  const [sx, sy] = seg(0, hipY, L * 0.98, -90 + lean);
  const lw = s.lineOnly ? s.line : 26;
  const stroke = s.lineOnly ? s.ink : undefined;
  const limb = (ox: number, oy: number, a: [number, number], len: number, extra: number, col: string, end: 'hand' | 'shoe') => {
    const [kx, ky] = seg(ox, oy, len, a[0] + extra); const [fx, fy] = seg(kx, ky, len * 0.95, a[1] + extra);
    const d = `M${ox} ${oy} L${kx} ${ky} L${fx} ${fy}`;
    return <g>
      {!s.lineOnly && s.line > 0 && <path d={d} stroke={s.lineColor} strokeWidth={lw + s.line * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      <path d={d} stroke={s.lineOnly ? s.ink : col} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {end === 'hand' ? <circle cx={fx} cy={fy} r={s.lineOnly ? 9 : 17} fill={s.lineOnly ? 'none' : s.skin} stroke={stroke ?? (s.line ? s.lineColor : 'none')} strokeWidth={s.lineOnly ? s.line : s.line} />
        : <ellipse cx={fx + 14} cy={fy + 6} rx={s.lineOnly ? 16 : 24} ry={s.lineOnly ? 8 : 13} fill={s.lineOnly ? 'none' : s.lineColor} stroke={stroke} strokeWidth={s.line} />}
    </g>;
  };
  // torso as a rounded capsule from hip to shoulder
  const torso = `M${-34} ${hipY + 6} Q${-40} ${(hipY + sy) / 2} ${sx - 30} ${sy + 10} Q${sx} ${sy - 18} ${sx + 30} ${sy + 10} Q${40} ${(hipY + sy) / 2} ${34} ${hipY + 6} Z`;
  const R = 58;
  const brow = {neutral: 0, happy: -4, pain: 10, shock: -14, worried: 8, determined: 12}[mood];
  return <g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * scale} ${scale})`}>
    {!s.lineOnly && <ellipse cx={0} cy={8} rx={80} ry={13} fill="#000" opacity={0.18} />}
    {glow > 0 && <circle cx={22} cy={hipY - 40} r={70 + glow * 25} fill={s.accent} opacity={0.3 * glow} />}
    {limb(-14, hipY, (pose.legL ?? [96, 92]) as [number, number], L, w, s.pants, 'shoe')}
    {limb(14, hipY, (pose.legR ?? [84, 88]) as [number, number], L, -w, s.pants, 'shoe')}
    {limb(sx - 18, sy + 14, (pose.armL ?? [105, 98]) as [number, number], L * 0.7, -w * 0.6, s.skin, 'hand')}
    <path d={torso} fill={s.lineOnly ? 'none' : s.shirt} stroke={s.lineOnly ? s.ink : s.line ? s.lineColor : 'none'} strokeWidth={s.line} />
    {limb(sx + 18, sy + 14, (pose.armR ?? [75, 82]) as [number, number], L * 0.7, w * 0.6, s.skin, 'hand')}
    {/* head */}
    <circle cx={hx} cy={hy} r={R} fill={s.lineOnly ? 'none' : s.skin} stroke={s.lineOnly ? s.ink : s.line ? s.lineColor : 'none'} strokeWidth={s.line} />
    <path d={`M${hx - R - 2} ${hy - 6} Q${hx - R + 4} ${hy - R - 22} ${hx + 6} ${hy - R + 2} Q${hx + R} ${hy - R + 6} ${hx + R + 2} ${hy - 4} Q${hx + 26} ${hy - 34} ${hx - 6} ${hy - 30} Q${hx - 34} ${hy - 26} ${hx - R - 2} ${hy - 6}Z`}
      fill={s.lineOnly ? 'none' : s.hair} stroke={s.lineOnly ? s.ink : 'none'} strokeWidth={s.line} />
    {/* eyes with whites */}
    {[-1, 1].map((k) => { const ex = hx + k * 22, ey = hy + 4;
      return <g key={k}>
        {blink || mood === 'pain' ? <path d={`M${ex - 11} ${ey + (mood === 'pain' ? k * 0 : 0)} l11 ${mood === 'pain' ? -7 : 0} l11 ${mood === 'pain' ? 7 : 0}`} stroke={s.lineOnly ? s.ink : '#1B1B1B'} strokeWidth={5} fill="none" strokeLinecap="round" />
          : <><ellipse cx={ex} cy={ey} rx={13} ry={mood === 'shock' ? 17 : 14} fill={s.lineOnly ? 'none' : '#fff'} stroke={s.lineOnly ? s.ink : 'none'} strokeWidth={3} />
            <circle cx={ex + 2} cy={ey + 2} r={mood === 'shock' ? 5 : 7} fill="#1B1B1B" /><circle cx={ex + 5} cy={ey - 2} r={2.2} fill="#fff" /></>}
        <line x1={ex - 12} y1={ey - 22 + (k > 0 ? -brow : brow) * 0.5} x2={ex + 12} y2={ey - 22 + (k > 0 ? brow : -brow) * 0.5}
          stroke={s.lineOnly ? s.ink : s.hair} strokeWidth={6} strokeLinecap="round" />
      </g>; })}
    {/* mouth */}
    {mood === 'shock'
      ? <ellipse cx={hx} cy={hy + 36} rx={10} ry={13} fill={s.lineOnly ? 'none' : '#5A1E1E'} stroke={s.lineOnly ? s.ink : 'none'} strokeWidth={4} />
      : <path d={{neutral: `M${hx - 12} ${hy + 32} Q${hx} ${hy + 36} ${hx + 12} ${hy + 32}`, happy: `M${hx - 18} ${hy + 28} Q${hx} ${hy + 46} ${hx + 18} ${hy + 28}`,
          determined: `M${hx - 14} ${hy + 34} L${hx + 14} ${hy + 30}`, worried: `M${hx - 15} ${hy + 38} Q${hx} ${hy + 28} ${hx + 15} ${hy + 38}`,
          pain: `M${hx - 18} ${hy + 34} l9 -6 l9 6 l9 -6 l9 6`}[mood]}
          stroke={s.lineOnly ? s.ink : '#5A1E1E'} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    {(mood === 'pain' || mood === 'worried') && !s.lineOnly && <path d={`M${hx + R - 6} ${hy - 20} q8 14 0 20 q-8 -6 0 -20Z`} fill="#7CC8FF" />}
  </g>;
};

// ---------- styled stone ----------
export const SStone: React.FC<{s: Sty; x: number; y: number; scale?: number; rot?: number; mood?: HMood}> = ({s, x, y, scale = 1, rot = 0, mood = 'determined'}) => {
  let d = ''; const n = 9;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 40 : 62 + rnd(i) * 6; d += `${i ? 'L' : 'M'}${Math.cos(a) * r} ${Math.sin(a) * r}`; }
  const dark = s.lineOnly ? s.ink : '#3A2600';
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    <path d={d + 'Z'} fill={s.lineOnly ? 'none' : s.stone} stroke={s.lineOnly ? s.ink : s.line ? s.lineColor : 'none'} strokeWidth={Math.max(3, s.line)} strokeLinejoin="round" />
    <g transform={`rotate(${-rot})`}>
      <circle cx={-12} cy={-2} r={6} fill={s.swissDot ?? dark} /><circle cx={12} cy={-2} r={6} fill={dark} />
      <line x1={-22} y1={-16} x2={-4} y2={-10} stroke={dark} strokeWidth={5} strokeLinecap="round" /><line x1={22} y1={-16} x2={4} y2={-10} stroke={dark} strokeWidth={5} strokeLinecap="round" />
      <path d={mood === 'shock' ? 'M-8 16 Q0 26 8 16' : 'M-10 14 Q2 22 12 12'} stroke={dark} strokeWidth={5} fill="none" strokeLinecap="round" />
    </g>
  </g>;
};
