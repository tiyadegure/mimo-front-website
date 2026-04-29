// Perlin Noise implementation (classic 2D/3D)
// Based on Ken Perlin's reference implementation

const PERM = new Uint8Array(512)
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
]

// Initialize permutation table
const p = []
for (let i = 0; i < 256; i++) p[i] = i
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [p[i], p[j]] = [p[j], p[i]]
}
for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a, b, t) {
  return a + t * (b - a)
}

function dot3(g, x, y, z) {
  return g[0] * x + g[1] * y + g[2] * z
}

function dot2(g, x, y) {
  return g[0] * x + g[1] * y
}

export function noise3D(x, y, z) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const Z = Math.floor(z) & 255

  x -= Math.floor(x)
  y -= Math.floor(y)
  z -= Math.floor(z)

  const u = fade(x)
  const v = fade(y)
  const w = fade(z)

  const A  = PERM[X] + Y
  const AA = PERM[A] + Z
  const AB = PERM[A + 1] + Z
  const B  = PERM[X + 1] + Y
  const BA = PERM[B] + Z
  const BB = PERM[B + 1] + Z

  return lerp(
    lerp(
      lerp(dot3(GRAD3[PERM[AA] % 12], x, y, z),
           dot3(GRAD3[PERM[BA] % 12], x-1, y, z), u),
      lerp(dot3(GRAD3[PERM[AB] % 12], x, y-1, z),
           dot3(GRAD3[PERM[BB] % 12], x-1, y-1, z), u), v),
    lerp(
      lerp(dot3(GRAD3[PERM[AA+1] % 12], x, y, z-1),
           dot3(GRAD3[PERM[BA+1] % 12], x-1, y, z-1), u),
      lerp(dot3(GRAD3[PERM[AB+1] % 12], x, y-1, z-1),
           dot3(GRAD3[PERM[BB+1] % 12], x-1, y-1, z-1), u), v), w)
}

export function noise2D(x, y) {
  return noise3D(x, y, 0)
}

// Fractal Brownian Motion (fBm)
export function fbm2D(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency)
    maxValue += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }

  return value / maxValue
}

export function fbm3D(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency)
    maxValue += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }

  return value / maxValue
}
