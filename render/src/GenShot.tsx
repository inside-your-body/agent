import {FlatShot} from './FlatShot';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Beat, Theme, ff} from './theme';
import {GEN} from './gen';
import {POSES, mixPose, lerp, KType} from './kit/Kit';
import {STYLES, StyleBg, Riso, Hero, HMood, kitKey} from './kit/Styles';

// Catches runtime errors inside a generated animation so one bad shot never breaks the render.
class Boundary extends React.Component<{fallback: React.ReactNode; children: React.ReactNode}, {err: boolean}> {
  state = {err: false};
  static getDerivedStateFromError() { return {err: true}; }
  componentDidCatch(e: any) { console.error('GEN_SHOT_ERROR', String(e)); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

// Fallback when a generated part is missing or crashed: the hero in this video's style pack reacting, with the key words.
const Fallback: React.FC<{text: string; t: Theme; vertical?: boolean}> = ({text, t, vertical}) => {
  const f = useCurrentFrame();
  const S = STYLES[kitKey(t)] || STYLES.flat;
  const w = 1920, h = vertical ? 1520 : 1080;
  const moods: HMood[] = ['worried', 'shock', 'determined', 'neutral'];
  const k = (text || 'x').length % 4;
  const poses = [POSES.think, POSES.point, POSES.shrug, POSES.holdHead];
  const pose = mixPose(POSES.stand, poses[k], lerp(f, 6, 26, 0, 1));
  const words = (text || '').split(/\s+/).filter(Boolean).slice(0, 4).map((x) => S.upper ? x.toUpperCase() : x);
  return <AbsoluteFill><svg width={vertical ? 1080 : w} height={h} viewBox={vertical ? `0 0 1080 ${h}` : `0 0 ${w} ${h}`}>
    <StyleBg s={S} w={vertical ? 1080 : w} h={h} />
    <Riso s={S}><Hero s={S} x={vertical ? 540 : 520 + Math.sin(f / 30) * 20} y={vertical ? 1380 : 980} scale={vertical ? 2.2 : 2.3}
      pose={pose} mood={moods[k]} blink={f % 70 > 66} /></Riso>
    {words.length > 0 && <KType words={words} at={10} x={vertical ? 540 : 1340} y={vertical ? 300 : 470} size={vertical ? 110 : 120}
      color={S.ink} accent={[words.length - 1]} accentColor={S.accent} font={S.font} width={vertical ? 960 : 1000} />}
  </svg></AbsoluteFill>;
};

export const genProps = (b: Beat, t: Theme, len: number, vertical: boolean) => ({
  dur: Math.max(1, len), w: vertical ? 1080 : 1920, h: vertical ? 1520 : 1080, vertical,
  theme: {...t, kit: kitKey(t), head: ff(t.fontHead), body: ff(t.fontBody)}, words: b.words || [], text: b.text || '',
});

export const GenShot: React.FC<{b: Beat; t: Theme; len: number; vertical: boolean; qa?: boolean}> = ({b, t, len, vertical, qa}) => {
  const C = GEN[(b.params || {}).gen];
  const fb = qa ? <AbsoluteFill style={{background: '#FF00FF'}} /> : <Fallback text={b.text || (b.params || {}).label || ''} t={t} vertical={vertical} />;
  const ff2 = (b.params || {}).flat_fallback;
  if (!C && ff2 && !qa) return <FlatShot p={ff2} words={b.words || []} len={len} vertical={vertical} />;
  if (!C) return <>{fb}</>;
  return <Boundary fallback={ff2 && !qa ? <FlatShot p={ff2} words={b.words || []} len={len} vertical={vertical} /> : fb}><AbsoluteFill><C {...genProps(b, t, len, vertical)} /></AbsoluteFill></Boundary>;
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
