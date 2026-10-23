// POV format (owner test, Oct 2026): painted scenes with the channel's signature character, a new image every ~2.5 s,
// slow Ken-Burns camera moves, short crossfades, one key-word headline at a time.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, Sequence} from 'remotion';
import {Headline} from './kit/Kit';

export type PovShot = {src: string; from: number; dur: number; move: number};
export type PovProps = {shots: PovShot[]; heads: {w: string[]; from: number}[]; frames: number};

const FADE = 7;
const MOVES = [
  {s0: 1.04, s1: 1.14, x0: 0, x1: -2, y0: 0, y1: -1},
  {s0: 1.14, s1: 1.04, x0: -2, x1: 1, y0: 1, y1: 0},
  {s0: 1.06, s1: 1.16, x0: 2, x1: -1, y0: -1, y1: 1},
  {s0: 1.10, s1: 1.20, x0: 0, x1: 0, y0: 2, y1: -2},
];

const Shot: React.FC<{s: PovShot}> = ({s}) => {
  const f = useCurrentFrame();
  const m = MOVES[s.move % MOVES.length];
  const t = Math.min(1, f / Math.max(1, s.dur + FADE));
  const sc = m.s0 + (m.s1 - m.s0) * t;
  const x = m.x0 + (m.x1 - m.x0) * t, y = m.y0 + (m.y1 - m.y0) * t;
  const o = interpolate(f, [0, FADE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, overflow: 'hidden'}}>
    <Img src={staticFile(s.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc}) translate(${x}%, ${y}%)`}} />
  </AbsoluteFill>;
};

export const Pov: React.FC<PovProps> = ({shots, heads}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {shots.map((s, i) => <Sequence key={i} from={s.from} durationInFrames={s.dur + FADE}><Shot s={s} /></Sequence>)}
    {/* soft dark band so the headline reads on any painting */}
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%)'}} />
    <AbsoluteFill>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Headline items={heads} w={1920} h={1080} font="F_anton" color="#FFFFFF" accentColor="#FFD21F" upper />
      </svg>
    </AbsoluteFill>
  </AbsoluteFill>
);

export const povMeta = ({props}: {props: PovProps}) => ({durationInFrames: Math.max(30, props.frames || 30)});
