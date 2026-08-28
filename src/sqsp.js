/* Squarespace DOM helpers.
 * Everything Squarespace-version-specific lives here so components stay dumb. */

export const isEditor = () =>
  document.body?.classList.contains('sqs-edit-mode') ||
  document.body?.classList.contains('sqs-edit-mode-active') ||
  !!document.querySelector('.sqs-editing-overlay') ||
  location.hostname.endsWith('.squarespace.com') && !!document.querySelector('#sqs-cmp')

/** Resolve a config `target`.
 *  - "body" / "header"        -> the page itself, for components that augment
 *                                chrome rather than fill a section
 *  - a CSS selector (. # [)   -> used as-is, escape hatch for 7.0 and odd cases
 *  - anything else            -> a 7.1 data-section-id, falling back to an
 *                                element id for 7.0 collections
 */
export const findSection = (target) => {
  if (!target) return null
  if (target === 'body') return document.body
  if (target === 'header') return document.querySelector('.header, #header, .Header')
  if (/^[.#[]/.test(target)) return document.querySelector(target)
  return (
    document.querySelector(`[data-section-id="${target}"]`) ||
    document.getElementById(target) ||
    null
  )
}

export const version = () =>
  document.querySelector('[data-section-id]') ? '7.1' : '7.0'

/** Squarespace re-renders on AJAX navigation and inside the editor. Anything we
 * mount can be blown away without a page load, so callers re-run on mutation.
 * Debounced: Squarespace fires these in bursts. */
export function onDomSettled(fn, { root = document.body, wait = 120 } = {}) {
  let t
  const run = () => { clearTimeout(t); t = setTimeout(fn, wait) }
  const mo = new MutationObserver(run)
  mo.observe(root, { childList: true, subtree: true })
  window.addEventListener('popstate', run)
  return () => { mo.disconnect(); window.removeEventListener('popstate', run) }
}

export function warn(...args) {
  if (window.__SK_DEBUG__) console.warn('[sqsp-kit]', ...args)
}
