---
slug: openlegal4everyonemcp
language: en
name: OpenLegal4Everyone MCP
description: An MCP server for searching and reading Korean legal sources, checking citations, and comparing revisions and supplied texts.
capabilities: [mcp]
terms: openlegal4everyone-terms
privacy: openlegal4everyone-privacy
codex:
  format: toml
  config: |
    [mcp_servers.openlegal4everyone]
    url = "https://openlegal4everyone.mcp.publicdata.stream/mcp"
claude:
  client: Claude Code
  format: json
  config: |
    {
      "mcpServers": {
        "openlegal4everyone": {
          "type": "http",
          "url": "https://openlegal4everyone.mcp.publicdata.stream/mcp"
        }
      }
    }
chatgptPlugin:
  definitionUrl: https://github.com/PublicData-stream/openlegal4everyoneMCP/tree/2ce26a97b760c4073db46d0d538e0f829981da0d/plugins/openlegal
  instructions: |
    The OpenLegal plugin combines an MCP connection with skills for Korean legal research, revision history, and text comparison. Its manifests and skills have been validated offline; live Claude and ChatGPT connections and public directory listings remain unverified. The optional setup steps are described above.
---

### Service and availability

OpenLegal4Everyone MCP is the MCP interface of openlegal4everyone.stream. Its
Korean LAW OPEN DATA adapter covers national statutes, administrative rules,
local ordinances, treaties, court precedents, Constitutional Court decisions,
legal interpretations, and administrative appeals. These are implemented dataset
adapters; they do not establish which records a hosted corpus currently contains.
The service provides legal information rather than advice about a particular case.

**Status checked on 2026-10-02 (UTC):** an operator-host inspection found the
server and collection scheduler unready (`Ready 0/1`, `CrashLoopBackOff`). The
public endpoint was not called during this documentation check. The instructions
below describe the configured connection and implemented tools; current public
availability, successful upstream collection, and complete corpus coverage remain
unverified. A successful client connection alone does not establish any of them.

### Connect

Use a client that supports remote MCP over Streamable HTTP. The configured HTTPS
endpoint is:

```text
https://openlegal4everyone.mcp.publicdata.stream/mcp
```

The documented server design uses anonymous access, with no user account, API
token, or OAuth sign-in. You do not need to install the backend or obtain LAW OPEN
DATA provider credentials to configure a client connection.

For **Codex**, merge the TOML example in the Client configuration section below
into `~/.codex/config.toml`. Preserve existing settings and avoid adding the same
server table twice. Start a new Codex session, then use `/mcp` to inspect the
active server. `codex mcp list` lists configured servers. See the
[official Codex MCP guide](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

For **Claude Code**, merge the JSON example below into the `mcpServers` object in
your project's `.mcp.json`. Start Claude Code in that project, review its
project-server approval prompt when shown, and use `/mcp` to inspect the connection.
`claude mcp get openlegal4everyone` shows the configured server's status. See the
[official Claude Code MCP guide](https://code.claude.com/docs/en/mcp).

### Check the connection

1. Confirm that your client reports the server as connected and exposes its tools.
2. Ask the client to call `server_info`. It reports server identity, supported
   protocols, license, and the corresponding-source URL; it does not retrieve
   legal documents.
3. Inspect the available tools before trying the workflows below. Corpus and
   text-comparison tools are optional server features; a missing tool may indicate
   deployment configuration or a different server version.
4. When legal tools are available, read an identified document and its provenance
   to check retrieval separately. Report empty, unavailable, or incomplete results
   as returned rather than treating the connection check as a retrieval success.

### Features and example questions

The following tools are implemented in the reference project. Use the connected
server's tool list to determine which are enabled.

| Task | Tools | What to expect |
| --- | --- | --- |
| Find a law or phrase | `law.resolve_name`, `database.query`, `database.rg` | Resolve Korean names and abbreviations, or search retained text. |
| Read source text | `database.get`, `database.get_metadata`, `law.article` | Read a document, article, chapter, or annex with source and freshness metadata. |
| Check citations and references | `citation.verify`, `precedent.citing`, `article.impact` | Check retained citations, find citing decisions, and inspect article references. |
| Inspect revisions | `database.history`, `database.diff`, `law.in_force_at`, `law.watch`, `law.lineage` | Select or compare retained versions and inspect title changes or upcoming revisions. |
| Compare your own texts | `text.diff` | Compare two supplied drafts by lines and characters. |
| Request missing material | `database.object_status`, `database.request_collection`, `database.collection_status` | Inspect local state, explicitly request collection, and check the background request. |

Example requests to your client:

- “Read 민법 제750조 in Korean and include the source URL, revision, and last
  validation time.”
- “List retained revisions of 근로기준법 and compare the two most recent
  available versions. Identify their publication and effective dates.”
- “Check the law articles and case numbers cited in the text I provide. Separate
  verified citations from records the corpus has not observed.”
- “Compare these two draft clauses and show every changed passage. Distinguish
  the exact text differences from any summary.”

These are workflow examples, not sample legal findings. English-language requests
do not turn Korean source text into an official English translation.

Collection requests queue background work and do not immediately return legal
text. Keep the returned `request_id`, check `database.collection_status`, and
search again after completion. Completion does not guarantee the requested text
was collected. Equivalent requests coalesce for 24 hours; avoid repeated requests
in a loop. `law.watch` checks changes when called; scheduling and notifications
belong to the client.

### Check sources, dates, and coverage

Keep the official title, source URL, object identity, revision, and capture ID with
each quotation. Include `retrieved_at`, `validated_at`, and `freshness`; translate
or summarize only with a clear label. Provider text, extracted attachments, and
OCR are separate evidence types. Disclose missing attachments or sparse annex
text rather than reconstructing it.

Search results expose coverage, index lag, and collection notices. Zero hits with
a continuation cursor require another page before concluding the search is empty.
`not_observed` means this corpus has no observation; it does not mean the law or
decision does not exist. `none_found` from `precedent.citing` does not establish
that a precedent remains good law.

Use `fresh_only: true` when current text is required and report a freshness error
instead of silently replacing it with stale text. Exact publication/effective-date
selectors identify recorded dates. `law.in_force_at` selects from retained
revisions on or before a date and reports the basis and inventory status; it does
not decide which law applies to particular facts or resolve transitional rules.

### Optional plugin setup

The separately defined OpenLegal plugin bundles the `korean-law-research`,
`legal-revision-history`, and `legal-text-comparison` skills. Its manifests and
skills have offline validation; live client connections, widgets, and public
directory listings remain unverified in the reference documentation.

The repository documents these Claude Code commands:

```text
/plugin marketplace add PublicData-stream/openlegal4everyoneMCP
/plugin install openlegal@openlegal4everyone
```

Choose either the plugin's bundled connection or the manual connection above to
avoid duplicate tool registrations.

For ChatGPT, enable developer mode in **Settings → Security and login**, then open
**ChatGPT Plugins**, select the plus button, and enter the HTTPS endpoint above.
Review the discovered tools after creating the connection. Availability depends
on your account and workspace policy. This creates an MCP connection; it does not
establish that the separately defined OpenLegal plugin is publicly listed or
imports its bundled skills. Follow the
[official ChatGPT connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

### Supplied texts and temporary retention

The text-comparison implementation holds supplied text, patches, and results in
application memory. Uploaded attachments expire ten minutes after the initial
upload; comparisons and generated attachments expire ten minutes after publication.
Reads do not extend those deadlines. Expiry prevents new reads, and periodic
cleanup removes expired entries. An operation already using the text may retain
it until the operation finishes.

Delete comparison results earlier with `text.diff.delete` and attachments with
`text.attachment.delete` when finished. Comparison and attachment handles have
independent lifetimes: deleting a comparison does not delete its patch attachment,
and deleting an attachment does not delete the comparison. Keep handles private;
anyone holding one may be able to read or delete its contents.

Memory storage, expiry, and deletion do not guarantee secure erasure of host
memory, swap, or crash dumps, and do not remove text already returned to clients
or retained in their history. See the
[Terms of Service](/servers/openlegal4everyonemcp/terms/) and
[Privacy Policy](/servers/openlegal4everyonemcp/privacy/) for the public instance's
conditions and processing scope, including optional rate limiting and security
records.

### Troubleshooting

| Symptom | Next step |
| --- | --- |
| Connection fails or the server is unavailable | Check the exact HTTPS URL and `/mcp` path, client network access, and current service status. Configuration alone cannot resolve an unready backend. |
| Claude Code reports pending approval | Open Claude Code in the project, review the server prompt, then check `/mcp` again. |
| A documented tool is missing | Inspect the tool list and server version; use only enabled tools. |
| `not_observed`, `processing_pending`, or `collection_incomplete` | Check `database.object_status`; request collection explicitly when available and track its status. Do not infer legal nonexistence. |
| `freshness_unavailable` or incomplete coverage | Report the limitation, inspect source metadata and collection notices, and avoid a claim of current or complete results. |
| `rate_limited` or an expired cursor/handle | Respect the returned retry guidance; restart expired search/read sessions or supply the text again rather than looping. |

### Reference documentation

The feature descriptions above use reference revision
`2ce26a97b760c4073db46d0d538e0f829981da0d`, not an assertion about the deployed version.

- [Project and development status](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/README.md)
- [Korean LAW OPEN DATA adapter and collection limits](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/providers/kr-law-go-kr.md)
- [Corpus search, reads, history, and freshness](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/database.md)
- [Name resolution, citations, and date selection](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/legal-reference.md)
- [Article reads and reference analysis](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/legal-analysis.md)
- [Text comparison and retention](https://github.com/PublicData-stream/openlegal4everyoneMCP/blob/2ce26a97b760c4073db46d0d538e0f829981da0d/docs/text-diff.md)
- [Plugin definition and installation status](https://github.com/PublicData-stream/openlegal4everyoneMCP/tree/2ce26a97b760c4073db46d0d538e0f829981da0d/plugins/openlegal)
