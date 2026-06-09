import { Hono } from "hono";
import z from "zod";
import { db } from "../db/db.ts";
import { sValidator } from "@hono/standard-validator";
import { UserTable } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/crypto.ts";
import { sign } from "hono/jwt";
import { env } from "../data/env.ts";

const JWT_EXTRATION_SECONDS = 60 * 60 * 24; // 24 hours

const app = new Hono(); 
const registerSchema = z.object({
  email: z.email().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.email().min(1),
  password: z.string().min(6),
});

app.post('/register', sValidator("json", registerSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const existingUser = await db.query.UserTable.findFirst({
    where: { email }
  });

  if (existingUser) {
    return c.json({ error: 'Email already in use' }, 400);
  }

  const hashedPassword = await hashPassword(password);
  const [newUser] = await db.insert(UserTable).values({ email, passwordHash: hashedPassword }).returning({ id: UserTable.id, email: UserTable.email });
  return c.json({ message: 'User registered successfully', newUser }, 201);
});

app.post('/login', sValidator("json", loginSchema), async (c) => {
 const { email, password } = c.req.valid("json");

  const existingUser = await db.query.UserTable.findFirst({
    where: { email }
  });

  if (!existingUser) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const isValidPassword = await verifyPassword(password, existingUser.passwordHash);
  if (!isValidPassword) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }  

  const now = Math.floor(Date.now() / 1000);
  const token = await sign({ exp: now + JWT_EXTRATION_SECONDS, sub: existingUser.id, email: existingUser.email }, env.JWT_SECRET);

  return c.json({ message: 'Login successful', token });
 
});

export default app;