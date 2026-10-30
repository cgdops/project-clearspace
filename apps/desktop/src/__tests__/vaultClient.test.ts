// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  addJournalEntry,
  getVaultDashboard,
  importExportedContent,
  loadSampleMultiProviderVault,
  resetLocalVault,
  scanLocalVault,
  toggleQuestState,
} from "../vaultClient";

describe("Clearspace Browser-Mode Vault Client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts in a clean empty-vault onboarding state with 0% O*NET scores, 0 mirror cards, and 0 accepted quests (0 pts equity)", async () => {
    const dashboard = await getVaultDashboard();
    expect(dashboard.summary.clean_prompts_kept).toBe(0);
    expect(dashboard.summary.high_signal_prompts).toBe(0);
    expect(dashboard.mirror_cards).toHaveLength(0);
    expect(dashboard.onet_matches).toHaveLength(4);
    expect(dashboard.quests.filter((q) => q.accepted)).toHaveLength(0);
    expect(dashboard.quests.every((q) => !q.accepted && !q.completed)).toBe(true);
    for (const match of dashboard.onet_matches) {
      expect(match.overall_fit_pct).toBe(0);
      expect(match.skill_overlap_pct).toBe(0);
      expect(match.energy_alignment_pct).toBe(0);
      expect(match.values_match_pct).toBe(0);
      expect(match.burnout_risk_pct).toBe(0);
    }
  });

  it("imports OpenAI ChatGPT conversations.json with epoch timestamps and scrubs PII locally", async () => {
    const openaiExport = JSON.stringify([
      {
        id: "openai-test-1",
        create_time: 1739565000.0,
        mapping: {
          "node-1": {
            message: {
              author: { role: "user" },
              create_time: 1739565000.0,
              content: {
                parts: [
                  "Reach me at user@company.org or 415-555-0199: I want to architect an automated pipeline and MCP agent tool using Rust and SQLite to scale system throughput.",
                ],
              },
            },
          },
        },
      },
    ]);

    const { summary, dashboard } = await importExportedContent(openaiExport);
    expect(summary.clean_prompts_kept).toBe(1);
    expect(summary.total_redactions).toBe(2);
    expect(dashboard.summary.clean_prompts_kept).toBe(1);
    expect(dashboard.mirror_cards).toHaveLength(5);
    expect(dashboard.recent_high_signal_prompts?.[0]?.cleaned_text).toContain("[REDACTED_EMAIL]");
    expect(dashboard.recent_high_signal_prompts?.[0]?.cleaned_text).toContain("[REDACTED_PHONE]");
  });

  it("additively merges Anthropic Claude, Google Gemini Takeout, and Markdown Journal imports without wiping prior providers", async () => {
    const claudeExport = JSON.stringify([
      {
        uuid: "claude-merge-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-02-18T21:15:00Z",
            text: "Act as a skeptic (/grill-me) and critique our product strategy, pricing, and ICP positioning from first principles.",
          },
        ],
      },
    ]);

    const geminiExport = JSON.stringify([
      {
        header: "Gemini Apps",
        title:
          "Prompted How can I design an interactive simulation economy and telemetry routing pipeline for player community engagement?",
        time: "2026-03-01T20:30:00Z",
      },
    ]);

    const markdownJournal =
      "# 2026-03-05 22:00\nMy core goal is long-term autonomy, household stability, and building reusable developer tools that eliminate repetitive manual maintenance.";

    await importExportedContent(claudeExport);
    let dash = await getVaultDashboard();
    expect(dash.summary.clean_prompts_kept).toBe(1);

    await importExportedContent(geminiExport);
    dash = await getVaultDashboard();
    expect(dash.summary.clean_prompts_kept).toBe(2);

    await importExportedContent(markdownJournal);
    dash = await getVaultDashboard();
    expect(dash.summary.clean_prompts_kept).toBe(3);

    const sources = new Map(dash.summary.source_counts ?? []);
    expect(sources.get("Anthropic Claude")).toBe(1);
    expect(sources.get("Google Gemini Takeout")).toBe(1);
    expect(sources.get("Markdown Journal")).toBe(1);
  });

  it("loads the sample multi-provider vault, accepts 3 quests (488 pts equity), and computes non-zero O*NET fit scores", async () => {
    const dash = await loadSampleMultiProviderVault();
    expect(dash.summary.clean_prompts_kept).toBe(5);
    expect(dash.mirror_cards).toHaveLength(5);
    expect(dash.onet_matches[0].overall_fit_pct).toBeGreaterThanOrEqual(80);
    expect(dash.onet_matches[0].supporting_quotes.length).toBeGreaterThan(0);

    const acceptedQuests = dash.quests.filter((q) => q.accepted);
    expect(acceptedQuests).toHaveLength(3);
    const baseEquity = dash.summary.clean_prompts_kept > 0 && acceptedQuests.length > 0 ? 225 : 0;
    const totalEquityPoints = acceptedQuests.reduce(
      (acc, q) => acc + (q.completed ? q.equity_points : Math.round(q.equity_points * 0.35)),
      baseEquity
    );
    expect(totalEquityPoints).toBe(488);
  });

  it("toggles quest commitment and completion states and persists journal entries", async () => {
    const initial = await getVaultDashboard();
    const targetQuestId = initial.quests[0].id;
    expect(initial.quests[0].accepted).toBe(false);

    const afterAccept = await toggleQuestState(targetQuestId, "accepted");
    expect(afterAccept.find((q) => q.id === targetQuestId)?.accepted).toBe(true);

    const afterComplete = await toggleQuestState(targetQuestId, "completed");
    expect(afterComplete.find((q) => q.id === targetQuestId)?.completed).toBe(true);

    const journals = await addJournalEntry(
      "What is one tool or asset you built this month?",
      "Built a deterministic multi-provider parser and zero-knowledge local scrubber.",
      "Energized & Clear"
    );
    expect(journals).toHaveLength(1);
    expect(journals[0].mood_valence).toBe("Energized & Clear");
  });

  it("resets the local vault cleanly back to 0 prompts and 0% O*NET scores", async () => {
    await loadSampleMultiProviderVault();
    const populated = await getVaultDashboard();
    expect(populated.summary.clean_prompts_kept).toBeGreaterThan(0);

    const afterReset = await resetLocalVault();
    expect(afterReset.summary.clean_prompts_kept).toBe(0);
    expect(afterReset.mirror_cards).toHaveLength(0);
    expect(afterReset.onet_matches.every((m) => m.overall_fit_pct === 0)).toBe(true);
  });

  it("contains zero hardcoded founder biographical strings in any synthesized output", async () => {
    const dash = await loadSampleMultiProviderVault();
    const serialized = JSON.stringify(dash).toLowerCase();
    const forbidden = [
      ["tal", "lo"].join(""),
      ["god", "forge"].join(""),
      ["father", " of 5"].join(""),
      ["5 ", "kids"].join(""),
      ["1,3", "43%"].join(""),
      ["c:/users/", "chris"].join(""),
    ];
    for (const term of forbidden) {
      expect(serialized).not.toContain(term);
    }
  });

  it("filters out short tactical commands, role delegations, and deduplicates identical prompts", async () => {
    const noisyExport = JSON.stringify([
      {
        uuid: "noisy-conv-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-01T10:00:00Z",
            text: "git status",
          },
          {
            sender: "human",
            created_at: "2026-03-01T10:05:00Z",
            text: "You are a senior software engineer reviewing this architecture diagram for scalability.",
          },
          {
            sender: "human",
            created_at: "2026-03-01T11:00:00Z",
            text: "I want to architect an automated data pipeline that eliminates manual maintenance and scales our product strategy.",
          },
          {
            sender: "human",
            created_at: "2026-03-01T11:30:00Z",
            text: "I want to architect an automated data pipeline that eliminates manual maintenance and scales our product strategy.",
          },
        ],
      },
    ]);

    const { summary } = await importExportedContent(noisyExport);
    expect(summary.total_raw_prompts).toBe(4);
    expect(summary.noise_filtered_out).toBe(2);
    expect(summary.duplicates_removed).toBe(1);
    expect(summary.clean_prompts_kept).toBe(1);
  });

  it("computes hourly distribution and 5-category behavioral signals accurately in browser mode", async () => {
    const signalExport = JSON.stringify([
      {
        uuid: "signal-conv-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-02T21:45:00Z",
            text: "As a skeptic (/grill-me), why should I architect this automated database pipeline to grow my career revenue and achieve family stability and autonomy?",
          },
        ],
      },
    ]);

    const { dashboard } = await importExportedContent(signalExport);
    expect(dashboard.summary.hourly_distribution[21]).toBe(1);
    expect(dashboard.summary.high_signal_prompts).toBe(1);
    const categories = new Map(dashboard.summary.category_counts);
    expect(categories.get("Career & Positioning")).toBe(1);
    expect(categories.get("Values & Motivation")).toBe(1);
    expect(categories.get("Systems & Architecture")).toBe(1);
    expect(categories.get("Curiosity & Learning")).toBe(1);
    expect(categories.get("Skeptical Truth-Seeking")).toBe(1);
  });

  it("scans local vault idempotently without duplicating existing prompt hashes", async () => {
    const firstScan = await scanLocalVault();
    const countAfterFirst = firstScan.summary.clean_prompts_kept;
    expect(countAfterFirst).toBeGreaterThan(0);

    const secondScan = await scanLocalVault();
    expect(secondScan.summary.clean_prompts_kept).toBe(countAfterFirst);
  });

  it("rejects empty or malformed JSON imports without corrupting existing vault records", async () => {
    await loadSampleMultiProviderVault();
    const before = await getVaultDashboard();
    expect(before.summary.clean_prompts_kept).toBe(5);

    await expect(importExportedContent("   ")).rejects.toThrow(/Empty import file/i);
    await expect(importExportedContent("[{broken json")).rejects.toThrow();

    const after = await getVaultDashboard();
    expect(after.summary.clean_prompts_kept).toBe(5);
  });

  it("honestly positions Beginner -> Junior, Intermediate -> Mid-Level, and Advanced -> Senior / Staff without ego inflation", async () => {
    const beginnerExport = JSON.stringify([
      {
        uuid: "beg-conv-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-01T10:00:00Z",
            text: "How do I write a basic rust tool and sqlite database query for a beginner step by step tutorial?",
          },
        ],
      },
    ]);

    const { dashboard: begDash } = await importExportedContent(beginnerExport);
    expect(begDash.summary.overall_positioning).toBe("Beginner → Junior");
    expect(begDash.summary.tier_counts).toEqual([1, 0, 0]);
    const begTopRole = begDash.onet_matches[0];
    expect(begTopRole.assessed_tier).toBe("Beginner → Junior");
    expect(begTopRole.positioned_title).toContain("Junior");
    expect(begTopRole.overall_fit_pct).toBeGreaterThan(0);
    expect(begTopRole.overall_fit_pct).toBeLessThanOrEqual(46);
    expect(begTopRole.identified_gaps.length).toBeGreaterThan(0);
    expect(begTopRole.tested_assumptions.length).toBeGreaterThan(0);

    // Zero-hit mirror cards must report 0% confidence rather than an inflated 68% floor
    const zeroHitCard = begDash.mirror_cards.find((c) => c.id === "card-burnout-trigger");
    expect(zeroHitCard?.confidence_pct).toBe(0);
    expect(zeroHitCard?.assumption_challenged).toBeTruthy();
    expect(zeroHitCard?.identified_gap).toBeTruthy();

    await resetLocalVault();
    const intermediateExport = JSON.stringify([
      {
        uuid: "int-conv-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-01T11:00:00Z",
            text: "Let us implement and test an agent tool workflow with rust, typescript, and sqlite to solve developer tasks cleanly.",
          },
        ],
      },
    ]);
    const { dashboard: intDash } = await importExportedContent(intermediateExport);
    expect(intDash.summary.overall_positioning).toBe("Intermediate → Mid-Level");
    expect(intDash.onet_matches[0].assessed_tier).toBe("Intermediate → Mid-Level");
    expect(intDash.onet_matches[0].positioned_title).toContain("Mid-Level");
    expect(intDash.onet_matches[0].overall_fit_pct).toBeGreaterThanOrEqual(45);
    expect(intDash.onet_matches[0].overall_fit_pct).toBeLessThanOrEqual(74);
  });
});
