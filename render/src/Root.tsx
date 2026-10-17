import React from 'react';
import {Composition} from 'remotion';
import {Episode} from './Episode';
import {Props} from './theme';

const demo: Props = {kind: 'long', fps: 30, frames: 150, channel: 'Inside Your Body', title: 'demo', words: [],
  theme: {id: 'paper-ink', bg: '#F1EDE4', bg2: '#E6DFD1', fg: '#1B1B1B', muted: '#6B6457', accent: '#E3241B', accent2: '#E8B21C', accent3: '#22B573',
    fontHead: 'archivoblack', fontBody: 'inter', upper: true, pattern: 'grid', transition: 'slide', spring: [16, 140], radius: 18},
  beats: [{from: 0, to: 150, kind: 'kinetic', text: 'Your body is AMAZING'}]};

export const Root: React.FC = () => (
  <>
    <Composition id="Long" component={Episode as any} width={1920} height={1080} fps={30} durationInFrames={150} defaultProps={demo}
      calculateMetadata={({props}) => ({durationInFrames: (props as any).frames, fps: (props as any).fps})} />
    <Composition id="Short" component={Episode as any} width={1080} height={1920} fps={30} durationInFrames={150} defaultProps={{...demo, kind: 'short'}}
      calculateMetadata={({props}) => ({durationInFrames: (props as any).frames, fps: (props as any).fps})} />
  </>
);
