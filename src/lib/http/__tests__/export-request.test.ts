import { describe, expect, it } from "vitest"

import { isCrossSiteExportRequest } from "../export-request"

describe("export request site checks", () => {
  it("rejects explicit cross-site fetches", () => {
    expect(
      isCrossSiteExportRequest(
        new Request("https://app.local/reports/export", {
          headers: { "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toBe(true)
  })

  it("allows same-origin and missing fetch metadata", () => {
    expect(
      isCrossSiteExportRequest(
        new Request("https://app.local/reports/export", {
          headers: { "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(false)
    expect(isCrossSiteExportRequest(new Request("https://app.local/reports/export"))).toBe(false)
  })
})
