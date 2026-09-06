import { describe, expect, it } from "vitest"

import {
  isPersonalizedStaffRequest,
  isSharedServiceWorkerCacheable,
} from "@/modules/staff-app/sw-cache-policy"

const origin = "https://rostera.example"

function request(
  pathname: string,
  overrides?: Partial<Parameters<typeof isSharedServiceWorkerCacheable>[0]>,
) {
  return {
    method: "GET",
    origin,
    pageOrigin: origin,
    pathname,
    search: "",
    ...overrides,
  }
}

describe("service worker cache policy", () => {
  it("never treats authenticated /me HTML or RSC as a shared cacheable asset", () => {
    expect(isPersonalizedStaffRequest(request("/me"))).toBe(true)
    expect(isPersonalizedStaffRequest(request("/me/roster"))).toBe(true)
    expect(
      isPersonalizedStaffRequest(request("/me", { mode: "navigate", destination: "document" })),
    ).toBe(true)
    expect(isPersonalizedStaffRequest(request("/dashboard", { search: "?_rsc=abc" }))).toBe(true)

    expect(isSharedServiceWorkerCacheable(request("/me"))).toBe(false)
    expect(isSharedServiceWorkerCacheable(request("/me/shifts/assignment-1"))).toBe(false)
    expect(
      isSharedServiceWorkerCacheable(
        request("/me", { mode: "navigate", destination: "document" }),
      ),
    ).toBe(false)
  })

  it("does not serve a cached document from one user to another because /me is not stored", () => {
    const userAHome = request("/me")
    const userBHome = request("/me")

    expect(isSharedServiceWorkerCacheable(userAHome)).toBe(false)
    expect(isSharedServiceWorkerCacheable(userBHome)).toBe(false)
  })

  it("allows shared static assets only", () => {
    expect(isSharedServiceWorkerCacheable(request("/_next/static/chunks/app.js"))).toBe(true)
    expect(isSharedServiceWorkerCacheable(request("/icons/rostera.svg"))).toBe(true)
    expect(isSharedServiceWorkerCacheable(request("/manifest.webmanifest"))).toBe(true)
    expect(isSharedServiceWorkerCacheable(request("/_next/data/build/me.json"))).toBe(false)
    expect(isSharedServiceWorkerCacheable(request("/me", { method: "POST" }))).toBe(false)
  })
})
