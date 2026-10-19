import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Beat, Theme, ff} from './theme';
import {GEN} from './gen';

// Catches runtime errors inside a generated animation so one bad shot never breaks the render.
class Boundary extends React.Component<{fallback: React.ReactNode; children: React.ReactNode}, {err: boolean}> {
  state = {err: false};
  static getDerivedStateFromError() { return {err: true}; }
  componentDidCatch(e: any) { console.error('GEN_SHOT_ERROR', String(e)); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

const Fallback: React.FC<{text: string; t: Theme}> = ({text, t}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 120, opacity: o}}>
    <div style={{fontFamily: ff(t.fontHead), fontSize: 90, color: t.fg, textAlign: 'center', lineHeight: 1.1}}>{text}</div>
  </AbsoluteFill>;
};

export const genProps = (b: Beat, t: Theme, len: number, vertical: boolean) => ({
  dur: Math.max(1, len), w: vertical ? 1080 : 1920, h: vertical ? 1520 : 1080, vertical,
  theme: {...t, head: ff(t.fontHead), body: ff(t.fontBody)}, words: b.words || [], text: b.text || '',
});

export const GenShot: React.FC<{b: Beat; t: Theme; len: number; vertical: boolean; qa?: boolean}> = ({b, t, len, vertical, qa}) => {
  const C = GEN[(b.params || {}).gen];
  const fb = qa ? <AbsoluteFill style={{background: '#FF00FF'}} /> : <Fallback text={b.text || (b.params || {}).label || ''} t={t} />;
  if (!C) return <>{fb}</>;
  return <Boundary fallback={fb}><AbsoluteFill><C {...genProps(b, t, len, vertical)} /></AbsoluteFill></Boundary>;
};

// QA gallery: every generated shot one after another (slot frames each) so stills can be checked before the real render.
export const GenGallery: React.FC<{items: {id: string; dur: number}[]; slot: number; theme: Theme; vertical: boolean}> = ({items, slot, theme, vertical}) => {
  const f = useCurrentFrame();
  const i = Math.min(items.length - 1, Math.floor(f / slot));
  const it = items[i];
  if (!it) return null;
  const local = f - i * slot;
  return <AbsoluteFill style={{background: theme.bg, overflow: 'hidden'}}>
    <GenAt key={it.id} id={it.id} dur={it.dur} local={local} theme={theme} vertical={vertical} />
  </AbsoluteFill>;
};

import {Sequence} from 'remotion';
const GenAt: React.FC<{id: string; dur: number; local: number; theme: Theme; vertical: boolean}> = ({id, dur, local, theme, vertical}) => {
  const f = useCurrentFrame();
  return <Sequence from={f - local} durationInFrames={dur}>
    <GenShot b={{from: 0, to: dur, kind: 'gen', params: {gen: id}, words: []}} t={theme} len={dur} vertical={vertical} qa />
  </Sequence>;
};
