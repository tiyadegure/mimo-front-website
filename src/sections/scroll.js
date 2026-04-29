// Scroll Section: Demonstrates CSS Scroll-Driven Animations
// This section is primarily CSS-driven — JS adds intersection observer for enhancements

export function initScroll() {
  const cards = document.querySelectorAll('.scroll-card')
  if (!cards.length) return

  // Intersection Observer for progressive enhancement
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  })

  cards.forEach(card => observer.observe(card))

  // Add parallax effect on mouse move within gallery
  const gallery = document.querySelector('.scroll-gallery')
  if (!gallery) return

  gallery.addEventListener('mousemove', (e) => {
    const rect = gallery.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    cards.forEach((card, i) => {
      const depth = (i % 3 + 1) * 0.5
      const inner = card.querySelector('.scroll-card__inner')
      if (inner) {
        inner.style.transform = `
          perspective(800px)
          rotateY(${x * depth * 3}deg)
          rotateX(${-y * depth * 3}deg)
          translateZ(${depth * 5}px)
        `
      }
    })
  })

  gallery.addEventListener('mouseleave', () => {
    cards.forEach(card => {
      const inner = card.querySelector('.scroll-card__inner')
      if (inner) {
        inner.style.transform = ''
      }
    })
  })
}
