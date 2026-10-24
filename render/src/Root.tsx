import React from 'react';
import {Composition} from 'remotion';
import {Episode} from './Episode';
import {Props} from './theme';
import {ProtoIV} from './ProtoIV';
import {GenGallery} from './GenShot';
import {SampleStone, ThumbStone, SAMPLE_FRAMES} from './SampleStone';
import {PoseSheet} from './PoseSheet';
import {GenThumb, ThumbT} from './ThumbGen';
import {ThumbPro} from './ThumbPro';
import {Pov, povMeta} from './Pov';
import {PovFlat, povFlatMeta} from './PovFlat';
import {ThumbMax} from './ThumbMax';
import {MaxDemo, MaxSheetDemo} from './MaxDemo';
import {SugarTimeline, sugarMeta} from './Timeline';
import {TLEpisode, tlMeta} from './TLEpisode';
import {ThumbTL} from './ThumbTL';
import {StyleDemo, Thumb, DEMO_ORDER, DEMO_LEN} from './StyleDemo';

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
    <Composition id="StyleDemo" component={StyleDemo} width={1920} height={1080} fps={30} durationInFrames={DEMO_ORDER.length * DEMO_LEN} />
    <Composition id="Thumb1" component={Thumb as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{v: 1}} />
    <Composition id="Thumb2" component={Thumb as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{v: 2}} />
    <Composition id="Thumb3" component={Thumb as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{v: 3}} />
    <Composition id="PoseSheet" component={PoseSheet} width={1920} height={1080} fps={30} durationInFrames={1} />
    <Composition id="Pov" component={Pov as any} width={1920} height={1080} fps={30} durationInFrames={300} calculateMetadata={povMeta as any} defaultProps={{shots: [], heads: [], frames: 300}} />
    <Composition id="PovFlat" component={PovFlat as any} width={1920} height={1080} fps={30} durationInFrames={300} calculateMetadata={povFlatMeta as any} defaultProps={{beats: [], frames: 300}} />
    <Composition id="ThumbMax" component={ThumbMax as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{line1: "KIDNEY STONES", line2: "HOW THEY GROW SILENTLY", bg: "#0F2A4A", glow: "#2F7DD1"}} />
    <Composition id="MaxDemo" component={MaxDemo} width={1920} height={1080} fps={30} durationInFrames={480} />
    <Composition id="MaxSheetDemo" component={MaxSheetDemo} width={1920} height={1080} fps={30} durationInFrames={1} />
    <Composition id="SugarTimeline" component={SugarTimeline as any} width={1920} height={1080} fps={30} durationInFrames={1500} calculateMetadata={sugarMeta as any} defaultProps={{seg: [], frames: 1500}} />
    <Composition id="TLLong" component={TLEpisode as any} width={1920} height={1080} fps={30} durationInFrames={300} calculateMetadata={tlMeta as any} defaultProps={{beats: [], marks: [], frames: 300}} />
    <Composition id="TLShort" component={TLEpisode as any} width={1080} height={1920} fps={30} durationInFrames={300} calculateMetadata={tlMeta as any} defaultProps={{beats: [], marks: [], frames: 300, vertical: true}} />
    <Composition id="ThumbTL" component={ThumbTL as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{number: "30 DAYS", words: "NO SUGAR", v: 0}} />
    <Composition id="ThumbPro" component={ThumbPro} width={1920} height={1080} fps={30} durationInFrames={1} />
    <Composition id="GenThumb" component={GenThumb as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{id: 't_main', kit: 'flat'}} />
    <Composition id="ThumbT" component={ThumbT as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{lines: ['KIDNEY STONE', 'WORST PAIN', 'EVER?'], title: 'kidney stone'}} />
    <Composition id="GenGallery" component={GenGallery as any} width={1920} height={1080} fps={30} durationInFrames={60}
      defaultProps={{items: [], slot: 60, theme: demo.theme, vertical: false}}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, (props as any).items.length * (props as any).slot)})} />
    <Composition id="GenGalleryV" component={GenGallery as any} width={1080} height={1520} fps={30} durationInFrames={60}
      defaultProps={{items: [], slot: 60, theme: demo.theme, vertical: true}}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, (props as any).items.length * (props as any).slot)})} />
  </>
);
