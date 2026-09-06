import { test, expect } from "@playwright/test"

test("login is usable from the keyboard on desktop and mobile", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").focus()
  await expect(page.getByLabel("Email")).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByLabel("Password")).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused()
})
