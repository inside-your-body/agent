// Reference "premium" thumbnail (adult science-channel look, not cartoon-cute): one dramatic, detailed subject,
// cinematic light, one red highlight + arrow, 2-3 huge words. Used as the style example for generated thumbnails.
import React from 'react';
import {AbsoluteFill} from 'remotion';

export const ThumbPro: React.FC = () => (
  <AbsoluteFill>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080">
      <defs>
        <radialGradient id="bg" cx="34%" cy="55%" r="75%">
          <stop offset="0%" stopColor="#3A0D12" />
          <stop offset="45%" stopColor="#14060A" />
          <stop offset="100%" stopColor="#050304" />
        </radialGradient>
        <linearGradient id="enamel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="55%" stopColor="#EADFC8" />
          <stop offset="100%" stopColor="#B9A988" />
        </linearGradient>
        <linearGradient id="rootG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D9C9A6" />
          <stop offset="100%" stopColor="#8C7552" />
        </linearGradient>
        <radialGradient id="rot" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0B0503" />
          <stop offset="55%" stopColor="#2E1608" />
          <stop offset="85%" stopColor="#6B3A12" />
          <stop offset="100%" stopColor="#9C6A2A" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="pain" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF2A1F" stopOpacity={0.95} />
          <stop offset="60%" stopColor="#FF2A1F" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#FF2A1F" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#bg)" />
      {/* rim light behind the subject */}
      <ellipse cx={640} cy={560} rx={520} ry={470} fill="#B3171C" opacity={0.18} />
      {/* the tooth: big, detailed, tilted */}
      <g transform="translate(640 515) rotate(-8) scale(1.55)">
        {/* roots */}
        <path d="M-150 60 C-170 170 -150 280 -105 330 C-80 355 -55 330 -50 290 C-42 230 -30 170 -10 150 C10 170 22 230 30 290 C36 330 62 355 88 330 C132 280 160 170 150 60 Z"
          fill="url(#rootG)" stroke="#3B2A16" strokeWidth={6} />
        {/* infection glow at the root tip */}
        <circle cx={-92} cy={300} r={90} fill="url(#pain)" />
        <circle cx={-92} cy={300} r={22} fill="#FF4A2E" />
        {/* crown */}
        <path d="M-190 -40 C-205 -150 -150 -230 -80 -215 C-40 -207 -20 -180 0 -180 C20 -180 45 -210 90 -215 C160 -222 210 -150 190 -40 C180 30 160 80 150 80 L-150 80 C-165 80 -183 30 -190 -40 Z"
          fill="url(#enamel)" stroke="#3B2A16" strokeWidth={7} />
        {/* specular highlight */}
        <path d="M-150 -120 C-140 -175 -100 -195 -70 -185" stroke="url(#shine)" strokeWidth={16} strokeLinecap="round" fill="none" />
        {/* decay: dark cavity eating in, with stained halo and cracks */}
        <ellipse cx={45} cy={-95} rx={105} ry={85} fill="#7A5222" opacity={0.45} />
        <path d="M-20 -150 C10 -175 85 -170 105 -125 C125 -80 100 -20 55 -10 C20 -2 -15 -25 -30 -60 C-42 -95 -40 -130 -20 -150 Z" fill="url(#rot)" />
        <path d="M60 -10 L75 40 L60 70 M-25 -55 L-70 -20 L-95 10 M100 -120 L145 -100" stroke="#24120A" strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* dentin channel down to the nerve */}
        <path d="M40 -12 C30 40 -20 90 -60 140 C-80 170 -90 230 -92 290" stroke="#FF3B2E" strokeWidth={9} fill="none" strokeDasharray="2 14" strokeLinecap="round" opacity={0.9} />
      </g>
      {/* red highlight circle on the decay + arrow to the words */}
      <circle cx={735} cy={355} r={175} fill="none" stroke="#FF1E1E" strokeWidth={16} />
      <path d="M905 290 C1000 240 1060 225 1130 222" stroke="#FF1E1E" strokeWidth={18} fill="none" strokeLinecap="round" />
      <path d="M1112 182 L1175 220 L1116 264 Z" fill="#FF1E1E" />
      {/* words: 2-3, huge, white + one accent */}
      <g fontFamily="F_anton" textAnchor="end" stroke="#000" paintOrder="stroke" strokeLinejoin="round">
        <text x={1860} y={420} fontSize={230} fill="#FFFFFF" strokeWidth={14}>IT ROTS</text>
        <text x={1860} y={650} fontSize={230} fill="#FFD21F" strokeWidth={14}>FROM</text>
        <text x={1860} y={880} fontSize={230} fill="#FFD21F" strokeWidth={14}>INSIDE</text>
      </g>
    </svg>
  </AbsoluteFill>
);
