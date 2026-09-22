/**
 * Static geometry for <Globe />, built once when the module loads. Everything is
 * a flat [x, y, z, …] array of unit-sphere vectors so the render worklet only has
 * to rotate and project — no object allocation per frame.
 */

/**
 * Coarse coastline rings in [lon, lat]. Not survey-grade — traced at a few
 * degrees of resolution, which is all the dot grid below can resolve anyway,
 * but accurate enough that the continents are immediately recognisable.
 */
const LANDMASSES: [number, number][][] = [
  // North America
  [
    [-168, 66], [-162, 63], [-165, 60], [-158, 57], [-153, 58], [-146, 60], [-140, 60],
    [-135, 57], [-130, 53], [-125, 49], [-124, 42], [-121, 36], [-117, 32], [-114, 28],
    [-110, 23], [-106, 22], [-98, 18], [-95, 16], [-92, 15], [-88, 16], [-87, 21],
    [-90, 21], [-91, 26], [-84, 30], [-82, 26], [-80, 27], [-81, 32], [-76, 35],
    [-74, 40], [-70, 43], [-66, 45], [-60, 47], [-56, 52], [-64, 56], [-68, 61],
    [-78, 63], [-80, 70], [-90, 72], [-100, 70], [-110, 69], [-120, 70], [-130, 70],
    [-141, 70], [-150, 71], [-158, 71], [-166, 68],
  ],
  // Greenland
  [
    [-45, 60], [-52, 64], [-55, 70], [-60, 76], [-56, 82], [-40, 83], [-25, 80],
    [-20, 75], [-26, 70], [-36, 65],
  ],
  // South America
  [
    [-81, 8], [-77, 8], [-75, 11], [-70, 12], [-62, 10], [-55, 6], [-50, 2], [-45, -2],
    [-38, -5], [-35, -8], [-38, -13], [-39, -18], [-45, -23], [-48, -25], [-53, -34],
    [-57, -38], [-62, -40], [-65, -45], [-68, -52], [-72, -54], [-74, -50], [-73, -44],
    [-75, -38], [-72, -30], [-71, -25], [-70, -18], [-74, -14], [-78, -8], [-80, -4],
    [-80, 0], [-78, 4],
  ],
  // Africa
  [
    [-17, 15], [-17, 21], [-13, 28], [-10, 31], [-6, 35], [0, 36], [9, 37], [11, 34],
    [15, 32], [20, 31], [25, 32], [31, 31], [34, 28], [37, 22], [39, 15], [43, 12],
    [45, 11], [51, 12], [51, 4], [48, 2], [43, -1], [40, -7], [40, -12], [36, -18],
    [34, -24], [31, -29], [27, -33], [20, -35], [17, -30], [14, -23], [12, -17],
    [13, -11], [9, -1], [9, 4], [3, 6], [-4, 5], [-8, 4], [-13, 8], [-16, 12],
  ],
  // Eurasia
  [
    [-9, 36], [-2, 36], [3, 43], [9, 44], [13, 45], [16, 41], [19, 40], [24, 38],
    [27, 36], [30, 37], [36, 36], [36, 33], [35, 31], [34, 28], [38, 24], [42, 16],
    [45, 13], [48, 14], [52, 17], [56, 24], [58, 23], [62, 25], [66, 25], [68, 23],
    [72, 20], [75, 16], [77, 8], [80, 13], [85, 19], [89, 22], [92, 20], [95, 16],
    [98, 10], [101, 3], [104, 10], [108, 16], [110, 21], [115, 23], [119, 25],
    [121, 30], [122, 37], [126, 40], [129, 43], [131, 46], [135, 48], [141, 52],
    [143, 59], [150, 59], [158, 61], [163, 60], [170, 62], [179, 65], [179, 70],
    [170, 70], [160, 71], [150, 72], [140, 73], [130, 73], [120, 74], [110, 76],
    [100, 77], [90, 76], [80, 74], [70, 72], [60, 71], [50, 69], [42, 67], [35, 69],
    [30, 70], [25, 66], [22, 60], [19, 56], [13, 54], [8, 54], [4, 52], [0, 49],
    [-2, 46], [-2, 43], [-9, 43],
  ],
  // Australia
  [
    [113, -22], [114, -26], [115, -32], [118, -35], [125, -33], [131, -32], [135, -35],
    [138, -35], [141, -38], [146, -39], [150, -37], [153, -31], [153, -28], [148, -20],
    [143, -14], [136, -12], [130, -12], [125, -14], [120, -18],
  ],
  // New Guinea
  [[131, -1], [141, -2], [147, -6], [150, -9], [143, -9], [137, -8], [132, -5]],
  // Japan
  [[130, 32], [132, 34], [136, 35], [140, 36], [141, 41], [143, 43], [145, 44], [142, 45], [140, 40], [137, 37], [133, 34], [131, 31]],
  // British Isles
  [[-10, 52], [-6, 55], [-8, 58], [-3, 58], [-1, 54], [1, 52], [-2, 50], [-5, 50]],
  // Madagascar
  [[43, -12], [50, -15], [50, -22], [47, -25], [44, -22], [43, -16]],
  // New Zealand
  [[166, -46], [168, -44], [172, -43], [174, -41], [177, -39], [178, -37], [175, -36], [172, -40], [168, -44]],
  // Indonesia (Sumatra / Java / Borneo, lumped)
  [[95, 5], [100, 2], [105, -2], [110, -7], [115, -8], [119, -9], [117, -3], [114, 1], [110, 3], [105, 1], [100, 5]],
  // Philippines
  [[120, 6], [126, 7], [126, 13], [122, 18], [120, 16], [119, 11]],
  // Iceland
  [[-24, 64], [-22, 66], [-15, 66], [-14, 64], [-19, 63]],
  // Cuba / Hispaniola
  [[-84, 22], [-80, 23], [-75, 20], [-78, 20], [-82, 21]],
  // Antarctica (solid polar cap so the south pole isn't a bare ring)
  [[-180, -64], [180, -64], [180, -90], [-180, -90]],
]

const CITIES: [number, number][] = [
  [14.42, 50.08], // Praha
  [-0.13, 51.51], // Londýn
  [-74.0, 40.71], // New York
  [139.69, 35.69], // Tokio
  [-46.63, -23.55], // São Paulo
  [151.21, -33.87], // Sydney
  [13.4, 52.52], // Berlín
]

/** Great-circle links drawn between city pairs, by index into CITIES. */
const LINKS: [number, number][] = [
  [0, 1],
  [0, 3],
  [1, 2],
  [0, 5],
]

type Vec = [number, number, number]

function toVector(lon: number, lat: number): Vec {
  const phi = (lat * Math.PI) / 180
  const theta = (lon * Math.PI) / 180
  return [Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)]
}

/** Bounding box per ring, so most grid points reject after two comparisons. */
const RINGS = LANDMASSES.map((ring) => {
  let minLon = 180
  let maxLon = -180
  let minLat = 90
  let maxLat = -90
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return { ring, minLon, maxLon, minLat, maxLat }
})

function pointInRing(lon: number, lat: number, ring: [number, number][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function isLand(lon: number, lat: number) {
  for (const r of RINGS) {
    if (lon < r.minLon || lon > r.maxLon || lat < r.minLat || lat > r.maxLat) continue
    if (pointInRing(lon, lat, r.ring)) return true
  }
  return false
}

function buildSurface() {
  const land: number[] = []
  const ocean: number[] = []

  for (let lat = -82; lat <= 82; lat += 4.4) {
    const ring = Math.cos((lat * Math.PI) / 180)
    const count = Math.max(8, Math.round(76 * ring))
    for (let i = 0; i < count; i++) {
      const lon = -180 + (360 * i) / count
      const [x, y, z] = toVector(lon, lat)
      if (isLand(lon, lat)) land.push(x, y, z)
      else if (i % 4 === 0) ocean.push(x, y, z)
    }
  }
  return { land, ocean }
}

/** Meridians and parallels — the wireframe that makes the spin readable. */
function buildGraticule() {
  const lines: number[][] = []

  for (let lon = -180; lon < 180; lon += 30) {
    const line: number[] = []
    for (let lat = -84; lat <= 84; lat += 8) line.push(...toVector(lon, lat))
    lines.push(line)
  }
  for (const lat of [-60, -30, 0, 30, 60]) {
    const line: number[] = []
    for (let lon = -180; lon <= 180; lon += 10) line.push(...toVector(lon, lat))
    lines.push(line)
  }
  return lines
}

/** Arc shapes never change — only the whole sphere rotates — so slerp them once. */
function buildLinks(cities: Vec[]) {
  const lines: number[][] = []

  for (const [a, b] of LINKS) {
    const va = cities[a]
    const vb = cities[b]
    const d = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
    const omega = Math.acos(d)
    if (omega < 0.01) continue

    const line: number[] = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const k1 = Math.sin((1 - t) * omega) / Math.sin(omega)
      const k2 = Math.sin(t * omega) / Math.sin(omega)
      const lift = 1 + Math.sin(Math.PI * t) * 0.13
      line.push(
        (va[0] * k1 + vb[0] * k2) * lift,
        (va[1] * k1 + vb[1] * k2) * lift,
        (va[2] * k1 + vb[2] * k2) * lift,
      )
    }
    lines.push(line)
  }
  return lines
}

const cityVectors = CITIES.map(([lon, lat]) => toVector(lon, lat))
const surface = buildSurface()

export const GEOMETRY = {
  land: surface.land,
  ocean: surface.ocean,
  graticule: buildGraticule(),
  links: buildLinks(cityVectors),
  cities: cityVectors.flat(),
}
