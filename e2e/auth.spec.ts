import { test, expect } from "@playwright/test"

const ADMIN_EMAIL = "admin@leadsolution.de"
const ADMIN_PASSWORD = "Test1234!"

test.describe("Authentifizierung", () => {
  test("Login-Seite wird geladen", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h1, h2, [class*='CardTitle']").first()).toBeVisible()
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible()
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible()
  })

  test("Login mit gültigen Zugangsdaten leitet zum Dashboard weiter", async ({ page }) => {
    await page.goto("/login")

    await page.locator("input[type='email'], input[name='email']").fill(ADMIN_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(ADMIN_PASSWORD)
    await page.locator("button[type='submit']").click()

    // Should redirect away from login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    })
    expect(page.url()).not.toContain("/login")
  })

  test("Login mit ungültigen Zugangsdaten zeigt Fehler", async ({ page }) => {
    await page.goto("/login")

    await page.locator("input[type='email'], input[name='email']").fill("falsch@example.com")
    await page.locator("input[type='password'], input[name='password']").fill("FalschesPasswort123!")
    await page.locator("button[type='submit']").click()

    // Should show an error message and remain on login
    await expect(page.locator("[role='alert'], .text-red-500, .text-destructive, [class*='error']").first()).toBeVisible({
      timeout: 10000,
    })
    expect(page.url()).toContain("/login")
  })

  test("Registrierungs-Seite wird geladen", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible()
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible()
  })

  test("Logout funktioniert", async ({ page }) => {
    // First login
    await page.goto("/login")
    await page.locator("input[type='email'], input[name='email']").fill(ADMIN_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(ADMIN_PASSWORD)
    await page.locator("button[type='submit']").click()
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    })

    // Find and click logout (could be in dropdown or direct button)
    const logoutButton = page.locator("button, a").filter({ hasText: /abmelden|logout/i })
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click()
    } else {
      // Try opening a user menu/dropdown first
      const userMenu = page.locator("[data-testid='user-menu'], button:has(svg[class*='user']), [aria-label*='menu'], [aria-label*='Menü']")
      if (await userMenu.count() > 0) {
        await userMenu.first().click()
        await page.locator("button, a, [role='menuitem']").filter({ hasText: /abmelden|logout/i }).first().click()
      }
    }

    // After logout, should redirect to login or landing
    await page.waitForURL((url) => url.pathname === "/" || url.pathname.includes("/login"), {
      timeout: 10000,
    })
  })
})
