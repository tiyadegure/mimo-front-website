// Audio Visualizer: Web Audio API + Canvas FFT Visualization
import { TAU, map, lerp } from '../utils/math.js'

export function initAudio() {
  const canvas = document.getElementById('audio-canvas')
  const toggleBtn = document.getElementById('audio-toggle')
  const presetBtns = document.querySelectorAll('.audio-preset')

  if (!canvas || !toggleBtn) return

  const ctx = canvas.getContext('2d')
  let width, height
  let audioCtx = null
  let analyser = null
  let isPlaying = false
  let currentPreset = 'synth'
  let oscillators = []
  let gains = []
  let animationId = null

  function resize() {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio, 2)
    width = rect.width
    height = rect.height
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
  }

  resize()
  window.addEventListener('resize', resize)

  // Preset definitions
  const presets = {
    synth: {
      frequencies: [220, 277.18, 329.63, 440, 554.37],
      types: ['sawtooth', 'square', 'triangle', 'sine', 'sawtooth'],
      gains: [0.06, 0.04, 0.05, 0.08, 0.03],
      detune: [0, 5, -5, 0, 10],
      lfoRate: 2,
      lfoDepth: 20
    },
    bass: {
      frequencies: [55, 82.41, 110, 55, 73.42],
      types: ['sawtooth', 'square', 'triangle', 'sawtooth', 'square'],
      gains: [0.1, 0.08, 0.06, 0.08, 0.07],
      detune: [0, 0, 0, 5, -5],
      lfoRate: 0.5,
      lfoDepth: 10
    },
    ambient: {
      frequencies: [174.61, 261.63, 349.23, 523.25, 698.46],
      types: ['sine', 'sine', 'triangle', 'sine', 'sine'],
      gains: [0.05, 0.04, 0.03, 0.04, 0.03],
      detune: [0, 3, -3, 7, -7],
      lfoRate: 0.3,
      lfoDepth: 15
    }
  }

  // Toggle playback
  toggleBtn.addEventListener('click', () => {
    if (isPlaying) {
      stopAudio()
    } else {
      startAudio()
    }
  })

  // Preset switching
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentPreset = btn.dataset.preset

      if (isPlaying) {
        stopAudio()
        startAudio()
      }
    })
  })

  function startAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.85
    analyser.connect(audioCtx.destination)

    const preset = presets[currentPreset]
    oscillators = []
    gains = []

    preset.frequencies.forEach((freq, i) => {
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      const lfo = audioCtx.createOscillator()
      const lfoGain = audioCtx.createGain()

      osc.type = preset.types[i]
      osc.frequency.value = freq
      osc.detune.value = preset.detune[i]

      gainNode.gain.value = 0
      gainNode.gain.linearRampToValueAtTime(preset.gains[i], audioCtx.currentTime + 0.5)

      // LFO for vibrato
      lfo.frequency.value = preset.lfoRate + i * 0.1
      lfoGain.gain.value = preset.lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      osc.connect(gainNode)
      gainNode.connect(analyser)
      osc.start()

      oscillators.push(osc)
      gains.push(gainNode)
    })

    isPlaying = true
    toggleBtn.classList.add('playing')
    toggleBtn.querySelector('.audio-btn__icon').textContent = '⏸'
    toggleBtn.querySelector('.audio-btn__text').textContent = 'Stop'

    visualize()
  }

  function stopAudio() {
    gains.forEach(gain => {
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3)
    })

    setTimeout(() => {
      oscillators.forEach(osc => {
        try { osc.stop() } catch(e) {}
      })
      oscillators = []
      gains = []
    }, 350)

    isPlaying = false
    toggleBtn.classList.remove('playing')
    toggleBtn.querySelector('.audio-btn__icon').textContent = '▶'
    toggleBtn.querySelector('.audio-btn__text').textContent = 'Play Synth'

    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // Draw idle state
    drawIdle()
  }

  function visualize() {
    if (!isPlaying || !analyser) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeArray = new Uint8Array(bufferLength)

    function draw() {
      if (!isPlaying) return
      animationId = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)
      analyser.getByteTimeDomainData(timeArray)

      // Background with fade
      ctx.fillStyle = 'rgba(10, 5, 20, 0.15)'
      ctx.fillRect(0, 0, width, height)

      const barCount = 128
      const barWidth = width / barCount
      const centerY = height / 2

      // === FREQUENCY BARS (3D perspective) ===
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * bufferLength / barCount)
        const value = dataArray[dataIndex] / 255

        const barHeight = value * height * 0.4
        const x = i * barWidth
        const hue = map(i, 0, barCount, 200, 340)
        const lightness = 40 + value * 30

        // Bar from center (perspective)
        const perspective = 1 - Math.abs(i - barCount / 2) / (barCount / 2) * 0.3

        // Top bar
        const grd1 = ctx.createLinearGradient(x, centerY, x, centerY - barHeight * perspective)
        grd1.addColorStop(0, `hsla(${hue}, 80%, ${lightness}%, 0.9)`)
        grd1.addColorStop(1, `hsla(${hue}, 80%, ${lightness + 20}%, 0.3)`)

        ctx.fillStyle = grd1
        ctx.fillRect(x + 1, centerY - barHeight * perspective, barWidth - 2, barHeight * perspective)

        // Bottom bar (mirror)
        const grd2 = ctx.createLinearGradient(x, centerY, x, centerY + barHeight * perspective * 0.6)
        grd2.addColorStop(0, `hsla(${hue}, 80%, ${lightness}%, 0.5)`)
        grd2.addColorStop(1, `hsla(${hue}, 80%, ${lightness - 10}%, 0.1)`)

        ctx.fillStyle = grd2
        ctx.fillRect(x + 1, centerY, barWidth - 2, barHeight * perspective * 0.6)

        // Glow on high values
        if (value > 0.7) {
          const grd = ctx.createRadialGradient(x + barWidth/2, centerY - barHeight * perspective, 0, x + barWidth/2, centerY - barHeight * perspective, 30)
          grd.addColorStop(0, `hsla(${hue}, 90%, 70%, ${value * 0.3})`)
          grd.addColorStop(1, 'transparent')
          ctx.fillStyle = grd
          ctx.fillRect(x - 20, centerY - barHeight * perspective - 30, barWidth + 40, 60)
        }
      }

      // === CIRCULAR WAVEFORM ===
      const radius = Math.min(width, height) * 0.15
      const points = 128

      ctx.beginPath()
      for (let i = 0; i <= points; i++) {
        const dataIndex = Math.floor(i * bufferLength / points)
        const value = (timeArray[dataIndex] / 128.0 - 1) * radius * 0.8
        const angle = (i / points) * TAU - Math.PI / 2
        const r = radius + value

        const x = width * 0.85 + Math.cos(angle) * r
        const y = height * 0.5 + Math.sin(angle) * r

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(120, 80, 255, 0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Inner circle glow
      const avgFreq = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255
      const grd = ctx.createRadialGradient(width * 0.85, height * 0.5, 0, width * 0.85, height * 0.5, radius * 1.5)
      grd.addColorStop(0, `rgba(100, 60, 255, ${avgFreq * 0.3})`)
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(width * 0.85, height * 0.5, radius * 1.5, 0, TAU)
      ctx.fill()

      // Center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()
    }

    draw()
  }

  function drawIdle() {
    ctx.fillStyle = 'rgba(10, 5, 20, 1)'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.font = '16px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Click Play to start audio visualization', width / 2, height / 2)

    // Subtle wave animation
    const time = performance.now() / 1000
    ctx.beginPath()
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * 0.02 + time) * 20 + Math.sin(x * 0.01 + time * 0.7) * 10
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = 'rgba(100, 60, 200, 0.15)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Initial idle visualization
  function idleLoop() {
    if (!isPlaying) {
      drawIdle()
      requestAnimationFrame(idleLoop)
    }
  }
  idleLoop()
}
