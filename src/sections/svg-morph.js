// SVG Morphing: Path interpolation with smooth transitions

export function initSvgMorph() {
  const svg = document.getElementById('morph-svg')
  const morphPath = document.getElementById('morph-path')
  const strokePath = document.getElementById('stroke-path')
  const buttons = document.querySelectorAll('.svg-btn')

  if (!svg || !morphPath) return

  // Shape definitions as SVG path data (centered in 500x500 viewBox)
  const shapes = {
    circle: generateCirclePath(250, 250, 150, 64),
    star: generateStarPath(250, 250, 150, 80, 5, 64),
    heart: generateHeartPath(250, 240, 140, 64),
    infinity: generateInfinityPath(250, 250, 150, 64)
  }

  let currentShape = 'circle'
  let animationId = null

  // Set initial shape
  morphPath.setAttribute('d', shapes.circle)
  strokePath.setAttribute('d', shapes.circle)
  buttons[0].classList.add('active')

  // Animate stroke on load
  animateStroke()

  // Button click handlers
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const shape = btn.dataset.shape
      if (shape === currentShape) return

      buttons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      morphTo(shapes[shape])
      currentShape = shape
    })
  })

  // Auto-cycle shapes
  let autoIndex = 0
  const shapeNames = Object.keys(shapes)
  const autoInterval = setInterval(() => {
    autoIndex = (autoIndex + 1) % shapeNames.length
    const shape = shapeNames[autoIndex]

    buttons.forEach(b => b.classList.remove('active'))
    buttons[autoIndex].classList.add('active')

    morphTo(shapes[shape])
    currentShape = shape
  }, 4000)

  // Stop auto-cycle on manual interaction
  buttons.forEach(btn => {
    btn.addEventListener('click', () => clearInterval(autoInterval), { once: true })
  })

  function morphTo(targetPath) {
    if (animationId) cancelAnimationFrame(animationId)

    const fromPoints = parsePath(morphPath.getAttribute('d'))
    const toPoints = parsePath(targetPath)

    const duration = 800
    const startTime = performance.now()

    function animate(time) {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)

      const interpolated = interpolatePaths(fromPoints, toPoints, eased)
      const d = pointsToPath(interpolated)

      morphPath.setAttribute('d', d)
      strokePath.setAttribute('d', d)

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      } else {
        animateStroke()
      }
    }

    animationId = requestAnimationFrame(animate)
  }

  function animateStroke() {
    const length = strokePath.getTotalLength()
    strokePath.style.strokeDasharray = length
    strokePath.style.strokeDashoffset = length

    strokePath.animate([
      { strokeDashoffset: length },
      { strokeDashoffset: 0 }
    ], {
      duration: 1500,
      easing: 'ease-in-out',
      fill: 'forwards'
    })
  }

  // Rotation animation
  let angle = 0
  function rotateGradient() {
    angle = (angle + 0.3) % 360
    const gradient = document.getElementById('morph-gradient')
    if (gradient) {
      const rad = angle * Math.PI / 180
      gradient.setAttribute('x1', `${50 + 50 * Math.cos(rad)}%`)
      gradient.setAttribute('y1', `${50 + 50 * Math.sin(rad)}%`)
      gradient.setAttribute('x2', `${50 - 50 * Math.cos(rad)}%`)
      gradient.setAttribute('y2', `${50 - 50 * Math.sin(rad)}%`)
    }
    requestAnimationFrame(rotateGradient)
  }
  rotateGradient()
}

// --- Path generation functions ---

function generateCirclePath(cx, cy, r, numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    })
  }
  return pointsToPath(points)
}

function generateStarPath(cx, cy, outerR, innerR, points, numSegments) {
  const result = []
  const totalPoints = points * 2
  for (let i = 0; i < numSegments; i++) {
    const t = i / numSegments
    const angle = t * Math.PI * 2 - Math.PI / 2
    const pointIndex = Math.floor(t * totalPoints)
    const isOuter = pointIndex % 2 === 0
    const r = isOuter ? outerR : innerR

    // Smooth interpolation between star points
    const localT = (t * totalPoints) % 1
    const nextIsOuter = !isOuter
    const nextR = nextIsOuter ? outerR : innerR
    const currentR = r + (nextR - r) * smoothStep(localT)

    result.push({
      x: cx + currentR * Math.cos(angle),
      y: cy + currentR * Math.sin(angle)
    })
  }
  return pointsToPath(result)
}

function generateHeartPath(cx, cy, size, numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t))
    points.push({
      x: cx + x * size / 16,
      y: cy + y * size / 16
    })
  }
  return pointsToPath(points)
}

function generateInfinityPath(cx, cy, size, numPoints) {
  const points = []
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2
    const denom = 1 + Math.sin(t) * Math.sin(t)
    const x = size * Math.cos(t) / denom
    const y = size * Math.sin(t) * Math.cos(t) / denom
    points.push({
      x: cx + x,
      y: cy + y
    })
  }
  return pointsToPath(points)
}

// --- Utility functions ---

function pointsToPath(points) {
  if (points.length < 3) return ''
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  // Use cubic bezier for smooth curves
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length]
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const p3 = points[(i + 2) % points.length]

    // Catmull-Rom to Bezier conversion
    const tension = 0.3
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  d += ' Z'
  return d
}

function parsePath(d) {
  // Extract coordinates from path data
  const points = []
  const nums = d.match(/[\d.]+/g)
  if (!nums) return []

  // Parse M command and C commands
  let i = 0
  if (d.startsWith('M')) {
    i = 2 // skip M x y
  }

  // Every 6 numbers after M is a cubic bezier: C cp1x cp1y cp2x cp2y x y
  // We extract the endpoint of each curve segment
  while (i < nums.length) {
    if (i + 5 < nums.length) {
      // Cubic bezier — take endpoint
      points.push({
        x: parseFloat(nums[i + 4]),
        y: parseFloat(nums[i + 5])
      })
      i += 6
    } else {
      break
    }
  }

  // If no bezier found, try simple point extraction
  if (points.length === 0) {
    for (let j = 0; j < nums.length; j += 2) {
      if (j + 1 < nums.length) {
        points.push({
          x: parseFloat(nums[j]),
          y: parseFloat(nums[j + 1])
        })
      }
    }
  }

  return points
}

function interpolatePaths(from, to, t) {
  const len = Math.max(from.length, to.length)
  const result = []

  for (let i = 0; i < len; i++) {
    const f = from[i % from.length] || from[0]
    const tt = to[i % to.length] || to[0]
    result.push({
      x: f.x + (tt.x - f.x) * t,
      y: f.y + (tt.y - f.y) * t
    })
  }

  return result
}

function smoothStep(t) {
  return t * t * (3 - 2 * t)
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
