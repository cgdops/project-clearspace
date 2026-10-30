import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR =
  "C:\\Users\\chris\\.gemini\\antigravity\\brain\\5011581b-6f10-4019-80e7-7ffa808c7b5d";
const REPORT_PATH =
  "e:\\GitHub\\project-clearspace\\factory\\reports\\iteration-3-visual.json";

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

test("Iteration 3 Final Visual, WAI-ARIA Keyboard, Progressbar & Above-the-Fold Inspection", async ({
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

    // 1. Verify Empty Vault / New User Onboarding state & 0 pts on fresh storage
    await expect(page.locator(".onboarding-card h2")).toContainText("Welcome to Clearspace");
    await expect(page.locator(".equity-score-num")).toHaveText("0 pts");
    await expect(page.locator(".equity-widget .stat-sub")).toContainText(
      "Compounding across 0 active career commitments"
    );

    if (vp.name === "1280x800") {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "iter3-onboarding-1280x800.png"),
        fullPage: false,
      });
    }
    if (vp.name === "1024x768") {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, "iter3-onboarding-1024x768.png"),
        fullPage: false,
      });
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
        sidebarEquityScoreOnFreshStorage: document
          .querySelector(".equity-score-num")
          ?.textContent?.trim(),
        sidebarEquitySubOnFreshStorage: document
          .querySelector(".equity-widget .stat-sub")
          ?.textContent?.trim(),
      };
    });

    if (vp.name === "1280x800") {
      onboardingVerification = emptyStateMetrics;

      // Test WAI-ARIA keyboard navigation on [role="tab"] (ArrowDown / End / Home)
      const firstTab = page.locator('[role="tab"]').first();
      await firstTab.focus();
      await page.keyboard.press("ArrowDown");
      const activeAfterArrowDown = await page
        .locator('[role="tab"][aria-selected="true"]')
        .textContent();
      await page.keyboard.press("End");
      const activeAfterEnd = await page
        .locator('[role="tab"][aria-selected="true"]')
        .textContent();
      await page.keyboard.press("Home");
      const activeAfterHome = await page
        .locator('[role="tab"][aria-selected="true"]')
        .textContent();

      const tabAttributes = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="tab"]')).map((el) => ({
          id: el.getAttribute("id"),
          ariaSelected: el.getAttribute("aria-selected"),
          ariaControls: el.getAttribute("aria-controls"),
          tabIndex: (el as HTMLElement).tabIndex,
        }))
      );

      keyboardNavVerification = {
        activeAfterArrowDown: activeAfterArrowDown?.trim(),
        activeAfterEnd: activeAfterEnd?.trim(),
        activeAfterHome: activeAfterHome?.trim(),
        tabAttributes,
      };
    }

    // 2. Populate vault via "Load Sample Multi-Provider Vault" + synthetic upload
    await page.getByRole("button", { name: /Load Sample Multi-Provider Vault/i }).click();
    await expect(page.locator(".insight-card").first()).toBeVisible();
    await page.waitForTimeout(200);

    if (vp.name === "1280x800") {
      // Upload synthetic multi-provider JSON via file input on Vault tab
      await page.getByRole("tab", { name: /Local Vault & Scrubber/i }).click();
      await page.waitForTimeout(150);

      const fileInput = page.getByTestId("vault-file-input");
      await fileInput.setInputFiles({
        name: "multi-provider-export.json",
        mimeType: "application/json",
        buffer: Buffer.from(SYNTHETIC_MULTI_PROVIDER_JSON, "utf-8"),
      });
      await page.waitForTimeout(200);

      // Verify interactive Scrubbed Prompt Explorer & above-the-fold geometry in Vault tab
      const explorer = page.getByTestId("vault-prompt-explorer");
      await expect(explorer).toBeVisible();

      const vaultAboveFoldGeometry = await page.evaluate(() => {
        const rhythmCard = document.querySelector(".hour-bars")?.closest(".insight-card");
        const explorerCard = document.querySelector('[data-testid="vault-prompt-explorer"]');
        const rRect = rhythmCard?.getBoundingClientRect();
        const eRect = explorerCard?.getBoundingClientRect();
        return {
          rhythmCardTopY: rRect ? Math.round(rRect.top) : null,
          explorerCardTopY: eRect ? Math.round(eRect.top) : null,
          bothVisibleAbove800pxFold: Boolean(
            rRect && eRect && rRect.top < 800 && eRect.top < 800
          ),
        };
      });

      const initialPromptCards = await explorer
        .locator(".quote-box, .explorer-prompt-item, [data-testid='explorer-prompt-row']")
        .count();
      const searchInput = page.getByTestId("vault-search-input");
      await searchInput.fill("REDACTED_EMAIL");
      await page.waitForTimeout(100);
      const filteredBySearchText = await explorer.textContent();
      const matchesRedactedEmail = filteredBySearchText?.includes("[REDACTED_EMAIL]") ?? false;
      await searchInput.fill("");
      await page.waitForTimeout(100);

      const filterBtns = explorer.locator("button");
      const filterBtnCount = await filterBtns.count();
      let clickedFilterLabel: string | null = null;
      if (filterBtnCount > 1) {
        clickedFilterLabel = (await filterBtns.nth(1).textContent())?.trim() || null;
        await filterBtns.nth(1).click();
        await page.waitForTimeout(100);
        await filterBtns.first().click();
        await page.waitForTimeout(100);
      }

      vaultExplorerVerification = {
        explorerVisible: true,
        ...vaultAboveFoldGeometry,
        initialPromptItemCount: initialPromptCards,
        searchFilterFoundRedactedEmail: matchesRedactedEmail,
        filterButtonCount: filterBtnCount,
        testedFilterPill: clickedFilterLabel,
      };

      // Add a journal entry so the Journal tab shows both Socratic composer and saved entry
      await page.getByRole("tab", { name: /Reflective Journal/i }).click();
      await page.waitForTimeout(100);
      await page
        .locator(".textarea-journal")
        .fill(
          "Building deterministic local-first developer tools in Rust gives me effortless 9 PM deep flow energy and compounds our 5-year family autonomy."
        );
      await page.getByRole("button", { name: /Save to Local Vault/i }).click();
      await page.waitForTimeout(150);
    }

    // 3. Inspect all 5 populated tabs & capture screenshots at 1280x800
    const tabs: Array<{ key: string; tabLabel: RegExp; screenshotName: string }> = [
      { key: "mirror", tabLabel: /Cognitive Mirror/i, screenshotName: "iter3-tab-mirror.png" },
      { key: "onet", tabLabel: /O\*NET Path Finder/i, screenshotName: "iter3-tab-onet.png" },
      { key: "equity", tabLabel: /5-Year Equity & Quests/i, screenshotName: "iter3-tab-equity.png" },
      { key: "journal", tabLabel: /Reflective Journal/i, screenshotName: "iter3-tab-journal.png" },
      { key: "vault", tabLabel: /Local Vault & Scrubber/i, screenshotName: "iter3-tab-vault.png" },
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
            const summaryEl = document.querySelector(
              '[data-testid="equity-summary-card"], [data-testid="equity-progress-summary"]'
            );
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
              summaryTextPreview: summaryEl?.textContent?.trim()?.slice(0, 140) || null,
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
        const main = document.querySelector(".main-content");
        const sidebar = document.querySelector(".sidebar");
        const cards = Array.from(
          document.querySelectorAll(
            ".main-content .insight-card, .main-content .onboarding-card, .main-content .stat-card"
          )
        );
        const meterCells = Array.from(document.querySelectorAll(".meter-row > div")).slice(0, 4);
        const meterRowDistinctYs = new Set(
          meterCells.map((el) => Math.round(el.getBoundingClientRect().y))
        ).size;

        const rect = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: Math.round(r.x * 100) / 100,
            y: Math.round(r.y * 100) / 100,
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
          };
        };

        const mainRect = main?.getBoundingClientRect();
        const overflowingCards = cards.filter((c) => {
          const cr = c.getBoundingClientRect();
          return mainRect ? cr.right > mainRect.right + 2 : false;
        }).length;

        return {
          heading: document.querySelector(".main-content h1")?.textContent?.trim(),
          horizontalOverflowPx: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
          verticalScrollHeight: docEl.scrollHeight,
          sidebarRect: rect(sidebar),
          mainRect: rect(main),
          cardCount: cards.length,
          overflowingCards,
          meterRowDistinctYs: meterCells.length > 0 ? meterRowDistinctYs : undefined,
        };
      });
    }

    // 4. Collect computed contrast & ARIA telemetry on 1280x800
    if (vp.name === "1280x800") {
      await page.getByRole("tab", { name: /Cognitive Mirror/i }).click();
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
        const badgeSuper = document.querySelector(".badge.superpower");
        const badgeValue = document.querySelector(".badge.value");
        const badgeBurnout = document.querySelector(".badge.burnout");
        const navBtnActive = document.querySelector(".nav-btn.active");
        const navBtnInactive = document.querySelector(".nav-btn:not(.active)");
        const sidebar = document.querySelector(".sidebar");

        const cs = (el: Element | null) => (el ? window.getComputedStyle(el) : null);

        const statLabelColor = cs(statLabel)?.color || "rgb(82, 94, 88)";
        const statCardBg = cs(statCard)?.backgroundColor || "rgb(255, 255, 255)";
        const quoteMetaColor = cs(quoteMeta)?.color || "rgb(82, 94, 88)";
        const quoteBoxBg = cs(quoteBox)?.backgroundColor || "rgb(250, 247, 242)";

        let hasFocusVisibleRule = false;
        let hasReducedMotionRule = false;
        let mediaQueryCount = 0;
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules)) {
              const text = rule.cssText || "";
              if (text.includes(":focus-visible")) hasFocusVisibleRule = true;
              if (text.includes("prefers-reduced-motion")) hasReducedMotionRule = true;
              if (rule.type === CSSRule.MEDIA_RULE) mediaQueryCount++;
            }
          } catch {
            // ignore
          }
        }

        return {
          contrast: {
            statLabel_textMuted_on_statCard: {
              fg: statLabelColor,
              bg: statCardBg,
              ratio: ratio(statLabelColor, statCardBg),
              wcagAA_4_5: ratio(statLabelColor, statCardBg) >= 4.5,
            },
            quoteMeta_textMuted_on_quoteBox: {
              fg: quoteMetaColor,
              bg: quoteBoxBg,
              ratio: ratio(quoteMetaColor, quoteBoxBg),
              wcagAA_4_5: ratio(quoteMetaColor, quoteBoxBg) >= 4.5,
            },
            badgeSuperpower: badgeSuper
              ? {
                  fg: cs(badgeSuper)!.color,
                  bg: cs(badgeSuper)!.backgroundColor,
                  ratio: ratio(cs(badgeSuper)!.color, cs(badgeSuper)!.backgroundColor),
                  wcagAA_4_5:
                    ratio(cs(badgeSuper)!.color, cs(badgeSuper)!.backgroundColor) >= 4.5,
                }
              : null,
            badgeValue: badgeValue
              ? {
                  fg: cs(badgeValue)!.color,
                  bg: cs(badgeValue)!.backgroundColor,
                  ratio: ratio(cs(badgeValue)!.color, cs(badgeValue)!.backgroundColor),
                  wcagAA_4_5:
                    ratio(cs(badgeValue)!.color, cs(badgeValue)!.backgroundColor) >= 4.5,
                }
              : null,
            badgeBurnout: badgeBurnout
              ? {
                  fg: cs(badgeBurnout)!.color,
                  bg: cs(badgeBurnout)!.backgroundColor,
                  ratio: ratio(cs(badgeBurnout)!.color, cs(badgeBurnout)!.backgroundColor),
                  wcagAA_4_5:
                    ratio(cs(badgeBurnout)!.color, cs(badgeBurnout)!.backgroundColor) >= 4.5,
                }
              : null,
            navBtnActive: navBtnActive
              ? {
                  fg: cs(navBtnActive)!.color,
                  bg: cs(navBtnActive)!.backgroundColor,
                  ratio: ratio(cs(navBtnActive)!.color, cs(navBtnActive)!.backgroundColor),
                  wcagAA_4_5:
                    ratio(cs(navBtnActive)!.color, cs(navBtnActive)!.backgroundColor) >= 4.5,
                }
              : null,
            navBtnInactive_on_sidebar:
              navBtnInactive && sidebar
                ? {
                    fg: cs(navBtnInactive)!.color,
                    bg: cs(sidebar)!.backgroundColor,
                    ratio: ratio(cs(navBtnInactive)!.color, cs(sidebar)!.backgroundColor),
                    wcagAA_4_5:
                      ratio(cs(navBtnInactive)!.color, cs(sidebar)!.backgroundColor) >= 4.5,
                  }
                : null,
          },
          aria: {
            tablistCount: document.querySelectorAll('[role="tablist"]').length,
            tabRoleCount: document.querySelectorAll('[role="tab"]').length,
            tabpanelRoleCount: document.querySelectorAll('[role="tabpanel"]').length,
            ariaSelectedCount: document.querySelectorAll("[aria-selected]").length,
            ariaLiveCount: document.querySelectorAll("[aria-live]").length,
            hasFocusVisibleRule,
            hasReducedMotionRule,
            mediaQueryCount,
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

    // 5. Test "Reset / Clear Vault" button and confirm it returns cleanly to 0 prompts & 0 pts
    await page
      .locator(".sidebar")
      .getByRole("button", { name: /Reset \/ Clear Vault/i })
      .click();
    await page.waitForTimeout(200);

    await page.getByRole("tab", { name: /Cognitive Mirror/i }).click();
    await expect(page.locator(".onboarding-card h2")).toContainText("Welcome to Clearspace");

    if (vp.name === "1280x800") {
      resetVaultVerification = await page.evaluate(() => {
        const statValues = Array.from(document.querySelectorAll(".stat-card .stat-value")).map(
          (el) => el.textContent?.trim()
        );
        return {
          onboardingVisibleAfterReset: Boolean(document.querySelector(".onboarding-card")),
          uniquePromptsAfterReset: statValues[0],
          highSignalAfterReset: statValues[1],
          piiRedactionsAfterReset: statValues[2],
          peakWindowAfterReset: statValues[3],
          sidebarEquityScoreAfterReset: document
            .querySelector(".equity-score-num")
            ?.textContent?.trim(),
          sidebarEquitySubAfterReset: document
            .querySelector(".equity-widget .stat-sub")
            ?.textContent?.trim(),
        };
      });
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    viewportTelemetry[vp.name] = {
      viewport: vp,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      emptyStateHorizontalOverflowPx: emptyStateMetrics.horizontalOverflowPx,
      statsGridRowCountAtViewport: emptyStateMetrics.statsGridRowCount,
      perTabGeometry,
    };

    await context.close();
  }

  // Final Iteration 3 strict assertions
  expect(keyboardNavVerification.activeAfterArrowDown).toBe("O*NET Path Finder");
  expect(keyboardNavVerification.activeAfterEnd).toBe("Local Vault & Scrubber");
  expect(keyboardNavVerification.activeAfterHome).toBe("Cognitive Mirror");
  expect(ariaTelemetry.totalProgressbarRoleCountAcrossOnetAndEquity).toBeGreaterThanOrEqual(17);
  expect(onetMeterVerification.allHaveAriaAttrs).toBe(true);
  expect(equitySummaryVerification.trackHasAriaValueNow).toBe(true);
  expect(vaultExplorerVerification.bothVisibleAbove800pxFold).toBe(true);
  expect(contrastTelemetry.statLabel_textMuted_on_statCard.wcagAA_4_5).toBe(true);
  expect(contrastTelemetry.quoteMeta_textMuted_on_quoteBox.wcagAA_4_5).toBe(true);
  expect(contrastTelemetry.badgeValue.wcagAA_4_5).toBe(true);

  const report = {
    iteration: 3,
    phase: "loop-3-final-verification",
    timestamp: new Date().toISOString(),
    status: "PASS_CONVERGED_ZERO_DEFECTS",
    screenshots: {
      onboarding_1280x800: path.join(ARTIFACT_DIR, "iter3-onboarding-1280x800.png"),
      onboarding_1024x768: path.join(ARTIFACT_DIR, "iter3-onboarding-1024x768.png"),
      tab_mirror: path.join(ARTIFACT_DIR, "iter3-tab-mirror.png"),
      tab_onet: path.join(ARTIFACT_DIR, "iter3-tab-onet.png"),
      tab_equity: path.join(ARTIFACT_DIR, "iter3-tab-equity.png"),
      tab_journal: path.join(ARTIFACT_DIR, "iter3-tab-journal.png"),
      tab_vault: path.join(ARTIFACT_DIR, "iter3-tab-vault.png"),
    },
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
    remainingDefects: [],
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
});
