# Ask Her Out 💌

**Ask Her Out** is a full-stack, modern web application designed for creating and sharing personalized, interactive, and playful date invitations. Built with a focus on romantic proposals, Hinglish date invitations, and best-friend-to-date flows, it combines visual customization, live previewing, interactive recipient journeys, first-party analytics, and an integrated Admin Control Panel.

**Repository:** [GitHub Repository](https://github.com/ShivPatel412/Ask-Her-Out)

---

## 🌟 Key Features

### 1. Visual Invitation Builder & Live Preview

* **Quick Setup & Customization:** Create an invitation in under a minute or customize every aspect.
* **Custom Copy & Questions:** Rewrite headings, subheadings, friendship analysis, date questions, and button text.
* **Theme & Color Customization:** Curated HSL color palettes, modern fonts, and glassmorphic designs.
* **Cute Extras:** Mascot selection, confetti celebrations, date idea collectibles, and toggleable Hinglish modes.
* **Live Device Preview:** Real-time preview iframe with mobile, tablet, and desktop viewport toggles.

### 2. Interactive Recipient Journey

* **Respectful & Playful Flow:** Recipient can choose custom nicknames, complete funny friendship tests, pick exact date/time options, select date moods such as Coffee, Long Drive + Food, or Movie, and answer **Haan 😌♥** or **Best Friends 🤝**.
* **No Pressure Outcomes:** Clean alternative paths ensuring respectful interactions.
* **Glass Music Player:** Recipients can listen to a custom song uploaded by the creator with playback, volume, and progress controls.

### 3. Analytics & Recipient Tracking

* **First-Party Interaction Analytics:** Track total sessions, unique visitors, response outcomes, average interaction steps, and revisits.
* **Ordered Event Journey:** View every step the recipient took through the invitation flow.

---

## 🔄 How It Works

```mermaid
flowchart TD
    A[Creator Registers / Logs In] --> B[Dashboard: Create Invitation]
    B --> C[Visual Builder: Edit Names, Colors, Copy & Music]
    C --> D[Publish Invitation]
    D --> E[Share Unique Private Token Link /i/token]
    E --> F[Recipient Opens Link & Plays Music]
    F --> G[Recipient Flow: Nickname -> Friend Test -> Date Question -> Date & Time]
    G --> H[Final Response: Haan ❤️ or Best Friends 🤝]
    H --> I[Creator Dashboard: View Real-Time Analytics]
    H --> J[Admin Panel: Audit User Logs & System Metrics]
```

### 1. Creator Workflow

1. **Account Creation:** Register an account or log in.
2. **Invitation Studio:** Click **Create Invitation** to start from the *Best Friend → Date* template.
3. **Visual Customization:** Customize colors, fonts, questions, mascots, date options, and optionally upload a favorite song.
4. **Publish & Share:** Click **Publish Invitation** to generate a unique random URL such as `/i/<public-token>`.
5. **Review Responses:** Open **Analytics** from the dashboard to view recipient choices and final responses.

### 2. Recipient Workflow

1. **Opening the Link:** Recipient opens `/i/<token>`. Audio playback becomes available after interacting with the invitation.
2. **Interactive Steps:**

   * Chooses a nickname.
   * Runs the funny **Friendship Analysis**.
   * Reads the date question and explores date ideas such as Coffee, Dinner, Drive, or Movie.
   * Selects an exact date and time.
3. **Final Response:** Selects **Haan 😌♥** or **Best Friends 🤝**.
4. **WhatsApp Connection:** An optional button can open a WhatsApp conversation with the creator.

---

## 🛠️ Technology Stack

| Component               | Technology                                                               |
| ----------------------- | ------------------------------------------------------------------------ |
| **Runtime & Framework** | Node.js 20+, Next.js 16.3+ with Turbopack + Express.js backend adapter   |
| **Database**            | SQLite via `better-sqlite3` with WAL mode & foreign keys                 |
| **Sessions**            | `express-session` backed by persistent SQLite `web_sessions` table       |
| **Authentication**      | `bcryptjs` password hashing                                              |
| **Security & Headers**  | CSRF tokens, Helmet security headers, rate limiting                      |
| **Styling**             | Vanilla CSS with CSS variables, glassmorphism, responsive grid & flexbox |
| **Testing**             | Native Node.js test runner (`node --test`)                               |

---

## 🚀 Getting Started

### 1. Prerequisites

* Node.js 20 or newer
* npm 10 or newer

Check your versions:

```bash
node -v
npm -v
```

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/ShivPatel412/Ask-Her-Out.git
cd Ask-Her-Out
npm install
```

### 3. Environment Configuration

Create a `.env.local` or `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_long_random_session_secret_key_here
SUPERADMIN_EMAIL=your_admin_email@example.com
```

> **Security Note:** Never commit `.env`, `.env.local`, database files, uploaded files, session secrets, passwords, API keys, or other credentials to the repository.

### 4. Running the Development Server

Start the development server:

```bash
npm run dev
```

Open the local development URL shown in your terminal.

---

## 🗄️ Database Schema & File Structure

All runtime data is stored locally in the application's `data/` directory.

```text
Ask-Her-Out/
├── pages/
│   └── api/
│       └── express/
│           └── [[...path]].js       # Next.js API catch-all wrapper for Express
├── public/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── app.css              # Dashboard, auth, admin, and builder styles
│   │   │   └── invitation.css       # Recipient invitation & music player styles
│   │   ├── images/                  # UI illustrations and mascot assets
│   │   └── js/                      # Frontend JavaScript modules
├── src/
│   ├── database.js                  # SQLite table definitions & indices
│   ├── next-express.js              # Express-to-Next.js compatibility bridge
│   └── template.js                  # Default invitation content & color presets
├── test/
│   └── app.test.js                  # Automated test suite
├── data/
│   ├── app.db                       # Primary SQLite database file
│   └── uploads/                     # User-uploaded audio files
├── server.js                        # Express server routes, logic, and APIs
├── package.json                     # Scripts and dependencies
└── README.md                        # Documentation
```

### Main Database Tables

1. **`users`**: User accounts (`id`, `email`, `username`, `password_hash`, `whatsapp_number`, `role`, `created_at`, `updated_at`).
2. **`user_logs`**: Activity audit logs (`id`, `user_id`, `email`, `action`, `ip_address`, `user_agent`, `created_at`).
3. **`invitations`**: Invitation configurations (`id`, `owner_user_id`, `public_token`, `title`, `status`, `theme_config_json`, `content_config_json`, `feature_config_json`).
4. **`visitor_sessions`**: Anonymous recipient session tracking (`id`, `invitation_id`, `visitor_id`, `final_result`, `selected_mood`, `selected_date`).
5. **`events`**: Interaction step log per visitor session (`id`, `session_id`, `event_name`, `sequence_number`).
6. **`web_sessions`**: Persistent user login sessions.

---

## 📌 Available Scripts

| Command         | Description                                              |
| --------------- | -------------------------------------------------------- |
| `npm run dev`   | Starts the Next.js development server with hot reloading |
| `npm run build` | Builds the production bundle                             |
## 🛠 Production Architecture & Database

* **Production Stack**: **Vercel** + **Hostinger MySQL** + `express-mysql-session`
* **Local Development**: SQLite (or MySQL when configured)
* **Session Persistence**: Sessions are stored persistently in the MySQL `web_sessions` table, guaranteeing user logins remain active across Vercel cold starts.
* **Health Check**: `GET /health` returns JSON reporting system health, database driver connectivity, environment mode, and missing tables.

### Required Production Environment Variables

Configure these in **Vercel Settings ➔ Environment Variables**:

| Variable | Purpose | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Cryptographic session signing key | `random-32+-character-secret` |
| `DATABASE_HOST` | Hostinger MySQL hostname / IP | `srv1947.hstgr.io` |
| `DATABASE_PORT` | MySQL port | `3306` |
| `DATABASE_NAME` | MySQL database name | `u165370995_Sastatengo` |
| `DATABASE_USER` | MySQL username | `u165370995_Sastatengo` |
| `DATABASE_PASSWORD` | MySQL password | `your_secure_db_password` |

---

## 🧪 Testing & Verification

| Command | Action |
| :--- | :--- |
| `npm test` | Runs the full offline unit & integration test suite |
| `npm run test:mysql` | Runs MySQL integration tests targeting the MySQL connection layer |

### Production Manual Smoke Test Protocol

After every production deployment:

1. Open `/register` in incognito ➔ Create a new test user.
2. Verify redirect to `/dashboard`.
3. Log out ➔ Log in using Email ➔ Log out ➔ Log in using Username.
4. Open `/dashboard` ➔ Click **Create Invitation**.
5. Customize invitation copy, fonts, colors, and upload music/voice note.
6. Click **Publish Invitation** ➔ Click **Copy Link**.
7. Open public `/i/:token` link in an incognito window.
8. Verify recipient interaction flow, music playback, and submission.
9. Return to `/dashboard` ➔ Click **Analytics** ➔ Verify interaction journey and event timeline.

---

## 🔒 Security & Privacy

* Passwords are securely hashed using `bcryptjs` (cost factor 12).
* Sessions are stored in MySQL (`web_sessions`) with `HttpOnly`, `SameSite=Lax`, and `Secure` HTTPS cookies.
* Write requests require CSRF token validation with timing-safe comparison.
* MySQL queries use parameterized statements (`?`) to prevent SQL injection.
* Production startup requires explicit MySQL credentials; fallback to SQLite is blocked in production mode (`NODE_ENV=production`).

### Sensitive Files

The following files and directories should **not** be committed to Git:

```text
.env
.env.local
data/app.db
data/uploads/
```

Add them to `.gitignore`:

```gitignore
.env
.env.local
data/app.db
data/uploads/
```

---

## 🤝 Contributing

Contributions, suggestions, bug reports, and feature requests are welcome.

Before submitting a pull request:

1. Run the test suite.
2. Verify that no credentials or private data are included.
3. Check that environment-specific files are excluded.
4. Keep changes focused and documented.

---

## 📄 License

See the repository for the applicable license and usage terms.

---

## 👨‍💻 Author

Developed by **Shiv Patel**.

**Repository:** [GitHub](https://github.com/ShivPatel412/Ask-Her-Out)
