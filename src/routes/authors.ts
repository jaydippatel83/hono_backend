import { Hono } from "hono"; 

const app = new Hono();

const authors = [
  { id: 1, name: 'Author One' },
  { id: 2, name: 'Author Two' },
  { id: 3, name: 'Author Three' },
  { id: 4, name: 'Author Four' },
  { id: 5, name: 'Author Five' },
];

app.get('/', (c) => {
  return c.json(authors);
});

app.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const author = authors.find(a => a.id === id);
  if (author) {
    return c.json({author});
  } else {
    return c.json({ error: 'Author not found' }, 404);
  }
});

export default app;