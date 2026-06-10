import { Hono } from "hono";
import z from "zod";
import { db } from "../db/db.ts";
import { sValidator } from "@hono/standard-validator";
import { and, eq } from "drizzle-orm";
import { apiKeyAuth, type ApiKeyEnv } from "../middleware/auth.ts";
import { BookTable } from "../db/schema.ts";

const app = new Hono();

const createBooksSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  publishedDate: z.coerce.date().optional(),
  pageCount: z.number().int().positive().optional(),
  authorId: z.uuid(),
});

const updateBooksSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  publishedDate: z.coerce.date().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  authorId: z.uuid().optional(),
});


app.get('/', async (c) => {
  const books = await db.query.BookTable.findMany({ with: { author: true } } as any);
  return c.json(books);
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const book = await db.query.BookTable.findFirst({
    where: { id },
    with: { author: true }
  } as any);

  if (book) {
    return c.json({ book });
  } else {
    return c.json({ error: 'Book not found' }, 404);
  }
});

const protectedApp = new Hono<ApiKeyEnv>();
protectedApp.use(apiKeyAuth);


protectedApp.post('/', sValidator("json", createBooksSchema), async (c) => {
  const { id: userId } = c.get("apiKeyUser");
  const data = c.req.valid("json");
  const author = await db.query.AuthorTable.findFirst({ where: { id: data.authorId } });
  if (!author) {
    return c.json({ error: 'Author not found' }, 404);
  }
  const [newBook] = await db.insert(BookTable).values({ ...data, addedBy: userId }).returning();
  return c.json(newBook, 201);
});

protectedApp.put('/:id', sValidator("json", updateBooksSchema), async (c) => {
  const id = c.req.param('id');
  const { id: userId, role } = c.get("apiKeyUser");
  const data = c.req.valid("json");
  if (data.authorId) {
    const author = await db.query.AuthorTable.findFirst({ where: { id: data.authorId } });
    if (!author) {
      return c.json({ error: 'Author not found' }, 404);
    }
  }

  const whereClause = role === "admin" ? eq(BookTable.id, id) : and(eq(BookTable.id, id), eq(BookTable.addedBy, userId));

  const [newBook] = await db.update(BookTable).set({ ...data, addedBy: userId }).where(whereClause).returning();
  if (!newBook) {
    return c.json({ error: 'Book not found or you do not have permission to update this book' }, 404);
  }
  return c.json(newBook, 201);
});

protectedApp.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { id: userId, role } = c.get("apiKeyUser");
  
  const whereClause = role === "admin" ? eq(BookTable.id, id) : and(eq(BookTable.id, id), eq(BookTable.addedBy, userId));     

  const deletedCount = await db.delete(BookTable).where(whereClause);
  return c.json({ message: 'Book deleted successfully' });
});

app.route('/', protectedApp);
export default app;