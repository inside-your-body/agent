import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate, spring, Easing} from 'remotion';
import {ff, alpha} from './theme';

// ---------------------------------------------------------------- shared
export type ProtoProps = {fps: number; frames: number; sent: number[]; words: {w: string; s: number; e: number}[]};
const C = {bg: '#071320', bg2: '#0D2236', fg: '#EAF6FF', muted: '#86A3BC', blue: '#3FD0FF', blue2: '#1B8CFF', red: '#FF3D5A', gold: '#FFC23D', teal: '#14E0B4'};
const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const P = (f: number, a: number, d: number) => interpolate(f, [a, a + d], [0, 1], {...cl, easing: ease});

const BaseCtx = React.createContext(0);
const Ctx = React.createContext<{T: (i: number) => number; W: (word: string, after?: number) => number}>({T: () => 0, W: () => 0});

const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{pointerEvents: 'none'}}>
    <svg width={1920} height={1080} style={{position: 'absolute', opacity: 0.07, mixBlendMode: 'screen'}}>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 9} /></filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
  </AbsoluteFill>;
};

// big word that slams in (scale from 1.6 + blur) at frame `at`
const Slam: React.FC<{text: string; at: number; size: number; color?: string; x?: number; y?: number; font?: string; shake?: boolean}> =
  ({text, at, size, color = C.fg, x = 960, y = 540, font = 'anton', shake}) => {
    const f = useCurrentFrame();
    const s = spring({frame: f - at, fps: 30, config: {damping: 13, stiffness: 260, mass: 0.6}});
    if (f < at) return null;
    const k = shake ? Math.sin((f - at) * 2.2) * 8 * Math.max(0, 1 - (f - at) / 12) : 0;
    return <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) translate(${k}px,0) scale(${2 - s})`, opacity: Math.min(1, s * 1.5),
      fontFamily: ff(font), fontSize: size, color, letterSpacing: 2, whiteSpace: 'nowrap', textShadow: `0 10px 40px ${alpha('#000', 0.5)}`,
      filter: `blur(${(1 - s) * 8}px)`}}>{text}</div>;
  };

// word-by-word reveal synced to narration
const Said: React.FC<{text: string; from: number; size: number; x: number; y: number; color?: string; hl?: string[]; font?: string; align?: 'left' | 'center'; width?: number}> =
  ({text, from, size, x, y, color = C.fg, hl = [], font = 'bebas', align = 'center', width = 1500}) => {
    const f = useCurrentFrame();
    const {W} = React.useContext(Ctx);
    const base = React.useContext(BaseCtx);
    const ws = text.split(' ');
    return <div style={{position: 'absolute', left: x, top: y, width, transform: align === 'center' ? 'translate(-50%,-50%)' : 'translateY(-50%)',
      display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.25}px`}}>
      {ws.map((w, i) => {
        const at = Math.max(from, W(w.replace(/[^A-Za-z0-9']/g, ''), from + base) - base - 2);
        const s = spring({frame: f - at, fps: 30, config: {damping: 14, stiffness: 200, mass: 0.5}});
        const key = hl.includes(w.replace(/[^A-Za-z0-9']/g, '').toLowerCase());
        return <span key={i} style={{fontFamily: ff(font), fontSize: size, lineHeight: 1.05, color: key ? C.red : color, opacity: s,
          transform: `translateY(${(1 - s) * 30}px)`, display: 'inline-block'}}>{w}</span>;
      })}
    </div>;
  };

// ---------------------------------------------------------------- IV bag object (reused across scenes = continuity)
const Bag: React.FC<{level: number; bands?: number; dissolve?: number; w?: number}> = ({level, bands = 0, dissolve = 0, w = 300}) => {
  const f = useCurrentFrame();
  const h = w * 1.45;
  const top = 40, bot = h - 30, liqTop = bot - (bot - top - 30) * level;
  const parts = Array.from({length: 70}, (_, i) => {
    const x0 = 30 + rnd(i) * (w - 60), y0 = top + 30 + rnd(i + 99) * (bot - top - 30) * 0.75;
    const d = Math.max(0, dissolve * 1.4 - rnd(i + 7) * 0.4);
    return <circle key={i} cx={x0 + (rnd(i + 3) - 0.5) * 260 * d} cy={y0 - 420 * d * (0.5 + rnd(i + 5))} r={4 + rnd(i + 11) * 7}
      fill={C.blue} opacity={d > 0 ? Math.max(0, 1 - d) : 0} />;
  });
  return <svg width={w + 300} height={h + 520} viewBox={`-150 -420 ${w + 300} ${h + 520}`} style={{overflow: 'visible'}}>
    <defs>
      <clipPath id="bagc"><path d={`M20 ${top} Q20 10 50 10 H${w - 50} Q${w - 20} 10 ${w - 20} ${top} V${bot} Q${w - 20} ${h} ${w / 2 + 30} ${h} H${w / 2 - 30} Q20 ${h} 20 ${bot} Z`} /></clipPath>
      <linearGradient id="liq" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.blue} stopOpacity={0.9} /><stop offset="1" stopColor={C.blue2} /></linearGradient>
    </defs>
    <rect x={w / 2 - 14} y={-30} width={28} height={50} rx={8} fill={alpha(C.fg, 0.25)} />
    <g clipPath="url(#bagc)">
      <rect x={0} y={0} width={w} height={h} fill={alpha(C.fg, 0.08)} />
      <rect x={0} y={liqTop + Math.sin(f / 9) * 3} width={w} height={h} fill="url(#liq)" />
      <path d={`M0 ${liqTop} Q ${w / 4} ${liqTop - 10 + Math.sin(f / 7) * 6} ${w / 2} ${liqTop} T ${w} ${liqTop}`} stroke={alpha('#fff', 0.5)} strokeWidth={4} fill="none" />
      {Array.from({length: bands}, (_, i) => <line key={i} x1={0} x2={w} y1={top + 30 + (bot - top - 30) * (i + 1) / 4} y2={top + 30 + (bot - top - 30) * (i + 1) / 4}
        stroke={alpha('#fff', 0.7)} strokeWidth={3} strokeDasharray="14 10" />)}
      <rect x={w * 0.18} y={top + 50} width={w * 0.64} height={70} rx={10} fill={alpha('#fff', 0.85)} />
      <text x={w / 2} y={top + 98} textAnchor="middle" fontFamily="F_anton" fontSize={38} fill={C.bg}>1 LITRE</text>
    </g>
    <path d={`M20 ${top} Q20 10 50 10 H${w - 50} Q${w - 20} 10 ${w - 20} ${top} V${bot} Q${w - 20} ${h} ${w / 2 + 30} ${h} H${w / 2 - 30} Q20 ${h} 20 ${bot} Z`}
      fill="none" stroke={alpha(C.fg, 0.8)} strokeWidth={5} />
    <rect x={w / 2 - 16} y={h} width={32} height={40} rx={6} fill={alpha(C.fg, 0.6)} />
    {parts}
  </svg>;
};

// ---------------------------------------------------------------- scenes
const SClinic: React.FC<{len: number}> = ({len}) => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const s = interpolate(f, [0, len], [1.04, 1.16]);
  const bagIn = spring({frame: f - (T(1) - T(0)), fps: 30, config: {damping: 15, stiffness: 120}});
  return <AbsoluteFill style={{background: C.bg}}>
    <Img src={staticFile('proto/scene_clinic.png')} style={{width: 1920, height: 1080, objectFit: 'cover', transform: `scale(${s}) translateX(${-f * 0.05}px)`}} />
    <AbsoluteFill style={{background: `linear-gradient(90deg, transparent 45%, ${alpha(C.bg, 0.85)} 80%)`, opacity: bagIn}} />
    <div style={{position: 'absolute', left: 1340, top: 120 - (1 - bagIn) * 700}}><Bag level={1} w={260} /></div>
    <AbsoluteFill style={{background: `linear-gradient(0deg, ${alpha(C.bg, 0.9)} 0%, transparent 30%)`, opacity: P(f, T(1) - 6, 12)}} />
    <Said text="ONE LITRE OF SALT WATER" from={T(1)} size={96} x={960} y={970} hl={['salt', 'water']} width={1600} />
    <Slam text="RIGHT NOW" at={4} size={120} x={420} y={150} color={C.fg} font="bebas" />
    {f > 6 && f < W('arm') + 20 && <div style={{position: 'absolute', left: 420, top: 220, transform: 'translateX(-50%)', fontFamily: ff('bebas'), fontSize: 46, color: C.blue,
      opacity: P(f, 10, 10)}}>MAYA · 11:42 PM</div>}
  </AbsoluteFill>;
};

const SVanish: React.FC = () => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const o = T(2);
  const bandAt = W('three', o) - o, vanAt = W('vanish', o) - o;
  const dis = interpolate(f, [vanAt, vanAt + 40], [0, 1], cl);
  const level = interpolate(dis, [0, 1], [1, 0.25]);
  const move = spring({frame: f, fps: 30, config: {damping: 16, stiffness: 90}});
  const s3 = T(3) - o;
  const notLeak = W('leak', T(3)) - o, notSpill = W('spill', T(3)) - o, van2 = W('Vanish', T(3) + 20) - o;
  return <AbsoluteFill style={{background: `radial-gradient(circle at 40% 50%, ${C.bg2}, ${C.bg} 70%)`}}>
    <div style={{position: 'absolute', left: interpolate(move, [0, 1], [1340, 300]), top: interpolate(move, [0, 1], [-300, -340]), transform: `scale(${interpolate(move, [0, 1], [0.87, 1.25])})`, transformOrigin: 'top left'}}>
      <Bag level={level} bands={f > bandAt ? 3 : 0} dissolve={dis} w={300} />
    </div>
    {f > bandAt && f < s3 && <Said text="three quarters" from={bandAt} size={64} x={1250} y={300} color={C.muted} width={800} />}
    {f >= vanAt && f < notLeak && <Slam text="75%" at={vanAt} size={330} x={1290} y={560} color={C.red} shake />}
    {f >= vanAt + 8 && f < notLeak && <Slam text="GONE IN 30 MIN" at={vanAt + 8} size={84} x={1290} y={790} color={C.fg} font="bebas" />}
    {f >= notLeak && <>
      <Slam text="NOT LEAK." at={notLeak} size={130} x={1290} y={300} color={C.muted} font="bebas" />
      <Slam text="NOT SPILL." at={notSpill} size={130} x={1290} y={470} color={C.muted} font="bebas" />
      {f >= van2 && <div style={{position: 'absolute', left: 1290, top: 690, transform: 'translate(-50%,-50%)', display: 'flex'}}>
        {'VANISH'.split('').map((ch, i) => {
          const d = interpolate(f, [van2 + 18 + i * 3, van2 + 40 + i * 3], [0, 1], cl);
          const s = spring({frame: f - van2 - i * 2, fps: 30, config: {damping: 12, stiffness: 240}});
          return <span key={i} style={{fontFamily: ff('anton'), fontSize: 220, color: C.red, display: 'inline-block', opacity: s * (1 - d),
            transform: `translate(${d * (rnd(i) - 0.5) * 200}px, ${-d * 160 * (0.5 + rnd(i + 4))}px) rotate(${d * (rnd(i + 2) - 0.5) * 90}deg) scale(${2 - s})`,
            filter: `blur(${d * 10}px)`}}>{ch}</span>;
        })}
      </div>}
    </>}
  </AbsoluteFill>;
};

const SWhere: React.FC<{len: number}> = ({len}) => {
  const f = useCurrentFrame();
  const up = spring({frame: f - 10, fps: 30, config: {damping: 12, stiffness: 110}});
  const txt = 'SO WHERE DOES IT GO?';
  const n = Math.floor(interpolate(f, [2, 30], [0, txt.length], cl));
  return <AbsoluteFill style={{background: C.bg}}>
    {Array.from({length: 9}, (_, i) => <div key={i} style={{position: 'absolute', left: 200 + rnd(i) * 1500, top: 1080 - ((f * (1.5 + rnd(i + 3) * 2) + rnd(i + 5) * 1080) % 1180),
      fontFamily: ff('anton'), fontSize: 60 + rnd(i + 8) * 120, color: alpha(C.blue, 0.12 + rnd(i + 1) * 0.2), transform: `rotate(${(rnd(i + 9) - 0.5) * 40}deg)`}}>?</div>)}
    <div style={{position: 'absolute', left: 960, top: 360, transform: 'translate(-50%,-50%)', fontFamily: ff('anton'), fontSize: 150, color: C.fg, whiteSpace: 'nowrap'}}>
      {txt.slice(0, n)}<span style={{opacity: f % 16 < 8 ? 1 : 0, color: C.blue}}>|</span></div>
    <Img src={staticFile('proto/cast_sal.png')} style={{position: 'absolute', left: 760, top: 1080 - up * 560, width: 400, height: 400, maskImage: 'radial-gradient(circle, black 45%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 68%)',
      transform: `rotate(${Math.sin(f / 8) * 6}deg)`}} />
  </AbsoluteFill>;
};

const SDrip: React.FC<{len: number}> = ({len}) => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const veinAt = W('vein', T(5)) - T(5);
  const zoom = interpolate(f, [veinAt - 14, veinAt + 6], [1, 9], {...cl, easing: Easing.in(Easing.cubic)});
  const inVein = f >= veinAt + 6;
  if (!inVein) {
    const drops = Array.from({length: 6}, (_, i) => {
      const t0 = i * 13, k = ((f - t0) % 78 + 78) % 78, y = 330 + k * k * 0.11;
      return y < 760 ? <ellipse key={i} cx={960} cy={y} rx={16} ry={22} fill={C.blue} /> : null;
    });
    return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${C.bg2}, ${C.bg} 70%)`, transform: `scale(${zoom})`, transformOrigin: '960px 900px'}}>
      <svg width={1920} height={1080}>
        <rect x={900} y={140} width={120} height={180} rx={20} fill={alpha(C.fg, 0.1)} stroke={alpha(C.fg, 0.7)} strokeWidth={5} />
        <rect x={860} y={300} width={200} height={480} rx={40} fill={alpha(C.fg, 0.06)} stroke={alpha(C.fg, 0.7)} strokeWidth={5} />
        <rect x={866} y={700} width={188} height={74} rx={30} fill={alpha(C.blue, 0.8)} />
        {drops}
        <rect x={945} y={780} width={30} height={300} fill={alpha(C.fg, 0.35)} />
      </svg>
      <Slam text="DRIP" at={4} size={120} x={520} y={420} color={C.blue} font="bebas" />
      <Slam text="BY DRIP" at={W('drip', T(5) + 6) - T(5)} size={120} x={1400} y={620} color={C.fg} font="bebas" />
    </AbsoluteFill>;
  }
  const g = f - veinAt - 6;
  const cells = Array.from({length: 26}, (_, i) => {
    const sp = 6 + rnd(i) * 6, x = ((g * sp + rnd(i + 1) * 2400) % 2400) - 240, y = 330 + rnd(i + 2) * 420;
    const red = i % 3 !== 0;
    return red ? <ellipse key={i} cx={x} cy={y} rx={70} ry={28} fill="#E8384F" stroke="#B3122B" strokeWidth={6} transform={`rotate(${Math.sin((g + i * 9) / 14) * 20} ${x} ${y})`} />
      : <circle key={i} cx={x} cy={y} r={18 + rnd(i + 5) * 10} fill={C.blue} stroke="#fff" strokeOpacity={0.6} strokeWidth={3} />;
  });
  return <AbsoluteFill style={{background: '#2A0710'}}>
    <svg width={1920} height={1080}>
      <defs><linearGradient id="vw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5C0E1E" /><stop offset="0.5" stopColor="#8A1A2E" /><stop offset="1" stopColor="#5C0E1E" /></linearGradient></defs>
      <rect x={0} y={250} width={1920} height={580} fill="url(#vw)" />
      {Array.from({length: 14}, (_, i) => <line key={i} x1={((i * 160 - g * 3) % 2240) - 160} x2={((i * 160 - g * 3) % 2240) - 60} y1={250} y2={250} stroke="#C2384B" strokeWidth={10} />)}
      {cells}
      <rect x={0} y={200} width={1920} height={60} fill="#3B0915" /><rect x={0} y={820} width={1920} height={60} fill="#3B0915" />
    </svg>
    <div style={{position: 'absolute', left: 80, top: 930, display: 'flex', alignItems: 'center', gap: 30, opacity: P(g, 10, 12)}}>
      <svg width={360} height={60}><path d={`M0 30 ${Array.from({length: 12}, (_, i) => `Q ${i * 30 + 15} ${i % 2 ? 0 : 60} ${(i + 1) * 30} 30`).join(' ')}`} stroke={C.gold} strokeWidth={14}
        fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - P(g, 10, 20)} /></svg>
      <span style={{fontFamily: ff('bebas'), fontSize: 64, color: C.fg}}>THINNER THAN A <span style={{color: C.gold}}>NOODLE</span></span>
    </div>
  </AbsoluteFill>;
};

const HEART = 'M0 -60 C -30 -110 -110 -90 -105 -25 C -100 30 -40 70 0 110 C 40 70 100 30 105 -25 C 110 -90 30 -110 0 -60 Z';
const SHeart: React.FC = () => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const o = T(6);
  const sq = W('squeeze', o) - o, sixty = W('sixty|60', o) - o;
  const beat = (x: number) => { const k = x % 26; return k < 6 ? 1 + 0.12 * Math.sin((k / 6) * Math.PI) : 1; };
  const big = f >= sq ? 1 + 0.35 * Math.exp(-(f - sq) / 6) : beat(f);
  const paths = ['M960 560 C 700 500 500 300 160 200', 'M960 560 C 760 700 520 820 120 900', 'M960 560 C 1200 420 1450 260 1800 160',
    'M960 560 C 1180 720 1500 860 1820 920', 'M960 560 C 940 360 980 200 1000 40', 'M960 560 C 960 760 900 900 880 1060'];
  const draw = P(f, sq, 30);
  const num = Math.round(interpolate(f, [sixty, sixty + 30], [0, 60000], {...cl, easing: ease}));
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 52%, #3A0A18, ${C.bg} 65%)`}}>
    <svg width={1920} height={1080}>
      {paths.map((d, i) => <path key={i} d={d} stroke={alpha(C.red, 0.85)} strokeWidth={12 - i} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} strokeLinecap="round" />)}
      {f > sq && paths.map((d, i) => Array.from({length: 5}, (_, j) => {
        const t = ((f - sq) / 40 + j / 5) % 1;
        return <circle key={i + '-' + j} r={10} fill={C.blue} style={{offsetPath: `path('${d}')`, offsetDistance: `${t * 100}%`} as any} opacity={draw} />;
      }))}
      <g transform={`translate(960 560) scale(${2.6 * big})`}>
        <path d={HEART} fill="#E8384F" stroke="#FF8A99" strokeWidth={3} />
        <path d="M-40 -40 Q -60 -10 -40 20" stroke="#FFB3BE" strokeWidth={6} fill="none" opacity={0.6} />
      </g>
    </svg>
    {f >= sq && f < sq + 6 && <AbsoluteFill style={{background: alpha('#fff', 0.35 * (1 - (f - sq) / 6))}} />}
    {f < sq && <Slam text="UNDER 1 MINUTE" at={6} size={90} x={960} y={140} color={C.blue} font="bebas" />}
    {f >= sq && <Slam text="SQUEEZE" at={sq} size={110} x={960} y={140} color={C.fg} font="bebas" />}
    {f >= sixty && <div style={{position: 'absolute', left: 960, top: 900, transform: 'translate(-50%,-50%)', textAlign: 'center'}}>
      <div style={{fontFamily: ff('anton'), fontSize: 150, color: C.gold, lineHeight: 1}}>{num.toLocaleString('en-US')}</div>
      <div style={{fontFamily: ff('bebas'), fontSize: 54, color: C.fg, opacity: P(f, sixty + 20, 10)}}>MILES OF BLOOD VESSELS</div>
    </div>}
  </AbsoluteFill>;
};

const SCapillary: React.FC = () => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const o = T(8);
  const gapsAt = T(9) - o, sieveAt = W('sieve', T(10)) - o, protAt = T(11) - o;
  const zoom = interpolate(f, [0, gapsAt], [0.6, 1], {...cl, easing: ease});
  const open = P(f, gapsAt, 20);
  const tiles = Array.from({length: 9}, (_, i) => {
    const y = 40 + i * 115, gh = 26 * open;
    return <rect key={i} x={900} y={y + gh / 2} width={120} height={115 - gh} rx={18} fill="#C84B5E" stroke="#FF8C9C" strokeWidth={4} />;
  });
  const flow = f > gapsAt + 10;
  const water = Array.from({length: 60}, (_, i) => {
    const lane = Math.floor(rnd(i) * 8), gy = 40 + (lane + 1) * 115;
    const sp = 4 + rnd(i + 2) * 4, x = ((f * sp + rnd(i + 3) * 1900) % 1900);
    const y = x < 760 ? 120 + rnd(i + 4) * 840 : x < 1060 ? interpolate(x, [760, 900, 1020, 1060], [120 + rnd(i + 4) * 840, gy, gy, gy]) : gy + (x - 1060) * (rnd(i + 6) - 0.5) * 1.2;
    return flow || x < 880 ? <circle key={i} cx={x} cy={y} r={9} fill={C.blue} /> : null;
  });
  const prot = Array.from({length: 7}, (_, i) => {
    const y = 150 + i * 125, x = 760 - Math.abs(Math.sin((f + i * 17) / 11)) * 160;
    const hi = f > protAt && i === 3;
    return <g key={i}><circle cx={x} cy={y} r={44} fill={C.gold} stroke="#FFE39A" strokeWidth={5} />
      <circle cx={x - 12} cy={y - 10} r={6} fill="#5A3B00" /><circle cx={x + 12} cy={y - 10} r={6} fill="#5A3B00" />
      {hi && <circle cx={x} cy={y} r={70 + Math.sin(f / 4) * 6} fill="none" stroke={C.fg} strokeWidth={6} strokeDasharray="14 10" />}</g>;
  });
  return <AbsoluteFill style={{background: `linear-gradient(90deg, #2A0710 0%, #2A0710 46%, #0B2A3A 54%, #0B2A3A 100%)`}}>
    <AbsoluteFill style={{transform: `scale(${zoom})`}}>
      <svg width={1920} height={1080}>{water}{tiles}{prot}</svg>
    </AbsoluteFill>
    <div style={{position: 'absolute', left: 60, top: 40, fontFamily: ff('bebas'), fontSize: 46, color: C.muted, opacity: P(f, 6, 10)}}>INSIDE THE BLOOD</div>
    <div style={{position: 'absolute', right: 60, top: 40, fontFamily: ff('bebas'), fontSize: 46, color: C.muted, opacity: P(f, 6, 10)}}>AROUND YOUR CELLS</div>
    {f < sieveAt - 4 && <Slam text="THE WALLS HAVE GAPS" at={gapsAt + 4} size={90} x={960} y={1010} color={C.fg} font="bebas" />}
    {f > sieveAt - 4 && f < protAt && <Slam text="LIKE SAND THROUGH A SIEVE" at={sieveAt - 4} size={100} x={960} y={1010} color={C.blue} font="bebas" />}
    {f > protAt && <Slam text="PROTEINS: TOO BIG" at={protAt + 2} size={86} x={430} y={1010} color={C.gold} font="bebas" />}
  </AbsoluteFill>;
};

const SCells: React.FC<{len: number}> = ({len}) => {
  const f = useCurrentFrame();
  const {T, W} = React.useContext(Ctx);
  const o = T(12);
  const front = interpolate(f, [T(13) - o - 6, T(13) - o + 40], [-200, 2200], cl);
  const z = interpolate(f, [0, len], [1.15, 0.92]);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 11; r++) for (let c = 0; c < 18; c++) {
    const x = c * 115 + (r % 2) * 57, y = r * 100;
    const wet = Math.max(0, Math.min(1, (front - x) / 160));
    const sw = 1 + 0.12 * wet * (1 + Math.sin((f + c * 3 + r * 5) / 8) * 0.3);
    cells.push(<g key={r + '-' + c} transform={`translate(${x} ${y}) scale(${sw})`}>
      <path d="M0 -55 L48 -28 L48 28 L0 55 L-48 28 L-48 -28 Z" fill={wet > 0 ? alpha(C.blue, 0.25 + 0.5 * wet) : alpha(C.fg, 0.06)} stroke={wet > 0 ? C.blue : alpha(C.fg, 0.25)} strokeWidth={3} />
      <circle r={14} fill={wet > 0 ? alpha('#fff', 0.7) : alpha(C.fg, 0.2)} /></g>);
  }
  return <AbsoluteFill style={{background: C.bg}}>
    <AbsoluteFill style={{transform: `scale(${z})`}}><svg width={1920} height={1080}>{cells}</svg></AbsoluteFill>
    <AbsoluteFill style={{background: `linear-gradient(0deg, ${alpha(C.bg, 0.95)} 0%, transparent 35%)`}} />
    <Said text="Not just refilling her blood" from={0} size={74} x={960} y={880} color={C.muted} />
    {f > T(13) - o && <>
      <Slam text="EVERY." at={W('every', T(13)) - o} size={150} x={560} y={1000} color={C.fg} font="anton" />
      <Slam text="SINGLE." at={W('single', T(13)) - o} size={150} x={960} y={1000} color={C.fg} font="anton" />
      <Slam text="CELL." at={W('cell', T(13)) - o} size={150} x={1340} y={1000} color={C.blue} font="anton" />
    </>}
  </AbsoluteFill>;
};

const SBetter: React.FC = () => {
  const f = useCurrentFrame();
  const up = spring({frame: f, fps: 30, config: {damping: 11, stiffness: 140}});
  const bar = interpolate(f, [6, 50], [0.18, 0.92], {...cl, easing: ease});
  return <AbsoluteFill style={{background: `radial-gradient(circle at 30% 55%, #0F3A3A, ${C.bg} 70%)`}}>
    <Img src={staticFile('proto/cast_maya.png')} style={{position: 'absolute', left: 120, top: 120, width: 820, height: 820, maskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, black 60%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, black 60%, transparent 80%)', transform: `translateY(${(1 - up) * 300}px) scale(${0.9 + 0.1 * up})`}} />
    <div style={{position: 'absolute', left: 1020, top: 400, width: 760}}>
      <div style={{fontFamily: ff('bebas'), fontSize: 60, color: C.fg, letterSpacing: 4}}>HYDRATION</div>
      <div style={{marginTop: 14, height: 70, borderRadius: 35, background: alpha(C.fg, 0.12), border: `4px solid ${alpha(C.fg, 0.4)}`, overflow: 'hidden'}}>
        <div style={{width: `${bar * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.red}, ${C.gold} 40%, ${C.teal})`}} /></div>
      <div style={{fontFamily: ff('anton'), fontSize: 120, color: C.teal, marginTop: 10}}>{Math.round(bar * 100)}%</div>
    </div>
    {Array.from({length: 12}, (_, i) => { const a = P(f, 20 + i * 2, 25); return <div key={i} style={{position: 'absolute', left: 300 + rnd(i) * 600, top: 700 - a * 500 * (0.5 + rnd(i + 2)),
      width: 18, height: 18, borderRadius: 9, background: C.teal, opacity: (1 - a) * (a > 0 ? 1 : 0)}} />; })}
  </AbsoluteFill>;
};

const SNight: React.FC<{len: number}> = ({len}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, len], [1.02, 1.22]);
  const hand = f * 9;
  const txt = 'A VERY LONG NIGHT...';
  const n = Math.floor(interpolate(f, [30, 70], [0, txt.length], cl));
  return <AbsoluteFill style={{background: '#000'}}>
    <Img src={staticFile('proto/scene_kidney.png')} style={{width: 1920, height: 1080, objectFit: 'cover', transform: `scale(${s})`, transformOrigin: '50% 40%'}} />
    <svg width={220} height={220} style={{position: 'absolute', right: 70, top: 60}}>
      <circle cx={110} cy={110} r={96} fill={alpha('#000', 0.6)} stroke={C.fg} strokeWidth={8} />
      <line x1={110} y1={110} x2={110 + Math.sin(hand * Math.PI / 180) * 70} y2={110 - Math.cos(hand * Math.PI / 180) * 70} stroke={C.gold} strokeWidth={8} strokeLinecap="round" />
      <line x1={110} y1={110} x2={110 + Math.sin(hand / 12 * Math.PI / 180) * 45} y2={110 - Math.cos(hand / 12 * Math.PI / 180) * 45} stroke={C.fg} strokeWidth={10} strokeLinecap="round" />
    </svg>
    <AbsoluteFill style={{background: `linear-gradient(0deg, ${alpha('#000', 0.85)} 0%, transparent 40%)`}} />
    <div style={{position: 'absolute', left: 960, top: 960, transform: 'translate(-50%,-50%)', fontFamily: ff('anton'), fontSize: 120, color: C.fg, whiteSpace: 'nowrap'}}>{txt.slice(0, n)}</div>
    <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [len - 20, len], [0, 1], cl)}} />
  </AbsoluteFill>;
};

// transition overlays at scene cuts: flash / whip blur
const Cut: React.FC<{at: number; kind: 'flash' | 'whip'}> = ({at, kind}) => {
  const f = useCurrentFrame();
  const k = f - at;
  if (k < -4 || k > 6) return null;
  if (kind === 'flash') return <AbsoluteFill style={{background: '#fff', opacity: Math.max(0, 0.6 - Math.abs(k) * 0.12)}} />;
  return <AbsoluteFill style={{backdropFilter: `blur(${Math.max(0, 18 - Math.abs(k) * 4)}px)`, background: alpha(C.blue, Math.max(0, 0.15 - Math.abs(k) * 0.03))}} />;
};

export const ProtoIV: React.FC<ProtoProps> = ({sent, words, frames}) => {
  const T = (i: number) => Math.round((sent[i] ?? frames / 30) * 30);
  const W = (w: string, after = 0) => {
    const alts = w.toLowerCase().split('|');
    const x = words.find((q) => Math.round(q.s * 30) >= after - 3 && alts.some((a) => q.w.toLowerCase().replace(/[^a-z0-9']/g, '').startsWith(a)));
    return x ? Math.round(x.s * 30) : after;
  };
  const seq: [number, number, React.FC<any>][] = [[0, 2, SClinic], [2, 4, SVanish], [4, 5, SWhere], [5, 6, SDrip], [6, 8, SHeart], [8, 12, SCapillary], [12, 14, SCells], [14, 15, SBetter], [15, 16, SNight]];
  return <Ctx.Provider value={{T, W}}>
    <AbsoluteFill style={{background: C.bg}}>
      {seq.map(([a, b, S], i) => {
        const from = i === 0 ? 0 : T(a), to = b >= 16 ? frames : T(b);
        return <Sequence key={i} from={from} durationInFrames={Math.max(1, to - from)}><BaseCtx.Provider value={from}><S len={to - from} /></BaseCtx.Provider></Sequence>;
      })}
      {seq.slice(1).map(([a], i) => <Cut key={i} at={T(a)} kind={i % 2 ? 'flash' : 'whip'} />)}
      <Grain />
    </AbsoluteFill>
  </Ctx.Provider>;
};
