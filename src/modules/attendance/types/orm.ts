import { db } from "@/prisma/db"

export type PublicOrm = typeof db.orm
export type TxClient = { orm: PublicOrm }
