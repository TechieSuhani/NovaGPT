# NovaGPT

A responsive AI chat app powered by the Gemini API.

## Run locally

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Add your Gemini API key as `GEMINI_API_KEY` in `Backend/.env`. Keep this key private.
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

Open the Vite URL printed in the frontend terminal. Chat history is stored in MongoDB when `MONGODB_URI` is configured and connected; otherwise it is kept in backend memory and is cleared when the backend restarts.

## Deploy on Render

This repository includes a `render.yaml` Blueprint for a single Render web service that builds the Vite frontend and serves it with the Express API.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Set the `GEMINI_API_KEY` environment variable in the Render service settings. Never put the key in GitHub or in frontend code.
4. Optionally set `MONGODB_URI` if you want persistent chat history.
5. Deploy the service and open its `onrender.com` URL.

Render's free instance may spin down after inactivity. Gemini API availability, quotas, and terms depend on Google's current free-tier policy.
