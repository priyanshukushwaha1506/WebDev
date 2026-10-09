# Pathwise

Pathwise is a React learning tracker with nested lessons for MERN, Java, data science, AI/ML, and core computer science. Learners can also create shared paths with their own sections and lessons. Accounts, completions, focus sessions, friend links, and custom paths are stored in a database.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The Express API runs on port 3002 and Vite proxies `/api` requests to it. Locally, data is written to `data/pathwise.sqlite`. Set `DATABASE_URL` to use Postgres locally.

To check the production bundle and server:

```sh
npm run build
npm start
```

## Deploy on Render

1. Create a free Postgres project on Neon and copy its pooled connection string.
2. Push this project to GitHub.
3. In Render, choose **New +** then **Blueprint**, and connect the repository.
4. Set `DATABASE_URL` to the Neon connection string when Render prompts for it. The service starts on Render's free web plan and stores app data in Neon Postgres.
5. Share the Render URL with friends.

Render Free instances have an ephemeral filesystem and spin down when idle; do not use local SQLite for a hosted deployment. Neon Free currently includes persistent Postgres storage with usage limits and scale-to-zero. Check both providers' current limits before inviting friends.

## Accounts and friends

Register with a display name, username, and password, then log in with that account. Passwords are salted and hashed with Node's scrypt; the app uses expiring HttpOnly, SameSite cookies. To connect, each person registers first, then either person can add the other's username in the study circle. Learning records and activity are visible to connected friends.

Passwords are salted and hashed with Node's scrypt; the app uses expiring HttpOnly, SameSite cookies. To connect, each person registers first, then either person can add the other's username in the study circle. Learning records and activity are visible to connected friends.

The Postgres connection string is a secret: set it in Render's environment settings, never in Git or chat. For a public deployment, use HTTPS and review the account/security requirements for your audience before inviting users.

Focus timers save elapsed-time checkpoints every 10 seconds and when the page is closed. Returning to an active timer restores its saved time in a paused state so offline time is not counted.
