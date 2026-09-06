import { test, expect } from "@playwright/test"

test.describe("unauthenticated access", () => {
  test("sends protected admin routes to login and preserves the path", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
    expect(new URL(page.url()).searchParams.get("next")).toBe("/dashboard")
    await expect(page.getByRole("heading", { name: "Sign in to Rostera" })).toBeVisible()
  })

  test("sends /me to login", async ({ page }) => {
    await page.goto("/me")
    await expect(page).toHaveURL(/\/login/)
    expect(new URL(page.url()).searchParams.get("next")).toBe("/me")
  })

  test("login form is labelled and rejects invalid credentials without leaking provider errors", async ({
    page,
  }) => {
    await page.goto("/login")
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await page.getByLabel("Email").fill("nobody@example.invalid")
    await page.getByLabel("Password").fill("incorrect-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByText("Invalid email or password.")).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
