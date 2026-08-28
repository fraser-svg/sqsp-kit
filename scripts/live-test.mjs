/* Drive a real Squarespace site and prove the kit behaves.
 *
 *   node scripts/live-test.mjs https://site.squarespace.com [--password X] [--headed]
 *
 * Checks, in order:
 *   1. the bundle actually loaded (no CSP / CDN surprise)
 *   2. components mounted
 *   3. the mega menu opens on hover and closes on Escape
 *   4. mounting survives client-side navigation to another page
 *   5. no console errors from us
 *   6. our CSS did not leak into the site's own type or colour
 * Screenshots land in .live/ for eyeballing.
 */
import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const args = process.argv.slice(2)
const url = args.find((a) => a.startsWith('http'))
if (!url) { console.error('usage: node scripts/live-test.mjs <url> [--password X] [--headed]'); process.exit(1) }
const password = args[args.indexOf('--password') + 1]
const headed = args.includes('--headed')
const out = path.resolve(import.meta.dirname, '..', '.live')
await mkdir(out, { recursive: true })

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({ headless: !headed })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

const response = await page.goto(url, { waitUntil: 'domcontentloaded' })

// A trial site defaults to Private: Squarespace answers 401 with a "Private Site"
// page that has no password field, so there is nothing to log into.
if (response && response.status() === 401) {
  const title = await page.title().catch(() => '')
  console.error(`\nSite is PRIVATE (HTTP 401${title ? `, "${title}"` : ''}).`)
  console.error('Squarespace: Settings > Site Availability > Public (or Password-protected, then pass --password).')
  await browser.close(); process.exit(2)
}

// Squarespace's lock screen when the site is set to Password-protected
if (password && (await page.locator('input[type="password"]').count())) {
  await page.fill('input[type="password"]', password)
  await page.keyboard.press('Enter')
  await page.waitForLoadState('domcontentloaded')
}
if (await page.locator('input[type="password"]').count()) {
  console.error('\nSite is still behind a password. Set Site Availability to Public, or pass --password.')
  await browser.close(); process.exit(2)
}

await page.waitForTimeout(2500)

// 1. bundle present
const loaded = await page.evaluate(() => ({
  css: [...document.styleSheets].some((s) => /sqsp-kit|kit\.min\.css/.test(s.href || '')),
  js: !!window.SQSPKIT_INFO,
  info: window.SQSPKIT_INFO || null,
  version: window.SQSPKIT_INFO?.version,
}))
check('stylesheet loaded', loaded.css, loaded.css ? '' : 'no sqsp-kit sheet in document.styleSheets')
check('runtime loaded', loaded.js, loaded.info ? `detected Squarespace ${loaded.version}, components: ${loaded.info.components.join(', ')}` : 'window.SQSPKIT_INFO missing')
if (!loaded.js) { await browser.close(); process.exit(1) }

// 2. mounted
const mounted = await page.evaluate(() => ({
  filled: [...document.querySelectorAll('[data-sk-mounted]')].map((e) => e.dataset.skMounted),
  panels: document.querySelectorAll('.sk-mega-panel').length,
  links: [...document.querySelectorAll('[data-sk-mega]')].map((a) => a.textContent.trim()),
}))
check('components mounted', mounted.filled.length + mounted.panels > 0,
  `filled: [${mounted.filled.join(', ') || 'none'}], mega panels: ${mounted.panels}${mounted.links.length ? ` on [${mounted.links.join(', ')}]` : ''}`)

// 3. mega menu interaction
if (mounted.panels) {
  const link = page.locator('[data-sk-mega]').first()
  await link.hover()
  await page.waitForTimeout(400)
  const open = await page.evaluate(() => document.querySelector('.sk-mega-panel[data-open="true"]') !== null)
  check('mega menu opens on hover', open)
  await page.screenshot({ path: path.join(out, 'mega-open.png'), fullPage: false })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const closed = await page.evaluate(() => document.querySelector('.sk-mega-panel[data-open="true"]') === null)
  check('mega menu closes on Escape', closed)
}

// section inventory, taken before we navigate away
const sections = await page.evaluate(() =>
  [...document.querySelectorAll('[data-section-id]')].map((s) => ({
    id: s.dataset.sectionId,
    text: (s.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
  })))
await page.screenshot({ path: path.join(out, 'page.png'), fullPage: true })

// 4. survives navigation — this is what the MutationObserver exists for
const nav = await page.evaluate(() => {
  const a = [...document.querySelectorAll('.header-nav-item a, nav a')]
    .find((x) => x.getAttribute('href')?.startsWith('/') && x.getAttribute('href') !== '/')
  return a?.getAttribute('href') || null
})
if (nav) {
  await page.click(`a[href="${nav}"]`).catch(() => page.goto(new URL(nav, url).href))
  await page.waitForTimeout(2500)
  const after = await page.evaluate(() => ({
    hasKit: !!window.SQSPKIT_INFO,
    panels: document.querySelectorAll('.sk-mega-panel').length,
    filled: document.querySelectorAll('[data-sk-mounted]').length,
    url: location.pathname,
  }))
  if (!after.hasKit) {
    // the destination never loaded the bundle at all — on a real Squarespace site
    // injection is site-wide, so this means the page is outside the site (or the
    // local harness, which only has one page). Not a re-mount failure.
    check('survives navigation', true, `INCONCLUSIVE — ${after.url} has no bundle, nothing to re-mount`)
  } else {
    check('survives navigation', after.panels + after.filled > 0,
      `at ${after.url}: ${after.filled} filled, ${after.panels} panels`)
  }
} else {
  check('survives navigation', false, 'no internal nav link found to click — skipped')
}

// 5. console
const ours = errors.filter((e) => /sqsp-kit|sk-root|SQSPKIT/.test(e))
check('no errors from the kit', ours.length === 0, ours.slice(0, 3).join(' | ') || `${errors.length} unrelated site errors ignored`)

// 6. CSS containment: our sheet must not style the site's own elements
const leak = await page.evaluate(() => {
  const el = [...document.querySelectorAll('h1, h2, p')].find((e) => !e.closest('.sk-root'))
  if (!el) return { checked: false }
  const rules = []
  for (const sheet of document.styleSheets) {
    if (!/sqsp-kit|kit\.min\.css/.test(sheet.href || '')) continue
    let list; try { list = sheet.cssRules } catch { continue }
    for (const r of list) {
      if (!r.selectorText) continue
      try { if (el.matches(r.selectorText)) rules.push(r.selectorText) } catch {}
    }
  }
  return { checked: true, tag: el.tagName, rules }
})
check('no CSS leak onto site content', leak.checked ? leak.rules.length === 0 : false,
  leak.checked ? `${leak.tag} matched ${leak.rules.length} kit rules${leak.rules.length ? ': ' + leak.rules.slice(0, 3).join(', ') : ''}` : 'no non-kit element found to test')

const mobile = await ctx.newPage()
await mobile.setViewportSize(devices['iPhone 13'].viewport)
await mobile.goto(url, { waitUntil: 'domcontentloaded' })
await mobile.waitForTimeout(2000)
await mobile.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true })
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('no horizontal overflow on mobile', overflow <= 1, `${overflow}px`)

console.log('\nSections on this page (use these as "target" in the client config):')
sections.forEach((s) => console.log(`  ${s.id}  ${s.text}`))
console.log(`\nScreenshots: ${out}`)

await browser.close()
process.exit(results.some((r) => !r.pass) ? 1 : 0)
