import { describe, expect, it } from "vitest"

import { isExclusionConstraintViolation } from "@/lib/db/exclusion-constraint"
import { isUniqueConstraintViolation } from "@/lib/db/unique-constraint"

describe("sql constraint error mapping", () => {
  it("recognizes Prisma unique violations", () => {
    expect(
      isUniqueConstraintViolation({ kind: "sql_query", sqlState: "23505" }),
    ).toBe(true)
  })

  it("recognizes Prisma exclusion violations", () => {
    expect(
      isExclusionConstraintViolation({ kind: "sql_query", sqlState: "23P01" }),
    ).toBe(true)
  })

  it("does not treat unique and exclusion violations as interchangeable", () => {
    expect(
      isExclusionConstraintViolation({ kind: "sql_query", sqlState: "23505" }),
    ).toBe(false)
    expect(isUniqueConstraintViolation({ kind: "sql_query", sqlState: "23P01" })).toBe(false)
  })

  it("ignores unstructured errors", () => {
    expect(isExclusionConstraintViolation(new Error("EXCLUDE"))).toBe(false)
    expect(isExclusionConstraintViolation({ sqlState: "23P01" })).toBe(false)
  })
})
