import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "novagpt_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export const getCookieValue = (request, cookieName) => {
    const cookieHeader = request.headers.cookie || "";
    const cookie = cookieHeader.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`));

    return cookie?.slice(cookieName.length + 1) || null;
};

const getAuthSecret = () => {
    const secret = process.env.AUTH_SECRET;

    if (!secret || Buffer.byteLength(secret) < 32) {
        const error = new Error("Authentication is not configured. Set a 32-character AUTH_SECRET.");
        error.statusCode = 503;
        throw error;
    }

    return secret;
};

export const hashPassword = async (password) => {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64);

    return `${salt.toString("base64url")}.${derivedKey.toString("base64url")}`;
};

export const verifyPassword = async (password, storedHash) => {
    const [saltText, keyText] = storedHash.split(".");

    if (!saltText || !keyText) {
        return false;
    }

    const salt = Buffer.from(saltText, "base64url");
    const expectedKey = Buffer.from(keyText, "base64url");
    const actualKey = await scrypt(password, salt, expectedKey.length);

    return actualKey.length === expectedKey.length &&
        timingSafeEqual(actualKey, expectedKey);
};

export const createSessionToken = (userId) => {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
    const payload = Buffer.from(JSON.stringify({ sub: userId, exp: expiresAt }))
        .toString("base64url");
    const signature = createHmac("sha256", getAuthSecret())
        .update(payload)
        .digest("base64url");

    return `${payload}.${signature}`;
};

export const getSessionUserId = (request) => {
    const token = getCookieValue(request, SESSION_COOKIE);
    if (!token) return null;
    const [payload, signature] = token.split(".");

    if (!payload || !signature) {
        return null;
    }

    let expectedSignature;

    try {
        expectedSignature = createHmac("sha256", getAuthSecret())
            .update(payload)
            .digest();
    } catch (error) {
        if (error.statusCode === 503) {
            throw error;
        }
        return null;
    }

    const actualSignature = Buffer.from(signature, "base64url");

    if (actualSignature.length !== expectedSignature.length ||
        !timingSafeEqual(actualSignature, expectedSignature)) {
        return null;
    }

    try {
        const session = JSON.parse(Buffer.from(payload, "base64url").toString());
        return typeof session.sub === "string" &&
            Number.isInteger(session.exp) &&
            session.exp > Math.floor(Date.now() / 1000)
            ? session.sub
            : null;
    } catch {
        return null;
    }
};

export const setSessionCookie = (response, token) => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
    );
};

export const clearSessionCookie = (response) => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
    );
};
