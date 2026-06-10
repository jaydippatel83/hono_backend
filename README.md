# Backend Demo

A small REST API for managing **books** and **authors**, built with [Hono](https://hono.dev/) on Node.js, [Drizzle ORM](https://orm.drizzle.team/) and PostgreSQL. It demonstrates two complementary authentication strategies:

- **JWT auth** — for human users to register, log in, and manage their API keys.
- **API key auth** — for programmatic clients to create/update/delete books and authors.

## Tech Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Runtime        | Node.js (ESM, run via [`tsx`](https://tsx.is/))   |
| Web framework  | [Hono](https://hono.dev/) + `@hono/node-server`   |
| Database       | PostgreSQL                                        |
| ORM / migrations | [Drizzle ORM](https://orm.drizzle.team/) + Drizzle Kit |
| Validation     | [Zod](https://zod.dev/) via `@hono/standard-validator` |
| Auth           | JWT (`hono/jwt`, HS256) + SHA-256 hashed API keys |
| Password hashing | Node `crypto` `scrypt`                          |

## Project Structure

```
src/
├── index.ts              # App entry — mounts routes, starts the server
├── data/
│   └── env.ts            # Zod-validated environment variables
├── db/
│   ├── db.ts             # Drizzle client / Postgres connection
│   ├── relations.ts      # Drizzle relational definitions
│   ├── schema.ts         # Re-exports all table schemas
│   ├── schemas/          # Table definitions (users, authors, books, apiKeys)
│   └── migrations/       # Generated SQL migrations
├── lib/
│   └── crypto.ts         # Password hashing + API key generation/hashing
├── middleware/
│   └── auth.ts           # API key authentication middleware
└── routes/
    ├── auth.ts           # /auth  — register, login (JWT)
    ├── apiKeys.ts        # /api-keys — manage API keys (JWT protected)
    ├── authors.ts        # /authors — CRUD (writes need API key)
    └── books.ts          # /books — CRUD (writes need API key)
```

## Data Model

- **users** — `id`, `email` (unique), `passwordHash`, `role` (`admin` | `user`), `createdAt`
- **api_keys** — `id`, `userId` → users (cascade), `name`, `keyHash`, `keyPrefix`, `createdAt`
- **authors** — `id`, `name`, `birthday`, `createdAt`
- **books** — `id`, `title`, `description`, `publishDate`, `pageCount`, `authorId` → authors (restrict), `addedBy` → users (restrict), `createdAt`

Relationships: a user has many API keys and many added books; an author has many books; a book belongs to an author and to the user who added it.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for the Postgres container) or an existing PostgreSQL instance

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=backend_demo

JWT_SECRET=replace-with-a-long-random-secret
```

All variables are validated at startup by [src/data/env.ts](src/data/env.ts) — the server refuses to boot if any are missing or invalid.

### 3. Start PostgreSQL

The included [docker-compose.yml](docker-compose.yml) reads the same `.env`:

```bash
docker compose up -d
```

### 4. Apply database migrations

```bash
npx drizzle-kit migrate
```

> To change the schema, edit the files in `src/db/schemas/`, then run `npx drizzle-kit generate` to create a new migration and `npx drizzle-kit migrate` to apply it.

### 5. Run the server

```bash
npm run dev      # watch mode (tsx)
```

The API is served at `http://localhost:3000`.

### Production build

```bash
npm run build    # tsc → dist/
npm run start    # node dist/index.js
```

## Authentication

Two layers, used for different things:

1. **JWT (Bearer token)** — obtained from `POST /auth/login`. Required by the `/api-keys` routes. Send as `Authorization: Bearer <token>`. Tokens are HS256-signed and expire after 24 hours.
2. **API key** — created via `POST /api-keys`. Required for all **write** operations on `/authors` and `/books`. Send as the `x-api-key` header.

> The raw API key is returned **only once**, at creation time. Only its SHA-256 hash and a short prefix are stored, so save it immediately.

Role-based ownership applies to book writes: a `user` may only update/delete books they added, while an `admin` may modify any book.

## API Reference

Base URL: `http://localhost:3000`

### Auth — `/auth`

| Method | Path             | Auth | Body                       | Description                       |
| ------ | ---------------- | ---- | -------------------------- | --------------------------------- |
| POST   | `/auth/register` | —    | `{ email, password }`      | Register a new user (password ≥ 6) |
| POST   | `/auth/login`    | —    | `{ email, password }`      | Returns a JWT `token`             |

### API Keys — `/api-keys` (JWT required)

| Method | Path            | Body         | Description                                 |
| ------ | --------------- | ------------ | ------------------------------------------- |
| GET    | `/api-keys`     | —            | List your API keys (id, name, prefix, date) |
| POST   | `/api-keys`     | `{ name }`   | Create a key — returns the raw key once     |
| DELETE | `/api-keys/:id` | —            | Delete one of your API keys                 |

### Authors — `/authors`

| Method | Path           | Auth     | Body                       | Description          |
| ------ | -------------- | -------- | -------------------------- | -------------------- |
| GET    | `/authors`     | —        | —                          | List all authors     |
| GET    | `/authors/:id` | —        | —                          | Get one author       |
| POST   | `/authors`     | API key  | `{ name, birthday? }`      | Create an author     |
| PUT    | `/authors/:id` | API key  | `{ name?, birthday? }`     | Update an author     |
| DELETE | `/authors/:id` | API key  | —                          | Delete an author     |

### Books — `/books`

| Method | Path         | Auth     | Body                                                          | Description                          |
| ------ | ------------ | -------- | ------------------------------------------------------------ | ------------------------------------ |
| GET    | `/books`     | —        | —                                                            | List all books (with author)         |
| GET    | `/books/:id` | —        | —                                                            | Get one book (with author)           |
| POST   | `/books`     | API key  | `{ title, authorId, description?, publishedDate?, pageCount? }` | Create a book                        |
| PUT    | `/books/:id` | API key  | partial of the create body                                   | Update a book (owner or admin)       |
| DELETE | `/books/:id` | API key  | —                                                            | Delete a book (owner or admin)       |

## Example Usage

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}'

# 2. Log in → grab the JWT
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' | jq -r .token)

# 3. Create an API key (raw key shown only here)
KEY=$(curl -s -X POST http://localhost:3000/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-cli"}' | jq -r .apiKey.key)

# 4. Create an author
AUTHOR_ID=$(curl -s -X POST http://localhost:3000/authors \
  -H "x-api-key: $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ursula K. Le Guin"}' | jq -r .id)

# 5. Create a book
curl -X POST http://localhost:3000/books \
  -H "x-api-key: $KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"A Wizard of Earthsea\",\"authorId\":\"$AUTHOR_ID\"}"
```

## Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start in watch mode with `tsx`       |
| `npm run build` | Compile TypeScript to `dist/`        |
| `npm run start` | Run the compiled server              |

Drizzle Kit commands (via `npx drizzle-kit …`): `generate`, `migrate`, `studio`.

## Notes

- This is a demo project. Before any real-world use, consider: rate limiting, CORS configuration, request logging, refresh tokens, and stricter secret management.
- `JWT_SECRET` must be a strong random string and kept out of version control (`.env` is git-ignored).
