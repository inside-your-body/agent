import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, Easing} from 'remotion';
import {Props, Word, Theme, ff, alpha} from './theme';
import {Background} from './Background';
import {BeatView} from './Beats';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Flash: React.FC<{cuts: number[]; t: Theme}> = ({cuts, t}) => {
  const f = useCurrentFrame();
  if (!['glitch', 'cut', 'zoom'].includes(t.transition)) return null;
  let o = 0;
  for (const c of cuts) { const d = f - c; if (d >= 0 && d < 5 && c > 0) o = Math.max(o, interpolate(d, [0, 5], [0.35, 0])); }
  return <AbsoluteFill style={{background: t.transition === 'glitch' ? t.accent2 : '#fff', opacity: o, mixBlendMode: 'overlay'}} />;
};

// word-by-word captions (Shorts)
const Captions: React.FC<{words: Word[]; t: Theme; fps: number}> = ({words, t, fps}) => {
  const f = useCurrentFrame();
  const time = f / fps;
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    if (/[.,?!]$/.test(w.w) || cur.length >= 3 || (words[i + 1] && words[i + 1].s - w.e > 0.3)) { chunks.push(cur); cur = []; }
  });
  if (cur.length) chunks.push(cur);
  const ci = chunks.findIndex((c, i) => time >= c[0].s - 0.05 && (i === chunks.length - 1 || time < chunks[i + 1][0].s - 0.05));
  if (ci < 0) return null;
  const c = chunks[ci];
  const pop = interpolate(time - c[0].s, [-0.05, 0.1], [0.85, 1], {...cl, easing: Easing.out(Easing.back(2))});
  return (
    <AbsoluteFill style={{top: 1580, height: 300, alignItems: 'center'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 20px', maxWidth: 960, transform: `scale(${pop})`,
        background: 'rgba(10,12,20,0.78)', borderRadius: 28, padding: '14px 34px'}}>
        {c.map((w, i) => {
          const on = time >= w.s - 0.03;
          return <span key={i} style={{fontFamily: ff(t.fontHead), fontSize: 92, lineHeight: 1.1, textTransform: 'uppercase', fontWeight: 900,
            color: on ? (time < w.e + 0.08 ? t.accent : '#fff') : 'rgba(255,255,255,0.45)',
            WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.6)'}}>{w.w.replace(/[,.]$/, '')}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Bug: React.FC<{t: Theme; vertical: boolean}> = ({t, vertical}) => vertical ? null : (
  <div style={{position: 'absolute', right: 56, bottom: 42, fontFamily: ff(t.fontBody), fontWeight: 800, fontSize: 22, letterSpacing: 4,
    color: alpha(t.fg, 0.45)}}>INSIDE YOUR BODY</div>
);

export const Episode: React.FC<Props> = (p) => {
  const vertical = p.kind === 'short';
  const cuts = p.beats.map((b) => b.from);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Background t={p.theme} />
      {/* Shorts: visuals live in the top 1520 px; the bottom band is reserved for captions so they never overlap */}
      <AbsoluteFill style={vertical ? {height: 1520, overflow: 'hidden'} : {}}>
        {p.beats.map((b, i) => (
          <Sequence key={i} from={b.from} durationInFrames={Math.max(1, b.to - b.from)}>
            <BeatView b={b} t={p.theme} len={b.to - b.from} vertical={vertical} />
          </Sequence>
        ))}
      </AbsoluteFill>
      {vertical && <AbsoluteFill style={{top: 1520, background: `linear-gradient(180deg, ${alpha(p.theme.bg, 0.0)} 0%, ${alpha(p.theme.bg, 0.92)} 12%)`}} />}
      <Flash cuts={cuts} t={p.theme} />
      {vertical && <Captions words={p.words} t={p.theme} fps={p.fps} />}
      <Bug t={p.theme} vertical={vertical} />
    </AbsoluteFill>
  );
};
