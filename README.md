# Heartlink

Heartlink is a small, production-minded invitation builder for creating private, personalized date invitations. It includes account isolation, a visual builder, the complete **Best Friend → Date ❤️** Hinglish flow, respectful YES/Best Friend outcomes, publishing, anonymous first-party interaction analytics, and visitor journeys.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
copy .env.example .env
npm start
```

Open `http://localhost:3000/register`. The SQLite database and persistent web sessions are created automatically in `data/`.

For PowerShell, create a production secret with:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Put the result in `SESSION_SECRET`. In production, the app requires HTTPS because session cookies use `secure=true` when `NODE_ENV=production`.

## Creator flow

1. Register or log in.
2. Open **Create Invitation** and choose Quick Setup or the full builder.
3. Enter the inviter and recipient names. Quick Setup applies the complete default template.
4. Preview without generating analytics, customize if desired, and publish.
5. Copy the opaque `/i/<random-token>` URL. Recipient names are never placed in URLs.
6. Review aggregate analytics, individual sessions, and the ordered interaction path.

The Music section accepts one MP3, M4A, OGG, or WAV file up to 10 MB. Playback begins only after the recipient taps **Open it**, satisfying browser interaction rules. The glass player always provides pause/play and mute controls.

Invitations can be drafts, published, or disabled. Duplicating copies configuration but no sessions or events. **Clear Test Data** requires explicit confirmation and deletes analytics only for the selected invitation.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3000` |
| `NODE_ENV` | Set to `production` for secure cookies and asset caching |
| `SESSION_SECRET` | A long unpredictable session-signing secret |
| `TRUST_PROXY` | Set to `1` behind one trusted reverse proxy |
| `DATABASE_PATH` | SQLite database location |
| `SUPERADMIN_EMAIL` | Registration email that receives the `superadmin` role |

The superadmin overview is available at `/admin`. It intentionally exposes aggregate operations only; owner data mutation remains owner-scoped.

## Template architecture

`src/template.js` owns curated color/font presets and `defaultConfig()`. Invitation content is stored as JSON in SQLite so every invitation can diverge without duplicating frontend code. `public/js/invitation.js` is the shared state machine and safely escapes all creator text before rendering it.

To add a template:

1. Add a new config factory alongside `defaultConfig()`.
2. Add its key to template selection and persist it in `invitations.template_key`.
3. Reuse the public engine where the flow matches; add explicit screen handlers only where behavior differs.
4. Keep the decline outcome visible, stationary, immediate, and pressure-free.

Edit the default template’s copy, nickname choices, moods, availability options, theme, and feature flags in `src/template.js`. Existing invitations retain their saved copy; new invitations receive the update.

## Analytics and privacy

The public invitation creates a random first-party visitor ID in local storage. It records only invitation screen views, buttons, selected nickname/mood/availability, outcomes, and cute-feature interactions. It does not request location, contacts, camera, microphone, browsing history, mouse recording, or fingerprints. Failed analytics calls retry once and never block the experience. Creator preview never writes analytics.

Public writes accept a strict event allowlist and are rate-limited. Dashboard reads and mutations always include both invitation ID and authenticated owner ID. CSRF tokens protect authenticated writes; passwords use bcrypt with cost 12; Helmet supplies security headers.

## Database and backups

SQLite runs in WAL mode with foreign keys and indexes enabled. The schema is created on startup by `src/database.js`.

For a consistent live backup:

```bash
sqlite3 data/app.db ".backup 'backup/app-$(date +%F).db'"
```

On Windows:

```powershell
sqlite3.exe data\app.db ".backup 'backup\app.db'"
```

Back up `.env` separately in a secret manager. Test restoration periodically. Do not copy only the main database file during an active write unless using SQLite’s backup command.

## Production deployment

Run one Node process per SQLite database volume. Use a process supervisor and a persistent disk. Set `NODE_ENV=production`, a strong `SESSION_SECRET`, `TRUST_PROXY=1`, and terminate HTTPS at a reverse proxy.

Minimal nginx example:

```nginx
server {
  listen 443 ssl http2;
  server_name invitations.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Use TLS certificates, firewall the Node port, restrict database-directory permissions to the service user, monitor disk space, and run `npm audit --omit=dev` in deployment CI. SQLite is appropriate for a single-server V1; move to a server database only when concurrent write load or multi-region deployment genuinely requires it.

## Testing

```bash
npm test
npm audit --omit=dev
```

The integration test covers registration, invalid login, CSRF failure, invitation creation, cross-user ownership protection, publishing, the public invitation route, visitor sessions, ordered events, final-answer aggregation, and analytics.

## Deliberate V1 boundaries

Music never plays before visitor interaction. Audio uploads are size-limited, MIME-checked, signature-checked, randomly named, and stored outside the public code directory. For multi-server deployment, replace the local upload directory with malware-scanned object storage. Image uploads remain disabled until that pipeline exists. The schema and feature flags leave room for memories, scheduled publishing, expiry, QR codes, and additional templates without putting unfinished controls in front of users today.
