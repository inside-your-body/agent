// PICTURE format (owner, Oct 31): a new full-screen picture every 3-5 s (ink sketch for life, flat 2D inside the body),
// gentle pan (no zoom), a different transition each change, kinetic typography, number badges and time-stamp badges.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, spring, interpolate} from 'remotion';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const sp = (f: number, at: number, d = 12, s = 190) => spring({frame: f - at, fps: 30, config: {damping: d, stiffness: s}});
const GOLD = '#FFD23F', RED = '#E63946';

export type PicBeat = {start: number; end: number; img: string | null; style: string; words: string[]; accent?: number;
  stat?: {value: string; unit?: string} | null; stage?: string | null};
export type PicProps = {beats: PicBeat[]; frames: number; vertical?: boolean};

const Picture: React.FC<{b: PicBeat; i: number; f: number; W: number; H: number}> = ({b, i, f, W, H}) => {
  const t = (f - b.start) / Math.max(1, b.end - b.start);
  const dir = i % 2 ? 1 : -1;
  const pan = interpolate(t, [0, 1], [0, dir * 2.2], cl);            // slow sideways drift, no zoom
  const k = interpolate(f - b.start, [0, 9], [0, 1], {...cl, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const kind = i % 4;   // 0 slide, 1 wipe, 2 circle reveal, 3 flash
  const style: React.CSSProperties = {position: 'absolute', inset: 0};
  if (kind === 0) Object.assign(style, {transform: `translateX(${(1 - k) * dir * 18}%)`, filter: `blur(${(1 - k) * 12}px)`});
  if (kind === 1) Object.assign(style, {clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`});
  if (kind === 2) Object.assign(style, {clipPath: `circle(${k * 80}% at 50% 50%)`});
  return <div style={style}>
    {b.img ? <Img src={staticFile(b.img)} style={{position: 'absolute', left: '-4%', top: '-4%', width: '108%', height: '108%', objectFit: 'cover',
      transform: `translateX(${pan}%)`}} /> : <div style={{position: 'absolute', inset: 0, background: '#0B1220'}} />}
    {kind === 3 && <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: interpolate(f - b.start, [0, 8], [0.85, 0], cl)}} />}
  </div>;
};

const KineticWords: React.FC<{b: PicBeat; f: number; W: number; H: number}> = ({b, f, W, H}) => {
  const ws = (b.words || []).slice(0, 4).map((w) => w.toUpperCase());
  const acc = b.accent != null && b.accent >= 0 ? b.accent : ws.length - 1;
  const size = ws.join(' ').length > 22 ? 84 : 104;
  const at = b.start + 8;
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  return <div style={{position: 'absolute', left: 90, right: 90, bottom: H * 0.09, display: 'flex', flexWrap: 'wrap', gap: `6px ${size * 0.26}px`,
    alignItems: 'flex-end', opacity: out}}>
    {ws.map((w, j) => {
      const p = sp(f, at + j * 5);
      return <span key={j} style={{fontFamily: 'F_anton', fontSize: size, lineHeight: 1.05, color: j === acc ? '#0B1220' : '#FFFFFF',
        background: j === acc ? GOLD : 'rgba(11,18,32,0.88)', padding: '4px 22px 6px', borderRadius: 14,
        transform: `translateY(${(1 - Math.min(1, p)) * 50}px) scale(${0.7 + 0.3 * Math.min(1.05, p)}) rotate(${j === acc ? -2 : 0}deg)`,
        opacity: f < at + j * 5 ? 0 : Math.min(1, p * 1.5), boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}}>{w}</span>;
    })}
  </div>;
};

const Stat: React.FC<{b: PicBeat; f: number; W: number}> = ({b, f, W}) => {
  if (!b.stat || !b.stat.value) return null;
  const at = b.start + 14; const p = sp(f, at, 10, 200);
  const n = parseFloat(String(b.stat.value).replace(/[^\d.]/g, ''));
  const shown = isNaN(n) ? b.stat.value : String(b.stat.value).replace(String(n), String(Math.round(n * interpolate(f, [at, at + 24], [0, 1], cl))));
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  return <div style={{position: 'absolute', right: 90, top: 90, width: 300, height: 300, borderRadius: 150, background: GOLD, opacity: f < at ? 0 : out,
    transform: `scale(${Math.min(1.08, p)}) rotate(${(1 - Math.min(1, p)) * -20}deg)`, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', boxShadow: '0 0 0 12px rgba(255,210,63,0.35), 0 20px 40px rgba(0,0,0,0.4)'}}>
    <div style={{fontFamily: 'F_anton', fontSize: 130, lineHeight: 1, color: '#0B1220'}}>{shown}</div>
    {b.stat.unit && <div style={{fontFamily: 'F_anton', fontSize: 44, color: '#0B1220', letterSpacing: 2}}>{b.stat.unit.toUpperCase()}</div>}
  </div>;
};

// time stamp: big slam in the centre when a new stage starts, then it docks top-left
const Stage: React.FC<{text: string; at: number; f: number; W: number; H: number}> = ({text, at, f, W, H}) => {
  const p = interpolate(f - at, [0, 26, 40], [0, 0, 1], cl);
  const s = sp(f, at, 9, 220);
  const big = 1 - p;
  const x = interpolate(p, [0, 1], [W / 2, 90]), y = interpolate(p, [0, 1], [H / 2, 90]);
  const size = interpolate(p, [0, 1], [230, 64]);
  return <>
    {big > 0.01 && <div style={{position: 'absolute', inset: 0, background: `rgba(11,18,32,${0.55 * big})`}} />}
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${-50 * big}%, ${-50 * big}%) scale(${p > 0 ? 1 : Math.min(1.1, s)})`,
      fontFamily: 'F_anton', fontSize: size, lineHeight: 1, color: '#0B1220', background: GOLD, padding: `${8 + 10 * big}px ${24 + 20 * big}px`,
      borderRadius: 18, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'}}>{text}</div>
  </>;
};

export const PicEpisode: React.FC<PicProps> = ({beats, vertical}) => {
  const f = useCurrentFrame();
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  let i = beats.findIndex((b) => f >= b.start && f < b.end); if (i < 0) i = beats.length - 1;
  const b = beats[i]; if (!b) return <AbsoluteFill style={{background: '#0B1220'}} />;
  let stAt = b.start; for (let j = i; j > 0 && beats[j - 1].stage === b.stage; j--) stAt = beats[j - 1].start;
  const prev = i > 0 ? beats[i - 1] : null;
  return <AbsoluteFill style={{background: '#0B1220', overflow: 'hidden'}}>
    {prev && f - b.start < 10 && <Picture b={prev} i={i - 1} f={Math.min(f, prev.end - 1)} W={W} H={H} />}
    <Picture key={i} b={b} i={i} f={f} W={W} H={H} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.38, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))'}} />
    {b.stage && <Stage key={'s' + b.stage} text={b.stage} at={stAt} f={f} W={W} H={H} />}
    <Stat key={'n' + i} b={b} f={f} W={W} />
    <KineticWords key={'w' + i} b={b} f={f} W={W} H={H} />
    <div style={{position: 'absolute', right: 40, bottom: 30, fontFamily: 'F_inter', fontWeight: 800, fontSize: 20, letterSpacing: 6,
      color: 'rgba(255,255,255,0.55)'}}>INSIDE YOUR BODY</div>
  </AbsoluteFill>;
};
export const picMeta = ({props}: {props: PicProps}) => ({durationInFrames: Math.max(30, props.frames || 300)});
