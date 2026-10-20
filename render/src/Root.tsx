import React from 'react';
import {Composition} from 'remotion';
import {Episode} from './Episode';
import {Props} from './theme';
import {ProtoIV} from './ProtoIV';
import {GenGallery} from './GenShot';
import {SampleStone, ThumbStone, SAMPLE_FRAMES} from './SampleStone';

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
    <Composition id="ProtoIV" component={ProtoIV as any} width={1920} height={1080} fps={30} durationInFrames={300} defaultProps={{fps: 30, frames: 300, sent: [], words: []}}
      calculateMetadata={({props}) => ({durationInFrames: (props as any).frames})} />
    <Composition id="SampleStone" component={SampleStone} width={1920} height={1080} fps={30} durationInFrames={SAMPLE_FRAMES} />
    <Composition id="ThumbStone" component={ThumbStone} width={1280} height={720} fps={30} durationInFrames={1} />
    <Composition id="GenGallery" component={GenGallery as any} width={1920} height={1080} fps={30} durationInFrames={60}
      defaultProps={{items: [], slot: 60, theme: demo.theme, vertical: false}}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, (props as any).items.length * (props as any).slot)})} />
    <Composition id="GenGalleryV" component={GenGallery as any} width={1080} height={1520} fps={30} durationInFrames={60}
      defaultProps={{items: [], slot: 60, theme: demo.theme, vertical: true}}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, (props as any).items.length * (props as any).slot)})} />
  </>
);
