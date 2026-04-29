// Main entry point — Lazy loading by category
import './style.css'

// Module registry: only loaded when section enters viewport
const lazyModules = {
  galaxy:     () => import('./sections/galaxy.js').then(m => m.initGalaxy),
  scroll:     () => import('./sections/scroll.js').then(m => m.initScroll),
  'svg-morph': () => import('./sections/svg-morph.js').then(m => m.initSvgMorph),
  generative: () => import('./sections/generative.js').then(m => m.initGenerative),
  audio:      () => import('./sections/audio.js').then(m => m.initAudio),
}

// Track which modules are already loaded
const loaded = new Set()

// IntersectionObserver — load module when section enters viewport
const lazyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return

      const section = entry.target
      const key = section.dataset.lazy

      if (key && lazyModules[key] && !loaded.has(key)) {
        loaded.add(key)
        lazyModules[key]().then(init => {
          if (init) init()
          section.classList.add('loaded')
        })
        lazyObserver.unobserve(section)
      }
    })
  },
  {
    // Load 200px before the section enters the viewport
    rootMargin: '0px 0px 200px 0px',
    threshold: 0
  }
)

document.addEventListener('DOMContentLoaded', () => {
  // Hero loads immediately (always visible above the fold)
  import('./sections/hero.js').then(m => m.initHero())

  // Observe all lazy sections
  document.querySelectorAll('[data-lazy]').forEach(section => {
    lazyObserver.observe(section)
  })

  // Footer demo (lightweight, no module needed)
  initFooterDemo()

  // Navigation dots
  initSmoothNav()
})

// Footer interactive demo
function initFooterDemo() {
  const toggleBtn = document.getElementById('discrete-toggle')
  const target = document.getElementById('discrete-target')
  if (toggleBtn && target) {
    toggleBtn.addEventListener('click', () => target.classList.toggle('hidden'))
  }
}

// Smooth navigation between sections
function initSmoothNav() {
  const sections = document.querySelectorAll('.section')
  const nav = document.createElement('nav')
  nav.className = 'section-nav'
  nav.setAttribute('aria-label', 'Section navigation')

  sections.forEach((section, i) => {
    const dot = document.createElement('button')
    dot.className = 'nav-dot'
    dot.setAttribute('aria-label', `Go to section ${i + 1}`)
    dot.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth' }))
    nav.appendChild(dot)
  })

  document.body.appendChild(nav)

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const index = Array.from(sections).indexOf(entry.target)
        nav.querySelectorAll('.nav-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === index)
        })
      })
    },
    { threshold: 0.3 }
  )

  sections.forEach(section => observer.observe(section))
}
