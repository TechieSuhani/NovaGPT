# NovaGPT

A responsive AI chat app powered by Groq, with Gemini available as an optional provider.

## Run locally

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Add your Groq API key as `GROQ_API_KEY` and a random `AUTH_SECRET` (at least 32 characters) to `Backend/.env`. Keep both values private. `AI_PROVIDER` defaults to `groq`; `GROQ_MODEL` defaults to `openai/gpt-oss-20b`.
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

The chat composer supports microphone dictation in browsers that provide the Web Speech API. Assistant replies can be read aloud using the speaker button; browser microphone permissions and installed speech voices are required.

## Deploy on Render

This repository includes a `render.yaml` Blueprint for a single Render web service that builds the Vite frontend and serves it with the Express API.

1. Push this repository to GitHub.
2. In Render, create a new **Blueprint** and select this repository.
3. Set `GROQ_API_KEY` in the Render service settings. The Blueprint selects Groq with `AI_PROVIDER=groq`; never put the key in GitHub or frontend code.
4. Set `MONGODB_URI` to an Atlas connection string and allow the Render service's outbound IP ranges in Atlas Network Access. MongoDB is required for user accounts and persistent chat history.
5. The Blueprint generates `AUTH_SECRET` automatically. If configuring the service without the Blueprint, set a random secret of at least 32 characters in Render.
6. Deploy the service and open its `onrender.com` URL.

Render's free instance may spin down after inactivity. Groq rate limits depend on the model and organization; check the current limits at [Groq Console](https://console.groq.com/settings/limits). A free API tier is not unlimited, and availability and terms can change.

To use Gemini instead, set `AI_PROVIDER=gemini` and provide `GEMINI_API_KEY`. If the selected provider's quota or rate limit is exhausted, NovaGPT displays a concise retry message; restarting or redeploying the app does not reset provider limits.
