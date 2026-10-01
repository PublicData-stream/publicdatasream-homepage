---
slug: example
language: en
name: Example server
description: Replace with a verified description before adding this file to the catalog.
capabilities: [mcp]
codex:
  format: toml
  config: |
    [mcp_servers.example]
    url = "https://example.org/mcp"
claude:
  client: Claude Code
  format: json
  config: |
    {
      "mcpServers": {
        "example": {
          "type": "http",
          "url": "https://example.org/mcp"
        }
      }
    }
---

### Requirements

Describe the supported transport, client requirements, and actual service status.

### Connect

Replace the example HTTPS endpoint in both client configurations with the verified
endpoint. Describe where to place each configuration and how to enable it.

### Verify the connection

Describe an appropriate connection check and common configuration errors.

### Authentication, if required

Use an environment reference or an unmistakable placeholder in every example.
For example, a Codex environment-variable selector can be written as:

```toml
bearer_token_env_var = "PUBLICDATA_TOKEN"
```

Do not paste tokens, keys, passwords, credentialed URLs, or secret query parameters.
