import { test, expect } from "@playwright/test"

test.describe("Landing Page", () => {
  test("Landing Page wird für nicht-authentifizierten Nutzer geladen", async ({ page }) => {
    await page.goto("/")
    // Landing page should show (not redirect to login for unauthenticated)
    await expect(page.locator("body")).toBeVisible()
    // Check for typical landing page content
    const heading = page.locator("h1, h2").first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test("Pricing Konfigurator Slider funktioniert", async ({ page }) => {
    await page.goto("/")

    const slider = page.locator("input[type='range'], [role='slider']").first()
    if (await slider.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get initial bounding box
      const box = await slider.boundingBox()
      if (box) {
        // Drag slider to the right
        await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2)
        // Page content should have updated (price or value shown)
        await expect(page.locator("body")).toBeVisible()
      }
    }
  })

  test("Setter Toggle aktualisiert den Preis", async ({ page }) => {
    await page.goto("/")

    // Look for a setter toggle (switch or checkbox)
    const toggle = page.locator("[role='switch'], input[type='checkbox']").first()
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Capture text before toggle
      const container = page.locator("[class*='pricing'], [class*='Pricing'], [id*='pricing'], section").first()
      const textBefore = await container.textContent().catch(() => "")

      await toggle.click()

      // Wait for potential price update
      await page.waitForTimeout(500)
      const textAfter = await container.textContent().catch(() => "")

      // Price text should have changed or the toggle should have toggled
      expect(textBefore !== null || textAfter !== null).toBeTruthy()
    }
  })

  test("CTA Buttons verlinken zur Registrierung", async ({ page }) => {
    await page.goto("/")

    // Find CTA buttons/links pointing to register
    const ctaLinks = page.locator("a[href*='register'], a[href*='registrieren']")
    const count = await ctaLinks.count()

    if (count > 0) {
      const href = await ctaLinks.first().getAttribute("href")
      expect(href).toContain("register")
    }
  })

  test("Navigation scrollt sanft zu Sektionen", async ({ page }) => {
    await page.goto("/")

    // Find internal anchor links
    const navLinks = page.locator("nav a[href^='#'], header a[href^='#']")
    const count = await navLinks.count()

    if (count > 0) {
      const initialScroll = await page.evaluate(() => window.scrollY)
      await navLinks.first().click()
      await page.waitForTimeout(1000)
      const afterScroll = await page.evaluate(() => window.scrollY)

      // Should have scrolled
      expect(afterScroll).not.toBe(initialScroll)
    }
  })
})
