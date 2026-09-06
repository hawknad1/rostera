import { test, expect } from "@playwright/test"

test.describe("invitation acceptance", () => {
  test("missing token does not reveal organization data", async ({ page }) => {
    await page.goto("/invite/accept")
    await expect(page.getByRole("heading", { name: "Invitation" })).toBeVisible()
    await expect(page.getByText("This invitation link is missing a token.")).toBeVisible()
  })

  test("unknown token does not dump membership data", async ({ page }) => {
    await page.goto("/invite/accept?token=not-a-real-invitation-token")
    await expect(page).toHaveURL(/\/(invite\/accept|login)/)
    const body = await page.locator("body").innerText()
    expect(body.toLowerCase()).not.toContain("tokenhash")
    expect(body.toLowerCase()).not.toContain("supabase")
  })
})
