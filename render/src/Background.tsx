import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, alpha} from './theme';

export const Background: React.FC<{t: Theme}> = ({t}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const drift = (f * 0.25) % 80;
  let layer: React.ReactNode = null;
  if (t.pattern === 'grid') {
    layer = <AbsoluteFill style={{backgroundImage: `linear-gradient(${alpha(t.fg, 0.06)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(t.fg, 0.06)} 1px, transparent 1px)`,
      backgroundSize: '80px 80px', backgroundPosition: `${drift}px ${drift}px`}} />;
  } else if (t.pattern === 'dots') {
    layer = <AbsoluteFill style={{backgroundImage: `radial-gradient(${alpha(t.fg, 0.10)} 2px, transparent 2.5px)`, backgroundSize: '44px 44px',
      backgroundPosition: `${drift / 2}px ${-drift / 2}px`}} />;
  } else if (t.pattern === 'halftone') {
    layer = <AbsoluteFill style={{backgroundImage: `radial-gradient(${alpha(t.fg, 0.14)} 3px, transparent 3.5px)`, backgroundSize: '22px 22px',
      maskImage: 'linear-gradient(135deg, black 0%, transparent 55%)', WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 55%)'}} />;
  } else if (t.pattern === 'scan') {
    layer = <>
      <AbsoluteFill style={{backgroundImage: `repeating-linear-gradient(0deg, ${alpha(t.fg, 0.035)} 0 1px, transparent 1px 4px)`, transform: `translateY(${(f * 2) % 4}px)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${alpha(t.accent2, 0.10)} 0%, transparent 60%)`}} />
    </>;
  } else if (t.pattern === 'gradient') {
    const a = 30 + Math.sin(f / 90) * 20;
    layer = <AbsoluteFill style={{background: `radial-gradient(circle at ${a}% 30%, ${alpha(t.accent, 0.25)} 0%, transparent 45%), radial-gradient(circle at ${100 - a}% 80%, ${alpha(t.accent3, 0.22)} 0%, transparent 50%), linear-gradient(160deg, ${t.bg} 0%, ${t.bg2} 100%)`}} />;
  } else if (t.pattern === 'paper') {
    layer = <svg width={width} height={height} style={{position: 'absolute', opacity: 0.08}}>
      <filter id="pp"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} seed={3} /></filter>
      <rect width="100%" height="100%" filter="url(#pp)" />
    </svg>;
  } else if (t.pattern === 'grain') {
    layer = <svg width={width} height={height} style={{position: 'absolute', opacity: 0.10, mixBlendMode: 'screen'}}>
      <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 7} /></filter>
      <rect width="100%" height="100%" filter="url(#gr)" />
    </svg>;
  }
  // drifting decorative shapes (style-dependent), very subtle
  const shapes = Array.from({length: 7}, (_, i) => {
    const sx = ((i * 277 + f * (0.15 + i * 0.03)) % (width + 400)) - 200;
    const sy = (i * 191) % height + Math.sin(f / 60 + i) * 30;
    const size = 60 + (i % 3) * 70;
    const col = [t.accent, t.accent2, t.accent3][i % 3];
    const round = t.radius >= 20 || t.pattern === 'gradient';
    return <div key={i} style={{position: 'absolute', left: sx, top: sy, width: size, height: t.pattern === 'scan' ? 2 : size,
      borderRadius: round ? 999 : t.radius, border: round ? 'none' : `3px solid ${alpha(col, 0.12)}`, background: round ? alpha(col, 0.07) : 'transparent',
      transform: `rotate(${(f * (i % 2 ? 0.2 : -0.2)) % 360}deg)`, filter: t.pattern === 'gradient' ? 'blur(20px)' : undefined}} />;
  });
  return (
    <AbsoluteFill style={{background: t.bg}}>
      {layer}
      {t.pattern !== 'grain' && shapes}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${alpha('#000000', t.bg.match(/^#[0-3]/) ? 0.55 : 0.10)} 100%)`}} />
    </AbsoluteFill>
  );
};
