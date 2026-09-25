/**
 * Clay tones. Each material has a highlight, a lit side, a body colour and a shade;
 * gradients run between them so every part reads as a soft, rounded solid — the
 * plasticine look — without a single blur filter (which would stutter on phones
 * and doesn't exist in react-native-svg anyway).
 */
export type Tone = { hi: string; l: string; m: string; d: string; dd: string }

export const TONE = {
  skin: { hi: '#ffe0c6', l: '#f7bc92', m: '#e59d6d', d: '#c47a4a', dd: '#9a5632' },
  hair: { hi: '#9c6242', l: '#6f3f24', m: '#552d18', d: '#3b1d0e', dd: '#261106' },
  hood: { hi: '#a9ffe0', l: '#3df0b8', m: '#00d99a', d: '#00b07c', dd: '#00805a' },
  pants: { hi: '#6b83b8', l: '#3d5590', m: '#2a3e72', d: '#1a2852', dd: '#0f1a38' },
  shoe: { hi: '#ffffff', l: '#ffffff', m: '#eef2f8', d: '#c9d2e0', dd: '#9aa6ba' },
  gold: { hi: '#fff6cf', l: '#ffdf6b', m: '#f9bf2c', d: '#d8930b', dd: '#9e6300' },
  navy: { hi: '#5a6c95', l: '#2d3d63', m: '#1b2847', d: '#0e1830', dd: '#050b1a' },
  paper: { hi: '#ffffff', l: '#ffffff', m: '#f4f6fa', d: '#dde3ee', dd: '#b4bfd0' },
} satisfies Record<string, Tone>

export const INK = '#2a1810'
export const MOUTH = '#6e2a1c'
export const TONGUE = '#ff7a6b'
export const BLUSH = '#ff8a73'
export const CYAN = '#4ec8ff'
export const BRAND = '#00d99a'
