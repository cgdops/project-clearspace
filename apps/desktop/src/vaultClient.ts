import { invoke } from "@tauri-apps/api/core";

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
    for (const c of p.signal_categories) {
      catMap.set(c, (catMap.get(c) ?? 0) + 1);
    }
    const label = sourceDisplayLabel(p.source);
    srcMap.set(label, (srcMap.get(label) ?? 0) + 1);
  }

  const category_counts = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  const source_counts = Array.from(srcMap.entries()).sort((a, b) => b[1] - a[1]);

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
  };
}

function buildMirrorCardsClient(prompts: NormalizedPrompt[]): MirrorInsightCard[] {
  if (prompts.length === 0) return [];

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
    if (hits === 0) return 68;
    const norm = Math.min(1, hits / Math.max(2, prompts.length * 0.25));
    return Math.min(98, Math.max(72, Math.round(76 + 22 * norm)));
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
      summary: `Across ${Math.max(1, tool.hits)} matching prompts, when you encounter friction or manual overhead, you instinctively step back to design a reusable software tool, schema, or automated pipeline rather than grinding through repetitive tasks.`,
      confidence_pct: calcConf(tool.hits),
      pinned: true,
      quotes: tool.quotes,
    },
    {
      id: "card-bilingual-empathy",
      category: "Superpower",
      title: "Bilingual Translation: Systems Depth → Clear Human Value",
      summary: `Identified across ${Math.max(1, empathy.hits)} prompts: you bridge backend systems architecture with clear, human-centered positioning so stakeholders and end-users immediately grasp the practical outcome without jargon.`,
      confidence_pct: calcConf(empathy.hits),
      pinned: true,
      quotes: empathy.quotes,
    },
    {
      id: "card-values-anchor",
      category: "Core Value",
      title: "Autonomy, Sustainable Stability & High-Leverage Ownership",
      summary: `Synthesized from ${Math.max(1, values.hits)} value-signal reflections: your core motivation centers on building durable personal equity, household stability, and authentic work aligned with your natural strengths.`,
      confidence_pct: calcConf(values.hits),
      pinned: true,
      quotes: values.quotes,
    },
    {
      id: "card-burnout-trigger",
      category: "Burnout Trigger",
      title: "The Repetitive Manual Maintenance Trap",
      summary: `Detected ${burnout.hits} friction signals: energy drain in your prompt archive correlates strongly with linear, repetitive asset maintenance or fragmented context-switching rather than 1-to-Many systems design.`,
      confidence_pct: calcConf(burnout.hits),
      pinned: true,
      quotes: burnout.quotes,
    },
    {
      id: "card-grill-me",
      category: "Cognitive Rhythm",
      title: "First-Principles Truth-Seeking & Dialectical Verification",
      summary: `With ${Math.max(1, skeptic.hits)} skeptical inquiry signals, you use AI as a dialectical sparring partner to stress-test assumptions from first principles before committing engineering effort.`,
      confidence_pct: calcConf(skeptic.hits),
      pinned: true,
      quotes: skeptic.quotes,
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
      bucket: "Immediate High-Leverage Upgrade",
      salary_range_usd: "$145,000 – $185,000",
      why_it_fits_template:
        "Your prompt history shows a strong focus on replacing manual operational bottlenecks with programmatic 1-to-Many pipelines, automated data workflows, and measurable unit economics.",
      burnout_guardrail:
        "Avoid roles where you are treated as a ticket-taking execution coordinator; require architectural ownership over the automation stack.",
      skill_keywords: ["seo", "pseo", "n8n", "automation", "api", "pipeline", "architecture", "system", "scale", "telemetry"],
      energy_keywords: ["unfair advantage", "specialize", "compound", "velocity", "automat", "scale", "system", "optimize"],
      value_keywords: ["efficiency", "costs", "stability", "benefits", "clear", "simple", "impact", "autonomy"],
      burnout_conflict_keywords: ["manual maintenance", "repetitive", "hand-editing", "tedious"],
    },
    {
      onet_code: "15-1252.00",
      title: "Software Developers, Tools & Platforms",
      modern_titles: [
        "Developer Experience (DX) & AI Tooling Engineer",
        "Forward-Deployed AI Solutions Engineer",
        "Internal Tools & Agentic Workflow Architect",
      ],
      bucket: "Immediate High-Leverage Upgrade",
      salary_range_usd: "$150,000 – $195,000",
      why_it_fits_template:
        "Whenever you encounter a workflow bottleneck, your immediate reflex is to design a custom developer tool, schema, or agentic workflow while translating complex architecture into clear human value.",
      burnout_guardrail:
        "Stay focused on the reusable tooling and platform layer rather than repetitive manual asset or ticket production.",
      skill_keywords: ["agent", "mcp", "editor", "tool", "token", "model", "database", "sqlite", "graph", "workflow", "rust", "schema"],
      energy_keywords: ["build a tool", "fast", "spin up", "prototype", "architect", "design", "solve"],
      value_keywords: ["skeptic", "worth solving", "honestly", "first principles", "clarity"],
      burnout_conflict_keywords: ["burnout", "so much work", "boilerplate", "manual"],
    },
    {
      onet_code: "15-1255.01",
      title: "Interactive Systems & Companion Platform Architects",
      modern_titles: [
        "Interactive Ecosystem & Companion Platform Lead",
        "Technical Growth PM — Interactive Media & Simulation",
        "Simulation Tools & Economy Systems Designer",
      ],
      bucket: "Hidden Natural Fit (Unexplored Path)",
      salary_range_usd: "$135,000 – $175,000",
      why_it_fits_template:
        "Your deep-flow prompts frequently explore interactive state machines, simulation economies, routing algorithms, and telemetry-driven companion tools—blending systems engineering with user engagement.",
      burnout_guardrail:
        "Do not enter through manual content or asset grinding; lead through Companion Platforms, Data Telemetry, or Systems Design.",
      skill_keywords: ["game", "quest", "route", "economy", "balance", "simulation", "interactive", "state", "telemetry"],
      energy_keywords: ["designing", "building", "playing", "optimizing", "flow", "deep"],
      value_keywords: ["fun", "immersive", "player", "community", "guide", "craft", "creative"],
      burnout_conflict_keywords: ["manual maintenance", "asset grind", "repetitive"],
    },
    {
      onet_code: "11-2021.00",
      title: "Technical Product & Growth Strategy Directors",
      modern_titles: [
        "Head of AI Growth & Product-Led Acquisition",
        "VP / Director of Technical Growth & GTM Engineering",
        "Founder — Productized B2B Automation & Open-Core Software",
      ],
      bucket: "5-Year North Star Track",
      salary_range_usd: "$180,000 – $250,000+ (or Equity / ARR)",
      why_it_fits_template:
        "You naturally synthesize systems engineering, unit economics, buyer psychology, and adversarial truth-seeking. Over a 5-year horizon, owning both product architecture and organic distribution compounds your personal equity fastest.",
      burnout_guardrail:
        "Protect your cognitive bandwidth by focusing on 1 flagship product and 1 automated distribution engine at a time, eliminating fragmented ad-hoc client work.",
      skill_keywords: ["product", "pricing", "icp", "competitor", "market", "business", "client", "strategy", "positioning", "growth"],
      energy_keywords: ["niche", "unfair advantage", "vision", "big picture", "compound", "strategy", "leader"],
      value_keywords: ["authentic", "stability", "home", "equity", "journey", "clarity", "autonomy"],
      burnout_conflict_keywords: ["adhoc", "fragmented", "conflicting", "context switching"],
    },
  ];

  if (prompts.length === 0) {
    return catalog.map((r) => ({
      onet_code: r.onet_code,
      title: r.title,
      modern_titles: r.modern_titles,
      bucket: r.bucket,
      salary_range_usd: r.salary_range_usd,
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
    const matchedTerms: string[] = [];
    const quotes: EvidenceQuote[] = [];

    for (const p of prompts) {
      const lower = p.cleaned_text.toLowerCase();
      let matched = false;
      for (const kw of role.skill_keywords) {
        if (lower.includes(kw)) {
          skillHits += 1;
          matched = true;
          if (matchedTerms.length < 5 && !matchedTerms.includes(kw)) matchedTerms.push(kw);
        }
      }
      for (const kw of role.energy_keywords) {
        if (lower.includes(kw)) {
          energyHits += 2;
          matched = true;
          if (matchedTerms.length < 5 && !matchedTerms.includes(kw)) matchedTerms.push(kw);
        }
      }
      for (const kw of role.value_keywords) {
        if (lower.includes(kw)) valueHits += 1;
      }
      for (const kw of role.burnout_conflict_keywords) {
        if (lower.includes(kw)) burnoutHits += 1;
      }
      if (matched && p.is_high_signal && quotes.length < 4 && p.word_count >= 12) {
        quotes.push({
          prompt_id: p.id,
          date: p.created_at.slice(0, 10),
          excerpt: p.cleaned_text.length > 220 ? `${p.cleaned_text.slice(0, 220)}…` : p.cleaned_text,
        });
      }
    }

    const scoreDim = (hits: number, factor: number) => {
      if (hits === 0) return 0;
      const ratio = Math.min(1, hits / (corpusScale * factor));
      return Math.min(98, Math.max(0, Math.round(52 + 46 * ratio)));
    };

    const skillPct = scoreDim(skillHits, 2.1);
    const energyPct = scoreDim(energyHits, 1.3);
    const valuesPct = scoreDim(valueHits, 1.4);
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
