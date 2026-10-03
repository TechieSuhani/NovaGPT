import "dotenv/config";
import getGeminiResponse from "./gemini.js";
import getGroqResponse from "./groq.js";

const getAIResponse = (messages, preferences = {}) => {
    const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();

    if (provider === "groq") {
        return getGroqResponse(messages, preferences);
    }

    if (provider === "gemini") {
        return getGeminiResponse(messages, preferences);
    }

    const error = new Error("AI_PROVIDER must be set to either 'groq' or 'gemini'.");
    error.statusCode = 503;
    throw error;
};

export default getAIResponse;
