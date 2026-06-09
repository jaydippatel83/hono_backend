import { Hono } from "hono"; 
import z from "zod";
import { db } from "../db/db.ts";
import { sValidator } from "@hono/standard-validator";
import { AuthorTable } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const app = new Hono(); 

const createAuthorSchema = z.object({
  name: z.string().min(1),
  birthday: z.coerce.date().optional(),
});

const updateAuthorSchema = z.object({
  name: z.string().min(1).optional(),
  birthday: z.coerce.date().nullable().optional(),
});


app.get('/', async (c) => {
  const authors =  await db.query.AuthorTable.findMany();
  return c.json(authors);
});

app.get('/:id', async (c) => {
  const id =c.req.param('id');
  const author = await db.query.AuthorTable.findFirst({
    where: {id}
  });

  if (author) {
    return c.json({author});
  } else {
    return c.json({ error: 'Author not found' }, 404);
  }
});

app.post('/', sValidator("json", createAuthorSchema), async (c) => {
  const data = c.req.valid("json");
  const [newAuthor] = await db.insert(AuthorTable).values(data).returning();
  return c.json(newAuthor, 201);
});

app.put('/:id', sValidator("json", updateAuthorSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid("json");

  const [newAuthor] = await db.update(AuthorTable).set(data).where(eq(AuthorTable.id, id)).returning();
    
  if (!newAuthor) {
    return c.json({ error: 'Author not found' }, 404);
  } 
  return c.json(newAuthor);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deletedCount = await db.delete(AuthorTable).where(eq(AuthorTable.id, id));
  return c.json({ message: 'Author deleted successfully' });
});


export default app;