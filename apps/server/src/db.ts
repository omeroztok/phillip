import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7's client always requires an explicit driver adapter — no more
// implicit bundled-engine mode, even for SQLite. The adapter wants a raw
// file path, not the `file:` URL convention DATABASE_URL otherwise uses.
const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const adapter = new PrismaBetterSqlite3({ url });

// A singleton, matching the pattern every other store in this app already
// uses (one shared instance for the process lifetime) — just backed by a
// real (SQLite) database instead of an in-memory Map.
export const db = new PrismaClient({ adapter });
