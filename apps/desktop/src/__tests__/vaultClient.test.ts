// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addJournalEntry,
  backupLocalVault,
  buildGrowthTrajectoryModel,
  computePromptQualityScore,
  checkForAppUpdates,
  compareSemver,
  computeWritingLevelClient,
  getVaultDashboard,
  importExportedContent,
  importFilesBatch,
  loadSampleMultiProviderVault,
  parseMultiProviderClient,
  resetFullFactory,
  resetLocalVault,
  scanLocalVault,
  toggleQuestState,
  updateUserProfile,
} from "../vaultClient";
import {
  buildContributionGridModel,
  computeIntensityLevel,
  formatContributionTooltip,
} from "../ContributionGrid";

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

  it("aggregates daily_counts and builds the 53-week GitHub-style contribution grid with hover tooltips and color gradient levels", async () => {
    const dash = await loadSampleMultiProviderVault();
    expect(dash.summary.daily_counts).toBeDefined();
    expect(dash.summary.daily_counts?.length).toBe(5);

    expect(formatContributionTooltip("2026-03-18", 113)).toBe("113 prompts on March 18th.");
    expect(formatContributionTooltip("2026-03-01", 1)).toBe("1 prompt on March 1st.");
    expect(formatContributionTooltip("2026-03-02", 0)).toBe("No prompts on March 2nd.");
    expect(formatContributionTooltip("2026-03-11", 4)).toBe("4 prompts on March 11th.");

    expect(computeIntensityLevel(0, 20)).toBe(0);
    expect(computeIntensityLevel(3, 20)).toBe(1);
    expect(computeIntensityLevel(8, 20)).toBe(2);
    expect(computeIntensityLevel(14, 20)).toBe(3);
    expect(computeIntensityLevel(19, 20)).toBe(4);

    const grid = buildContributionGridModel(
      [
        ["2026-03-18", 113],
        ["2026-03-19", 25],
        ["2026-03-20", 60],
      ],
      "2026",
      "2026-10-30"
    );
    expect(grid.totalPrompts).toBe(198);
    expect(grid.activeDays).toBe(3);
    expect(grid.maxDailyCount).toBe(113);
    expect(grid.longestStreak).toBe(3);
    expect(grid.weeks.length).toBeGreaterThanOrEqual(52);
    expect(grid.monthLabels.length).toBeGreaterThanOrEqual(10);

    const allDays = grid.weeks.flatMap((w) => w.days);
    const mar18 = allDays.find((d) => d.dateStr === "2026-03-18");
    expect(mar18?.count).toBe(113);
    expect(mar18?.level).toBe(4);
    expect(mar18?.tooltipText).toBe("113 prompts on March 18th.");
  });

  it("detects Anthropic Claude Export Batch Manifests and surfaces actionable warnings and direct download links", async () => {
    const manifestJson = JSON.stringify({
      instructions:
        "Download each file using the export_url (or curl_command in a terminal). Links expire on the date shown in expires_at.",
      expires_at: "2026-11-30T19:24:03.988299+00:00",
      total_files: 3,
      data_files: [
        {
          filename: "users-000.zip",
          category: "users",
          size_bytes: 205,
          export_url: "https://claude.ai/export/fd757f36/download/ccb50377/users-000.zip",
        },
        {
          filename: "projects-000.zip",
          category: "projects",
          size_bytes: 547,
          export_url: "https://claude.ai/export/fd757f36/download/ccb50377/projects-000.zip",
        },
        {
          filename: "conversations-000.zip",
          category: "conversations",
          size_bytes: 590,
          export_url: "https://claude.ai/export/fd757f36/download/ccb50377/conversations-000.zip",
        },
      ],
    });

    const { prompts, summary } = parseMultiProviderClient(manifestJson);
    expect(prompts).toHaveLength(0);
    expect(summary.detected_format).toBe("Anthropic Claude Export Manifest");
    expect(summary.manifest_links).toHaveLength(3);
    expect(summary.manifest_links?.[2]?.filename).toBe("conversations-000.zip");
    expect(summary.warnings?.[0]).toContain("conversations-000.zip");
  });

  it("parses Google Gemini Workspace conversation_turns, filters Gemini Canvas UI noise, and parses Gemini Gems HTML + ChatGPT chat.html", async () => {
    const workspaceTxtJson = JSON.stringify({
      conversation_turns: [
        {
          user_turn: {
            prompt:
              "Can you help me organize my career strategy and build an automated telemetry pipeline for my engineering portfolio?",
          },
          turn_last_modified: "2026-01-22T20:42:07.887822Z",
        },
        {
          user_turn: {
            prompt: "how to format in miliseconds?",
          },
          turn_last_modified: "2026-01-22T20:43:39.299807Z",
        },
      ],
    });

    const wsRes = parseMultiProviderClient(workspaceTxtJson);
    expect(wsRes.summary.detected_format).toContain("Workspace Conversation History");
    expect(wsRes.prompts).toHaveLength(2);
    expect(wsRes.prompts[0].source).toBe("gemini_takeout");

    const geminiActivityWithNoise = JSON.stringify([
      {
        header: "Gemini Apps",
        title: "Cleared previous feedback",
        time: "2026-10-18T17:19:03.658Z",
      },
      {
        header: "Gemini Apps",
        title: "Created Gemini Canvas titled Master Resume v2 (Evidence-Backed)",
        time: "2026-10-14T15:39:05.789Z",
      },
      {
        header: "Gemini Apps",
        title: "Selected preferred draft",
        time: "2026-10-14T16:00:00.000Z",
      },
      {
        header: "Gemini Apps",
        title:
          "Branched How should I structure our multi-provider ingestion pipeline so every user prompt is scrubbed deterministically?",
        time: "2026-10-15T18:00:00.000Z",
        subtitles: [{ name: "1 generated image." }, { name: "Attached 1 file." }],
      },
    ]);

    const actRes = parseMultiProviderClient(geminiActivityWithNoise);
    expect(actRes.summary.total_raw_prompts).toBe(4);
    expect(actRes.summary.noise_filtered_out).toBe(3);
    expect(actRes.summary.clean_prompts_kept).toBe(1);
    expect(actRes.prompts[0].cleaned_text.startsWith("How should I structure")).toBe(true);

    const gemsHtml = `<div><b>Name:</b><br>LoL Matchup Coach<br><br><b>Description:</b><br>Jungle coach<br><br><b>Instructions:</b><br>Act as a high-level strategic coach and analyze objective tradeoffs, pathing efficiency, and win conditions.<br><br><b>Creation Time:</b><br>2026-02-01 16:40:31 UTC<br><br></div>`;
    const gemsRes = parseMultiProviderClient(gemsHtml);
    expect(gemsRes.summary.detected_format).toContain("Gemini Gems HTML");
    expect(gemsRes.prompts).toHaveLength(1);
    expect(gemsRes.prompts[0].cleaned_text).toContain("LoL Matchup Coach");

    const emptyHtml = "<div></div>";
    const emptyRes = parseMultiProviderClient(emptyHtml);
    expect(emptyRes.prompts).toHaveLength(0);
    expect(emptyRes.summary.detected_format).toContain("Empty HTML Export");
    expect(emptyRes.summary.warnings?.length).toBeGreaterThan(0);

    const chatHtml = `<html><head><script>var jsonData = [{"id":"html-chat-1","create_time":1739565000,"mapping":{"n1":{"message":{"author":{"role":"user"},"create_time":1739565000,"content":{"parts":[{"type":"text","text":"How do we design a local-first SQLite schema with deterministic migrations and zero cloud dependencies?"}]}}}}}];</script></head><body></body></html>`;
    const htmlRes = parseMultiProviderClient(chatHtml);
    expect(htmlRes.summary.detected_format).toContain("OpenAI ChatGPT HTML Export");
    expect(htmlRes.prompts).toHaveLength(1);
    expect(htmlRes.prompts[0].source).toBe("chat_gpt_web");
  });

  it("parses Claude content block arrays, Claude projects.json, YAML frontmatter markdown, and batch import reports", async () => {
    const claudeContentBlocks = JSON.stringify([
      {
        uuid: "claude-blocks-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-10T19:00:00Z",
            text: "",
            content: [
              {
                type: "text",
                text: "Let us evaluate the architectural tradeoffs between distributed consensus and single-node embedded SQLite for local-first desktop apps.",
              },
            ],
          },
        ],
      },
    ]);

    const claudeProjects = JSON.stringify([
      {
        uuid: "proj-1",
        name: "Clearspace Architecture",
        created_at: "2026-03-11T12:00:00Z",
        prompt_template:
          "Always reason from mathematical first principles, challenge unverified assumptions, and quantify system bottlenecks.",
        docs: [
          {
            uuid: "doc-1",
            filename: "spec.md",
            created_at: "2026-03-11T12:05:00Z",
            content:
              "Every local import must surface a complete per-file status summary with raw, clean, noise, duplicate, and PII redaction counts.",
          },
        ],
      },
    ]);

    const frontmatterMd = `---
title: Architecture Notes
date: 2026-10-14
---

# Systems Reflection

We need to ensure that every user import produces immediate visual confirmation and transparent per-file diagnostics.`;

    const { report, dashboard } = await importFilesBatch([
      { name: "claude_conversations.json", rawText: claudeContentBlocks },
      { name: "projects.json", rawText: claudeProjects },
      { name: "Master Resume v2", rawText: frontmatterMd },
      {
        name: "anthropic_data_manifest.json",
        rawText: JSON.stringify({
          data_files: [
            {
              filename: "conversations-000.zip",
              category: "conversations",
              size_bytes: 590,
              export_url: "https://claude.ai/export/test/conversations-000.zip",
            },
          ],
        }),
      },
      { name: "gemini_scheduled_actions_data.html", rawText: "<div></div>" },
      { name: "broken.json", rawText: "{not valid json" },
    ]);

    expect(report.files_processed).toBe(6);
    expect(report.total_clean_kept).toBe(4);
    expect(report.total_new_added).toBe(4);
    expect(dashboard.summary.clean_prompts_kept).toBe(4);

    const byName = new Map(report.file_reports.map((r) => [r.file_name, r]));
    expect(byName.get("claude_conversations.json")?.status).toBe("imported");
    expect(byName.get("projects.json")?.status).toBe("imported");
    expect(byName.get("projects.json")?.clean_prompts_kept).toBe(2);
    expect(byName.get("Master Resume v2")?.status).toBe("imported");
    expect(byName.get("anthropic_data_manifest.json")?.status).toBe("manifest_ready");
    expect(byName.get("anthropic_data_manifest.json")?.manifest_links).toHaveLength(1);
    expect(byName.get("gemini_scheduled_actions_data.html")?.status).toBe("empty");
    expect(byName.get("broken.json")?.status).toBe("error");
  });

  it("verifies Round 1 real-world user testing archives (Takeout ZIP, Gemini MyActivity, Workspace txt, Gems HTML, and Anthropic Manifests)", async () => {
    // @ts-ignore - Node built-ins available in Vitest runner
    const fs = await import("node:fs");
    // @ts-ignore - Node built-ins available in Vitest runner
    const path = await import("node:path");
    const userProfile: string =
      ((globalThis as Record<string, any>).process?.env?.USERPROFILE as string) || "";
    const meDir = path.join(userProfile, "OneDrive - G3Z Creative", "Desktop", "me");
    if (!fs.existsSync(meDir)) {
      return;
    }

    const anthropicFile = path.join(meDir, "anthropic_data_christian.json");
    const manifestFile = path.join(
      meDir,
      "manifest-fd757f36-5306-4d74-a381-7a3e6d50cbd1-1793388221-ccb50377-2026-10-30-19-24-03.json"
    );
    const myActivityFile = path.join(
      meDir,
      "Takeout",
      "My Activity",
      "Gemini Apps",
      "MyActivity.json"
    );
    const workspaceConvFile = path.join(
      meDir,
      "Takeout",
      "Gemini in Workspace",
      "Conversation History",
      "conversation_1787448579.txt"
    );
    const gemsHtmlFile = path.join(meDir, "Takeout", "Gemini", "gemini_gems_data.html");
    const scheduledHtmlFile = path.join(
      meDir,
      "Takeout",
      "Gemini",
      "gemini_scheduled_actions_data.html"
    );
    const resumeMdFile = path.join(
      meDir,
      "Takeout",
      "My Activity",
      "Gemini Apps",
      "Master Resume v2 (Evidence-Backed-914e83b00f701603"
    );
    const wtPlanFile = path.join(
      meDir,
      "Takeout",
      "My Activity",
      "Gemini Apps",
      "war_thunder_heatmap_plan_v1-5e669d345bb82532"
    );

    const { report, dashboard } = await importFilesBatch([
      { name: "anthropic_data_christian.json", rawText: fs.readFileSync(anthropicFile, "utf8") },
      { name: "manifest-batch.json", rawText: fs.readFileSync(manifestFile, "utf8") },
      { name: "MyActivity.json", rawText: fs.readFileSync(myActivityFile, "utf8") },
      { name: "conversation_1787448579.txt", rawText: fs.readFileSync(workspaceConvFile, "utf8") },
      { name: "gemini_gems_data.html", rawText: fs.readFileSync(gemsHtmlFile, "utf8") },
      {
        name: "gemini_scheduled_actions_data.html",
        rawText: fs.readFileSync(scheduledHtmlFile, "utf8"),
      },
      { name: "Master Resume v2", rawText: fs.readFileSync(resumeMdFile, "utf8") },
      { name: "war_thunder_heatmap_plan_v1", rawText: fs.readFileSync(wtPlanFile, "utf8") },
    ]);

    const byName = new Map(report.file_reports.map((r) => [r.file_name, r]));
    // 1. Both Anthropic files are Export Batch Manifests with direct download links
    expect(byName.get("anthropic_data_christian.json")?.status).toBe("manifest_ready");
    expect(byName.get("anthropic_data_christian.json")?.manifest_links).toHaveLength(3);
    expect(byName.get("manifest-batch.json")?.status).toBe("manifest_ready");
    expect(byName.get("manifest-batch.json")?.manifest_links).toHaveLength(4);

    // 2. Gemini MyActivity.json filters out Canvas/UI system events and keeps 842 genuine prompts
    expect(byName.get("MyActivity.json")?.status).toBe("imported");
    expect(byName.get("MyActivity.json")?.clean_prompts_kept).toBe(842);

    // 3. Gemini in Workspace conversation_1787448579.txt extracts 2 prompts
    expect(byName.get("conversation_1787448579.txt")?.status).toBe("imported");
    expect(byName.get("conversation_1787448579.txt")?.clean_prompts_kept).toBe(2);

    // 4. Gemini Gems HTML extracts 5 Custom Gems
    expect(byName.get("gemini_gems_data.html")?.status).toBe("imported");
    expect(byName.get("gemini_gems_data.html")?.clean_prompts_kept).toBe(5);

    // 5. Gemini Scheduled Actions HTML is flagged as empty (0 records)
    expect(byName.get("gemini_scheduled_actions_data.html")?.status).toBe("empty");

    // 6. Both extensionless Markdown Canvas files import cleanly
    expect(byName.get("Master Resume v2")?.status).toBe("imported");
    expect(byName.get("Master Resume v2")?.clean_prompts_kept).toBe(16);
    expect(byName.get("war_thunder_heatmap_plan_v1")?.status).toBe("imported");
    expect(byName.get("war_thunder_heatmap_plan_v1")?.clean_prompts_kept).toBe(14);

    // Total net-new across all files in Desktop/me = 842 + 2 + 5 + 16 + 14 = 879 unique prompts
    expect(dashboard.summary.clean_prompts_kept).toBe(879);

    // Also test direct .zip ingestion on takeout-20261030T164136Z-1-001.zip
    await resetLocalVault();
    const zipPath = path.join(meDir, "takeout-20261030T164136Z-1-001.zip");
    if (fs.existsSync(zipPath)) {
      const zipBuf = fs.readFileSync(zipPath);
      const ab = zipBuf.buffer.slice(zipBuf.byteOffset, zipBuf.byteOffset + zipBuf.byteLength);
      const zipRes = await importFilesBatch([
        { name: "takeout-20261030T164136Z-1-001.zip", rawBuffer: ab },
      ]);
      expect(zipRes.report.files_processed).toBe(6);
      expect(zipRes.dashboard.summary.clean_prompts_kept).toBe(879);
    }
  });

  it("persists Step 1 user profile (name, optional avatar, theme mode) across vault resets and wipes on full factory reset", async () => {
    const initial = await getVaultDashboard();
    expect(initial.profile.name).toBe("");
    expect(initial.profile.theme_mode).toBe("light");

    const updated = await updateUserProfile({
      name: "Chris",
      avatar_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      theme_mode: "dark",
      mirror_story_completed: true,
      shortlisted_onet_codes: ["15-1252.00"],
    });
    expect(updated.name).toBe("Chris");
    expect(updated.theme_mode).toBe("dark");
    expect(updated.mirror_story_completed).toBe(true);
    expect(updated.shortlisted_onet_codes).toEqual(["15-1252.00"]);

    await loadSampleMultiProviderVault();
    const populated = await getVaultDashboard();
    expect(populated.mirror_cards.map((c) => c.story_chapter)).toEqual([
      "excel",
      "excel",
      "grow",
      "friction",
      "grow",
    ]);

    // Resetting local vault keeps Step 1 profile name & avatar intact while resetting progress
    const afterVaultReset = await resetLocalVault();
    expect(afterVaultReset.summary.clean_prompts_kept).toBe(0);
    expect(afterVaultReset.profile.name).toBe("Chris");
    expect(afterVaultReset.profile.avatar_data_url).toContain("data:image/png");
    expect(afterVaultReset.profile.mirror_story_completed).toBe(false);
    expect(afterVaultReset.profile.shortlisted_onet_codes).toEqual([]);

    // Full factory reset returns all the way to Step 1
    const afterFactoryReset = await resetFullFactory();
    expect(afterFactoryReset.profile.name).toBe("");
    expect(afterFactoryReset.profile.avatar_data_url).toBeNull();
    expect(afterFactoryReset.summary.clean_prompts_kept).toBe(0);
  });

  it("compares semver versions deterministically and records pre-upgrade vault backups", async () => {
    expect(compareSemver("0.1.0", "0.1.0")).toBe(0);
    expect(compareSemver("0.2.0", "0.1.0")).toBe(1);
    expect(compareSemver("0.1.0", "0.2.0")).toBe(-1);
    expect(compareSemver("v1.0.0", "0.9.9")).toBe(1);

    const status = await backupLocalVault();
    expect(status.installed_version).toBe("0.3.0");
    expect(status.schema_version).toBe(3);
    expect(status.last_backup_path).toContain("clearspace_vault.db.bak-v3");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "0.3.0",
        schemaVersion: 3,
        notes: "v0.3.0 release notes",
        pub_date: "2026-10-30T00:00:00Z",
        platforms: {
          "windows-x86_64": {
            url: "/downloads/Clearspace_0.3.0_x64-setup.exe",
            sha256: "acf69f66e81d314369b70e5ea9cfed7a4bde0cee7028e310bf4bbe647a5a0700",
          },
        },
      }),
    } as Response);

    try {
      const checkRes = await checkForAppUpdates("0.3.0", 3);
      expect(checkRes.installed_version).toBe("0.3.0");
      expect(checkRes.schema_version).toBe(3);
      expect(checkRes.update_available).toBe(false);

      const legacyCheckRes = await checkForAppUpdates("0.2.0", 2);
      expect(legacyCheckRes.installed_version).toBe("0.2.0");
      expect(legacyCheckRes.latest_version).toBe("0.3.0");
      expect(legacyCheckRes.update_available).toBe(true);
      expect(legacyCheckRes.schema_version).toBe(3);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("computes Everyday, Professional, and Technical writing levels and adapts cards, O*NET matches, and quests with zero jargon leakage", async () => {
    // 1. Empty vault defaults to everyday
    const emptyMetrics = computeWritingLevelClient([]);
    expect(emptyMetrics.measured_level).toBe("everyday");
    expect(emptyMetrics.level_label).toBe("Everyday / Plain English");

    // 2. Simple prompts -> everyday
    const everydayExport = JSON.stringify([
      {
        uuid: "ev-1",
        chat_messages: [
          {
            sender: "human",
            created_at: "2026-03-01T10:00:00Z",
            text: "How can I make a simple weekly plan so I finish my work on time and have more free time with my family?",
          },
        ],
      },
    ]);
    const { dashboard: evDash } = await importExportedContent(everydayExport);
    expect(evDash.summary.writing_level?.measured_level).toBe("everyday");
    expect(evDash.profile.writing_level_mode).toBe("auto");

    // 3. Load sample vault and test explicit mode switching across everyday, professional, and technical
    await loadSampleMultiProviderVault();
    const forbiddenJargon = [
      "unit economics",
      "unit-economics",
      "telemetry contracts",
      "automated regression",
      "load-testing benchmarks",
      "1-to-many",
      "dialectical verification",
    ];

    for (const mode of ["everyday", "professional"] as const) {
      await updateUserProfile({ writing_level_mode: mode });
      const dash = await getVaultDashboard();
      expect(dash.profile.writing_level_mode).toBe(mode);

      for (const card of dash.mirror_cards) {
        const combined = `${card.title} ${card.summary} ${card.assumption_challenged} ${card.identified_gap}`.toLowerCase();
        for (const term of forbiddenJargon) {
          expect(combined).not.toContain(term);
        }
      }

      for (const match of dash.onet_matches) {
        expect(match.plain_english_description.length).toBeGreaterThan(20);
        const combined = `${match.plain_english_description} ${match.why_it_fits} ${match.honest_positioning_rationale} ${match.identified_gaps.join(" ")} ${match.tested_assumptions.join(" ")} ${match.burnout_guardrail}`.toLowerCase();
        for (const term of forbiddenJargon) {
          expect(combined).not.toContain(term);
        }
      }

      expect(dash.quests).toHaveLength(6);
      expect(dash.quests.map((q) => q.horizon)).toEqual([
        "Next 7 Days (Quick Win)",
        "Next 7 Days (Quick Win)",
        "Next 30 Days (Skill Builder)",
        "Next 30 Days (Skill Builder)",
        "3-Month Milestone (Practical Project)",
        "1-Year Goal (Career Growth)",
      ]);
      for (const q of dash.quests) {
        const combined = `${q.title} ${q.rationale}`.toLowerCase();
        for (const term of forbiddenJargon) {
          expect(combined).not.toContain(term);
        }
      }
    }

    // 4. Technical mode surfaces deep systems/architectural vocabulary
    await updateUserProfile({ writing_level_mode: "technical" });
    const techDash = await getVaultDashboard();
    expect(techDash.profile.writing_level_mode).toBe("technical");
    expect(techDash.mirror_cards[0].title).toBe("The 'Bottleneck → Build the System' Reflex");
    expect(techDash.mirror_cards[1].title).toBe(
      "Bilingual Translation: Systems Depth → Clear Human Value"
    );
    expect(techDash.quests[4].title).toContain("Open-Core Software");
  });

  it("models 7d, 30d, and 1y growth trajectories with EWMA prompt quality and quest commitment step-ups", async () => {
    expect(computePromptQualityScore("beginner", false)).toBe(25);
    expect(computePromptQualityScore("intermediate", true)).toBe(75);
    expect(computePromptQualityScore("advanced", true)).toBe(100);

    const upQuality = [
      { date: "2026-11-10", prompt_count: 2, avg_quality_score: 25, tier_counts: [2, 0, 0] as [number, number, number] },
      { date: "2026-11-15", prompt_count: 3, avg_quality_score: 100, tier_counts: [0, 0, 3] as [number, number, number] },
    ];
    const quests = [
      { id: "q1", horizon: "7d", title: "Q1", rationale: "R", equity_category: "C", equity_points: 500, accepted: true, completed: true, accepted_at: "2026-11-12 10:00", completed_at: "2026-11-15 14:00" },
      { id: "q2", horizon: "30d", title: "Q2", rationale: "R", equity_category: "C", equity_points: 500, accepted: false, completed: false, accepted_at: null, completed_at: null },
    ];

    const m7 = buildGrowthTrajectoryModel(upQuality, quests, "7d", "2026-11-15");
    expect(m7.points).toHaveLength(7);
    expect(m7.points[6].dateStr).toBe("2026-11-15");
    expect(m7.promptDelta).toBeGreaterThan(0);
    expect(m7.points.find((p) => p.dateStr === "2026-11-11")?.commitmentScore).toBe(0);
    expect(m7.points.find((p) => p.dateStr === "2026-11-12")?.commitmentScore).toBe(13);
    expect(m7.points.find((p) => p.dateStr === "2026-11-15")?.commitmentScore).toBe(25);

    const downQuality = [
      { date: "2026-11-10", prompt_count: 2, avg_quality_score: 100, tier_counts: [0, 0, 2] as [number, number, number] },
      { date: "2026-11-15", prompt_count: 2, avg_quality_score: 25, tier_counts: [2, 0, 0] as [number, number, number] },
    ];
    const mDown = buildGrowthTrajectoryModel(downQuality, [], "7d", "2026-11-15");
    expect(mDown.points[6].promptScore).toBeLessThan(mDown.points[1].promptScore);

    expect(buildGrowthTrajectoryModel(upQuality, quests, "30d", "2026-11-15").points).toHaveLength(30);
    expect(buildGrowthTrajectoryModel(upQuality, quests, "1y", "2026-11-15").points).toHaveLength(52);
  });
});
