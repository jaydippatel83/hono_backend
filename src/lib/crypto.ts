import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

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

async function scryptAsync(password: string, salt: string) {
    return new Promise<Buffer<ArrayBuffer>>((res, rej) => {
        scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) rej(err);
            res(derivedKey);
        });
    });
}
