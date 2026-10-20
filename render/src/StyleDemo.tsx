// The same moment ("the stone gets stuck in the ureter") in six design styles, plus three thumbnail concepts.
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate} from 'remotion';
import {lerp, pop, ease, POSES, mixPose, rnd} from './kit/Kit';
import {STYLES, Sty, StyleBg, Riso, Hero, SStone} from './kit/Styles';

const W = 1920, H = 1080;
export const DEMO_ORDER = ['flat', 'line', 'swiss', 'pop', 'riso', 'glass'];
export const DEMO_LEN = 180;

const Title: React.FC<{s: Sty; at: number}> = ({s, at}) => {
  const f = useCurrentFrame(); const p = pop(f, at, 9, 240);
  const txt = s.upper ? 'STUCK!' : 'Stuck.';
  if (s.id === 'pop') return <g transform={`translate(1380 250) scale(${p}) rotate(-8)`}>
    <path d={Array.from({length: 24}).map((_, i) => { const a = i / 24 * Math.PI * 2, r = i % 2 ? 150 : 230; return `${i ? 'L' : 'M'}${Math.cos(a) * r * 1.4} ${Math.sin(a) * r}`; }).join(' ') + 'Z'}
      fill="#fff" stroke="#111" strokeWidth={10} />
    <text textAnchor="middle" y={45} fontFamily="F_anton" fontSize={150} fill={s.accent} stroke="#111" strokeWidth={8} paintOrder="stroke">STUCK!</text></g>;
  if (s.id === 'swiss') return <g opacity={p}><rect x={1080} y={150} width={720 * p} height={150} fill={s.accent} />
    <text x={1110} y={268} fontFamily="F_inter" fontWeight={900} fontSize={120} fill="#fff" letterSpacing={-4}>STUCK.</text>
    <text x={1080} y={350} fontFamily="F_inter" fontWeight={700} fontSize={30} fill={s.ink} letterSpacing={2}>URETER · 3 MM · BLOCKED</text></g>;
  if (s.id === 'glass') return <g opacity={p} transform={`translate(0 ${(1 - p) * 30})`}>
    <rect x={1180} y={150} width={560} height={190} rx={36} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
    <text x={1460} y={275} textAnchor="middle" fontFamily="F_montserrat" fontWeight={800} fontSize={100} fill="#fff">Stuck</text></g>;
  if (s.id === 'line') return <g opacity={p}><text x={1460} y={280} textAnchor="middle" fontFamily="F_dmserif" fontStyle="italic" fontSize={150} fill={s.ink}>Stuck.</text>
    <path d={`M1250 310 q210 ${20} 420 0`} stroke={s.accent} strokeWidth={6} fill="none" strokeDasharray={430} strokeDashoffset={430 * (1 - p)} /></g>;
  if (s.id === 'riso') return <Riso s={s}><g transform={`translate(1460 280) scale(${p}) rotate(-4)`}>
    <text textAnchor="middle" fontFamily="F_archivoblack" fontSize={160} fill={s.accent} opacity={0.9}>STUCK!</text></g></Riso>;
  return <g transform={`translate(1460 280) scale(${p})`}><text textAnchor="middle" fontFamily="F_anton" fontSize={160} fill={s.accent2}>STUCK</text></g>;
};

const Scene: React.FC<{s: Sty}> = ({s}) => {
  const f = useCurrentFrame();
  const narrow = lerp(f, 10, 60, 0, 1);
  const sx = lerp(f, 20, 95, 980, 1500, ease);
  const squash = f > 95 ? 1 - 0.2 * Math.max(0, Math.sin((f - 95) / 3)) * Math.exp(-(f - 95) / 14) : 1;
  const top = (y: number, d: number) => `M820 ${y} C 1200 ${y}, 1400 ${y + d * 70 * narrow}, 1600 ${y + d * 82 * narrow} L1920 ${y + d * 82 * narrow}`;
  const pain = lerp(f, 95, 110, 0, 1);
  const pose = mixPose(POSES.holdSide, POSES.doubled, pain);
  return <AbsoluteFill><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <StyleBg s={s} />
    <Riso s={s}>
      {/* ureter */}
      {!s.lineOnly && <path d={`${top(470, 1)} L1920 380 L820 380Z`} fill={s.wall} opacity={s.glass ? 1 : 1} />}
      {!s.lineOnly && <path d={`${top(730, -1)} L1920 820 L820 820Z`} fill={s.wall} />}
      {!s.lineOnly && <path d={`${top(470, 1)} L1920 ${730 - 82 * narrow} L1600 ${730 - 82 * narrow} C1400 ${730 - 70 * narrow}, 1200 730, 820 730Z`} fill={s.lumen} />}
      <path d={top(470, 1)} stroke={s.lineOnly ? s.ink : s.line ? s.lineColor : s.wall} strokeWidth={Math.max(4, s.line)} fill="none" />
      <path d={top(730, -1)} stroke={s.lineOnly ? s.ink : s.line ? s.lineColor : s.wall} strokeWidth={Math.max(4, s.line)} fill="none" />
      {Array.from({length: 14}).map((_, i) => { const x = 840 + ((i * 47 + f * 5) % Math.max(60, sx - 900)); const y = 560 + Math.sin(i * 2.3) * 80;
        return <path key={i} transform={`translate(${x} ${y})`} d="M0 -16 Q12 2 0 10 Q-12 2 0 -16Z" fill={s.lineOnly ? 'none' : s.urine} stroke={s.lineOnly ? s.ink : 'none'} strokeWidth={3} opacity={0.85} />; })}
      <g transform={`translate(${sx} 600) scale(${2 - squash} ${squash})`}><SStone s={s} x={0} y={0} scale={1.25} rot={f < 95 ? f * 4 : 380} mood={f > 95 ? 'shock' : 'determined'} /></g>
      <text x={900} y={360} fontFamily={s.font} fontWeight={800} fontSize={34} letterSpacing={6} fill={s.ink} opacity={s.id === 'swiss' ? 0 : lerp(f, 6, 20, 0, 1)}>URETER</text>
      <Hero s={s} x={420} y={930} scale={1.6} pose={pose} mood={f > 95 ? 'pain' : 'worried'} glow={0.4 + pain * 0.8} blink={f % 60 > 56} />
    </Riso>
    <Title s={s} at={98} />
    <text x={60} y={1040} fontFamily="F_montserrat" fontWeight={800} fontSize={34} letterSpacing={6} fill={s.ink} opacity={0.6}>{s.name.toUpperCase()}</text>
  </svg></AbsoluteFill>;
};

export const StyleDemo: React.FC = () => <AbsoluteFill>
  {DEMO_ORDER.map((id, i) => <Sequence key={id} from={i * DEMO_LEN} durationInFrames={DEMO_LEN}><Scene s={STYLES[id]} /></Sequence>)}
</AbsoluteFill>;

// ---------- thumbnails: big emotion + one clear visual question + 3-5 huge words ----------
const Glow: React.FC<{x: number; y: number; r: number; c: string}> = ({x, y, r, c}) => <>
  <radialGradient id={`g${x}${y}`}><stop offset="0%" stopColor={c} stopOpacity={0.9} /><stop offset="100%" stopColor={c} stopOpacity={0} /></radialGradient>
  <circle cx={x} cy={y} r={r} fill={`url(#g${x}${y})`} /></>;
const BigText: React.FC<{lines: [string, string][]; x: number; y: number; size: number; anchor?: 'start' | 'end' | 'middle'}> = ({lines, x, y, size, anchor = 'start'}) => <>
  {lines.map(([t, c], i) => <text key={i} x={x} y={y + i * size * 1.02} textAnchor={anchor} fontFamily="F_anton" fontSize={size} fill={c}
    stroke="#000" strokeWidth={size * 0.07} paintOrder="stroke" letterSpacing={1}>{t}</text>)}</>;

export const Thumb: React.FC<{v: number}> = ({v}) => {
  const s = STYLES.flat;
  const hero = {...s, shirt: '#2E7DF6', skin: '#F6C7A1'};
  if (v === 1) return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <rect width={1920} height={1080} fill="#0B1E3A" />
    <Glow x={520} y={560} r={620} c="#FF3B30" />
    {/* x-ray window on the body with the stone circled */}
    <Hero s={hero} x={500} y={1130} scale={3.5} pose={POSES.holdSide} mood="pain" glow={0} />
    <circle cx={760} cy={720} r={150} fill="#0B1E3A" stroke="#fff" strokeWidth={12} />
    <path d="M700 640 C760 620 820 660 810 720 C800 780 740 800 720 770" stroke="#FF6B6B" strokeWidth={40} fill="none" strokeLinecap="round" />
    <SStone s={s} x={760} y={760} scale={0.55} mood="determined" />
    <circle cx={760} cy={720} r={170} fill="none" stroke="#FFD23D" strokeWidth={14} strokeDasharray="30 18" />
    <path d="M960 600 L1080 520" stroke="#FFD23D" strokeWidth={24} strokeLinecap="round" />
    <path d="M1060 500 L1110 505 L1085 552Z" fill="#FFD23D" />
    <BigText lines={[['3 MM STONE', '#FFFFFF'], ['WORST PAIN', '#FFD23D'], ['EVER?', '#FFD23D']]} x={1860} y={330} size={190} anchor="end" />
  </svg></AbsoluteFill>;
  if (v === 2) return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <rect width={1920} height={1080} fill="#FFD23D" />
    {Array.from({length: 18 * 10}).map((_, i) => <circle key={i} cx={(i % 18) * 110 + ((Math.floor(i / 18) % 2) * 55)} cy={Math.floor(i / 18) * 110} r={20} fill="#FFB800" />)}
    <path d={Array.from({length: 26}).map((_, i) => { const a = i / 26 * Math.PI * 2, r = i % 2 ? 330 : 470; return `${i ? 'L' : 'M'}${560 + Math.cos(a) * r} ${560 + Math.sin(a) * r}`; }).join(' ') + 'Z'} fill="#E8263A" stroke="#111" strokeWidth={14} />
    <SStone s={STYLES.pop} x={560} y={560} scale={3.3} mood="determined" rot={-10} />
    <BigText lines={[['TINY STONE', '#111111'], ['HUGE PAIN', '#E8263A'], ['WHY?', '#1E5BFF']]} x={1880} y={300} size={200} anchor="end" />
  </svg></AbsoluteFill>;
  // v3: hero facing the villain, split by a crack
  return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <rect width={1920} height={1080} fill="#14263F" />
    <rect x={0} y={0} width={1920} height={430} fill="#1F3A5F" />
    <Glow x={1420} y={700} r={500} c="#FFC845" />
    <Hero s={hero} x={430} y={1180} scale={3.4} pose={POSES.doubled} mood="pain" />
    <SStone s={s} x={1420} y={720} scale={3.2} mood="determined" rot={8} />
    {[0, 1, 2].map((i) => <path key={i} transform={`translate(${1000 + i * 120} ${640 + (i % 2) * 70}) scale(1.6)`} d="M10 -60 L-30 10 L0 10 L-10 60 L40 -10 L10 -10Z" fill="#FFD23D" stroke="#000" strokeWidth={5} />)}
    <BigText lines={[['KIDNEY STONE', '#FFFFFF'], ['THE REAL CAUSE OF PAIN', '#FFC845']]} x={960} y={190} size={150} anchor="middle" />
  </svg></AbsoluteFill>;
};
