/**
 * Scope every rule under .sk-root so nothing we ship can restyle the client's
 * Squarespace site. Runs after Tailwind, before minification.
 *
 * Left alone:
 *  - :root / html / body           -> rewritten to .sk-root so tokens still land
 *  - @keyframes, @font-face        -> not selector-scoped
 *  - selectors already containing .sk-root
 *  - .sk-root itself
 */
const SKIP_AT = /^(keyframes|font-face|property|supports|layer|import|charset)$/i

export default function scope({ wrapper = '.sk-root' } = {}) {
  return {
    postcssPlugin: 'sk-scope',
    Rule(rule) {
      const parent = rule.parent
      if (parent && parent.type === 'atrule' && SKIP_AT.test(parent.name.replace(/^-\w+-/, ''))) return
      if (rule.__skScoped) return
      rule.__skScoped = true

      rule.selectors = rule.selectors.map((sel) => {
        const s = sel.trim()
        if (s.includes(wrapper)) return s
        // token carriers collapse onto the wrapper itself
        if (/^(:root|html|body)$/.test(s)) return wrapper
        if (/^(:root|html|body)([.:[#][^\s]*)?$/.test(s)) return s.replace(/^(:root|html|body)/, wrapper)
        // :is()/:where() at the head still needs wrapping
        return `${wrapper} ${s}`
      })
    },
  }
}
scope.postcss = true
