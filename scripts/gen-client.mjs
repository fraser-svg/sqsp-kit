/* Print the exact code to paste into a client's Squarespace site.
 *   node scripts/gen-client.mjs acme [version]
 * Reads clients/<slug>.json. Version defaults to the current git tag. */
import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const slug = process.argv[2]
if (!slug) { console.error('usage: node scripts/gen-client.mjs <slug> [version]'); process.exit(1) }

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const repo = pkg.repository || 'fraser-svg/sqsp-kit'
let version = process.argv[3]
if (!version) {
  try { version = execSync('git describe --tags --abbrev=0', { cwd: root }).toString().trim() }
  catch { version = 'v' + pkg.version }
}

const cfg = JSON.parse(await readFile(path.join(root, 'clients', `${slug}.json`), 'utf8'))
const base = `https://cdn.jsdelivr.net/gh/${repo}@${version}`
const configUrl = `https://cdn.jsdelivr.net/gh/${repo}@main/clients/${slug}.json`

const markers = (cfg.components || [])
  .filter((c) => !c.target)
  .map((c) => `<div data-sk="${c.id}"></div>`)

console.log(`
=== ${slug} — Squarespace install (bundle ${version}) ===

Requires the Core plan or above (Code Injection is not available on Basic).

1. Settings > Advanced > Code Injection > HEADER — paste:

<link rel="stylesheet" href="${base}/dist/kit.min.css">

2. Settings > Advanced > Code Injection > FOOTER — paste:

<script src="${base}/dist/kit.min.js" data-config="${configUrl}"></script>

3. Components in this config: ${(cfg.components || []).map((c) => c.id).join(', ') || '(none)'}
${markers.length ? `\n   Global components mount themselves — nothing to place.\n` : ''}
   Section-targeted components need the section's data-section-id. To find one:
   open the live page, inspect the section, copy data-section-id, put it in
   clients/${slug}.json as "target".

   The config URL is unpinned (@main) on purpose — edit clients/${slug}.json,
   push, and the site picks it up without re-pasting anything. The bundle itself
   stays pinned to ${version} so a Squarespace change can never break this site
   without you choosing it.

4. To remove entirely: delete the two snippets above. Nothing else is left behind.
`)
