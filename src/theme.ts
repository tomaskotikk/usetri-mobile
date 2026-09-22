/** The palette from the website's globals.css, so both products look like one brand. */
export const colors = {
  navyDeep: '#050b1a',
  navy: '#0d1b36',
  navySoft: '#16294f',
  navyMid: '#10305c',
  surface: '#f7f9fc',
  brand: '#00d99a',
  brandSoft: '#7cf3ce',
  brandForeground: '#00251a',
  cyan: '#4ec8ff',
  muted: '#5b6478',
  border: '#e3e8f2',
  white: '#ffffff',
  danger: '#ff6b5e',
} as const

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const

export const spacing = (n: number) => n * 4
