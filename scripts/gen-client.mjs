/* Print the exact code to paste into a client's Squarespace site.
 *   node scripts/gen-client.mjs <slug> [version] [--fetch]
 *
 * Default output inlines the config into Header injection. That is deliberate:
 * jsDelivr serves branch paths with `cache-control: max-age=604800, s-maxage=43200`,
 * so a fetched config is cached for 12h at the edge and a week in the visitor's
 * browser — "edit the JSON and the site updates" is not true for a returning
 * visitor. Inline config updates the instant you save the injection panel.
 * Use --fetch only when one config must serve many sites and a day's lag is fine.
 */
import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const useFetch = args.includes('--fetch')
const [slug, versionArg] = args.filter((a) => !a.startsWith('--'))
if (!slug) { console.error('usage: node scripts/gen-client.mjs <slug> [version] [--fetch]'); process.exit(1) }

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const repo = pkg.repository || 'fraser-svg/sqsp-kit'
let version = versionArg
if (!version) {
  try { version = execSync('git describe --tags --abbrev=0', { cwd: root }).toString().trim() }
  catch { version = 'v' + pkg.version }
}

const cfg = JSON.parse(await readFile(path.join(root, 'clients', `${slug}.json`), 'utf8'))
const base = `https://cdn.jsdelivr.net/gh/${repo}@${version}`
const ids = (cfg.components || []).map((c) => c.id)

const header = useFetch
  ? `<link rel="stylesheet" href="${base}/dist/kit.min.css">`
  : `<link rel="stylesheet" href="${base}/dist/kit.min.css">
<script>window.SQSPKIT = ${JSON.stringify({ theme: cfg.theme, components: cfg.components }, null, 2)}</script>`

const footer = useFetch
  ? `<script src="${base}/dist/kit.min.js" data-config="https://cdn.jsdelivr.net/gh/${repo}@main/clients/${slug}.json"></script>`
  : `<script src="${base}/dist/kit.min.js"></script>`

console.log(`
=== ${slug} — Squarespace install (bundle ${version}${useFetch ? ', fetched config' : ', inline config'}) ===

Requires the Core plan or above — Code Injection is not available on Basic.

1) Settings > Advanced > Code Injection > HEADER
${header}

2) Settings > Advanced > Code Injection > FOOTER
${footer}

Components: ${ids.join(', ') || '(none)'}

Notes
- The stylesheet goes in the HEADER on purpose. In the Footer it loads after the
  page paints and components flash unstyled.
- Section targets are the section's data-section-id, read off the live page with
  the inspector. Put them in clients/${slug}.json.
${useFetch
  ? `- Fetched config is cached by jsDelivr for up to 12h at the edge and 7 days in
  a returning visitor's browser. After editing the JSON run:
      node scripts/purge.mjs ${slug}
  and expect returning visitors to lag regardless.`
  : `- To change this client's setup, edit clients/${slug}.json, re-run this command,
  and re-paste the Header block. Takes effect immediately, no CDN cache involved.`}
- Bundle upgrades are deliberate: re-run with a new tag and re-paste. Pinning means
  a Squarespace change can never break a client site without you choosing it.
- To remove entirely: delete both blocks. Nothing is left behind.
`)
