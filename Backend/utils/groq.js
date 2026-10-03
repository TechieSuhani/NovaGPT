const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
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

const getGroqResponse = async (messages, preferences = {}) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        const error = new Error("Groq API key is missing. Add GROQ_API_KEY to Backend/.env or Render.");
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
            response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
                    messages: [
                        { role: "system", content: instructions.join(" ") },
                        ...messages.map(({ role, content }) => ({
                            role: role === "assistant" ? "assistant" : "user",
                            content
                        }))
                    ]
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
            const providerMessage = data?.error?.message || "Groq API request failed.";
            const isRateLimited = response.status === 429;
            const error = new Error(
                isRateLimited
                    ? "Groq's current rate limit has been reached. Check your Groq account limits and try again later."
                    : providerMessage
            );
            error.statusCode = response.status;

            if (isRateLimited || !RETRYABLE_STATUSES.has(response.status) ||
                attempt === MAX_ATTEMPTS) {
                throw error;
            }

            await wait(getRetryDelay(response, attempt));
            continue;
        }

        const reply = data?.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            const error = new Error("Groq returned an empty response.");
            error.statusCode = 502;
            throw error;
        }

        return reply;
    }

    throw new Error("Groq API request failed after several attempts.");
};

export default getGroqResponse;
