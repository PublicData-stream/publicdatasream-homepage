# publicdata.stream homepage

A static directory of publicdata.stream MCP and API servers, built with Astro.
The catalog is intentionally empty. Real server entries and operator-approved
Terms of Service and Privacy Policy text will be added later.

Markdown files become static documentation pages. The complete deployment
artifact is `dist/`. There is no application server, browser JavaScript, runtime
adapter, or application Worker script. Cloudflare Workers Static Assets serves
the generated files directly.

## Local development

Install Node **24.21.0** and [pnpm **12.8.1**](https://pnpm.io/installation).
Versions are pinned in `.node-version` and `package.json`. Use pnpm only.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open the address printed by Astro, normally `http://localhost:4321`.
`pnpm-workspace.yaml` explicitly allows esbuild and workerd's native-executable
installation scripts. workerd belongs to Wrangler's local tooling; it does not
add application code to the deployment. Other dependency build scripts are not
automatically approved; review changes to this rule alongside dependency updates.
Exact release-age exceptions cover the pinned Wrangler release and its newly
published runtime dependencies.

## Add server content

1. Copy `docs/templates/server.md` to `src/content/servers/<slug>.md`.
2. Replace synthetic metadata and `example.org` endpoints with verified
   information. Use a unique lowercase, hyphen-separated `slug`.
3. Write general installation, configuration, verification, and troubleshooting
   instructions in the Markdown body, including where each client example goes.
4. Fill client examples and review all text for credentials.
5. Run `pnpm run verify` and preview the site before submitting the change.

`src/content.config.ts` is the equivalent of a `src/servers.ts` data module. It
loads one Markdown file per server. Templates and synthetic test fixtures stay
outside production collections. The homepage sorts entries by name; each entry
generates `/servers/<slug>/`.

| Frontmatter field | Meaning |
| --- | --- |
| `slug` | Unique identifier and route segment |
| `name`, `description` | Server name and concise description |
| `capabilities` | Nonempty array containing `mcp`, `api`, or both |
| `codex` | `{ format, config }` example, or `{ unsupported }` explanation |
| `claude` | The same structure plus `client: Claude Desktop` or `client: Claude Code` |
| `chatgptPlugin` | Optional complete `{ definitionUrl, instructions }` object |
| `terms`, `privacy` | Optional slugs of existing policy entries |

Example formats are `toml`, `json`, `sh`, and `text`. Multiline `config` strings
are rendered as escaped code. For an API with no MCP transport, explain the lack
of support rather than inventing working MCP configuration:

```yaml
codex:
  unsupported: This API does not provide an MCP transport.
claude:
  client: Claude Desktop
  unsupported: This API does not provide an MCP transport.
```

Add a ChatGPT plugin object only when a separate plugin actually has a definition.
The URL must point to that definition or its documentation. Describe verified
installation instructions and accurate publication status. A remote MCP endpoint
alone is not a plugin; a defined plugin is not necessarily marketplace-listed.
Absent this object, no plugin section or link renders.

```yaml
chatgptPlugin:
  definitionUrl: https://example.org/defined-plugin
  instructions: |
    Replace with verified instructions for the separately defined plugin.
```

## Markdown and configuration safety

External links must be absolute `https:` URLs with a hostname and no embedded
credentials. Any valid HTTPS hostname is allowed; there is no hostname allowlist.
HTTP, protocol-relative URLs, unsupported schemes, malformed URLs, backslashes,
and control characters are rejected. The rule covers metadata, inline links,
reference links, and autolinks.

Internal Markdown links use root-relative paths such as `/servers/example/` or
fragments such as `#setup`. Raw HTML is rejected. Images use local root-relative
paths to assets in `public/`, matching the security policy. Plain fenced code is
supported; MDX and executable content are not loaded.

Never include actual tokens, passwords, keys, credentialed URLs, or secret query
parameters. Use environment-variable selectors, references, or obvious placeholders:

```toml
bearer_token_env_var = "PUBLICDATA_TOKEN"
```

```json
{"headers":{"Authorization":"Bearer ${PUBLICDATA_TOKEN}"}}
```

```text
API_KEY="<YOUR_API_KEY>"
```

Checks cover frontmatter configuration, plugin instructions, fenced code, and
inline code. They reject common literal credential assignments, secret flags,
URL credentials, and recognized secret patterns. They cannot recognize every
secret format; review unfamiliar examples manually. Validator error messages do
not echo matched credential values.

Astro's supported unified Markdown processor runs the safety plugin. Rendering
is deferred until static generation so validation errors abort the build instead
of merely being logged by Astro's eager content renderer.

## Add policy content later

No legal text or pending policy pages are included. Leave `terms` and `privacy`
absent until operator-approved content exists.

Later, create `src/content/policies/<policy-slug>.md` with frontmatter like:

```yaml
slug: example-terms
server: example
kind: terms
title: Example server Terms of Service
```

Write the approved policy in the Markdown body. `kind` is `terms` or `privacy`;
`server` must match an existing server slug. Reference it from that server using
`terms: example-terms` or `privacy: example-privacy`. Generated routes are
`/servers/<server>/terms/` and `/servers/<server>/privacy/`.

Missing references, mismatched server/kind, duplicate slugs or policy routes, and
empty content fail validation. Omitted references render no policy links.

## Checks and static builds

```sh
pnpm run lint
pnpm run tsgo
pnpm run check:astro
pnpm run check:cloudflare
pnpm run test
pnpm run build
pnpm run preview
```

| Command | Checks or behavior |
| --- | --- |
| `pnpm run lint` | oxlint; warnings fail the command |
| `pnpm run tsgo` | Astro type generation, then native TS 7 checking without emission |
| `pnpm run check:astro` | Astro template and TypeScript diagnostics |
| `pnpm run check:cloudflare` | Reject Worker code, bindings, provisioning, and environment overrides |
| `pnpm run test` | Safety/schema tests and disposable static integration builds |
| `pnpm run build` | Deployment configuration, lint, both type checks, static build, and output verification |
| `pnpm run verify` | Tests followed by the complete build pipeline; used by CI |
| `pnpm run preview` | Serve the built static site locally |
| `pnpm run deploy` | Validate configuration and existing output, then publish with pinned Wrangler |

Stable TypeScript 7 names its native executable `tsc`, replacing the preview
name `tsgo`. `pnpm run tsgo` invokes the pinned `typescript-native` package alias
directly. TypeScript 6 is retained only for Astro's template checker, whose peer
range currently excludes TS 7. tsgo alone does not check `.astro` templates.

Astro uses Vite 8 and its bundled Rolldown pipeline. Rspack is not a supported
drop-in replacement, so no custom build integration is introduced. Framework,
lint, and type-check packages are build-time dependencies.

`scripts/check-dist.mjs` checks copied headers, required pages, link schemes,
and absence of inline scripts/styles, JavaScript output, source maps, and runtime
bundles. CI uses a frozen lockfile and uploads `dist/` after verification.
Generated output, caches, and credentials are ignored by Git.

## Cloudflare Workers Static Assets deployment

The root `wrangler.jsonc` selects `dist/`, trailing-slash URLs, and the custom
404 page. It has no Worker entrypoint, runtime bindings, Functions, KV, D1, R2,
or resource provisioning. Keep its syntax JSON-compatible (no comments or
trailing commas) for the configuration guard. The guard allows only the intended
static asset options and runs during builds and before `pnpm run deploy`.
Astro remains `output: 'static'` with no Cloudflare adapter.
[Cloudflare's static Astro guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/#if-you-have-a-static-site)
documents this configuration.

Open the existing `publicdatasream-homepage` Worker, matching the spelling in
`wrangler.jsonc`, and connect this GitHub repository under **Settings > Build**.
Configure:

| Setting | Value |
| --- | --- |
| Root directory | Repository root; leave blank |
| Production branch | `main` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Preview command, if enabled | `pnpm run check:cloudflare && node scripts/check-dist.mjs && pnpm exec wrangler preview --ignore-base-config` |

Under **Settings > Build > Build Variables and Secrets**, add plain build variables:

| Variable | Value |
| --- | --- |
| `NODE_VERSION` | `24.21.0` |
| `PNPM_VERSION` | `12.8.1` |
| `ASTRO_TELEMETRY_DISABLED` | `1` |

Use these values for production and preview builds. Keep automatic dependency
installation enabled and development dependencies available. Confirm the pinned
Node and pnpm versions in the build log. The output directory comes from Wrangler
configuration rather than a Pages output-directory field.
[Workers build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and [build version overrides](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
describe these fields. Wrangler is pinned as a development dependency; use
`pnpm exec wrangler` rather than downloading an unpinned CLI.
Preview uploads ignore dashboard base configuration to avoid inheriting runtime
resource bindings outside the verified local configuration.

Validate locally without publishing:

```sh
pnpm install --frozen-lockfile
pnpm run verify
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler dev --local
```

The local Wrangler server applies static routing and `_headers`; Astro's preview
server does not. Check `/`, an unknown path (404), and `/404` redirecting to
`/404/`, along with security headers on HTML and CSS responses. Stop the local
server when finished. These checks need no MCP/API credentials or live servers.

After separately authorizing a release, `pnpm run deploy` uploads the verified
existing `dist/` using Cloudflare deployment authentication. Run the build first;
the deployment command does not rebuild. It rejects unsafe configuration and
runtime output before invoking Wrangler.

### Billing boundary

[Static asset requests are free and unlimited, with no additional asset storage cost](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
This configuration includes no application code to incur Worker compute charges
and no resource bindings. Keep Workers Caching and other paid add-ons disabled.

For zero Cloudflare hosting/build fees, use the **Workers Free plan**. The
[Workers Paid plan has an account subscription charge](https://developers.cloudflare.com/workers/platform/pricing/)
even when this site's asset requests cost nothing. Workers Builds on Free includes
3,000 build minutes per month; paid plans can charge for extra minutes.
[Build limits and pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
are separate from asset serving. Repository configuration cannot change or
cancel account subscriptions, existing resources, or unrelated charges.

After deployment:

1. Inspect the `workers.dev` URL, navigation, code blocks, and 404 page on desktop and
   mobile. Confirm browser console output has no CSP violations.
2. Check HTTP response headers on the homepage, a server page when present, and
   an asset against `public/_headers`.
3. When authorized, add `publicdata.stream` through **Settings > Domains & Routes >
   Add > Custom domain**. The domain must be in an active Cloudflare zone in the
   account. Follow [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
   Canonical links target `https://publicdata.stream`.
4. Review changes using branch/PR preview deployments before production.
5. For a bad release, roll back to a successful production version in Workers,
   then fix or revert the source change before redeploying.

`public/_headers` is copied to `dist/_headers` and applied to static responses by
Workers Static Assets. Astro's development and preview servers do not apply this file;
local preview alone does not verify Cloudflare headers. CSP permits local CSS,
images, and fonts, plus the pinned Google Sans Flex stylesheet and font files
from its jsDelivr package path. Scripts, application network connections, forms,
and framing remain blocked. The site always uses a dark theme with Google Sans
Flex Variable and system font fallbacks; code examples retain monospace fonts.
The file also defines `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, and `X-Frame-Options`.
[Cloudflare headers documentation](https://developers.cloudflare.com/workers/static-assets/headers/)
describes their deployment behavior.

Local verification and CI do not deploy, provision Cloudflare resources, change
DNS, or alter account billing. The catalog and legal policy content remain deferred.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and commit rules and
[AGENTS.md](AGENTS.md) for agent orientation. Imported commit guidance's source
and license are recorded in CONTRIBUTING.
