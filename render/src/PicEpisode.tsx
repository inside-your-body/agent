// PICTURE format (owner, Oct 31): a new full-screen picture every 3-5 s (ink sketch for life, simple flat 2D inside the body),
// a colour palette chosen per topic (never always navy), gentle pan (no zoom), a different transition each change, 6 rotating
// typography templates, number badges and time-stamp badges. Long = 1920x1080, Short = 1080x1920 (headline band = cover text).
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, spring, interpolate} from 'remotion';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const sp = (f: number, at: number, d = 12, s = 190) => spring({frame: f - at, fps: 30, config: {damping: d, stiffness: s}});

export type Palette = {bg: string; accent: string; accent2: string; text: string; card: string};
const DEFAULT: Palette = {bg: '#0B1220', accent: '#FFD23F', accent2: '#36E0D0', text: '#0B1220', card: 'rgba(11,18,32,0.88)'};

export type PicBeat = {start: number; end: number; img: string | null; style: string; words: string[]; accent?: number;
  stat?: {value: string; unit?: string} | null; stage?: string | null; tpl?: number};
export type PicProps = {beats: PicBeat[]; frames: number; vertical?: boolean; palette?: Palette; title?: string};

const Picture: React.FC<{b: PicBeat; i: number; f: number; pal: Palette}> = ({b, i, f, pal}) => {
  const t = (f - b.start) / Math.max(1, b.end - b.start);
  const dir = i % 2 ? 1 : -1;
  const pan = interpolate(t, [0, 1], [0, dir * 2.2], cl);            // slow sideways drift, no zoom
  const k = interpolate(f - b.start, [0, 9], [0, 1], {...cl, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const kind = (i * 7) % 5;   // 0 slide, 1 wipe, 2 circle reveal, 3 flash, 4 vertical blinds
  const style: React.CSSProperties = {position: 'absolute', inset: 0};
  if (kind === 0) Object.assign(style, {transform: `translateX(${(1 - k) * dir * 18}%)`, filter: `blur(${(1 - k) * 12}px)`});
  if (kind === 1) Object.assign(style, {clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`});
  if (kind === 2) Object.assign(style, {clipPath: `circle(${k * 80}% at 50% 50%)`});
  if (kind === 4) Object.assign(style, {clipPath: `inset(${(1 - k) * 50}% 0 ${(1 - k) * 50}% 0)`});
  return <div style={style}>
    {b.img ? <Img src={staticFile(b.img)} style={{position: 'absolute', left: '-4%', top: '-4%', width: '108%', height: '108%', objectFit: 'cover',
      transform: `translateX(${pan}%)`}} /> : <div style={{position: 'absolute', inset: 0, background: pal.bg}} />}
    {kind === 3 && <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: interpolate(f - b.start, [0, 8], [0.85, 0], cl)}} />}
  </div>;
};

// ---- 6 typography templates (rotated so the same look never comes twice in a row) ----
const Words: React.FC<{b: PicBeat; f: number; W: number; H: number; pal: Palette; vertical?: boolean}> = ({b, f, W, H, pal, vertical}) => {
  const ws = (b.words || []).slice(0, 4).map((w) => w.toUpperCase());
  if (!ws.length) return null;
  const acc = b.accent != null && b.accent >= 0 && b.accent < ws.length ? b.accent : ws.length - 1;
  const len = ws.join(' ').length;
  const base = vertical ? (len > 18 ? 76 : 92) : (len > 22 ? 84 : 104);
  const at = b.start + 8;
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  const bottom = vertical ? H * 0.2 : H * 0.09;
  const tpl = (b.tpl ?? 0) % 6;
  const pop = (j: number) => Math.min(1, sp(f, at + j * 5));
  const shadow = '0 10px 30px rgba(0,0,0,0.35)';
  if (tpl === 0) {   // chips
    return <div style={{position: 'absolute', left: 90, right: 90, bottom, display: 'flex', flexWrap: 'wrap', gap: `8px ${base * 0.24}px`, opacity: out,
      justifyContent: vertical ? 'center' : 'flex-start'}}>
      {ws.map((w, j) => <span key={j} style={{fontFamily: 'F_anton', fontSize: base, lineHeight: 1.05, padding: '4px 22px 6px', borderRadius: 14,
        color: j === acc ? pal.text : '#fff', background: j === acc ? pal.accent : pal.card, boxShadow: shadow,
        opacity: f < at + j * 5 ? 0 : pop(j), transform: `translateY(${(1 - pop(j)) * 50}px) rotate(${j === acc ? -2 : 0}deg)`}}>{w}</span>)}
    </div>;
  }
  if (tpl === 1) {   // highlighter marker sweeping behind the key word
    return <div style={{position: 'absolute', left: 90, right: 90, bottom, opacity: out, textAlign: vertical ? 'center' : 'left',
      fontFamily: 'F_anton', fontSize: base * 1.05, lineHeight: 1.15, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.85), 0 0 2px #000'}}>
      {ws.map((w, j) => <span key={j} style={{position: 'relative', display: 'inline-block', marginRight: base * 0.28, opacity: f < at + j * 4 ? 0 : 1, isolation: 'isolate'}}>
        {j === acc && <span style={{position: 'absolute', left: -10, right: -10, top: '18%', bottom: '8%', background: pal.accent, borderRadius: 6,
          transformOrigin: 'left', transform: `scaleX(${interpolate(f, [at + j * 4, at + j * 4 + 10], [0, 1], cl)}) skewX(-8deg)`, zIndex: -1}} />}
        <span style={{position: 'relative', color: j === acc ? pal.text : '#fff', textShadow: j === acc ? 'none' : undefined}}>{w}</span>
      </span>)}
    </div>;
  }
  if (tpl === 2) {   // stacked lines with an accent bar
    return <div style={{position: 'absolute', left: vertical ? 70 : 90, bottom, opacity: out, borderLeft: `14px solid ${pal.accent}`, paddingLeft: 26,
      background: pal.card, padding: '16px 34px 16px 26px', borderRadius: '0 16px 16px 0', boxShadow: shadow}}>
      {ws.map((w, j) => <div key={j} style={{fontFamily: 'F_anton', fontSize: j === acc ? base * 1.15 : base * 0.78, lineHeight: 1.05,
        color: j === acc ? pal.accent : '#fff', opacity: f < at + j * 5 ? 0 : 1, transform: `translateX(${(1 - pop(j)) * -80}px)`}}>{w}</div>)}
    </div>;
  }
  if (tpl === 3) {   // one clean line, growing underline under the key word
    return <div style={{position: 'absolute', left: 60, right: 60, bottom, opacity: out, textAlign: 'center', fontFamily: 'F_anton', fontSize: base,
      lineHeight: 1.2, color: '#fff', textShadow: '0 4px 20px rgba(0,0,0,0.9)'}}>
      {ws.map((w, j) => <span key={j} style={{display: 'inline-block', margin: `0 ${base * 0.14}px`, position: 'relative',
        opacity: f < at + j * 4 ? 0 : 1, transform: `translateY(${(1 - pop(j)) * 30}px)`, color: j === acc ? pal.accent : '#fff'}}>{w}
        {j === acc && <span style={{position: 'absolute', left: 0, bottom: -6, height: 10, borderRadius: 5, background: pal.accent2,
          width: `${interpolate(f, [at + 12, at + 24], [0, 100], cl)}%`}} />}</span>)}
    </div>;
  }
  if (tpl === 4) {   // typewriter card with a blinking cursor
    const full = ws.join(' '); const n = Math.floor(interpolate(f, [at, at + full.length * 1.4], [0, full.length], cl));
    const accStart = ws.slice(0, acc).join(' ').length + (acc ? 1 : 0); const accEnd = accStart + ws[acc].length;
    return <div style={{position: 'absolute', left: vertical ? 60 : 90, right: vertical ? 60 : undefined, bottom, opacity: out, background: pal.card,
      padding: '14px 30px', borderRadius: 12, fontFamily: 'F_anton', fontSize: base * 0.92, color: '#fff', boxShadow: shadow, letterSpacing: 1}}>
      {full.slice(0, n).split('').map((c, j) => <span key={j} style={{color: j >= accStart && j < accEnd ? pal.accent : '#fff'}}>{c}</span>)}
      <span style={{opacity: Math.floor(f / 8) % 2 ? 1 : 0, color: pal.accent}}>|</span>
    </div>;
  }
  // tpl 5: slam — the key word huge, the rest as a small kicker above it
  const rest = ws.filter((_, j) => j !== acc).join(' ');
  const p = sp(f, at + 6, 9, 230);
  return <div style={{position: 'absolute', left: 90, right: 90, bottom, opacity: out, textAlign: vertical ? 'center' : 'left'}}>
    {rest && <div style={{display: 'inline-block', fontFamily: 'F_inter', fontWeight: 900, fontSize: base * 0.42, letterSpacing: 4, color: pal.text,
      background: pal.accent, padding: '6px 16px', borderRadius: 6, opacity: f < at ? 0 : 1}}>{rest}</div>}
    <div style={{fontFamily: 'F_anton', fontSize: base * 1.7, lineHeight: 1, color: '#fff', textShadow: '0 6px 26px rgba(0,0,0,0.9)',
      transform: `scale(${0.6 + 0.4 * Math.min(1.08, p)})`, transformOrigin: vertical ? 'center' : 'left bottom', opacity: f < at + 6 ? 0 : 1}}>{ws[acc]}</div>
  </div>;
};

const Stat: React.FC<{b: PicBeat; f: number; pal: Palette; vertical?: boolean}> = ({b, f, pal, vertical}) => {
  if (!b.stat || !b.stat.value) return null;
  const at = b.start + 14; const p = sp(f, at, 10, 200);
  const raw = String(b.stat.value);
  const n = parseFloat(raw.replace(/[^\d.]/g, ''));
  const shown = isNaN(n) || raw.includes('-') ? raw : raw.replace(String(n), String(Math.round(n * interpolate(f, [at, at + 24], [0, 1], cl))));
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  const size = vertical ? 260 : 300;
  return <div style={{position: 'absolute', right: vertical ? 60 : 90, top: vertical ? 400 : 90, width: size, height: size, borderRadius: size / 2,
    background: pal.accent, opacity: f < at ? 0 : out, transform: `scale(${Math.min(1.08, p)}) rotate(${(1 - Math.min(1, p)) * -20}deg)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 0 0 12px ${pal.accent}55, 0 20px 40px rgba(0,0,0,0.4)`}}>
    <div style={{fontFamily: 'F_anton', fontSize: shown.length > 4 ? 90 : 130, lineHeight: 1, color: pal.text}}>{shown}</div>
    {b.stat.unit && <div style={{fontFamily: 'F_anton', fontSize: 40, color: pal.text, letterSpacing: 2}}>{String(b.stat.unit).toUpperCase().slice(0, 10)}</div>}
  </div>;
};

// time stamp: big slam in the centre when a new stage starts, then it docks top-left
const Stage: React.FC<{text: string; at: number; f: number; W: number; H: number; pal: Palette; top: number}> = ({text, at, f, W, H, pal, top}) => {
  const p = interpolate(f - at, [0, 26, 40], [0, 0, 1], cl);
  const s = sp(f, at, 9, 220);
  const big = 1 - p;
  const x = interpolate(p, [0, 1], [W / 2, 70]), y = interpolate(p, [0, 1], [H / 2, top]);
  const size = interpolate(p, [0, 1], [W < 1200 ? 170 : 230, 60]);
  return <>
    {big > 0.01 && <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.5 * big})`}} />}
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${-50 * big}%, ${-50 * big}%) scale(${p > 0 ? 1 : Math.min(1.1, s)})`,
      fontFamily: 'F_anton', fontSize: size, lineHeight: 1, color: pal.text, background: pal.accent, padding: `${8 + 10 * big}px ${24 + 20 * big}px`,
      borderRadius: 18, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'}}>{text}</div>
  </>;
};

// Shorts: headline band always on top (so any frame YouTube picks as the cover tells the topic) + a big title slam in the first 1.3 s
const Headline: React.FC<{text: string; f: number; pal: Palette}> = ({text, f, pal}) => {
  const ws = text.replace(/#\w+/g, '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const intro = interpolate(f, [30, 40], [1, 0], cl);
  const size = ws.join(' ').length > 26 ? 78 : 92;
  const last = ws.length - 1;
  const band = <div style={{position: 'absolute', left: 30, right: 30, top: 70, padding: '18px 24px', borderRadius: 26, background: pal.card,
    border: `5px solid ${pal.accent}`, textAlign: 'center', fontFamily: 'F_anton', fontSize: size, lineHeight: 1.08, color: '#fff'}}>
    {ws.map((w, j) => <span key={j} style={{color: j === last ? pal.accent : '#fff'}}>{w}{j < last ? ' ' : ''}</span>)}
  </div>;
  return <>
    {band}
    {intro > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.6 * intro})`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 60, opacity: intro}}>
      <div style={{fontFamily: 'F_anton', fontSize: 150, lineHeight: 1.02, textAlign: 'center', color: '#fff',
        transform: `scale(${interpolate(f, [0, 10], [1.15, 1], cl)})`, textShadow: '0 8px 30px rgba(0,0,0,0.8)'}}>
        {ws.map((w, j) => <span key={j} style={{color: j === last ? pal.accent : '#fff'}}>{w}{j < last ? ' ' : ''}</span>)}
      </div>
    </div>}
  </>;
};

export const PicEpisode: React.FC<PicProps> = ({beats, vertical, palette, title}) => {
  const f = useCurrentFrame();
  const pal = {...DEFAULT, ...(palette || {})};
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  let i = beats.findIndex((b) => f >= b.start && f < b.end); if (i < 0) i = beats.length - 1;
  const b = beats[i]; if (!b) return <AbsoluteFill style={{background: pal.bg}} />;
  let stAt = b.start; for (let j = i; j > 0 && beats[j - 1].stage === b.stage; j--) stAt = beats[j - 1].start;
  const prev = i > 0 ? beats[i - 1] : null;
  return <AbsoluteFill style={{background: pal.bg, overflow: 'hidden'}}>
    {prev && f - b.start < 10 && <Picture b={prev} i={i - 1} f={Math.min(f, prev.end - 1)} pal={pal} />}
    <Picture key={i} b={b} i={i} f={f} pal={pal} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.4, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))'}} />
    {b.stage && <Stage key={'s' + b.stage} text={b.stage} at={stAt} f={f} W={W} H={H} pal={pal} top={vertical ? 330 : 70} />}
    {!(vertical && title && f < 40) && <>     {/* Shorts: nothing competes with the title slam in the first 1.3 s (= the cover) */}
      <Stat key={'n' + i} b={b} f={f} pal={pal} vertical={vertical} />
      <Words key={'w' + i} b={b} f={f} W={W} H={H} pal={pal} vertical={vertical} />
    </>}
    {vertical && title && <Headline text={title} f={f} pal={pal} />}
    {!vertical && <div style={{position: 'absolute', right: 40, bottom: 30, fontFamily: 'F_inter', fontWeight: 800, fontSize: 20, letterSpacing: 6,
      color: 'rgba(255,255,255,0.55)'}}>INSIDE YOUR BODY</div>}
  </AbsoluteFill>;
};
export const picMeta = ({props}: {props: PicProps}) => ({durationInFrames: Math.max(30, props.frames || 300)});
