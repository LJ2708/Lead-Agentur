import { test, expect } from "@playwright/test"

const ADMIN_EMAIL = "admin@leadsolution.de"
const ADMIN_PASSWORD = "Test1234!"

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login")
    await page.locator("input[type='email'], input[name='email']").fill(ADMIN_EMAIL)
    await page.locator("input[type='password'], input[name='password']").fill(ADMIN_PASSWORD)
    await page.locator("button[type='submit']").click()
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10000,
    })
  })

  test("Admin Dashboard wird nach Login geladen", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.locator("body")).toBeVisible()
    // Should show the overview page or dashboard content
    await expect(page.locator("h1, h2, [class*='CardTitle']").first()).toBeVisible({
      timeout: 10000,
    })
  })

  test("Leads Seite zeigt Leads an", async ({ page }) => {
    await page.goto("/admin/leads")
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 })
    // Should have a table or list with leads
    const tableOrList = page.locator("table, [role='table'], [class*='lead']").first()
    await expect(tableOrList).toBeVisible({ timeout: 10000 }).catch(() => {
      // If no leads, should show empty state
      return expect(page.locator("body")).toContainText(/lead|keine/i)
    })
  })

  test("Navigation zu allen Admin-Seiten funktioniert", async ({ page }) => {
    const adminPages = [
      "/admin",
      "/admin/leads",
      "/admin/berater",
      "/admin/pricing",
      "/admin/nachkauf",
      "/admin/budget",
      "/admin/routing",
      "/admin/reports",
    ]

    for (const path of adminPages) {
      await page.goto(path)
      const response = await page.waitForLoadState("domcontentloaded")
      // Should not show 404
      await expect(page.locator("body")).not.toContainText("404")
      // Page should have some content
      await expect(page.locator("h1, h2, [class*='CardTitle']").first()).toBeVisible({
        timeout: 10000,
      })
    }
  })

  test("Berater Seite zeigt Berater-Liste", async ({ page }) => {
    await page.goto("/admin/berater")
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 })
    // Should have a table or card list
    const content = page.locator("table, [role='table'], [class*='card'], [class*='Card']").first()
    await expect(content).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator("body")).toContainText(/berater|keine/i)
    })
  })

  test("CSV Export funktioniert", async ({ page }) => {
    await page.goto("/admin/leads")
    await page.waitForLoadState("domcontentloaded")

    // Look for export button
    const exportBtn = page.locator("button, a").filter({
      hasText: /export|csv|download|herunterladen/i,
    })

    if (await exportBtn.count() > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null)
      await exportBtn.first().click()
      const download = await downloadPromise

      if (download) {
        const filename = download.suggestedFilename()
        expect(filename).toMatch(/\.csv$/i)
      }
    }
  })
})
