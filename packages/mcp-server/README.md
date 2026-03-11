# @librediary/mcp-server

Model Context Protocol (MCP) server for LibreDiary. Enables AI assistants (Claude, Cursor, Windsurf, etc.) to manage your LibreDiary workspace programmatically.

## Prerequisites

- A running LibreDiary instance
- An API token (generate one at **Settings > API Tokens** in the LibreDiary web app)
- The organisation ID you want to work with

## Quick Start

```bash
npx @librediary/mcp-server \
  --api-url https://your-instance.example.com/api/v1 \
  --api-token ld_your_token_here \
  --org-id your_org_id
```

Or set environment variables:

```bash
export LIBREDIARY_API_URL=https://your-instance.example.com/api/v1
export LIBREDIARY_API_TOKEN=ld_your_token_here
export LIBREDIARY_ORG_ID=your_org_id
npx @librediary/mcp-server
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "librediary": {
      "command": "npx",
      "args": [
        "@librediary/mcp-server",
        "--api-url",
        "https://your-instance.example.com/api/v1",
        "--api-token",
        "ld_your_token_here",
        "--org-id",
        "your_org_id"
      ]
    }
  }
}
```

## Claude Code Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "librediary": {
      "command": "npx",
      "args": ["@librediary/mcp-server"],
      "env": {
        "LIBREDIARY_API_URL": "https://your-instance.example.com/api/v1",
        "LIBREDIARY_API_TOKEN": "ld_your_token_here",
        "LIBREDIARY_ORG_ID": "your_org_id"
      }
    }
  }
}
```

## Cursor Configuration

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "librediary": {
      "command": "npx",
      "args": ["@librediary/mcp-server"],
      "env": {
        "LIBREDIARY_API_URL": "https://your-instance.example.com/api/v1",
        "LIBREDIARY_API_TOKEN": "ld_your_token_here",
        "LIBREDIARY_ORG_ID": "your_org_id"
      }
    }
  }
}
```

## Available Tools (32)

### Pages (11 tools)

| Tool                     | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `pages_list`             | Get hierarchical page tree                             |
| `pages_get`              | Fetch a single page with content                       |
| `pages_create`           | Create a new page                                      |
| `pages_update`           | Update page title, icon, cover, content, or visibility |
| `pages_trash`            | Move a page to trash                                   |
| `pages_restore`          | Restore a page from trash                              |
| `pages_move`             | Move a page to a new parent or position                |
| `pages_duplicate`        | Duplicate a page                                       |
| `pages_get_ancestors`    | Get breadcrumb chain for a page                        |
| `trash_list`             | List all trashed pages                                 |
| `trash_delete_permanent` | Permanently delete a trashed page                      |

### Databases (11 tools)

| Tool                        | Description                               |
| --------------------------- | ----------------------------------------- |
| `databases_list`            | List all databases                        |
| `databases_get`             | Fetch a database with properties and rows |
| `databases_create`          | Create a new database                     |
| `databases_update`          | Update database name or linked page       |
| `databases_delete`          | Delete a database                         |
| `databases_add_property`    | Add a column (supports 17 property types) |
| `databases_update_property` | Modify a column definition                |
| `databases_delete_property` | Remove a column                           |
| `databases_create_row`      | Add a row with cell values                |
| `databases_update_row`      | Update specific cells in a row            |
| `databases_delete_row`      | Delete a row                              |

### Organisation & User (6 tools)

| Tool                  | Description                                |
| --------------------- | ------------------------------------------ |
| `org_get`             | Get current organisation details           |
| `org_list_all`        | List all organisations the user belongs to |
| `org_list_members`    | List organisation members                  |
| `org_invite_member`   | Invite a member by email                   |
| `auth_me`             | Get authenticated user info                |
| `user_update_profile` | Update display name                        |

### Search (1 tool)

| Tool           | Description                                   |
| -------------- | --------------------------------------------- |
| `search_pages` | Full-text search with date and author filters |

### Files (3 tools)

| Tool           | Description             |
| -------------- | ----------------------- |
| `files_list`   | List uploaded files     |
| `files_get`    | Get file metadata       |
| `files_delete` | Delete an uploaded file |

## Available Resources

| Resource       | URI                           | Description                |
| -------------- | ----------------------------- | -------------------------- |
| Page Tree      | `librediary://pages/tree`     | Hierarchical page listing  |
| Databases List | `librediary://databases/list` | All databases with schemas |

## Configuration Reference

| Environment Variable   | CLI Argument  | Required | Description                                        |
| ---------------------- | ------------- | -------- | -------------------------------------------------- |
| `LIBREDIARY_API_URL`   | `--api-url`   | Yes      | Base API URL (e.g. `http://localhost:3000/api/v1`) |
| `LIBREDIARY_API_TOKEN` | `--api-token` | Yes      | API token (starts with `ld_`)                      |
| `LIBREDIARY_ORG_ID`    | `--org-id`    | Yes      | Organisation ID to operate on                      |

CLI arguments take precedence over environment variables.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm --filter @librediary/mcp-server test

# Build
pnpm --filter @librediary/mcp-server build

# Type check
pnpm --filter @librediary/mcp-server typecheck
```

## Credits

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
