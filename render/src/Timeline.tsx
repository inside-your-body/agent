// "Timeline inside the body" — the channel's signature look (owner approved, Oct 24):
// dark background, a glowing see-through body whose organs light up, a big timestamp, a timeline bar,
// kinetic numbers/words and simple code-drawn icons. No images, no camera zoom.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, interpolate, Sequence} from 'remotion';

export const TL = {bg: '#0B1220', bg2: '#111C33', line: '#36E0D0', glow: '#36E0D0', warm: '#FF5A4E', gold: '#FFD23F', ink: '#E8F1FF', mute: '#5B6B8A',
  organ: '#1B2A44'};
const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const sp = (f: number, at: number, d = 12, s = 180) => spring({frame: f - at, fps: 30, config: {damping: d, stiffness: s}});

export type Organ = 'brain' | 'heart' | 'lungs' | 'liver' | 'stomach' | 'pancreas' | 'gut' | 'kidneys' | 'fat' | 'tongue' | 'none';

// ---------- the signature body ----------
const ORG: Record<Exclude<Organ, 'none' | 'fat' | 'tongue'>, {d: string; c: string; cx: number; cy: number}> = {
  brain: {d: 'M-62 -380 Q-70 -440 -20 -452 Q20 -470 54 -440 Q84 -420 70 -382 Q60 -350 0 -352 Q-56 -350 -62 -380Z', c: '#FF8FB1', cx: 0, cy: -405},
  lungs: {d: 'M-14 -210 Q-80 -230 -96 -150 Q-104 -80 -40 -70 Q-14 -100 -14 -210Z M14 -210 Q80 -230 96 -150 Q104 -80 40 -70 Q14 -100 14 -210Z', c: '#8FD3FF', cx: 0, cy: -150},
  heart: {d: 'M10 -150 C-20 -180 -48 -150 -26 -118 L14 -86 L42 -122 C58 -152 34 -172 10 -150Z', c: '#FF5A6E', cx: 10, cy: -128},
  liver: {d: 'M-100 -66 Q-30 -82 30 -66 Q20 -26 -40 -16 Q-96 -14 -100 -66Z', c: '#C8553D', cx: -40, cy: -44},
  stomach: {d: 'M40 -70 Q90 -74 86 -30 Q80 10 40 8 Q20 -10 34 -30 Q30 -54 40 -70Z', c: '#FFB37A', cx: 60, cy: -30},
  pancreas: {d: 'M-30 12 Q20 -2 80 14 Q84 26 70 28 Q20 20 -26 30 Q-40 24 -30 12Z', c: '#FFD23F', cx: 26, cy: 20},
  gut: {d: 'M-70 40 Q0 24 70 40 Q86 90 60 120 Q0 140 -60 120 Q-88 90 -70 40Z', c: '#F2A6A0', cx: 0, cy: 80},
  kidneys: {d: 'M-70 -10 Q-92 0 -84 26 Q-70 40 -58 24 Q-56 4 -70 -10Z M70 -10 Q92 0 84 26 Q70 40 58 24 Q56 4 70 -10Z', c: '#E0708A', cx: 0, cy: 10},
};

export const Body: React.FC<{x: number; y: number; s: number; focus: Organ; f: number; at: number}> = ({x, y, s, focus, f, at}) => {
  const pulse = 0.6 + 0.4 * Math.sin(f / 6);
  const k = sp(f, at, 14, 120);
  const outline = 'M0 -500 Q-66 -500 -70 -430 Q-74 -360 -24 -334 L-30 -300 Q-120 -292 -150 -240 L-210 -40 Q-218 -10 -196 0 Q-176 4 -168 -24 L-118 -190 L-112 -10 Q-118 80 -100 160 L-80 470 Q-78 496 -52 496 Q-28 496 -28 470 L-8 190 L8 190 L28 470 Q28 496 52 496 Q78 496 80 470 L100 160 Q118 80 112 -10 L118 -190 L168 -24 Q176 4 196 0 Q218 -10 210 -40 L150 -240 Q120 -292 30 -300 L24 -334 Q74 -360 70 -430 Q66 -500 0 -500Z';
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={outline} fill={TL.bg2} opacity={0.85} />
    <path d={outline} fill="none" stroke={TL.line} strokeWidth={5} opacity={0.75} />
    {(Object.keys(ORG) as (keyof typeof ORG)[]).map((n) => {
      const o = ORG[n]; const on = n === focus;
      return <g key={n}>
        {on && <circle cx={o.cx} cy={o.cy} r={90 + 20 * pulse} fill={o.c} opacity={0.18 * k} />}
        <path d={o.d} fill={on ? o.c : TL.organ} stroke={on ? '#FFFFFF' : TL.mute} strokeWidth={on ? 4 : 2.5} opacity={on ? 0.6 + 0.4 * k : 0.9}
          transform={on ? `translate(${o.cx} ${o.cy}) scale(${1 + 0.12 * k}) translate(${-o.cx} ${-o.cy})` : undefined} />
      </g>;
    })}
    {focus === 'fat' && [[-90, 60], [90, 60], [-70, 180], [70, 180]].map(([cx, cy], i) =>
      <circle key={i} cx={cx} cy={cy} r={26 * (1.1 - 0.5 * interpolate(f, [at, at + 120], [0, 1], cl))} fill={TL.gold} opacity={0.85} stroke="#fff" strokeWidth={3} />)}
  </g>;
};

// ---------- typography & UI ----------
export const BigStamp: React.FC<{text: string; at: number; f: number; x: number; y: number; color?: string; size?: number}> = ({text, at, f, x, y, color = TL.gold, size = 150}) => {
  const p = sp(f, at, 11, 220);
  if (f < at) return null;
  return <text x={x} y={y} fontFamily="F_anton" fontSize={size} fill={color} opacity={Math.min(1, p * 1.5)}
    transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * p}) translate(${-x} ${-y})`} letterSpacing={2}>{text}</text>;
};

export const Words: React.FC<{words: string[]; at: number; f: number; x: number; y: number; size?: number; accent?: number; maxW?: number}> = ({words, at, f, x, y, size = 78, accent = -1, maxW = 820}) => {
  let cx = x, cy = y;
  return <g>{words.map((w, i) => {
    const ww = w.length * size * 0.52;
    if (cx > x && cx + ww > x + maxW) { cx = x; cy += size * 1.1; }
    const t0 = at + i * 5; const p = sp(f, t0, 12, 200);
    const el = f >= t0 && <text key={i} x={cx} y={cy + (1 - p) * 40} fontFamily="F_anton" fontSize={size} opacity={Math.min(1, p * 1.6)}
      fill={i === (accent < 0 ? words.length - 1 : accent) ? TL.line : TL.ink}>{w}</text>;
    cx += ww + size * 0.3;
    return el;
  })}</g>;
};

export const Counter: React.FC<{from: number; to: number; at: number; f: number; x: number; y: number; unit: string; label: string; color?: string; dur?: number}> =
  ({from, to, at, f, x, y, unit, label, color = TL.line, dur = 60}) => {
  if (f < at) return null;
  const v = Math.round(interpolate(f, [at, at + dur], [from, to], {...cl, easing: (t) => 1 - Math.pow(1 - t, 3)}));
  const o = interpolate(f, [at, at + 8], [0, 1], cl);
  return <g opacity={o}>
    <text x={x} y={y} fontFamily="F_anton" fontSize={130} fill={color}>{v}<tspan fontSize={60} dx={10}>{unit}</tspan></text>
    <text x={x} y={y + 54} fontFamily="F_inter" fontWeight={700} fontSize={30} letterSpacing={4} fill={TL.mute}>{label}</text>
  </g>;
};

// timeline bar along the bottom: milestones light up as the story moves
export const TimeBar: React.FC<{marks: string[]; active: number; f: number; at: number}> = ({marks, active, f, at}) => {
  const x0 = 140, x1 = 1780, y = 1000;
  const step = (x1 - x0) / (marks.length - 1);
  const pos = interpolate(f, [at, at + 20], [Math.max(0, active - 1), active], cl);
  return <g>
    <line x1={x0} y1={y} x2={x1} y2={y} stroke={TL.mute} strokeWidth={6} strokeLinecap="round" />
    <line x1={x0} y1={y} x2={x0 + step * pos} y2={y} stroke={TL.line} strokeWidth={6} strokeLinecap="round" />
    {marks.map((m, i) => <g key={i}>
      <circle cx={x0 + step * i} cy={y} r={i <= active ? 14 : 10} fill={i <= active ? TL.line : TL.bg} stroke={i <= active ? TL.line : TL.mute} strokeWidth={4} />
      <text x={x0 + step * i} y={y - 30} textAnchor="middle" fontFamily="F_anton" fontSize={30} fill={i === active ? TL.ink : TL.mute}>{m}</text>
    </g>)}
    <circle cx={x0 + step * pos} cy={y} r={22 + 4 * Math.sin(f / 5)} fill="none" stroke={TL.line} strokeWidth={4} opacity={0.6} />
  </g>;
};

// ---------- icons ----------
export const SugarCube: React.FC<{x: number; y: number; s?: number; r?: number}> = ({x, y, s = 1, r = 0}) =>
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M-30 -14 L0 -30 L30 -14 L0 2Z" fill="#FFFFFF" stroke="#0B1220" strokeWidth={3} />
    <path d="M-30 -14 L0 2 L0 34 L-30 18Z" fill="#DCE6F2" stroke="#0B1220" strokeWidth={3} />
    <path d="M30 -14 L0 2 L0 34 L30 18Z" fill="#C2CFE0" stroke="#0B1220" strokeWidth={3} />
  </g>;
export const Hexes: React.FC<{x: number; y: number; n: number; f: number; color?: string}> = ({x, y, n, f, color = TL.gold}) =>
  <g>{Array.from({length: n}).map((_, i) => {
    const a = i * 2.4 + f / 40, r = 60 + (i % 3) * 40;
    return <path key={i} transform={`translate(${x + Math.cos(a) * r} ${y + Math.sin(a) * r * 0.7})`} d="M-14 0 L-7 -12 L7 -12 L14 0 L7 12 L-7 12Z"
      fill="none" stroke={color} strokeWidth={4} opacity={0.85} />;
  })}</g>;
export const Meter: React.FC<{x: number; y: number; v: number; label: string; color: string}> = ({x, y, v, label, color}) =>
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={0} width={420} height={36} rx={18} fill={TL.bg2} stroke={TL.mute} strokeWidth={3} />
    <rect x={4} y={4} width={Math.max(0, 412 * v)} height={28} rx={14} fill={color} />
    <text x={0} y={-16} fontFamily="F_inter" fontWeight={700} fontSize={28} letterSpacing={3} fill={TL.mute}>{label}</text>
  </g>;
export const Spikes: React.FC<{x: number; y: number; calm: number; f: number}> = ({x, y, calm, f}) => {
  let d = `M${x} ${y}`;
  for (let i = 0; i <= 40; i++) {
    const px = x + i * 16; const spike = Math.max(0, Math.sin(i * 0.9 + f / 10)) ** 6 * 140;
    d += ` L${px} ${y - spike * (1 - calm) - 20 * Math.sin(i * 0.4)}`;
  }
  return <g><path d={d} stroke={calm > 0.5 ? TL.line : TL.warm} strokeWidth={6} fill="none" strokeLinejoin="round" />
    <line x1={x} y1={y + 20} x2={x + 640} y2={y + 20} stroke={TL.mute} strokeWidth={2} /></g>;
};
export const Battery: React.FC<{x: number; y: number; v: number; f: number}> = ({x, y, v, f}) =>
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={0} width={240} height={120} rx={18} fill="none" stroke={TL.ink} strokeWidth={8} />
    <rect x={240} y={38} width={18} height={44} rx={5} fill={TL.ink} />
    <rect x={14} y={14} width={212 * v} height={92} rx={10} fill={TL.line} opacity={0.85 + 0.15 * Math.sin(f / 8)} />
  </g>;
export const Apple: React.FC<{x: number; y: number; s?: number; glow?: number}> = ({x, y, s = 1, glow = 0}) =>
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {glow > 0 && <circle r={110} fill={TL.gold} opacity={0.25 * glow} />}
    <path d="M0 -50 Q-60 -80 -70 -10 Q-70 70 -10 74 Q0 66 10 74 Q70 70 70 -10 Q60 -80 0 -50Z" fill="#FF4D5E" stroke="#fff" strokeWidth={5} />
    <path d="M0 -50 Q0 -80 14 -96" stroke="#6B4A2B" strokeWidth={8} fill="none" strokeLinecap="round" />
    <path d="M10 -78 Q40 -100 56 -76 Q34 -64 10 -78Z" fill="#4CC38A" />
  </g>;
export const XMark: React.FC<{x: number; y: number; s: number; p: number}> = ({x, y, s, p}) =>
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={p}>
    <line x1={-100 * p} y1={-100 * p} x2={100 * p} y2={100 * p} stroke={TL.warm} strokeWidth={26} strokeLinecap="round" />
    <line x1={100 * p} y1={-100 * p} x2={-100 * p} y2={100 * p} stroke={TL.warm} strokeWidth={26} strokeLinecap="round" />
  </g>;

// ---------- the 60 s sample: "What happens to your body if sugar disappears from your life" ----------
export type TLProps = {seg: number[]; frames: number};   // seg = start frame of each narration line (7 lines)
const MARKS = ['DAY 1', 'DAY 3', 'DAY 10', 'WEEK 3', 'MONTH 1', '1 YEAR'];

export const SugarTimeline: React.FC<TLProps> = ({seg}) => {
  const f = useCurrentFrame();
  const s = seg && seg.length >= 7 ? seg : [0, 150, 360, 600, 810, 1000, 1200];
  const cur = s.filter((t) => f >= t).length - 1;          // current line 0..6
  const at = s[Math.max(0, cur)];
  const focus: Organ = ['none', 'pancreas', 'brain', 'liver', 'stomach', 'heart', 'none'][cur] as Organ;
  const bodyOn = interpolate(f, [20, 50], [0, 1], cl);
  const PX = 1000;                                          // right panel x
  return <AbsoluteFill style={{background: `radial-gradient(circle at 30% 50%, #14223D 0%, ${TL.bg} 70%)`}}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      {/* faint grid */}
      {Array.from({length: 13}).map((_, i) => <line key={i} x1={i * 160} y1={0} x2={i * 160} y2={1080} stroke="#FFFFFF" opacity={0.03} />)}
      <g opacity={bodyOn}><Body x={500} y={490} s={0.86} focus={focus === 'tongue' ? 'none' : focus} f={f} at={at} /></g>

      {/* line 0: sugar disappears */}
      {cur === 0 && <g>
        {[0, 1, 2, 3, 4, 5].map((i) => <SugarCube key={i} x={1180 + (i % 3) * 140} y={interpolate(f, [i * 6, i * 6 + 24], [-100, 380 + Math.floor(i / 3) * 110], cl)} s={1.6} r={i * 17} />)}
        <XMark x={1320} y={430} s={1.6} p={sp(f, 70, 12, 160)} />
        <Words words={['NO', 'MORE', 'SUGAR']} at={90} f={f} x={PX + 60} y={760} size={110} />
      </g>}
      {/* line 1: day 1 — no spikes, pancreas rests */}
      {cur === 1 && <g>
        <BigStamp text="DAY 1" at={at} f={f} x={PX} y={210} />
        <Spikes x={PX + 40} y={480} calm={interpolate(f, [at + 20, at + 110], [0, 1], cl)} f={f} />
        <text x={PX + 40} y={560} fontFamily="F_inter" fontWeight={700} fontSize={30} letterSpacing={4} fill={TL.mute}>BLOOD SUGAR</text>
        <Hexes x={560} y={540} n={Math.round(interpolate(f, [at, at + 120], [14, 3], cl))} f={f} />
        <Words words={['FEWER', 'INSULIN', 'BURSTS']} at={at + 40} f={f} x={PX + 40} y={700} />
      </g>}
      {/* line 2: day 3 — brain cravings */}
      {cur === 2 && <g>
        <BigStamp text="DAY 3" at={at} f={f} x={PX} y={210} />
        <Meter x={PX + 40} y={340} v={interpolate(f, [at + 10, at + 90], [0.2, 0.92], cl)} label="CRAVINGS" color={TL.warm} />
        {[0, 1, 2].map((i) => <path key={i} transform={`translate(${470 + i * 50} ${70 + Math.sin(f / 4 + i) * 6}) scale(1.4)`} d="M0 -20 L-12 4 L0 4 L-6 24 L12 -4 L0 -4Z"
          fill={TL.gold} opacity={f > at + 30 ? 1 : 0} />)}
        <Words words={['CRAVINGS', 'HEADACHES', 'BAD', 'MOOD']} at={at + 30} f={f} x={PX + 40} y={540} size={70} accent={-2} />
        <Words words={['YOUR', 'BRAIN', 'MISSES', 'ITS', 'REWARD']} at={at + 70} f={f} x={PX + 40} y={760} size={56} accent={1} />
      </g>}
      {/* line 3: day 10 — liver fat shrinks */}
      {cur === 3 && <g>
        <BigStamp text="DAY 10" at={at} f={f} x={PX} y={210} />
        <g transform="translate(1340 470)">
          <circle r={150} fill={TL.bg2} stroke={TL.line} strokeWidth={6} />
          <path d="M-110 -10 Q-20 -60 100 -20 Q80 70 -20 80 Q-110 70 -110 -10Z" fill="#C8553D" stroke="#fff" strokeWidth={4} />
          {[[-50, 10], [10, -10], [50, 30], [-10, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={20 * interpolate(f, [at + 20, at + 150], [1, 0.35], cl)} fill={TL.gold} stroke="#fff" strokeWidth={3} />)}
        </g>
        <Words words={['LIVER', 'FAT', 'STARTS', 'TO', 'SHRINK']} at={at + 40} f={f} x={PX + 40} y={760} size={70} />
        <text x={PX + 40} y={820} fontFamily="F_inter" fontWeight={700} fontSize={26} letterSpacing={3} fill={TL.mute}>STUDY: 10 DAYS OF LOW FRUCTOSE</text>
      </g>}
      {/* line 4: week 3 — taste resets */}
      {cur === 4 && <g>
        <BigStamp text="WEEK 3" at={at} f={f} x={PX} y={210} />
        <Apple x={1300} y={470} s={1.6} glow={interpolate(f, [at + 40, at + 80], [0, 1], cl)} />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} transform={`translate(${1300 + Math.cos(i * 1.3 + f / 20) * 190} ${470 + Math.sin(i * 1.3 + f / 20) * 150}) scale(${f > at + 50 ? 1 : 0})`}
          d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4Z" fill={TL.gold} />)}
        <Words words={['APPLES', 'TASTE', 'LIKE', 'CANDY']} at={at + 30} f={f} x={PX + 40} y={760} size={80} />
      </g>}
      {/* line 5: month 1 — steady energy */}
      {cur === 5 && <g>
        <BigStamp text="MONTH 1" at={at} f={f} x={PX} y={210} />
        <Battery x={PX + 60} y={340} v={interpolate(f, [at, at + 60], [0.3, 0.95], cl)} f={f} />
        <Spikes x={PX + 40} y={640} calm={1} f={f} />
        <Words words={['NO', 'MORE', 'CRASHES']} at={at + 40} f={f} x={PX + 40} y={780} size={90} />
      </g>}
      {/* line 6: cliffhanger */}
      {cur === 6 && <g>
        <BigStamp text="1 YEAR?" at={at} f={f} x={PX} y={360} size={220} color={TL.line} />
        <Words words={['IT', 'GETS', 'SURPRISING']} at={at + 30} f={f} x={PX + 10} y={560} size={90} />
      </g>}

      {cur >= 1 && <TimeBar marks={MARKS} active={Math.min(5, cur - 1)} f={f} at={at} />}
      <text x={60} y={70} fontFamily="F_inter" fontWeight={800} fontSize={24} letterSpacing={6} fill={TL.mute}>INSIDE YOUR BODY</text>
    </svg>
  </AbsoluteFill>;
};
export const sugarMeta = ({props}: {props: TLProps}) => ({durationInFrames: Math.max(60, props.frames || 1500)});
