import { describe, expect, it } from "vitest"

import { buildCsv, csvCell } from "@/modules/reports/services/csv"

describe("report CSV", () => {
  it("escapes commas, quotes, and newlines", () => {
    const csv = buildCsv(["Staff", "Notes"], [["Ama, RN", 'Said "ok"\nNext']])
    expect(csv).toContain('"Ama, RN"')
    expect(csv).toContain('"Said ""ok""\nNext"')
  })

  it("neutralizes formula-like values", () => {
    expect(csvCell("=CMD(1)")).toBe('"\'=CMD(1)"')
    expect(csvCell("+SUM(A1)")).toBe('"\'+SUM(A1)"')
    expect(csvCell("-1+1")).toBe('"\'-1+1"')
    expect(csvCell("@IMPORT")).toBe('"\'@IMPORT"')
  })

  it("keeps stable headers", () => {
    const csv = buildCsv(["Date", "Staff number"], [["2026-09-10", "NUR-001"]])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv).toContain('"Date","Staff number"')
  })
})
