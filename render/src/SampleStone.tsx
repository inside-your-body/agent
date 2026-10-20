// Hand-built sample: "The Stone Moves" (45 s). Every sentence is shown as motion graphics with the puppet kit.
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, Audio, staticFile} from 'remotion';
import {PAL, cl, ease, lerp, pop, rnd, Stick, POSES, mixPose, Kidney, Stone, KType, Label, Drop, Face} from './kit/Kit';

const W = 1920, H = 1080;
export const STARTS = [0, 145, 196, 362, 449, 611, 676, 802, 1022, 1116, 1318];
export const SAMPLE_FRAMES = 1384;

const Bg: React.FC<{tint?: string}> = ({tint = PAL.bg}) => {
  const f = useCurrentFrame();
  return <>
    <rect width={W} height={H} fill={tint} />
    <radialGradient id="vg" cx="50%" cy="45%" r="70%"><stop offset="0%" stopColor="#24395A" stopOpacity={0.55} /><stop offset="100%" stopColor="#000" stopOpacity={0.35} /></radialGradient>
    <rect width={W} height={H} fill="url(#vg)" />
    {Array.from({length: 26}).map((_, i) => <circle key={i} cx={(rnd(i) * W + f * (0.3 + rnd(i + 9))) % W} cy={rnd(i + 3) * H}
      r={2 + rnd(i + 5) * 3} fill={PAL.ink} opacity={0.07 + rnd(i + 7) * 0.08} />)}
  </>;
};
const Svg: React.FC<{children: React.ReactNode; shake?: number}> = ({children, shake = 0}) => {
  const f = useCurrentFrame();
  const dx = shake ? Math.sin(f * 2.7) * shake : 0, dy = shake ? Math.cos(f * 3.1) * shake : 0;
  return <AbsoluteFill><svg width={W} height={H} viewBox={`${-dx} ${-dy} ${W} ${H}`}>{children}</svg></AbsoluteFill>;
};

// 1 — "Late that night, Maya feels a dull ache in her side."
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const x = lerp(f, 0, 50, 300, 860);
  const pose = mixPose(POSES.stand, POSES.holdSide, lerp(f, 62, 80, 0, 1));
  const ache = lerp(f, 66, 90, 0, 1) * (0.7 + 0.3 * Math.sin(f / 5));
  return <Svg><Bg tint="#0A1424" />
    <circle cx={1600} cy={190} r={80} fill="#F3E9C6" /><circle cx={1630} cy={170} r={80} fill="#0A1424" />
    {Array.from({length: 40}).map((_, i) => <circle key={i} cx={rnd(i) * W} cy={rnd(i + 1) * 520} r={2.5} fill="#fff" opacity={0.3 + 0.5 * Math.abs(Math.sin(f / 20 + i))} />)}
    <rect x={0} y={900} width={W} height={180} fill="#14233A" />
    <KType words={['LATE', 'THAT', 'NIGHT']} at={4} x={W / 2} y={170} size={64} color={PAL.mute} gap={5} />
    <Stick x={x} y={900} s={1.25} pose={pose} walk={f < 50 ? f / 4 : 0} mood={f > 70 ? 'worried' : 'neutral'} glowSide={ache} blink={f % 70 > 66} />
    {f > 84 && <Label x={x + 70} y={560} tx={x + 330} ty={470} text="DULL ACHE" at={84} color={PAL.coral} />}
  </Svg>;
};

// 2 — "Then it hits."
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const hit = pop(f, 3, 8, 260);
  return <Svg shake={f < 18 ? 14 * (1 - f / 18) : 0}><Bg tint="#1A0E14" />
    <rect width={W} height={H} fill="#fff" opacity={lerp(f, 0, 6, 0.9, 0)} />
    {Array.from({length: 12}).map((_, i) => { const a = i / 12 * Math.PI * 2; const r1 = 160 + hit * 60, r2 = 260 + hit * 180;
      return <line key={i} x1={860 + Math.cos(a) * r1} y1={600 + Math.sin(a) * r1} x2={860 + Math.cos(a) * r2} y2={600 + Math.sin(a) * r2}
        stroke={PAL.coral} strokeWidth={10} strokeLinecap="round" opacity={hit} />; })}
    <Stick x={860} y={900} s={1.25} pose={mixPose(POSES.holdSide, POSES.doubled, hit)} mood="pain" glowSide={1.2} />
    <g transform={`translate(${W / 2 + 330} 420) scale(${0.6 + hit * 0.4}) rotate(-6)`}>
      <text textAnchor="middle" fontFamily="F_anton" fontSize={190} fill={PAL.coral}>THEN IT HITS</text></g>
  </Svg>;
};

// shared geometry for the body cutaway
const URETER = 'M760 470 C 740 600, 860 640, 850 760 S 900 900, 940 960';
const S3: React.FC = () => {
  const f = useCurrentFrame();
  const body = lerp(f, 0, 18, 0, 1);
  const t = lerp(f, 40, 150, 0, 0.42, ease);
  const path = typeof document !== 'undefined' ? document.createElementNS('http://www.w3.org/2000/svg', 'path') : null;
  let px = 760, py = 470;
  if (path) { path.setAttribute('d', URETER); const L = path.getTotalLength(); const pt = path.getPointAtLength(L * t); px = pt.x; py = pt.y; }
  const draw = lerp(f, 20, 70, 0, 1);
  return <Svg><Bg />
    <g opacity={body} transform={`translate(${(1 - body) * 40} 0)`}>
      <path d="M700 140 Q960 100 1220 140 Q1310 180 1300 320 L1260 760 Q1240 1010 960 1015 Q680 1010 660 760 L620 320 Q610 180 700 140Z" fill="#1C3150" stroke={PAL.mute} strokeWidth={4} opacity={0.9} />
      <Kidney x={700} y={380} s={0.7} mood="worried" />
      <path d={URETER} stroke="#E07A80" strokeWidth={34} fill="none" strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - draw)} />
      <path d={URETER} stroke="#F6B3B6" strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - draw)} opacity={0.6} />
      <path d="M840 930 Q940 880 1040 930 Q1080 1000 940 1010 Q800 1000 840 930Z" fill={PAL.urine} opacity={0.85 * draw} />
    </g>
    <Stone x={px} y={py} s={0.55 + 0.1 * Math.sin(f / 8)} rot={f * 3} mood="sly" />
    <Label x={640} y={330} tx={380} ty={260} text="KIDNEY" at={24} />
    <Label x={858} y={700} tx={1180} ty={620} text="URETER" at={66} color={PAL.coral} />
    <Label x={1000} y={960} tx={1260} ty={900} text="BLADDER" at={128} />
  </Svg>;
};

// 4 — "It's narrow. And it's about to get stuck."
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const narrow = lerp(f, 0, 40, 0, 1);
  const sx = lerp(f, 6, 62, 260, 1020, ease);
  const squash = f > 58 ? 1 - 0.18 * Math.max(0, Math.sin((f - 58) / 3)) * Math.exp(-(f - 58) / 14) : 1;
  const wall = (y: number, dir: number) => `M0 ${y} C 600 ${y}, 900 ${y + dir * 150 * narrow}, 1300 ${y + dir * 170 * narrow} L1920 ${y + dir * 170 * narrow}`;
  return <Svg shake={f > 60 && f < 70 ? 8 : 0}><Bg />
    <path d={wall(300, 1) + ' L1920 0 L0 0Z'} fill="#B4505A" /><path d={wall(780, -1) + ' L1920 1080 L0 1080Z'} fill="#B4505A" />
    <path d={wall(300, 1)} stroke="#F6B3B6" strokeWidth={8} fill="none" /><path d={wall(780, -1)} stroke="#F6B3B6" strokeWidth={8} fill="none" />
    {Array.from({length: 14}).map((_, i) => <Drop key={i} x={(i * 140 + f * 6) % (sx - 40)} y={540 + Math.sin(i * 2) * 120} s={0.8} o={0.7} />)}
    <g transform={`translate(${sx} 540) scale(${2 - squash} ${squash})`}><Stone x={0} y={0} s={1.5} mood={f > 60 ? 'shock' : 'sly'} rot={f < 60 ? f * 4 : 240} /></g>
    <KType words={["IT'S", 'NARROW']} at={2} x={W / 2} y={170} size={70} gap={6} />
    {f > 62 && <g transform={`translate(${sx} 900) scale(${pop(f, 62, 8, 260)})`}><text textAnchor="middle" fontFamily="F_anton" fontSize={150} fill={PAL.yellow}>STUCK</text></g>}
  </Svg>;
};

// 5 — "The pain doesn't come from sharp edges scratching the walls."
const S5: React.FC = () => {
  const f = useCurrentFrame();
  const scratch = lerp(f, 20, 90, 0, 1);
  const x1 = lerp(f, 105, 125, 0, 1), x2 = lerp(f, 118, 138, 0, 1);
  return <Svg><Bg />
    <rect x={260} y={640} width={1400} height={60} rx={30} fill="#B4505A" />
    {Array.from({length: 7}).map((_, i) => <path key={i} d={`M${560 + i * 110} 650 l40 ${-30} l20 30`} stroke="#fff" strokeWidth={5} fill="none"
      opacity={scratch > i / 7 ? 0.8 : 0} />)}
    <Stone x={540 + scratch * 800} y={560} s={1.6} rot={scratch * 720} spiky={1.6} mood="sly" />
    <KType words={['SHARP', 'EDGES?']} at={6} x={W / 2} y={250} size={110} accent={[1]} />
    <g stroke={PAL.coral} strokeWidth={26} strokeLinecap="round" opacity={x1 > 0 ? 1 : 0}>
      <line x1={560} y1={300} x2={560 + 800 * x1} y2={300 + 500 * x1} /><line x1={1360} y1={300} x2={1360 - 800 * x2} y2={300 + 500 * x2} /></g>
    {f > 128 && <KType words={['NOT', 'THE', 'CAUSE']} at={128} x={W / 2} y={940} size={64} color={PAL.mute} />}
  </Svg>;
};

// 6 — "It comes from blocked urine."
const S6: React.FC = () => {
  const f = useCurrentFrame();
  return <Svg><Bg />
    <rect x={0} y={420} width={W} height={240} fill="#1C3150" /><rect x={0} y={412} width={W} height={10} fill="#F6B3B6" /><rect x={0} y={658} width={W} height={10} fill="#F6B3B6" />
    {Array.from({length: 26}).map((_, i) => { const col = i % 13, row = Math.floor(i / 13);
      const tx = 1260 - col * 70 - row * 35, ax = lerp(f, i * 1.5, i * 1.5 + 22, -200, tx);
      return <Drop key={i} x={ax} y={500 + row * 80 + Math.sin(f / 5 + i) * 4} s={1.4} />; })}
    <Stone x={1340} y={540} s={1.6} mood="shock" rot={240} />
    <KType words={['BLOCKED', 'URINE']} at={10} x={W / 2} y={260} size={110} accent={[0]} />
  </Svg>;
};

// 7 — "Behind the stone, pressure builds like a kinked garden hose."
const S7: React.FC = () => {
  const f = useCurrentFrame();
  const p = lerp(f, 10, 120, 0, 1);
  const needle = -120 + p * 150 + Math.sin(f / 3) * 3 * p;
  return <Svg><Bg />
    <line x1={W / 2} y1={140} x2={W / 2} y2={960} stroke={PAL.mute} strokeWidth={2} opacity={0.4} />
    {/* left: garden hose */}
    <path d={`M120 640 L560 640 Q640 640 660 600 L700 560`} stroke="#2E9E5B" strokeWidth={50} fill="none" strokeLinecap="round" />
    <ellipse cx={420} cy={640} rx={130 + p * 40} ry={25 + p * 45} fill="#37B26A" />
    <path d="M700 560 L740 620 L860 620" stroke="#2E9E5B" strokeWidth={34} fill="none" strokeLinecap="round" />
    <text x={480} y={820} textAnchor="middle" fontFamily="F_montserrat" fontWeight={700} fontSize={36} letterSpacing={4} fill={PAL.mute}>KINKED HOSE</text>
    {/* right: ureter */}
    <path d="M1060 640 L1700 640" stroke="#E07A80" strokeWidth={60} strokeLinecap="round" />
    <ellipse cx={1330} cy={640} rx={150 + p * 40} ry={30 + p * 50} fill="#E07A80" />
    {Array.from({length: 8}).map((_, i) => <Drop key={i} x={1220 + (i % 4) * 60} y={620 + Math.floor(i / 4) * 40} s={0.9} />)}
    <Stone x={1560} y={640} s={0.9} rot={200} mood="worried" />
    <text x={1400} y={820} textAnchor="middle" fontFamily="F_montserrat" fontWeight={700} fontSize={36} letterSpacing={4} fill={PAL.mute}>URETER</text>
    {/* gauge */}
    <g transform="translate(960 330)">
      <path d="M-150 0 A150 150 0 0 1 150 0" stroke={PAL.bg2} strokeWidth={30} fill="none" />
      <path d="M-150 0 A150 150 0 0 1 150 0" stroke={PAL.coral} strokeWidth={30} fill="none" strokeDasharray={472} strokeDashoffset={472 * (1 - p)} />
      <line x1={0} y1={0} x2={Math.cos((needle - 90) * Math.PI / 180) * 120} y2={Math.sin((needle - 90) * Math.PI / 180) * 120} stroke={PAL.ink} strokeWidth={10} strokeLinecap="round" />
      <circle r={16} fill={PAL.ink} />
      <text y={70} textAnchor="middle" fontFamily="F_anton" fontSize={56} fill={PAL.ink}>PRESSURE</text>
    </g>
  </Svg>;
};

// 8 — "Kev sweats, his hard hat sliding down, because the kidney keeps making urine with nowhere to send it."
const S8: React.FC = () => {
  const f = useCurrentFrame();
  const fill = lerp(f, 60, 200, 0.1, 0.6);
  return <Svg><Bg />
    <defs><clipPath id="kclip"><path transform="translate(820 560) scale(1.6)" d="M30 -150 C150 -160 190 -40 160 60 C130 160 20 180 -40 130 C-10 80 0 30 -50 10 C-110 -15 -120 -80 -80 -120 C-50 -150 0 -148 30 -150Z" /></clipPath></defs>
    <Kidney x={820} y={560} s={1.6} mood={f > 110 ? 'pain' : 'worried'} hat={lerp(f, 30, 70, 0, 0.45)} sweat={lerp(f, 0, 20, 0, 1)} swell={fill} />
    <g clipPath="url(#kclip)" opacity={0.4}><rect x={500} y={900 - fill * 650} width={700} height={700} fill={PAL.urine} />
      <path d={`M500 ${900 - fill * 650} q60 -20 120 0 t120 0 t120 0 t120 0 t120 0 t120 0`} stroke="#fff" strokeWidth={4} fill="none" opacity={0.6} /></g>
    {Array.from({length: 6}).map((_, i) => { const t = ((f / 40 + i / 6) % 1);
      return <Drop key={i} x={1180 + t * 300} y={720 + Math.sin(i) * 30} s={1.2} o={t < 0.85 ? 1 : (1 - t) * 6} />; })}
    <g transform="translate(1560 740)"><rect x={-60} y={-80} width={120} height={160} rx={20} fill={PAL.bg2} stroke={PAL.coral} strokeWidth={8} />
      <line x1={-30} y1={-30} x2={30} y2={30} stroke={PAL.coral} strokeWidth={14} strokeLinecap="round" /><line x1={30} y1={-30} x2={-30} y2={30} stroke={PAL.coral} strokeWidth={14} strokeLinecap="round" /></g>
    <Label x={700} y={330} tx={420} ty={220} text="KEV THE KIDNEY" at={8} />
    {f > 120 && <KType words={['NOWHERE', 'TO', 'GO']} at={120} x={1460} y={460} size={72} accent={[0]} />}
  </Svg>;
};

// 9 — "Pain tracks the blockage, not the stone's size."
const S9: React.FC = () => {
  const f = useCurrentFrame();
  const a = lerp(f, 6, 40, 0, 0.92), b = lerp(f, 30, 60, 0, 0.25);
  const bar = (x: number, v: number, label: string, col: string) => <g>
    <rect x={x} y={300} width={180} height={520} rx={22} fill={PAL.bg2} />
    <rect x={x} y={300 + 520 * (1 - v)} width={180} height={520 * v} rx={22} fill={col} />
    <text x={x + 90} y={900} textAnchor="middle" fontFamily="F_montserrat" fontWeight={800} fontSize={40} letterSpacing={3} fill={PAL.ink}>{label}</text></g>;
  const bolt = (x: number, y: number, s: number) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M10 -60 L-30 10 L0 10 L-10 60 L40 -10 L10 -10Z" fill={PAL.yellow} />;
  return <Svg><Bg />
    {bar(620, a, 'BLOCKAGE', PAL.coral)}{bar(1120, b, 'SIZE', PAL.sky)}
    {bolt(710, 300 + 520 * (1 - a) - 70, 1.3 * pop(f, 40))}
    <KType words={['PAIN', 'FOLLOWS', 'BLOCKAGE']} at={10} x={W / 2} y={180} size={76} accent={[2]} />
  </Svg>;
};

// 10 — "A stone only a few millimetres wide can hurt more than a bigger one that slips straight through."
const S10: React.FC = () => {
  const f = useCurrentFrame();
  const big = lerp(f, 90, 190, 200, 2100, ease);
  const tube = (y: number) => <><rect x={0} y={y - 70} width={W} height={140} fill="#1C3150" />
    <rect x={0} y={y - 78} width={W} height={8} fill="#F6B3B6" /><rect x={0} y={y + 70} width={W} height={8} fill="#F6B3B6" /></>;
  return <Svg><Bg />
    {tube(380)}{tube(760)}
    <Stone x={lerp(f, 0, 40, 200, 860)} y={380} s={0.8} mood="sly" rot={f < 40 ? f * 6 : 240} />
    {f > 40 && [0, 1, 2].map((i) => <path key={i} transform={`translate(${860 + (i - 1) * 90} ${250 + Math.sin(f / 4 + i) * 8}) scale(${pop(f, 44 + i * 4) * 0.8})`}
      d="M10 -60 L-30 10 L0 10 L-10 60 L40 -10 L10 -10Z" fill={PAL.yellow} />)}
    <Label x={860} y={320} tx={500} ty={200} text="3 MM — STUCK" at={30} color={PAL.coral} />
    <Stone x={big} y={760} s={1.25} mood="happy" rot={f * 3} spiky={0.6} color="#E9D9A8" />
    {f > 120 && <Label x={Math.min(big, 1700)} y={690} tx={Math.min(big, 1700) - 300} ty={600} text="BIGGER — SLIPS THROUGH" at={120} color={PAL.mint} />}
    <KType words={['SIZE', "ISN'T", 'EVERYTHING']} at={8} x={W / 2} y={1000} size={60} color={PAL.mute} />
  </Svg>;
};

// 11 — "And the worst is still coming."
const S11: React.FC = () => {
  const f = useCurrentFrame();
  const beat = Math.max(0, Math.sin(f / 4)) ** 4;
  return <Svg><Bg tint="#120A10" />
    <circle cx={W / 2} cy={H / 2} r={300 + beat * 40} fill={PAL.coral} opacity={0.12 + beat * 0.1} />
    <KType words={['THE', 'WORST', 'IS', 'STILL', 'COMING']} at={2} x={W / 2} y={H / 2 + 30} size={110} accent={[1]} gap={6} font="F_anton" />
  </Svg>;
};

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
export const SampleStone: React.FC = () => (
  <AbsoluteFill style={{background: PAL.bg}}>
    {SCENES.map((S, i) => {
      const from = STARTS[i], to = i + 1 < STARTS.length ? STARTS[i + 1] : SAMPLE_FRAMES;
      return <Sequence key={i} from={from} durationInFrames={to - from + (i + 1 < STARTS.length ? 6 : 0)}><Fade len={to - from}><S /></Fade></Sequence>;
    })}
  </AbsoluteFill>
);
const Fade: React.FC<{len: number; children: React.ReactNode}> = ({len, children}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{opacity: interpolate(f, [0, 6], [0, 1], cl), transform: `scale(${interpolate(f, [0, len], [1, 1.03])})`}}>{children}</AbsoluteFill>;
};

// Thumbnail: the figure doubled over holding the side, glowing pain, the sly stone, big title.
export const ThumbStone: React.FC = () => (
  <AbsoluteFill><svg width={1280} height={720} viewBox="0 0 1920 1080">
    <rect width={1920} height={1080} fill="#0E1A2B" />
    <radialGradient id="tg" cx="30%" cy="55%" r="60%"><stop offset="0%" stopColor="#FF6B5B" stopOpacity={0.45} /><stop offset="100%" stopColor="#0E1A2B" stopOpacity={0} /></radialGradient>
    <rect width={1920} height={1080} fill="url(#tg)" />
    {Array.from({length: 10}).map((_, i) => { const a = i / 10 * Math.PI * 2;
      return <line key={i} x1={520 + Math.cos(a) * 250} y1={560 + Math.sin(a) * 250} x2={520 + Math.cos(a) * 380} y2={560 + Math.sin(a) * 380} stroke={PAL.coral} strokeWidth={16} strokeLinecap="round" />; })}
    <Stick x={520} y={980} s={2.0} pose={POSES.doubled} mood="pain" glowSide={1.4} />
    <Stone x={900} y={880} s={2.0} mood="sly" rot={-12} />
    <text x={1880} y={300} textAnchor="end" fontFamily="F_anton" fontSize={190} fill="#fff" stroke="#000" strokeWidth={10} paintOrder="stroke">KIDNEY STONE</text>
    <text x={1880} y={500} textAnchor="end" fontFamily="F_anton" fontSize={170} fill={PAL.yellow} stroke="#000" strokeWidth={10} paintOrder="stroke">WHY 3 MM</text>
    <text x={1880} y={680} textAnchor="end" fontFamily="F_anton" fontSize={170} fill={PAL.yellow} stroke="#000" strokeWidth={10} paintOrder="stroke">HURTS SO MUCH?</text>
  </svg></AbsoluteFill>
);
