import { registry } from './registry.js'
import { isEditor, findSection, onDomSettled, warn, version } from './sqsp.js'

const SCRIPT = document.currentScript
const MOUNTED = new WeakSet()

/* Config resolution, in order:
 *   1. window.SQSPKIT set in Header injection  (fastest, no round trip)
 *   2. data-config="<url>" on the script tag   (the normal per-client path)
 *   3. nothing -> markers-only mode, components mount where you placed them
 */
async function getConfig() {
  if (window.SQSPKIT && typeof window.SQSPKIT === 'object') return window.SQSPKIT
  const url = SCRIPT?.dataset?.config
  if (!url) return { components: [] }
  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) throw new Error(`config ${res.status}`)
    return await res.json()
  } catch (e) {
    warn('config fetch failed, falling back to markers', e)
    return { components: [] }
  }
}

function applyTheme(theme) {
  if (!theme) return
  let el = document.getElementById('sk-theme')
  if (!el) {
    el = document.createElement('style')
    el.id = 'sk-theme'
    document.head.appendChild(el)
  }
  const decls = Object.entries(theme).map(([k, v]) => `--sk-${k}:${v}`).join(';')
  // higher specificity than the bundle's own .sk-root defaults
  el.textContent = `.sk-root.sk-root{${decls}}`
}

function render(host, id, opts) {
  const entry = registry[id]
  if (!entry) return warn(`unknown component "${id}"`)
  if (MOUNTED.has(host)) return

  host.classList.add('sk-root')
  host.setAttribute('data-sk-mounted', id)
  if (entry.html) host.innerHTML = entry.html
  try {
    entry.mount?.(host, opts || {})
    MOUNTED.add(host)
  } catch (e) {
    warn(`mount failed for "${id}"`, e)
    host.removeAttribute('data-sk-mounted')
  }
}

/** Markers: <div data-sk="hero-split" data-sk-opts='{"align":"left"}'></div>
 *  placed in a Code Block wherever the component should appear. */
function mountMarkers() {
  document.querySelectorAll('[data-sk]:not([data-sk-mounted])').forEach((el) => {
    let opts = {}
    if (el.dataset.skOpts) {
      try { opts = JSON.parse(el.dataset.skOpts) } catch { warn('bad data-sk-opts on', el) }
    }
    render(el, el.dataset.sk, opts)
  })
}

/** Config entries target a section by id and either fill it or augment it. */
function mountConfigured(components) {
  components.forEach((c) => {
    if (!c || !c.id) return
    if (c.editor === false && isEditor()) return

    if (c.target) {
      const section = findSection(c.target)
      if (!section) return warn(`section "${c.target}" not found for "${c.id}"`)
      if (c.mode === 'augment') {
        // Component operates on the existing section rather than replacing it.
        // Deliberately NOT guarded by MOUNTED: augment targets are long-lived
        // elements (body, header) that survive AJAX navigation, so a guard here
        // would permanently block re-mounting after Squarespace re-renders the
        // thing we attached to. Augmenting components must be idempotent — they
        // mark the elements they touch and skip those on re-run.
        section.classList.add('sk-root')
        try { registry[c.id]?.mount?.(section, c.options || {}) }
        catch (e) { warn(`augment failed for "${c.id}"`, e) }
        return
      }
      let host = section.querySelector(':scope > [data-sk-host]')
      if (!host) {
        host = document.createElement('div')
        host.setAttribute('data-sk-host', '')
        section.appendChild(host)
      }
      render(host, c.id, c.options)
      return
    }
    // no target: global component (chat bubble, back-to-top) appended to body
    let host = document.querySelector(`[data-sk-global="${c.id}"]`)
    if (!host) {
      host = document.createElement('div')
      host.setAttribute('data-sk-global', c.id)
      document.body.appendChild(host)
    }
    render(host, c.id, c.options)
  })
}

async function boot() {
  const cfg = await getConfig()
  applyTheme(cfg.theme)
  const run = () => {
    mountMarkers()
    mountConfigured(cfg.components || [])
  }
  run()
  // Squarespace re-renders on AJAX nav and in the editor; re-mount when it settles.
  onDomSettled(run)
  window.SQSPKIT_INFO = { version: version(), editor: isEditor(), components: Object.keys(registry) }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
