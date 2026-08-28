export function mount(host, opts = {}) {
  const wrap = host.querySelector('[data-sk-marquee]')
  const track = host.querySelector('[data-sk-track]')
  if (!track) return

  const logos = Array.isArray(opts.logos) ? opts.logos.filter((l) => l && l.src) : []
  if (!logos.length) { host.setAttribute('hidden', ''); return }
  host.removeAttribute('hidden')

  const height = Number(opts.height) || 40
  wrap.style.setProperty('--sk-marquee-duration', `${Number(opts.speed) || 30}s`)
  wrap.setAttribute('data-fade', String(opts.fade !== false))

  const item = (logo) => {
    const img = document.createElement('img')
    img.src = logo.src
    img.alt = logo.alt || ''
    img.loading = 'lazy'
    img.decoding = 'async'
    img.style.height = `${height}px`
    img.className = 'sk-w-auto sk-max-w-none sk-object-contain sk-transition sk-duration-300'
    if (opts.grayscale !== false) img.classList.add('sk-grayscale', 'sk-opacity-70', 'hover:sk-grayscale-0', 'hover:sk-opacity-100')
    if (!logo.href) return img
    const a = document.createElement('a')
    a.href = logo.href
    a.className = 'sk-shrink-0'
    a.rel = 'noopener'
    a.appendChild(img)
    return a
  }

  track.textContent = ''
  // Rendered twice: the CSS animation translates -50%, so two copies make the
  // loop seamless regardless of how many logos there are.
  for (let pass = 0; pass < 2; pass++) {
    logos.forEach((logo) => {
      const el = item(logo)
      if (pass === 1) el.setAttribute('aria-hidden', 'true')
      track.appendChild(el)
    })
  }
}
