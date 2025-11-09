# Deployment checklist

This document contains recommended steps to deploy the monorepo (backend + frontend) to common hosts (Render for backend, Netlify for frontend) and container platforms.

1. Netlify (frontend)
- Ensure `netlify.toml` exists at the repo root. It should point to the `FRONTEND` directory:

```
[build]
  base = "FRONTEND"
  publish = "dist"
  command = "npm run build"
```

- In Netlify site settings → Build & deploy → Environment → add:
  - `VITE_API_URL` = `https://<your-backend>.onrender.com`

- Trigger a deploy. Confirm the deploy log publishes `/opt/build/repo/FRONTEND/dist`.

2. Render (backend)
- Create a Web Service with Root Directory = `BACKEND`.
- Build Command: `npm install`
- Start Command: `npm start`
- Set environment variables (sensitive values) under Environment → Environment Variables. Do not store `.env` in git.
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `CLOUDINARY_*` (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
  - `FRONTEND_URL` = `https://<your-netlify-site>.netlify.app`
  - `FIREBASE_SERVICE_ACCOUNT_JSON` or path if using FCM
  - `ANALYTICS_ENABLED` if you want cron aggregation

3. Docker / Containers
- Use the included `Dockerfile` to package the backend. Build and run locally:

```bash
docker build -t mychat-backend .
docker run -e MONGODB_URI=... -p 5001:5001 mychat-backend
```

4. Health checks
- A lightweight health endpoint is available at `/api/health/ping`.

5. Security: rotate secrets
- If you committed secrets to the repo, rotate them (MongoDB user, SMTP app password) and remove `.env` from the repo. Use platform-provided secret storage.

6. CORS
- Set `FRONTEND_URL` on Render to your Netlify URL so the backend allows requests from the frontend.

7. CI / Monitoring
- Add an uptime monitor to call `/api/health/ping` and add error reporting (Sentry) to the backend.
