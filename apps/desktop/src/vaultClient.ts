import { invoke } from "@tauri-apps/api/core";

export type SkillTier = "beginner" | "intermediate" | "advanced";

export interface IngestionSummary {
  total_files_scanned: number;
  total_raw_prompts: number;
  noise_filtered_out: number;
  duplicates_removed: number;
  clean_prompts_kept: number;
  high_signal_prompts: number;
  total_redactions: number;
  earliest_date: string | null;
  latest_date: string | null;
  hourly_distribution: number[];
  category_counts: [string, number][];
  source_counts?: [string, number][];
  tier_counts?: [number, number, number];
  overall_positioning?: string;
}

export interface QuoteCitation {
  date: string;
  convo_id: string;
  text: string;
}

export interface MirrorInsightCard {
  id: string;
  category: string;
  title: string;
  summary: string;
  confidence_pct: number;
  pinned: boolean;
  quotes: QuoteCitation[];
  assessed_tier?: string;
  assumption_challenged?: string;
  identified_gap?: string;
}

export interface EvidenceQuote {
  prompt_id: string;
  date: string;
  excerpt: string;
}

export interface RoleMatchResult {
  onet_code: string;
  title: string;
  modern_titles: string[];
  bucket: string;
  salary_range_usd: string;
  assessed_tier: string;
  positioned_title: string;
  positioned_salary_usd: string;
  honest_positioning_rationale: string;
  identified_gaps: string[];
  tested_assumptions: string[];
  overall_fit_pct: number;
  skill_overlap_pct: number;
  energy_alignment_pct: number;
  values_match_pct: number;
  burnout_risk_pct: number;
  why_it_fits: string;
  burnout_guardrail: string;
  supporting_quotes: EvidenceQuote[];
}

export interface EquityQuest {
  id: string;
  horizon: string;
  title: string;
  rationale: string;
  equity_category: string;
  equity_points: number;
  accepted: boolean;
  completed: boolean;
}

export interface JournalEntry {
  id: number;
  created_at: string;
  prompt_question: string;
  reflection_text: string;
  mood_valence: string;
}

export interface NormalizedPrompt {
  id: string;
  source: string;
  conversation_id: string;
  created_at: string;
  local_hour: number | null;
  cleaned_text: string;
  word_count: number;
  redactions_made: number;
  is_high_signal: boolean;
  signal_categories: string[];
  skill_tier?: SkillTier;
}

export interface VaultDashboardPayload {
  db_path: string;
  summary: IngestionSummary;
  mirror_cards: MirrorInsightCard[];
  onet_matches: RoleMatchResult[];
  quests: EquityQuest[];
  journals: JournalEntry[];
  recent_high_signal_prompts?: NormalizedPrompt[];
}

const STORAGE_PROMPTS_KEY = "clearspace_vault_prompts_v1";
const STORAGE_QUESTS_KEY = "clearspace_vault_quests_v1";
const STORAGE_JOURNALS_KEY = "clearspace_vault_journals_v1";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const DEFAULT_QUESTS: EquityQuest[] = [
  {
    id: "q-reposition-architect",
    horizon: "Now (30 Days)",
    title: "Anchor Positioning in Systems Architecture & Unit-Economics Impact",
    rationale:
      "Lead your portfolio and interviews with measurable system throughput, automation leverage, and cost-efficiency outcomes synthesized from your high-signal engineering and strategy prompts.",
    equity_category: "Positioning Clarity",
    equity_points: 250,
    accepted: false,
    completed: false,
  },
  {
    id: "q-focus-guardrail",
    horizon: "Now (30 Days)",
    title: "Enforce a 3-Pillar Cognitive Focus Rule (1 Core Role, 1 Compounding Engine, 1 Deep-Flow Lab)",
    rationale:
      "Eliminates context-switching fatigue across fragmented side projects and protects your highest-leverage deep work hours.",
    equity_category: "Pitfall Immunity",
    equity_points: 200,
    accepted: false,
    completed: false,
  },
  {
    id: "q-drop-linear-work",
    horizon: "Year 1 Milestone",
    title: "Replace Repetitive Manual Maintenance with 1-to-Many Programmatic Workflows",
    rationale:
      "Burnout signals in your prompt archive correlate with repetitive hand-maintenance. Standardize on reusable tools, schemas, and automated pipelines.",
    equity_category: "Pitfall Immunity",
    equity_points: 300,
    accepted: false,
    completed: false,
  },
  {
    id: "q-domain-bridge",
    horizon: "Year 1 Milestone",
    title: "Bridge Deep Technical Tooling with Interactive & Companion Ecosystems",
    rationale:
      "Combine your systems architecture, data telemetry, and workflow automation strengths into high-leverage platform engineering roles without resetting your seniority.",
    equity_category: "Mastered Proof-of-Work",
    equity_points: 350,
    accepted: false,
    completed: false,
  },
  {
    id: "q-open-core-equity",
    horizon: "Year 3 Milestone",
    title: "Compound Open-Core Software & Reusable Intellectual Property",
    rationale:
      "Convert your 'bottleneck -> build the tool' reflex into durable open-core software assets and automated distribution channels that compound independent of linear hours.",
    equity_category: "Compounding Distribution",
    equity_points: 500,
    accepted: false,
    completed: false,
  },
  {
    id: "q-year5-autonomy",
    horizon: "Year 5 Horizon",
    title: "Full Creative & Financial Autonomy (Principal Architect / Founder Track)",
    rationale:
      "Align your 5-year trajectory toward long-term household stability, creative ownership, and high-margin technical leadership.",
    equity_category: "Compounding Distribution",
    equity_points: 1000,
    accepted: false,
    completed: false,
  },
];

export const SAMPLE_MULTI_PROVIDER_EXPORT = JSON.stringify([
  {
    id: "openai-conv-101",
    create_time: 1739565000.0,
    mapping: {
      "node-1": {
        message: {
          author: { role: "user" },
          create_time: 1739565000.0,
          content: {
            parts: [
              "I want to architect an automated pipeline and MCP agent workflow using Rust and SQLite so our team can eliminate manual maintenance and scale system throughput with clear unit economics.",
            ],
          },
        },
      },
      "node-2": {
        message: {
          author: { role: "user" },
          create_time: 1739655000.0,
          content: {
            parts: [
              "Whenever our engineering workflow hits a bottleneck, my reflex is to build a tool or schema compiler that makes the complex architecture simple and clear for every user.",
            ],
          },
        },
      },
    },
  },
  {
    uuid: "claude-conv-202",
    chat_messages: [
      {
        sender: "human",
        created_at: "2026-02-18T21:15:00Z",
        text: "Act as a skeptic (/grill-me) and critique our product strategy, pricing, and ICP positioning from first principles—expose its flaws so we only build what is truly worth solving.",
      },
      {
        sender: "human",
        created_at: "2026-02-20T22:30:00Z",
        text: "My core goal is long-term autonomy, household stability, and compounding software equity while avoiding repetitive manual maintenance or fragmented adhoc context switching.",
      },
    ],
  },
  {
    header: "Gemini Apps",
    title:
      "Prompted How can I combine interactive simulation economy design, telemetry routing, and programmatic growth systems into a principal platform architecture role?",
    time: "2026-03-04T20:45:00Z",
  },
]);

function scrubPromptClient(raw: string): {
  cleanedText: string;
  wordCount: number;
  redactionsMade: number;
  isNoise: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { cleanedText: "", wordCount: 0, redactionsMade: 0, isNoise: true };
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("you are a ") ||
    lower.startsWith("you are the ") ||
    lower.startsWith("your role is ") ||
    lower.startsWith("your sole job is ")
  ) {
    return { cleanedText: "", wordCount: 0, redactionsMade: 0, isNoise: true };
  }

  let redactions = 0;
  let text = trimmed.replace(/```[\s\S]*?```/g, "[CODE_BLOCK_OMITTED]");
  text = text.replace(
    /\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z-]{10,})\b/g,
    () => {
      redactions += 1;
      return "[REDACTED_API_KEY]";
    }
  );
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => {
    redactions += 1;
    return "[REDACTED_SSN]";
  });
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
    redactions += 1;
    return "[REDACTED_EMAIL]";
  });
  text = text.replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, () => {
    redactions += 1;
    return "[REDACTED_PHONE]";
  });

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isNoise = wordCount < 5 || wordCount > 650;
  return { cleanedText: text.trim(), wordCount, redactionsMade: redactions, isNoise };
}

function classifySignalsClient(text: string, wordCount: number): { isHigh: boolean; categories: string[] } {
  if (wordCount < 10) return { isHigh: false, categories: [] };
  const cats: string[] = [];
  if (
    /\b(career|job|resume|interview|role|salary|hire|hiring|company|director|manager|lead|position|linkedin|portfolio|freelance|agency|client|pricing|revenue|offer|industry|market|positioning|strategy|icp)\b/i.test(
      text
    )
  ) {
    cats.push("Career & Positioning");
  }
  if (
    /\b(i want|i feel|i think|my goal|honestly|frustrat|worry|afraid|doubt|wonder|struggl|burnout|demoraliz|excited|love|hate|family|kids|home|stability|unfair advantage|authentic|simplify|meaningful|autonomy|peace|clarity|energy)\b/i.test(
      text
    )
  ) {
    cats.push("Values & Motivation");
  }
  if (
    /\b(architect|system|design|principle|tradeoff|scale|database|graph|vector|agent|automation|pipeline|telemetry|optimize|routing|engine|editor|tool|platform|workflow|api|schema|compiler)\b/i.test(
      text
    )
  ) {
    cats.push("Systems & Architecture");
  }
  if (
    /\b(why|how does|what is the best|explain|understand|learn|teach|difference between|should i|recommend|what do you think|first principles|mental model)\b/i.test(
      text
    )
  ) {
    cats.push("Curiosity & Learning");
  }
  if (
    /(\/grill-me|as a skeptic|expose its flaws|super critical|worth solving|steelman|devil's advocate|blind spot|critique)/i.test(
      text
    )
  ) {
    cats.push("Skeptical Truth-Seeking");
  }
  return { isHigh: cats.length > 0 && wordCount >= 12, categories: cats };
}

export function classifySkillTierClient(
  text: string,
  wordCount: number,
  signalCategories: string[]
): SkillTier {
  const hasBeginner =
    /\b(what is a|what is an|how do i|how to basic|explain like i'm|for a beginner|step by step tutorial|fix this syntax|syntax error|what does this error mean|help me understand basic|beginner|newbie|just starting out|hello world)\b/i.test(
      text
    );
  const hasAdvanced =
    /(\/grill-me|\b(architect|architecture|tradeoff|trade-off|scale|scalability|unit economics|first principles|bottleneck|telemetry|idempoten|concurrency|distributed|schema|compiler|pipeline|deterministic|zero-knowledge|autonomy|icp|positioning|multi-tenant|latency|throughput)\b)/i.test(
      text
    );
  const hasIntermediate =
    /\b(integrate|refactor|implement|workflow|api|database|sqlite|rust|typescript|test|endpoint|component|deployment|optimize|automation|query|parser)\b/i.test(
      text
    );

  if (hasBeginner && !hasAdvanced) {
    return "beginner";
  }

  const hasArchOrSkeptic = signalCategories.some(
    (c) => c === "Systems & Architecture" || c === "Skeptical Truth-Seeking"
  );

  if (hasAdvanced && (hasArchOrSkeptic || signalCategories.length >= 2 || wordCount >= 14)) {
    return "advanced";
  }

  if (hasIntermediate || signalCategories.length > 0) {
    return "intermediate";
  }

  return "beginner";
}

export function formatTierLabel(tier: SkillTier): string {
  switch (tier) {
    case "beginner":
      return "Beginner → Junior";
    case "intermediate":
      return "Intermediate → Mid-Level";
    case "advanced":
      return "Advanced → Senior / Staff";
  }
}

function tierDepthWeight(tier: SkillTier): number {
  switch (tier) {
    case "beginner":
      return 0.35;
    case "intermediate":
      return 0.75;
    case "advanced":
      return 1.15;
  }
}

function simpleHash(str: string): string {
  const norm = str.trim().toLowerCase().slice(0, 180);
  let h1 = 0xdeadbeef ^ norm.length;
  let h2 = 0x41c6ce57 ^ norm.length;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

function normalizeTimestampClient(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const ms = raw > 100_000_000_000 ? raw : raw * 1000;
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && asNum > 1_000_000_000) {
      const ms = asNum > 100_000_000_000 ? asNum : asNum * 1000;
      return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
    }
    return trimmed;
  }
  return "";
}

function extractHourClient(iso: string): number | null {
  const m = iso.match(/(?:T|\s)(\d{2}):\d{2}/);
  if (m) {
    const hr = parseInt(m[1], 10);
    if (hr >= 0 && hr < 24) return hr;
  }
  return null;
}

function sourceDisplayLabel(source: string): string {
  switch (source) {
    case "claude_web":
      return "Anthropic Claude";
    case "chat_gpt_web":
      return "OpenAI ChatGPT";
    case "gemini_takeout":
      return "Google Gemini Takeout";
    case "markdown_journal":
      return "Markdown Journal";
    default:
      return "Antigravity Local";
  }
}

function parseMultiProviderClient(rawInput: string): {
  prompts: NormalizedPrompt[];
  summary: IngestionSummary;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Empty import file");
  }

  const seenHashes = new Set<string>();
  const prompts: NormalizedPrompt[] = [];
  let totalRaw = 0;
  let noiseFiltered = 0;
  let duplicatesRemoved = 0;
  let totalRedactions = 0;
  let filesScanned = 1;

  const pushPrompt = (text: string, createdAt: string, convoId: string, source: string) => {
    totalRaw += 1;
    const scrubbed = scrubPromptClient(text);
    totalRedactions += scrubbed.redactionsMade;
    if (scrubbed.isNoise) {
      noiseFiltered += 1;
      return;
    }
    const id = simpleHash(scrubbed.cleanedText);
    if (seenHashes.has(id)) {
      duplicatesRemoved += 1;
      return;
    }
    seenHashes.add(id);
    const localHour = extractHourClient(createdAt);
    const sig = classifySignalsClient(scrubbed.cleanedText, scrubbed.wordCount);
    const skillTier = classifySkillTierClient(scrubbed.cleanedText, scrubbed.wordCount, sig.categories);
    prompts.push({
      id,
      source,
      conversation_id: convoId,
      created_at: createdAt || "2026-02-15T20:00:00Z",
      local_hour: localHour,
      cleaned_text: scrubbed.cleanedText,
      word_count: scrubbed.wordCount,
      redactions_made: scrubbed.redactionsMade,
      is_high_signal: sig.isHigh,
      signal_categories: sig.categories,
      skill_tier: skillTier,
    });
  };

  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    let currentDate = "2026-02-15T20:00:00Z";
    const paragraphs = trimmed.split(/\n\s*\n/);
    for (const block of paragraphs) {
      const lines = block.split("\n");
      const bodyLines: string[] = [];
      for (const l of lines) {
        const hm = l.trim().match(/^#{1,4}\s*(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})?)/);
        if (hm) {
          const dt = hm[1].replace(" ", "T");
          currentDate = dt.includes("T") ? `${dt}:00Z` : `${dt}T20:00:00Z`;
        } else {
          const cleanLine = l.trim().replace(/^[#*>-]+\s*/, "");
          if (cleanLine) bodyLines.push(cleanLine);
        }
      }
      if (bodyLines.length > 0) {
        pushPrompt(bodyLines.join(" "), currentDate, "md-journal", "markdown_journal");
      }
    }
  } else {
    const parsed = JSON.parse(trimmed);
    const items: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.conversations)
      ? parsed.conversations
      : Array.isArray(parsed.activities)
      ? parsed.activities
      : [parsed];
    filesScanned = Math.max(items.length, 1);

    items.forEach((item, idx) => {
      const convoId = String(item.uuid || item.id || item.conversation_id || `export-${idx + 1}`);
      const fallbackTs = normalizeTimestampClient(
        item.created_at ?? item.create_time ?? item.time ?? item.timestamp
      );

      if (Array.isArray(item.chat_messages) || Array.isArray(item.messages)) {
        const msgs = (item.chat_messages || item.messages) as Record<string, unknown>[];
        for (const msg of msgs) {
          const sender = String(msg.sender || msg.role || "");
          if (sender !== "human" && sender !== "user") continue;
          const text = typeof msg.text === "string" ? msg.text : "";
          const ts = normalizeTimestampClient(msg.created_at ?? msg.create_time) || fallbackTs;
          pushPrompt(text, ts, convoId, "claude_web");
        }
      } else if (item.mapping && typeof item.mapping === "object") {
        const mapping = item.mapping as Record<string, Record<string, unknown>>;
        for (const node of Object.values(mapping)) {
          const message = node?.message as Record<string, unknown> | undefined;
          if (!message) continue;
          const author = message.author as Record<string, unknown> | undefined;
          if (author?.role !== "user") continue;
          const content = message.content as Record<string, unknown> | undefined;
          const parts = Array.isArray(content?.parts) ? content.parts : [];
          const text = parts.filter((p): p is string => typeof p === "string").join("\n");
          const ts = normalizeTimestampClient(message.create_time ?? message.created_at) || fallbackTs;
          pushPrompt(text, ts, convoId, "chat_gpt_web");
        }
      } else if (
        typeof item.title === "string" ||
        typeof item.header === "string" ||
        item.gemini_activity
      ) {
        const rawTitle = typeof item.title === "string" ? item.title : "";
        const stripped = rawTitle
          .replace(/^Prompted\s+/i, "")
          .replace(/^Asked\s+/i, "")
          .trim();
        const ts = normalizeTimestampClient(item.time ?? item.timestamp ?? item.created_at) || fallbackTs;
        if (stripped) {
          pushPrompt(stripped, ts, convoId, "gemini_takeout");
        }
      } else if (typeof item.prompt === "string" || typeof item.text === "string") {
        const text = String(item.prompt || item.text);
        pushPrompt(text, fallbackTs, convoId, "markdown_journal");
      }
    });
  }

  const summary = summarizePromptsClient(prompts, filesScanned, totalRaw, noiseFiltered, duplicatesRemoved);
  return { prompts, summary };
}

function summarizePromptsClient(
  prompts: NormalizedPrompt[],
  filesScanned?: number,
  totalRaw?: number,
  noiseFiltered = 0,
  duplicatesRemoved = 0
): IngestionSummary {
  const sorted = [...prompts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hourly = new Array<number>(24).fill(0);
  const tier_counts: [number, number, number] = [0, 0, 0];
  const catMap = new Map<string, number>();
  const srcMap = new Map<string, number>();
  const convos = new Set<string>();
  let highSignal = 0;
  let redactions = 0;

  for (const p of sorted) {
    convos.add(p.conversation_id);
    redactions += p.redactions_made;
    if (p.is_high_signal) highSignal += 1;
    if (typeof p.local_hour === "number" && p.local_hour >= 0 && p.local_hour < 24) {
      hourly[p.local_hour] += 1;
    }
    const tier =
      p.skill_tier ?? classifySkillTierClient(p.cleaned_text, p.word_count, p.signal_categories);
    if (tier === "beginner") tier_counts[0] += 1;
    else if (tier === "intermediate") tier_counts[1] += 1;
    else tier_counts[2] += 1;

    for (const c of p.signal_categories) {
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const label = sourceDisplayLabel(p.source);
    srcMap.set(label, (srcMap.get(label) ?? 0) + 1);
  }

  const category_counts = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const source_counts = Array.from(srcMap.entries()).sort((a, b) => b[1] - a[1]);

  let overall_positioning = "Awaiting Evidence";
  if (sorted.length > 0) {
    const weightedIdx = (tier_counts[1] + 2 * tier_counts[2]) / sorted.length;
    if (weightedIdx < 0.65) overall_positioning = "Beginner → Junior";
    else if (weightedIdx < 1.35) overall_positioning = "Intermediate → Mid-Level";
    else overall_positioning = "Advanced → Senior / Staff";
  }

  return {
    total_files_scanned: filesScanned ?? convos.size,
    total_raw_prompts: totalRaw ?? sorted.length,
    noise_filtered_out: noiseFiltered,
    duplicates_removed: duplicatesRemoved,
    clean_prompts_kept: sorted.length,
    high_signal_prompts: highSignal,
    total_redactions: redactions,
    earliest_date: sorted[0]?.created_at ?? null,
    latest_date: sorted[sorted.length - 1]?.created_at ?? null,
    hourly_distribution: hourly,
    category_counts,
    source_counts,
    tier_counts,
    overall_positioning,
  };
}

function buildMirrorCardsClient(prompts: NormalizedPrompt[]): MirrorInsightCard[] {
  if (prompts.length === 0) return [];

  const tierCounts: [number, number, number] = [0, 0, 0];
  for (const p of prompts) {
    const tier =
      p.skill_tier ?? classifySkillTierClient(p.cleaned_text, p.word_count, p.signal_categories);
    if (tier === "beginner") tierCounts[0] += 1;
    else if (tier === "intermediate") tierCounts[1] += 1;
    else tierCounts[2] += 1;
  }
  const weightedTierIdx = (tierCounts[1] + 2 * tierCounts[2]) / Math.max(1, prompts.length);
  const overallTierLabel =
    weightedTierIdx < 0.65
      ? "Beginner → Junior"
      : weightedTierIdx < 1.35
      ? "Intermediate → Mid-Level"
      : "Advanced → Senior / Staff";

  const findQuotesAndHits = (keywords: string[], limit: number) => {
    const quotes: QuoteCitation[] = [];
    let hits = 0;
    for (let i = prompts.length - 1; i >= 0; i--) {
      const p = prompts[i];
      const lower = p.cleaned_text.toLowerCase();
      if (keywords.some((k) => lower.includes(k))) {
        hits += 1;
        if (p.word_count >= 10 && quotes.length < limit) {
          quotes.push({
            date: p.created_at.slice(0, 10),
            convo_id: p.conversation_id.slice(0, 8),
            text: p.cleaned_text.length > 260 ? `${p.cleaned_text.slice(0, 260)}…` : p.cleaned_text,
          });
        }
      }
    }
    return { quotes, hits };
  };

  const calcConf = (hits: number) => {
    if (hits === 0) return 0;
    const norm = Math.min(1, hits / Math.max(2, prompts.length * 0.35));
    return Math.min(94, Math.max(25, Math.round(32 + 62 * norm)));
  };

  const tool = findQuotesAndHits(
    ["tool", "editor", "architect", "pipeline", "automate", "system", "engine", "schema", "workflow"],
    3
  );
  const empathy = findQuotesAndHits(
    ["clear", "simple", "human", "explain", "value", "user", "client", "positioning", "strategy"],
    3
  );
  const values = findQuotesAndHits(
    ["stability", "autonomy", "family", "home", "authentic", "goal", "meaningful", "impact", "equity"],
    3
  );
  const burnout = findQuotesAndHits(
    ["burnout", "manual", "repetitive", "frustrat", "struggl", "tedious", "maintenance", "adhoc"],
    3
  );
  const skeptic = findQuotesAndHits(
    ["/grill-me", "skeptic", "critical", "worth solving", "flaws", "tradeoff", "first principles"],
    3
  );

  return [
    {
      id: "card-tool-builder",
      category: "Superpower",
      title: "The 'Bottleneck → Build the System' Reflex",
      summary: `Detected in ${tool.hits} of ${prompts.length} prompts (${tierCounts[0]} Beginner / ${tierCounts[1]} Intermediate / ${tierCounts[2]} Advanced across vault): when you encounter manual overhead, evaluate whether you are designing durable systems or just scripting one-off patches.`,
      confidence_pct: calcConf(tool.hits),
      pinned: true,
      quotes: tool.quotes,
      assessed_tier: overallTierLabel,
      assumption_challenged:
        tool.hits === 0
          ? "Assumption Tested: 0 systems/tooling prompts found—do not position yourself as a platform architect without concrete build evidence."
          : tierCounts[2] === 0
          ? "Assumption Tested: You reference tools/workflows, but your prompts lack Senior-level tradeoff, failure-mode, or scale constraints."
          : "Assumption Tested: Building a new tool for every bottleneck can become procrastination if it avoids shipping and validating with real users.",
      identified_gap:
        tool.hits === 0
          ? "Gap Identified: No architectural or workflow automation prompts recorded in your vault yet."
          : `Gap Identified: ${tierCounts[0]} Beginner / ${tierCounts[1]} Intermediate prompt(s) still rely on tactical execution rather than reusable schema or telemetry contracts.`,
    },
    {
      id: "card-bilingual-empathy",
      category: "Superpower",
      title: "Bilingual Translation: Systems Depth → Clear Human Value",
      summary: `Identified across ${empathy.hits} of ${prompts.length} prompts: measures how consistently you connect backend engineering decisions to user clarity, positioning, and measurable unit economics.`,
      confidence_pct: calcConf(empathy.hits),
      pinned: true,
      quotes: empathy.quotes,
      assessed_tier: overallTierLabel,
      assumption_challenged:
        empathy.hits === 0
          ? "Assumption Tested: 0 user/positioning signals detected—technical code alone rarely speaks for itself without explicit value translation."
          : "Assumption Tested: Clear positioning language in prompts must be backed by quantified customer outcomes (latency, revenue, retention), not just clean copy.",
      identified_gap:
        empathy.hits < 2
          ? "Gap Identified: Sparse commercial/user-value framing—add explicit ICP, pricing, and outcome constraints when designing technical systems."
          : "Gap Identified: Pair qualitative user empathy with hard unit-economics and conversion metrics to prove Staff/Principal business impact.",
    },
    {
      id: "card-values-anchor",
      category: "Core Value",
      title: "Autonomy, Sustainable Stability & High-Leverage Ownership",
      summary: `Synthesized from ${values.hits} value-signal prompt(s): tracks whether your daily technical work actually compounds toward household stability and autonomy.`,
      confidence_pct: calcConf(values.hits),
      pinned: true,
      quotes: values.quotes,
      assessed_tier: overallTierLabel,
      assumption_challenged:
        "Assumption Tested: Wanting autonomy or founder-level equity does not create it—if your daily prompts are 80% reactive maintenance, your trajectory will stay linear.",
      identified_gap:
        values.hits === 0
          ? "Gap Identified: 0 explicit career/value constraints logged—define your non-negotiables (comp floor, ownership scope, work rhythm) in the Reflective Journal."
          : "Gap Identified: Audit how many hours per week go toward compounding assets vs. unleveraged ad-hoc requests.",
    },
    {
      id: "card-burnout-trigger",
      category: "Burnout Trigger",
      title: "The Repetitive Manual Maintenance Trap",
      summary: `Detected ${burnout.hits} friction signal(s): tracks where repetitive hand-maintenance, boilerplate, or fragmented context-switching drains your cognitive output.`,
      confidence_pct: calcConf(burnout.hits),
      pinned: true,
      quotes: burnout.quotes,
      assessed_tier: overallTierLabel,
      assumption_challenged:
        "Assumption Tested: High output during crunch periods is not sustainable leverage—ignoring repetitive maintenance drag leads to silent skill stagnation.",
      identified_gap:
        burnout.hits === 0
          ? "Gap Identified: 0 explicit burnout markers detected yet—proactively document which weekly tasks drain your energy so Clearspace can flag role mismatches."
          : `Gap Identified: ${burnout.hits} prompt(s) show maintenance friction; convert the top recurring manual chore into a deterministic script or test suite.`,
    },
    {
      id: "card-grill-me",
      category: "Cognitive Rhythm",
      title: "First-Principles Truth-Seeking & Dialectical Verification",
      summary: `With ${skeptic.hits} skeptical inquiry signal(s), evaluates whether you actively challenge your own assumptions from first principles before committing engineering effort.`,
      confidence_pct: calcConf(skeptic.hits),
      pinned: true,
      quotes: skeptic.quotes,
      assessed_tier: overallTierLabel,
      assumption_challenged:
        skeptic.hits === 0
          ? "Assumption Tested: 0 skeptical/adversarial prompts found—using AI only for confirmation or code generation creates blind spots and inflates confidence."
          : "Assumption Tested: Stress-testing ideas in chat is only half the loop—verify that critiques translate into shipped tests and falsifiable benchmarks.",
      identified_gap:
        skeptic.hits === 0
          ? "Gap Identified: Start asking AI to expose flaws, edge cases, and failure modes in your designs before writing implementation code."
          : "Gap Identified: Expand adversarial verification from product strategy into automated regression and load-testing benchmarks.",
    },
  ];
}

function matchOnetPathsClient(prompts: NormalizedPrompt[]): RoleMatchResult[] {
  const catalog = [
    {
      onet_code: "15-1299.08",
      title: "Computer Systems Engineers / Architects",
      modern_titles: [
        "Staff Growth Systems Architect",
        "AI Automation & Revenue Architect",
        "Principal Marketing & GTM Technologist",
      ],
      junior_title: "Junior Systems & Marketing Automation Engineer",
      junior_salary_usd: "$75,000 – $100,000",
      mid_title: "Mid-Level Growth Systems & Automation Engineer",
      mid_salary_usd: "$110,000 – $140,000",
      senior_title: "Staff Growth Systems Architect",
      senior_salary_usd: "$145,000 – $185,000",
      bucket: "Immediate High-Leverage Upgrade",
      salary_range_usd: "$145,000 – $185,000",
      why_it_fits_template:
        "Your prompt history shows a focus on replacing manual operational bottlenecks with programmatic 1-to-Many pipelines, automated data workflows, and measurable unit economics.",
      burnout_guardrail:
        "Avoid roles where you are treated as a ticket-taking execution coordinator; require architectural ownership over the automation stack.",
      skill_keywords: ["seo", "pseo", "n8n", "automation", "api", "pipeline", "architecture", "system", "scale", "telemetry"],
      energy_keywords: ["unfair advantage", "specialize", "compound", "velocity", "automat", "scale", "system", "optimize"],
      value_keywords: ["efficiency", "costs", "stability", "benefits", "clear", "simple", "impact", "autonomy"],
      burnout_conflict_keywords: ["manual maintenance", "repetitive", "hand-editing", "tedious"],
      competency_pillars: [
        { name: "Programmatic Pipeline & Workflow Automation", kws: ["pipeline", "automation", "n8n", "workflow"] },
        { name: "Cloud & Edge Systems Architecture", kws: ["cloudflare", "astro", "architecture", "system", "scale"] },
        { name: "Search, Telemetry & Ranking Analytics", kws: ["seo", "pseo", "ranking", "search console", "telemetry"] },
        { name: "API Integration & Unit-Economics Modeling", kws: ["api", "crm", "scraper", "costs", "efficiency"] },
      ],
    },
    {
      onet_code: "15-1252.00",
      title: "Software Developers, Tools & Platforms",
      modern_titles: [
        "Developer Experience (DX) & AI Tooling Engineer",
        "Forward-Deployed AI Solutions Engineer",
        "Internal Tools & Agentic Workflow Architect",
      ],
      junior_title: "Junior Developer Tools & SDK Engineer",
      junior_salary_usd: "$80,000 – $105,000",
      mid_title: "Mid-Level Platform & Agentic Tooling Engineer",
      mid_salary_usd: "$115,000 – $145,000",
      senior_title: "Developer Experience (DX) & AI Tooling Engineer (Senior / Staff)",
      senior_salary_usd: "$150,000 – $195,000",
      bucket: "Immediate High-Leverage Upgrade",
      salary_range_usd: "$150,000 – $195,000",
      why_it_fits_template:
        "Whenever you encounter a workflow bottleneck, your reflex is to design a custom developer tool, schema, or agentic workflow while translating complex architecture into clear human value.",
      burnout_guardrail:
        "Stay focused on the reusable tooling and platform layer rather than repetitive manual asset or ticket production.",
      skill_keywords: ["agent", "mcp", "editor", "tool", "token", "model", "database", "sqlite", "graph", "workflow", "rust", "schema"],
      energy_keywords: ["build a tool", "fast", "spin up", "prototype", "architect", "design", "solve"],
      value_keywords: ["skeptic", "worth solving", "honestly", "first principles", "clarity"],
      burnout_conflict_keywords: ["burnout", "so much work", "boilerplate", "manual"],
      competency_pillars: [
        { name: "Agentic & MCP Workflow Orchestration", kws: ["agent", "mcp", "workflow", "token", "model", "skill"] },
        { name: "Systems Languages & SDK Compilation", kws: ["rust", "typescript", "compiler", "sdk", "editor", "tool"] },
        { name: "Local-First Storage & Graph/Vector Schemas", kws: ["database", "sqlite", "graph", "vector", "schema"] },
        { name: "First-Principles Verification & Stress-Testing", kws: ["skeptic", "worth solving", "first principles", "clarity"] },
      ],
    },
    {
      onet_code: "15-1255.01",
      title: "Interactive Systems & Companion Platform Architects",
      modern_titles: [
        "Interactive Ecosystem & Companion Platform Lead",
        "Technical Growth PM — Interactive Media & Simulation",
        "Simulation Tools & Economy Systems Designer",
      ],
      junior_title: "Junior Gameplay & Companion Tools Developer",
      junior_salary_usd: "$70,000 – $95,000",
      mid_title: "Mid-Level Simulation & Interactive Systems Designer",
      mid_salary_usd: "$105,000 – $135,000",
      senior_title: "Interactive Ecosystem & Companion Platform Lead",
      senior_salary_usd: "$135,000 – $175,000",
      bucket: "Hidden Natural Fit (Unexplored Path)",
      salary_range_usd: "$135,000 – $175,000",
      why_it_fits_template:
        "Your deep-flow prompts explore interactive state machines, simulation economies, routing algorithms, and telemetry-driven companion tools—blending systems engineering with user engagement.",
      burnout_guardrail:
        "Do not enter through manual content or asset grinding; lead through Companion Platforms, Data Telemetry, or Systems Design.",
      skill_keywords: ["game", "quest", "route", "economy", "balance", "simulation", "interactive", "state", "telemetry"],
      energy_keywords: ["designing", "building", "playing", "optimizing", "flow", "deep"],
      value_keywords: ["fun", "immersive", "player", "community", "guide", "craft", "creative"],
      burnout_conflict_keywords: ["manual maintenance", "asset grind", "repetitive"],
      competency_pillars: [
        { name: "Simulation Economy & Balance Modeling", kws: ["economy", "balance", "simulation", "telemetry"] },
        { name: "Interactive State Machines & Routing", kws: ["quest", "route", "state", "interactive", "rpg"] },
        { name: "Engine & Addon Tooling (Godot / Lua)", kws: ["game", "godot", "addon", "lua", "hero", "character"] },
        { name: "Player Community & Companion Craft", kws: ["player", "community", "guide", "craft", "immersive"] },
      ],
    },
    {
      onet_code: "11-2021.00",
      title: "Technical Product & Growth Strategy Directors",
      modern_titles: [
        "Head of AI Growth & Product-Led Acquisition",
        "VP / Director of Technical Growth & GTM Engineering",
        "Founder — Productized B2B Automation & Open-Core Software",
      ],
      junior_title: "Junior Technical Product & GTM Analyst",
      junior_salary_usd: "$80,000 – $105,000",
      mid_title: "Mid-Level Technical Product & Growth Manager",
      mid_salary_usd: "$120,000 – $155,000",
      senior_title: "Head of AI Growth & Product-Led Acquisition (Senior / Staff)",
      senior_salary_usd: "$180,000 – $250,000+ (or Equity / ARR)",
      bucket: "5-Year North Star Track",
      salary_range_usd: "$180,000 – $250,000+ (or Equity / ARR)",
      why_it_fits_template:
        "You synthesize systems engineering, unit economics, buyer psychology, and adversarial truth-seeking. Over a 5-year horizon, owning both product architecture and organic distribution compounds your personal equity fastest.",
      burnout_guardrail:
        "Protect your cognitive bandwidth by focusing on 1 flagship product and 1 automated distribution engine at a time, eliminating fragmented ad-hoc client work.",
      skill_keywords: ["product", "pricing", "icp", "competitor", "market", "business", "client", "strategy", "positioning", "growth"],
      energy_keywords: ["niche", "unfair advantage", "vision", "big picture", "compound", "strategy", "leader"],
      value_keywords: ["authentic", "stability", "home", "equity", "journey", "clarity", "autonomy"],
      burnout_conflict_keywords: ["adhoc", "fragmented", "conflicting", "context switching"],
      competency_pillars: [
        { name: "ICP Positioning & Competitive Differentiation", kws: ["icp", "positioning", "competitor", "value prop", "market"] },
        { name: "Pricing Architecture & Revenue Unit Economics", kws: ["pricing", "revenue", "retainer", "business", "equity"] },
        { name: "Product-Led Growth & Acquisition Strategy", kws: ["product", "growth", "strategy", "outreach", "client"] },
        { name: "Long-Term Portfolio & Autonomy Governance", kws: ["autonomy", "stability", "compound", "unfair advantage"] },
      ],
    },
  ];

  if (prompts.length === 0) {
    return catalog.map((r) => ({
      onet_code: r.onet_code,
      title: r.title,
      modern_titles: r.modern_titles,
      bucket: r.bucket,
      salary_range_usd: r.salary_range_usd,
      assessed_tier: "Awaiting Evidence",
      positioned_title: r.junior_title,
      positioned_salary_usd: "Import vault to calibrate",
      honest_positioning_rationale:
        "No prompts analyzed yet. Clearspace never guesses or inflates seniority without behavioral evidence.",
      identified_gaps: r.competency_pillars.map((p) => `Unverified competency: ${p.name}`),
      tested_assumptions: [
        "Upload your prompt history to test how your actual daily inquiries compare against your target career track.",
      ],
      overall_fit_pct: 0,
      skill_overlap_pct: 0,
      energy_alignment_pct: 0,
      values_match_pct: 0,
      burnout_risk_pct: 0,
      why_it_fits:
        "Import or scan your prompt history to compute personalized O*NET behavioral alignment and evidence citations.",
      burnout_guardrail: r.burnout_guardrail,
      supporting_quotes: [],
    }));
  }

  const corpusScale = Math.min(16, Math.max(1.2, Math.sqrt(prompts.length)));

  const results: RoleMatchResult[] = catalog.map((role) => {
    let skillHits = 0;
    let energyHits = 0;
    let valueHits = 0;
    let burnoutHits = 0;

    let weightedSkill = 0;
    let weightedEnergy = 0;
    let weightedValue = 0;

    const matchedTierCounts: [number, number, number] = [0, 0, 0];
    const matchedTerms: string[] = [];
    const quotes: EvidenceQuote[] = [];
    const pillarHits = new Array<number>(role.competency_pillars.length).fill(0);

    for (const p of prompts) {
      const lower = p.cleaned_text.toLowerCase();
      const effectiveTier: SkillTier =
        p.skill_tier ?? classifySkillTierClient(p.cleaned_text, p.word_count, p.signal_categories);
      const weight = tierDepthWeight(effectiveTier);
      let matched = false;

      for (const kw of role.skill_keywords) {
        if (lower.includes(kw)) {
          skillHits += 1;
          weightedSkill += weight;
          matched = true;
          if (matchedTerms.length < 5 && !matchedTerms.includes(kw)) matchedTerms.push(kw);
        }
      }
      for (const kw of role.energy_keywords) {
        if (lower.includes(kw)) {
          energyHits += 2;
          weightedEnergy += 2 * weight;
          matched = true;
          if (matchedTerms.length < 5 && !matchedTerms.includes(kw)) matchedTerms.push(kw);
        }
      }
      for (const kw of role.value_keywords) {
        if (lower.includes(kw)) {
          valueHits += 1;
          weightedValue += weight;
        }
      }
      for (const kw of role.burnout_conflict_keywords) {
        if (lower.includes(kw)) burnoutHits += 1;
      }

      role.competency_pillars.forEach((pillar, idx) => {
        if (pillar.kws.some((k) => lower.includes(k))) {
          pillarHits[idx] += 1;
        }
      });

      if (matched) {
        if (effectiveTier === "beginner") matchedTierCounts[0] += 1;
        else if (effectiveTier === "intermediate") matchedTierCounts[1] += 1;
        else matchedTierCounts[2] += 1;
      }

      if (matched && p.is_high_signal && quotes.length < 4 && p.word_count >= 12) {
        quotes.push({
          prompt_id: p.id,
          date: p.created_at.slice(0, 10),
          excerpt: p.cleaned_text.length > 220 ? `${p.cleaned_text.slice(0, 220)}…` : p.cleaned_text,
        });
      }
    }

    const totalMatchedPrompts =
      matchedTierCounts[0] + matchedTierCounts[1] + matchedTierCounts[2];

    let assessedSkillTier: SkillTier | null = null;
    if (skillHits > 0 || energyHits > 0 || valueHits > 0) {
      if (totalMatchedPrompts === 0) {
        assessedSkillTier = "beginner";
      } else {
        const tierScore =
          (matchedTierCounts[1] + 2 * matchedTierCounts[2]) / totalMatchedPrompts;
        if (tierScore < 0.65) assessedSkillTier = "beginner";
        else if (tierScore < 1.35) assessedSkillTier = "intermediate";
        else assessedSkillTier = "advanced";
      }
    }

    const scoreDim = (wHits: number, factor: number, tier: SkillTier | null) => {
      if (wHits <= 0 || !tier) return 0;
      const ratio = Math.min(1, wHits / (corpusScale * factor));
      if (tier === "beginner") {
        return Math.min(46, Math.max(18, Math.round(22 + 24 * ratio)));
      }
      if (tier === "intermediate") {
        return Math.min(72, Math.max(45, Math.round(48 + 24 * ratio)));
      }
      return Math.min(98, Math.max(56, Math.round(56 + 42 * ratio)));
    };

    const skillPct = scoreDim(weightedSkill, 2.1, assessedSkillTier);
    const energyPct = scoreDim(weightedEnergy, 1.3, assessedSkillTier);
    const valuesPct = scoreDim(weightedValue, 1.4, assessedSkillTier);
    const burnoutPct =
      burnoutHits === 0
        ? 8
        : Math.min(45, Math.max(10, Math.round(Math.min(0.45, burnoutHits / (corpusScale * 1.2)) * 100)));

    const overallFit =
      skillHits === 0 && energyHits === 0 && valueHits === 0
        ? 0
        : Math.min(
            98,
            Math.max(
              0,
              Math.round((0.35 * skillPct + 0.30 * energyPct + 0.20 * valuesPct) / 0.85 - 0.15 * burnoutPct)
            )
          );

    let assessed_tier = "No Demonstrated Evidence";
    let positioned_title = role.junior_title;
    let positioned_salary_usd = role.junior_salary_usd;
    let honest_positioning_rationale =
      "0 domain signals detected in your vault for this track. Positioned at baseline until concrete work samples are present.";

    if (assessedSkillTier === "beginner") {
      assessed_tier = "Beginner → Junior";
      positioned_title = role.junior_title;
      positioned_salary_usd = role.junior_salary_usd;
      honest_positioning_rationale = `Objectively scored at Junior (${matchedTierCounts[0]} Beginner / ${matchedTierCounts[1]} Intermediate / ${matchedTierCounts[2]} Advanced prompts). You touch domain keywords, but your prompts currently focus on foundational lookup or syntax rather than independent component or systems ownership.`;
    } else if (assessedSkillTier === "intermediate") {
      assessed_tier = "Intermediate → Mid-Level";
      positioned_title = role.mid_title;
      positioned_salary_usd = role.mid_salary_usd;
      honest_positioning_rationale = `Objectively scored at Mid-Level (${matchedTierCounts[1]} Intermediate / ${matchedTierCounts[2]} Advanced / ${matchedTierCounts[0]} Beginner prompts). You demonstrate solid component implementation and workflow wiring, but need more architectural tradeoff, scale, and unit-economics evidence for Senior/Staff.`;
    } else if (assessedSkillTier === "advanced") {
      assessed_tier = "Advanced → Senior / Staff";
      positioned_title = role.senior_title;
      positioned_salary_usd = role.senior_salary_usd;
      honest_positioning_rationale = `Objectively scored at Senior / Staff (${matchedTierCounts[2]} Advanced / ${matchedTierCounts[1]} Intermediate / ${matchedTierCounts[0]} Beginner prompts). Your prompts consistently frame problems around systems architecture, first-principles tradeoffs, and measurable leverage.`;
    }

    const identified_gaps: string[] = [];
    role.competency_pillars.forEach((pillar, idx) => {
      if (pillarHits[idx] === 0) {
        const sampleKws = pillar.kws.slice(0, 3).join(", ");
        identified_gaps.push(
          `Missing evidence in ${pillar.name} (0 prompts covering ${sampleKws})`
        );
      }
    });
    if (matchedTierCounts[2] === 0 && totalMatchedPrompts > 0) {
      identified_gaps.push(
        "Seniority Gap: 0 prompts in this track demonstrate multi-constraint tradeoff analysis, failure-mode bounding, or unit-economics modeling required for Senior/Staff."
      );
    }
    if (identified_gaps.length === 0) {
      identified_gaps.push(
        `Longitudinal Depth Gap: All 4 core pillars touched across ${prompts.length} prompt(s); sustain adversarial stress-testing and production post-mortems across 20+ sessions to harden Principal-level proof.`
      );
    }

    const tested_assumptions: string[] = [];
    if (matchedTierCounts[2] === 0 && totalMatchedPrompts > 0) {
      tested_assumptions.push(
        "Assumption Tested: Mentioning domain tools in prompts does not equate to Senior architectural readiness—scores are capped at Junior/Mid-Level until tradeoff & system-design prompts appear."
      );
    }
    if (burnoutHits > 0) {
      tested_assumptions.push(
        `Assumption Tested: You logged ${burnoutHits} maintenance/burnout friction signal(s); taking this role in an execution-only culture without automation authority will replicate past burnout.`
      );
    }
    if (valuesPct < skillPct) {
      tested_assumptions.push(
        `Assumption Tested: Technical skill overlap (${skillPct}%) exceeds explicit value alignment (${valuesPct}%)—verify you want the day-to-day operational accountability of this role, not just the title.`
      );
    }
    if (tested_assumptions.length === 0) {
      tested_assumptions.push(
        "Assumption Tested: High architectural alignment verified, but confirm whether you want hands-on Staff IC systems ownership vs. people-management overhead before targeting Director titles."
      );
    }

    const whyItFits =
      matchedTerms.length === 0
        ? role.why_it_fits_template
        : `${role.why_it_fits_template} Detected ${skillHits + energyHits + valueHits} recurring behavioral signals across your vault (${matchedTerms.join(", ")}).`;

    return {
      onet_code: role.onet_code,
      title: role.title,
      modern_titles: role.modern_titles,
      bucket: role.bucket,
      salary_range_usd: role.salary_range_usd,
      assessed_tier,
      positioned_title,
      positioned_salary_usd,
      honest_positioning_rationale,
      identified_gaps,
      tested_assumptions,
      overall_fit_pct: overallFit,
      skill_overlap_pct: skillPct,
      energy_alignment_pct: energyPct,
      values_match_pct: valuesPct,
      burnout_risk_pct: burnoutPct,
      why_it_fits: whyItFits,
      burnout_guardrail: role.burnout_guardrail,
      supporting_quotes: quotes,
    };
  });

  return results.sort((a, b) => b.overall_fit_pct - a.overall_fit_pct);
}

function loadBrowserPrompts(): NormalizedPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROMPTS_KEY);
    return raw ? (JSON.parse(raw) as NormalizedPrompt[]) : [];
  } catch {
    return [];
  }
}

function saveBrowserPrompts(prompts: NormalizedPrompt[]): void {
  try {
    localStorage.setItem(STORAGE_PROMPTS_KEY, JSON.stringify(prompts));
  } catch {
    // ignore storage errors
  }
}

function loadBrowserQuests(): EquityQuest[] {
  try {
    const raw = localStorage.getItem(STORAGE_QUESTS_KEY);
    return raw ? (JSON.parse(raw) as EquityQuest[]) : DEFAULT_QUESTS;
  } catch {
    return DEFAULT_QUESTS;
  }
}

function saveBrowserQuests(quests: EquityQuest[]): void {
  try {
    localStorage.setItem(STORAGE_QUESTS_KEY, JSON.stringify(quests));
  } catch {
    // ignore
  }
}

function loadBrowserJournals(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_JOURNALS_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function saveBrowserJournals(journals: JournalEntry[]): void {
  try {
    localStorage.setItem(STORAGE_JOURNALS_KEY, JSON.stringify(journals));
  } catch {
    // ignore
  }
}

function buildBrowserDashboard(): VaultDashboardPayload {
  const prompts = loadBrowserPrompts();
  const quests = loadBrowserQuests();
  const journals = loadBrowserJournals();
  const summary = summarizePromptsClient(prompts);
  const mirror_cards = buildMirrorCardsClient(prompts);
  const onet_matches = matchOnetPathsClient(prompts);

  return {
    db_path: "localStorage://clearspace_vault.db (Zero-Cloud Local Vault)",
    summary,
    mirror_cards,
    onet_matches,
    quests,
    journals,
    recent_high_signal_prompts: prompts.filter((p) => p.is_high_signal).slice(-40).reverse(),
  };
}

export async function getVaultDashboard(): Promise<VaultDashboardPayload> {
  if (isTauriRuntime()) {
    return invoke<VaultDashboardPayload>("get_vault_dashboard");
  }
  return buildBrowserDashboard();
}

export async function scanLocalVault(): Promise<VaultDashboardPayload> {
  if (isTauriRuntime()) {
    return invoke<VaultDashboardPayload>("scan_local_vault");
  }
  const { prompts } = parseMultiProviderClient(SAMPLE_MULTI_PROVIDER_EXPORT);
  const existing = loadBrowserPrompts();
  const map = new Map<string, NormalizedPrompt>();
  for (const p of existing) map.set(p.id, p);
  for (const p of prompts) map.set(p.id, p);
  saveBrowserPrompts(Array.from(map.values()));
  return buildBrowserDashboard();
}

export async function importExportedContent(
  rawContent: string
): Promise<{ summary: IngestionSummary; dashboard: VaultDashboardPayload }> {
  if (isTauriRuntime()) {
    const summary = await invoke<IngestionSummary>("import_exported_json", {
      jsonContent: rawContent,
    });
    const dashboard = await invoke<VaultDashboardPayload>("get_vault_dashboard");
    return { summary, dashboard };
  }
  const { prompts, summary } = parseMultiProviderClient(rawContent);
  const existing = loadBrowserPrompts();
  const map = new Map<string, NormalizedPrompt>();
  for (const p of existing) map.set(p.id, p);
  for (const p of prompts) map.set(p.id, p);
  saveBrowserPrompts(Array.from(map.values()));
  return { summary, dashboard: buildBrowserDashboard() };
}

export async function loadSampleMultiProviderVault(): Promise<VaultDashboardPayload> {
  await importExportedContent(SAMPLE_MULTI_PROVIDER_EXPORT);
  const sampleQuestIds = new Set([
    "q-reposition-architect",
    "q-focus-guardrail",
    "q-drop-linear-work",
  ]);
  if (isTauriRuntime()) {
    const current = await invoke<VaultDashboardPayload>("get_vault_dashboard");
    for (const q of current.quests) {
      if (sampleQuestIds.has(q.id) && !q.accepted) {
        await invoke<EquityQuest[]>("toggle_quest_state", {
          questId: q.id,
          field: "accepted",
        });
      }
    }
    return invoke<VaultDashboardPayload>("get_vault_dashboard");
  }
  const quests = loadBrowserQuests().map((q) =>
    sampleQuestIds.has(q.id) ? { ...q, accepted: true } : q
  );
  saveBrowserQuests(quests);
  return buildBrowserDashboard();
}

export async function resetLocalVault(): Promise<VaultDashboardPayload> {
  if (isTauriRuntime()) {
    return invoke<VaultDashboardPayload>("reset_local_vault");
  }
  saveBrowserPrompts([]);
  const resetQuests = DEFAULT_QUESTS.map((q) => ({ ...q, accepted: false, completed: false }));
  saveBrowserQuests(resetQuests);
  return buildBrowserDashboard();
}

export async function toggleQuestState(
  questId: string,
  field: "accepted" | "completed"
): Promise<EquityQuest[]> {
  if (isTauriRuntime()) {
    return invoke<EquityQuest[]>("toggle_quest_state", { questId, field });
  }
  const quests = loadBrowserQuests().map((q) =>
    q.id === questId ? { ...q, [field]: !q[field] } : q
  );
  saveBrowserQuests(quests);
  return quests;
}

export async function addJournalEntry(
  promptQuestion: string,
  reflectionText: string,
  moodValence: string
): Promise<JournalEntry[]> {
  if (isTauriRuntime()) {
    return invoke<JournalEntry[]>("add_journal_entry", {
      promptQuestion,
      reflectionText,
      moodValence,
    });
  }
  const existing = loadBrowserJournals();
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const entry: JournalEntry = {
    id: Date.now(),
    created_at: now,
    prompt_question: promptQuestion,
    reflection_text: reflectionText,
    mood_valence: moodValence,
  };
  const updated = [entry, ...existing];
  saveBrowserJournals(updated);
  return updated;
}
