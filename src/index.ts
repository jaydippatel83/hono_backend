import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import authorRoutes from './routes/authors.ts'
import { env } from './data/env.ts'

const app = new Hono()

app.route('/authors', authorRoutes) 

serve({
  fetch: app.fetch,
  port: env.PORT || 3000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
