import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../data/env.ts";
import { relations } from "./relations.ts";


export const db = drizzle({ 
  relations,
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
});