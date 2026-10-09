# Deploy Pathwise on Render Free

This repository keeps the existing `webapp/` untouched. The Render Blueprint deploys the new `pathwise/` app folder.

1. Create a free Postgres project in Neon and copy its pooled connection string. Keep it private.
2. In Render, choose **New + → Blueprint** and connect `priyanshukushwaha1506/WebDev`.
3. Render reads the root `render.yaml`. When prompted, provide the Neon string as `DATABASE_URL`.
4. Deploy and share the generated Render URL. The Node service is on Render Free; Neon Free supplies persistent Postgres storage.

Render Free web services use an ephemeral filesystem, so Pathwise refuses to start without `DATABASE_URL`. Neon Free also has usage, compute, and storage limits. Check both plans before using the app for important data.
