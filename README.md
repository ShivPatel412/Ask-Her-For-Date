# Ask Her Out 💌

Ask Her Out is a full-stack web application for building and sharing a personalized, playful date invitation. It is designed for a best-friend-to-date style proposal: cute, funny, respectful, mobile-friendly, and easy to customize without editing code.

The creator gets a private dashboard and visual editor. The recipient opens a unique public link, moves through an interactive question flow, chooses a nickname and date mood, and can answer either **yes** or **best friends** without pressure. The creator can then review first-party interaction analytics.

Repository: [github.com/ShivPatel412/Ask-Her-Out](https://github.com/ShivPatel412/Ask-Her-Out)

## Main features

- Account registration, login, logout, and owner-isolated dashboards
- Quick Setup for creating an invitation in under a minute
- Visual editor with live preview and automatic saving
- Editable names, title, screen copy, button labels, nickname choices, date moods, and availability choices
- Curated theme colors and font combinations
- Responsive layouts for desktop, laptop, tablet, and mobile
- Cute mascots, collectibles, confetti, tiny mode, and playful interactions
- A respectful alternative **Best Friend** outcome with no forced answer
- Draft, published, and disabled invitation states
- Random public URLs that do not expose the recipient's name
- Invitation duplication and deletion
- Private creator previews that do not write analytics
- Visitor sessions, ordered event journeys, outcomes, revisits, and completion analytics
- Optional favorite-song upload with a responsive glass music player
- Privacy explanation inside the public invitation
- Superadmin aggregate overview

## Music player

Each invitation can include one favorite song.

- Supported formats: MP3, M4A, OGG, and WAV
- Maximum file size: 10 MB
- Playback starts only after the recipient presses **Open it**, because browsers block unprompted audio
- Play and pause controls
- Mute and unmute control
- Volume slider
- Song progress and duration
- Jump backward or forward by 10 seconds
- Expand and minimize controls
- Responsive bottom-right glass layout
- Optional cat artwork attached to the expanded player

Uploaded audio is stored in `data/uploads/` using a randomly generated filename. The database stores only its internal URL and display name. Uploaded songs and database files are ignored by Git.

## How the application works

### Creator journey

1. Register an account or log in.
2. Open the dashboard and choose **Create Invitation**.
3. Enter the creator and recipient names using Quick Setup, or open the full customization flow.
4. Edit the invitation in the visual builder.
5. Preview the recipient experience without creating analytics.
6. Optionally upload a favorite song.
7. Publish the invitation.
8. Copy and share the generated `/i/<random-token>` link.
9. Open Analytics to review the recipient's journey and final response.

### Recipient journey

The default **Best Friend → Date** template can include:

1. A playful landing screen
2. Nickname selection
3. A funny friendship analysis
4. The main date question
5. Thinking, convincing, and benefits screens
6. Date mood selection
7. A final respectful answer screen
8. A date confirmation pass
9. Availability selection
10. Success or best-friend completion

The exact route depends on the buttons selected and the enabled feature flags. The visitor can revisit choices without losing the overall session.

### Analytics journey

When a public invitation is opened, the browser creates a random first-party visitor ID. The server associates allowed events with one visitor session and stores their sequence.

The creator can review:

- Total and unique sessions
- Yes and best-friend outcomes
- Incomplete sessions
- Main-question revisits
- Average interaction steps
- Last activity time
- Selected nickname
- Selected mood
- Selected availability or date
- The ordered event path for each session

Creator preview mode does not create visitor sessions or analytics events.

## Technology stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| Web framework | Next.js |
| Route handlers | Existing Express app mounted behind Next.js rewrites |
| Database | SQLite through `better-sqlite3` |
| Sessions | `express-session` with persistent SQLite storage |
| Authentication | `bcryptjs` password hashing |
| Security | Helmet, CSRF protection, validation, and rate limiting |
| Frontend | Server-rendered HTML, vanilla JavaScript, and CSS |
| Configuration | `dotenv` |
| Tests | Native Node.js test runner |

The current Next.js migration keeps the existing server-rendered HTML, CSS, and browser JavaScript. Next.js provides the deployment/runtime layer for Vercel while the existing Express routes continue to handle pages, forms, APIs, sessions, SQLite, and uploads.

## Requirements

- Node.js 20 or newer
- npm
- A modern browser
- Git, only if you want to clone or contribute

Check your versions:

```bash
node --version
npm --version
```

## Local installation

### 1. Clone the repository

```bash
git clone https://github.com/ShivPatel412/Ask-Her-Out.git
cd Ask-Her-Out
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Replace the example `SESSION_SECRET` with a long random value. PowerShell can generate one with:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### 4. Start the application

```bash
npm start
```

Open [http://localhost:3000/register](http://localhost:3000/register).

The SQLite database, upload directory, and database schema are created automatically on first startup.

> If npm reports that it cannot find `package.json`, the terminal is in the wrong directory. Run `cd Ask-Her-Out` before `npm install` or `npm start`.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the Next.js/Vercel app |
| `npm start` | Starts the built Next.js app |
| `npm run start:express` | Starts the old Express-only server for debugging |
| `npm test` | Runs the integration test suite |
| `npm audit --omit=dev` | Checks production dependencies for known vulnerabilities |

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Local server port |
| `NODE_ENV` | `development` | Use `production` in production environments |
| `SESSION_SECRET` | No safe default | Secret used to sign login sessions; use at least 32 unpredictable characters |
| `TRUST_PROXY` | `0` | Set to `1` when running behind one trusted reverse proxy |
| `DATABASE_PATH` | `./data/app.db` locally, `/tmp/ask-her-out/app.db` on Vercel | SQLite database file location |
| `SUPERADMIN_EMAIL` | `owner@example.com` | Registration email that receives the superadmin role |

Never commit the real `.env` file. It is excluded by `.gitignore`.

## Builder sections

The editor is divided into focused sections for:

- Basic invitation details
- Theme and color styling
- Screen text and button labels
- Nickname choices and custom nickname support
- Date mood choices and the default favorite option
- Availability choices
- Cute feature toggles and mascot selection
- Favorite-song upload

The preview iframe reloads after saved changes so the creator sees the same configuration that the published route will use. Theme values, content, and feature flags are stored per invitation as JSON.

## Invitation states

| State | Behavior |
| --- | --- |
| `draft` | Editable but unavailable through the public link |
| `published` | Available through its unique public token |
| `disabled` | Temporarily unavailable without deleting its configuration or analytics |

Duplicating an invitation copies its design and content into a new draft. It does not copy visitor sessions or events.

## Project structure

```text
Ask-Her-Out/
├── pages/
│   └── api/
│       └── express/
│           └── [[...path]].js       # Next.js API catch-all that runs the Express app
├── public/
│   ├── css/
│   │   ├── app.css             # Dashboard, authentication, editor, and analytics styles
│   │   └── invitation.css      # Public invitation and music-player styles
│   ├── images/                 # Versioned interface artwork
│   └── js/
│       ├── analytics.js        # Analytics dashboard rendering and reset actions
│       ├── builder.js          # Visual editor, autosave, theme preview, and music upload
│       ├── dashboard.js        # Dashboard invitation actions
│       ├── invitation.js       # Public invitation state machine and music player
│       └── new.js              # Invitation creation forms
├── src/
│   ├── database.js             # SQLite initialization and schema
│   ├── next-express.js         # Small adapter between Next.js and Express
│   └── template.js             # Theme presets and default invitation content
├── test/
│   └── app.test.js             # End-to-end integration tests
├── data/                       # Runtime database and uploaded audio; not committed
├── next.config.js              # Next.js rewrites to the Express adapter
├── vercel.json                 # Vercel build settings
├── .env.example                # Safe environment variable template
├── package.json                # Scripts, metadata, and dependencies
└── server.js                   # Express server, routes, validation, and APIs
```

## Database model

SQLite runs with foreign keys enabled and WAL journaling.

### `users`

Stores the account email, username, password hash, role, and timestamps.

### `web_sessions`

Stores persistent authenticated web sessions and expiry times.

### `invitations`

Stores ownership, public token, names, title, status, selected template, theme JSON, content JSON, feature JSON, and publishing timestamps.

### `visitor_sessions`

Stores one anonymous visitor journey per invitation and visitor ID, including selected nickname, mood, availability, final result, completion status, and revisit count.

### `events`

Stores the ordered interaction sequence for each visitor session.

Deleting a user deletes their invitations. Deleting an invitation deletes its sessions and events. Deleting a visitor session deletes its events.

## Important routes

### Public and authentication

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Product landing page |
| `GET/POST` | `/register` | Account registration |
| `GET/POST` | `/login` | Account login |
| `POST` | `/logout` | End the authenticated session |
| `GET` | `/i/:token` | Published recipient invitation |

### Creator dashboard

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/dashboard` | List owned invitations |
| `GET` | `/dashboard/invitations/new` | Create an invitation |
| `GET` | `/dashboard/invitations/:id/edit` | Open the visual editor |
| `GET` | `/dashboard/invitations/:id/preview` | Owner-only preview with analytics disabled |
| `GET` | `/dashboard/invitations/:id/analytics` | Invitation analytics page |
| `GET` | `/dashboard/invitations/:invitationId/sessions/:sessionId` | Ordered visitor journey |
| `GET` | `/admin` | Superadmin aggregate overview |

### Main APIs

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/invitations` | Create an invitation |
| `GET/PUT` | `/api/invitations/:id` | Read or update owned invitation configuration |
| `POST/DELETE` | `/api/invitations/:id/music` | Upload or remove the favorite song |
| `POST` | `/api/invitations/:id/status` | Publish, disable, or return to draft |
| `POST` | `/api/invitations/:id/duplicate` | Duplicate an invitation as a draft |
| `DELETE` | `/api/invitations/:id` | Delete an owned invitation |
| `POST` | `/api/invitations/:token/session` | Create or reuse a public visitor session |
| `POST` | `/api/invitations/:token/events` | Store an allowed public interaction event |
| `GET/DELETE` | `/api/invitations/:id/analytics` | Read or clear owned analytics |

## Security and privacy

- Passwords are hashed using bcrypt with cost 12
- Authenticated write requests require a CSRF token
- Invitation reads and mutations are scoped to the authenticated owner
- Login, registration, and public APIs are rate-limited
- Helmet adds standard HTTP security headers
- User-editable text is sanitized and escaped before rendering
- Public event names use a strict allowlist
- Public invitation tokens are random and do not contain names
- Uploaded audio is limited by size and validated using file signatures
- Production sessions use secure cookies over HTTPS

The analytics system records only interactions inside the invitation: screens, buttons, choices, outcomes, and timestamps. It does not request contacts, precise location, camera, microphone, browser history, or cross-site tracking data.

## Testing

Run:

```bash
npm test
```

The integration suite covers:

- Registration and authentication
- Invalid login handling
- CSRF rejection
- Invitation creation and ownership isolation
- Theme persistence
- Music upload validation and autosave protection
- Publishing and public invitation output
- Visitor session and event creation
- Final outcomes and analytics aggregation

Tests use a temporary SQLite database and clean it up automatically.

## Database backup

Use SQLite's backup command while the application is running:

```bash
sqlite3 data/app.db ".backup 'backup/app.db'"
```

Windows:

```powershell
sqlite3.exe data\app.db ".backup 'backup\app.db'"
```

Back up `data/uploads/` separately if uploaded songs must be preserved. Store `.env` in a secure secret manager rather than in the repository.

## Production deployment

Recommended production setup:

1. Use Node.js 20 or newer.
2. Run `npm ci --omit=dev`.
3. Set `NODE_ENV=production`.
4. Set a strong `SESSION_SECRET`.
5. Set `TRUST_PROXY=1` behind one trusted proxy.
6. Provide a persistent disk for the SQLite database and `data/uploads/`.
7. Run one application process per SQLite database volume.
8. Terminate HTTPS at a reverse proxy such as nginx, Caddy, or the hosting platform.
9. Restrict direct access to the Node port and runtime data directory.
10. Monitor disk space and back up the database regularly.

Minimal nginx location:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

SQLite is a good fit for a single-server version of this application. A multi-instance deployment should use shared object storage for audio and a server database instead of sharing a local SQLite file.

## Troubleshooting

### npm cannot find `package.json`

Move into the cloned project directory:

```bash
cd Ask-Her-Out
npm start
```

### Port 3000 is already in use

Change `PORT` in `.env`, then restart the application.

### Music upload succeeds but does not play

- Confirm **Enable Music** is turned on
- Use MP3, M4A, OGG, or WAV under 10 MB
- Press **Open it** before expecting playback
- Check that `data/uploads/` is writable and persistent
- Refresh the published invitation after saving

### Theme changes do not appear

Wait for **Saved ✓**, then refresh the preview or published link. Theme data is stored with the invitation rather than only in browser state.

### Published link says unavailable

Confirm that the invitation status is `published`, not `draft` or `disabled`.

### Login does not persist in production

Confirm HTTPS is enabled, `NODE_ENV=production` is correct, and `TRUST_PROXY=1` is set when one reverse proxy sits in front of Express.

## Current scope

This repository contains one polished template and a single-server SQLite architecture. Image uploads, scheduled publishing, invitation expiry, QR codes, multiple template families, and multi-region deployment are intentionally outside the current version.

The existing JSON content model and feature flags allow those capabilities to be added later without changing the basic invitation ownership and analytics model.
#   A s k - H e r - F o r - D a t e  
 #   A s k - H e r - F o r - D a t e  
 