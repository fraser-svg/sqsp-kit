/* Augments Squarespace's existing header nav: finds the real <a> for each
 * configured label and hangs a panel off the header. The nav link keeps working
 * as a link, so removing the plugin leaves a normal site behind. */

const HEADER = '.header, #header, .Header'
const NAV_LINK = '.header-nav-item > a, .header-nav-item a, .Header-nav-item'

export function mount(root, opts = {}) {
  const menus = Array.isArray(opts.menus) ? opts.menus : []
  if (!menus.length) return

  const header = document.querySelector(HEADER)
  if (!header) return
  if (getComputedStyle(header).position === 'static') header.style.position = 'relative'

  const useClick = opts.trigger === 'click' || matchMedia('(hover: none)').matches
  let openPanel = null

  const closeAll = () => {
    if (!openPanel) return
    openPanel.panel.setAttribute('data-open', 'false')
    openPanel.link.setAttribute('aria-expanded', 'false')
    openPanel = null
  }

  const open = (entry) => {
    if (openPanel && openPanel !== entry) closeAll()
    entry.panel.setAttribute('data-open', 'true')
    entry.link.setAttribute('aria-expanded', 'true')
    openPanel = entry
  }

  menus.forEach((menu, i) => {
    if (!menu?.match) return
    const link = [...document.querySelectorAll(NAV_LINK)].find(
      (a) => a.textContent.trim().toLowerCase() === String(menu.match).trim().toLowerCase()
    )
    // Idempotency lives here, not in the loader: Squarespace can replace the
    // header wholesale, taking our panel with it while leaving a stale marker
    // on a nav link that is itself new. Both must still be present to skip.
    if (!link) return
    if (link.dataset.skMega && document.getElementById(`sk-mega-${i}`)) return

    const panel = buildPanel(menu, opts)
    panel.id = `sk-mega-${i}`
    header.appendChild(panel)

    link.dataset.skMega = String(i)
    link.setAttribute('aria-haspopup', 'true')
    link.setAttribute('aria-expanded', 'false')
    link.setAttribute('aria-controls', panel.id)

    const entry = { link, panel }
    let closeTimer

    if (useClick) {
      link.addEventListener('click', (e) => {
        // first tap opens the panel; the link still works on second tap
        if (openPanel !== entry) { e.preventDefault(); open(entry) } else { closeAll() }
      })
    } else {
      const enter = () => { clearTimeout(closeTimer); open(entry) }
      const leave = () => { closeTimer = setTimeout(closeAll, 180) }
      link.addEventListener('mouseenter', enter)
      link.addEventListener('mouseleave', leave)
      panel.addEventListener('mouseenter', enter)
      panel.addEventListener('mouseleave', leave)
    }

    link.addEventListener('focus', () => { if (!useClick) open(entry) })
    link.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(entry); panel.querySelector('a')?.focus() }
      if (e.key === 'Escape') { closeAll(); link.focus() }
    })
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeAll(); link.focus() }
    })
  })

  // one set of global listeners regardless of how many menus exist
  if (!root.dataset.skMegaBound) {
    root.dataset.skMegaBound = '1'
    document.addEventListener('click', (e) => {
      if (!openPanel) return
      if (openPanel.panel.contains(e.target) || openPanel.link.contains(e.target)) return
      closeAll()
    })
    document.addEventListener('focusin', (e) => {
      if (!openPanel) return
      if (openPanel.panel.contains(e.target) || openPanel.link.contains(e.target)) return
      closeAll()
    })
    // Escape must work when the panel was opened by hover, where focus is still
    // on <body> and never reaches the link's or panel's own keydown handler.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openPanel) closeAll()
    })
  }
}

function buildPanel(menu, opts) {
  const panel = document.createElement('div')
  panel.className = 'sk-mega-panel sk-root'
  panel.setAttribute('data-open', 'false')

  const inner = document.createElement('div')
  const width = opts.width === 'full' ? 'sk-max-w-none' : 'sk-max-w-6xl'
  inner.className = `sk-mx-auto ${width} sk-grid sk-gap-10 sk-px-8 sk-py-10 sk-grid-cols-2 lg:sk-grid-cols-4`
  panel.appendChild(inner)

  ;(menu.columns || []).forEach((col) => {
    const wrap = document.createElement('div')
    if (col.title) {
      const h = document.createElement('p')
      h.className = 'sk-mb-3 sk-text-xs sk-font-semibold sk-uppercase sk-tracking-[0.12em] sk-text-muted-foreground'
      h.textContent = col.title
      wrap.appendChild(h)
    }
    const ul = document.createElement('ul')
    ul.className = 'sk-m-0 sk-flex sk-list-none sk-flex-col sk-gap-1 sk-p-0'
    ;(col.links || []).forEach((l) => {
      if (!l?.label) return
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = l.href || '#'
      a.className = 'sk-block sk-rounded-md sk-px-3 sk-py-2 sk-transition hover:sk-bg-muted'
      const label = document.createElement('span')
      label.className = 'sk-block sk-text-base sk-font-medium sk-text-foreground'
      label.textContent = l.label
      a.appendChild(label)
      if (l.description) {
        const d = document.createElement('span')
        d.className = 'sk-mt-0.5 sk-block sk-text-sm sk-text-muted-foreground'
        d.textContent = l.description
        a.appendChild(d)
      }
      li.appendChild(a)
      ul.appendChild(li)
    })
    wrap.appendChild(ul)
    inner.appendChild(wrap)
  })
  return panel
}
