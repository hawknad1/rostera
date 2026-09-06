import { test, expect } from "@playwright/test"

import { e2eAdminCredentials } from "./helpers/credentials"

test.describe("authenticated admin smoke", () => {
  test("signs in when E2E admin credentials are provided", async ({ page }) => {
    const credentials = e2eAdminCredentials()
    test.skip(!credentials, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated browser tests.")

    await page.goto("/login")
    await page.getByLabel("Email").fill(credentials!.email)
    await page.getByLabel("Password").fill(credentials!.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 })
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
