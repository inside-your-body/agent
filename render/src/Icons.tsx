import React from 'react';

// Simple line icons on a 100x100 canvas (stroke only). Keys are matched against beat text/value.
export const ICONS: Record<string, string> = {
  heart: 'M50 84 C20 62 10 46 10 32 C10 20 20 12 31 12 C40 12 46 18 50 25 C54 18 60 12 69 12 C80 12 90 20 90 32 C90 46 80 62 50 84 Z',
  brain: 'M50 18 C40 10 24 14 22 28 C12 30 10 44 18 50 C12 58 18 72 30 72 C34 84 48 86 50 78 C52 86 66 84 70 72 C82 72 88 58 82 50 C90 44 88 30 78 28 C76 14 60 10 50 18 Z M50 18 V78 M30 40 C36 42 40 48 38 54 M70 40 C64 42 60 48 62 54',
  lungs: 'M46 14 V44 M54 14 V44 M46 40 C34 30 20 40 18 60 C16 78 24 88 38 84 C46 82 46 70 46 58 Z M54 40 C66 30 80 40 82 60 C84 78 76 88 62 84 C54 82 54 70 54 58 Z',
  liver: 'M12 40 C30 26 70 22 88 30 C92 46 76 62 54 66 C40 68 26 72 18 64 C10 56 8 46 12 40 Z',
  stomach: 'M40 12 V28 C40 36 30 38 24 48 C16 62 24 82 44 84 C64 86 80 70 76 54 C72 42 58 44 56 34 V12',
  kidney: 'M40 16 C22 16 16 36 20 52 C24 70 40 82 50 70 C56 62 48 56 50 48 C52 38 60 36 58 26 C56 18 48 16 40 16 Z',
  bone: 'M24 20 C16 12 6 22 14 30 C6 36 14 48 22 40 L60 78 C54 86 64 96 70 88 C78 96 88 86 80 78 C88 72 80 60 72 68 L34 30 C40 24 32 12 24 20 Z',
  pill: 'M30 70 L70 30 C78 22 90 22 94 30 C98 38 96 46 90 52 L50 92 C42 100 30 100 24 92 C16 84 20 76 30 70 Z M50 50 L72 72',
  syringe: 'M20 80 L60 40 M50 30 L70 50 M60 20 L80 40 M70 30 L82 18 M14 86 L22 78 M40 60 L48 68 M48 52 L56 60',
  bottle: 'M42 10 H58 V26 C58 32 70 36 70 48 V86 C70 90 66 92 62 92 H38 C34 92 30 90 30 86 V48 C30 36 42 32 42 26 Z M30 56 H70',
  glass: 'M24 14 H76 L68 86 H32 Z M28 38 H72',
  cigarette: 'M8 58 H76 V70 H8 Z M60 58 V70 M84 54 C80 46 88 40 84 32 M92 54 C88 46 96 40 92 32',
  clock: 'M50 50 m-38 0 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0 M50 26 V50 L66 60',
  moon: 'M66 14 C40 16 24 38 28 60 C32 80 54 92 76 84 C56 80 44 62 48 42 C50 30 56 20 66 14 Z',
  sun: 'M50 50 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 M50 8 V20 M50 80 V92 M8 50 H20 M80 50 H92 M20 20 L28 28 M72 72 L80 80 M80 20 L72 28 M28 72 L20 80',
  water: 'M50 10 C40 28 24 44 24 60 C24 76 36 88 50 88 C64 88 76 76 76 60 C76 44 60 28 50 10 Z M38 62 C38 70 44 76 52 76',
  phone: 'M32 8 H68 C72 8 74 10 74 14 V86 C74 90 72 92 68 92 H32 C28 92 26 90 26 86 V14 C26 10 28 8 32 8 Z M44 82 H56',
  bed: 'M8 76 V34 M8 60 H92 V76 M92 60 V48 C92 42 88 38 82 38 H44 V60 M16 50 m-0 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0',
  food: 'M20 10 V40 C20 46 26 48 30 48 V90 M30 10 V40 M40 10 V40 C40 46 34 48 30 48 M66 10 C56 20 56 44 66 50 V90 M66 10 C76 20 76 44 66 50',
  apple: 'M50 30 C40 22 20 24 18 46 C16 70 34 90 50 82 C66 90 84 70 82 46 C80 24 60 22 50 30 Z M50 30 C50 20 56 12 64 10',
  virus: 'M50 50 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M50 28 V12 M50 72 V88 M28 50 H12 M72 50 H88 M34 34 L22 22 M66 66 L78 78 M66 34 L78 22 M34 66 L22 78',
  shield: 'M50 8 L84 20 V48 C84 70 68 86 50 94 C32 86 16 70 16 48 V20 Z M34 50 L46 62 L68 38',
  check: 'M18 52 L40 74 L84 26',
  cross: 'M22 22 L78 78 M78 22 L22 78',
  warning: 'M50 10 L92 86 H8 Z M50 38 V60 M50 72 V74',
  run: 'M58 14 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M50 30 L40 54 L56 64 L50 90 M40 54 L26 48 M48 36 L66 46 L80 40 M56 64 L74 76',
  sit: 'M40 14 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M40 30 V60 H66 V88 M40 40 L60 48 M20 60 H40 M20 60 V88',
  dna: 'M30 8 C30 34 70 40 70 66 C70 80 50 88 30 92 M70 8 C70 34 30 40 30 66 C30 80 50 88 70 92 M36 22 H64 M34 50 H66 M36 78 H64',
  smoke: 'M20 80 C10 66 30 60 22 46 C14 32 34 26 28 12 M50 80 C40 66 60 60 52 46 C44 32 64 26 58 12 M80 80 C70 66 90 60 82 46 C74 32 94 26 88 12',
  money: 'M8 26 H92 V74 H8 Z M50 50 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 M20 38 V62 M80 38 V62',
  doctor: 'M50 26 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M18 92 C18 64 32 52 50 52 C68 52 82 64 82 92 M38 54 C38 72 62 72 62 54 M62 72 m-6 0 a6 6 0 1 0 12 0',
  eye: 'M6 50 C24 22 76 22 94 50 C76 78 24 78 6 50 Z M50 50 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0',
  tooth: 'M30 12 C14 12 12 30 18 46 C22 58 24 88 32 88 C40 88 40 62 50 62 C60 62 60 88 68 88 C76 88 78 58 82 46 C88 30 86 12 70 12 C60 12 58 18 50 18 C42 18 40 12 30 12 Z',
  thermometer: 'M42 14 C42 8 58 8 58 14 V58 C68 64 70 78 62 86 C54 94 40 92 36 82 C32 72 36 62 42 58 Z M50 30 V70',
  scale: 'M50 12 V88 M20 88 H80 M14 30 H86 M14 30 L4 60 H24 Z M86 30 L76 60 H96 Z',
  salt: 'M34 30 H66 V88 H34 Z M38 30 C38 16 62 16 62 30 M46 20 V22 M54 20 V22',
  sugar: 'M22 34 L50 18 L78 34 V66 L50 82 L22 66 Z M22 34 L50 50 L78 34 M50 50 V82',
  coffee: 'M14 36 H74 V70 C74 82 64 90 52 90 H36 C24 90 14 82 14 70 Z M74 46 H82 C90 46 90 64 82 64 H74 M30 10 C26 18 34 22 30 30 M46 10 C42 18 50 22 46 30',
  stress: 'M50 50 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0 M36 42 L44 46 M64 42 L56 46 M38 66 C44 60 56 60 62 66 M84 14 L76 26 M90 30 L78 34 M16 14 L24 26',
};

const ALIASES: Record<string, string> = {
  alcohol: 'bottle', beer: 'glass', wine: 'glass', drink: 'glass', antibiotic: 'pill', medicine: 'pill', drug: 'pill', painkiller: 'pill',
  vaccine: 'syringe', sleep: 'moon', night: 'moon', insomnia: 'moon', smoking: 'cigarette', smoke: 'smoke', vape: 'smoke', exercise: 'run',
  walk: 'run', sitting: 'sit', time: 'clock', hours: 'clock', minutes: 'clock', years: 'clock', days: 'clock', hydration: 'water', dehydration: 'water',
  screen: 'phone', social: 'phone', fruit: 'apple', diet: 'food', eat: 'food', meal: 'food', infection: 'virus', bacteria: 'virus', immune: 'shield',
  protect: 'shield', safe: 'shield', danger: 'warning', risk: 'warning', cancer: 'warning', gene: 'dna', cost: 'money', price: 'money',
  hospital: 'doctor', vision: 'eye', teeth: 'tooth', fever: 'thermometer', weight: 'scale', caffeine: 'coffee', anxiety: 'stress', mood: 'stress',
};

export const pickIcon = (...hints: (string | null | undefined)[]): string | null => {
  const txt = hints.filter(Boolean).join(' ').toLowerCase();
  for (const k of Object.keys(ICONS)) if (new RegExp(`\\b${k}`).test(txt)) return k;
  for (const [a, k] of Object.entries(ALIASES)) if (new RegExp(`\\b${a}`).test(txt)) return k;
  return null;
};

export const Icon: React.FC<{name: string; size: number; color: string; progress?: number; width?: number}> = ({name, size, color, progress = 1, width = 5}) => (
  <svg viewBox="-4 -4 108 108" width={size} height={size} style={{overflow: 'visible'}}>
    <path d={ICONS[name] || ICONS.check} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - progress} />
  </svg>
);
