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

const getGeminiResponse = async (messages, preferences = {}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY to Backend/.env.");
        error.statusCode = 503;
        throw error;
    }

    const responseStyles = {
        concise: "Keep answers concise and focused.",
        balanced: "Give clear, balanced answers with useful detail.",
        detailed: "Give thorough answers with explanations and examples when useful."
    };
    const responseLanguages = {
        english: "Reply in English.",
        hindi: "Reply in Hindi."
    };
    const instructions = [
        responseStyles[preferences.responseStyle] || responseStyles.balanced,
        responseLanguages[preferences.responseLanguage] ||
            "Reply in the same language as the user's latest message."
    ];

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
                    systemInstruction: {
                        parts: [{ text: instructions.join(" ") }]
                    },
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
            const providerMessage = data?.error?.message || "Gemini API request failed.";
            const isQuotaExceeded = response.status === 429 &&
                /(quota exceeded|free_tier_requests|generate_content_free_tier_requests)/i
                    .test(providerMessage);
            const error = new Error(
                isQuotaExceeded
                    ? "NovaGPT has reached Gemini's free request limit. Please try again after Google's quota reset, or enable billing for more requests."
                    : providerMessage
            );
            error.statusCode = response.status;

            if (isQuotaExceeded || !RETRYABLE_STATUSES.has(response.status) ||
                attempt === MAX_ATTEMPTS) {
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
