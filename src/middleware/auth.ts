import { createMiddleware } from 'hono/factory';
import type { UserTable } from '../db/schema.ts';
import { hashApiKey } from '../lib/crypto.ts';
import { db } from '../db/db.ts';


export type ApiKeyEnv = {
    Variables: {
        apiKeyUser: Pick<typeof UserTable.$inferSelect, "id" | "role" | "email">,
    }
}

export const apiKeyAuth = createMiddleware<ApiKeyEnv>(async (c, next) => {
    const key = c.req.header("x-api-key");
    if (!key || key.trim() === "") {
        return c.json({ error: "API key is required" }, 401);
    }

    const keyHash = hashApiKey(key);
    const apiKey = await db.query.ApiKeysTable.findFirst({ where: { keyHash } });
    if (apiKey == null) {
        return c.json({ error: "Invalid API key" }, 401);
    }

    const user = await db.query.UserTable.findFirst({ where: { id: apiKey.userId }, columns: { id: true, email: true, role: true } });
    if (user == null) {
        return c.json({ error: "Invalid API key" }, 401);
    }

    c.set("apiKeyUser", user);
    await next();

});