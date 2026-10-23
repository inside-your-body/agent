// POV "flat" format (owner's choice, Oct 2026): the signature character MAX as simple cut-outs on ONE flat background colour,
// NO camera zoom; motion comes from the character/props entering and acting, and from kinetic typography.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, Sequence, spring, useVideoConfig, interpolate} from 'remotion';

export type FlatItem = {src: string; x: number; y: number; h: number; at?: number; enter?: 'pop' | 'left' | 'right' | 'up' | 'drop';
  shake?: number; grow?: [number, number]; flip?: boolean; slide?: [number, number]};
export type FlatWord = {t: string; at: number; accent?: boolean};
export type FlatBeat = {from: number; dur: number; bg: string; ink?: string; items: FlatItem[]; words: FlatWord[]; side?: 'left' | 'right' | 'center';
  tube?: boolean; calendar?: boolean};
export type FlatProps = {beats: FlatBeat[]; frames: number; accent?: string};

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const Item: React.FC<{it: FlatItem; dur: number}> = ({it, dur}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const at = it.at ?? 0;
  const p = spring({frame: f - at, fps, config: {damping: 13, stiffness: 160}});
  if (f < at) return null;
  const e = it.enter ?? 'pop';
  let dx = 0, dy = 0, sc = 1;
  if (e === 'pop') sc = 0.6 + 0.4 * p;
  if (e === 'left') dx = -(1 - p) * 900;
  if (e === 'right') dx = (1 - p) * 900;
  if (e === 'up') dy = (1 - p) * 700;
  if (e === 'drop') dy = -(1 - p) * 700;
  const bob = Math.sin((f - at) / 9) * 6;                                   // idle breathing, never static
  const sh = it.shake ? Math.sin(f * 2.3) * it.shake * (f % 40 < 22 ? 1 : 0.2) : 0;
  const g = it.grow ? interpolate(f, [at, at + Math.max(20, dur * 0.7)], it.grow, cl) : 1;
  const sl = it.slide ? interpolate(f, [at, at + Math.max(20, dur * 0.8)], it.slide, cl) : 0;
  return <Img src={staticFile(it.src)} style={{position: 'absolute', height: it.h * g, left: it.x + dx + sh + sl, top: it.y + dy + bob - it.h * (g - 1) / 2,
    transform: `translateX(-50%) scale(${sc}) ${it.flip ? 'scaleX(-1)' : ''}`, opacity: Math.min(1, p * 1.5), transformOrigin: 'bottom center'}} />;
};

// kinetic typography: words land one by one, stacked, big and bold
const Words: React.FC<{words: FlatWord[]; ink: string; accent: string; side: string}> = ({words, ink, accent, side}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const shown = words.filter((w) => f >= w.at);
  const left = side === 'left' ? 110 : side === 'center' ? 260 : 1010;
  const width = side === 'center' ? 1400 : 820;
  return <div style={{position: 'absolute', left, top: side === 'center' ? 120 : 250, width, display: 'flex', flexWrap: 'wrap',
    justifyContent: side === 'center' ? 'center' : 'flex-start', gap: '0 28px', fontFamily: 'F_anton', fontSize: 150, lineHeight: 1.05}}>
    {shown.map((w, i) => {
      const p = spring({frame: f - w.at, fps, config: {damping: 11, stiffness: 200}});
      return <span key={i} style={{color: w.accent ? accent : ink, display: 'inline-block', whiteSpace: 'nowrap',
        transform: `translateY(${(1 - p) * 80}px) rotate(${(1 - p) * -8}deg) scale(${0.7 + 0.3 * p})`, opacity: Math.min(1, p * 1.6)}}>{w.t}</span>;
    })}
  </div>;
};

// simple code-drawn ureter tube for the "stuck" beats
const Tube: React.FC = () => {
  const f = useCurrentFrame();
  const squeeze = 1 - 0.18 * Math.max(0, Math.sin(f / 7));
  return <svg width={1920} height={1080} style={{position: 'absolute'}}>
    <path d={`M120 ${540 - 120} C700 ${540 - 120}, 900 ${540 - 60 * squeeze}, 1800 ${540 - 60 * squeeze} L1800 ${540 + 60 * squeeze} C900 ${540 + 60 * squeeze}, 700 ${540 + 120}, 120 ${540 + 120} Z`}
      fill="#E9A39A" stroke="#3B2A1E" strokeWidth={10} />
    <path d={`M120 540 L1800 540`} stroke="#F6C9C2" strokeWidth={30 * squeeze} strokeLinecap="round" opacity={0.6} />
  </svg>;
};

const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.min(6, Math.floor(f / 6));
  return <svg width={1920} height={1080} style={{position: 'absolute'}}>
    {Array.from({length: n}).map((_, i) => <g key={i} transform={`translate(${300 + i * 26} ${400 + i * 18}) rotate(${-8 + i * 3})`}>
      <rect width={300} height={340} rx={18} fill="#FFFFFF" stroke="#2B2B2B" strokeWidth={8} />
      <rect width={300} height={80} rx={18} fill="#D9534F" stroke="#2B2B2B" strokeWidth={8} />
    </g>)}
  </svg>;
};

export const PovFlat: React.FC<FlatProps> = ({beats, accent = '#E4572E'}) => (
  <AbsoluteFill style={{background: '#F2E1C3'}}>
    {beats.map((b, i) => <Sequence key={i} from={b.from} durationInFrames={b.dur}>
      <AbsoluteFill style={{background: b.bg}}>
        {b.tube && <Tube />}
        {b.calendar && <Calendar />}
        {b.items.map((it, k) => <Item key={k} it={it} dur={b.dur} />)}
        <Words words={b.words} ink={b.ink ?? '#2B2B2B'} accent={accent} side={b.side ?? 'right'} />
      </AbsoluteFill>
    </Sequence>)}
  </AbsoluteFill>
);

export const povFlatMeta = ({props}: {props: FlatProps}) => ({durationInFrames: Math.max(30, props.frames || 30)});
