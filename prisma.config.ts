import { config } from "dotenv"
import { definePrismaConfig } from "@prisma/cli-engine"
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config"

config({ path: ".env.local" })
config()

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
    },
  }),
})
