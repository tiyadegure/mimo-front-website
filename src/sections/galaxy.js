// Galaxy Section: Three.js 3D Particle System with Custom Shaders
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function initGalaxy() {
  const canvas = document.getElementById('galaxy-canvas')
  if (!canvas) return

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  // Scene
  const scene = new THREE.Scene()

  // Camera
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(3, 2, 3)

  // Controls
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false
  controls.minDistance = 1.5
  controls.maxDistance = 8
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.5

  // Galaxy parameters
  const params = {
    count: 15000,
    size: 2,
    arms: 3,
    spread: 0.8,
    randomness: 0.3,
    insideColor: new THREE.Color('#ff6030'),
    outsideColor: new THREE.Color('#1b3984'),
    rotateSpeed: 0.15
  }

  // Custom shaders
  const vertexShader = `
    uniform float uTime;
    uniform float uSize;

    attribute float aScale;
    attribute vec3 aRandomness;
    attribute float aAngle;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);

      // Rotate particles around center
      float angle = atan(modelPosition.x, modelPosition.z);
      float dist = length(modelPosition.xz);
      angle += uTime * 0.1 * (1.0 / (dist + 0.5));

      modelPosition.x = dist * sin(angle);
      modelPosition.z = dist * cos(angle);

      // Vertical wobble
      modelPosition.y += sin(dist * 3.0 + uTime * 0.5) * 0.05;

      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectedPosition = projectionMatrix * viewPosition;

      gl_Position = projectedPosition;

      // Size attenuation
      gl_PointSize = uSize * aScale * (300.0 / -viewPosition.z);
      gl_PointSize = max(gl_PointSize, 1.0);

      // Color based on distance from center
      vColor = color;
      vAlpha = smoothstep(5.0, 0.5, dist);
    }
  `

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      // Circular particle with soft edge
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 2.0);

      // Glow effect
      vec3 glow = vColor * 1.5;
      vec3 finalColor = mix(vColor, glow, strength * 0.5);

      gl_FragColor = vec4(finalColor, strength * vAlpha);
    }
  `

  let geometry = null
  let material = null
  let points = null

  function generateGalaxy() {
    // Cleanup
    if (points) {
      geometry.dispose()
      material.dispose()
      scene.remove(points)
    }

    geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(params.count * 3)
    const colors = new Float32Array(params.count * 3)
    const scales = new Float32Array(params.count)
    const randomness = new Float32Array(params.count * 3)
    const angles = new Float32Array(params.count)

    const insideColor = params.insideColor
    const outsideColor = params.outsideColor

    for (let i = 0; i < params.count; i++) {
      const i3 = i * 3

      // Position on spiral arm
      const radius = Math.random() * params.size * 2.5
      const armAngle = (i % params.arms) / params.arms * Math.PI * 2
      const spinAngle = radius * 0.8

      // Randomness per axis
      const rx = (Math.random() - 0.5) * params.spread * radius * params.randomness
      const ry = (Math.random() - 0.5) * params.spread * radius * params.randomness * 0.3
      const rz = (Math.random() - 0.5) * params.spread * radius * params.randomness

      const angle = armAngle + spinAngle

      positions[i3]     = Math.cos(angle) * radius + rx
      positions[i3 + 1] = ry
      positions[i3 + 2] = Math.sin(angle) * radius + rz

      randomness[i3]     = rx
      randomness[i3 + 1] = ry
      randomness[i3 + 2] = rz

      angles[i] = angle

      // Color gradient
      const mixedColor = insideColor.clone()
      mixedColor.lerp(outsideColor, radius / (params.size * 2.5))

      colors[i3]     = mixedColor.r
      colors[i3 + 1] = mixedColor.g
      colors[i3 + 2] = mixedColor.b

      // Random scale
      scales[i] = Math.random() * 0.8 + 0.2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3))
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))

    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: params.size * renderer.getPixelRatio() * 15 }
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    points = new THREE.Points(geometry, material)
    scene.add(points)
  }

  generateGalaxy()

  // Controls
  const armsInput = document.getElementById('galaxy-arms')
  const spreadInput = document.getElementById('galaxy-spread')
  const sizeInput = document.getElementById('galaxy-size')

  if (armsInput) {
    armsInput.addEventListener('input', (e) => {
      params.arms = parseInt(e.target.value)
      generateGalaxy()
    })
  }
  if (spreadInput) {
    spreadInput.addEventListener('input', (e) => {
      params.spread = parseFloat(e.target.value)
      generateGalaxy()
    })
  }
  if (sizeInput) {
    sizeInput.addEventListener('input', (e) => {
      params.size = parseFloat(e.target.value)
      generateGalaxy()
    })
  }

  // Resize
  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  resize()
  window.addEventListener('resize', resize)

  // Animation loop
  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)

    const elapsed = clock.getElapsedTime()

    if (material) {
      material.uniforms.uTime.value = elapsed
    }

    controls.update()
    renderer.render(scene, camera)
  }

  animate()
}
