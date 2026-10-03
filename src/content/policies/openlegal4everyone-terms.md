---
slug: openlegal4everyone-terms
language: en
server: openlegal4everyonemcp
kind: terms
title: OpenLegal4Everyone Terms of Service
---

## Article 1 (Purpose)

These Terms set out the conditions for using the OpenLegal 4 Everyone public instance (the "Service"), which PiQuark6046 (the "Operator") provides free of charge. By using the Service, you agree to these Terms.

## Article 2 (Definitions)

- "Service": the MCP server provided at `https://openlegal4everyone.mcp.publicdata.stream/mcp`
- "User": a person who connects to the Service through an LLM/AI SaaS product, an LLM/AI agentic client or a program they wrote themselves
- "Software": the open-source code that makes up the Service ([openlegal4everyoneMCP](https://github.com/PublicData-stream/openlegal4everyoneMCP))
- "Announced version": the version, commit or image digest of the Software that the Operator has published as running on the Service
- "Infrastructure providers": the IaaS companies that host and network the Service on the Operator's behalf (Contabo GmbH, Contabo France SAS, Oracle Corporation and others)

## Article 3 (What the Service provides)

The Service provides the following features, based on the upstream sources below, free of charge and without an account.

- Searching, viewing, comparing the revision history of, and checking citations to statutes, local ordinances and court decisions
- Comparing text submitted by the User and applying patches to it
- Requesting the collection of data that has not been collected yet

Upstream sources:

- Shared open data of the Korea Law Information Center, Ministry of Government Legislation, Republic of Korea

The Service is read-only and never creates or modifies legal data. Communication with the Ministry of Government Legislation is subject to the Operator's request caps and rate limits, so collection requests may be delayed, deferred or skipped.

## Article 4 (Not legal advice)

Information provided by the Service is legal information for reference only and is not legal advice. The Operator is not a legally qualified attorney, and using the Service does not create any attorney-client or other agency relationship between the User and the Operator. For a specific matter, consult a qualified professional such as an attorney.

Summaries or interpretations of the Service's results produced by an LLM/AI client are created by that LLM/AI client, and the Operator does not warrant them.

## Article 5 (Data sources and accuracy)

The upstream sources of legal data are:

- Korea Law Information Center, Ministry of Government Legislation ([open.law.go.kr](https://open.law.go.kr))

The Service does not alter the official text and returns it together with its source and the time it was collected or refreshed. When you reuse the data, follow the original provider's attribution requirements and terms of use.

The Operator does not warrant that:

- The data provided is current or complete (cache refresh intervals and collection delays can make it differ from the official text)
- The original provider's data is free of errors
- Results of automated processing, such as statute name resolution, citation checks and revision history or impact analysis, are correct

Always check the official text at the upstream source before relying on it for a legal decision or filing. Where the LLM/AI client supports it, it automatically shows the sources returned by the Service alongside its summaries or interpretations, as ChatGPT's source citations do, which can help you cross-check them against the official text.

## Article 6 (Usage limits)

The Service has tool-call rate limits and connection and concurrency limits, and requests beyond those limits are rejected. Limits may apply across Users, by connection or, where enabled, by a platform-provided user identifier as described in the [Privacy Policy](/servers/openlegal4everyonemcp/privacy/). Do not send so many requests that you disrupt other Users. The Operator may change the limits to protect the Service.

## Article 7 (Permitted analysis and reverse engineering)

Users may:

1. Observe, analyze and reverse engineer the Service's responses, protocol behavior and public interfaces (tool list, schemas, errors, HTTP headers, TLS configuration, etc.)
2. Check whether the announced version matches the version actually being served (for example, by comparing the behavior of the public source or public image with the actual responses)
3. Publish the results of that analysis

These activities must stay within the usage limits in Article 6 and must not involve any prohibited conduct under Article 8. The Operator will not take issue with analysis and verification carried out in good faith in compliance with this Article.

If you find a mismatch between the announced version and the actual behavior, or a security vulnerability, please report it to the contact in Article 14. Please report vulnerabilities before disclosing them publicly so that the Operator can address them.

## Article 8 (Prohibited conduct)

Users must not engage in:

1. Hostile or malicious security attacks
    - Unauthorized intrusion into servers or internal systems, or attempts to escalate privileges
    - Exploiting vulnerabilities to extract or tamper with data
    - Denial-of-service attacks (DoS or DDoS) and intentionally exhausting resources
    - Attempts to steal or guess another User's text comparison handles
    - Delivering malicious code or attack payloads through the Service
2. Conduct that could seriously harm the infrastructure providers that provide and host the Service on the Operator's behalf
    - Attacks on, or unauthorized scanning of, an infrastructure provider's networks or facilities
    - Causing excessive traffic or load on an infrastructure provider's facilities
    - Using the Service to attack third parties, or causing violations of an infrastructure provider's acceptable use policy
    - Intentionally exhausting the request caps of an upstream source
3. Conduct that violates the law or infringes the rights of others

The Operator may block requests that violate this Article without prior notice and, where necessary, report them to the relevant authorities or claim damages.

## Article 9 (User input)

Users are responsible for, and must hold the rights to, the search terms and text they submit to the Service. Do not submit other people's personal information, sensitive information, trade secrets, or data you are not authorized to submit. The processing and retention of submitted text are governed by the [Privacy Policy](/servers/openlegal4everyonemcp/privacy/).

## Article 10 (Software license)

The Software is published under the GNU Affero General Public License v3.0 (AGPL-3.0-only). These Terms apply only to the use of the public instance operated by the Operator; copying, modifying and distributing the Software are governed by AGPL-3.0-only. Nothing in these Terms limits the rights that AGPL-3.0-only grants to Users.

## Article 11 (Changes to and discontinuation of the Service)

The Service is provided free of charge and without any availability guarantee (SLA). The Operator may change the Service's features, tools or limits, or suspend or discontinue the Service temporarily or permanently. Where possible, permanent discontinuation will be announced on the website 30 days in advance. The Service may be limited by outages at infrastructure providers or at the infrastructure of upstream sources.

## Article 12 (Limitation of liability)

Unless the Operator acted intentionally or with gross negligence, the Operator is not liable for damage caused by:

- Errors, omissions or delays in data that Article 5 does not warrant
- Changes to, discontinuation of, or outages of the Service under Article 11
- Decisions made or filings submitted by the User without checking the Service's results
- Content that an LLM/AI client produces based on the Service's results
- Data the User submitted in breach of Article 9

This Article applies only to the extent permitted by applicable law and does not exempt the Operator from liability caused by its intent or gross negligence.

## Article 13 (Changes to these Terms)

The Operator may change these Terms to the extent permitted by applicable law. The Operator will post the changes and the reasons on this page at least 7 days before they take effect, or at least 30 days before for changes unfavorable to Users. If you do not agree to the changed Terms, stop using the Service; continuing to use it after the effective date means you agree to the changes.

The full change history is available in the [website repository's commit history](https://github.com/PublicData-stream/publicdatasream-homepage/commits/main).

| Effective date | Change |
| --- | --- |
| 2026-10-03 | Initial version |

## Article 14 (Contact)

- Service inquiries: `piquark6046+legal4everyone@proton.me`
- Security vulnerability and version mismatch reports for the public instance: `piquark6046+legal4everyone@proton.me`
- Security vulnerability reports for the Software: https://github.com/PublicData-stream/openlegal4everyoneMCP/security/advisories

## Article 15 (Governing law and jurisdiction)

These Terms are governed by the laws of the Republic of Korea. Disputes relating to the Service will be resolved by the court with jurisdiction under the Civil Procedure Act of the Republic of Korea.

These Terms are written in Korean and English. If the two versions differ, the Korean version prevails.

## Addendum

These Terms take effect on 2026-10-03.
