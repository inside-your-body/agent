// MAX as a fully code-drawn, rigged character (matches assets/cast/max_sheet.png): every joint and facial feature animates,
// so scenes can be ACTED (sit, stand, walk, scroll a phone, drink, sweat, shock) without any image generation.
import React from 'react';

export const MC = {
  ink: '#1E1E1E', skin: '#F3BD8A', skinSh: '#E2A777', hood: '#D08A1F', hoodSh: '#B6741A', jeans: '#3A4250', jeansSh: '#2E3541',
  shoe: '#ECE6D8', hair: '#5A3A22', mouth: '#7A2A22', tongue: '#E46D5E', white: '#FFFFFF',
};
const LW = 7;   // outline width (at scale 1)

export type MaxPose = {
  x?: number; lean?: number; head?: number; turn?: number;         // turn: -1 (looks left) .. 1 (looks right)
  armL?: [number, number]; armR?: [number, number];                   // [upper, fore] angles in degrees (90 = straight down)
  legL?: [number, number]; legR?: [number, number];
  crouch?: number;                                                     // 0..1 hip drop
  thigh?: number;                                                      // thigh length factor (0.3 = seated, facing camera)
  reachR?: [number, number]; reachL?: [number, number];               // IK: hand target relative to the shoulder centre (overrides armR/armL)
};
export type MaxFace = {
  eyes?: 'open' | 'closed' | 'wide' | 'half' | 'squint' | 'happy';
  brow?: number;          // -1 sad/worried .. 0 neutral .. 1 angry ; also used for surprise with eyes 'wide'
  browUp?: number;        // raise brows (surprise)
  mouth?: 'flat' | 'smile' | 'grin' | 'frown' | 'open' | 'o' | 'wavy' | 'grit' | 'drink';
  sweat?: number; blush?: number; look?: [number, number];
};

export const MP: Record<string, MaxPose> = {
  stand: {armL: [96, 92], armR: [84, 88], legL: [93, 91], legR: [87, 89]},
  sit: {armL: [100, 60], armR: [80, 120], legL: [100, 90], legR: [80, 90], thigh: 0.35},
  sitPhone: {reachL: [-10, 150], reachR: [20, 140], legL: [100, 90], legR: [80, 90], thigh: 0.35, head: 16, turn: 0.1},
  holdSide: {lean: 8, armL: [110, 100], armR: [60, 175], legL: [95, 90], legR: [85, 88], head: 8},
  doubled: {lean: 30, armL: [118, 95], armR: [70, 185], legL: [102, 86], legR: [78, 96], head: 20, crouch: 0.12},
  holdHead: {armL: [-160, -80], armR: [-20, -100], legL: [93, 91], legR: [87, 89]},
  point: {armL: [96, 92], armR: [-5, -10], legL: [93, 91], legR: [87, 89], turn: 0.5},
  drink: {armL: [96, 92], reachR: [10, -60], legL: [93, 91], legR: [87, 89], head: -12, turn: 0.1},
  cheer: {armL: [-120, -100], armR: [-60, -80], legL: [98, 92], legR: [82, 88]},
  shrug: {armL: [150, 230], armR: [30, -50], legL: [93, 91], legR: [87, 89]},
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixMax = (a: MaxPose, b: MaxPose, t: number): MaxPose => {
  const m = (u?: number, v?: number) => lerp(u ?? 0, v ?? 0, t);
  const mm = (u?: [number, number], v?: [number, number], d: [number, number] = [90, 90]) => [m((u ?? d)[0], (v ?? d)[0]), m((u ?? d)[1], (v ?? d)[1])] as [number, number];
  const rr = (u?: [number, number], v?: [number, number]) => (u || v) ? [m((u ?? v!)[0], (v ?? u!)[0]), m((u ?? v!)[1], (v ?? u!)[1])] as [number, number] : undefined;
  return {reachR: t < 0.5 ? (a.reachR && b.reachR ? rr(a.reachR, b.reachR) : a.reachR) : (a.reachR && b.reachR ? rr(a.reachR, b.reachR) : b.reachR),
    reachL: t < 0.5 ? (a.reachL && b.reachL ? rr(a.reachL, b.reachL) : a.reachL) : (a.reachL && b.reachL ? rr(a.reachL, b.reachL) : b.reachL),
    x: m(a.x, b.x), thigh: lerp(a.thigh ?? 1, b.thigh ?? 1, t), lean: m(a.lean, b.lean), head: m(a.head, b.head), turn: m(a.turn, b.turn), crouch: m(a.crouch, b.crouch),
    armL: mm(a.armL, b.armL, [96, 92]), armR: mm(a.armR, b.armR, [84, 88]), legL: mm(a.legL, b.legL, [93, 91]), legR: mm(a.legR, b.legR, [87, 89])};
};
// keyframed pose: [[frame, pose], ...] with smooth easing between keys
const ease = (t: number) => t * t * (3 - 2 * t);
export const keyPose = (f: number, keys: [number, MaxPose][]): MaxPose => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) return mixMax(keys[i - 1][1], keys[i][1], ease((f - keys[i - 1][0]) / Math.max(1, keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
};
// walk cycle on top of any pose
export const walk = (p: MaxPose, phase: number): MaxPose => {
  const s = Math.sin(phase), c = Math.cos(phase);
  return {...p, legL: [90 + 24 * s, 92 + 18 * Math.max(0, -s)], legR: [90 - 24 * s, 92 + 18 * Math.max(0, s)],
    armL: [90 - 16 * s, 80], armR: [90 + 16 * s, 80], lean: (p.lean ?? 0) + 3, crouch: 0.02 * Math.abs(c)};
};

// two-bone IK: angles so that the hand lands on (tx,ty) from the arm joint, elbow bending downwards/outwards
export const ik = (tx: number, ty: number, l1: number, l2: number, outward = 1): [number, number] => {
  const d = Math.min(l1 + l2 - 1, Math.max(Math.abs(l1 - l2) + 1, Math.hypot(tx, ty)));
  const base = Math.atan2(ty, tx);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const up = base + outward * a;
  const ex = Math.cos(up) * l1, ey = Math.sin(up) * l1;
  const fore = Math.atan2(ty - ey, tx - ex);
  return [(up * 180) / Math.PI, (fore * 180) / Math.PI];
};

const seg = (x: number, y: number, len: number, deg: number): [number, number] =>
  [x + Math.cos((deg * Math.PI) / 180) * len, y + Math.sin((deg * Math.PI) / 180) * len];

const Limb: React.FC<{x: number; y: number; a: [number, number]; l1: number; l2: number; w: number; col: string; end: 'hand' | 'shoe'; flipShoe?: boolean;
  hold?: React.ReactNode}> = ({x, y, a, l1, l2, w, col, end, flipShoe, hold}) => {
  const [kx, ky] = seg(x, y, l1, a[0]); const [fx, fy] = seg(kx, ky, l2, a[1]);
  const d = `M${x} ${y} L${kx} ${ky} L${fx} ${fy}`;
  return <g>
    <path d={d} stroke={MC.ink} strokeWidth={w + LW * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d={d} stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {end === 'hand' ? <>
      <circle cx={fx} cy={fy} r={w * 0.42} fill={MC.skin} stroke={MC.ink} strokeWidth={LW} />
      {hold && <g transform={`translate(${fx} ${fy}) rotate(${a[1] - 90})`}>{hold}</g>}
    </> : <path transform={`translate(${fx} ${fy}) scale(${flipShoe ? -1 : 1} 1)`} d="M-26 -10 Q-26 -26 0 -24 Q30 -22 44 -6 Q50 10 30 12 L-22 12 Q-30 10 -26 -10Z"
      fill={MC.shoe} stroke={MC.ink} strokeWidth={LW} strokeLinejoin="round" />}
  </g>;
};

const Face: React.FC<{fc: MaxFace; turn: number; blink: boolean}> = ({fc, turn, blink}) => {
  const ox = turn * 34;
  const eyes = blink && (fc.eyes ?? 'open') === 'open' ? 'closed' : (fc.eyes ?? 'open');
  const brow = fc.brow ?? 0, up = fc.browUp ?? 0;
  const lk = fc.look ?? [turn * 4, 0];
  return <g>
    {[-1, 1].map((k) => {
      const ex = ox + k * 46 * (1 - Math.abs(turn) * 0.25), ey = -8;
      const by = ey - 42 - up * 14;
      // brow: inner end lower when angry (brow>0), higher when worried (brow<0)
      const inner = brow * 12, outer = -brow * 6;
      const bx1 = ex - k * 22, bx2 = ex + k * 22;
      return <g key={k}>
        <path d={`M${bx1} ${by + inner} Q${ex} ${by - 8 + (inner + outer) / 2} ${bx2} ${by + outer}`} stroke={MC.ink} strokeWidth={9} strokeLinecap="round" fill="none" />
        {eyes === 'closed' || eyes === 'happy'
          ? <path d={eyes === 'happy' ? `M${ex - 14} ${ey + 4} Q${ex} ${ey - 12} ${ex + 14} ${ey + 4}` : `M${ex - 14} ${ey} Q${ex} ${ey + 8} ${ex + 14} ${ey}`}
              stroke={MC.ink} strokeWidth={7} strokeLinecap="round" fill="none" />
          : eyes === 'squint' ? <path d={`M${ex - 14} ${ey - (k > 0 ? 4 : -4)} L${ex + 14} ${ey + (k > 0 ? 4 : -4)}`} stroke={MC.ink} strokeWidth={8} strokeLinecap="round" />
          : eyes === 'wide' ? <g><ellipse cx={ex} cy={ey} rx={19} ry={24} fill={MC.white} stroke={MC.ink} strokeWidth={5} />
              <circle cx={ex + lk[0]} cy={ey + lk[1]} r={9} fill={MC.ink} /></g>
          : <g><ellipse cx={ex + lk[0]} cy={ey + lk[1]} rx={11} ry={eyes === 'half' ? 9 : 17} fill={MC.ink} />
              {eyes === 'half' && <path d={`M${ex - 16} ${ey - 6} L${ex + 16} ${ey - 6}`} stroke={MC.skin} strokeWidth={10} />}
              <circle cx={ex + lk[0] + 4} cy={ey + lk[1] - 6} r={3.2} fill={MC.white} /></g>}
      </g>;
    })}
    {/* nose */}
    <circle cx={ox * 1.15} cy={30} r={15} fill={MC.skin} stroke={MC.ink} strokeWidth={5} />
    {/* mouth */}
    {(() => {
      const mx = ox * 1.1, my = 72, m = fc.mouth ?? 'flat';
      if (m === 'open') return <g><ellipse cx={mx} cy={my} rx={26} ry={22} fill={MC.mouth} stroke={MC.ink} strokeWidth={5} />
        <ellipse cx={mx} cy={my + 10} rx={15} ry={8} fill={MC.tongue} /></g>;
      if (m === 'o') return <ellipse cx={mx} cy={my} rx={12} ry={15} fill={MC.mouth} stroke={MC.ink} strokeWidth={5} />;
      if (m === 'grit') return <g><rect x={mx - 30} y={my - 12} width={60} height={24} rx={8} fill={MC.white} stroke={MC.ink} strokeWidth={5} />
        {[-10, 10].map((t) => <line key={t} x1={mx + t} y1={my - 12} x2={mx + t} y2={my + 12} stroke={MC.ink} strokeWidth={3} />)}
        <line x1={mx - 30} y1={my} x2={mx + 30} y2={my} stroke={MC.ink} strokeWidth={3} /></g>;
      const d = {flat: `M${mx - 24} ${my} L${mx + 24} ${my}`, smile: `M${mx - 26} ${my - 6} Q${mx} ${my + 18} ${mx + 26} ${my - 6}`,
        grin: `M${mx - 30} ${my - 8} Q${mx} ${my + 26} ${mx + 30} ${my - 8} Z`, frown: `M${mx - 24} ${my + 8} Q${mx} ${my - 12} ${mx + 24} ${my + 8}`,
        wavy: `M${mx - 26} ${my} q7 -8 13 0 q7 8 13 0 q7 -8 13 0 q7 8 13 0`, drink: `M${mx - 10} ${my} L${mx + 10} ${my}`}[m];
      return <path d={d} stroke={MC.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill={m === 'grin' ? MC.white : 'none'} />;
    })()}
    {(fc.blush ?? 0) > 0 && [-1, 1].map((k) => <ellipse key={k} cx={ox + k * 66} cy={40} rx={16} ry={9} fill="#E8826B" opacity={0.45 * (fc.blush ?? 0)} />)}
  </g>;
};

export const MaxRig: React.FC<{x: number; y: number; scale?: number; pose: MaxPose; face?: MaxFace; f?: number; flip?: boolean;
  handR?: React.ReactNode; handL?: React.ReactNode; seated?: boolean}> = ({x, y, scale = 1, pose, face = {}, f = 0, flip, handR, handL, seated}) => {
  const lean = pose.lean ?? 0, turn = (pose.turn ?? 0) * (flip ? -1 : 1);
  const crouch = (pose.crouch ?? 0) * 260;
  const hipY = -(132 * (pose.thigh ?? 1) + 130) + crouch;
  const [sx, sy] = seg(0, hipY, 262, -90 + lean);           // shoulder centre
  const [nx, ny] = seg(sx, sy, 6, -90 + lean);
  const [hx, hy] = seg(nx, ny, 112, -90 + lean + (pose.head ?? 0));
  const blink = f % 97 > 92;
  const torso = `M${-104} ${hipY + 18} Q${-112} ${(hipY + sy) / 2} ${sx - 112} ${sy + 34} Q${sx - 90} ${sy - 10} ${sx} ${sy - 8} Q${sx + 90} ${sy - 10} ${sx + 112} ${sy + 34} Q${112} ${(hipY + sy) / 2} ${104} ${hipY + 18} Z`;
  const sw = face.sweat ?? 0;
  return <g transform={`translate(${x} ${y}) scale(${(flip ? -1 : 1) * scale} ${scale})`}>
    <ellipse cx={0} cy={6} rx={130} ry={16} fill="#000" opacity={0.12} />
    {/* legs (behind torso) */}
    <Limb x={-46} y={hipY} a={(pose.legL ?? [93, 91]) as [number, number]} l1={132 * (pose.thigh ?? 1)} l2={130} w={60} col={MC.jeans} end="shoe" flipShoe />
    <Limb x={46} y={hipY} a={(pose.legR ?? [87, 89]) as [number, number]} l1={132 * (pose.thigh ?? 1)} l2={130} w={60} col={MC.jeans} end="shoe" />
    {/* IK hands */}
    {(() => { if (pose.reachL) pose = {...pose, armL: ik(pose.reachL[0] + 96, pose.reachL[1] - 40, 118, 108, -1)};
              if (pose.reachR) pose = {...pose, armR: ik(pose.reachR[0] - 96, pose.reachR[1] - 40, 118, 108, 1)}; return null; })()}
    {/* back arm */}
    <Limb x={sx - 96} y={sy + 40} a={(pose.armL ?? [96, 92]) as [number, number]} l1={118} l2={108} w={54} col={MC.hood} end="hand" hold={handL} />
    {/* torso: hoodie */}
    <path d={torso} fill={MC.hood} stroke={MC.ink} strokeWidth={LW} strokeLinejoin="round" />
    <path d={`M${-104} ${hipY + 6} L${104} ${hipY + 6}`} stroke={MC.ink} strokeWidth={5} />
    <path d={`M${-60} ${hipY - 30} Q0 ${hipY - 56} 60 ${hipY - 30}`} stroke={MC.hoodSh} strokeWidth={6} fill="none" />
    {/* hood collar + strings */}
    <g transform={`translate(${sx} ${sy}) rotate(${lean})`}>
      <path d="M-78 18 Q-70 -26 0 -22 Q70 -26 78 18 Q40 4 0 34 Q-40 4 -78 18Z" fill={MC.hood} stroke={MC.ink} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M-18 30 L-22 92 M18 30 L22 92" stroke={MC.ink} strokeWidth={5} />
      <circle cx={-22} cy={96} r={5} fill={MC.ink} /><circle cx={22} cy={96} r={5} fill={MC.ink} />
    </g>
    {/* head */}
    <g transform={`translate(${hx} ${hy}) rotate(${lean + (pose.head ?? 0)})`}>
      <circle r={124} fill={MC.skin} stroke={MC.ink} strokeWidth={LW} />
      {/* ear on the far side when turned */}
      {Math.abs(turn) > 0.25 && <ellipse cx={-Math.sign(turn) * 120} cy={10} rx={18} ry={28} fill={MC.skin} stroke={MC.ink} strokeWidth={6} />}
      {/* hair */}
      <path transform={`translate(${turn * 14} 0)`} d="M-122 -18 Q-130 -96 -60 -122 Q-10 -140 40 -126 Q60 -150 66 -132 Q90 -146 92 -120 Q130 -96 124 -26 Q108 -64 70 -70 Q86 -90 60 -88 Q20 -96 -6 -86 Q-30 -96 -50 -80 Q-90 -76 -122 -18Z"
        fill={MC.hair} stroke={MC.ink} strokeWidth={6} strokeLinejoin="round" />
      <Face fc={face} turn={turn * (flip ? -1 : 1)} blink={blink} />
      {sw > 0 && <path transform={`translate(${110 - turn * 30} ${-40 + ((f * 2) % 40) * sw})`} d="M0 -22 Q16 2 0 14 Q-16 2 0 -22Z" fill="#7CC8FF" stroke={MC.ink} strokeWidth={4} opacity={Math.min(1, sw)} />}
    </g>
    {/* front arm */}
    <Limb x={sx + 96} y={sy + 40} a={(pose.armR ?? [84, 88]) as [number, number]} l1={118} l2={108} w={54} col={MC.hood} end="hand" hold={handR} />
  </g>;
};

// small hand props (drawn in the hand's local frame: +y along the forearm)
export const Phone: React.FC<{glow?: number}> = ({glow = 1}) => <g transform="translate(-6 10) rotate(-90)">
  <rect x={-22} y={-40} width={44} height={80} rx={9} fill="#26272B" stroke={MC.ink} strokeWidth={5} />
  <rect x={-16} y={-32} width={32} height={62} rx={4} fill="#9FE3FF" opacity={0.5 + 0.5 * glow} />
</g>;
export const Glass: React.FC<{level?: number}> = ({level = 0.7}) => <g transform="translate(0 6) rotate(-90)">
  <path d="M-24 -40 L24 -40 L18 40 L-18 40Z" fill="#DFF3FF" stroke={MC.ink} strokeWidth={5} opacity={0.95} />
  <path d={`M${-23 + 5 * (1 - level)} ${40 - 80 * level} L${23 - 5 * (1 - level)} ${40 - 80 * level} L18 40 L-18 40Z`} fill="#6EC1FF" opacity={0.8} />
</g>;
