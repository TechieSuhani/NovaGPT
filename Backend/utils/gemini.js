import "dotenv/config";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

const getGeminiResponse = async (messages) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        const error = new Error("Gemini API key is missing. Add GEMINI_API_KEY to Backend/.env.");
        error.statusCode = 503;
        throw error;
    }

    const response = await fetch(GEMINI_API_URL, {
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
        })
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data?.error?.message || "Gemini API request failed."
        );
        error.statusCode = response.status;
        throw error;
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
};

export default getGeminiResponse;
