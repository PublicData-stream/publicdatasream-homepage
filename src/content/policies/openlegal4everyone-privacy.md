---
slug: openlegal4everyone-privacy
language: en
server: openlegal4everyonemcp
kind: privacy
title: OpenLegal4Everyone Privacy Policy
---

## Article 1 (Overview and scope)

OpenLegal 4 Everyone (the "Service") is provided without accounts, sign-in, cookies or tracking tools, and processes only the information it needs to provide and protect the Service. [Operator name] (the "Operator") publishes this Privacy Policy under Article 30 of the Personal Information Protection Act of the Republic of Korea. The conditions for using the public instance are set out in the [Terms of Service](/servers/openlegal4everyonemcp/terms/).

This Privacy Policy applies to:

- The public MCP instance: `https://openlegal4everyone.mcp.publicdata.stream/mcp`

The Service is used through LLM/AI SaaS products such as Claude and ChatGPT ("AI platforms") and through LLM/AI agentic clients that users install themselves ("AI clients"). Conversations and local history are handled under the privacy policies and settings of those platforms and clients. The Service does not retrieve the whole conversation itself; it receives tool parameters (such as search terms or text to compare) and protocol metadata sent by the platform or client. Conversation content included in those parameters is also received.

To apply per-user rate limits, the Service may use a platform-provided user identifier, such as OpenAI ChatGPT's `_meta["openai/subject"]`. Such an identifier can distinguish calls from the same user even without exposing their name; it is not a guarantee of complete anonymity. If this rate limiting is enabled, the identifier is held only in memory for that purpose and deleted automatically once its rate limit has fully recovered.

The Service's source code is free and open-source software licensed under the GNU AGPL-3.0-only and is available for inspection in the [source repository](https://github.com/PublicData-stream/openlegal4everyoneMCP). Actual processing also depends on the deployed version and operating settings.

## Article 2 (Personal information processed, purposes and retention)

The Service does not ask users to supply names, email addresses, phone numbers, accounts, payment information, location or advertising identifiers. Input or client metadata may nevertheless contain such information. Only information needed for the purposes below is used; users should avoid including unnecessary personal information.

The table describes the permitted processing scope, including per-user rate limiting and security records that may be enabled when needed. It does not mean that every item is collected on every request. A feature may be enabled within the published items, purposes and retention conditions; expanding those conditions follows Article 13. Publication alone does not replace any consent or other legal basis required for the processing.

| Category | Information processed | Purpose | Retention |
| --- | --- | --- | --- |
| Legal search and lookup | Tool parameters and continuation state (search terms, statute names, article numbers, reference dates, jurisdiction, time zone, etc.) | Returning search and lookup results and continuing a result page | Continuation state is held in memory and becomes unusable 10 minutes after creation, without extension. Expired state is removed on a subsequent search or lookup, or when the server process ends; expiry does not mean immediate memory erasure |
| Text comparison | Text and patches submitted by the user, and the comparison results | Returning text comparison and patch results | Held in memory only. Uploads expire 10 minutes after the initial upload; results and generated attachments expire 10 minutes after publication, without extension. Periodic cleanup removes expired items. Delete tools allow earlier removal; active operations may hold the text until they finish |
| Collection requests | Document identifiers, case numbers, collection search terms and target datasets; request identifier, hash, status and reason | Collecting public legal material from the Korea Law Information Center and checking request status | The request payload is cleared when processing completes, fails or is skipped; a deferred request keeps it for retry. Records expire 1 day after the request and are removed by periodic cleanup. Launching or running requests are excluded until they finish or are settled as failed |
| Per-user rate limiting, if enabled | Platform-provided user identifier (for example, OpenAI ChatGPT's `_meta["openai/subject"]`) | Applying per-user rate limits for AI platform users | Held in memory only, and deleted automatically once that identifier's rate limit has fully recovered |
| Security access records, if enabled | IP address, request time, request path and User-Agent, only for security events such as blocking or rate limiting | Attack detection, abuse prevention and incident response | Only as long as needed for the event, for no more than 30 days from its occurrence, then deleted. Request bodies, search terms, submitted text and platform user identifiers are not included |

Network connections also require temporary processing of IP addresses and protocol state to handle connections, enforce connection limits and resume encrypted sessions. This state is held in memory until the connection closes or the transport state expires, and is not used for advertising or tracking across services.

Ordinary server operation logs record operational events such as startup and errors, rather than tool input or user IP addresses. The optional security records described above are separate from those logs. Internal operating metrics keep only aggregate counts, such as the number of calls, failures and rate-limited requests. The cache of official legal texts stores public source material and does not associate it with users' search or text comparison history.

The legal bases are Article 15(1)4 of the Personal Information Protection Act for processing necessary to provide the requested Service, and Article 15(1)6 for security processing only where the Operator's legitimate interests clearly take precedence over the data subject's rights and the processing stays within a reasonable scope.

Do not put your own or anyone else's personal information, sensitive information or confidential material into search terms or text to compare. The Service does not analyze input to filter out personal information.

## Article 3 (Provision to third parties)

Apart from the transmission needed to carry out collection requests below, the Service does not provide user input to third parties. Exceptions also apply where a law specifically requires disclosure or an investigative authority demands it through due legal process.

For collection requests, the Service may send document identifiers, case numbers, collection search terms and target datasets to the Korea Law Information Center of the Ministry of Government Legislation (open.law.go.kr). These requests are sent by the Operator's server in the Operator's name; the user's IP address and text comparison material are not forwarded. Personal information included in a collection search term may nevertheless be transmitted, so do not include it. Searching the locally collected corpus is distinct from explicitly requesting upstream collection.

## Article 4 (Outsourcing of processing)

The Operator outsources the following work to provide the Service.

| Processor | Outsourced work | Processing location | Information processed |
| --- | --- | --- | --- |
| Contabo GmbH | Hosting the MCP server and database | Lauterbourg data center, France (operated by Contabo France SAS) | Items in Article 2 when they are processed |
| Oracle Corporation (Oracle Cloud Infrastructure) | Operating the VPN server used to communicate with the Korea Law Information Center | Chuncheon region, Republic of Korea | Outbound collection requests, including document identifiers, case numbers, collection search terms and target datasets. User IP addresses and text comparison material are not forwarded; personal information included in collection search terms may pass through |

## Article 5 (Transfer of personal information abroad)

Because the Service's servers are located in France, using the Service transfers the information in Article 2 abroad. This is outsourced processing necessary to perform the contract for providing the Service (Article 28-8(1)3 of the Personal Information Protection Act).

| Recipient | Destination country | Items transferred | Time and method of transfer | Retention |
| --- | --- | --- | --- | --- |
| Contabo GmbH and Contabo France SAS ([contact]) | France (data center: 2 Rue Taunus, 67630 Lauterbourg) | Items in Article 2 when they are processed | Transmitted over a network encrypted with TLS 1.3 when the Service is used | The expiry and cleanup conditions in Article 2 |

If you do not want your information transferred abroad, stop using the Service. The transfer is essential to providing the Service, so refusing it means you cannot use the Service.

## Article 6 (Destruction procedure and method)

Information is removed under the expiry and cleanup conditions in Article 2. Expired search and lookup state is removed on subsequent operations or when the server process ends; text comparison items are removed by periodic cleanup. Database records are removed by periodic cleanup, with launching or running collection requests retained until settlement. Security records, if enabled, must be removed within 30 days of the event, including retained copies and backups.

Users can remove text comparison material earlier using `text.diff.delete` and `text.attachment.delete`. Deletion removes access through its handle; an operation already using the material may hold it until it finishes. Releasing memory or deleting a database row or file does not by itself guarantee complete erasure of host memory, storage media or backups.

## Article 7 (Rights of data subjects and how to exercise them)

Users may at any time request access to, correction or deletion of, or suspension of processing of their personal information. Send the request to the contact in Article 11 and the Operator will act on it without delay. Requests may also be made through a representative.

Because the Service has no accounts and many handles expire after 10 minutes, information may already be gone when a request arrives, or it may be impossible to tell which information belongs to a particular user. For security access records, if any were recorded, please provide the IP address used for the connection and the time of access so they can be located. When using an AI platform, that address may be the platform's rather than your device's.

## Article 8 (Security measures)

- The public MCP endpoint is configured to accept only TLS 1.3, with X25519MLKEM768 or X25519 key exchange and the cipher suites TLS_AES_256_GCM_SHA384 or TLS_CHACHA20_POLY1305_SHA256. The actual selection depends on negotiation with the AI client or platform. These settings describe the public TLS connection, not every internal or upstream connection.
- MCP SDK and database-driver logging is suppressed to prevent private input or credentials from appearing in ordinary logs. General access logging is disabled; optional security records are limited to Article 2.
- Text comparison material is held in application memory and passed to comparison workers through pipes, rather than intentionally persisted as files or database records. Handles must be kept private because anyone holding one may be able to read or delete the material. This does not guarantee that the host cannot write memory to swap or crash dumps.
- Administrative endpoints are not exposed publicly, and database access rights and secrets are managed only by the Operator.
- The source code is public so that anyone can verify how information is processed.

## Article 9 (Cookies and other automatic collection tools)

The Service does not use cookies, local storage, analytics or advertising trackers to follow users. Necessary connection state, protocol metadata, optional per-user rate limiting and security records are described in Article 2; they are not used for advertising or tracking across services.

## Article 10 (Children under 14)

The Service is not directed at children under the age of 14 and does not knowingly collect their personal information.

## Article 11 (Privacy officer)

Send questions, complaints and requests to exercise your rights regarding personal information to:

- Privacy officer: PiQuark6046 (Jae Woon So)
- Email: piquark6046+legal4everyone@proton.me
- Security vulnerability reports: piquark6046+legal4everyone@proton.me

## Article 12 (Remedies for infringement)

If you need advice on or resolution of a personal information infringement, you can contact the following organizations in the Republic of Korea.

| Organization | Phone | Website |
| --- | --- | --- |
| Personal Information Dispute Mediation Committee | 1833-6972 | [www.kopico.go.kr](https://www.kopico.go.kr) |
| Personal Information Infringement Report Center | 118 | [privacy.kisa.or.kr](https://privacy.kisa.or.kr) |
| Supreme Prosecutors' Office | 1301 | [www.spo.go.kr](https://www.spo.go.kr) |
| Korean National Police Agency | 182 | [ecrm.police.go.kr](https://ecrm.police.go.kr) |

## Article 13 (Changes to this Privacy Policy)

When this Privacy Policy changes, the Operator will post the changes and the reasons on this page at least 7 days before they take effect, or at least 30 days before for changes that significantly affect users' rights. The full change history is available in the [website repository's commit history](https://github.com/PublicData-stream/publicdatasream-homepage/commits/main).

| Effective date | Change |
| --- | --- |
| 2026-10-03 | Initial version |

This Privacy Policy is written in Korean and English. If the two versions differ, the Korean version prevails.

This Privacy Policy takes effect on 2026-10-03.
