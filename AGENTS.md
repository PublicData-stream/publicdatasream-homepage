# Agent orientation

This repository builds the publicdata.stream server directory with Astro. It is
purely static: deploy `dist/` to Cloudflare Pages. Real server entries and legal
policy text are intentionally deferred; do not invent them.

## Authoritative guidance

[CONTRIBUTING.md](CONTRIBUTING.md) is authoritative for contributor workflow,
checks, commit messages, and trailer rules. Follow its Conventional Commits
guidance in this thread and future work. No mandatory trailers are defined.
This file summarizes orientation rather than duplicating those rules.

## Working in this repository

- Use pnpm exclusively. In this managed workspace, run pnpm package commands
  through the privileged command channel, following session permissions.
- Read README for local commands, authoring, and deployment. `pnpm run tsgo`
  invokes native TS 7; `pnpm run check:astro` also checks Astro templates.
- Server Markdown belongs in `src/content/servers/`; schema and loaders live in
  `src/content.config.ts`. General instructions use Markdown; client examples
  and optional plugin/policy references use typed frontmatter.
- URL, example, and Markdown validation belong in `src/lib/`. Preserve HTTPS-only
  external links, escaped examples, and the prohibition on raw HTML and secrets.
- Keep deferred rendering enabled: Astro's eager glob loader can log Markdown
  rendering failures without rejecting a build. The integration test protects
  this boundary.
- Keep production CSP compatible with local external CSS and no browser scripts.
  `public/_headers` must reach `dist/` unchanged.
- Keep templates and synthetic fixtures outside production collections. Tests
  use disposable directories and must not call actual MCP/API servers.
- Run applicable checks and report actual results and remaining limitations.
  Do not commit `dist/`, caches, credentials, or local session artifacts.

The task does not authorize production deployment, DNS changes, or invented
claims of live server/plugin availability. Repository guidance does not override
higher-priority instructions, user scope, or execution permissions.
