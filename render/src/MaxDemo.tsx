// Demo: MAX fully code-animated in a code-drawn room, with motion-graphics overlays around him (owner's reference shorts).
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, interpolate} from 'remotion';
import {MaxRig, MP, keyPose, walk, MaxPose, MaxFace, Phone, Glass, MC} from './kit/MaxRig';
import {Headline} from './kit/Kit';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const INK = MC.ink;

export const MaxSheetDemo: React.FC = () => {
  const f = useCurrentFrame();
  const list: [string, MaxPose, MaxFace][] = [
    ['stand', MP.stand, {}], ['worried', MP.stand, {brow: -1, mouth: 'frown', turn: 0} as any], ['pain', MP.holdSide, {eyes: 'squint', brow: -1, mouth: 'grit', sweat: 1}],
    ['shock', MP.stand, {eyes: 'wide', browUp: 1, mouth: 'open'}], ['doubled', MP.doubled, {eyes: 'closed', brow: -1, mouth: 'wavy'}],
    ['happy', MP.cheer, {eyes: 'happy', mouth: 'grin'}], ['sit', MP.sitPhone, {eyes: 'half', mouth: 'flat'}],
  ];
  return <AbsoluteFill style={{background: '#F2E1C3'}}><svg width={1920} height={1080}>
    {list.map(([n, p, fc], i) => <g key={n}><MaxRig x={150 + i * 270} y={980} scale={0.62} pose={p} face={fc} f={f}
      handR={n === 'sit' ? <Phone /> : undefined} />
      <text x={150 + i * 270} y={1050} textAnchor="middle" fontSize={30} fontFamily="F_anton" fill={INK}>{n}</text></g>)}
  </svg></AbsoluteFill>;
};

// ---------- room ----------
const Room: React.FC<{f: number; spin: number}> = ({f, spin}) => {
  const hand = (len: number, ang: number, w: number) => <line x1={0} y1={0} x2={Math.cos(ang) * len} y2={Math.sin(ang) * len} stroke={INK} strokeWidth={w} strokeLinecap="round" />;
  return <g>
    <rect x={-2000} y={-1000} width={6000} height={3000} fill="#F2E1C3" />
    <rect x={-2000} y={820} width={6000} height={1200} fill="#E2CBA6" />
    <line x1={-2000} y1={820} x2={4000} y2={820} stroke={INK} strokeWidth={6} />
    {/* window */}
    <rect x={1240} y={150} width={330} height={260} rx={12} fill="#BFE3F2" stroke={INK} strokeWidth={7} />
    <line x1={1405} y1={150} x2={1405} y2={410} stroke={INK} strokeWidth={6} /><line x1={1240} y1={280} x2={1570} y2={280} stroke={INK} strokeWidth={6} />
    {/* clock */}
    <g transform="translate(330 220)">
      <circle r={78} fill="#FFFFFF" stroke={INK} strokeWidth={8} />
      {[0, 1, 2, 3].map((i) => <line key={i} x1={0} y1={-62} x2={0} y2={-50} stroke={INK} strokeWidth={6} transform={`rotate(${i * 90})`} />)}
      {hand(36, -Math.PI / 2 + spin / 12, 9)}{hand(56, -Math.PI / 2 + spin, 6)}
    </g>
    {/* plant */}
    <g transform="translate(1720 820)">
      <path d="M-50 0 L-40 -110 L40 -110 L50 0Z" fill="#C46B3C" stroke={INK} strokeWidth={6} />
      {[-40, -10, 25].map((x, i) => <path key={i} d={`M${x * 0.3} -110 Q${x} ${-230 - i * 20} ${x * 1.6} ${-260 - i * 10} Q${x * 0.6} -190 ${x * 0.3} -110Z`}
        fill="#5FA864" stroke={INK} strokeWidth={5} transform={`rotate(${Math.sin(f / 30 + i) * 2})`} />)}
    </g>
    {/* sofa */}
    <g transform="translate(560 820)">
      <rect x={-330} y={-330} width={660} height={240} rx={40} fill="#4F8A8B" stroke={INK} strokeWidth={8} />
      <rect x={-380} y={-200} width={110} height={200} rx={30} fill="#4F8A8B" stroke={INK} strokeWidth={8} />
      <rect x={270} y={-200} width={110} height={200} rx={30} fill="#4F8A8B" stroke={INK} strokeWidth={8} />
      <rect x={-280} y={-150} width={560} height={110} rx={24} fill="#5E9C9D" stroke={INK} strokeWidth={8} />
    </g>
    {/* side table */}
    <g transform="translate(1290 820)">
      <rect x={-120} y={-200} width={240} height={30} rx={8} fill="#A86B3C" stroke={INK} strokeWidth={7} />
      <rect x={-100} y={-170} width={20} height={170} fill="#A86B3C" stroke={INK} strokeWidth={6} />
      <rect x={80} y={-170} width={20} height={170} fill="#A86B3C" stroke={INK} strokeWidth={6} />
    </g>
  </g>;
};

// ---------- motion-graphics overlays ----------
const Bubble: React.FC<{x: number; y: number; at: number; f: number; kind: 'bell' | 'heart' | 'chat' | 'like'; until?: number}> = ({x, y, at, f, kind, until = 1e9}) => {
  const p = spring({frame: f - at, fps: 30, config: {damping: 10, stiffness: 180}}) * interpolate(f, [until - 8, until], [1, 0], cl);
  if (f < at || f > until) return null;
  const drift = Math.sin((f - at) / 12) * 6;
  const icon = {bell: <path d="M-14 8 Q-14 -16 0 -18 Q14 -16 14 8 L18 12 L-18 12Z M-5 15 Q0 22 5 15" fill="#FFD21F" stroke={INK} strokeWidth={4} />,
    heart: <path transform="scale(1.6)" d="M0 8 C-14 -6 -10 -18 0 -10 C10 -18 14 -6 0 8Z" fill="#E4572E" stroke={INK} strokeWidth={2.5} />,
    chat: <g><rect x={-18} y={-14} width={36} height={24} rx={6} fill="#FFFFFF" stroke={INK} strokeWidth={4} /><circle cx={-8} cy={-2} r={3} fill={INK} /><circle cx={0} cy={-2} r={3} fill={INK} /><circle cx={8} cy={-2} r={3} fill={INK} /></g>,
    like: <path d="M-14 14 L-14 -4 L-4 -4 L2 -18 Q10 -18 8 -6 L18 -6 Q22 4 16 14Z" fill="#5BA4F0" stroke={INK} strokeWidth={4} />}[kind];
  return <g transform={`translate(${x} ${y + drift}) scale(${p})`}>
    <circle r={38} fill="#FFFFFF" stroke={INK} strokeWidth={6} />{icon}
    <circle cx={26} cy={-26} r={13} fill="#E4252B" stroke={INK} strokeWidth={4} />
  </g>;
};

const Sparkles: React.FC<{x: number; y: number; at: number; f: number}> = ({x, y, at, f}) => {
  if (f < at) return null;
  return <g>{[0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2, r = interpolate(f, [at, at + 20], [40, 150 + (i % 2) * 40], cl);
    const o = interpolate(f, [at, at + 8, at + 40, at + 60], [0, 1, 1, 0], cl);
    return <path key={i} transform={`translate(${x + Math.cos(a) * r} ${y + Math.sin(a) * r}) rotate(${f * 4})`} d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4Z" fill="#FFD21F" stroke={INK} strokeWidth={3} opacity={o} />;
  })}</g>;
};

const Check: React.FC<{x: number; y: number; at: number; f: number}> = ({x, y, at, f}) => {
  const p = spring({frame: f - at, fps: 30, config: {damping: 9, stiffness: 160}});
  if (f < at) return null;
  return <g transform={`translate(${x} ${y}) scale(${p})`}><circle r={52} fill="#3BB273" stroke={INK} strokeWidth={7} />
    <path d="M-24 2 L-6 20 L26 -16" stroke="#FFFFFF" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
};

// reward stream from phone to head (dopamine loop)
const Stream: React.FC<{from: [number, number]; to: [number, number]; f: number; at: number; until: number}> = ({from, to, f, at, until}) => {
  if (f < at || f > until) return null;
  return <g>{Array.from({length: 7}).map((_, i) => {
    const t = ((f - at) / 26 + i / 7) % 1;
    const x = from[0] + (to[0] - from[0]) * t + Math.sin(t * Math.PI * 2) * 40, y = from[1] + (to[1] - from[1]) * t;
    return <circle key={i} cx={x} cy={y} r={10 + 6 * Math.sin(t * Math.PI)} fill={i % 2 ? '#FFD21F' : '#E4572E'} stroke={INK} strokeWidth={3} opacity={Math.sin(t * Math.PI)} />;
  })}</g>;
};

export const MaxDemo: React.FC = () => {
  const f = useCurrentFrame();
  // timeline (30 fps, 15 s)
  const seatX = 560, tableX = 1290;
  const walkT = interpolate(f, [300, 372], [0, 1], cl);
  const x = f < 300 ? seatX : seatX + (tableX - 170 - seatX) * walkT;
  let pose: MaxPose = keyPose(f, [[0, MP.sitPhone], [230, MP.sitPhone], [262, {...MP.sitPhone, armR: [80, 40]}], [290, MP.stand], [300, MP.stand]]);
  if (f >= 300 && f < 372) pose = walk(MP.stand, (f - 300) / 4.2);
  if (f >= 372) pose = keyPose(f, [[372, MP.stand], [392, {...MP.stand, armR: [60, -60]}], [410, MP.drink], [440, MP.drink], [452, MP.cheer]]);
  // scrolling thumb: tiny forearm bob while on the phone
  if (f < 230) pose = {...pose, armR: [70 + Math.sin(f / 5) * 2, -170 + Math.sin(f / 3) * 4]};
  const face: MaxFace = f < 70 ? {eyes: 'open', mouth: 'smile', look: [0, 6]}
    : f < 150 ? {eyes: 'open', brow: -0.6, mouth: 'flat', look: [0, 6]}
    : f < 232 ? {eyes: 'half', brow: -1, mouth: 'wavy', sweat: 1, look: [0, 6]}
    : f < 300 ? {eyes: 'wide', browUp: 1, mouth: 'open'}
    : f < 372 ? {eyes: 'open', brow: 0.6, mouth: 'flat'}
    : f < 446 ? {eyes: 'closed', mouth: 'drink'} : {eyes: 'happy', mouth: 'grin', blush: 1};
  const spin = f < 150 ? f * 0.02 : f < 232 ? 3 + (f - 150) * 0.45 : 40 + f * 0.02;
  const heads = [{w: ['ONE', 'MORE', 'SCROLL…'], from: 6}, {w: ['3', 'HOURS', 'LATER'], from: 152}, {w: ['WAIT', 'WHAT?!'], from: 234},
    {w: ['RESET', 'YOUR', 'BRAIN'], from: 376}];
  const headPos: [number, number] = [x + 10, 330];
  const holdingPhone = f < 262;
  const holdingGlass = f >= 392;
  const cam = f < 150 ? {s: 1.45, cx: seatX, cy: 470} : f < 232 ? {s: 1.25, cx: 560, cy: 500} : f < 300 ? {s: 1.6, cx: seatX, cy: 440}
    : f < 372 ? {s: 1.1, cx: 960, cy: 600} : {s: 1.4, cx: tableX - 170, cy: 560};
  const tf = `translate(${960 - cam.cx * cam.s} ${560 - cam.cy * cam.s}) scale(${cam.s})`;
  return <AbsoluteFill><svg width={1920} height={1080} viewBox="0 0 1920 1080">
    <g transform={tf}>
    <Room f={f} spin={spin} />
    {/* phone left on the table after he stands */}
    {f >= 262 && <g transform="translate(1250 612)"><rect x={-40} y={-10} width={80} height={18} rx={6} fill="#26272B" stroke={INK} strokeWidth={5} /></g>}
    {!holdingGlass && <g transform="translate(1340 560)"><Glass level={0.75} /></g>}
    <MaxRig x={x} y={f < 290 ? 832 : 980} scale={f < 290 ? 0.8 : 0.82} pose={pose} face={face} f={f}
      handR={holdingPhone ? <Phone glow={1} /> : holdingGlass ? <Glass level={interpolate(f, [410, 440], [0.75, 0.15], cl)} /> : undefined} />
    {/* overlays */}
    <Stream from={[x + 20, 690]} to={[x, 420]} f={f} at={40} until={232} />
    <Bubble x={x - 240} y={420} at={60} f={f} kind="bell" until={262} />
    <Bubble x={x + 250} y={400} at={80} f={f} kind="heart" until={262} />
    <Bubble x={x - 290} y={580} at={100} f={f} kind="chat" until={262} />
    <Bubble x={x + 300} y={570} at={120} f={f} kind="like" until={262} />
    <Check x={x + 230} y={420} at={448} f={f} />
    <Sparkles x={x} y={520} at={446} f={f} />
    </g>
    <Headline items={heads} w={1920} h={1080} font="F_anton" color={INK} accentColor="#E4572E" upper />
  </svg></AbsoluteFill>;
};
