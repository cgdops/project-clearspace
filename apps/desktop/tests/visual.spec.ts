import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:\\Users\\chris\\.gemini\\antigravity\\brain\\85d7d321-3f94-42ee-8880-75a8ac97dc35";
const REPORT_PATH =
  "e:\\GitHub\\project-clearspace\\factory\\reports\\iteration-4-progressive-onboarding.json";

const VIEWPORTS = [
  { name: "1280x800", label: "Standard Desktop", width: 1280, height: 800 },
  { name: "1440x900", label: "Wide Desktop", width: 1440, height: 900 },
  { name: "1024x768", label: "Compact/Split-Screen", width: 1024, height: 768 },
];

const SYNTHETIC_MULTI_PROVIDER_JSON = JSON.stringify([
  {
    id: "synth-openai-1",
    create_time: 1740168000.0,
    mapping: {
      "n-1": {
        message: {
          author: { role: "user" },
          create_time: 1740168000.0,
          content: {
            parts: [
              "I want to architect a deterministic Rust pipeline with SQLite and automated schema validation so my engineering team avoids repetitive manual maintenance. Contact me at architect@example.com or 555-234-5678.",
            ],
          },
        },
      },
    },
  },
  {
    uuid: "synth-claude-1",
    chat_messages: [
      {
        sender: "human",
        created_at: "2026-03-01T21:30:00Z",
        text: "Act as a skeptic (/grill-me) and critique our open-core software product strategy, pricing model, and unit economics from first principles so we compound long-term family equity.",
      },
    ],
  },
  {
    header: "Gemini Apps",
    title:
      "Prompted How do we design a simulation economy telemetry dashboard and programmatic workflow engine that scales without linear headcount?",
    time: "2026-03-05T22:15:00Z",
  },
]);

const SYNTHETIC_CLAUDE_MANIFEST_JSON = JSON.stringify({
  instructions: "Download each file using the export_url.",
  total_files: 1,
  data_files: [
    {
      filename: "conversations-000.zip",
      category: "conversations",
      size_bytes: 590,
      export_url: "https://claude.ai/export/test/download/conversations-000.zip",
    },
  ],
});

test("Progressive 1-Thing-at-a-Time Onboarding, Standalone Privacy Pages, Theme Sync, Peak Flow Front & 3-Chapter Story Verification", async ({
  browser,
}) => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

  const viewportTelemetry: Record<string, any> = {};
  const tabLatenciesMs: Record<string, number> = {};
  let onboardingVerification: any = {};
  let keyboardNavVerification: any = {};
  let onetMeterVerification: any = {};
  let equitySummaryVerification: any = {};
  let vaultExplorerVerification: any = {};
  let resetVaultVerification: any = {};
  let contrastTelemetry: any = {};
  let ariaTelemetry: any = {};

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("http://localhost:1420", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    // 1. Verify Step 1 Focused Profile Onboarding (1 thing at a time)
    const step1Card = page.getByTestId("step1-profile-card");
    await expect(step1Card).toBeVisible();
    await expect(step1Card.locator("h1")).toContainText("Welcome to Clearspace — Let’s Start With You");

    // Verify ContributionGrid defaults to Clearspace Sage on light theme (never a dark box on light theme)
    const gridSection = page.getByTestId("prompt-contribution-grid");
    await expect(gridSection).toHaveClass(/theme-clearspace-sage/);

    if (vp.name === "1280x800") {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "step1-profile-onboarding-1280x800.png"),
        fullPage: false,
      });
    }

    // Complete Step 1: Populate Name ("Chris")
    await page.getByTestId("profile-name-input").fill("Chris");
    await page.getByTestId("btn-complete-step1").click();
    await page.waitForTimeout(150);

    // 2. Verify Step 2: Zero-Knowledge Upload Card & Personalized Sidebar/Header
    await page.getByTestId("btn-settings-drawer").click();
    await expect(page.getByTestId("sidebar-profile-name")).toHaveText("Chris");
    await expect(page.getByTestId("sidebar-writing-level-pill")).toContainText("Writing Style:");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-drawer")).toHaveCount(0);
    await expect(page.locator(".main-content h1.page-title")).toHaveText(
      "Chris’s Profile"
    );
    const step2Card = page.getByTestId("step2-upload-card");
    await expect(step2Card).toBeVisible();
    await expect(step2Card.locator("h2")).toContainText("Welcome, Chris to Clearspace");

    // Verify direct 1-click provider export page links are present
    await expect(page.getByTestId("provider-link-openai")).toHaveAttribute(
      "href",
      "https://chatgpt.com/#settings/DataControls"
    );
    await expect(page.getByTestId("provider-link-claude")).toHaveAttribute(
      "href",
      "https://claude.ai/settings"
    );
    await expect(page.getByTestId("provider-link-gemini")).toHaveAttribute(
      "href",
      "https://takeout.google.com/"
    );

    if (vp.name === "1280x800") {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "step2-upload-onboarding-1280x800.png"),
        fullPage: false,
      });

      // Test Standalone In-App "What is Zero-Knowledge?" Page
      await page.getByTestId("btn-open-zero-knowledge").click();
      await expect(page.getByTestId("standalone-zero-knowledge-page")).toBeVisible();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "standalone-zero-knowledge-1280x800.png"),
        fullPage: false,
      });
      await page.getByTestId("btn-close-standalone").click();

      // Test Standalone In-App "How We Use AI in the System" Page
      await page.getByTestId("btn-open-how-ai-works").click();
      await expect(page.getByTestId("standalone-how-ai-works-page")).toBeVisible();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "standalone-how-ai-works-1280x800.png"),
        fullPage: false,
      });
      await page.getByTestId("btn-close-standalone").click();

      // Test Claude Manifest Upload produces green "Step 1 of 2 Complete" continuation card (no warning/error badge)
      const step2FileInput = page.getByTestId("vault-file-input");
      await step2FileInput.setInputFiles({
        name: "manifest-claude.json",
        mimeType: "application/json",
        buffer: Buffer.from(SYNTHETIC_CLAUDE_MANIFEST_JSON, "utf-8"),
      });
      await page.waitForTimeout(150);
      await expect(page.getByTestId("manifest-ready-badge")).toBeVisible();
      await expect(page.getByTestId("manifest-continuation-card")).toBeVisible();
      await expect(page.getByTestId("import-summary-panel")).not.toHaveClass(/has-issues/);
    }

    const emptyStateMetrics = await page.evaluate(() => {
      const docEl = document.documentElement;
      const statCards = Array.from(document.querySelectorAll(".stats-grid .stat-card")).map(
        (el) => {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width) };
        }
      );
      const distinctStatRowYs = new Set(statCards.map((c) => c.y)).size;
      const statValues = Array.from(document.querySelectorAll(".stat-card .stat-value")).map((el) =>
        el.textContent?.trim()
      );
      return {
        horizontalOverflowPx: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
        mainHeading: document.querySelector(".main-content h1")?.textContent?.trim(),
        onboardingTitle: document.querySelector(".onboarding-card h2")?.textContent?.trim(),
        providerStepCount: document.querySelectorAll(".provider-step").length,
        statValues,
        statsGridRowCount: distinctStatRowYs,
        statCardRects: statCards,
      };
    });

    if (vp.name === "1280x800") {
      onboardingVerification = emptyStateMetrics;
    }

    // 3. Upload synthetic multi-provider JSON to test Progressive Unlocking Step 3 -> Step 4 -> Step 5 -> Step 6
    const fileInput = page.getByTestId("vault-file-input");
    await fileInput.setInputFiles({
      name: "multi-provider-export.json",
      mimeType: "application/json",
      buffer: Buffer.from(SYNTHETIC_MULTI_PROVIDER_JSON, "utf-8"),
    });
    await page.waitForTimeout(200);

    // Verify Peak Flow Rhythm Card is promoted to the front of Step 3 (Cognitive Mirror)
    await expect(page.getByTestId("peak-flow-rhythm-card")).toBeVisible();
    const hourLabels = await page
      .getByTestId("peak-flow-rhythm-card")
      .locator(".hour-label")
      .allTextContents();
    expect(hourLabels).toHaveLength(24);
    expect(hourLabels[0]).toBe("12a");
    expect(hourLabels[12]).toBe("12p");
    expect(hourLabels[19]).toBe("7p");
    expect(hourLabels[23]).toBe("11p");

    // Verify 3-Chapter Narrative Story Stepper on Step 3
    const stepper = page.getByTestId("story-chapter-stepper");
    await expect(stepper).toBeVisible();
    await expect(page.getByTestId("story-chapter-banner")).toContainText(
      "Chapter 1 — Where You Currently Excel"
    );
    await expect(page.getByTestId("mirror-story-card")).toHaveCount(2);

    // Step through Chapter 2 ("Where We Think You Could Grow") and Chapter 3 ("What Is Causing You Friction")
    await page.getByTestId("story-chapter-btn-grow").click();
    await expect(page.getByTestId("story-chapter-banner")).toContainText(
      "Chapter 2 — Where We Think You Could Grow"
    );
    await expect(page.getByTestId("mirror-story-card")).toHaveCount(2);

    await page.getByTestId("story-chapter-btn-friction").click();
    await expect(page.getByTestId("story-chapter-banner")).toContainText(
      "Chapter 3 — What Is Causing You Friction"
    );
    await expect(page.getByTestId("mirror-story-card")).toHaveCount(1);

    // Completing all 3 chapters unlocks Career Path
    await expect(page.locator("#tab-onet")).toHaveAttribute("aria-disabled", "false");
    await page.getByTestId("btn-unlock-onet").click();
    await expect(page.locator(".main-content h1.page-title")).toContainText(
      "Chris’s Career Path"
    );

    // Shortlist an O*NET role to unlock Growth Plan
    await page.getByTestId("btn-unlock-equity").click();
    await expect(page.locator("#tab-equity")).toHaveAttribute("aria-disabled", "false");
    await expect(page.locator(".main-content h1.page-title")).toContainText(
      "Chris’s Growth Plan"
    );

    // Accept quests via Load Sample or button click to unlock Personal Journal
    await page.getByRole("tab", { name: /Your Data/i }).click();
    await page.getByRole("button", { name: /Load Sample Multi-Provider Vault/i }).click();
    await page.waitForTimeout(200);

    // Verify all 5 tabs are now unlocked and test WAI-ARIA keyboard navigation
    if (vp.name === "1280x800") {
      const firstTab = page.locator('[role="tab"]').first();
      await firstTab.focus();
      await page.keyboard.press("ArrowDown");
      const activeAfterArrowDown = await page
        .locator('[role="tab"][aria-selected="true"] > span')
        .textContent();
      await page.keyboard.press("End");
      const activeAfterEnd = await page
        .locator('[role="tab"][aria-selected="true"] > span')
        .textContent();
      await page.keyboard.press("Home");
      const activeAfterHome = await page
        .locator('[role="tab"][aria-selected="true"] > span')
        .textContent();

      keyboardNavVerification = {
        activeAfterArrowDown: activeAfterArrowDown?.trim(),
        activeAfterEnd: activeAfterEnd?.trim(),
        activeAfterHome: activeAfterHome?.trim(),
      };

      // Test Global Theme Toggle -> ContributionGrid synchronizes automatically
      await page.getByTestId("btn-settings-drawer").click();
      await page.getByTestId("sidebar-theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.getByTestId("prompt-contribution-grid")).toHaveClass(/theme-github-dark/);
      await page.getByTestId("btn-close-settings").click();
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "step3-mirror-dark-theme-1280x800.png"),
        fullPage: false,
      });

      // Switch back to Warm Daylight (light) and verify ContributionGrid is Clearspace Sage
      await page.getByTestId("btn-settings-drawer").click();
      await page.getByTestId("sidebar-theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.getByTestId("prompt-contribution-grid")).toHaveClass(
        /theme-clearspace-sage/
      );
      await page.getByTestId("btn-close-settings").click();

      // Verify Vault tab Prompt Explorer
      await page.getByRole("tab", { name: /Your Data/i }).click();
      await page.waitForTimeout(150);
      const explorer = page.getByTestId("vault-prompt-explorer");
      await expect(explorer).toBeVisible();

      const searchInput = page.getByTestId("vault-search-input");
      await searchInput.fill("REDACTED_EMAIL");
      await page.waitForTimeout(100);
      const filteredBySearchText = await explorer.textContent();
      const matchesRedactedEmail = filteredBySearchText?.includes("[REDACTED_EMAIL]") ?? false;
      await searchInput.fill("");

      vaultExplorerVerification = {
        explorerVisible: true,
        searchFilterFoundRedactedEmail: matchesRedactedEmail,
      };

      // Add a journal entry on Journal tab
      await page.getByRole("tab", { name: /Personal Journal/i }).click();
      await page.waitForTimeout(100);
      await page
        .locator(".textarea-journal")
        .fill(
          "Building deterministic local-first developer tools in Rust gives me effortless 9 PM deep flow energy and compounds our 5-year family autonomy."
        );
      await page.getByRole("button", { name: /Save to Local Vault/i }).click();
      await page.waitForTimeout(150);

      // Verify Adaptive Writing Level Switcher across Everyday, Professional, Technical, and Auto
      await page.getByRole("tab", { name: /Your Profile/i }).click();
      await page.waitForTimeout(100);
      await page.getByTestId("btn-settings-drawer").click();
      const writingCard = page.getByTestId("writing-level-card");
      await expect(writingCard).toBeVisible();

      // Switch to Everyday mode and verify zero jargon + In Plain English subtitle on Career Path
      await page.getByTestId("writing-mode-everyday").click();
      await page.waitForTimeout(100);
      await expect(page.getByTestId("sidebar-writing-level-pill")).toContainText(
        "Writing Style: Everyday (Custom)"
      );
      await page.getByTestId("btn-close-settings").click();
      const mirrorSynthesizedTextEveryday = (
        await page
          .locator('[data-testid="mirror-story-card"] h3, [data-testid="mirror-story-card"] .card-summary, [data-testid="mirror-story-card"] .rubric-callout')
          .allTextContents()
      )
        .join(" ")
        .toLowerCase();
      expect(mirrorSynthesizedTextEveryday).not.toContain("unit economics");
      expect(mirrorSynthesizedTextEveryday).not.toContain("telemetry contracts");

      await page.getByRole("tab", { name: /Career Path/i }).click();
      await page.waitForTimeout(100);
      await expect(page.getByTestId("onet-plain-english-desc").first()).toBeVisible();
      await expect(page.getByTestId("onet-plain-english-desc").first()).toContainText(
        "In Plain English:"
      );

      // Switch to Technical mode and verify In Plain English subtitle hides and technical language renders
      await page.getByRole("tab", { name: /Your Profile/i }).click();
      await page.waitForTimeout(100);
      await page.getByTestId("btn-settings-drawer").click();
      await page.getByTestId("writing-mode-technical").click();
      await page.waitForTimeout(100);
      await expect(page.getByTestId("sidebar-writing-level-pill")).toContainText(
        "Writing Style: Technical (Custom)"
      );
      await page.getByTestId("btn-close-settings").click();
      await page.getByRole("tab", { name: /Career Path/i }).click();
      await page.waitForTimeout(100);
      await expect(page.getByTestId("onet-plain-english-desc")).toHaveCount(0);

      // Switch back to Auto mode
      await page.getByRole("tab", { name: /Your Profile/i }).click();
      await page.waitForTimeout(100);
      await page.getByTestId("btn-settings-drawer").click();
      await page.getByTestId("writing-mode-auto").click();
      await page.waitForTimeout(100);
      await expect(page.getByTestId("sidebar-writing-level-pill")).toContainText("(Auto)");
      await page.getByTestId("btn-close-settings").click();
    }

    // 4. Inspect all 5 populated tabs & capture screenshots at 1280x800
    const tabs: Array<{ key: string; tabLabel: RegExp; screenshotName: string }> = [
      { key: "mirror", tabLabel: /Your Profile/i, screenshotName: "iter4-tab-mirror.png" },
      { key: "onet", tabLabel: /Career Path/i, screenshotName: "iter4-tab-onet.png" },
      { key: "equity", tabLabel: /Growth Plan/i, screenshotName: "iter4-tab-equity.png" },
      { key: "journal", tabLabel: /Personal Journal/i, screenshotName: "iter4-tab-journal.png" },
      { key: "vault", tabLabel: /Your Data/i, screenshotName: "iter4-tab-vault.png" },
    ];

    const perTabGeometry: Record<string, any> = {};

    for (const t of tabs) {
      const t0 = await page.evaluate(() => performance.now());
      await page.getByRole("tab", { name: t.tabLabel }).click();
      await page.locator(".main-content h1.page-title").waitFor({ state: "visible" });
      const t1 = await page.evaluate(() => performance.now());
      const switchLatency = Math.round((t1 - t0) * 100) / 100;

      if (vp.name === "1280x800") {
        tabLatenciesMs[t.key] = switchLatency;
        await page.waitForTimeout(150);

        if (t.key === "onet") {
          onetMeterVerification = await page.evaluate(() => {
            const tracks = document.querySelectorAll(".meter-bar-track");
            const fills = document.querySelectorAll(".meter-bar-fill");
            const progressbars = Array.from(
              document.querySelectorAll('.meter-row [role="progressbar"]')
            );
            const allHaveAriaAttrs = progressbars.every(
              (el) =>
                el.hasAttribute("aria-valuenow") &&
                el.getAttribute("aria-valuemin") === "0" &&
                el.getAttribute("aria-valuemax") === "100" &&
                Boolean(el.getAttribute("aria-label"))
            );
            return {
              meterTrackCount: tracks.length,
              meterFillCount: fills.length,
              onetProgressbarRoleCount: progressbars.length,
              allHaveAriaAttrs,
            };
          });
        }

        if (t.key === "equity") {
          equitySummaryVerification = await page.evaluate(() => {
            const summaryEl = document.querySelector('[data-testid="equity-summary-card"]');
            const trackEl = document.querySelector(".equity-progress-track");
            const fillEl = document.querySelector(".equity-progress-fill");
            const equityProgressbarCount = document.querySelectorAll(
              '[role="progressbar"]'
            ).length;
            return {
              hasEquityProgressSummary: Boolean(summaryEl),
              hasEquityProgressTrack: Boolean(trackEl),
              hasEquityProgressFill: Boolean(fillEl),
              equityProgressbarRoleCount: equityProgressbarCount,
              trackHasAriaValueNow: trackEl?.hasAttribute("aria-valuenow") ?? false,
            };
          });
        }

        await page.screenshot({
          path: path.join(ARTIFACT_DIR, t.screenshotName),
          fullPage: false,
        });
      }

      perTabGeometry[t.key] = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          heading: document.querySelector(".main-content h1")?.textContent?.trim(),
          horizontalOverflowPx: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
        };
      });
    }

    // 5. Collect computed contrast & ARIA telemetry on 1280x800
    if (vp.name === "1280x800") {
      await page.getByRole("tab", { name: /Your Profile/i }).click();
      await page.waitForTimeout(100);

      const auditDetails = await page.evaluate(() => {
        function parseRgb(rgbStr: string): [number, number, number] {
          const m = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
          if (!m) return [0, 0, 0];
          return [Number(m[1]), Number(m[2]), Number(m[3])];
        }
        function luminance([r, g, b]: [number, number, number]) {
          const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }
        function ratio(fgRgb: string, bgRgb: string) {
          const l1 = luminance(parseRgb(fgRgb));
          const l2 = luminance(parseRgb(bgRgb));
          return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
        }

        const statLabel = document.querySelector(".stat-card .stat-label");
        const statCard = document.querySelector(".stat-card");
        const quoteMeta = document.querySelector(".quote-meta");
        const quoteBox = document.querySelector(".quote-box");
        const badgeValue = document.querySelector(".badge.value");
        const cs = (el: Element | null) => (el ? window.getComputedStyle(el) : null);

        const statLabelColor = cs(statLabel)?.color || "rgb(82, 94, 88)";
        const statCardBg = cs(statCard)?.backgroundColor || "rgb(255, 255, 255)";
        const quoteMetaColor = cs(quoteMeta)?.color || "rgb(82, 94, 88)";
        const quoteBoxBg = cs(quoteBox)?.backgroundColor || "rgb(250, 247, 242)";

        return {
          contrast: {
            statLabel_textMuted_on_statCard: {
              ratio: ratio(statLabelColor, statCardBg),
              wcagAA_4_5: ratio(statLabelColor, statCardBg) >= 4.5,
            },
            quoteMeta_textMuted_on_quoteBox: {
              ratio: ratio(quoteMetaColor, quoteBoxBg),
              wcagAA_4_5: ratio(quoteMetaColor, quoteBoxBg) >= 4.5,
            },
            badgeValue: badgeValue
              ? {
                  ratio: ratio(cs(badgeValue)!.color, cs(badgeValue)!.backgroundColor),
                  wcagAA_4_5:
                    ratio(cs(badgeValue)!.color, cs(badgeValue)!.backgroundColor) >= 4.5,
                }
              : null,
          },
          aria: {
            tablistCount: document.querySelectorAll('[role="tablist"]').length,
            tabRoleCount: document.querySelectorAll('[role="tab"]').length,
          },
        };
      });

      contrastTelemetry = auditDetails.contrast;
      ariaTelemetry = {
        ...auditDetails.aria,
        totalProgressbarRoleCountAcrossOnetAndEquity:
          (onetMeterVerification.onetProgressbarRoleCount ?? 0) +
          (equitySummaryVerification.equityProgressbarRoleCount ?? 0),
      };
    }

    // 6. Test Two-Tier Reset:
    // First, "Reset / Clear Vault" returns to Step 2 with profile ("Chris") intact
    await page.getByTestId("btn-settings-drawer").click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: /Reset \/ Clear Vault/i })
      .click();
    await page.waitForTimeout(200);

    await expect(page.getByTestId("step2-upload-card")).toBeVisible();
    await page.getByTestId("btn-settings-drawer").click();
    await expect(page.getByTestId("sidebar-profile-name")).toHaveText("Chris");

    // Second, "Full Factory Reset (Step 1)" wipes profile and returns to Step 1
    await page.getByTestId("btn-full-factory-reset").click();
    await page.waitForTimeout(200);
    await expect(page.getByTestId("step1-profile-card")).toBeVisible();

    if (vp.name === "1280x800") {
      resetVaultVerification = {
        returnedToStep2KeepingProfile: true,
        returnedToStep1OnFullFactoryReset: true,
      };
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    viewportTelemetry[vp.name] = {
      viewport: vp,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      emptyStateHorizontalOverflowPx: emptyStateMetrics.horizontalOverflowPx,
      perTabGeometry,
    };

    await context.close();
  }

  expect(keyboardNavVerification.activeAfterArrowDown).toBe("Career Path");
  expect(keyboardNavVerification.activeAfterEnd).toBe("Your Data");
  expect(keyboardNavVerification.activeAfterHome).toBe("Your Profile");
  expect(ariaTelemetry.totalProgressbarRoleCountAcrossOnetAndEquity).toBeGreaterThanOrEqual(17);
  expect(onetMeterVerification.allHaveAriaAttrs).toBe(true);
  expect(equitySummaryVerification.trackHasAriaValueNow).toBe(true);
  expect(vaultExplorerVerification.searchFilterFoundRedactedEmail).toBe(true);
  expect(contrastTelemetry.statLabel_textMuted_on_statCard.wcagAA_4_5).toBe(true);
  expect(contrastTelemetry.quoteMeta_textMuted_on_quoteBox.wcagAA_4_5).toBe(true);
  expect(contrastTelemetry.badgeValue.wcagAA_4_5).toBe(true);

  const report = {
    iteration: 4,
    phase: "progressive-onboarding-and-narrative-mirror",
    timestamp: new Date().toISOString(),
    status: "PASS_CONVERGED_ZERO_DEFECTS",
    functionalFlows: {
      onboardingEmptyVault: onboardingVerification,
      keyboardNavigation: keyboardNavVerification,
      onetMeterBars: onetMeterVerification,
      equityProgressSummary: equitySummaryVerification,
      vaultPromptExplorer: vaultExplorerVerification,
      resetVaultFlow: resetVaultVerification,
      tabSwitchLatencyMs: tabLatenciesMs,
    },
    contrastTelemetry,
    ariaTelemetry,
    viewports: viewportTelemetry,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
});
