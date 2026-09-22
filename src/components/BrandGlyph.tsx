import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { glyphShapes, type GlyphShape } from './glyphShapes'

/**
 * The website's service marks, rendered with react-native-svg from the same shape
 * table — see glyphShapes.ts. Knocked-out parts are white so they read against the
 * filled body beneath them.
 */
function paintProps(shape: GlyphShape, color: string) {
  const paint = shape.ko ? '#fff' : color
  const stroked = 's' in shape && shape.s
  return stroked
    ? {
        fill: 'none',
        stroke: paint,
        strokeWidth: shape.s,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        opacity: shape.o,
      }
    : { fill: paint, opacity: shape.o }
}

export function hasGlyph(slug?: string) {
  return Boolean(slug && slug in glyphShapes)
}

export function BrandGlyph({ slug, size, color }: { slug: string; size: number; color: string }) {
  const shapes = glyphShapes[slug]
  if (!shapes) return null

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes.map((shape, i) => {
        const props = paintProps(shape, color)
        if (shape.k === 'p') return <Path key={i} d={shape.d} {...props} />
        if (shape.k === 'c') return <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...props} />
        return (
          <Rect
            key={i}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            rx={shape.rx}
            {...props}
          />
        )
      })}
    </Svg>
  )
}
