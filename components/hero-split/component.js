export function mount(host, opts = {}) {
  const q = (name) => host.querySelector(`[data-sk-slot="${name}"]`)
  const show = (el) => el && el.removeAttribute('hidden')

  const set = (name, value) => {
    const el = q(name)
    if (!el || !value) return
    el.textContent = value
    show(el)
  }
  set('eyebrow', opts.eyebrow)
  set('heading', opts.heading || 'Add a heading')
  set('body', opts.body)

  const link = (name, label, href) => {
    const el = q(name)
    if (!el || !label) return
    el.textContent = label
    el.href = href || '#'
    show(el)
  }
  link('cta', opts.ctaLabel, opts.ctaHref)
  link('secondary', opts.secondaryLabel, opts.secondaryHref)

  const img = q('image')
  if (img && opts.image) {
    img.src = opts.image
    if (opts.imageAlt) img.alt = opts.imageAlt
    show(img.closest('[data-sk-media]'))
  }

  if (opts.reverse) {
    const copy = host.querySelector('[data-sk-copy]')
    const media = host.querySelector('[data-sk-media]')
    copy?.classList.add('md:sk-order-2')
    media?.classList.add('md:sk-order-1')
  }
}
