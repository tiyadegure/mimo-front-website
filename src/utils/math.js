// Math utilities for generative art and animations

export const TAU = Math.PI * 2
export const DEG = Math.PI / 180

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function map(val, inMin, inMax, outMin, outMax) {
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin)
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function angle(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1)
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1))
}

// Ease functions
export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  inCubic: t => t * t * t,
  outCubic: t => (--t) * t * t + 1,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  inElastic: t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI),
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1
}

// Vector2D helper
export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  add(v) { return new Vec2(this.x + v.x, this.y + v.y) }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y) }
  mul(s) { return new Vec2(this.x * s, this.y * s) }
  mag() { return Math.sqrt(this.x * this.x + this.y * this.y) }
  normalize() {
    const m = this.mag()
    return m > 0 ? new Vec2(this.x / m, this.y / m) : new Vec2()
  }
  limit(max) {
    const m = this.mag()
    if (m > max) return this.normalize().mul(max)
    return new Vec2(this.x, this.y)
  }
  dist(v) { return this.sub(v).mag() }
  angle() { return Math.atan2(this.y, this.x) }
  rotate(a) {
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }
}
