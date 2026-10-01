# Contributing

This repository publishes static documentation for publicdata.stream MCP and API
servers. This document owns contributor workflow, checks, commit messages, and
trailer rules; AGENTS.md points here for agent orientation.

## Workflow and checks

Use pnpm only and preserve the pinned Node/pnpm versions and committed lockfile.
Keep server information source-backed, put new entries in the Markdown collection,
and update README and the authoring template when content contracts change.
Never add real secrets or claim an unverified deployment/plugin is available.

For code or content changes, run:

```sh
pnpm install --frozen-lockfile
pnpm run verify
git diff --check
```

Inspect untracked files as well as the diff. For documentation-only changes,
check Markdown rendering, relative links, commands, and consistency with the
implementation; `git diff --check` remains applicable. Report skipped or failed
checks and why, rather than presenting them as passed. Changes to destination
validation, configuration handling, content rendering, or static output need
focused regression evidence.

Do not commit generated output, credentials, logs, caches, or bulk data. Use
portable repository paths in durable evidence. Publishing and DNS changes require
user authorization; successful builds do not imply a successful deployment.

## Commit messages

Use lightweight Conventional Commits:

```text
<type>(optional-scope): <concise subject>
```

Use `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, or
`revert`. A scope, when useful, names the affected responsibility. Describe a
security fix using the appropriate type without disclosing private findings.

```text
docs(governance): define legal-data review requirements
fix(normalization): preserve unknown effective dates
test(cache): cover concurrent refresh cancellation
```

Subjects should explain the change clearly. No special tense policing or mandatory
backticks around every identifier are required. Explain important behavior and
compatibility context in the body or PR, using portable evidence.

## Trailers

No mandatory trailers are defined. The selected upstream commit guidance contains
no trailer rules; do not invent mandatory sign-off or co-author requirements.
If a contributor intentionally includes attribution or another trailer, it must
be accurate. These rules apply to work in this thread and subsequent contributions.

## Imported guidance and provenance

The commit-message section above is copied from
[PublicData-stream/openlegal4everyoneMCP CONTRIBUTING.md](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/d79190899e4c3d32f7c8ecbfa850cbfd2cb0d2ed/CONTRIBUTING.md#commit-messages)
at revision `d79190899e4c3d32f7c8ecbfa850cbfd2cb0d2ed`.
Copyright 2026 PiQuark6046 as a contributor of openlegal4everyoneMCP.
That imported excerpt is licensed under
[GNU AGPL version 3 only](docs/notices/AGPL-3.0-only.txt)
(`AGPL-3.0-only`). Preserve this attribution and license reference.

Only the commit guidance was imported. Rust, legal-data processing, backend
review gates, and release/deployment policies from that repository do not apply
to this static site.
