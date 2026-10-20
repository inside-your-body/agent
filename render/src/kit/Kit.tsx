// Puppet kit: rigged characters and body elements that every generated scene can choreograph.
// These are puppets, not scenes — each scene stages them differently (pose, path, timing, camera).
import React from 'react';
import {useCurrentFrame, interpolate, spring, Easing} from 'remotion';

export const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], {...cl, easing: e});
export const pop = (f: number, at: number, damping = 12, stiffness = 170) =>
  spring({frame: f - at, fps: 30, config: {damping, stiffness, mass: 0.6}});
export const rnd = (i: number) => { const x = Math.sin(i * 99.13) * 43758.55; return x - Math.floor(x); };

export const PAL = {bg: '#0E1A2B', bg2: '#16263D', ink: '#F5EFE6', mute: '#8FA3BF', coral: '#FF6B5B', yellow: '#FFC845',
  mint: '#3DDC97', sky: '#5EC8FF', urine: '#F2C14E', flesh: '#E8A598', deep: '#C2454A'};

// ---------- Face (shared by all characters) ----------
export type Mood = 'neutral' | 'happy' | 'pain' | 'shock' | 'worried' | 'sly';
export const Face: React.FC<{x: number; y: number; r: number; mood: Mood; ink?: string; blink?: boolean; look?: number}> =
  ({x, y, r, mood, ink = '#1B1B1B', blink, look = 0}) => {
    const ey = y - r * 0.12, ex = r * 0.32, er = r * 0.11;
    const eyes = blink ? (
      <g stroke={ink} strokeWidth={r * 0.07} strokeLinecap="round">
        <line x1={x - ex - er} y1={ey} x2={x - ex + er} y2={ey} /><line x1={x + ex - er} y1={ey} x2={x + ex + er} y2={ey} />
      </g>) : mood === 'pain' ? (
      <g stroke={ink} strokeWidth={r * 0.08} strokeLinecap="round" fill="none">
        <path d={`M${x - ex - er} ${ey - er} L${x - ex + er} ${ey} L${x - ex - er} ${ey + er}`} />
        <path d={`M${x + ex + er} ${ey - er} L${x + ex - er} ${ey} L${x + ex + er} ${ey + er}`} />
      </g>) : (
      <g fill={ink}>
        <circle cx={x - ex + look * er * 0.6} cy={ey} r={mood === 'shock' ? er * 1.35 : er} />
        <circle cx={x + ex + look * er * 0.6} cy={ey} r={mood === 'shock' ? er * 1.35 : er} />
      </g>);
    const my = y + r * 0.32, mw = r * 0.3;
    const mouth = {
      neutral: <line x1={x - mw * 0.6} y1={my} x2={x + mw * 0.6} y2={my} stroke={ink} strokeWidth={r * 0.07} strokeLinecap="round" />,
      happy: <path d={`M${x - mw} ${my - r * 0.05} Q${x} ${my + r * 0.28} ${x + mw} ${my - r * 0.05}`} stroke={ink} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />,
      sly: <path d={`M${x - mw} ${my} Q${x + mw * 0.2} ${my + r * 0.18} ${x + mw} ${my - r * 0.1}`} stroke={ink} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />,
      worried: <path d={`M${x - mw} ${my + r * 0.08} Q${x} ${my - r * 0.12} ${x + mw} ${my + r * 0.08}`} stroke={ink} strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />,
      pain: <path d={`M${x - mw} ${my} l${mw * 0.5} ${-r * 0.1} l${mw * 0.5} ${r * 0.1} l${mw * 0.5} ${-r * 0.1} l${mw * 0.5} ${r * 0.1}`} stroke={ink} strokeWidth={r * 0.07} fill="none" strokeLinejoin="round" />,
      shock: <ellipse cx={x} cy={my + r * 0.04} rx={mw * 0.45} ry={r * 0.16} fill={ink} />,
    }[mood];
    return <g>{eyes}{mouth}</g>;
  };

// ---------- Rigged stick figure ----------
export type Pose = {lean?: number; armL?: [number, number]; armR?: [number, number]; legL?: [number, number]; legR?: [number, number];
  head?: number; crouch?: number};
export const POSES: Record<string, Pose> = {
  stand: {armL: [105, 98], armR: [75, 82], legL: [96, 92], legR: [84, 88]},
  holdSide: {lean: 8, armL: [110, 100], armR: [55, 175], legL: [97, 92], legR: [83, 88], head: 8},
  doubled: {lean: 34, armL: [115, 95], armR: [70, 190], legL: [104, 84], legR: [76, 96], head: 22, crouch: 0.1},
  point: {armL: [105, 98], armR: [-10, -5], legL: [96, 92], legR: [84, 88]},
  shrug: {armL: [150, 230], armR: [30, -50], legL: [96, 92], legR: [84, 88]},
  cheer: {armL: [-120, -100], armR: [-60, -80], legL: [100, 95], legR: [80, 85]},
  holdHead: {armL: [-160, -80], armR: [-20, -100], legL: [96, 92], legR: [84, 88], head: 6},
  holdChest: {lean: 6, armL: [105, 98], armR: [40, 200], legL: [96, 92], legR: [84, 88], head: 6},
  holdBelly: {lean: 10, armL: [120, 10], armR: [60, 170], legL: [97, 92], legR: [83, 88], head: 10},
  think: {armL: [105, 98], armR: [20, -125], legL: [96, 92], legR: [84, 88], head: -6},
  drink: {armL: [105, 98], armR: [10, -130], legL: [96, 92], legR: [84, 88], head: -14},
  wave: {armL: [105, 98], armR: [-40, -80], legL: [96, 92], legR: [84, 88]},
  run: {lean: 14, armL: [60, -10], armR: [130, 200], legL: [50, 120], legR: [125, 80]},
  tired: {lean: 18, armL: [100, 92], armR: [80, 88], legL: [96, 92], legR: [84, 88], head: 30},
};
export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (u?: number, v?: number) => (u ?? 0) + ((v ?? 0) - (u ?? 0)) * t;
  const mm = (u?: [number, number], v?: [number, number]) => [m(u?.[0], v?.[0]), m(u?.[1], v?.[1])] as [number, number];
  return {lean: m(a.lean, b.lean), head: m(a.head, b.head), crouch: m(a.crouch, b.crouch),
    armL: mm(a.armL, b.armL), armR: mm(a.armR, b.armR), legL: mm(a.legL, b.legL), legR: mm(a.legR, b.legR)};
};
const seg = (x: number, y: number, len: number, deg: number) => [x + Math.cos(deg * Math.PI / 180) * len, y + Math.sin(deg * Math.PI / 180) * len];

export const Stick: React.FC<{x: number; y: number; s?: number; pose: Pose; mood?: Mood; color?: string; hair?: string; walk?: number;
  blink?: boolean; glowSide?: number}> = ({x, y, s = 1, pose, mood = 'neutral', color = PAL.ink, hair = '#3A2A20', walk = 0, blink, glowSide = 0}) => {
  const L = 90, sw = 13;
  const crouch = (pose.crouch ?? 0) * L * 2;
  const hipY = -L * 2 + crouch;
  const lean = pose.lean ?? 0;
  const w = walk ? Math.sin(walk) * 28 : 0;
  const [nx, ny] = seg(0, hipY, L * 1.25, -90 + lean);
  const [hx, hy] = seg(nx, ny, 46, -90 + lean + (pose.head ?? 0));
  const limb = (ox: number, oy: number, a: [number, number], len: number, extra = 0) => {
    const [kx, ky] = seg(ox, oy, len, a[0] + extra); const [fx, fy] = seg(kx, ky, len * 0.95, a[1] + extra);
    return `M${ox} ${oy} L${kx} ${ky} L${fx} ${fy}`;
  };
  const [sx, sy] = seg(0, hipY, L * 1.05, -90 + lean);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={70} ry={12} fill="#000" opacity={0.25} />
      {glowSide > 0 && <circle cx={sx * 0.5 + 18} cy={(hipY + sy) / 2 + 20} r={60 + glowSide * 30} fill={PAL.coral} opacity={0.25 * glowSide} />}
      <g stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={limb(0, hipY, (pose.legL ?? [95, 92]) as [number, number], L, w)} />
        <path d={limb(0, hipY, (pose.legR ?? [85, 88]) as [number, number], L, -w)} />
        <path d={`M0 ${hipY} L${nx} ${ny}`} />
        <path d={limb(sx, sy, (pose.armL ?? [200, 190]) as [number, number], L * 0.72, -w * 0.6)} />
        <path d={limb(sx, sy, (pose.armR ?? [160, 170]) as [number, number], L * 0.72, w * 0.6)} />
      </g>
      <circle cx={hx} cy={hy} r={44} fill={color} />
      <path d={`M${hx - 46} ${hy - 4} Q${hx - 40} ${hy - 58} ${hx + 6} ${hy - 50} Q${hx + 44} ${hy - 46} ${hx + 46} ${hy - 6} Q${hx + 20} ${hy - 30} ${hx - 46} ${hy - 4}Z`} fill={hair} />
      <Face x={hx} y={hy + 6} r={44} mood={mood} blink={blink} />
    </g>
  );
};

// ---------- Kidney character (Kev) ----------
export const Kidney: React.FC<{x: number; y: number; s?: number; mood?: Mood; hat?: number; sweat?: number; swell?: number; flip?: boolean}> =
  ({x, y, s = 1, mood = 'neutral', hat = 0, sweat = 0, swell = 0, flip}) => {
    const f = useCurrentFrame();
    const k = 1 + swell * 0.12 + Math.sin(f / 6) * 0.01 * swell;
    return (
      <g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * s * k} ${s * k})`}>
        <path d="M30 -150 C150 -160 190 -40 160 60 C130 160 20 180 -40 130 C-10 80 0 30 -50 10 C-110 -15 -120 -80 -80 -120 C-50 -150 0 -148 30 -150Z"
          fill={PAL.deep} stroke="#7E1C27" strokeWidth={10} />
        <path d="M60 -110 C120 -100 140 -30 120 40" stroke="#E36A6F" strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.6} />
        <Face x={55} y={0} r={70} mood={mood} ink="#2A0A0E" />
        <g transform={`translate(${40} ${-150 + hat * 60}) rotate(${hat * 14})`}>
          <path d="M-80 10 Q0 -90 80 10 Z" fill={PAL.yellow} stroke="#B8860B" strokeWidth={8} />
          <rect x={-95} y={4} width={190} height={18} rx={9} fill={PAL.yellow} stroke="#B8860B" strokeWidth={6} />
        </g>
        {sweat > 0 && [0, 1, 2].map((i) => {
          const t = ((f / 22 + i * 0.33) % 1);
          return <path key={i} transform={`translate(${150 + i * 18} ${-80 + t * 120})`} d="M0 -14 Q10 4 0 10 Q-10 4 0 -14Z" fill={PAL.sky} opacity={sweat * (1 - t)} />;
        })}
      </g>
    );
  };

// ---------- Stone character ----------
export const Stone: React.FC<{x: number; y: number; s?: number; mood?: Mood; rot?: number; spiky?: number; color?: string}> =
  ({x, y, s = 1, mood = 'sly', rot = 0, spiky = 1, color = PAL.yellow}) => {
    const n = 9; let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? 40 : 40 + 22 * spiky + rnd(i) * 8;
      d += `${i ? 'L' : 'M'}${Math.cos(a) * r} ${Math.sin(a) * r}`;
    }
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
        <path d={d + 'Z'} fill={color} stroke="#8A6200" strokeWidth={5} strokeLinejoin="round" />
        <path d="M-18 -26 L4 -30 L-6 -12Z" fill="#FFF3C4" opacity={0.8} />
        <g transform={`rotate(${-rot})`}><Face x={0} y={4} r={34} mood={mood} ink="#3A2600" /></g>
      </g>
    );
  };

// ---------- Kinetic typography: words land on their cue frames (real text layout, never overlapping) ----------
export const KType: React.FC<{words: string[]; at: number; x: number; y: number; size?: number; color?: string; accent?: number[];
  gap?: number; font?: string; align?: 'middle' | 'start'; width?: number; accentColor?: string}> = ({words, at, x, y, size = 84, color = PAL.ink, accent = [], gap = 4, accentColor = PAL.coral,
  font = 'F_poppins', align = 'middle', width = 1700}) => {
  const f = useCurrentFrame();
  const left = align === 'middle' ? x - width / 2 : x;
  return (
    <foreignObject x={left} y={y - size * 1.05} width={width} height={size * 2.6}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: align === 'middle' ? 'center' : 'flex-start', gap: `0 ${size * 0.3}px`,
        fontFamily: font, fontWeight: 800, fontSize: size, lineHeight: 1.15}}>
        {words.map((t, i) => {
          const p = pop(f, at + i * gap, 11, 210);
          return <span key={i} style={{display: 'inline-block', color: accent.includes(i) ? accentColor : color, opacity: Math.min(1, p * 1.4),
            transform: `translateY(${(1 - p) * size * 0.5}px) rotate(${(1 - p) * -6}deg)`, whiteSpace: 'nowrap'}}>{t}</span>;
        })}
      </div>
    </foreignObject>
  );
};

// ---------- draw-on label with a thin leader line ----------
export const Label: React.FC<{x: number; y: number; tx: number; ty: number; text: string; at: number; color?: string}> =
  ({x, y, tx, ty, text, at, color = PAL.ink}) => {
    const f = useCurrentFrame(); const p = lerp(f, at, at + 14, 0, 1);
    return (
      <g opacity={p}>
        <line x1={x} y1={y} x2={x + (tx - x) * p} y2={y + (ty - y) * p} stroke={color} strokeWidth={3} />
        <circle cx={x} cy={y} r={7} fill={color} />
        <text x={tx + (tx > x ? 14 : -14)} y={ty + 12} textAnchor={tx > x ? 'start' : 'end'} fontFamily="F_montserrat" fontWeight={700}
          fontSize={34} letterSpacing={4} fill={color}>{text}</text>
      </g>
    );
  };

// ---------- liquid drops ----------
export const Drop: React.FC<{x: number; y: number; s?: number; color?: string; o?: number}> = ({x, y, s = 1, color = PAL.urine, o = 1}) =>
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -22 Q16 2 0 14 Q-16 2 0 -22Z" fill={color} opacity={o} />;
