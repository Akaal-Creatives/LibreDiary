# LibreDiary User Guide

Welcome to LibreDiary — a self-hosted workspace for notes, docs, and databases. This guide covers everything you need to know as a user.

---

## Getting Started

### Creating Your Account

1. You will receive an email invitation from your organisation administrator
2. Click the invitation link and complete the registration form
3. Set a strong password (minimum 8 characters)
4. Verify your email address if required by your instance

### Logging In

- **Email & Password**: Enter your credentials on the login page
- **OAuth**: Click "Sign in with GitHub" or "Sign in with Google" if configured
- **Sessions**: Your session persists across browser tabs. You can view and revoke active sessions from your profile

### Your Profile

Access your profile from the top-right avatar menu:

- **Name**: Update your display name
- **Locale**: Choose your preferred language (17+ languages supported)
- **Sessions**: View active sessions across devices and revoke any you don't recognise
- **OAuth Accounts**: Link or unlink GitHub/Google accounts

---

## Organisations

LibreDiary supports multiple organisations. Each organisation is an isolated workspace with its own pages, databases, templates, and members.

### Switching Organisations

Use the organisation switcher in the sidebar to switch between workspaces.

### Creating an Organisation

Click "Create Organisation" from the workspace switcher. You will need:

- **Name**: A display name for your organisation
- **Slug**: A URL-friendly identifier (auto-generated from the name)

### Organisation Roles

| Role       | Permissions                                      |
| ---------- | ------------------------------------------------ |
| **Owner**  | Full control, can delete org, transfer ownership |
| **Admin**  | Manage members, invites, and settings            |
| **Member** | Create and edit pages, databases, and files      |

### Inviting Members

Admins can invite new members by email. Invitations can be resent or cancelled from the organisation settings.

---

## Pages

Pages are the core building blocks of LibreDiary. Each page is a rich-text document powered by a block-based editor.

### Creating a Page

- Click the **+** button in the sidebar
- Or use the keyboard shortcut to create a new page

### Page Tree

Pages are organised in a tree hierarchy. You can:

- **Nest pages**: Drag a page onto another to make it a child
- **Reorder**: Drag pages to change their position
- **Breadcrumbs**: Navigate the hierarchy using breadcrumbs at the top

### Editor Features

#### Block Types

- **Paragraphs**: Standard text blocks
- **Headings**: H1, H2, H3 levels
- **Lists**: Bullet, numbered, and task lists
- **Code Blocks**: Syntax-highlighted code with language selection
- **Callouts**: Highlighted information blocks (info, warning, success, error)
- **Toggles**: Collapsible sections
- **Images**: Uploaded or linked images
- **Tables**: Data tables with resizable columns

#### Slash Commands

Type `/` anywhere in the editor to open the slash command menu. Quick access to all block types and formatting options.

#### Formatting

- **Bold**: `Ctrl/Cmd + B`
- **Italic**: `Ctrl/Cmd + I`
- **Underline**: `Ctrl/Cmd + U`
- **Code**: `Ctrl/Cmd + E`
- **Link**: `Ctrl/Cmd + K`
- **Strikethrough**: `Ctrl/Cmd + Shift + X`

#### Drag & Drop

Hover over any block to reveal the drag handle on the left. Drag blocks to reorder content within a page.

### Page Icons

Click the page icon (or "Add icon" placeholder) to set an emoji icon for your page. Icons appear in the sidebar tree and breadcrumbs.

### Favourites

Star a page to pin it to your favourites section at the top of the sidebar. Favourites are per-user and can be reordered.

### Trash & Restore

Deleted pages go to the trash and can be restored within 30 days. After 30 days, trashed pages are permanently deleted.

To restore: open Trash from the sidebar, find the page, and click "Restore".

### Page History

LibreDiary automatically saves page versions. You can:

- View the version history timeline
- Compare any two versions with a diff view
- Restore a previous version

---

## Real-Time Collaboration

Multiple users can edit the same page simultaneously.

### Live Cursors

You will see other users' cursors and selections in real-time, each with a different colour label showing the user's name.

### Conflict Resolution

Edits are merged automatically using CRDT (Conflict-free Replicated Data Types). No manual conflict resolution needed.

---

## Sharing & Permissions

### Page Permissions

Control who can view or edit specific pages:

| Level        | Description         |
| ------------ | ------------------- |
| **Can View** | Read-only access    |
| **Can Edit** | Full editing access |

### Share Links

Create shareable links for pages:

- **Public pages**: Accessible to anyone with the link
- **Share links with expiration**: Time-limited access tokens
- **Access tracking**: See who accessed your shared pages

---

## Comments & Mentions

### Comments

- Click the comment icon on any block to add an inline comment
- Comments support threaded replies
- Resolve comments when the discussion is complete

### @Mentions

Type `@` followed by a name to mention another user. They will receive a notification.

---

## Databases

Databases let you organise structured data with multiple views.

### Creating a Database

Create a database from the sidebar or within a page. Each database starts with a default table view.

### Property Types

| Type         | Description                      |
| ------------ | -------------------------------- |
| Text         | Plain text                       |
| Number       | Numeric values                   |
| Select       | Single-choice dropdown           |
| Multi-Select | Multiple-choice tags             |
| Date         | Date picker                      |
| Checkbox     | Boolean toggle                   |
| URL          | Clickable links                  |
| Email        | Email addresses                  |
| Person       | User assignment                  |
| Relation     | Link to another database         |
| Rollup       | Aggregated values from relations |
| Formula      | Calculated values                |
| File         | File attachments                 |

### Views

| View         | Description                                      |
| ------------ | ------------------------------------------------ |
| **Table**    | Spreadsheet-style rows and columns               |
| **Kanban**   | Drag-and-drop board grouped by a select property |
| **Calendar** | Month/week view grouped by a date property       |
| **Gallery**  | Visual card grid                                 |

Each view can have its own filters, sorting, and visible properties.

---

## Templates

Save time with reusable templates.

### Using Templates

Browse the template library and click "Use Template" to create a new page from a template.

### Creating Templates

Create a template from scratch or convert an existing page to a template. Templates can be categorised for easy discovery.

---

## File Attachments

Upload files to your pages or databases:

- **Supported formats**: Images, PDFs, documents, and more
- **Size limits**: Configured by your administrator
- **Storage**: Files are stored securely (local, S3, or MinIO depending on configuration)

---

## Search

Use the search bar (`Ctrl/Cmd + K`) to find pages across your organisation.

### Search Features

- **Full-text search**: Searches page titles and content
- **Typo tolerance**: Finds results even with minor spelling mistakes
- **Faceted filtering**: Filter by date range, author, and more
- **Instant results**: Results appear as you type

---

## Notifications

LibreDiary notifies you about:

- Comments on your pages
- @mentions
- Organisation invitations
- Shared page access

### Notification Preferences

Customise which notifications you receive and how (in-app, email, or both) from your notification settings.

---

## AI Features

If enabled by your administrator, LibreDiary includes AI-powered features:

### AI Writing Assistant

Select text and use the AI menu to:

- **Generate**: Create content from a prompt
- **Expand**: Elaborate on selected text
- **Summarise**: Condense selected text
- **Improve**: Enhance writing quality

### Translation

Translate page content into 31 supported languages. Translations are cached for performance.

---

## Data Export (GDPR)

You have the right to export all your data:

1. Go to Settings > Privacy
2. Click "Request Data Export"
3. Download the archive when ready

### Account Deletion

Request account deletion from the privacy settings. There is a 30-day grace period during which you can cancel the deletion.

---

## Keyboard Shortcuts

| Shortcut               | Action                  |
| ---------------------- | ----------------------- |
| `Ctrl/Cmd + K`         | Open search             |
| `Ctrl/Cmd + B`         | Bold                    |
| `Ctrl/Cmd + I`         | Italic                  |
| `Ctrl/Cmd + U`         | Underline               |
| `Ctrl/Cmd + E`         | Inline code             |
| `Ctrl/Cmd + Shift + X` | Strikethrough           |
| `Ctrl/Cmd + K`         | Add link                |
| `/`                    | Open slash command menu |
| `@`                    | Mention a user          |

---

## Offline Access

LibreDiary supports offline viewing through its PWA (Progressive Web App) capabilities. Previously viewed pages are cached and available without an internet connection.

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
