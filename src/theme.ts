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

/** Two elevations only — cards that sit on the surface, and layers that float over it. */
export const shadow = {
  card: {
    shadowColor: '#050b1a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  float: {
    shadowColor: '#050b1a',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const

/**
 * The service catalogue groups rows under these slugs. We draw a category icon and
 * the service's own colour rather than its logo — brand marks are not ours to ship.
 */
export const CATEGORIES = {
  video: { label: 'Video', icon: 'play-circle' },
  hudba: { label: 'Hudba', icon: 'music' },
  hry: { label: 'Hry', icon: 'target' },
  ai: { label: 'AI', icon: 'cpu' },
  software: { label: 'Software', icon: 'layers' },
  cloud: { label: 'Cloud', icon: 'cloud' },
  soukromi: { label: 'Soukromí', icon: 'shield' },
  vzdelavani: { label: 'Vzdělávání', icon: 'book-open' },
  zdravi: { label: 'Zdraví', icon: 'heart' },
  zpravy: { label: 'Zprávy', icon: 'file-text' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

export const categoryOf = (key: string) =>
  CATEGORIES[key as CategoryKey] ?? { label: 'Ostatní', icon: 'grid' as const }

/** One shared motion vocabulary, so every screen accelerates the same way. */
export const motion = {
  quick: 180,
  base: 280,
  slow: 460,
  stagger: 55,
} as const
