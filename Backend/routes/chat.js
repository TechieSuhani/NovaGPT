import express from "express";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import Thread from "../models/Thread.js";
import User from "../models/User.js";
import getAIResponse from "../utils/ai.js";
import {
    clearSessionCookie,
    createSessionToken,
    getCookieValue,
    getSessionUserId,
    hashPassword,
    setSessionCookie,
    verifyPassword
} from "../utils/auth.js";

const router = express.Router();
const memoryThreads = new Map();
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." }
});

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const getChatOwner = (req, res) => {
    const userId = getSessionUserId(req);

    if (userId) {
        return { ownerId: `user:${userId}`, databaseOwnerId: userId };
    }

    const existingGuestId = getCookieValue(req, "novagpt_guest");
    const guestId = existingGuestId && /^[\w-]{16,64}$/.test(existingGuestId)
        ? existingGuestId
        : randomUUID();

    if (guestId !== existingGuestId) {
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        res.append(
            "Set-Cookie",
            `novagpt_guest=${guestId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=31536000${secure}`
        );
    }

    return { ownerId: `guest:${guestId}`, databaseOwnerId: null };
};

const getThreadKey = (ownerId, threadId) => `${ownerId}:${threadId}`;

router.post("/auth/register", authLimiter, async (req, res) => {
    const email = typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password = req.body.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
    }

    if (!isDatabaseConnected()) {
        return res.status(503).json({ error: "Sign-up is temporarily unavailable because the user database is disconnected." });
    }

    try {
        const passwordHash = await hashPassword(password);
        const user = await User.create({ email, passwordHash });
        setSessionCookie(res, createSessionToken(user.id));
        res.status(201).json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "An account with this email already exists. Try signing in." });
        }

        console.error("Registration failed:", error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode === 503
                ? error.message
                : "Could not create the account. Please try again."
        });
    }
});

router.post("/auth/login", authLimiter, async (req, res) => {
    const email = typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const password = req.body.password;

    if (!email || typeof password !== "string") {
        return res.status(400).json({ error: "Enter your email and password." });
    }

    if (!isDatabaseConnected()) {
        return res.status(503).json({ error: "Sign-in is temporarily unavailable because the user database is disconnected." });
    }

    try {
        const user = await User.findOne({ email }).select("+passwordHash");
        const passwordMatches = user
            ? await verifyPassword(password, user.passwordHash)
            : false;

        if (!passwordMatches) {
            return res.status(401).json({ error: "Email or password is incorrect." });
        }

        setSessionCookie(res, createSessionToken(user.id));
        res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Sign-in failed:", error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode === 503
                ? error.message
                : "Could not sign in. Please try again."
        });
    }
});

router.post("/auth/logout", (req, res) => {
    clearSessionCookie(res);
    res.status(200).json({ success: true });
});

router.get("/auth/me", async (req, res) => {
    try {
        const userId = getSessionUserId(req);

        if (!userId) {
            return res.status(401).json({ error: "You are not signed in." });
        }

        if (!isDatabaseConnected()) {
            return res.status(503).json({ error: "The user database is disconnected." });
        }

        const user = await User.findById(userId).select("email");

        if (!user) {
            clearSessionCookie(res);
            return res.status(401).json({ error: "Your account could not be found. Please sign in again." });
        }

        res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error("Could not load signed-in user:", error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode === 503
                ? error.message
                : "Could not load your account."
        });
    }
});

router.get("/thread", async (req, res) => {
    try {
        const owner = getChatOwner(req, res);
        const databaseThreads = isDatabaseConnected()
            ? owner.databaseOwnerId
                ? await Thread.find({ ownerId: owner.databaseOwnerId }).sort({ updatedAt: -1 })
                : []
            : [];
        const threadsById = new Map(databaseThreads.map((thread) => [thread.threadId, thread]));

        for (const thread of memoryThreads.values()) {
            if (thread.ownerId === owner.ownerId && !threadsById.has(thread.threadId)) {
                threadsById.set(thread.threadId, thread);
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
        const owner = getChatOwner(req, res);
        const thread =
            memoryThreads.get(getThreadKey(owner.ownerId, req.params.threadId)) ||
            (owner.databaseOwnerId && isDatabaseConnected()
                ? await Thread.findOne({
                    threadId: req.params.threadId,
                    ownerId: owner.databaseOwnerId
                })
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
        const owner = getChatOwner(req, res);
        memoryThreads.delete(getThreadKey(owner.ownerId, req.params.threadId));

        if (owner.databaseOwnerId && isDatabaseConnected()) {
            await Thread.findOneAndDelete({
                threadId: req.params.threadId,
                ownerId: owner.databaseOwnerId
            });
        }

        res.status(200).json({ success: "Thread deleted successfully." });
    } catch (error) {
        console.error("Failed to delete thread:", error);
        res.status(500).json({ error: "Failed to delete thread." });
    }
});

router.post("/chat", async (req, res) => {
    const { threadId, message, responseStyle, responseLanguage } = req.body;

    if (typeof threadId !== "string" || !threadId.trim() ||
        typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "A thread ID and message are required." });
    }

    try {
        const owner = getChatOwner(req, res);
        const threadKey = getThreadKey(owner.ownerId, threadId);
        const existingThread =
            memoryThreads.get(threadKey) ||
            (owner.databaseOwnerId && isDatabaseConnected()
                ? await Thread.findOne({ threadId, ownerId: owner.databaseOwnerId })
                : null);
        const messages = [
            ...(existingThread?.messages || []).map(({ role, content }) => ({
                role,
                content
            })),
            { role: "user", content: message.trim() }
        ];
        const reply = await getAIResponse(messages, {
            responseStyle,
            responseLanguage
        });
        const now = new Date();
        const thread = existingThread || {
            threadId,
            ownerId: owner.databaseOwnerId || owner.ownerId,
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

        if (owner.databaseOwnerId && isDatabaseConnected()) {
            const databaseThread = thread instanceof Thread
                ? thread
                : new Thread(thread);
            databaseThread.ownerId = owner.databaseOwnerId;
            await databaseThread.save();
            memoryThreads.delete(threadKey);
        } else {
            thread.ownerId = owner.ownerId;
            memoryThreads.set(threadKey, thread);
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
