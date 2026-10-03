# SigmaGPT

## Get a free Gemini API key

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey). Gemini API usage is subject to Google's free-tier availability, quotas, and terms.

In `Backend/.env`, set:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Keep this key in the backend environment only; do not add it to frontend code or commit it.

MongoDB is optional. If `MONGODB_URI` is unavailable, chat history is kept in memory and is cleared when the backend restarts.

## Run locally

Start the backend in one terminal:

```powershell
cd Backend
node server.js
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open the local URL printed by Vite. The frontend proxies `/api` requests to the backend on port `8081`.
