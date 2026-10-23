// POV FLAT beat: MAX / objects as cut-outs on one flat colour + kinetic key words. Deterministic layout:
// the character zone and the text zone never overlap, cut-outs are fitted INSIDE their box (never cropped), no camera zoom.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, spring, interpolate} from 'remotion';

type Cut = {src: string; ar: number};
export type FlatParams = {bg: string; ink: string; keys: string[]; fx?: string; side?: 'left' | 'right'; cast?: Cut[]; props?: Cut[]};
type Box = {x: number; y: number; w: number; h: number};

const ACCENT = '#E4572E';
const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// largest font size whose greedy word-wrap fits the box (Anton caps ≈ 0.5 em per char, 0.28 em gaps)
export const fitText = (words: string[], w: number, h: number, max = 170, min = 56) => {
  for (let s = max; s >= min; s -= 6) {
    let lines = 1, cur = 0, ok = true;
    for (const wd of words) {
      const ww = wd.length * s * 0.5;
      if (ww > w) { ok = false; break; }
      if (cur === 0) cur = ww; else if (cur + s * 0.28 + ww <= w) cur += s * 0.28 + ww; else { lines++; cur = ww; }
    }
    if (ok && lines * s * 1.08 <= h) return s;
  }
  return min;
};

const fitBox = (ar: number, b: Box) => {          // contain, bottom-centred
  let h = b.h, w = h * ar;
  if (w > b.w) { w = b.w; h = w / ar; }
  return {x: b.x + (b.w - w) / 2, y: b.y + b.h - h, w, h};
};

const CutImg: React.FC<{c: Cut; box: Box; at: number; from: 'left' | 'right' | 'up' | 'pop'; shake?: number; seed: number}> = ({c, box, at, from, shake = 0, seed}) => {
  const f = useCurrentFrame();
  const r = fitBox(c.ar, box);
  const p = spring({frame: f - at, fps: 30, config: {damping: 14, stiffness: 150}});
  const dx = from === 'left' ? -(1 - p) * 300 : from === 'right' ? (1 - p) * 300 : 0;
  const dy = from === 'up' ? (1 - p) * 200 : 0;
  const sc = from === 'pop' ? 0.85 + 0.15 * Math.min(1, p) : 1;
  const bob = Math.sin((f + seed * 17) / 10) * Math.min(6, r.h * 0.008);       // tiny idle motion, stays inside the box margin
  const sh = shake ? Math.sin(f * 2.1) * shake * (f % 36 < 18 ? 1 : 0.15) : 0;
  return <Img src={staticFile(c.src)} style={{position: 'absolute', left: r.x + dx + sh, top: r.y + dy + bob, width: r.w, height: r.h,
    opacity: Math.min(1, p * 1.6), transform: `scale(${sc})`, transformOrigin: '50% 100%'}} />;
};

const Fx: React.FC<{kind?: string; box: Box; ink: string; ar: number}> = ({kind, box: zone, ink, ar}) => {
  const f = useCurrentFrame();
  if (!kind || kind === 'none') return null;
  const box = fitBox(ar, zone);                     // effects sit right next to MAX's head, inside his zone
  const cx = box.x + box.w * 0.5, top = Math.max(zone.y + 10, box.y - 30);
  const o = interpolate(f, [6, 14], [0, 1], cl);
  const pulse = 1 + 0.08 * Math.sin(f / 4);
  const g = (children: React.ReactNode) => <svg width={1920} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>{children}</svg>;
  const red = '#E4572E';
  if (kind === 'pain' || kind === 'shock') return g(<g transform={`translate(${cx + box.w * 0.28} ${top + 40}) scale(${pulse})`}>
    {[0, 1, 2].map((i) => <path key={i} d={`M${i * 34 - 34} 0 l10 -26 l10 26 l10 -26`} stroke={red} strokeWidth={9} fill="none" strokeLinecap="round"
      transform={`rotate(${(i - 1) * 22})`} />)}</g>);
  if (kind === 'sweat') return g(<path transform={`translate(${cx + box.w * 0.22} ${top + 60 + (f % 30)})`} d="M0 -26 Q18 2 0 16 Q-18 2 0 -26Z" fill="#6EC1FF" stroke={ink} strokeWidth={5} />);
  if (kind === 'idea') return g(<g transform={`translate(${cx + box.w * 0.3} ${top + 30}) scale(${pulse})`}>
    <circle r={34} fill="#FFD21F" stroke={ink} strokeWidth={7} />{[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={0} y1={-50} x2={0} y2={-68} stroke={ink} strokeWidth={7} transform={`rotate(${i * 60})`} />)}</g>);
  if (kind === 'question') return g(<text x={cx + box.w * 0.3} y={top + 70} fontFamily="F_anton" fontSize={110} fill={red} stroke={ink} strokeWidth={4}
    transform={`rotate(${Math.sin(f / 8) * 8} ${cx + box.w * 0.3} ${top + 30})`}>?</text>);
  if (kind === 'zzz') return g(<text x={cx + box.w * 0.28} y={top + 60 - (f % 40)} fontFamily="F_anton" fontSize={70} fill={ink}>Z z</text>);
  if (kind === 'heart') return g(<path transform={`translate(${cx + box.w * 0.3} ${top + 40}) scale(${2.2 * pulse})`} d="M0 8 C-14 -6 -10 -18 0 -10 C10 -18 14 -6 0 8Z" fill={red} stroke={ink} strokeWidth={2.5} />);
  return null;
};

const Keys: React.FC<{keys: string[]; times: number[]; box: Box; ink: string; align: 'left' | 'center'}> = ({keys, times, box, ink, align}) => {
  const f = useCurrentFrame();
  const size = fitText(keys, box.w, box.h);
  return <div style={{position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, display: 'flex', flexWrap: 'wrap',
    alignContent: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.28}px`, fontFamily: 'F_anton',
    fontSize: size, lineHeight: 1.08}}>
    {keys.map((k, i) => {
      const p = spring({frame: f - times[i], fps: 30, config: {damping: 11, stiffness: 200}});
      return <span key={i} style={{color: i === keys.length - 1 && keys.length > 1 ? ACCENT : (keys.length === 1 ? ACCENT : ink), display: 'inline-block',
        whiteSpace: 'nowrap', opacity: f < times[i] ? 0 : Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 60}px) scale(${0.75 + 0.25 * Math.min(1, p)})`}}>{k}</span>;
    })}
  </div>;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]/g, '');

export const FlatShot: React.FC<{p: FlatParams; words: [string, number][]; len: number; vertical: boolean}> = ({p, words, len, vertical}) => {
  const W = vertical ? 1080 : 1920, H = vertical ? 1520 : 1080;
  const cast = p.cast || [], props = p.props || [];
  const keys = (p.keys || []).slice(0, 4);
  // key word times: when the narrator says it, else spread over the first half
  const times = keys.map((k, i) => {
    const first = norm(k.split(' ')[0]);
    const hit = words.find((w) => first && (norm(w[0]).startsWith(first) || (first.length > 3 && first.startsWith(norm(w[0])))));
    return hit ? Math.max(2, hit[1] - 2) : 4 + Math.round((len * 0.5) * i / Math.max(1, keys.length));
  });
  let fig: Box, txt: Box;
  if (vertical) {
    txt = {x: 70, y: 90, w: W - 140, h: 380};
    fig = {x: 90, y: 520, w: W - 180, h: H - 560};
  } else {
    const L = p.side !== 'right';
    fig = {x: L ? 90 : 1010, y: 110, w: 820, h: 900};
    txt = {x: L ? 990 : 110, y: 200, w: 820, h: 680};
  }
  const any = cast.length + props.length;
  if (!any) txt = vertical ? {x: 70, y: 300, w: W - 140, h: 700} : {x: 160, y: 180, w: 1600, h: 720};
  const inBox = (box: Box, n: number, i: number, wfrac = 1): Box => ({x: box.x + box.w * i / n, y: box.y, w: box.w / n * wfrac, h: box.h});
  const shake = p.fx === 'pain' ? 3 : 0;
  return <AbsoluteFill style={{background: p.bg}}>
    {cast.length > 0 && props.length > 0 ? <>
      <CutImg c={cast[0]} box={{...fig, w: fig.w * 0.62}} at={0} from={p.side === 'right' ? 'right' : 'left'} shake={shake} seed={1} />
      <CutImg c={props[0]} box={{x: fig.x + fig.w * 0.64, y: fig.y + fig.h * 0.45, w: fig.w * 0.36, h: fig.h * 0.55}} at={10} from="pop" seed={2} />
    </> : cast.length > 0 ? <CutImg c={cast[0]} box={fig} at={0} from={p.side === 'right' ? 'right' : 'left'} shake={shake} seed={1} />
      : props.map((c, i) => <CutImg key={i} c={c} box={inBox(fig, props.length, i, 0.94)} at={i * 10} from="pop" seed={i + 3} />)}
    {cast.length > 0 && <Fx kind={p.fx} box={props.length ? {...fig, w: fig.w * 0.62} : fig} ink={p.ink} ar={cast[0].ar} />}
    <Keys keys={keys} times={times} box={txt} ink={p.ink} align={any ? (vertical ? 'center' : 'left') : 'center'} />
  </AbsoluteFill>;
};
