// Motion library: script-driven motion-graphics shots. Each shot is chosen per sentence by the AI director,
// with params + cue words (synced to the narrator). All shapes are drawn in code (SVG), themed by the episode style.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';
import {Beat, Theme, ff, alpha} from './theme';
import {BODY, ORGANS} from './Figures';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const P = (f: number, a: number, d: number) => interpolate(f, [a, a + d], [0, 1], {...cl, easing: ease});
const RED = '#E8384F', RED2 = '#B3122B', BLOOD_BG = '#2A0710';

export type MP = {b: Beat; t: Theme; len: number; vertical: boolean};
const prm = (b: Beat): any => (b as any).params || {};
const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9%]/g, '');
// frame (relative to the shot) when the narrator says `word` (falls back to `dflt`)
export const cueOf = (b: Beat, word: string | undefined | null, dflt: number) => {
  const ws: [string, number][] = (b as any).words || [];
  if (!word) return dflt;
  const alts = String(word).toLowerCase().split('|').map(norm).filter(Boolean);
  const hit = ws.find(([w]) => alts.some((a) => norm(w).startsWith(a) || (a.length > 3 && norm(w).startsWith(a.slice(0, 4)))));
  return hit ? Math.max(0, hit[1] - 2) : dflt;
};
const useLayout = (vertical: boolean) => {
  const {width, height} = useVideoConfig();
  // square graphic box + text anchor
  return vertical ? {W: width, H: 1520, gs: 900, gx: 90, gy: 300, ty: 190, by: 1400} : {W: width, H: height, gs: 900, gx: (width - 900) / 2, gy: 40, ty: 120, by: height - 110};
};

// ---------------------------------------------------------------- typography
export const Slam: React.FC<{text: string; at: number; size: number; color: string; x: number; y: number; font: string; shake?: boolean; upper?: boolean}> =
  ({text, at, size, color, x, y, font, shake, upper = true}) => {
    const f = useCurrentFrame();
    if (f < at) return null;
    const s = spring({frame: f - at, fps: 30, config: {damping: 13, stiffness: 260, mass: 0.6}});
    const k = shake ? Math.sin((f - at) * 2.2) * 8 * Math.max(0, 1 - (f - at) / 12) : 0;
    return <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) translate(${k}px,0) scale(${2 - s})`, opacity: Math.min(1, s * 1.5),
      fontFamily: ff(font), fontSize: size, color, whiteSpace: 'nowrap', textTransform: upper ? 'uppercase' : 'none', lineHeight: 1,
      textShadow: `0 8px 30px ${alpha('#000', 0.45)}`, filter: `blur(${(1 - s) * 7}px)`}}>{text}</div>;
  };
const Caption: React.FC<{text?: string; t: Theme; vertical: boolean; at?: number; color?: string; top?: boolean}> = ({text, t, vertical, at = 6, color, top}) => {
  const f = useCurrentFrame();
  const L = useLayout(vertical);
  if (!text) return null;
  const s = spring({frame: f - at, fps: 30, config: {damping: 15, stiffness: 180}});
  const words = text.split(' ');
  return <div style={{position: 'absolute', left: 0, right: 0, top: (vertical || top) ? L.ty - 60 : L.by - 70, display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
    gap: '0 18px', padding: '0 60px', opacity: s, transform: `translateY(${(1 - s) * 30}px)`}}>
    {words.map((w, i) => {
      const key = w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w);
      return <span key={i} style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 84 : 78, lineHeight: 1.05, color: key ? t.accent : (color || t.fg),
        textTransform: t.upper ? 'uppercase' : 'none', textShadow: `0 6px 24px ${alpha('#000', 0.5)}`}}>{w}</span>;
    })}
  </div>;
};

// ---------------------------------------------------------------- particles
export const Particle: React.FC<{type: string; x: number; y: number; r: number; rot?: number; t: Theme; i?: number}> = ({type, x, y, r, rot = 0, t, i = 0}) => {
  const tr = `translate(${x} ${y}) rotate(${rot})`;
  switch (type) {
    case 'rbc': return <g transform={tr}><ellipse rx={r * 1.6} ry={r * 0.75} fill={RED} stroke={RED2} strokeWidth={r * 0.18} /><ellipse rx={r * 0.8} ry={r * 0.3} fill={RED2} opacity={0.5} /></g>;
    case 'water': return <g transform={`translate(${x} ${y})`}><path d={`M0 ${-r * 1.3} C ${r * 0.9} ${-r * 0.2} ${r} ${r * 0.4} 0 ${r} C ${-r} ${r * 0.4} ${-r * 0.9} ${-r * 0.2} 0 ${-r * 1.3} Z`} fill="#3FC8FF" stroke="#fff" strokeOpacity={0.5} strokeWidth={r * 0.12} /></g>;
    case 'virus': return <g transform={tr}>{Array.from({length: 10}, (_, k) => { const a = k / 10 * Math.PI * 2; return <g key={k}><line x1={0} y1={0} x2={Math.cos(a) * r * 1.5} y2={Math.sin(a) * r * 1.5} stroke="#7CDA3C" strokeWidth={r * 0.14} /><circle cx={Math.cos(a) * r * 1.5} cy={Math.sin(a) * r * 1.5} r={r * 0.2} fill="#B6F25B" /></g>; })}
      <circle r={r} fill="#4FA82A" stroke="#2D6B12" strokeWidth={r * 0.14} /><circle cx={-r * 0.3} cy={-r * 0.2} r={r * 0.16} fill="#fff" /><circle cx={r * 0.3} cy={-r * 0.2} r={r * 0.16} fill="#fff" /><path d={`M${-r * 0.35} ${r * 0.3} Q 0 ${r * 0.1} ${r * 0.35} ${r * 0.3}`} stroke="#123" strokeWidth={r * 0.1} fill="none" /></g>;
    case 'bacteria': return <g transform={tr}><path d={`M${-r * 1.6} ${r * 0.2} q ${-r * 0.6} ${r * 0.4} ${-r * 1.1} 0`} stroke="#C77DFF" strokeWidth={r * 0.12} fill="none" /><rect x={-r * 1.6} y={-r * 0.7} width={r * 3.2} height={r * 1.4} rx={r * 0.7} fill="#9D4EDD" stroke="#5A189A" strokeWidth={r * 0.14} />
      <circle cx={r * 0.7} cy={-r * 0.1} r={r * 0.18} fill="#fff" /><circle cx={r * 1.15} cy={-r * 0.1} r={r * 0.18} fill="#fff" /></g>;
    case 'pill': return <g transform={tr}><rect x={-r * 1.6} y={-r * 0.7} width={r * 1.6} height={r * 1.4} rx={r * 0.7} fill="#FF5D73" /><rect x={0} y={-r * 0.7} width={r * 1.6} height={r * 1.4} rx={r * 0.7} fill="#fff" /><rect x={-r * 0.5} y={-r * 0.7} width={r} height={r * 1.4} fill="#FF5D73" /><rect x={0} y={-r * 0.7} width={r * 0.6} height={r * 1.4} fill="#fff" /></g>;
    case 'sugar': return <g transform={tr}><rect x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} rx={r * 0.2} fill="#fff" stroke="#CFE3F5" strokeWidth={r * 0.12} /></g>;
    case 'fat': return <g transform={tr}><path d={`M${-r} 0 C ${-r} ${-r * 1.1} ${r * 0.9} ${-r * 1.2} ${r} 0 C ${r * 1.1} ${r} ${-r * 0.8} ${r * 1.1} ${-r} 0 Z`} fill="#FFD166" stroke="#E0A800" strokeWidth={r * 0.12} /></g>;
    case 'oxygen': return <g transform={`translate(${x} ${y})`}><circle r={r} fill={alpha('#9BE7FF', 0.25)} stroke="#9BE7FF" strokeWidth={r * 0.12} /><text y={r * 0.35} textAnchor="middle" fontSize={r} fontFamily="F_anton" fill="#9BE7FF">O₂</text></g>;
    case 'smoke': return <g transform={`translate(${x} ${y})`} opacity={0.75}><circle r={r} fill="#8D99AE" /><circle cx={r * 0.8} cy={-r * 0.3} r={r * 0.7} fill="#A9B4C6" /><circle cx={-r * 0.7} cy={-r * 0.2} r={r * 0.6} fill="#7D8798" /></g>;
    case 'alcohol': return <g transform={`translate(${x} ${y})`}><path d={`M0 ${-r * 1.3} C ${r * 0.9} ${-r * 0.2} ${r} ${r * 0.4} 0 ${r} C ${-r} ${r * 0.4} ${-r * 0.9} ${-r * 0.2} 0 ${-r * 1.3} Z`} fill="#B76DFF" /></g>;
    case 'protein': return <g transform={`translate(${x} ${y})`}><circle r={r} fill="#FFC23D" stroke="#FFE39A" strokeWidth={r * 0.1} /><circle cx={-r * 0.3} cy={-r * 0.2} r={r * 0.13} fill="#5A3B00" /><circle cx={r * 0.3} cy={-r * 0.2} r={r * 0.13} fill="#5A3B00" /></g>;
    case 'platelet': return <g transform={tr}><path d={`M${-r} 0 L ${-r * 0.3} ${-r * 0.8} L ${r * 0.8} ${-r * 0.5} L ${r} ${r * 0.4} L 0 ${r * 0.8} Z`} fill="#C08BE8" stroke="#7B3FB0" strokeWidth={r * 0.12} /></g>;
    case 'wbc': return <g transform={`translate(${x} ${y})`}><circle r={r} fill="#F4F7FB" stroke="#C9D6E6" strokeWidth={r * 0.1} /><path d={`M${-r * 0.4} ${-r * 0.1} q ${r * 0.2} ${-r * 0.4} ${r * 0.4} 0 q ${r * 0.2} ${r * 0.4} ${r * 0.4} 0`} stroke="#8E7CC3" strokeWidth={r * 0.25} fill="none" strokeLinecap="round" />
      <circle cx={-r * 0.3} cy={-r * 0.45} r={r * 0.12} fill="#123" /><circle cx={r * 0.3} cy={-r * 0.45} r={r * 0.12} fill="#123" /></g>;
    case 'toxin': return <g transform={tr}><path d={Array.from({length: 8}, (_, k) => { const a = k / 8 * Math.PI * 2, rr = k % 2 ? r * 0.55 : r; return `${k ? 'L' : 'M'}${Math.cos(a) * rr} ${Math.sin(a) * rr}`; }).join(' ') + 'Z'} fill="#A3E635" stroke="#4D7C0F" strokeWidth={r * 0.12} /></g>;
    case 'plaque': return <g transform={tr}><circle r={r} fill="#F2C14E" stroke="#C48A12" strokeWidth={r * 0.12} /></g>;
    case 'signal': return <g transform={`translate(${x} ${y})`}><circle r={r * 0.5} fill="#FFF3A3" /><circle r={r} fill="none" stroke="#FFF3A3" strokeWidth={r * 0.15} opacity={0.5} /></g>;
    default: return <circle cx={x} cy={y} r={r} fill={t.accent2} />;
  }
};

// ---------------------------------------------------------------- 1. SLAM: 1-4 words slammed on cue words
const SlamShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const p = prm(b);
  const L = useLayout(vertical);
  const words: string[] = (p.words && p.words.length ? p.words : (b.text || '').split(' ')).slice(0, 4);
  const n = words.length;
  const layout = (p.layout || ['stack', 'row', 'diag'][Math.floor(rnd(b.from) * 3)]) as string;
  const sizes = n === 1 ? 300 : n === 2 ? 220 : 170;
  const f = useCurrentFrame();
  const bgNum = p.ghost;
  return <AbsoluteFill>
    {bgNum && <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${1 + f / 600})`, fontFamily: ff('anton'), fontSize: 700, color: alpha(t.fg, 0.05)}}>{bgNum}</div>}
    {words.map((w, i) => {
      const at = cueOf(b, w, Math.round(i * Math.min(14, (len - 10) / Math.max(1, n))));
      const key = (p.highlight ?? n - 1) === i;
      let x = L.W / 2, y = L.H / 2;
      if (layout === 'stack' || vertical) y = L.H / 2 + (i - (n - 1) / 2) * sizes * 1.02;
      else if (layout === 'row') { x = L.W / 2 + (i - (n - 1) / 2) * Math.min(520, 1700 / n); }
      else { x = L.W / 2 + (i - (n - 1) / 2) * 360; y = L.H / 2 + (i - (n - 1) / 2) * 150; }
      const sz = layout === 'row' && !vertical ? Math.min(sizes, 1700 / Math.max(1, words.join('').length) * 1.5) : sizes;
      return <Slam key={i} text={w} at={at} size={vertical ? Math.min(sz, 200) : sz} x={x} y={y} color={key ? t.accent : t.fg} font={i % 2 && p.mix ? t.fontBody : t.fontHead} shake={key} upper={t.upper} />;
    })}
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 2. TYPE: typewriter question with floating symbols
const TypeShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const txt: string = (p.text || b.text || '').toUpperCase();
  const n = Math.floor(interpolate(f, [2, 2 + txt.length * 1.4], [0, txt.length], cl));
  const sym = p.symbol || '?';
  return <AbsoluteFill>
    {Array.from({length: 12}, (_, i) => <div key={i} style={{position: 'absolute', left: rnd(i) * L.W, top: L.H - ((f * (1.2 + rnd(i + 3) * 2) + rnd(i + 5) * L.H) % (L.H + 200)),
      fontFamily: ff('anton'), fontSize: 60 + rnd(i + 8) * 140, color: alpha(i % 3 ? t.accent2 : t.accent, 0.12 + rnd(i + 1) * 0.18), transform: `rotate(${(rnd(i + 9) - 0.5) * 40}deg)`}}>{sym}</div>)}
    <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: vertical ? 950 : 1600, textAlign: 'center', fontFamily: ff(t.fontHead),
      fontSize: vertical ? 120 : 140, lineHeight: 1.05, color: t.fg}}>{txt.slice(0, n)}<span style={{color: t.accent, opacity: f % 16 < 8 ? 1 : 0}}>|</span></div>
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 3. COUNTER: number counts up on cue (odometer | gauge | slam)
const parseNum = (v: string) => { const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
const fmt = (n: number, src: string) => { const dec = (String(src).split('.')[1] || '').replace(/\D.*$/, '').length; return n.toLocaleString('en-US', {minimumFractionDigits: dec, maximumFractionDigits: dec}); };
const CounterShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const value = String(p.value ?? b.value ?? '0');
  const target = parseNum(value);
  const at = cueOf(b, p.cue, 4);
  const k = interpolate(f, [at, at + 32], [0, 1], {...cl, easing: ease});
  const pre = value.match(/^[^\d-]*/)?.[0] || '', post = value.replace(/^[^\d-]*[\d.,]+/, '');
  const style = p.style || ['odometer', 'gauge', 'slam'][Math.floor(rnd(b.from + 3) * 3)];
  const label = p.label || b.text || '';
  const big = vertical ? 210 : 240;
  if (style === 'gauge') {
    const pct = Math.min(1, p.max ? target / parseNum(p.max) : (post.includes('%') ? target / 100 : 0.8));
    const R = vertical ? 330 : 300;
    return <AbsoluteFill>
      <svg width={L.W} height={L.H}><g transform={`translate(${L.W / 2} ${vertical ? 800 : 520})`}>
        <circle r={R} fill="none" stroke={alpha(t.fg, 0.1)} strokeWidth={46} />
        <circle r={R} fill="none" stroke={t.accent} strokeWidth={46} strokeLinecap="round" pathLength={1} strokeDasharray={`${pct * k} 1`} transform="rotate(-90)" />
        {Array.from({length: 40}, (_, i) => <line key={i} x1={0} y1={-R - 50} x2={0} y2={-R - 36} stroke={alpha(t.fg, i / 40 < pct * k ? 0.8 : 0.2)} strokeWidth={4} transform={`rotate(${i * 9})`} />)}
      </g></svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: (vertical ? 800 : 520) - big * 0.6, textAlign: 'center', fontFamily: ff(t.fontHead), fontSize: big * 0.8, color: t.fg}}>{pre}{fmt(target * k, value)}{post}</div>
      <Caption text={label} t={t} vertical={vertical} at={at + 18} />
    </AbsoluteFill>;
  }
  if (style === 'slam') {
    return <AbsoluteFill>
      <Slam text={value} at={at} size={big * 1.4} x={L.W / 2} y={L.H / 2 - 40} color={t.accent} font={t.fontHead} shake />
      <Slam text={label} at={at + 10} size={vertical ? 70 : 72} x={L.W / 2} y={L.H / 2 + big * 0.8} color={t.fg} font={t.fontHead} upper={t.upper} />
    </AbsoluteFill>;
  }
  // odometer: digits roll
  const shown = pre + fmt(target * k, value) + post;
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <div style={{display: 'flex', gap: 6}}>{shown.split('').map((ch, i) => <div key={i} style={{fontFamily: ff(t.fontHead), fontSize: big, lineHeight: 1.1, color: t.fg,
      background: /\d/.test(ch) ? alpha(t.fg, 0.07) : 'transparent', borderRadius: 14, padding: '0 10px', transform: `translateY(${/\d/.test(ch) && k < 1 ? Math.sin(f * 1.7 + i) * 8 : 0}px)`}}>{ch}</div>)}</div>
    <div style={{height: 10, width: 300 * P(f, at + 20, 14), background: t.accent, borderRadius: 6, margin: '30px 0'}} />
    <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 64 : 70, color: t.accent, opacity: P(f, at + 22, 12), textTransform: t.upper ? 'uppercase' : 'none', textAlign: 'center', maxWidth: 1500}}>{label}</div>
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 4. METER: HUD bars filling
const MeterShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const bars: any[] = (p.bars && p.bars.length ? p.bars : [{label: b.text || '', from: 20, to: 90, good: true}]).slice(0, 3);
  const w = vertical ? 900 : 1300;
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 50}}>
    {p.title && <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 84 : 90, color: t.fg, textTransform: t.upper ? 'uppercase' : 'none', marginBottom: 20}}>{p.title}</div>}
    {bars.map((bar, i) => {
      const at = cueOf(b, bar.cue, 6 + i * 10);
      const v = interpolate(f, [at, at + 36], [Number(bar.from ?? 0), Number(bar.to ?? 100)], {...cl, easing: ease}) / 100;
      const good = bar.good !== false;
      const col = good ? (v > 0.6 ? '#2EE59D' : v > 0.3 ? '#FFC23D' : '#FF4D5E') : (v > 0.6 ? '#FF4D5E' : v > 0.3 ? '#FFC23D' : '#2EE59D');
      return <div key={i} style={{width: w}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: ff(t.fontHead), fontSize: vertical ? 54 : 56, color: t.fg, textTransform: t.upper ? 'uppercase' : 'none'}}>
          <span>{bar.label}</span><span style={{color: col}}>{Math.round(v * 100)}%</span></div>
        <div style={{marginTop: 12, height: 64, borderRadius: 32, background: alpha(t.fg, 0.1), border: `4px solid ${alpha(t.fg, 0.35)}`, overflow: 'hidden', position: 'relative'}}>
          <div style={{width: `${v * 100}%`, height: '100%', background: col, boxShadow: `0 0 30px ${col}`}} />
          {Array.from({length: 20}, (_, k) => <div key={k} style={{position: 'absolute', top: 0, bottom: 0, left: `${k * 5}%`, width: 3, background: alpha('#000', 0.25)}} />)}
        </div>
      </div>;
    })}
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 5. VESSEL: tunnel with flowing cells/particles, optional plaque blockage
const VesselShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const types: string[] = (p.particles && p.particles.length ? p.particles : ['rbc', 'water']).slice(0, 3);
  const spd = p.flow === 'stopped' ? interpolate(f, [0, 40], [1, 0], cl) * 4 : p.flow === 'slow' ? 3 : p.flow === 'fast' ? 14 : 7;
  const block = Number(p.blockage || 0) * P(f, cueOf(b, p.cue, 10), 40);
  const top = L.H * 0.22, bot = L.H * 0.78, mid = (top + bot) / 2;
  const items = Array.from({length: 30}, (_, i) => {
    const ty = types[i % types.length];
    const x = ((f * spd * (0.7 + rnd(i) * 0.6) + rnd(i + 1) * (L.W + 400)) % (L.W + 400)) - 200;
    let y = top + 60 + rnd(i + 2) * (bot - top - 120);
    if (block > 0) { const d = Math.abs(x - L.W * 0.6); if (d < 300) y = mid + (y - mid) * (1 - block * 0.8 * (1 - d / 300)); }
    const r = ty === 'rbc' ? 30 : ty === 'wbc' ? 50 : 22;
    return <Particle key={i} type={ty} x={x} y={y} r={r * (vertical ? 1.2 : 1)} rot={Math.sin((f + i * 9) / 14) * 25} t={t} />;
  });
  const plaqueH = (bot - top) * 0.42 * block;
  return <AbsoluteFill style={{background: BLOOD_BG}}>
    <svg width={L.W} height={L.H}>
      <defs><linearGradient id="vw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5C0E1E" /><stop offset="0.5" stopColor="#8A1A2E" /><stop offset="1" stopColor="#5C0E1E" /></linearGradient></defs>
      <rect x={0} y={top} width={L.W} height={bot - top} fill="url(#vw)" />
      {Array.from({length: 16}, (_, i) => { const x = ((i * 160 - f * spd * 0.4) % (L.W + 320) + L.W + 320) % (L.W + 320) - 160; return <g key={i}><line x1={x} x2={x + 90} y1={top + 6} y2={top + 6} stroke="#C2384B" strokeWidth={10} /><line x1={x + 40} x2={x + 130} y1={bot - 6} y2={bot - 6} stroke="#C2384B" strokeWidth={10} /></g>; })}
      {items}
      {block > 0 && <>
        <path d={`M${L.W * 0.6 - 320} ${top} Q ${L.W * 0.6} ${top + plaqueH * 2} ${L.W * 0.6 + 320} ${top} Z`} fill="#F2C14E" stroke="#C48A12" strokeWidth={6} />
        <path d={`M${L.W * 0.6 - 320} ${bot} Q ${L.W * 0.6} ${bot - plaqueH * 2} ${L.W * 0.6 + 320} ${bot} Z`} fill="#F2C14E" stroke="#C48A12" strokeWidth={6} />
      </>}
      <rect x={0} y={top - 50} width={L.W} height={50} fill="#3B0915" /><rect x={0} y={bot} width={L.W} height={50} fill="#3B0915" />
    </svg>
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={8} color="#FFFFFF" />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 6. HEART: beat | squeeze | race | attack | stop
const HEART = 'M0 -60 C -30 -110 -110 -90 -105 -25 C -100 30 -40 70 0 110 C 40 70 100 30 105 -25 C 110 -90 30 -110 0 -60 Z';
const HeartShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const mode = p.mode || 'beat';
  const at = cueOf(b, p.cue, 12);
  const period = mode === 'race' ? 11 : mode === 'stop' && f > at ? 9999 : 26;
  const k = f % period;
  let sc = k < 6 ? 1 + 0.12 * Math.sin((k / 6) * Math.PI) : 1;
  if (mode === 'squeeze' && f >= at) sc = 1 + 0.35 * Math.exp(-(f - at) / 6);
  const cx = L.W / 2, cy = vertical ? 820 : L.H / 2 + 20, S = vertical ? 3.2 : 2.7;
  const paths = [[-1, -0.6], [-1, 0.5], [1, -0.6], [1, 0.5], [0.1, -1], [-0.1, 1]].map(([dx, dy], i) =>
    `M${cx} ${cy} C ${cx + dx * 300} ${cy + dy * 80} ${cx + dx * 500} ${cy + dy * 300} ${cx + dx * L.W * 0.48} ${cy + dy * L.H * 0.42}`);
  const draw = mode === 'squeeze' ? P(f, at, 30) : 1;
  const dark = mode === 'attack' ? P(f, at, 50) : 0;
  const bpm = mode === 'race' ? Math.round(interpolate(f, [0, 40], [72, 160], cl)) : mode === 'stop' && f > at ? 0 : 72;
  const ecg = Array.from({length: 120}, (_, i) => { const x = i * (L.W / 120); const ph = ((i * 4 + f * (mode === 'race' ? 9 : 4)) % 120); const yv = mode === 'stop' && f > at ? 0 : ph > 50 && ph < 54 ? -90 : ph > 54 && ph < 58 ? 60 : 0; return `${i ? 'L' : 'M'}${x} ${(vertical ? 1450 : L.H - 90) + yv}`; }).join(' ');
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% ${vertical ? 43 : 52}%, ${alpha(RED, 0.25)}, transparent 60%)`}}>
    <svg width={L.W} height={L.H}>
      {paths.map((d, i) => <path key={i} d={d} stroke={alpha(RED, 0.8)} strokeWidth={12 - i} fill="none" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} strokeLinecap="round" />)}
      {paths.map((d, i) => Array.from({length: 4}, (_, j) => { const tt = ((f / (mode === 'race' ? 20 : 40)) + j / 4) % 1; return <circle key={i + '-' + j} r={9} fill={t.accent2} opacity={draw * (mode === 'stop' && f > at ? 0 : 1)} style={{offsetPath: `path('${d}')`, offsetDistance: `${tt * 100}%`} as any} />; }))}
      <path d={ecg} stroke="#2EE59D" strokeWidth={5} fill="none" opacity={0.8} />
      <g transform={`translate(${cx} ${cy}) scale(${S * sc})`}>
        <defs><clipPath id="hc"><path d={HEART} /></clipPath></defs>
        <path d={HEART} fill={RED} stroke="#FF8A99" strokeWidth={3} />
        <g clipPath="url(#hc)"><circle cx={45} cy={-10} r={90 * dark} fill="#3B1A22" opacity={0.85} /></g>
        <path d="M-40 -40 Q -60 -10 -40 20" stroke="#FFB3BE" strokeWidth={6} fill="none" opacity={0.6} />
        {mode === 'attack' && <path d="M20 -70 C 40 -40 60 -30 70 -10" stroke="#F2C14E" strokeWidth={9} fill="none" strokeLinecap="round" />}
      </g>
    </svg>
    {mode === 'squeeze' && f >= at && f < at + 6 && <AbsoluteFill style={{background: alpha('#fff', 0.3 * (1 - (f - at) / 6))}} />}
    <div style={{position: 'absolute', right: vertical ? 60 : 80, top: vertical ? 1300 : 70, fontFamily: ff('spacemono'), fontSize: 46, color: '#2EE59D'}}>♥ {bpm} BPM</div>
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={at + 4} top />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 7. ORGAN close-up with action
const ORG: Record<string, {d: string; col: string; col2: string}> = {
  brain: {d: 'M500 220 C 640 160 800 230 820 360 C 900 400 900 560 800 600 C 790 700 640 760 520 720 C 420 780 260 740 230 640 C 130 600 120 440 210 390 C 210 260 360 170 500 220 Z', col: '#F4A6B8', col2: '#D9708C'},
  lungs: {d: 'M470 260 L 470 420 C 380 330 220 380 200 560 C 180 720 260 790 360 770 C 460 750 470 650 470 560 Z M530 260 L 530 420 C 620 330 780 380 800 560 C 820 720 740 790 640 770 C 540 750 530 650 530 560 Z', col: '#F48FA5', col2: '#C85A74'},
  liver: {d: 'M180 420 C 260 300 560 290 820 330 C 880 340 870 420 800 470 C 650 580 450 690 320 650 C 200 610 130 500 180 420 Z', col: '#A0402F', col2: '#6E2519'},
  stomach: {d: 'M380 200 C 380 300 420 330 520 360 C 700 410 760 560 680 690 C 600 810 380 800 330 680 C 300 610 360 580 330 520 C 300 460 260 380 300 200 Z', col: '#F2A3A0', col2: '#C86B68'},
  kidney: {d: 'M520 220 C 720 200 820 380 780 540 C 740 720 560 800 450 720 C 520 640 520 540 440 520 C 360 500 330 420 380 330 C 410 260 460 225 520 220 Z', col: '#B8323F', col2: '#7E1C27'},
  intestine: {d: 'M260 300 H 740 Q 800 300 800 360 Q 800 420 740 420 H 300 Q 240 420 240 480 Q 240 540 300 540 H 700 Q 760 540 760 600 Q 760 660 700 660 H 320 Q 260 660 260 720 Q 260 780 320 780 H 760', col: '#F7B2A2', col2: '#D07A66'},
  tooth: {d: 'M330 300 C 330 200 430 180 500 230 C 570 180 670 200 670 300 C 670 420 640 470 630 560 C 620 700 600 800 560 800 C 520 800 520 640 500 640 C 480 640 480 800 440 800 C 400 800 380 700 370 560 C 360 470 330 420 330 300 Z', col: '#F8F5EC', col2: '#D8D0BC'},
  tongue: {d: 'M300 360 C 300 260 700 260 700 360 C 700 560 620 760 500 780 C 380 760 300 560 300 360 Z', col: '#F07F8E', col2: '#C9566A'},
  bone: {d: 'M300 260 C 240 220 200 300 250 340 C 200 380 260 450 320 410 L 680 590 C 740 550 800 620 750 660 C 800 700 760 780 700 740 C 680 800 600 780 620 720 L 290 450 C 230 500 160 420 220 380 C 170 330 230 250 300 260 Z', col: '#F3EBD8', col2: '#CBBE9C'},
  eye: {d: 'M180 500 C 300 320 700 320 820 500 C 700 680 300 680 180 500 Z', col: '#FFFFFF', col2: '#C9D6E6'},
  skin: {d: 'M150 380 H 850 V 760 H 150 Z', col: '#F2C6A8', col2: '#D89C7A'},
  bladder: {d: 'M500 240 C 700 240 760 420 720 560 C 690 680 600 740 500 760 C 400 740 310 680 280 560 C 240 420 300 240 500 240 Z', col: '#F6C66B', col2: '#D69D2F'},
};
const OrganShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const key = Object.keys(ORG).find((k) => String(p.organ || '').toLowerCase().includes(k.replace(/s$/, ''))) || 'brain';
  const o = ORG[key];
  const action = p.action || 'glow';
  const at = cueOf(b, p.cue, 10);
  const a = P(f, at, 45);
  const e = spring({frame: f, fps: 30, config: {damping: 14, stiffness: 120}});
  const breathe = action === 'breathe' ? 1 + Math.sin(f / 16) * 0.06 : action === 'pulse' ? 1 + Math.max(0, Math.sin(f / 5)) * 0.05 : 1;
  const shrink = action === 'shrink' ? 1 - 0.25 * a : 1;
  const sc = (L.gs / 1000) * (vertical ? 1.15 : 1.3) * e * breathe * shrink;
  const dark = action === 'damage' || action === 'inflame' ? a : action === 'heal' ? 1 - a : 0;
  const spots = Array.from({length: 9}, (_, i) => <circle key={i} cx={300 + rnd(i + key.length) * 420} cy={300 + rnd(i + 3) * 400} r={(30 + rnd(i + 5) * 70) * dark}
    fill={action === 'inflame' ? '#FF2E2E' : '#3B1A22'} opacity={action === 'inflame' ? 0.45 : 0.75} />);
  const fill = action === 'fill' ? a : 0;
  return <AbsoluteFill>
    <svg width={L.W} height={L.H}>
      <g transform={`translate(${vertical || !p.label ? L.W / 2 : L.W * 0.36} ${L.gy + L.gs / 2}) scale(${sc}) translate(-500 -500)`}>
        <defs><clipPath id={'oc' + key}><path d={o.d} /></clipPath>
          <radialGradient id="og"><stop offset="0" stopColor={t.accent} stopOpacity={0.45} /><stop offset="1" stopColor={t.accent} stopOpacity={0} /></radialGradient></defs>
        {(action === 'glow' || action === 'inflame') && <circle cx={500} cy={500} r={430 + Math.sin(f / 8) * 20} fill="url(#og)" />}
        {key === 'intestine' ? <path d={o.d} stroke={o.col} strokeWidth={90} fill="none" strokeLinecap="round" /> : <path d={o.d} fill={o.col} stroke={o.col2} strokeWidth={12} />}
        {key === 'brain' && [0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${260 + i * 110} ${300 + (i % 2) * 40} q 40 80 -10 160 q -40 80 20 160`} stroke={o.col2} strokeWidth={10} fill="none" opacity={0.7} />)}
        {key === 'tooth' && <path d="M400 360 C 430 300 570 300 600 360 L 580 560 C 560 620 440 620 420 560 Z" fill="#F7B3B3" opacity={0.6} />}
        {key === 'eye' && <><circle cx={500} cy={500} r={110} fill="#3A86FF" /><circle cx={500} cy={500} r={50} fill="#0B132B" /><circle cx={530} cy={470} r={18} fill="#fff" /></>}
        {key === 'skin' && <><rect x={150} y={380} width={700} height={70} fill="#E8B08E" /><rect x={150} y={600} width={700} height={160} fill="#FFE2A8" />
          {action === 'heal' || action === 'damage' ? <path d={`M500 380 L ${500 - 60 * (action === 'heal' ? 1 - a : a)} 600 L ${500 + 60 * (action === 'heal' ? 1 - a : a)} 600 Z`} fill={RED} /> : null}</>}
        <g clipPath={`url(#oc${key})`}>{spots}
          {fill > 0 && <rect x={0} y={1000 - 1000 * fill} width={1000} height={1000} fill={alpha(t.accent2, 0.55)} />}
        </g>
        {action === 'gas' && Array.from({length: 7}, (_, i) => { const yy = ((f * 3 + i * 60) % 420); return <path key={i} d={`M${330 + i * 55} ${300 - yy} q 20 -30 0 -60 q -20 -30 0 -60`} stroke="#9BE15D" strokeWidth={12} fill="none" opacity={1 - yy / 420} strokeLinecap="round" />; })}
        {action === 'bacteria' && Array.from({length: 10}, (_, i) => <Particle key={i} type="bacteria" x={330 + rnd(i) * 340 + Math.sin((f + i * 10) / 12) * 15} y={330 + rnd(i + 2) * 360} r={22} rot={rnd(i + 4) * 360} t={t} />)}
        {action === 'heal' && Array.from({length: 10}, (_, i) => { const k = P(f, at + i * 4, 30); return <path key={i} d="M0 -20 L5 -5 L20 0 L5 5 L0 20 L-5 5 L-20 0 L-5 -5 Z" transform={`translate(${250 + rnd(i) * 500} ${300 + rnd(i + 1) * 400 - k * 80}) scale(${1.5 * (1 - k)})`} fill="#fff" opacity={k > 0 ? 1 : 0} />; })}
        {action === 'signal' && Array.from({length: 14}, (_, i) => { const tt = ((f / 30) + rnd(i)) % 1; return <circle key={i} cx={260 + rnd(i + 2) * 480} cy={260 + rnd(i + 7) * 480} r={14 + 30 * tt} fill="none" stroke="#FFF3A3" strokeWidth={6} opacity={1 - tt} />; })}
      </g>
    </svg>
    {p.label && <div style={{position: 'absolute', left: vertical ? 0 : L.W * 0.6, right: vertical ? 0 : 60, top: vertical ? L.gy + L.gs + 30 : L.H / 2 - 80, textAlign: vertical ? 'center' : 'left',
      fontFamily: ff(t.fontHead), fontSize: vertical ? 90 : 84, lineHeight: 1.05, color: t.fg, opacity: P(f, at, 12), textTransform: t.upper ? 'uppercase' : 'none'}}>
      <div style={{fontSize: vertical ? 46 : 42, color: t.accent, letterSpacing: 4}}>{key.toUpperCase()}</div>{p.label}</div>}
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 8. MEMBRANE: a wall with gaps — small things pass, big things are blocked
const MembraneShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const passT = p.pass || 'water', blockT = p.block || 'protein';
  const at = cueOf(b, p.cue, 10);
  const open = P(f, at, 20);
  const wx = L.W / 2 - 60, n = vertical ? 14 : 9, th = L.H / n;
  const wallCol = p.wall === 'gut' ? '#E39A8C' : p.wall === 'brain' ? '#8E7CC3' : '#C84B5E';
  const tiles = Array.from({length: n}, (_, i) => { const gh = th * 0.25 * open; return <rect key={i} x={wx} y={i * th + gh / 2} width={120} height={th - gh} rx={18} fill={wallCol} stroke={alpha('#fff', 0.4)} strokeWidth={4} />; });
  const passers = Array.from({length: 50}, (_, i) => {
    const lane = Math.floor(rnd(i) * (n - 1)), gy = (lane + 1) * th;
    const x = ((f * (4 + rnd(i + 2) * 4) + rnd(i + 3) * L.W) % L.W);
    const y0 = 80 + rnd(i + 4) * (L.H - 160);
    const y = x < wx - 140 ? y0 : x < wx + 160 ? interpolate(x, [wx - 140, wx, wx + 120, wx + 160], [y0, gy, gy, gy]) : gy + (x - wx - 160) * (rnd(i + 6) - 0.5);
    if (open < 0.5 && x > wx - 20) return null;
    return <Particle key={i} type={passT} x={x} y={y} r={14} t={t} />;
  });
  const blockers = Array.from({length: vertical ? 9 : 6}, (_, i) => { const y = (i + 0.7) * (L.H / (vertical ? 9 : 6)); const x = wx - 120 - Math.abs(Math.sin((f + i * 17) / 11)) * 160; return <Particle key={i} type={blockT} x={x} y={y} r={44} t={t} />; });
  return <AbsoluteFill style={{background: `linear-gradient(90deg, ${alpha(RED2, 0.35)} 0%, ${alpha(RED2, 0.35)} 48%, ${alpha(t.accent2, 0.15)} 52%, ${alpha(t.accent2, 0.15)} 100%)`}}>
    <svg width={L.W} height={L.H}>{passers}{tiles}{blockers}</svg>
    {p.leftLabel && <div style={{position: 'absolute', left: 50, top: 40, fontFamily: ff(t.fontHead), fontSize: 44, color: alpha(t.fg, 0.7)}}>{p.leftLabel}</div>}
    {p.rightLabel && <div style={{position: 'absolute', right: 50, top: 40, fontFamily: ff(t.fontHead), fontSize: 44, color: alpha(t.fg, 0.7)}}>{p.rightLabel}</div>}
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={at + 6} />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 9. CELLS: hex field with a wave (fill | infect | die | heal | multiply)
const CellsShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const action = p.action || 'fill';
  const at = cueOf(b, p.cue, 6);
  const front = interpolate(f, [at, at + Math.max(30, len * 0.6)], [-200, L.W + L.H], cl);
  const z = interpolate(f, [0, len], [1.15, 0.95]);
  const col = action === 'infect' ? '#7CDA3C' : action === 'die' ? '#555E6E' : action === 'heal' ? '#2EE59D' : t.accent2;
  const cells: React.ReactNode[] = [];
  const cols = Math.ceil(L.W / 115) + 1, rows = Math.ceil(L.H / 100) + 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * 115 + (r % 2) * 57, y = r * 100;
    const d = action === 'infect' ? Math.hypot(x - L.W / 2, y - L.H / 2) : x + y * 0.4;
    const k = Math.max(0, Math.min(1, (front - d) / 160));
    const sw = action === 'die' ? 1 - 0.25 * k : action === 'multiply' ? 0.5 + 0.5 * Math.min(1, (front - d + 160) / 160) : 1 + 0.1 * k;
    cells.push(<g key={r + '-' + c} transform={`translate(${x} ${y}) scale(${Math.max(0, sw)})`}>
      <path d="M0 -55 L48 -28 L48 28 L0 55 L-48 28 L-48 -28 Z" fill={k > 0 ? alpha(col, 0.25 + 0.5 * k) : alpha(t.fg, 0.06)} stroke={k > 0 ? col : alpha(t.fg, 0.25)} strokeWidth={3} />
      <circle r={14} fill={k > 0 ? alpha('#fff', 0.7) : alpha(t.fg, 0.2)} />
      {action === 'infect' && k > 0.5 && <Particle type="virus" x={18} y={-18} r={10} t={t} />}</g>);
  }
  return <AbsoluteFill>
    <AbsoluteFill style={{transform: `scale(${z})`}}><svg width={L.W} height={L.H}>{cells}</svg></AbsoluteFill>
    <AbsoluteFill style={{background: `linear-gradient(0deg, ${alpha(t.bg, 0.9)} 0%, transparent 30%)`}} />
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={at + 8} />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 10. BATTLE: white blood cells chase invaders
const BattleShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const inv = p.invader || 'virus';
  const out = p.outcome || 'win';
  const at = cueOf(b, p.cue, 12);
  const n = 10;
  const enemies = Array.from({length: n}, (_, i) => {
    const bx = L.W * (0.15 + rnd(i) * 0.7), by = L.H * (0.18 + rnd(i + 1) * 0.6);
    const caught = out === 'win' ? P(f, at + i * Math.max(3, (len - at - 20) / n), 12) : 0;
    const x = bx + Math.sin((f + i * 13) / 9) * 30, y = by + Math.cos((f + i * 7) / 11) * 30;
    return <g key={i} opacity={1 - caught}><Particle type={inv} x={x} y={y} r={(30 + (out === 'lose' ? P(f, at, 60) * 15 : 0)) * (1 - caught * 0.6)} rot={f * 2 + i * 30} t={t} /></g>;
  });
  const hunters = Array.from({length: out === 'lose' ? 2 : 4}, (_, i) => {
    const tgt = Math.min(n - 1, Math.floor(interpolate(f, [at, len], [0, n], cl)) + i);
    const bx = L.W * (0.15 + rnd(tgt) * 0.7), by = L.H * (0.18 + rnd(tgt + 1) * 0.6);
    const sx = i % 2 ? -150 : L.W + 150, sy = L.H * (0.2 + i * 0.2);
    const k = P(f, i * 6, 40);
    return <Particle key={i} type="wbc" x={interpolate(k, [0, 1], [sx, bx + (i - 1.5) * 40])} y={interpolate(k, [0, 1], [sy, by])} r={70} t={t} />;
  });
  return <AbsoluteFill style={{background: `radial-gradient(circle, ${alpha(RED2, 0.3)}, transparent 75%)`}}>
    <svg width={L.W} height={L.H}>{enemies}{hunters}</svg>
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={8} />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 11. SPREAD: contagion from one person to many
const Person: React.FC<{x: number; y: number; s: number; col: string}> = ({x, y, s, col}) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <circle cx={0} cy={-34} r={16} fill={col} /><path d="M-22 18 C -22 -12 22 -12 22 18 Z" fill={col} /></g>;
const SpreadShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const at = cueOf(b, p.cue, 8);
  const cols = vertical ? 7 : 12, rows = vertical ? 11 : 6;
  const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
  const wave = interpolate(f, [at, at + Math.max(40, len * 0.7)], [0, Math.hypot(cols, rows)], cl);
  const nodes: React.ReactNode[] = []; const links: React.ReactNode[] = [];
  let sick = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c + 0.5) * (L.W / cols) + (rnd(r * 31 + c) - 0.5) * 30, y = (r + 0.5) * (L.H * 0.72 / rows) + L.H * 0.14;
    const d = Math.hypot(c - cx, r - cy) + rnd(r * 7 + c) * 1.2;
    const on = d <= wave; if (on) sick++;
    if (on && d > 0.5 && d > wave - 1.2) links.push(<line key={'l' + r + c} x1={x} y1={y} x2={(cx + 0.5) * (L.W / cols) + (x - (cx + 0.5) * (L.W / cols)) * 0.6} y2={L.H * 0.14 + (cy + 0.5) * (L.H * 0.72 / rows) + (y - L.H * 0.14 - (cy + 0.5) * (L.H * 0.72 / rows)) * 0.6}
      stroke={alpha(t.accent, 0.6)} strokeWidth={3} strokeDasharray="8 8" />);
    nodes.push(<Person key={r + '-' + c} x={x} y={y} s={vertical ? 1.5 : 1.3} col={on ? t.accent : alpha(t.fg, 0.3)} />);
  }
  return <AbsoluteFill>
    <svg width={L.W} height={L.H}>{links}{nodes}</svg>
    <div style={{position: 'absolute', right: 40, top: 20, padding: '6px 26px', borderRadius: 16, background: alpha(t.bg, 0.85), fontFamily: ff(t.fontHead), fontSize: 80, color: t.accent}}>{sick}<span style={{fontSize: 40, color: t.fg}}> {p.unit || 'PEOPLE'}</span></div>
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={at + 10} />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 12. CLOCK: time jump ("HOUR 6", "DAY 3")
const ClockShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const label = p.label || b.text || '';
  const spin = interpolate(f, [0, 24], [0, 1], {...cl, easing: Easing.inOut(Easing.cubic)});
  const hand = spin * 720 * (p.speed || 1) + f * 0.5;
  const R = vertical ? 300 : 260;
  const cy = vertical ? 760 : L.H / 2 - 40;
  return <AbsoluteFill>
    {Array.from({length: 6}, (_, i) => <div key={i} style={{position: 'absolute', left: 0, right: 0, top: cy - 6, height: 12, background: alpha(t.accent2, 0.15),
      transform: `rotate(${i * 30 + f * 0.3}deg) scaleX(${1 - spin * 0.6})`, opacity: 1 - spin}} />)}
    <svg width={L.W} height={L.H}><g transform={`translate(${L.W / 2} ${cy})`}>
      <circle r={R} fill={alpha(t.bg2 || t.bg, 0.9)} stroke={t.fg} strokeWidth={14} />
      {Array.from({length: 12}, (_, i) => <line key={i} x1={0} y1={-R + 20} x2={0} y2={-R + 50} stroke={t.fg} strokeWidth={8} transform={`rotate(${i * 30})`} />)}
      <line x1={0} y1={0} x2={0} y2={-R * 0.75} stroke={t.accent} strokeWidth={12} strokeLinecap="round" transform={`rotate(${hand})`} />
      <line x1={0} y1={0} x2={0} y2={-R * 0.5} stroke={t.fg} strokeWidth={16} strokeLinecap="round" transform={`rotate(${hand / 12})`} />
      <circle r={18} fill={t.accent} /></g></svg>
    <Slam text={label} at={20} size={vertical ? 150 : 170} x={L.W / 2} y={vertical ? 1250 : L.H - 150} color={t.accent} font={t.fontHead} shake />
    {p.sub && <Slam text={p.sub} at={28} size={56} x={L.W / 2} y={vertical ? 1380 : L.H - 50} color={t.fg} font={t.fontBody} upper={false} />}
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 13. JOURNEY: a dot travels through the body from stop to stop
const STOP: Record<string, [number, number]> = {mouth: [100, 54], nose: [100, 46], throat: [100, 70], brain: [100, 30], lungs: [100, 110], heart: [106, 116],
  stomach: [112, 145], liver: [88, 140], kidneys: [100, 160], kidney: [100, 160], intestine: [100, 180], gut: [100, 180], bladder: [100, 206], blood: [72, 150], arm: [150, 160],
  skin: [128, 150], bones: [112, 250], muscles: [72, 150], leg: [118, 280], eyes: [100, 40], pancreas: [104, 156]};
const JourneyShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const stops: string[] = (p.stops || ['mouth', 'stomach', 'blood', 'brain']).slice(0, 5);
  const pts = stops.map((s) => STOP[Object.keys(STOP).find((k) => s.toLowerCase().includes(k)) || 'heart']);
  const S = (vertical ? 1400 : 980) / 320;
  const ox = L.W / 2 - 100 * S, oy = vertical ? 260 : 50;
  const seg = Math.max(12, (len - 20) / Math.max(1, pts.length - 1));
  const idx = Math.min(pts.length - 1.001, Math.max(0, (f - 10) / seg));
  const i0 = Math.floor(idx), k = ease(idx - i0);
  const cur = pts.length > 1 ? [pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * k, pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * k] : pts[0];
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]} ${q[1]}`).join(' ');
  const typ = p.particle || 'pill';
  return <AbsoluteFill>
    <svg width={L.W} height={L.H}><g transform={`translate(${ox} ${oy}) scale(${S})`}>
      <path d={BODY} fill={alpha(t.fg, 0.06)} stroke={alpha(t.fg, 0.6)} strokeWidth={1.5} />
      <path d={d} stroke={alpha(t.accent, 0.4)} strokeWidth={2} strokeDasharray="3 3" fill="none" />
      {pts.map((q, i) => { const on = idx >= i - 0.05; return <g key={i}><circle cx={q[0]} cy={q[1]} r={on ? 5 : 3} fill={on ? t.accent : alpha(t.fg, 0.4)} />
        {on && <circle cx={q[0]} cy={q[1]} r={5 + ((f + i * 7) % 20) / 2} fill="none" stroke={t.accent} strokeWidth={0.8} opacity={1 - ((f + i * 7) % 20) / 20} />}</g>; })}
      <Particle type={typ} x={cur[0]} y={cur[1]} r={5} t={t} rot={f * 3} />
    </g></svg>
    {pts.map((q, i) => { const on = idx >= i - 0.05; const left = q[0] < 100; return <div key={i} style={{position: 'absolute', top: oy + q[1] * S - 30,
      left: left ? undefined : ox + 160 * S, right: left ? L.W - ox - 40 * S : undefined, fontFamily: ff(t.fontHead), fontSize: vertical ? 54 : 50, color: on ? t.fg : 'transparent',
      textTransform: 'uppercase', transform: `translateX(${on ? 0 : left ? -30 : 30}px)`, transition: 'none'}}>{stops[i]}</div>; })}
    <Caption text={p.label} t={t} vertical={vertical} at={6} top={vertical} />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 14. ZOOM: from the whole body into one spot (outside -> inside transition)
const ZoomShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const tg = STOP[Object.keys(STOP).find((k) => String(p.target || '').toLowerCase().includes(k)) || 'heart'];
  const S0 = (vertical ? 1400 : 980) / 320;
  const z = interpolate(f, [8, Math.max(30, len - 6)], [1, 14], {...cl, easing: Easing.in(Easing.cubic)});
  const ox = L.W / 2 - 100 * S0, oy = vertical ? 260 : 50;
  const fx = ox + tg[0] * S0, fy = oy + tg[1] * S0;
  return <AbsoluteFill>
    <AbsoluteFill style={{transform: `scale(${z})`, transformOrigin: `${fx}px ${fy}px`}}>
      <svg width={L.W} height={L.H}><g transform={`translate(${ox} ${oy}) scale(${S0})`}>
        <path d={BODY} fill={alpha(t.fg, 0.08)} stroke={alpha(t.fg, 0.7)} strokeWidth={1.5} />
        <circle cx={tg[0]} cy={tg[1]} r={9 + Math.sin(f / 4) * 1.5} fill={alpha(t.accent, 0.35)} /><circle cx={tg[0]} cy={tg[1]} r={4} fill={t.accent} />
      </g></svg>
    </AbsoluteFill>
    <AbsoluteFill style={{background: t.bg, opacity: interpolate(f, [len - 10, len], [0, 1], cl)}} />
    <Caption text={p.label || b.text} t={t} vertical={vertical} at={4} top />
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 15. COMPARE: two sides with a VS
const CompareShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const L = useLayout(vertical);
  const sides = [p.left || {label: (b.items || [])[0]}, p.right || {label: (b.items || [])[1]}];
  const e = [spring({frame: f - 2, fps: 30, config: {damping: 14, stiffness: 160}}), spring({frame: f - cueOf(b, sides[1]?.cue, 14), fps: 30, config: {damping: 14, stiffness: 160}})];
  return <AbsoluteFill style={{flexDirection: vertical ? 'column' : 'row', padding: vertical ? '300px 60px 560px' : '160px 120px', gap: 40}}>
    {p.title && <div style={{position: 'absolute', left: 0, right: 0, top: vertical ? 170 : 50, textAlign: 'center', fontFamily: ff(t.fontHead), fontSize: 76, color: t.fg, textTransform: t.upper ? 'uppercase' : 'none'}}>{p.title}</div>}
    {sides.map((s: any, i: number) => <div key={i} style={{flex: 1, borderRadius: Math.max(16, t.radius), background: alpha(i ? t.accent : t.accent2, 0.13), border: `5px solid ${i ? t.accent : t.accent2}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: e[i], transform: `translateY(${(1 - e[i]) * 80}px) rotate(${(1 - e[i]) * (i ? 4 : -4)}deg)`}}>
      {s?.particle && <svg width={260} height={220}><Particle type={s.particle} x={130} y={110} r={60} t={t} rot={Math.sin(f / 10) * 10} /></svg>}
      {s?.big && <div style={{fontFamily: ff(t.fontHead), fontSize: 150, color: i ? t.accent : t.accent2, lineHeight: 1}}>{s.big}</div>}
      <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 64 : 66, color: t.fg, textAlign: 'center', padding: '0 30px', lineHeight: 1.1, textTransform: t.upper ? 'uppercase' : 'none'}}>{s?.label}</div>
    </div>)}
    <div style={{position: 'absolute', left: '50%', top: vertical ? '42%' : '55%', transform: `translate(-50%,-50%) scale(${P(f, 12, 10)}) rotate(${(1 - P(f, 12, 10)) * 90}deg)`, width: 130, height: 130, borderRadius: 65,
      background: t.fg, color: t.bg, fontFamily: ff('anton'), fontSize: 54, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>VS</div>
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 16. LIST: numbered reveal on cue words
const ListShot: React.FC<MP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const items: any[] = (p.items || b.items || []).slice(0, 5).map((x: any) => typeof x === 'string' ? {text: x} : x);
  return <AbsoluteFill style={{padding: vertical ? '300px 70px 0' : '120px 240px 0'}}>
    {p.title && <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 84 : 88, color: t.fg, marginBottom: 40, textTransform: t.upper ? 'uppercase' : 'none'}}>{p.title}</div>}
    {items.map((it, i) => {
      const at = cueOf(b, it.cue || it.text.split(' ')[0], 8 + i * Math.max(10, (len - 20) / Math.max(1, items.length)));
      const s = spring({frame: f - at, fps: 30, config: {damping: 13, stiffness: 190}});
      return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 34, marginBottom: 34, opacity: s, transform: `translateX(${(1 - s) * -120}px)`}}>
        <div style={{fontFamily: ff('anton'), fontSize: 110, color: t.accent, width: 110, textAlign: 'center', lineHeight: 1}}>{i + 1}</div>
        <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 62 : 64, color: t.fg, lineHeight: 1.1, textTransform: t.upper ? 'uppercase' : 'none'}}>{it.text}</div>
      </div>;
    })}
  </AbsoluteFill>;
};

// ---------------------------------------------------------------- 17. FACT card
const FactShot: React.FC<MP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = prm(b);
  const e = spring({frame: f, fps: 30, config: {damping: 15, stiffness: 140}});
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
    <div style={{width: vertical ? 940 : 1400, padding: 60, borderRadius: Math.max(20, t.radius), background: alpha(t.fg, 0.06), border: `3px solid ${alpha(t.fg, 0.25)}`,
      transform: `perspective(1200px) rotateX(${(1 - e) * 30}deg) translateY(${(1 - e) * 80}px)`, opacity: e}}>
      <div style={{fontFamily: ff('spacemono'), fontSize: 36, color: t.accent, letterSpacing: 6}}>{p.tag || 'FACT'}</div>
      <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 78 : 80, color: t.fg, lineHeight: 1.1, marginTop: 20, textTransform: t.upper ? 'uppercase' : 'none'}}>{p.text || b.text}</div>
      {p.source && <div style={{fontFamily: ff(t.fontBody), fontSize: 30, color: t.muted, marginTop: 30, opacity: P(f, 20, 12)}}>— {p.source}</div>}
    </div>
  </AbsoluteFill>;
};

export const MOTION: Record<string, React.FC<MP>> = {
  slam: SlamShot, type: TypeShot, counter2: CounterShot, meter: MeterShot, vessel: VesselShot, heart: HeartShot, organ: OrganShot,
  membrane: MembraneShot, cells: CellsShot, battle: BattleShot, spread: SpreadShot, clock: ClockShot, journey: JourneyShot, zoom: ZoomShot,
  compare: CompareShot, list: ListShot, fact: FactShot,
};
