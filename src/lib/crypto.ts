import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = await scryptAsync(password, salt);
    return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string) {
    const [salt, key] = hash.split(":");
    const stored = Buffer.from(key, "hex");
    const derivedKey = await scryptAsync(password, salt);
    return timingSafeEqual(stored, derivedKey);
}

export function generateApiKey() {
    const raw = randomBytes(32).toString("base64");
    const hash =  hashApiKey(raw); 
    const prefix = raw.slice(0, 8);
    return { raw, hash, prefix };
}

export  function hashApiKey(apiKey: string) {
    return createHash("sha256").update(apiKey).digest("hex");
}

async function scryptAsync(password: string, salt: string) {
    return new Promise<Buffer<ArrayBuffer>>((res, rej) => {
        scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) rej(err);
            res(derivedKey);
        });
    });
}
