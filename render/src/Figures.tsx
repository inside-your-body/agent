import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Theme, alpha} from './theme';

// ---------- Stick figure with simple poses ----------
type Pose = {la: number; ra: number; ll: number; rl: number; lean: number; bob: number; head?: number};
const POSES: Record<string, (t: number) => Pose> = {
  idle: (t) => ({la: 140 + Math.sin(t) * 4, ra: 220 - Math.sin(t) * 4, ll: 158, rl: 202, lean: 0, bob: Math.sin(t) * 2}),
  walk: (t) => ({la: 180 + Math.sin(t * 3) * 35, ra: 180 - Math.sin(t * 3) * 35, ll: 180 - Math.sin(t * 3) * 30, rl: 180 + Math.sin(t * 3) * 30, lean: 4, bob: Math.abs(Math.sin(t * 3)) * 4}),
  run: (t) => ({la: 180 + Math.sin(t * 5) * 60, ra: 180 - Math.sin(t * 5) * 60, ll: 180 - Math.sin(t * 5) * 50, rl: 180 + Math.sin(t * 5) * 50, lean: 14, bob: Math.abs(Math.sin(t * 5)) * 8}),
  happy: (t) => ({la: 40 + Math.sin(t * 4) * 15, ra: 320 - Math.sin(t * 4) * 15, ll: 165, rl: 195, lean: 0, bob: Math.abs(Math.sin(t * 4)) * 10}),
  sad: (t) => ({la: 150, ra: 210, ll: 160, rl: 200, lean: -8, bob: 0, head: 12 + Math.sin(t) * 2}),
  point: (t) => ({la: 145, ra: 270 + Math.sin(t * 2) * 5, ll: 158, rl: 202, lean: 0, bob: Math.sin(t) * 2}),
  think: (t) => ({la: 145, ra: 320, ll: 160, rl: 200, lean: 0, bob: Math.sin(t) * 1.5, head: -8}),
  tired: (t) => ({la: 150, ra: 210, ll: 158, rl: 202, lean: -6 + Math.sin(t) * 3, bob: 0, head: 12}),
  drink: (t) => ({la: 145, ra: 320 + Math.sin(t * 2) * 8, ll: 160, rl: 200, lean: -4, bob: 0, head: -14}),
};
export const STICK_POSES = Object.keys(POSES);

const limb = (x: number, y: number, ang: number, len: number) => {
  const r = (ang * Math.PI) / 180;
  return [x + Math.sin(r) * len, y - Math.cos(r) * len] as const;
};

export const Stickman: React.FC<{pose?: string; color: string; size: number; accent?: string; prop?: string}> = ({pose = 'idle', color, size, accent, prop}) => {
  const f = useCurrentFrame();
  const p = (POSES[pose] || POSES.idle)(f / 15);
  const W = 6;
  const hipY = 120 - p.bob, shY = 64 - p.bob;
  const [lhx, lhy] = limb(100, shY, p.la, 48);
  const [rhx, rhy] = limb(100, shY, p.ra, 48);
  const [lfx, lfy] = limb(100, hipY, p.ll, 60);
  const [rfx, rfy] = limb(100, hipY, p.rl, 60);
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{overflow: 'visible'}}>
      <g transform={`rotate(${p.lean} 100 ${hipY})`} stroke={color} strokeWidth={W} strokeLinecap="round" fill="none">
        <circle cx={100} cy={40 - p.bob} r={18} fill={alpha(color, 0.06)} transform={`rotate(${p.head || 0} 100 ${shY})`} />
        <line x1={100} y1={shY - 6} x2={100} y2={hipY} />
        <line x1={100} y1={shY} x2={lhx} y2={lhy} />
        <line x1={100} y1={shY} x2={rhx} y2={rhy} />
        <line x1={100} y1={hipY} x2={lfx} y2={lfy} />
        <line x1={100} y1={hipY} x2={rfx} y2={rfy} />
        {prop === 'glass' && <path d={`M${rhx - 8} ${rhy - 16} h16 l-3 18 h-10 z`} stroke={accent || color} strokeWidth={4} />}
        {prop === 'phone' && <rect x={rhx - 7} y={rhy - 18} width={14} height={22} rx={3} stroke={accent || color} strokeWidth={4} />}
        {prop === 'cigarette' && <line x1={rhx} y1={rhy} x2={rhx + 16} y2={rhy - 4} stroke={accent || color} strokeWidth={4} />}
      </g>
    </svg>
  );
};

// ---------- Human body silhouette with highlightable organs ----------
const ORGANS: Record<string, {x: number; y: number; rx: number; ry: number}> = {
  brain: {x: 100, y: 32, rx: 16, ry: 12}, eyes: {x: 100, y: 40, rx: 12, ry: 4}, mouth: {x: 100, y: 54, rx: 7, ry: 3},
  throat: {x: 100, y: 70, rx: 6, ry: 8}, lungs: {x: 100, y: 110, rx: 30, ry: 22}, heart: {x: 106, y: 116, rx: 10, ry: 10},
  liver: {x: 88, y: 140, rx: 20, ry: 10}, stomach: {x: 112, y: 145, rx: 14, ry: 11}, pancreas: {x: 104, y: 156, rx: 14, ry: 4},
  kidneys: {x: 100, y: 160, rx: 26, ry: 8}, intestines: {x: 100, y: 180, rx: 24, ry: 16}, bladder: {x: 100, y: 206, rx: 10, ry: 7},
  bones: {x: 112, y: 250, rx: 8, ry: 26}, muscles: {x: 72, y: 150, rx: 12, ry: 30}, skin: {x: 128, y: 150, rx: 10, ry: 10},
  blood: {x: 100, y: 120, rx: 14, ry: 14}, gut: {x: 100, y: 180, rx: 24, ry: 16}, immune: {x: 100, y: 120, rx: 16, ry: 16},
};
export const ORGAN_NAMES = Object.keys(ORGANS);
const BODY = 'M100 14 C114 14 122 26 122 40 C122 54 114 64 106 66 L106 74 C124 76 140 82 146 96 L156 170 C158 180 152 184 148 176 L136 120 L134 200 L130 300 C130 310 118 310 118 300 L110 210 L100 210 L90 210 L82 300 C82 310 70 310 70 300 L66 200 L64 120 L52 176 C48 184 42 180 44 170 L54 96 C60 82 76 76 94 74 L94 66 C86 64 78 54 78 40 C78 26 86 14 100 14 Z';

export const BodyMap: React.FC<{organ?: string | null; t: Theme; height: number; progress: number}> = ({organ, t, height, progress}) => {
  const f = useCurrentFrame();
  const key = Object.keys(ORGANS).find((k) => (organ || '').toLowerCase().includes(k.replace(/s$/, ''))) || 'heart';
  const o = ORGANS[key];
  const pulse = 1 + Math.sin(f / 6) * 0.08;
  return (
    <svg viewBox="0 0 200 320" height={height} style={{overflow: 'visible'}}>
      <path d={BODY} fill={alpha(t.fg, 0.06)} stroke={t.fg} strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - progress} />
      <ellipse cx={o.x} cy={o.y} rx={o.rx * pulse * 1.8} ry={o.ry * pulse * 1.8} fill={alpha(t.accent, 0.18 * progress)} />
      <ellipse cx={o.x} cy={o.y} rx={o.rx * pulse} ry={o.ry * pulse} fill={alpha(t.accent, 0.85 * progress)} />
      <line x1={o.x + o.rx + 4} y1={o.y} x2={178} y2={o.y} stroke={t.accent} strokeWidth={1.5} opacity={progress} />
      <text x={180} y={o.y + 4} fontSize={11} fill={t.fg} fontFamily="F_inter" fontWeight={800} opacity={progress}>{key.toUpperCase()}</text>
    </svg>
  );
};
