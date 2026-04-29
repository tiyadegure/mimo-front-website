// Generative Art: Flow Field, Fractal Tree, Particle Physics
import { noise2D, fbm2D } from '../utils/noise.js'
import { TAU, lerp, map, Vec2, randomRange } from '../utils/math.js'

export function initGenerative() {
  const canvas = document.getElementById('gen-canvas')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let width, height
  let currentMode = 'flow'
  let animationId = null
  let particles = []
  let tree = null

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio, 2)
    width = rect.width
    height = rect.height
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    initMode(currentMode)
  }

  resize()
  window.addEventListener('resize', resize)

  // Tab switching
  const tabs = document.querySelectorAll('.gen-tab')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      currentMode = tab.dataset.mode
      initMode(currentMode)
    })
  })

  // Mouse interaction
  let mousePos = new Vec2(-1000, -1000)
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    mousePos = new Vec2(e.clientX - rect.left, e.clientY - rect.top)
  })
  canvas.addEventListener('mouseleave', () => {
    mousePos = new Vec2(-1000, -1000)
  })

  function initMode(mode) {
    if (animationId) cancelAnimationFrame(animationId)

    switch (mode) {
      case 'flow':
        initFlowField()
        break
      case 'tree':
        initFractalTree()
        break
      case 'particles':
        initParticlePhysics()
        break
    }
  }

  // ========================
  // FLOW FIELD
  // ========================
  function initFlowField() {
    particles = []
    const numParticles = 2000
    const scale = 0.003

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        prevX: 0,
        prevY: 0,
        speed: randomRange(0.5, 2),
        life: randomRange(100, 300),
        maxLife: 300,
        hue: randomRange(200, 320)
      })
    }

    // Dark background
    ctx.fillStyle = 'rgba(10, 5, 20, 1)'
    ctx.fillRect(0, 0, width, height)

    let time = 0

    function drawFlowField() {
      // Semi-transparent overlay for trails
      ctx.fillStyle = 'rgba(10, 5, 20, 0.02)'
      ctx.fillRect(0, 0, width, height)

      time += 0.005

      particles.forEach(p => {
        p.prevX = p.x
        p.prevY = p.y

        // Flow field angle from noise
        const angle = fbm2D(p.x * scale, p.y * scale + time, 4) * TAU * 2

        // Mouse influence
        const dist = mousePos.dist(new Vec2(p.x, p.y))
        if (dist < 150) {
          const influence = 1 - dist / 150
          const mouseAngle = mousePos.sub(new Vec2(p.x, p.y)).angle()
          p.x += Math.cos(lerp(angle, mouseAngle, influence)) * p.speed * 2
          p.y += Math.sin(lerp(angle, mouseAngle, influence)) * p.speed * 2
        } else {
          p.x += Math.cos(angle) * p.speed
          p.y += Math.sin(angle) * p.speed
        }

        // Wrap around
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        // Life cycle
        p.life--
        if (p.life <= 0) {
          p.x = Math.random() * width
          p.y = Math.random() * height
          p.life = p.maxLife
        }

        // Draw
        const alpha = Math.min(p.life / 50, 1) * 0.6
        const hueShift = noise2D(p.x * 0.01, p.y * 0.01) * 30

        ctx.strokeStyle = `hsla(${p.hue + hueShift}, 70%, 60%, ${alpha})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.prevX, p.prevY)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      })

      animationId = requestAnimationFrame(drawFlowField)
    }

    drawFlowField()
  }

  // ========================
  // FRACTAL TREE
  // ========================
  function initFractalTree() {
    let windAngle = 0
    let time = 0

    function drawTree() {
      ctx.fillStyle = 'rgba(10, 5, 20, 1)'
      ctx.fillRect(0, 0, width, height)

      time += 0.02
      windAngle = Math.sin(time) * 0.1

      const startX = width / 2
      const startY = height * 0.85
      const length = height * 0.22
      const angle = -Math.PI / 2

      drawBranch(startX, startY, length, angle, 0, 10)

      // Ground glow
      const grd = ctx.createRadialGradient(startX, startY, 0, startX, startY, 200)
      grd.addColorStop(0, 'rgba(100, 60, 200, 0.15)')
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.fillRect(0, startY - 200, width, 200 + height * 0.15)

      animationId = requestAnimationFrame(drawTree)
    }

    function drawBranch(x, y, len, angle, depth, maxDepth) {
      if (depth > maxDepth || len < 2) return

      const endX = x + Math.cos(angle) * len
      const endY = y + Math.sin(angle) * len

      // Branch color
      const hue = map(depth, 0, maxDepth, 120, 280)
      const lightness = map(depth, 0, maxDepth, 50, 75)
      const width = map(depth, 0, maxDepth, 8, 1)
      const alpha = map(depth, 0, maxDepth, 1, 0.4)

      ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`
      ctx.lineWidth = width
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, endY)
      ctx.stroke()

      // Leaf particles at tips
      if (depth >= maxDepth - 2) {
        const leafSize = randomRange(2, 5)
        ctx.fillStyle = `hsla(${hue + 20}, 70%, ${lightness + 10}%, 0.6)`
        ctx.beginPath()
        ctx.arc(endX, endY, leafSize, 0, TAU)
        ctx.fill()
      }

      // Wind effect increases with depth
      const wind = windAngle * (depth / maxDepth)

      // Branch angles
      const spread = 0.4 + Math.sin(time + depth) * 0.1
      const lenRatio = 0.68 + Math.sin(time * 0.5 + depth) * 0.05

      // Mouse influence
      const mouseDist = mousePos.dist(new Vec2(endX, endY))
      const mouseInfluence = mouseDist < 200 ? (1 - mouseDist / 200) * 0.3 : 0
      const mouseAngle = mousePos.sub(new Vec2(endX, endY)).angle()

      const branch1Angle = angle - spread + wind + mouseInfluence * Math.sin(mouseAngle - angle)
      const branch2Angle = angle + spread + wind + mouseInfluence * Math.sin(mouseAngle - angle)

      drawBranch(endX, endY, len * lenRatio, branch1Angle, depth + 1, maxDepth)
      drawBranch(endX, endY, len * lenRatio, branch2Angle, depth + 1, maxDepth)

      // Sometimes add a third branch
      if (depth < maxDepth - 3 && depth > 2 && depth % 3 === 0) {
        drawBranch(endX, endY, len * lenRatio * 0.7, angle + wind, depth + 2, maxDepth)
      }
    }

    drawTree()
  }

  // ========================
  // PARTICLE PHYSICS
  // ========================
  function initParticlePhysics() {
    particles = []
    const numParticles = 200

    for (let i = 0; i < numParticles; i++) {
      particles.push(createParticle())
    }

    function createParticle() {
      const x = randomRange(50, width - 50)
      const y = randomRange(50, height - 50)
      return {
        pos: new Vec2(x, y),
        vel: new Vec2(randomRange(-1, 1), randomRange(-1, 1)),
        acc: new Vec2(0, 0),
        mass: randomRange(1, 4),
        radius: randomRange(2, 6),
        hue: randomRange(200, 340),
        trail: []
      }
    }

    function drawParticles() {
      ctx.fillStyle = 'rgba(10, 5, 20, 0.1)'
      ctx.fillRect(0, 0, width, height)

      particles.forEach(p => {
        // Mouse attraction
        if (mousePos.x > 0) {
          const force = mousePos.sub(p.pos).normalize().mul(0.3)
          p.acc = p.acc.add(force)
        }

        // Center gravity
        const center = new Vec2(width / 2, height / 2)
        const toCenter = center.sub(p.pos).normalize().mul(0.02)
        p.acc = p.acc.add(toCenter)

        // Inter-particle forces
        particles.forEach(other => {
          if (other === p) return
          const diff = other.pos.sub(p.pos)
          const dist = diff.mag()

          if (dist < 100 && dist > 0) {
            // Soft repulsion
            const force = diff.normalize().mul(-2 / (dist * dist))
            p.acc = p.acc.add(force)
          }

          if (dist < 60 && dist > 0) {
            // Spring connection
            const springForce = diff.normalize().mul((dist - 40) * 0.001)
            p.acc = p.acc.add(springForce)
          }
        })

        // Apply acceleration
        p.vel = p.vel.add(p.acc).limit(4)
        p.pos = p.pos.add(p.vel)
        p.acc = new Vec2(0, 0)

        // Boundary bounce
        if (p.pos.x < p.radius) { p.pos.x = p.radius; p.vel.x *= -0.8 }
        if (p.pos.x > width - p.radius) { p.pos.x = width - p.radius; p.vel.x *= -0.8 }
        if (p.pos.y < p.radius) { p.pos.y = p.radius; p.vel.y *= -0.8 }
        if (p.pos.y > height - p.radius) { p.pos.y = height - p.radius; p.vel.y *= -0.8 }

        // Trail
        p.trail.push({ x: p.pos.x, y: p.pos.y })
        if (p.trail.length > 15) p.trail.shift()

        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(p.trail[0].x, p.trail[0].y)
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y)
          }
          ctx.strokeStyle = `hsla(${p.hue}, 60%, 50%, 0.2)`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Draw particle
        const speed = p.vel.mag()
        const glow = map(speed, 0, 4, 0.4, 1)

        ctx.beginPath()
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, TAU)
        ctx.fillStyle = `hsla(${p.hue}, 70%, ${50 + glow * 20}%, ${glow})`
        ctx.fill()

        // Glow
        const grd = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, p.radius * 3)
        grd.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${glow * 0.3})`)
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd
        ctx.fillRect(p.pos.x - p.radius * 3, p.pos.y - p.radius * 3, p.radius * 6, p.radius * 6)
      })

      // Draw connections
      ctx.strokeStyle = 'rgba(120, 80, 200, 0.08)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dist = particles[i].pos.dist(particles[j].pos)
          if (dist < 80) {
            ctx.beginPath()
            ctx.moveTo(particles[i].pos.x, particles[i].pos.y)
            ctx.lineTo(particles[j].pos.x, particles[j].pos.y)
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(drawParticles)
    }

    drawParticles()
  }
}
