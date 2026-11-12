// PICTURE format (owner, Oct 31): a new full-screen picture every 3-5 s (ink sketch for life, simple flat 2D inside the body),
// a colour palette chosen per topic (never always navy), gentle pan (no zoom), a different transition each change, 6 rotating
// typography templates, number badges and time-stamp badges. Long = 1920x1080, Short = 1080x1920 (headline band = cover text).
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, spring, interpolate} from 'remotion';
import './theme';

// Persian (owner, Nov 2026): right-to-left, owner's fonts, Persian digits
const FA_DIG = '۰۱۲۳۴۵۶۷۸۹';
export const faNum = (x: string) => String(x).replace(/[0-9]/g, (d) => FA_DIG[+d]);
const enNum = (x: string) => String(x).replace(/[۰-۹]/g, (d) => String(FA_DIG.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
type Fonts = {head: string; strong: string; body: string; tall: string; play: string; up: (x: string) => string; ls: number};
const EN: Fonts = {head: 'F_anton', strong: 'F_anton', body: 'F_inter', tall: 'F_anton', play: 'F_anton', up: (x) => x.toUpperCase(), ls: 1};
// owner (Nov 12): more modern, viral fonts — SF Arabic Black / Diodrum Bold, Lalezar kept for variety
const FA: Fonts = {head: 'F_sfblack', strong: 'F_diodrum', body: 'F_sfbold', tall: 'F_lalezar', play: 'F_lalezar', up: (x) => faNum(x), ls: 0};

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const sp = (f: number, at: number, d = 12, s = 190) => spring({frame: f - at, fps: 30, config: {damping: d, stiffness: s}});

export type Palette = {bg: string; accent: string; accent2: string; text: string; card: string};
const DEFAULT: Palette = {bg: '#0B1220', accent: '#FFD23F', accent2: '#36E0D0', text: '#0B1220', card: 'rgba(11,18,32,0.88)'};

export type PicBeat = {start: number; end: number; img: string | null; style: string; words: string[]; accent?: number;
  stat?: {value: string; unit?: string} | null; stage?: string | null; tpl?: number};
export type PicProps = {beats: PicBeat[]; frames: number; vertical?: boolean; palette?: Palette; title?: string; rtl?: boolean; brand?: string};

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
const Words: React.FC<{b: PicBeat; f: number; W: number; H: number; pal: Palette; vertical?: boolean; rtl?: boolean}> = ({b, f, W, H, pal, vertical, rtl}) => {
  const F = rtl ? FA : EN;
  const ws = (b.words || []).slice(0, 4).map((w) => F.up(w));
  const dir = rtl ? 'rtl' as const : 'ltr' as const;
  const side = vertical ? 'center' : 'start';
  if (!ws.length) return null;
  const acc = b.accent != null && b.accent >= 0 && b.accent < ws.length ? b.accent : ws.length - 1;
  const len = ws.join(' ').length;
  const base = (vertical ? (len > 18 ? 76 : 92) : (len > 22 ? 84 : 104)) * (rtl ? 1.05 : 1);
  const at = b.start + 8;
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  const bottom = vertical ? H * 0.3 : H * 0.09;
  const tpl = (b.tpl ?? 0) % 6;
  const pop = (j: number) => Math.min(1, sp(f, at + j * 5));
  const shadow = '0 10px 30px rgba(0,0,0,0.35)';
  if (tpl === 0) {   // chips
    return <div style={{position: 'absolute', left: 90, right: 90, bottom, display: 'flex', flexWrap: 'wrap', gap: `8px ${base * 0.24}px`, opacity: out,
      justifyContent: vertical ? 'center' : 'flex-start', direction: dir}}>
      {ws.map((w, j) => <span key={j} style={{fontFamily: F.head, fontSize: base, lineHeight: rtl ? 1.35 : 1.05, padding: rtl ? '0 24px 4px' : '4px 22px 6px', borderRadius: 14,
        color: j === acc ? pal.text : '#fff', background: j === acc ? pal.accent : pal.card, boxShadow: shadow,
        opacity: f < at + j * 5 ? 0 : pop(j), transform: `translateY(${(1 - pop(j)) * 50}px) rotate(${j === acc ? -2 : 0}deg)`}}>{w}</span>)}
    </div>;
  }
  if (tpl === 1) {   // highlighter marker sweeping behind the key word
    return <div style={{position: 'absolute', left: 90, right: 90, bottom, opacity: out, textAlign: side, direction: dir,
      fontFamily: F.strong, fontSize: base * 1.05, lineHeight: rtl ? 1.45 : 1.15, color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.85), 0 0 2px #000'}}>
      {ws.map((w, j) => <span key={j} style={{position: 'relative', display: 'inline-block', [rtl ? 'marginLeft' : 'marginRight']: base * 0.28, opacity: f < at + j * 4 ? 0 : 1, isolation: 'isolate'}}>
        {j === acc && <span style={{position: 'absolute', left: -10, right: -10, top: '18%', bottom: '8%', background: pal.accent, borderRadius: 6,
          transformOrigin: rtl ? 'right' : 'left', transform: `scaleX(${interpolate(f, [at + j * 4, at + j * 4 + 10], [0, 1], cl)}) skewX(-8deg)`, zIndex: -1}} />}
        <span style={{position: 'relative', color: j === acc ? pal.text : '#fff', textShadow: j === acc ? 'none' : undefined}}>{w}</span>
      </span>)}
    </div>;
  }
  if (tpl === 2) {   // stacked lines with an accent bar
    return <div style={{position: 'absolute', [rtl ? 'right' : 'left']: vertical ? 70 : 90, bottom, opacity: out, direction: dir,
      [rtl ? 'borderRight' : 'borderLeft']: `14px solid ${pal.accent}`,
      background: pal.card, padding: rtl ? '12px 26px 16px 34px' : '16px 34px 16px 26px', borderRadius: rtl ? '16px 0 0 16px' : '0 16px 16px 0', boxShadow: shadow}}>
      {ws.map((w, j) => <div key={j} style={{fontFamily: j === acc ? F.head : F.strong, fontSize: j === acc ? base * 1.15 : base * 0.78, lineHeight: rtl ? 1.3 : 1.05,
        color: j === acc ? pal.accent : '#fff', opacity: f < at + j * 5 ? 0 : 1, transform: `translateX(${(1 - pop(j)) * (rtl ? 80 : -80)}px)`}}>{w}</div>)}
    </div>;
  }
  if (tpl === 3) {   // one clean line, growing underline under the key word
    return <div style={{position: 'absolute', left: 60, right: 60, bottom, opacity: out, textAlign: 'center', fontFamily: rtl ? F.strong : F.head,
      fontSize: base * (rtl ? 1.1 : 1), direction: dir, lineHeight: rtl ? 1.4 : 1.2, color: '#fff', textShadow: '0 4px 20px rgba(0,0,0,0.9)'}}>
      {ws.map((w, j) => <span key={j} style={{display: 'inline-block', margin: `0 ${base * 0.14}px`, position: 'relative',
        opacity: f < at + j * 4 ? 0 : 1, transform: `translateY(${(1 - pop(j)) * 30}px)`, color: j === acc ? pal.accent : '#fff'}}>{w}
        {j === acc && <span style={{position: 'absolute', left: 0, bottom: -6, height: 10, borderRadius: 5, background: pal.accent2,
          width: `${interpolate(f, [at + 12, at + 24], [0, 100], cl)}%`}} />}</span>)}
    </div>;
  }
  if (tpl === 4 && rtl) {   // Persian: words drop in one by one on a card (letter-by-letter would break the joined script)
    return <div style={{position: 'absolute', left: vertical ? 60 : undefined, right: vertical ? 60 : 90, bottom, opacity: out, background: pal.card,
      padding: '6px 30px 12px', borderRadius: 12, fontFamily: F.play, fontSize: base * 0.95, color: '#fff', boxShadow: shadow, direction: dir,
      textAlign: side, borderBottom: `6px solid ${pal.accent2}`}}>
      {ws.map((w, j) => <span key={j} style={{display: 'inline-block', marginLeft: base * 0.25, color: j === acc ? pal.accent : '#fff',
        opacity: f < at + j * 6 ? 0 : 1, transform: `translateY(${(1 - Math.min(1, sp(f, at + j * 6, 11, 260))) * -40}px)`}}>{w}</span>)}
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
  return <div style={{position: 'absolute', left: 90, right: 90, bottom, opacity: out, textAlign: side, direction: dir}}>
    {rest && <div style={{display: 'inline-block', fontFamily: rtl ? F.strong : 'F_inter', fontWeight: 900, fontSize: base * (rtl ? 0.5 : 0.42), letterSpacing: rtl ? 0 : 4, color: pal.text,
      background: pal.accent, padding: '6px 16px', borderRadius: 6, opacity: f < at ? 0 : 1}}>{rest}</div>}
    <div style={{fontFamily: rtl ? F.head : 'F_anton', fontSize: base * (rtl ? 1.6 : 1.7), lineHeight: rtl ? 1.35 : 1, color: '#fff', textShadow: '0 6px 26px rgba(0,0,0,0.9)',
      transform: `scale(${0.6 + 0.4 * Math.min(1.08, p)})`, transformOrigin: vertical ? 'center' : (rtl ? 'right bottom' : 'left bottom'), opacity: f < at + 6 ? 0 : 1}}>{ws[acc]}</div>
  </div>;
};

const Stat: React.FC<{b: PicBeat; f: number; pal: Palette; vertical?: boolean; rtl?: boolean}> = ({b, f, pal, vertical, rtl}) => {
  if (!b.stat || !b.stat.value) return null;
  const at = b.start + 14; const p = sp(f, at, 10, 200);
  const raw = enNum(String(b.stat.value));
  const n = parseFloat(raw.replace(/[^\d.]/g, ''));
  const shown0 = isNaN(n) || raw.includes('-') ? raw : raw.replace(String(n), String(Math.round(n * interpolate(f, [at, at + 24], [0, 1], cl))));
  const shown = rtl ? faNum(shown0) : shown0;
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  const size = vertical ? 260 : 300;
  if (rtl) {
    const ring = interpolate(f, [at, at + 28], [0, 360], {...cl, easing: (x) => 1 - Math.pow(1 - x, 3)});
    const pulse = 1 + 0.03 * Math.sin((f - at) / 6);
    const S = size * 1.05;
    return <div style={{position: 'absolute', left: vertical ? 60 : 80, top: vertical ? 760 : 80, width: S, height: S, opacity: f < at ? 0 : out,
      transform: `scale(${Math.min(1.06, p) * pulse}) rotate(${(1 - Math.min(1, p)) * 25}deg)`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${pal.accent} ${ring}deg, rgba(255,255,255,0.12) ${ring}deg)`,
        boxShadow: `0 0 40px ${pal.accent}88, 0 18px 40px rgba(0,0,0,0.5)`}} />
      <div style={{position: 'absolute', inset: 16, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${pal.card.replace('0.88', '0.98')}, #000000ee)`,
        border: `3px solid ${pal.accent2}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{fontFamily: 'F_sfblack', fontSize: shown.length > 4 ? S * 0.26 : S * 0.36, lineHeight: 1.2, color: '#fff',
          textShadow: `0 0 18px ${pal.accent}, 0 4px 0 #000`}}>{shown}</div>
        {b.stat.unit && <div style={{fontFamily: 'F_diodrum', fontSize: S * 0.12, color: pal.accent, direction: 'rtl', marginTop: -4,
          textShadow: '0 2px 6px #000'}}>{faNum(String(b.stat.unit)).slice(0, 14)}</div>}
      </div>
    </div>;
  }
  return <div style={{position: 'absolute', [rtl ? 'left' : 'right']: vertical ? 60 : 90, top: vertical ? 400 : 90, width: size, height: size, borderRadius: size / 2,
    background: pal.accent, opacity: f < at ? 0 : out, transform: `scale(${Math.min(1.08, p)}) rotate(${(1 - Math.min(1, p)) * -20}deg)`,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 0 0 12px ${pal.accent}55, 0 20px 40px rgba(0,0,0,0.4)`}}>
    <div style={{fontFamily: rtl ? 'F_lalezar' : 'F_anton', fontSize: shown.length > 4 ? 90 : 130, lineHeight: rtl ? 1.25 : 1, color: pal.text}}>{shown}</div>
    {b.stat.unit && <div style={{fontFamily: rtl ? 'F_titr' : 'F_anton', fontSize: rtl ? 38 : 40, color: pal.text, letterSpacing: rtl ? 0 : 2, direction: rtl ? 'rtl' : 'ltr'}}>
      {rtl ? faNum(String(b.stat.unit)).slice(0, 14) : String(b.stat.unit).toUpperCase().slice(0, 10)}</div>}
  </div>;
};

// time stamp: big slam in the centre when a new stage starts, then it docks top-left
const Clock: React.FC<{c: string; s: number; f: number}> = ({c, s, f}) => <svg width={s} height={s} viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth="2.4" />
  <line x1="12" y1="12" x2="12" y2="6.5" stroke={c} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${f * 6} 12 12)`} />
  <line x1="12" y1="12" x2="16" y2="12" stroke={c} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${f * 0.5} 12 12)`} />
</svg>;

const StageFA: React.FC<{text: string; at: number; f: number; W: number; H: number; pal: Palette; top: number}> = ({text, at, f, W, H, pal, top}) => {
  const p = interpolate(f - at, [0, 30, 42], [0, 0, 1], cl);
  const big = 1 - p, s = sp(f, at, 9, 220);
  const sweep = interpolate(f - at, [6, 20], [0, 100], cl);
  const t = faNum(text);
  return <>
    {big > 0.01 && <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, rgba(0,0,0,${0.35 * big}), rgba(0,0,0,${0.75 * big}))`}} />}
    {big > 0.01 && <div style={{position: 'absolute', left: 0, right: 0, top: H / 2 - (W < 1200 ? 150 : 170), textAlign: 'center', direction: 'rtl', opacity: big,
      transform: `scale(${Math.min(1.08, s)})`}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 22, fontFamily: 'F_sfblack', fontSize: W < 1200 ? 140 : 185, lineHeight: 1.3, color: '#fff',
        textShadow: `0 0 30px ${pal.accent}aa, 0 6px 0 #000`}}>
        <Clock c={pal.accent} s={W < 1200 ? 110 : 140} f={f - at} />{t}</div>
      <div style={{margin: '0 auto', height: 10, borderRadius: 5, width: `${sweep * (W < 1200 ? 6 : 8)}px`,
        background: `linear-gradient(90deg, ${pal.accent2}, ${pal.accent})`, boxShadow: `0 0 20px ${pal.accent}`}} />
    </div>}
    {p > 0 && <div style={{position: 'absolute', right: 60, top, opacity: p, transform: `translateX(${(1 - p) * 60}px)`, direction: 'rtl',
      display: 'flex', alignItems: 'center', gap: 14, padding: '6px 26px 10px 22px', borderRadius: 40,
      background: 'rgba(10,12,20,0.62)', backdropFilter: 'blur(10px)', border: `2px solid ${pal.accent}88`, borderRight: `10px solid ${pal.accent}`,
      boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 18px ${pal.accent}44`}}>
      <Clock c={pal.accent} s={46} f={f - at} />
      <span style={{fontFamily: 'F_sfblack', fontSize: 48, lineHeight: 1.4, color: '#fff'}}>{t}</span>
    </div>}
  </>;
};

const Stage: React.FC<{text: string; at: number; f: number; W: number; H: number; pal: Palette; top: number; rtl?: boolean}> = ({text, at, f, W, H, pal, top, rtl}) => {
  if (rtl) return <StageFA text={text} at={at} f={f} W={W} H={H} pal={pal} top={top} />;
  const p = interpolate(f - at, [0, 26, 40], [0, 0, 1], cl);
  const s = sp(f, at, 9, 220);
  const big = 1 - p;
  const x = interpolate(p, [0, 1], [W / 2, rtl ? W - 70 : 70]), y = interpolate(p, [0, 1], [H / 2, top]);
  const tx = rtl ? -50 * big - 100 * (1 - big) : -50 * big;
  const size = interpolate(p, [0, 1], [W < 1200 ? 170 : 230, 60]);
  return <>
    {big > 0.01 && <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.5 * big})`}} />}
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${tx}%, ${-50 * big}%) scale(${p > 0 ? 1 : Math.min(1.1, s)})`,
      transformOrigin: rtl ? 'right top' : 'left top', direction: rtl ? 'rtl' : 'ltr',
      fontFamily: rtl ? 'F_lalezar' : 'F_anton', fontSize: size, lineHeight: rtl ? 1.3 : 1, color: pal.text, background: pal.accent, padding: `${8 + 10 * big}px ${24 + 20 * big}px`,
      borderRadius: 18, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'}}>{rtl ? faNum(text) : text}</div>
  </>;
};

// Shorts: headline band always on top (so any frame YouTube picks as the cover tells the topic) + a big title slam in the first 1.3 s
const Headline: React.FC<{text: string; f: number; pal: Palette; rtl?: boolean}> = ({text, f, pal, rtl}) => {
  const clean = text.replace(/#\S+/g, '').trim();
  const ws = (rtl ? faNum(clean) : clean.toUpperCase()).split(/\s+/).filter(Boolean);
  const hf = rtl ? 'F_sfblack' : 'F_anton', dir = rtl ? 'rtl' as const : 'ltr' as const;
  const intro = interpolate(f, [30, 40], [1, 0], cl);
  const size = ws.join(' ').length > 26 ? 78 : 92;
  const last = ws.length - 1;
  const band = <div style={{position: 'absolute', left: 60, right: 140, top: 290, padding: '18px 24px', borderRadius: 26, background: pal.card,
    border: `5px solid ${pal.accent}`, textAlign: 'center', fontFamily: hf, fontSize: size, lineHeight: rtl ? 1.4 : 1.08, color: '#fff', direction: dir}}>
    {ws.map((w, j) => <span key={j} style={{color: j === last ? pal.accent : '#fff'}}>{w}{j < last ? ' ' : ''}</span>)}
  </div>;
  return <>
    {band}
    {intro > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.6 * intro})`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 60, opacity: intro}}>
      <div style={{fontFamily: hf, fontSize: rtl ? 140 : 150, lineHeight: rtl ? 1.35 : 1.02, textAlign: 'center', color: '#fff', direction: dir,
        transform: `scale(${interpolate(f, [0, 10], [1.15, 1], cl)})`, textShadow: '0 8px 30px rgba(0,0,0,0.8)'}}>
        {ws.map((w, j) => <span key={j} style={{color: j === last ? pal.accent : '#fff'}}>{w}{j < last ? ' ' : ''}</span>)}
      </div>
    </div>}
  </>;
};

export const PicEpisode: React.FC<PicProps> = ({beats, vertical, palette, title, rtl, brand}) => {
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
    {b.stage && !(vertical && title && f < 40) && <Stage key={'s' + b.stage} text={b.stage} at={stAt} f={f} W={W} H={H} pal={pal} top={vertical ? 640 : 70} rtl={rtl} />}
    {!(vertical && title && f < 40) && <>     {/* Shorts: nothing competes with the title slam in the first 1.3 s (= the cover) */}
      <Stat key={'n' + i} b={b} f={f} pal={pal} vertical={vertical} rtl={rtl} />
      <Words key={'w' + i} b={b} f={f} W={W} H={H} pal={pal} vertical={vertical} rtl={rtl} />
    </>}
    {vertical && title && <Headline text={title} f={f} pal={pal} rtl={rtl} />}
    {!vertical && !rtl && <div style={{position: 'absolute', right: 40, bottom: 30, fontFamily: 'F_inter', fontWeight: 800, fontSize: 20, letterSpacing: 6,
      color: 'rgba(255,255,255,0.55)'}}>INSIDE YOUR BODY</div>}
    {!vertical && rtl && <div style={{position: 'absolute', left: 40, bottom: 22, fontFamily: 'F_lalezar', fontSize: 30,
      color: 'rgba(255,255,255,0.6)', direction: 'rtl'}}>{brand || 'درون بدن'}</div>}
  </AbsoluteFill>;
};
export const picMeta = ({props}: {props: PicProps}) => ({durationInFrames: Math.max(30, props.frames || 300)});
