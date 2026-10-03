import "dotenv/config";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

const getRetryDelay = (response, attempt) => {
    const retryAfter = Number(response.headers.get("retry-after"));

    if (Number.isFinite(retryAfter) && retryAfter > 0) {
        return Math.min(retryAfter * 1000, 5000);
    }

    return attempt * 1000;
};

const getGeminiResponse = async (messages) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY to Backend/.env.");
        error.statusCode = 503;
        throw error;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let response;

        try {
            response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    contents: messages.map(({ role, content }) => ({
                        role: role === "assistant" ? "model" : "user",
                        parts: [{ text: content }]
                    }))
                }),
                signal: AbortSignal.timeout(30000)
            });
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) {
                throw error;
            }

            await wait(attempt * 1000);
            continue;
        }

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(
                data?.error?.message || "Gemini API request failed."
            );
            error.statusCode = response.status;

            if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
                throw error;
            }

            await wait(getRetryDelay(response, attempt));
            continue;
        }

        const reply = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("")
            .trim();

        if (!reply) {
            const error = new Error("Gemini returned an empty response.");
            error.statusCode = 502;
            throw error;
        }

        return reply;
    }

    throw new Error("Gemini API request failed after several attempts.");
};

export default getGeminiResponse;
