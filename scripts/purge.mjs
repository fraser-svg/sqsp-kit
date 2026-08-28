/* Purge a client's config (or the whole bundle) from jsDelivr's edge cache.
 * Does nothing for already-cached browsers — see gen-client.mjs for why inline
 * config is the default. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const repo = pkg.repository || 'fraser-svg/sqsp-kit'
const slug = process.argv[2]

const paths = slug
  ? [`/gh/${repo}@main/clients/${slug}.json`]
  : [`/gh/${repo}@main/dist/kit.min.js`, `/gh/${repo}@main/dist/kit.min.css`]

const res = await fetch('https://purge.jsdelivr.net/', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ path: paths }),
})
console.log(res.status, await res.text())
