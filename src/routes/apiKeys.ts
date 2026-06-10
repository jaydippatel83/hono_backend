import { Hono } from "hono";
import z from "zod";
import { db } from "../db/db.ts";
import { sValidator } from "@hono/standard-validator";
import { ApiKeysTable, UserTable } from "../db/schema.ts";
import { and, eq } from "drizzle-orm";
import { generateApiKey, hashPassword, verifyPassword } from "../lib/crypto.ts";
import { jwt, sign } from "hono/jwt";
import { env } from "../data/env.ts";

type JwtEnv = {
  Variables: {
    jwtPayload: {
      sub: string,
      email: string,
      exp: number,
    }
  };
}

const app = new Hono<JwtEnv>();

const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
});

app.use(jwt({ secret: env.JWT_SECRET, alg: "HS256" }));

app.get("/", async (c) => {
  const { sub: userId } = c.var.jwtPayload;
  const keys = await db.query.ApiKeysTable.findMany({
    where: { userId },
    columns: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
    }
  });
  return c.json(keys);
});

app.post("/", sValidator("json", createApiKeySchema), async (c) => {
  const { sub: userId } = c.var.jwtPayload;
  const { name } = await c.req.valid("json");
  const { raw, hash, prefix } = generateApiKey();

  const [newKey] = await db.insert(ApiKeysTable).values({
    userId,
    name,
    keyHash: hash,
    keyPrefix: prefix,
  }).returning({
    id: ApiKeysTable.id,
  });
  return c.json({ message: "API key created successfully", apiKey: { id: newKey.id, name, key: raw } }, 201);
});

app.delete("/:id", sValidator("json", createApiKeySchema), async (c) => {
  const { sub: userId } = c.var.jwtPayload;
  const id = c.req.param("id"); 
  await db.delete(ApiKeysTable).where(and(eq(ApiKeysTable.id, id), eq(ApiKeysTable.userId, userId)));
  return c.json({ message: "API key deleted successfully" });
});


export default app;