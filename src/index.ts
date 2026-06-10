import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import authorRoutes from './routes/authors.ts'
import authRoutes from './routes/auth.ts'
import apiKeysRoutes from './routes/apiKeys.ts'
import booksRoutes from './routes/books.ts'
import { env } from './data/env.ts'

const app = new Hono()

app.route('/authors', authorRoutes) 
app.route('/auth', authRoutes)
app.route('/api-keys', apiKeysRoutes)
app.route('/books', booksRoutes)

serve({
  fetch: app.fetch,
  port: env.PORT || 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
