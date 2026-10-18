import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';
import {Beat, Theme, ff, alpha} from './theme';
import {Icon, pickIcon} from './Icons';
import {Stickman, BodyMap, STICK_POSES} from './Figures';
import {MOTION, Particle} from './Motion';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type BP = {b: Beat; t: Theme; len: number; vertical: boolean};

const useEnter = (t: Theme, delay = 0) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - delay, fps, config: {damping: t.spring[0], stiffness: t.spring[1], mass: 0.7}});
};

// split text into words; words written in CAPS (or wrapped in *stars*) become accent words
const tokens = (text: string) => (text || '').split(/\s+/).filter(Boolean).map((w) => {
  const star = /^\*.*\*$/.test(w);
  const clean = w.replace(/\*/g, '');
  const caps = clean.length > 2 && clean === clean.toUpperCase() && /[A-Z]/.test(clean);
  return {w: clean, key: star || caps};
});

export const Headline: React.FC<{text: string; t: Theme; size: number; align?: 'center' | 'left'; delay?: number; maxWidth?: number; color?: string}> =
  ({text, t, size, align = 'center', delay = 0, maxWidth = 1500, color}) => {
    const f = useCurrentFrame();
    const {fps} = useVideoConfig();
    const ws = tokens(text);
    return (
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.28}px`, maxWidth}}>
        {ws.map((w, i) => {
          const s = spring({frame: f - delay - i * 3, fps, config: {damping: t.spring[0], stiffness: t.spring[1], mass: 0.6}});
          return (
            <span key={i} style={{display: 'inline-block', fontFamily: ff(t.fontHead), fontSize: size, lineHeight: 1.08, fontWeight: 900,
              textTransform: t.upper ? 'uppercase' : 'none', color: w.key ? t.accent : (color || t.fg), opacity: s,
              transform: `translateY(${(1 - s) * size * 0.45}px) scale(${0.9 + 0.1 * s})`}}>{w.w}</span>
          );
        })}
      </div>
    );
  };

const Sub: React.FC<{text: string; t: Theme; size: number; delay?: number}> = ({text, t, size, delay = 8}) => {
  const e = useEnter(t, delay);
  return <div style={{fontFamily: ff(t.fontBody), fontSize: size, color: t.muted, fontWeight: 600, opacity: e, transform: `translateY(${(1 - e) * 20}px)`, textAlign: 'center'}}>{text}</div>;
};

// ---------- kinds ----------
const Kinetic: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const n = tokens(b.text || '').length;
  const size = vertical ? (n > 6 ? 120 : n > 3 ? 150 : 190) : (n > 7 ? 120 : n > 4 ? 150 : 190);
  const bar = interpolate(f, [4, 20], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: vertical ? '0 70px' : '0 140px'}}>
      <Headline text={b.text || ''} t={t} size={size} maxWidth={vertical ? 940 : 1600} />
      <div style={{marginTop: 34, height: 10, width: 260 * bar, background: t.accent, borderRadius: t.radius}} />
      {b.value && <div style={{marginTop: 26}}><Sub text={b.value} t={t} size={vertical ? 44 : 48} delay={12} /></div>}
    </AbsoluteFill>
  );
};

// cut-out illustration / cast character with character-like motion
const spriteMotion = (motion: string | null | undefined, f: number, e: number, len: number, hasCast: boolean) => {
  const m = motion || (hasCast ? 'walk-in' : 'float');
  const push = interpolate(f, [0, len], [1, 1.05]);
  switch (m) {
    case 'walk-in': {
      const x = interpolate(f, [0, 26], [-900, 0], {...cl, easing: Easing.out(Easing.cubic)});
      const walking = f < 26;
      const hop = walking ? -Math.abs(Math.sin(f / 2.6)) * 34 : Math.sin(f / 18) * 6;
      const tilt = walking ? Math.sin(f / 2.6) * 5 : Math.sin(f / 30) * 1.5;
      const squash = walking ? 1 : 1 + Math.sin(f / 9) * 0.015;
      return `translate(${x}px, ${hop}px) rotate(${tilt}deg) scale(${push}, ${push * squash})`;
    }
    case 'bounce': {
      const y = (1 - e) * -500 + Math.abs(Math.sin(f / 7)) * -22 * Math.max(0, 1 - f / 90);
      const sq = 1 + Math.sin(f / 3.5) * 0.04 * Math.max(0, 1 - f / 40);
      return `translateY(${y}px) scale(${push * (2 - sq)}, ${push * sq})`;
    }
    case 'shake': {
      const k = Math.sin(f * 1.7) * 14 * (0.4 + 0.6 * Math.abs(Math.sin(f / 11)));
      return `translateX(${k}px) rotate(${k / 5}deg) scale(${push * (0.85 + 0.15 * e)})`;
    }
    case 'pop':
      return `scale(${push * e}) rotate(${(1 - e) * -12}deg)`;
    default:
      return `translateY(${Math.sin(f / 22) * 12 + (1 - e) * 60}px) rotate(${Math.sin(f / 40) * 2}deg) scale(${push * (0.85 + 0.15 * e)})`;
  }
};

const Illustration: React.FC<BP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const e = useEnter(t);
  const hasCast = !!(b.cast && b.cast.length);
  const S = vertical ? 800 : 860;
  const img = b.img ? <div style={{position: 'relative', width: S, height: S}}>
      <div style={{position: 'absolute', left: '22%', right: '22%', bottom: 18, height: 40, borderRadius: '50%', background: alpha('#000', 0.18), filter: 'blur(10px)', opacity: e}} />
      <Img src={staticFile(b.img)} style={{position: 'absolute', inset: 0, width: S, height: S, objectFit: 'contain', opacity: Math.min(1, e * 1.4),
        transform: spriteMotion(b.motion, f, e, len, hasCast), filter: `drop-shadow(0 26px 34px ${alpha('#000', 0.22)})`}} />
    </div> : <Icon name={pickIcon(b.text, b.value) || 'heart'} size={420} color={t.accent} progress={e} width={4} />;
  return vertical ? (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 200}}>
      {img}
      <div style={{marginTop: 0, padding: '0 60px'}}><Headline text={b.text || ''} t={t} size={88} maxWidth={940} delay={6} /></div>
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 110px', gap: 50}}>
      <div style={{flex: '0 0 860px', display: 'flex', justifyContent: 'center'}}>{img}</div>
      <div style={{flex: 1}}><Headline text={b.text || ''} t={t} size={104} align="left" maxWidth={820} delay={6} />
        {b.value && <div style={{marginTop: 24, textAlign: 'left'}}><Sub text={b.value} t={t} size={44} /></div>}</div>
    </AbsoluteFill>
  );
};

// full-bleed 2D cartoon scene with a camera move + caption label
const Cartoon: React.FC<BP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pr: any = (b as any).params || {};
  const ov: any = pr.overlay || {};
  const p = interpolate(f, [0, Math.max(len, 1)], [0, 1], cl);
  const ez = Easing.inOut(Easing.quad)(p);
  const FO: Record<string, string> = {left: '25% 50%', right: '75% 50%', top: '50% 25%', bottom: '50% 75%', center: '50% 45%'};
  const origin = FO[pr.focus] || '50% 45%';
  let tr = '';
  switch (b.motion) {
    case 'pan-left': tr = `scale(1.16) translateX(${interpolate(ez, [0, 1], [5, -5])}%)`; break;
    case 'pan-right': tr = `scale(1.16) translateX(${interpolate(ez, [0, 1], [-5, 5])}%)`; break;
    case 'zoom-out': tr = `scale(${interpolate(ez, [0, 1], [1.25, 1.04])})`; break;
    case 'shake': tr = `scale(1.12) translate(${Math.sin(f * 1.9) * 6 * Math.max(0, 1 - f / 24)}px, ${Math.cos(f * 2.3) * 5 * Math.max(0, 1 - f / 24)}px)`; break;
    default: tr = `scale(${interpolate(ez, [0, 1], [1.04, 1.24])})`;
  }
  const e = useEnter(t, 8);
  const label = b.text && !vertical ? (   // Shorts already have word captions -> no duplicate label
    <div style={{position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', ...(vertical ? {top: 150} : {bottom: 70})}}>
      <div style={{background: alpha(t.bg, 0.88), border: `4px solid ${t.accent}`, borderRadius: Math.max(14, t.radius), padding: vertical ? '16px 30px' : '18px 42px',
        transform: `translateY(${(1 - e) * 40}px) scale(${0.9 + 0.1 * e})`, opacity: e, boxShadow: `0 18px 40px ${alpha('#000', 0.3)}`, maxWidth: vertical ? 940 : 1500}}>
        <Headline text={b.text} t={t} size={vertical ? 64 : 72} maxWidth={vertical ? 860 : 1400} delay={10} />
      </div>
    </div>) : null;
  // motion-graphic overlays drawn on top of the storyboard frame
  const parts = ov.particles ? Array.from({length: 18}, (_, i) => {
    const x = ((i * 113 + f * (1.5 + (i % 4))) % (width + 200)) - 100, y = height * (0.15 + ((i * 37) % 70) / 100) + Math.sin((f + i * 11) / 14) * 30;
    return <Particle key={i} type={ov.particles} x={x} y={y} r={vertical ? 26 : 22} rot={f * 2 + i * 20} t={t} />;
  }) : null;
  const ARW: Record<string, number> = {right: 0, down: 90, left: 180, up: 270};
  const arrowE = spring({frame: f - 14, fps: 30, config: {damping: 10, stiffness: 160}});
  const arrow = ov.arrow ? <div style={{position: 'absolute', left: vertical ? width / 2 - 120 : width * 0.62, top: vertical ? height * 0.42 : height * 0.32,
      display: 'flex', alignItems: 'center', gap: 16, transform: `scale(${arrowE})`, opacity: arrowE}}>
      <svg width={150} height={150} style={{transform: `rotate(${ARW[ov.arrow] ?? 0}deg) translateX(${Math.sin(f / 5) * 10}px)`}}>
        <path d="M10 75 H110 M80 40 L120 75 L80 110" stroke={t.accent} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {ov.label && <div style={{background: t.accent, color: t.bg, fontFamily: ff(t.fontHead), fontSize: 46, padding: '6px 18px', borderRadius: 12, textTransform: 'uppercase'}}>{ov.label}</div>}
    </div> : null;
  const cnt = ov.counter ? <div style={{position: 'absolute', right: vertical ? 40 : 70, top: vertical ? 300 : 60, fontFamily: ff(t.fontHead), fontSize: vertical ? 120 : 130,
      color: '#fff', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', transform: `scale(${spring({frame: f - 10, fps: 30, config: {damping: 9, stiffness: 200}})})`}}>{ov.counter}</div> : null;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: t.bg}}>
      {b.img && <Img src={staticFile(b.img)} style={{position: 'absolute', width, height, objectFit: 'cover', transform: tr, transformOrigin: origin}} />}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, transparent 60%, ${alpha('#000', 0.35)} 100%)`}} />
      {parts && <svg width={width} height={height} style={{position: 'absolute', opacity: 0.85}}>{parts}</svg>}
      {arrow}{cnt}
      {label}
    </AbsoluteFill>
  );
};

const StickScene: React.FC<BP> = ({b, t, vertical}) => {
  const txt = `${b.text} ${b.value}`.toLowerCase();
  const pose = STICK_POSES.find((p) => (b.value || '').toLowerCase().includes(p)) ||
    (/(drink|alcohol|beer|wine)/.test(txt) ? 'drink' : /(tired|sleep|exhaust)/.test(txt) ? 'tired' : /(sad|stress|pain|sick)/.test(txt) ? 'sad' :
      /(run|exercise|sport)/.test(txt) ? 'run' : /(walk|move|step)/.test(txt) ? 'walk' : /(happy|better|great|win)/.test(txt) ? 'happy' : 'point');
  const prop = /(drink|alcohol|beer|wine|glass|water)/.test(txt) ? 'glass' : /(phone|screen|scroll)/.test(txt) ? 'phone' : /(smok|cigarette)/.test(txt) ? 'cigarette' : undefined;
  const e = useEnter(t);
  const fig = <div style={{transform: `scale(${0.8 + 0.2 * e})`, opacity: e}}><Stickman pose={pose} color={t.fg} accent={t.accent} size={vertical ? 640 : 620} prop={prop} /></div>;
  return vertical ? (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 260}}>{fig}<div style={{padding: '0 60px'}}><Headline text={b.text || ''} t={t} size={92} maxWidth={940} delay={6} /></div></AbsoluteFill>
  ) : (
    <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 160px', gap: 40}}>
      {fig}<div style={{flex: 1}}><Headline text={b.text || ''} t={t} size={110} align="left" maxWidth={900} delay={6} /></div>
    </AbsoluteFill>
  );
};

const IconScene: React.FC<BP> = (p) => {
  const name0 = pickIcon(p.b.value, p.b.text);
  if (!name0) return <Kinetic {...p} />;   // no matching icon -> typography instead of a generic check mark
  return <IconInner {...p} />;
};
const IconInner: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const name = pickIcon(b.value, b.text) || 'check';
  const draw = interpolate(f, [0, 26], [0, 1], {...cl, easing: Easing.inOut(Easing.cubic)});
  const e = useEnter(t);
  const ring = interpolate(f, [10, 40], [0.6, 1.25], cl);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, padding: vertical ? '0 60px 300px' : 0}}>
      <div style={{position: 'relative', width: 380, height: 380, transform: vertical ? 'scale(1.35)' : 'none', marginBottom: vertical ? 70 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute', width: 380, height: 380, borderRadius: 999, border: `6px solid ${alpha(t.accent, 0.35)}`, transform: `scale(${ring})`, opacity: 1.3 - ring}} />
        <div style={{position: 'absolute', width: 340, height: 340, borderRadius: t.radius > 20 ? 999 : t.radius * 3, background: alpha(t.accent, 0.12), transform: `scale(${e})`}} />
        <Icon name={name} size={vertical ? 300 : 240} color={t.accent} progress={draw} width={5} />
      </div>
      <Headline text={b.text || ''} t={t} size={vertical ? 96 : 112} maxWidth={vertical ? 940 : 1500} delay={8} />
    </AbsoluteFill>
  );
};

const parseNum = (v: string) => {
  const m = (v || '').replace(/,/g, '').match(/^([^0-9\-]*)(-?[0-9]*\.?[0-9]+)(.*)$/);
  return m ? {pre: m[1], n: parseFloat(m[2]), post: m[3], dec: (m[2].split('.')[1] || '').length} : null;
};

const Counter: React.FC<BP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const p = parseNum(b.value || '');
  const k = interpolate(f, [4, Math.min(45, len - 10)], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
  const shown = p ? `${p.pre}${(p.n * k).toLocaleString('en-US', {minimumFractionDigits: p.dec, maximumFractionDigits: p.dec})}${p.post}` : (b.value || '');
  const done = k > 0.99;
  const bump = done ? interpolate(f - 45, [0, 8], [1.08, 1], cl) : 1;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: vertical ? '0 60px 260px' : 0}}>
      <div style={{fontFamily: ff(t.fontHead), fontSize: Math.min(vertical ? 230 : 300, (vertical ? 1500 : 2600) / Math.max(4, shown.length)), color: t.accent, lineHeight: 1, fontWeight: 900, transform: `scale(${bump})`,
        textShadow: `0 10px 0 ${alpha(t.fg, 0.08)}`}}>{shown}</div>
      <div style={{marginTop: 30}}><Headline text={b.text || ''} t={t} size={vertical ? 72 : 80} maxWidth={vertical ? 940 : 1500} delay={10} /></div>
    </AbsoluteFill>
  );
};

const Timeline: React.FC<BP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const items = (b.items && b.items.length ? b.items : [b.text || '']).slice(0, 6);
  const step = Math.max(10, Math.min(30, (len - 20) / items.length));
  const lineP = interpolate(f, [0, step * items.length], [0, 1], cl);
  if (vertical) {
    return (
      <AbsoluteFill style={{padding: '260px 90px 0'}}>
        <Headline text={b.text || ''} t={t} size={80} maxWidth={900} />
        <div style={{position: 'relative', marginTop: 50}}>
          <div style={{position: 'absolute', left: 22, top: 10, width: 6, height: 150 * (items.length - 1) * lineP, background: t.accent, borderRadius: 3}} />
          {items.map((it, i) => {
            const s = spring({frame: f - i * step, fps: 30, config: {damping: t.spring[0], stiffness: t.spring[1]}});
            return <div key={i} style={{display: 'flex', alignItems: 'center', height: 150, opacity: s, transform: `translateX(${(1 - s) * 60}px)`}}>
              <div style={{width: 50, height: 50, borderRadius: 25, background: t.accent, boxShadow: `0 0 0 10px ${alpha(t.accent, 0.2)}`}} />
              <div style={{marginLeft: 36, fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: 52, color: t.fg}}>{it}</div>
            </div>;
          })}
        </div>
      </AbsoluteFill>
    );
  }
  const W = 1500, gap = items.length > 1 ? W / (items.length - 1) : 0;
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 170}}>
      <Headline text={b.text || ''} t={t} size={92} maxWidth={1600} />
      <div style={{position: 'relative', width: W, height: 360, marginTop: 120}}>
        <div style={{position: 'absolute', top: 40, left: 0, height: 8, width: W * lineP, background: t.accent, borderRadius: 4}} />
        {items.map((it, i) => {
          const s = spring({frame: f - i * step, fps: 30, config: {damping: t.spring[0], stiffness: t.spring[1]}});
          return <div key={i} style={{position: 'absolute', left: i * gap - 130, top: 0, width: 260, textAlign: 'center', opacity: s, transform: `translateY(${(1 - s) * 40}px)`}}>
            <div style={{margin: '18px auto 0', width: 52, height: 52, borderRadius: 26, background: t.accent, boxShadow: `0 0 0 12px ${alpha(t.accent, 0.2)}`}} />
            <div style={{marginTop: 34, fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: 40, color: t.fg, lineHeight: 1.2}}>{it}</div>
          </div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Chart: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const rows = (b.items || []).map((s) => { const [l, v] = s.split(':'); const n = parseFloat((v || '').replace(/[^0-9.\-]/g, '')); return {l: (l || '').trim(), v: (v || '').trim(), n: isNaN(n) ? 0 : n}; }).slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const BW = vertical ? 820 : 1300;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: vertical ? 'flex-start' : 'center', paddingTop: vertical ? 260 : 0}}>
      <Headline text={b.text || ''} t={t} size={vertical ? 80 : 92} maxWidth={vertical ? 940 : 1600} />
      <div style={{marginTop: 60, width: BW}}>
        {rows.map((r, i) => {
          const k = interpolate(f, [8 + i * 6, 38 + i * 6], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
          return <div key={i} style={{marginBottom: 30}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: vertical ? 40 : 38, color: t.fg, marginBottom: 10}}>
              <span>{r.l}</span><span style={{color: i === 0 ? t.accent : t.muted, opacity: k}}>{r.v}</span></div>
            <div style={{height: vertical ? 46 : 40, background: alpha(t.fg, 0.08), borderRadius: t.radius / 2}}>
              <div style={{height: '100%', width: `${(r.n / max) * 100 * k}%`, background: i === 0 ? t.accent : t.accent2, borderRadius: t.radius / 2}} /></div>
          </div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Split: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const [a, c] = [(b.items || [])[0] || '', (b.items || [])[1] || ''];
  const ea = useEnter(t, 2), ec = useEnter(t, 10);
  const vs = interpolate(f, [14, 24], [0, 1], cl);
  const panel = (txt: string, col: string, e: number, icon: string) => (
    <div style={{flex: 1, borderRadius: t.radius, background: alpha(col, 0.12), border: `4px solid ${col}`, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 40, opacity: e, transform: `scale(${0.85 + 0.15 * e})`, gap: 30}}>
      <Icon name={icon} size={vertical ? 150 : 170} color={col} progress={e} />
      <div style={{fontFamily: ff(t.fontHead), fontSize: vertical ? 64 : 70, color: t.fg, textAlign: 'center', lineHeight: 1.1, textTransform: t.upper ? 'uppercase' : 'none'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{padding: vertical ? '250px 70px 520px' : '160px 140px 120px', gap: 30}}>
      {b.text && <Headline text={b.text} t={t} size={vertical ? 76 : 84} maxWidth={vertical ? 940 : 1640} />}
      <div style={{flex: 1, display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 50, alignItems: 'stretch', position: 'relative', marginTop: 20}}>
        {panel(a, t.accent3, ea, pickIcon(a) || 'cross')}
        {panel(c, t.accent, ec, pickIcon(c) || 'check')}
        <div style={{position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${vs})`, width: 110, height: 110, borderRadius: 55, background: t.fg,
          color: t.bg, fontFamily: ff(t.fontHead), fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>VS</div>
      </div>
    </AbsoluteFill>
  );
};

const Checklist: React.FC<BP> = ({b, t, vertical, len}) => {
  const f = useCurrentFrame();
  const items = (b.items || []).slice(0, 5);
  const step = Math.max(10, Math.min(28, (len - 15) / Math.max(1, items.length)));
  return (
    <AbsoluteFill style={{padding: vertical ? '260px 80px 0' : '150px 260px 0'}}>
      <Headline text={b.text || ''} t={t} size={vertical ? 80 : 92} align={vertical ? 'center' : 'left'} maxWidth={vertical ? 940 : 1400} />
      <div style={{marginTop: 50}}>
        {items.map((it, i) => {
          const s = spring({frame: f - 6 - i * step, fps: 30, config: {damping: t.spring[0], stiffness: t.spring[1]}});
          const ck = interpolate(f - 6 - i * step, [6, 18], [0, 1], cl);
          return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 32, marginBottom: vertical ? 46 : 34, opacity: s, transform: `translateX(${(1 - s) * -60}px)`}}>
            <div style={{width: 76, height: 76, borderRadius: t.radius > 20 ? 38 : t.radius, background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 76px'}}>
              <Icon name="check" size={52} color={t.bg} progress={ck} width={12} /></div>
            <div style={{fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: vertical ? 50 : 52, color: t.fg, lineHeight: 1.15}}>{it}</div>
          </div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Quote: React.FC<BP> = ({b, t, vertical}) => {
  const e = useEnter(t);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: vertical ? '0 80px 300px' : '0 220px'}}>
      <div style={{fontFamily: ff('dmserif'), fontSize: 320, color: t.accent, lineHeight: 0.6, height: 150, opacity: e}}>“</div>
      <Headline text={b.text || ''} t={t} size={vertical ? 86 : 100} maxWidth={vertical ? 920 : 1450} delay={4} />
      {b.value && <div style={{marginTop: 30}}><Sub text={'— ' + b.value} t={t} size={40} delay={14} /></div>}
    </AbsoluteFill>
  );
};

const BodyScene: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 30], [0, 1], {...cl, easing: Easing.inOut(Easing.cubic)});
  return vertical ? (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 230}}>
      <BodyMap organ={b.value || b.text} t={t} height={820} progress={p} />
      <div style={{padding: '20px 60px 0'}}><Headline text={b.text || ''} t={t} size={86} maxWidth={940} delay={10} /></div>
    </AbsoluteFill>
  ) : (
    <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center', padding: '0 200px', gap: 80}}>
      <BodyMap organ={b.value || b.text} t={t} height={900} progress={p} />
      <div style={{flex: 1}}><Headline text={b.text || ''} t={t} size={108} align="left" maxWidth={900} delay={10} /></div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<BP> = ({b, t, vertical}) => {
  const f = useCurrentFrame();
  const e = useEnter(t, 4);
  const press = f > 40 && f < 52 ? 0.92 : 1;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, padding: vertical ? '0 60px 300px' : 0}}>
      <Headline text={b.text || 'Thanks for watching'} t={t} size={vertical ? 90 : 110} maxWidth={vertical ? 940 : 1500} />
      <div style={{transform: `scale(${e * press})`, background: '#FF0033', color: '#fff', fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: vertical ? 52 : 56,
        padding: '22px 60px', borderRadius: 999, boxShadow: `0 16px 40px ${alpha('#FF0033', 0.35)}`}}>{f > 46 ? 'SUBSCRIBED ✓' : 'SUBSCRIBE'}</div>
      {b.value && <Sub text={b.value} t={t} size={vertical ? 40 : 42} delay={16} />}
    </AbsoluteFill>
  );
};

const KINDS: Record<string, React.FC<BP>> = {
  endcard: EndCard,
  cartoon: Cartoon, kinetic: Kinetic, illustration: Illustration, stickman: StickScene, icon: IconScene, counter: Counter, timeline: Timeline,
  chart: Chart, split: Split, checklist: Checklist, quote: Quote, body: BodyScene,
  ...MOTION, counter: MOTION.counter2,
};

// ---------- transition wrapper ----------
export const BeatView: React.FC<BP> = (p) => {
  const f = useCurrentFrame();
  const {t, len} = p;
  const kind = (p.b.kind === 'illustration' || p.b.kind === 'cartoon') && !p.b.img ? 'icon' : p.b.kind;
  const K = KINDS[kind] || Kinetic;
  const inK = interpolate(f, [0, 12], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
  const outK = interpolate(f, [len - 8, len], [1, 0], {...cl, easing: Easing.in(Easing.cubic)});
  let style: React.CSSProperties = {opacity: Math.min(inK, outK)};
  const TR = ['slide', 'rise', 'zoom', 'fade', 'wipe', 'cut', 'bounce'];
  const h = Math.abs(Math.sin(p.b.from * 12.9898) * 43758.5453) % 1;
  const tr = h < 0.5 ? t.transition : TR[Math.floor(h * 2 * TR.length) % TR.length];
  switch (tr) {
    case 'slide': style.transform = `translateX(${(1 - inK) * 120 - (1 - outK) * 120}px)`; break;
    case 'rise': style.transform = `translateY(${(1 - inK) * 80 - (1 - outK) * 60}px)`; break;
    case 'zoom': style.transform = `scale(${1.25 - 0.25 * inK + (1 - outK) * 0.2})`; break;
    case 'fade': style.transform = `scale(${0.97 + 0.03 * inK})`; break;
    case 'wipe': style = {clipPath: `inset(0 ${(1 - inK) * 100}% 0 ${(1 - outK) * 100}%)`}; break;
    case 'glitch': style.transform = f < 6 ? `translate(${(f % 2 ? 1 : -1) * 14}px, 0)` : 'none'; break;
    case 'bounce': style.transform = `scale(${spring({frame: f, fps: 30, config: {damping: 7, stiffness: 160}}) * outK + (1 - outK)})`; break;
    case 'cut': style = {}; break;
  }
  return <AbsoluteFill style={style}><K {...p} /></AbsoluteFill>;
};
