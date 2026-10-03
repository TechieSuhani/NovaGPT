# NovaGPT

A responsive AI chat app powered by the Gemini API.

## Run locally

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Add your Gemini API key as `GEMINI_API_KEY` and a random `AUTH_SECRET` (at least 32 characters) to `Backend/.env`. Keep both values private.
3. Start the backend in one terminal:

   ```powershell
   cd Backend
   npm start
   ```

4. Start the frontend in another terminal:

   ```powershell
   cd frontend
   npm run dev
   ```

Open the Vite URL printed in the frontend terminal. Signed-in users' chat history is stored in MongoDB when `MONGODB_URI` is configured and connected. Guest conversations stay isolated in backend memory and are cleared when the backend restarts. Email/password registration and login require a reachable MongoDB connection.

## Account menu

Settings let you choose dark or light appearance, response detail, and reply language; these preferences are stored in the current browser. The account menu offers email/password registration and login; passwords are stored as scrypt hashes and sign-in uses an HttpOnly session cookie. Saved conversations are scoped to the signed-in account. INR plan prices are previews only—payments are not enabled.

## Deploy on Render

This repository includes a `render.yaml` Blueprint for a single Render web service that builds the Vite frontend and serves it with the Express API.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Set the `GEMINI_API_KEY` environment variable in the Render service settings. Never put the key in GitHub or in frontend code.
4. Set `MONGODB_URI` to an Atlas connection string and allow the Render service's outbound IP ranges in Atlas Network Access. MongoDB is required for user accounts and persistent chat history.
5. The Blueprint generates `AUTH_SECRET` automatically. If configuring the service without the Blueprint, set a random secret of at least 32 characters in Render.
6. Deploy the service and open its `onrender.com` URL.

Render's free instance may spin down after inactivity. Gemini API availability, quotas, and terms depend on Google's current free-tier policy.
