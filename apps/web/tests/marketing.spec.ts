import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = "C:/Users/chris/.gemini/antigravity/brain/85d7d321-3f94-42ee-8880-75a8ac97dc35";

test.describe("Clearspace Marketing & Download Page", () => {
  test("renders hero, loads real SHA-256 manifest, and has zero horizontal overflow across viewports", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-heading")).toContainText("Your resume shows who you had to be.");

    // Wait for release-manifest.json to populate SHA-256 and file sizes
    await expect(page.locator("#meta-win-nsis")).toContainText("MB");
    const shaText = (await page.locator("#active-artifact-sha256").textContent())?.trim() ?? "";
    expect(shaText).toMatch(/^[a-f0-9]{64}$/);

    const viewports = [
      { width: 1440, height: 900, name: "desktop-1440" },
      { width: 1280, height: 800, name: "desktop-1280" },
      { width: 1024, height: 768, name: "laptop-1024" },
      { width: 768, height: 1024, name: "tablet-768" },
      { width: 390, height: 844, name: "mobile-390" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Expected no horizontal overflow at ${vp.name}`).toBe(false);
    }

    // Capture Light Mode and Dark Mode hero screenshots at 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("#theme-toggle-btn").click(); // Light mode
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "marketing-page-light.png"),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "marketing-page-full.png"),
      fullPage: true,
    });

    await page.locator("#theme-toggle-btn").click(); // Dark mode
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "marketing-page-dark.png"),
      fullPage: false,
    });
  });

  test("triggers real browser downloads for NSIS .exe, MSI .msi, and Portable .exe and opens installation modal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#meta-win-nsis")).toContainText("MB");

    // 1. Test NSIS Setup .exe download + modal dialog
    const downloadPromiseNsis = page.waitForEvent("download");
    await page.locator("#btn-download-nsis").click();
    const downloadNsis = await downloadPromiseNsis;
    expect(downloadNsis.suggestedFilename()).toBe("Clearspace_0.1.0_x64-setup.exe");
    const nsisPath = await downloadNsis.path();
    expect(nsisPath).toBeTruthy();
    if (nsisPath) {
      const stat = fs.statSync(nsisPath);
      expect(stat.size).toBeGreaterThan(1_000_000); // > 1 MB real binary
    }

    // Verify native <dialog> opened with installation instructions
    const dialog = page.locator("#install-guide-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#dialog-ps-cmd")).toContainText(
      "Get-FileHash .\\Clearspace_0.1.0_x64-setup.exe -Algorithm SHA256"
    );

    // Screenshot the installation guide dialog
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "marketing-install-dialog.png"),
      fullPage: false,
    });

    await page.locator("#btn-dialog-done").click();
    await expect(dialog).toBeHidden();

    // 2. Test MSI .msi download
    const downloadPromiseMsi = page.waitForEvent("download");
    await page.locator("#btn-download-msi").click();
    const downloadMsi = await downloadPromiseMsi;
    expect(downloadMsi.suggestedFilename()).toBe("Clearspace_0.1.0_x64_en-US.msi");
    await page.locator("#btn-close-dialog").click();

    // 3. Test Portable .exe download
    const downloadPromisePortable = page.waitForEvent("download");
    await page.locator("#btn-download-portable").click();
    const downloadPortable = await downloadPromisePortable;
    expect(downloadPortable.suggestedFilename()).toBe("Clearspace_0.1.0_x64-portable.exe");
  });

  test("interactive 5-tab module showcase supports click and keyboard navigation and live PII scrubber works", async ({
    page,
  }) => {
    await page.goto("/");

    const tabMirror = page.locator("#tab-btn-mirror");
    const tabOnet = page.locator("#tab-btn-onet");
    const panelOnet = page.locator("#panel-onet");

    await tabMirror.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabOnet).toHaveAttribute("aria-selected", "true");
    await expect(panelOnet).toBeVisible();

    // Live PII scrubber preset switching
    await expect(page.locator("#scrubbed-prompt-output")).toContainText("[REDACTED_API_KEY]");
    await expect(page.locator("#scrubbed-prompt-output")).toContainText("[REDACTED_EMAIL]");
    await expect(page.locator("#scrubbed-prompt-output")).toContainText("[REDACTED_LOCAL_PATH]");

    await page.locator('[data-preset="contact"]').click();
    await expect(page.locator("#scrubbed-prompt-output")).toContainText("[REDACTED_SSN]");
    await expect(page.locator("#scrubbed-prompt-output")).toContainText("[REDACTED_PHONE]");
  });

  test("standalone Zero-Knowledge and How-We-Use-AI transparency pages render cleanly and link from navigation", async ({
    page,
  }) => {
    await page.goto("/");
    const zkLink = page.locator('.site-nav a[href="/zero-knowledge.html"]');
    await expect(zkLink).toBeVisible();
    await zkLink.click();

    await expect(page.locator("#zk-page-heading")).toContainText(
      "What “Zero-Knowledge” Means in Clearspace"
    );
    await expect(page.locator("body")).toContainText("100% On-Device SQLite Vault");

    await page.locator('a[href="/how-ai-works.html"]').first().click();
    await expect(page.locator("#ai-page-heading")).toContainText(
      "How We Use AI & Deterministic Behavioral Scoring"
    );
    await expect(page.locator("body")).toContainText("Zero Ego-Inflation Calibration");
  });
});
