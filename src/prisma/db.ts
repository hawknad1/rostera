import "temporal-polyfill/full/global"
import { config } from "dotenv"
import postgres from "@prisma/orm-postgres/runtime"
import type { Contract } from "./contract.d"
import contractJson from "./contract.json" with { type: "json" }

config({ path: ".env.local" })
config()

const createDb = () =>
  postgres<Contract>({
    contractJson,
    url: process.env["DATABASE_URL"]!,
  })

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined
}

export const db = globalForDb.db ?? createDb()

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db
}
