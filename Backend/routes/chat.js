import express from "express";
import mongoose from "mongoose";
import Thread from "../models/Thread.js";
import getGeminiResponse from "../utils/gemini.js";

const router = express.Router();
const memoryThreads = new Map();

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

router.get("/thread", async (req, res) => {
    try {
        const databaseThreads = isDatabaseConnected()
            ? await Thread.find({}).sort({ updatedAt: -1 })
            : [];
        const threadsById = new Map(
            databaseThreads.map((thread) => [thread.threadId, thread])
        );

        for (const [threadId, thread] of memoryThreads) {
            if (!threadsById.has(threadId)) {
                threadsById.set(threadId, thread);
            }
        }

        res.json(
            [...threadsById.values()].sort(
                (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
            )
        );
    } catch (error) {
        console.error("Failed to fetch threads:", error);
        res.status(500).json({ error: "Failed to fetch threads." });
    }
});

router.get("/thread/:threadId", async (req, res) => {
    try {
        const thread =
            memoryThreads.get(req.params.threadId) ||
            (isDatabaseConnected()
                ? await Thread.findOne({ threadId: req.params.threadId })
                : null);

        if (!thread) {
            return res.status(404).json({ error: "Thread not found." });
        }

        res.json(thread.messages);
    } catch (error) {
        console.error("Failed to fetch chat:", error);
        res.status(500).json({ error: "Failed to fetch chat." });
    }
});

router.delete("/thread/:threadId", async (req, res) => {
    try {
        memoryThreads.delete(req.params.threadId);

        if (isDatabaseConnected()) {
            await Thread.findOneAndDelete({ threadId: req.params.threadId });
        }

        res.status(200).json({ success: "Thread deleted successfully." });
    } catch (error) {
        console.error("Failed to delete thread:", error);
        res.status(500).json({ error: "Failed to delete thread." });
    }
});

router.post("/chat", async (req, res) => {
    const { threadId, message } = req.body;

    if (typeof threadId !== "string" || !threadId.trim() ||
        typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "A thread ID and message are required." });
    }

    try {
        const existingThread =
            memoryThreads.get(threadId) ||
            (isDatabaseConnected()
                ? await Thread.findOne({ threadId })
                : null);
        const messages = [
            ...(existingThread?.messages || []).map(({ role, content }) => ({
                role,
                content
            })),
            { role: "user", content: message.trim() }
        ];
        const reply = await getGeminiResponse(messages);
        const now = new Date();
        const thread = existingThread || {
            threadId,
            title: message.trim().slice(0, 80),
            messages: [],
            createdAt: now,
            updatedAt: now
        };

        thread.messages.push(
            { role: "user", content: message.trim() },
            { role: "assistant", content: reply }
        );
        thread.updatedAt = now;

        if (thread instanceof Thread) {
            await thread.save();
        } else {
            memoryThreads.set(threadId, thread);
        }

        res.json({ reply });
    } catch (error) {
        console.error("Chat request failed:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Could not generate a response."
        });
    }
});

export default router;
