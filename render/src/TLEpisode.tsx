// The channel format (owner approved, Oct 24): "what happens inside your body" told on a timeline.
// Dark navy + teal hologram body (organs light up), yellow time stamps, a timeline bar, one code-drawn widget per sentence,
// kinetic key words. Everything is code — deterministic layout, nothing overlaps. Long = 1920x1080, Short = 1080x1920.
import React from 'react';
import {AbsoluteFill, useCurrentFrame, spring, interpolate} from 'remotion';
import {Anatomy, PARTS, Organ} from './kit/Anatomy';
import {TL, BigStamp, Words, TimeBar} from './Timeline';
import {ICONS} from './Icons';

const cl = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const sp = (f: number, at: number, d = 13, s = 170) => Math.min(1.08, spring({frame: f - at, fps: 30, config: {damping: d, stiffness: s}}));
const GOOD = '#36E0D0', BAD = '#FF5A4E', GOLD = '#FFD23F';

const EXTRA: Record<string, string> = {
  soda: 'M34 18 H66 L62 90 H38 Z M36 34 H64 M44 18 L52 4 H62',
  burger: 'M16 44 C16 22 84 22 84 44 Z M12 54 H88 M14 62 C30 70 70 70 86 62 M18 72 H82 C82 82 18 82 18 72 Z',
  candy: 'M30 50 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 M30 50 L8 36 L8 64 Z M70 50 L92 36 L92 64 Z M48 50 H52',
  dumbbell: 'M10 40 V60 M20 30 V70 M80 30 V70 M90 40 V60 M20 50 H80',
  fire: 'M50 92 C26 92 18 70 26 54 C30 46 38 42 36 30 C48 36 52 46 50 56 C58 50 60 40 58 28 C74 40 82 60 76 74 C72 86 62 92 50 92 Z',
  cake: 'M14 56 H86 V88 H14 Z M14 70 C30 78 40 62 50 70 C60 78 70 62 86 70 M50 56 V40 M50 30 C46 26 50 18 50 18 C50 18 54 26 50 30',
  bread: 'M14 46 C14 26 86 26 86 46 C86 52 80 54 80 58 V86 H20 V58 C20 54 14 52 14 46 Z',
  steps: 'M30 70 C22 70 20 56 24 46 C28 36 40 36 40 48 C40 60 38 70 30 70 Z M66 54 C58 54 56 40 60 30 C64 20 76 20 76 32 C76 44 74 54 66 54 Z',
  ice: 'M50 8 V92 M14 30 L86 70 M86 30 L14 70 M42 14 L50 22 L58 14 M42 86 L50 78 L58 86',
  meat: 'M30 30 C50 10 86 24 82 50 C78 74 50 82 36 70 C30 66 30 60 24 62 L12 74 L6 68 L18 56 C20 50 14 46 30 30 Z',
  fish: 'M14 50 C30 26 66 26 80 50 C66 74 30 74 14 50 Z M80 50 L94 36 V64 Z M30 46 V46',
  egg: 'M50 10 C30 10 18 46 18 62 C18 80 32 92 50 92 C68 92 82 80 82 62 C82 46 70 10 50 10 Z',
  milk: 'M36 8 H64 V22 L74 36 V92 H26 V36 L36 22 Z M26 52 H74',
  sweat: 'M50 12 C40 30 28 46 28 60 C28 74 38 84 50 84 C62 84 72 74 72 60 C72 46 60 30 50 12 Z',
  battery: 'M10 30 H82 V70 H10 Z M82 42 H92 V58 H82 M20 40 V60 M32 40 V60 M44 40 V60',
  calendar: 'M14 22 H86 V88 H14 Z M14 40 H86 M32 12 V30 M68 12 V30 M30 56 H40 M46 56 H56 M62 56 H72 M30 72 H40 M46 72 H56',
  bacteria: 'M30 34 C40 20 78 30 74 54 C70 76 34 80 26 62 C22 52 24 42 30 34 Z M40 46 V46 M56 56 V56 M74 54 L90 60 M30 34 L20 20 M50 78 L50 92',
  muscle: 'M20 70 C20 50 30 36 44 30 C52 26 56 18 64 18 C72 18 74 28 68 34 C62 40 58 46 62 54 C70 50 82 52 84 62 C86 74 74 84 56 84 H30 C24 84 20 78 20 70 Z',
  skin: 'M10 40 C30 30 70 50 90 40 M10 56 C30 46 70 66 90 56 M10 72 C30 62 70 82 90 72',
};
const iconPath = (n: string) => ICONS[n] || EXTRA[n] || ICONS.check;

export type Visual =
  | {type: 'stat'; value: number; prefix?: string; unit?: string; label: string; good?: boolean}
  | {type: 'meter'; label: string; from: number; to: number; good?: boolean}
  | {type: 'wave'; label: string; calm: boolean}
  | {type: 'compare'; a: {label: string; value: number}; b: {label: string; value: number}; unit?: string}
  | {type: 'icon'; name: string; cross?: boolean; count?: number; label?: string}
  | {type: 'clock'; from: string; to: string}
  | {type: 'checklist'; items: string[]; bad?: boolean}
  | {type: 'cells'; kind: string; action: 'grow' | 'shrink' | 'attack' | 'flow'; label?: string}
  | {type: 'organ'; name: string; state?: 'healthy' | 'inflamed' | 'fatty' | 'damaged' | 'healing'; label?: string}
  | {type: 'question'; text: string}
  | {type: 'versus'; myth: string; fact: string}
  | {type: 'battery'; from: number; to: number; label?: string};

export type TLBeat = {start: number; end: number; stage: string | null; stageIdx: number; organ: string; visual: Visual; words: string[]};
export type TLEpProps = {beats: TLBeat[]; marks: string[]; frames: number; vertical?: boolean; title?: string};

const Label: React.FC<{y: number; text?: string; o?: number}> = ({y, text, o = 1}) => text ?
  <text x={0} y={y} textAnchor="middle" fontFamily="F_inter" fontWeight={800} fontSize={28} letterSpacing={5} fill={TL.mute} opacity={o}>{text.toUpperCase().slice(0, 34)}</text> : null;

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : (Math.abs(v) < 10 && v % 1 ? v.toFixed(1) : String(Math.round(v))));

// every widget draws inside a ±380 x ±230 box around (0,0)
const Widget: React.FC<{v: Visual; f: number; at: number; dur: number}> = ({v, f, at, dur}) => {
  const p = sp(f, at), t = interpolate(f, [at + 6, at + Math.min(70, dur * 0.7)], [0, 1], {...cl, easing: (x) => 1 - Math.pow(1 - x, 3)});
  const pulse = 0.5 + 0.5 * Math.sin(f / 6);
  switch (v.type) {
    case 'stat': {
      const col = v.good === false ? BAD : v.good ? GOOD : GOLD;
      const val = fmt((v.value || 0) * t);
      return <g opacity={Math.min(1, p * 1.5)}><Label y={275} text={v.label} /><g transform={`scale(${0.7 + 0.3 * p})`}>
        <circle r={210} fill="none" stroke={col} strokeOpacity={0.15} strokeWidth={30} />
        <circle r={210} fill="none" stroke={col} strokeWidth={6} pathLength={1} strokeDasharray={`${t} 1`} transform="rotate(-90)" strokeLinecap="round" />
        <text y={40} textAnchor="middle" fontFamily="F_anton" fontSize={(v.prefix || '').length + val.length + (v.unit || '').length > 7 ? 110 : 150} fill={col}>
          {v.prefix || ''}{val}<tspan fontSize={60} dx={8}>{v.unit || ''}</tspan></text>
      </g></g>;
    }
    case 'meter': {
      const col = v.good ? GOOD : BAD; const val = v.from + (v.to - v.from) * t;
      return <g opacity={Math.min(1, p * 1.5)}>
        <Label y={-80} text={v.label} />
        <rect x={-340} y={-40} width={680} height={80} rx={40} fill={TL.bg2} stroke={TL.mute} strokeWidth={3} />
        <rect x={-332} y={-32} width={Math.max(0, 664 * Math.min(1, Math.max(0, val)))} height={64} rx={32} fill={col} />
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={-340 + 680 * k} x2={-340 + 680 * k} y1={50} y2={66} stroke={TL.mute} strokeWidth={3} />)}
        <text y={150} textAnchor="middle" fontFamily="F_anton" fontSize={90} fill={col}>{Math.round(val * 100)}%</text>
      </g>;
    }
    case 'wave': {
      const calm = v.calm ? t : 1 - t;
      let d = 'M-340 40';
      for (let i = 0; i <= 68; i++) {
        const x = -340 + i * 10; const spike = Math.max(0, Math.sin(i * 0.55 + f / 8)) ** 8 * 200;
        d += ` L${x} ${40 - spike * (1 - calm) - 26 * Math.sin(i * 0.25 + f / 20)}`;
      }
      return <g opacity={Math.min(1, p * 1.5)}>
        <rect x={-370} y={-200} width={740} height={320} rx={24} fill={TL.bg2} opacity={0.6} />
        {[-140, -60, 20, 100].map((y) => <line key={y} x1={-350} x2={350} y1={y} y2={y} stroke={TL.mute} strokeOpacity={0.25} />)}
        <path d={d} stroke={calm > 0.5 ? GOOD : BAD} strokeWidth={7} fill="none" strokeLinejoin="round" />
        <Label y={180} text={v.label} />
      </g>;
    }
    case 'compare': {
      const mx = Math.max(1e-6, Math.abs(v.a.value), Math.abs(v.b.value));
      const row = (r: {label: string; value: number}, y: number, col: string, d: number) => {
        const k = interpolate(f, [at + 8 + d, at + 50 + d], [0, 1], cl);
        return <g key={y}>
          <text x={-340} y={y - 22} fontFamily="F_inter" fontWeight={800} fontSize={38} letterSpacing={3} fill={TL.ink}>{r.label.toUpperCase().slice(0, 26)}</text>
          <rect x={-340} y={y} width={520 * Math.abs(r.value) / mx * k} height={60} rx={12} fill={col} />
          <text x={-340 + 520 * Math.abs(r.value) / mx * k + 20} y={y + 48} fontFamily="F_anton" fontSize={52} fill={col}>{fmt(r.value * k)}{v.unit || ''}</text>
        </g>;
      };
      return <g opacity={Math.min(1, p * 1.5)}>{row(v.a, -110, BAD, 0)}{row(v.b, 70, GOOD, 14)}</g>;
    }
    case 'icon': {
      const n = Math.min(8, Math.max(1, v.count || 1));
      const one = (x: number, y: number, s: number, k: number, key: number) =>
        <g key={key} transform={`translate(${x} ${y}) scale(${s * k}) translate(-50 -50)`}>
          <path d={iconPath(v.name)} fill="none" stroke={GOLD} strokeWidth={14 / s} opacity={0.18} strokeLinecap="round" strokeLinejoin="round" />
          <path d={iconPath(v.name)} fill="none" stroke={v.cross ? TL.ink : GOLD} strokeWidth={5 / Math.max(1, s / 3)} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, k)} />
        </g>;
      return <g>
        <circle r={190 + 6 * pulse} fill={GOLD} opacity={0.06} />
        <circle r={190} fill="none" stroke={GOLD} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="4 12" transform={`rotate(${f})`} />
        {n === 1 ? one(0, -10, 3.2, p, 0) :
          Array.from({length: n}).map((_, i) => one(-255 + (i % 4) * 170, -130 + Math.floor(i / 4) * 140, 0.95, sp(f, at + i * 4), i))}
        {v.cross && <g opacity={sp(f, at + 18)} stroke={BAD} strokeWidth={22} strokeLinecap="round">
          <line x1={-150} y1={-150} x2={-150 + 300 * sp(f, at + 18)} y2={-150 + 300 * sp(f, at + 18)} />
          <line x1={150} y1={-150} x2={150 - 300 * sp(f, at + 24)} y2={-150 + 300 * sp(f, at + 24)} /></g>}
        <Label y={230} text={v.label} />
      </g>;
    }
    case 'clock': {
      const mins = (s: string) => { const m = /(\d+):(\d+)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : 0; };
      let a = mins(v.from), b = mins(v.to); if (b < a) b += 24 * 60;
      const cur = a + (b - a) * t; const h = Math.floor(cur / 60) % 24, m = Math.floor(cur % 60);
      return <g opacity={Math.min(1, p * 1.5)}>
        <circle r={170} fill={TL.bg2} stroke={GOOD} strokeWidth={6} />
        {Array.from({length: 12}).map((_, i) => <line key={i} x1={0} y1={-150} x2={0} y2={-130} stroke={TL.ink} strokeWidth={5} transform={`rotate(${i * 30})`} />)}
        <line x1={0} y1={0} x2={0} y2={-90} stroke={TL.ink} strokeWidth={10} strokeLinecap="round" transform={`rotate(${(cur / 60) * 30})`} />
        <line x1={0} y1={0} x2={0} y2={-130} stroke={GOLD} strokeWidth={6} strokeLinecap="round" transform={`rotate(${cur * 6})`} />
        <circle r={10} fill={GOLD} />
        <text x={0} y={250} textAnchor="middle" fontFamily="F_anton" fontSize={60} fill={GOLD}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</text>
      </g>;
    }
    case 'checklist': {
      const items = (v.items || []).slice(0, 4);
      return <g>{items.map((it, i) => {
        const k = sp(f, at + 6 + i * 12); const y = -((items.length - 1) * 130) / 2 + i * 130;
        return <g key={i} opacity={Math.min(1, k * 1.5)} transform={`translate(${(1 - Math.min(1, k)) * 80} 0)`}>
          <rect x={-370} y={y - 56} width={740} height={112} rx={20} fill={TL.bg2} stroke={v.bad ? BAD : GOOD} strokeOpacity={0.5} strokeWidth={3} />
          <g transform={`translate(-310 ${y}) scale(0.5) translate(-50 -50)`}>
            <path d={v.bad ? ICONS.cross : ICONS.check} fill="none" stroke={v.bad ? BAD : GOOD} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" /></g>
          <text x={-240} y={y + 20} fontFamily="F_inter" fontWeight={800} fontSize={54} fill={TL.ink}>{it.slice(0, 26)}</text>
        </g>;
      })}</g>;
    }
    case 'cells': {
      const col = /fat|lipid|chol/.test(v.kind) ? GOLD : /virus|bacter|germ|cancer|plaque|toxin|inflam/.test(v.kind) ? BAD
        : /sugar|glucose|insulin/.test(v.kind) ? '#FFFFFF' : /blood|red/.test(v.kind) ? '#FF5A6E' : GOOD;
      const N = 26;
      return <g opacity={Math.min(1, p * 1.5)}>
        <defs><clipPath id="lens"><circle r={220} /></clipPath></defs>
        <circle r={224} fill="#0A1426" stroke={GOOD} strokeWidth={6} />
        <g clipPath="url(#lens)">
          {Array.from({length: N}).map((_, i) => {
            const bx = ((i * 137) % 400) - 200, by = ((i * 89) % 400) - 200;
            let x = bx + Math.sin(f / 30 + i) * 14, y = by + Math.cos(f / 25 + i * 2) * 14, r = 16 + (i % 4) * 4, o = 1;
            if (v.action === 'flow') { x = ((bx + f * 4 + 220) % 440) - 220; }
            if (v.action === 'grow') r *= 0.6 + 1.0 * t;
            if (v.action === 'shrink') { r *= 1.4 - 0.9 * t; o = 1 - 0.5 * t; }
            const hit = v.action === 'attack' && i % 3 === 0;
            return <g key={i} opacity={hit ? 1 - t : o}>
              <circle cx={x} cy={y} r={r} fill={col} fillOpacity={0.35} stroke={col} strokeWidth={3} />
              {/virus|bacter|germ/.test(v.kind) && [0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={x} y1={y} x2={x + Math.cos(k) * (r + 9)} y2={y + Math.sin(k) * (r + 9)} stroke={col} strokeWidth={3} />)}
            </g>;
          })}
          {v.action === 'attack' && [0, 1, 2].map((i) => {
            const k = interpolate(f, [at + i * 15, at + 40 + i * 15], [0, 1], cl);
            return <circle key={i} cx={-240 + 360 * k + i * 40} cy={-60 + i * 70} r={34} fill="#FFFFFF" fillOpacity={0.9} stroke={GOOD} strokeWidth={5} />;
          })}
        </g>
        <circle r={224} fill="none" stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth={18} />
        <Label y={280} text={v.label || v.kind} />
      </g>;
    }
    case 'organ': {
      const part = PARTS[v.name === 'kidney' ? 'kidneys' : v.name === 'lung' ? 'lungs' : v.name === 'intestine' || v.name === 'intestines' ? 'gut' : v.name] || PARTS.heart;
      const st = v.state || 'healthy';
      const s = v.name === 'brain' ? 2.6 : v.name === 'gut' || v.name === 'lungs' || v.name === 'lung' ? 1.5 : 2.4;
      const tint = st === 'inflamed' || st === 'damaged' ? BAD : st === 'fatty' ? GOLD : null;
      return <g opacity={Math.min(1, p * 1.5)}>
        <circle r={224} fill="#0A1426" stroke={GOOD} strokeWidth={6} />
        <circle r={224 + 14 * pulse} fill="none" stroke={GOOD} strokeOpacity={0.2} strokeWidth={3} />
        <g transform={`scale(${s * (0.9 + 0.1 * p) * (1 + 0.015 * pulse)}) translate(${-part.cx} ${-part.cy})`}>
          {(part.tube || []).map((tb, i) => <path key={i} d={tb.d} stroke={part.c} strokeWidth={tb.w} fill="none" strokeLinecap="round" />)}
          {part.fill.map((d, i) => <path key={i} d={d} fill={part.c} stroke="#fff" strokeWidth={1.2} />)}
          {(part.detail || []).map((d, i) => <path key={i} d={d} stroke={part.c2} strokeWidth={1.5} fill="none" />)}
          {tint && Array.from({length: 9}).map((_, i) => <circle key={i} cx={part.cx + ((i * 23) % 60) - 30} cy={part.cy + ((i * 37) % 40) - 20}
            r={(st === 'fatty' ? 5 : 4) * (st === 'healing' ? 1 - t : t)} fill={tint} opacity={0.85} />)}
        </g>
        {st === 'healing' && <circle r={200} fill="none" stroke={GOOD} strokeWidth={8} pathLength={1} strokeDasharray={`${t} 1`} transform="rotate(-90)" />}
        <Label y={280} text={v.label || `${v.name} · ${st}`} />
      </g>;
    }
    case 'question':
      return <g opacity={Math.min(1, p * 1.5)} transform={`scale(${0.8 + 0.2 * p})`}>
        <text y={60} textAnchor="middle" fontFamily="F_anton" fontSize={300} fill={GOLD} opacity={0.15} transform={`rotate(${Math.sin(f / 15) * 6})`}>?</text>
        <foreignObject x={-360} y={-120} width={720} height={240}>
          <div style={{width: 720, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontFamily: 'F_anton', fontSize: (v.text || '').length > 40 ? 52 : 66, lineHeight: 1.1, color: TL.ink}}>{v.text}</div>
        </foreignObject>
      </g>;
    case 'versus': {
      const k2 = sp(f, at + 25);
      const card = (x: number, title: string, txt: string, col: string, k: number) =>
        <g transform={`translate(${x} 0) scale(${0.85 + 0.15 * Math.min(1, k)})`} opacity={Math.min(1, k * 1.5)}>
          <rect x={-185} y={-210} width={370} height={420} rx={24} fill={TL.bg2} stroke={col} strokeWidth={4} />
          <text y={-120} textAnchor="middle" fontFamily="F_anton" fontSize={64} fill={col}>{title}</text>
          <foreignObject x={-165} y={-90} width={330} height={290}>
            <div style={{fontFamily: 'F_inter', fontWeight: 800, fontSize: txt.length > 60 ? 36 : 44, lineHeight: 1.2, color: TL.ink, textAlign: 'center'}}>{txt}</div>
          </foreignObject>
        </g>;
      return <g>{card(-195, 'MYTH', v.myth || '', BAD, p)}{card(195, 'FACT', v.fact || '', GOOD, k2)}</g>;
    }
    case 'battery': {
      const val = v.from + (v.to - v.from) * t; const col = val < 0.3 ? BAD : val < 0.6 ? GOLD : GOOD;
      return <g opacity={Math.min(1, p * 1.5)}>
        <rect x={-260} y={-110} width={480} height={220} rx={30} fill="none" stroke={TL.ink} strokeWidth={12} />
        <rect x={220} y={-44} width={30} height={88} rx={8} fill={TL.ink} />
        <rect x={-238} y={-88} width={436 * Math.max(0.02, Math.min(1, val))} height={176} rx={16} fill={col} opacity={0.85 + 0.15 * pulse} />
        <text y={200} textAnchor="middle" fontFamily="F_anton" fontSize={70} fill={col}>{Math.round(val * 100)}%</text>
        <Label y={250} text={v.label} />
      </g>;
    }
  }
  return null;
};

const ORG_OK = new Set(['brain', 'heart', 'lungs', 'liver', 'stomach', 'pancreas', 'gut', 'kidneys', 'bladder', 'vessels', 'fat', 'none']);
const normOrg = (o: string): Organ => {
  const m: Record<string, string> = {lung: 'lungs', kidney: 'kidneys', intestine: 'gut', intestines: 'gut', colon: 'gut', blood: 'vessels', arteries: 'vessels', veins: 'vessels', belly: 'fat'};
  const x = m[o] || o; return (ORG_OK.has(x) ? x : 'none') as Organ;
};

export const TLEpisode: React.FC<TLEpProps> = ({beats, marks, vertical}) => {
  const f = useCurrentFrame();
  let i = beats.findIndex((b) => f >= b.start && f < b.end); if (i < 0) i = f < (beats[0]?.start || 0) ? 0 : beats.length - 1;
  const b = beats[i]; if (!b) return <AbsoluteFill style={{background: TL.bg}} />;
  // the organ glow and stamp only restart when they actually change
  let orgAt = b.start; for (let j = i; j > 0 && beats[j - 1].organ === b.organ; j--) orgAt = beats[j - 1].start;
  let stAt = b.start; for (let j = i; j > 0 && beats[j - 1].stage === b.stage; j--) stAt = beats[j - 1].start;
  const out = interpolate(f, [b.end - 6, b.end], [1, 0], cl);
  const dur = b.end - b.start;
  const W = vertical ? 1080 : 1920, H = vertical ? 1920 : 1080;
  const bodyOn = interpolate(f, [0, 20], [0, 1], cl);
  const hasMarks = marks.length > 1 && b.stageIdx >= 0;
  const L = vertical
    ? {body: [540, 655, 0.65], stamp: [80, 240, 130], wid: [540, 1150, 0.8], words: [80, 1490, 72, 900]}
    : {body: [470, 500, 0.86], stamp: [990, 200, 150], wid: [1350, b.stage ? 500 : 430, 0.92], words: [990, b.stage ? 830 : 800, 70, 860]};
  return <AbsoluteFill style={{background: `radial-gradient(circle at ${vertical ? '50% 38%' : '26% 50%'}, #15254A 0%, ${TL.bg} 68%)`}}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {Array.from({length: Math.ceil(W / 120)}).map((_, k) => <line key={k} x1={k * 120} y1={0} x2={k * 120} y2={H} stroke="#FFFFFF" opacity={0.025} />)}
      {Array.from({length: 18}).map((_, k) => <circle key={'p' + k} cx={(k * 211 + f * (0.3 + (k % 3) * 0.2)) % W} cy={(k * 97) % H + Math.sin(f / 40 + k) * 20}
        r={2 + (k % 3)} fill={TL.line} opacity={0.12} />)}
      <g opacity={bodyOn}><Anatomy x={L.body[0]} y={L.body[1]} s={L.body[2]} focus={normOrg(b.organ)} f={f} at={orgAt} id="ep" /></g>
      {b.stage && <BigStamp key={b.stage} text={b.stage} at={stAt} f={f} x={L.stamp[0]} y={L.stamp[1]} size={L.stamp[2]} />}
      <g key={i} opacity={out} transform={`translate(${L.wid[0]} ${L.wid[1]}) scale(${L.wid[2]})`}>
        <Widget v={b.visual} f={f} at={b.start + 2} dur={dur} />
      </g>
      <g opacity={out}><Words key={'w' + i} words={(b.words || []).slice(0, 4).map((w) => w.toUpperCase())} at={b.start + 10} f={f}
        x={L.words[0]} y={L.words[1]} size={L.words[2]} maxW={L.words[3]} /></g>
      {!vertical && hasMarks && <TimeBar marks={marks} active={b.stageIdx} f={f} at={stAt} />}
      {!vertical && <text x={60} y={66} fontFamily="F_inter" fontWeight={800} fontSize={22} letterSpacing={6} fill={TL.mute}>INSIDE YOUR BODY</text>}
    </svg>
  </AbsoluteFill>;
};
export const tlMeta = ({props}: {props: TLEpProps}) => ({durationInFrames: Math.max(30, props.frames || 300)});
