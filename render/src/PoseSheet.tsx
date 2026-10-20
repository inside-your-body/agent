import React from 'react';
import {AbsoluteFill} from 'remotion';
import {POSES} from './kit/Kit';
import {STYLES, Hero} from './kit/Styles';
export const PoseSheet: React.FC = () => <AbsoluteFill><svg width={1920} height={1080}>
  <rect width={1920} height={1080} fill="#13233B" />
  {Object.keys(POSES).map((k, i) => <g key={k}>
    <Hero s={STYLES.flat} x={140 + (i % 8) * 230} y={460 + Math.floor(i / 8) * 520} scale={0.95} pose={POSES[k]} mood={i % 2 ? 'pain' : 'happy'} />
    <text x={140 + (i % 8) * 230} y={500 + Math.floor(i / 8) * 520} fill="#fff" fontSize={30} textAnchor="middle">{k}</text></g>)}
</svg></AbsoluteFill>;
