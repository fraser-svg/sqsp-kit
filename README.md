# sqsp-kit

A component runtime for Squarespace 7.1 — your own Spark Plugin, without the subscription.

Two lines of code injection on a client site, and components from this repo mount into it.
One hosted bundle serves every client; each client gets a JSON config saying which
components appear where and in what brand colours.

## Why it's built this way

Squarespace 7.1 has no template access, no build step and no server-side code, so the
only way in is Code Injection. Components sourced from 21st.dev or Landingfolio arrive as
React + Tailwind + shadcn, which cannot run there. So this repo is a conversion pipeline
plus a runtime: components are converted once into static HTML + scoped CSS + a `mount()`
function, bundled, and served from jsDelivr.

Two things make that safe on a live client site:

- **Nothing leaks.** Tailwind is built with `prefix: 'sk-'` and `preflight: false`, and a
  PostCSS plugin scopes every rule under `.sk-root`. The client's own Squarespace styling
  is untouched — the harness has a "native section" that proves it.
- **Nothing is stranded.** Remove the two injected lines and the site is exactly as it was.
  Components augment the real DOM (the mega menu hangs off the real nav links, which keep
  working as links) rather than replacing it.

## Install on a client site

```sh
node scripts/gen-client.mjs <slug>
```
Prints the exact Header and Footer snippets to paste. Requires the **Core plan or above** —
Code Injection is not available on Basic.

The bundle URL is pinned to a tag; the config URL is not. Edit `clients/<slug>.json`, push,
and the site updates with no re-paste. A Squarespace change can never break a client site
without you moving them to a new tag deliberately.

## Develop

```sh
npm run build                  # build dist/kit.min.{css,js}
python3 -m http.server 4177    # then open /harness/index.html
```

`harness/index.html` reproduces the shape of a 7.1 page — a `.header-nav-item` nav and
sections with `data-section-id` — so components are iterated locally instead of by
republishing a client's site.

## Add a component

```
components/<name>/
  meta.json         id, category, options schema, source URL, licence
  component.html    static markup (no JSX), Tailwind classes with the sk- prefix
  component.css     optional, for anything utilities can't express
  component.js      optional, exports mount(host, opts)
```
`scripts/build.mjs` discovers it automatically and regenerates `src/registry.js`.

Components render inside `.sk-root` and read semantic tokens (`sk-bg-background`,
`sk-text-muted-foreground`) which resolve to the CSS variables in `src/tokens.css`. A
client's `theme` block overrides those, so the same component takes each client's brand.

## Config shape

```json
{
  "theme": { "primary": "24 94% 50%", "radius": "14px" },
  "components": [
    { "id": "hero-split", "target": "<data-section-id>", "options": { } },
    { "id": "mega-menu", "mode": "augment", "target": "body", "editor": false, "options": { } }
  ]
}
```
- `target` — a `data-section-id`, a CSS selector, `body`, or `header`. Omit it for global
  components (they append to `<body>`).
- `mode: "augment"` — operate on the existing element instead of filling it.
- `editor: false` — skip in the Squarespace editor, for anything that interferes with editing.

Alternatively place `<div data-sk="hero-split" data-sk-opts='{...}'></div>` in a Code Block
to mount a component at an exact spot on a page.

## Licensing

This repo is public so jsDelivr can serve it, which makes anything in it *redistributed*.

- Components authored here or under a permissive licence: fine, they live in `components/`.
- Components derived from 21st.dev or Landingfolio: check the source's licence. Using them
  on a client site you build is normally fine; republishing them here may not be. Those
  ship as per-site pasted snippets, or move to a private bundle — they do not go in this repo.
- Every `meta.json` records `source` and `licence`. Keep it honest; audit before pushing.

## Squarespace constraints this respects

Sourced from `~/squarespace-kb/`:
- Code Injection and JS in Code Blocks need Core or above.
- CSS goes in the Header (or the CSS Editor), never the Footer — AJAX loading breaks it.
- Checkout pages accept no injection at all.
- Code Blocks cap at 400KB, which is part of why the bundle is hosted rather than pasted.
- The Developer Platform is 7.0-only, so on 7.1 this runtime is the ceiling.
- Squarespace support will not troubleshoot any of this, and platform updates can break DOM
  targeting — hence pinned versions per client.
