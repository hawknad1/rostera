import { test, expect } from "@playwright/test"

import { e2eStaffCredentials } from "./helpers/credentials"

test.describe("staff PWA smoke", () => {
  test("service worker script and manifest are public", async ({ request }) => {
    const script = await request.get("/sw.js")
    expect(script.ok()).toBe(true)
    const body = await script.text()
    expect(body).toContain("rostera-staff-v1")
    expect(body).toContain('url.pathname === "/me"')

    const manifest = await request.get("/manifest.webmanifest")
    expect(manifest.ok()).toBe(true)
  })

  test("staff identity-switch requires live credentials", async ({ page }) => {
    const credentials = e2eStaffCredentials()
    test.skip(
      !credentials,
      "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD to run the staff PWA identity-switch in a browser.",
    )

    await page.goto("/login")
    await page.getByLabel("Email").fill(credentials!.email)
    await page.getByLabel("Password").fill(credentials!.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.goto("/me")
    await expect(page).not.toHaveURL(/\/login/)
    const worker = await page.evaluate(async () => Boolean(navigator.serviceWorker?.controller || (await navigator.serviceWorker?.ready)))
    expect(worker).toBeTruthy()
  })
})
