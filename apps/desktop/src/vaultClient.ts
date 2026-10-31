import { invoke } from "@tauri-apps/api/core";

export type SkillTier = "beginner" | "intermediate" | "advanced";

export interface ManifestFileLink {
  filename: string;
  category: string;
  export_url: string;
  size_bytes: number;
}

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
  daily_counts?: [string, number][];
  detected_format: string;
  warnings: string[];
  manifest_links: ManifestFileLink[];
}

export interface FileImportReport {
  file_name: string;
  status: "imported" | "manifest_ready" | "empty" | "error";
  detected_format: string;
  raw_prompts_scanned: number;
  clean_prompts_kept: number;
  new_prompts_added: number;
  noise_filtered_out: number;
  duplicates_removed: number;
  redactions_made: number;
  sources: string[];
  warnings: string[];
  manifest_links: ManifestFileLink[];
  error_message?: string;
}

export interface BatchImportReport {
  timestamp_iso: string;
  files_processed: number;
  total_raw_scanned: number;
  total_clean_kept: number;
  total_new_added: number;
  total_noise_filtered: number;
  total_duplicates_skipped: number;
  total_redactions: number;
  file_reports: FileImportReport[];
}

export interface QuoteCitation {
  date: string;
  convo_id: string;
  text: string;
}

export type StoryChapterKey = "excel" | "grow" | "friction";

export interface MirrorInsightCard {
  id: string;
  category: string;
  story_chapter?: StoryChapterKey;
  story_chapter_title?: string;
  title: string;
  summary: string;
  confidence_pct: number;
  pinned: boolean;
  quotes: QuoteCitation[];
  assessed_tier?: string;
  assumption_challenged?: string;
  identified_gap?: string;
}

export interface UserProfile {
  name: string;
  avatar_data_url: string | null;
  theme_mode: "light" | "dark";
  mirror_story_completed: boolean;
  shortlisted_onet_codes: string[];
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

export interface AppUpdateStatus {
  installed_version: string;
  schema_version: number;
  last_backup_path: string | null;
  last_migrated_at: string | null;
}

export interface UpdateCheckResult {
  installed_version: string;
  latest_version: string;
  schema_version: number;
  update_available: boolean;
  release_notes: string;
  pub_date: string;
  download_url: string | null;
  sha256: string | null;
  checked_at: string;
}

export interface VaultDashboardPayload {
  db_path: string;
  profile: UserProfile;
  summary: IngestionSummary;
  mirror_cards: MirrorInsightCard[];
  onet_matches: RoleMatchResult[];
  quests: EquityQuest[];
  journals: JournalEntry[];
  recent_high_signal_prompts?: NormalizedPrompt[];
  update_status?: AppUpdateStatus;
}

const STORAGE_PROMPTS_KEY = "clearspace_vault_prompts_v1";
const STORAGE_QUESTS_KEY = "clearspace_vault_quests_v1";
const STORAGE_JOURNALS_KEY = "clearspace_vault_journals_v1";
const STORAGE_PROFILE_KEY = "clearspace_user_profile_v1";
const STORAGE_BACKUP_META_KEY = "clearspace_vault_backup_meta_v1";

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "",
  avatar_data_url: null,
  theme_mode: "light",
  mirror_story_completed: false,
  shortlisted_onet_codes: [],
};

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
    create_time: 1771101000.0,
    mapping: {
      "node-1": {
        message: {
          author: { role: "user" },
          create_time: 1771101000.0,
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
          create_time: 1771191000.0,
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

function stripHtmlTagsClient(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMessageContentTextClient(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    const parts: string[] = [];
    for (const part of val) {
      if (typeof part === "string" && part.trim()) {
        parts.push(part);
      } else if (part && typeof part === "object") {
        const obj = part as Record<string, unknown>;
        const partType = typeof obj.type === "string" ? obj.type : "text";
        if (partType === "text" || partType === "input_text" || !obj.type) {
          if (typeof obj.text === "string" && obj.text.trim()) {
            parts.push(obj.text);
          } else if (typeof obj.content === "string" && obj.content.trim()) {
            parts.push(obj.content);
          }
        }
      }
    }
    return parts.join("\n");
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.parts)) {
      return extractMessageContentTextClient(obj.parts);
    }
    if (typeof obj.text === "string") {
      return obj.text;
    }
  }
  return "";
}

function isKnownConversationItemClient(obj: Record<string, unknown>): boolean {
  return Boolean(
    Array.isArray(obj.chat_messages) ||
      Array.isArray(obj.messages) ||
      (obj.mapping && typeof obj.mapping === "object") ||
      Array.isArray(obj.conversation_turns) ||
      (obj.user_turn && typeof obj.user_turn === "object") ||
      typeof obj.title === "string" ||
      typeof obj.header === "string" ||
      obj.gemini_activity !== undefined ||
      typeof obj.prompt === "string" ||
      typeof obj.text === "string" ||
      typeof obj.prompt_template === "string" ||
      Array.isArray(obj.docs)
  );
}

export function parseMultiProviderClient(rawInput: string): {
  prompts: NormalizedPrompt[];
  summary: IngestionSummary;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Empty import file");
  }

  const seenHashes = new Set<string>();
  const prompts: NormalizedPrompt[] = [];
  const warnings: string[] = [];
  const manifestLinks: ManifestFileLink[] = [];
  let detectedFormat = "Multi-Provider Export";
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

  if (trimmed.startsWith("<")) {
    // HTML export handling (OpenAI ChatGPT chat.html, Google Gemini Gems HTML, or empty HTML)
    const markerIdx = trimmed.indexOf("var jsonData =");
    if (markerIdx !== -1) {
      const afterMarker = trimmed.slice(markerIdx + "var jsonData =".length).trimStart();
      const scriptEnd = afterMarker.indexOf("</script>");
      if (scriptEnd !== -1) {
        const jsonSlice = afterMarker.slice(0, scriptEnd).trim().replace(/;$/, "").trim();
        if (jsonSlice.startsWith("[") || jsonSlice.startsWith("{")) {
          const inner = parseMultiProviderClient(jsonSlice);
          inner.summary.detected_format = "OpenAI ChatGPT HTML Export (chat.html)";
          return inner;
        }
      }
    }

    if (trimmed.includes("<b>Name:</b>") && trimmed.includes("<b>Instructions:</b>")) {
      detectedFormat = "Google Gemini Gems HTML Export";
      const chunks = trimmed.split("<b>Name:</b>").slice(1);
      filesScanned = Math.max(chunks.length, 1);
      chunks.forEach((chunk, idx) => {
        const afterName = chunk.replace(/^(?:\s*<br\s*\/?>\s*)+/i, "");
        const nameEnd = afterName.indexOf("<br>");
        const gemName = nameEnd !== -1 ? stripHtmlTagsClient(afterName.slice(0, nameEnd)) : `Gem ${idx + 1}`;
        const instrMarker = "<b>Instructions:</b>";
        const instrStart = chunk.indexOf(instrMarker);
        let instructions = "";
        if (instrStart !== -1) {
          const afterInstr = chunk
            .slice(instrStart + instrMarker.length)
            .replace(/^(?:\s*<br\s*\/?>\s*)+/i, "");
          const timeMarkerIdx = afterInstr.indexOf("<b>Creation Time:</b>");
          const endDivIdx = afterInstr.indexOf("</div>");
          const stopIdx =
            timeMarkerIdx !== -1
              ? timeMarkerIdx
              : endDivIdx !== -1
              ? endDivIdx
              : afterInstr.length;
          instructions = stripHtmlTagsClient(afterInstr.slice(0, stopIdx));
        }
        let createdAt = "2026-02-15T20:00:00Z";
        const timeMarker = "<b>Creation Time:</b>";
        const timeStart = chunk.indexOf(timeMarker);
        if (timeStart !== -1) {
          const afterTime = chunk
            .slice(timeStart + timeMarker.length)
            .replace(/^(?:\s*<br\s*\/?>\s*)+/i, "");
          const endBr = afterTime.indexOf("<br>");
          const rawTime = stripHtmlTagsClient(endBr !== -1 ? afterTime.slice(0, endBr) : afterTime);
          if (rawTime) {
            createdAt = normalizeTimestampClient(rawTime);
          }
        }
        if (instructions.trim()) {
          pushPrompt(
            `Gemini Custom Gem (${gemName}): ${instructions}`,
            createdAt,
            `gemini-gem-${idx + 1}`,
            "gemini_takeout"
          );
        }
      });
    } else {
      const stripped = stripHtmlTagsClient(trimmed);
      if (!stripped) {
        detectedFormat = "Empty HTML Export (0 records)";
        warnings.push("This HTML export file contains an empty container (<div></div>) with 0 prompt records.");
      } else {
        detectedFormat = "HTML Document Export";
        pushPrompt(stripped, "2026-02-15T20:00:00Z", "html-doc-1", "markdown_journal");
      }
    }
  } else if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
    detectedFormat = "Markdown / Text Reflective Document";
    let currentDate = "2026-02-15T20:00:00Z";
    let bodySource = trimmed;
    if (trimmed.startsWith("---")) {
      const endMatch = trimmed.slice(3).match(/\r?\n---\r?\n/);
      if (endMatch && endMatch.index !== undefined) {
        const frontmatter = trimmed.slice(3, 3 + endMatch.index);
        for (const fmLine of frontmatter.split(/\r?\n/)) {
          const dm = fmLine.trim().match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/i);
          if (dm) {
            currentDate = `${dm[1]}T20:00:00Z`;
          }
        }
        bodySource = trimmed.slice(3 + endMatch.index + endMatch[0].length);
      }
    }

    const paragraphs = bodySource.split(/\n\s*\n/);
    for (const block of paragraphs) {
      const lines = block.split("\n");
      const bodyLines: string[] = [];
      for (const l of lines) {
        const trimmedLine = l.trim();
        if (!trimmedLine || trimmedLine === "---") continue;
        const hm = trimmedLine.match(/^#{1,4}\s*(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})?)/);
        if (hm) {
          const dt = hm[1].replace(" ", "T");
          currentDate = dt.includes("T") ? `${dt}:00Z` : `${dt}T20:00:00Z`;
        } else {
          const cleanLine = trimmedLine.replace(/^[#*>-]+\s*/, "");
          if (cleanLine) bodyLines.push(cleanLine);
        }
      }
      if (bodyLines.length > 0) {
        pushPrompt(bodyLines.join(" "), currentDate, "md-journal", "markdown_journal");
      }
    }
  } else {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Expected JSON array or conversation container object");
    }

    // Detect Anthropic Claude Export Batch Manifest (e.g. anthropic_data_*.json or manifest-*.json)
    if (!Array.isArray(parsed) && Array.isArray(parsed.data_files)) {
      detectedFormat = "Anthropic Claude Export Manifest";
      for (const df of parsed.data_files as Record<string, unknown>[]) {
        const filename = typeof df.filename === "string" ? df.filename : "unknown";
        const category = typeof df.category === "string" ? df.category : "unknown";
        const export_url = typeof df.export_url === "string" ? df.export_url : "";
        const size_bytes = typeof df.size_bytes === "number" ? df.size_bytes : 0;
        manifestLinks.push({ filename, category, export_url, size_bytes });
      }
      const fileList = manifestLinks
        .map((m) => `${m.filename} (${m.category}, ${m.size_bytes} bytes)`)
        .join(", ");
      warnings.push(
        `Anthropic Export Batch Manifest detected (${manifestLinks.length} linked archives: ${fileList}). This file is a download index containing 'export_url' links rather than the conversation text itself. Download and import 'conversations-000.zip' (or 'conversations.json' / 'projects.json' inside it) using the links below.`
      );
      const summary = summarizePromptsClient(
        prompts,
        1,
        0,
        0,
        0,
        detectedFormat,
        warnings,
        manifestLinks
      );
      return { prompts, summary };
    }

    let items: Record<string, unknown>[];
    if (Array.isArray(parsed)) {
      items = parsed as Record<string, unknown>[];
    } else if (Array.isArray(parsed.conversations)) {
      detectedFormat = "Multi-Provider Conversations JSON";
      items = parsed.conversations as Record<string, unknown>[];
    } else if (Array.isArray(parsed.activities)) {
      detectedFormat = "Google Takeout Activities JSON";
      items = parsed.activities as Record<string, unknown>[];
    } else if (Array.isArray(parsed.conversation_turns)) {
      detectedFormat = "Google Gemini in Workspace Conversation History";
      items = parsed.conversation_turns as Record<string, unknown>[];
    } else if (Array.isArray(parsed.items)) {
      items = parsed.items as Record<string, unknown>[];
    } else if (Array.isArray(parsed.data)) {
      items = parsed.data as Record<string, unknown>[];
    } else if (isKnownConversationItemClient(parsed as Record<string, unknown>)) {
      items = [parsed as Record<string, unknown>];
    } else {
      throw new Error("Expected JSON array or conversation container object");
    }

    filesScanned = Math.max(items.length, 1);

    items.forEach((item, idx) => {
      if (!item || typeof item !== "object") return;
      const convoId = String(item.uuid || item.id || item.conversation_id || `export-${idx + 1}`);
      const fallbackTs = normalizeTimestampClient(
        item.created_at ?? item.create_time ?? item.time ?? item.timestamp ?? item.turn_last_modified
      );

      if (Array.isArray(item.chat_messages)) {
        if (detectedFormat === "Multi-Provider Export") {
          detectedFormat = "Anthropic Claude Conversations (conversations.json)";
        }
        const msgs = item.chat_messages as Record<string, unknown>[];
        for (const msg of msgs) {
          const sender = String(msg.sender || msg.role || "").toLowerCase();
          if (sender !== "human" && sender !== "user") continue;
          const text =
            typeof msg.text === "string" && msg.text.trim()
              ? msg.text
              : extractMessageContentTextClient(msg.content);
          const ts = normalizeTimestampClient(msg.created_at ?? msg.create_time ?? msg.updated_at) || fallbackTs;
          if (text.trim()) {
            pushPrompt(text, ts, convoId, "claude_web");
          }
        }
      } else if (item.mapping && typeof item.mapping === "object") {
        if (detectedFormat === "Multi-Provider Export") {
          detectedFormat = "OpenAI ChatGPT Conversations (conversations.json)";
        }
        const mapping = item.mapping as Record<string, Record<string, unknown>>;
        for (const node of Object.values(mapping)) {
          const message = node?.message as Record<string, unknown> | undefined;
          if (!message) continue;
          const author = message.author as Record<string, unknown> | undefined;
          const role = String(author?.role || message.role || "").toLowerCase();
          if (role !== "user" && role !== "human") continue;
          const content = message.content;
          const text =
            extractMessageContentTextClient(content) ||
            (typeof message.text === "string" ? message.text : "");
          const ts = normalizeTimestampClient(message.create_time ?? message.created_at) || fallbackTs;
          if (text.trim()) {
            pushPrompt(text, ts, convoId, "chat_gpt_web");
          }
        }
      } else if (Array.isArray(item.messages)) {
        const msgs = item.messages as Record<string, unknown>[];
        const isClaude = msgs.some((m) => typeof m?.sender === "string");
        const provider = isClaude ? "claude_web" : "chat_gpt_web";
        if (detectedFormat === "Multi-Provider Export") {
          detectedFormat = isClaude
            ? "Anthropic Claude Messages JSON"
            : "OpenAI ChatGPT Messages JSON";
        }
        for (const msg of msgs) {
          const authorObj = msg.author as Record<string, unknown> | undefined;
          const sender = String(msg.sender || msg.role || authorObj?.role || "").toLowerCase();
          if (sender !== "human" && sender !== "user") continue;
          const text =
            typeof msg.text === "string" && msg.text.trim()
              ? msg.text
              : extractMessageContentTextClient(msg.content);
          const ts = normalizeTimestampClient(msg.created_at ?? msg.create_time) || fallbackTs;
          if (text.trim()) {
            pushPrompt(text, ts, convoId, provider);
          }
        }
      } else if (Array.isArray(item.conversation_turns)) {
        detectedFormat = "Google Gemini in Workspace Conversation History";
        const turns = item.conversation_turns as Record<string, unknown>[];
        turns.forEach((turn, tIdx) => {
          const turnTs = normalizeTimestampClient(turn.turn_last_modified ?? turn.created_at) || fallbackTs;
          const userTurn = turn.user_turn as Record<string, unknown> | undefined;
          if (userTurn && typeof userTurn.prompt === "string" && userTurn.prompt.trim()) {
            pushPrompt(userTurn.prompt, turnTs, `${convoId}-turn-${tIdx + 1}`, "gemini_takeout");
          }
        });
      } else if (item.user_turn && typeof item.user_turn === "object") {
        detectedFormat = "Google Gemini in Workspace Conversation History";
        const userTurn = item.user_turn as Record<string, unknown>;
        if (typeof userTurn.prompt === "string" && userTurn.prompt.trim()) {
          pushPrompt(userTurn.prompt, fallbackTs, convoId, "gemini_takeout");
        }
      } else if (
        typeof item.prompt_template === "string" ||
        Array.isArray(item.docs)
      ) {
        if (detectedFormat === "Multi-Provider Export") {
          detectedFormat = "Anthropic Claude Projects (projects.json)";
        }
        const projectName = typeof item.name === "string" ? item.name : "Claude Project";
        if (typeof item.prompt_template === "string" && item.prompt_template.trim()) {
          pushPrompt(
            `Claude Project (${projectName}) Instructions: ${item.prompt_template.trim()}`,
            fallbackTs,
            convoId,
            "claude_web"
          );
        }
        if (typeof item.description === "string" && item.description.trim()) {
          pushPrompt(
            `Claude Project (${projectName}) Description: ${item.description.trim()}`,
            fallbackTs,
            convoId,
            "claude_web"
          );
        }
        if (Array.isArray(item.docs)) {
          for (const doc of item.docs as Record<string, unknown>[]) {
            if (typeof doc.content === "string" && doc.content.trim()) {
              const docTitle = typeof doc.filename === "string" ? doc.filename : "Doc";
              const docTs = normalizeTimestampClient(doc.created_at) || fallbackTs;
              pushPrompt(`Claude Project Doc (${docTitle}): ${doc.content.trim()}`, docTs, convoId, "claude_web");
            }
          }
        }
      } else if (
        typeof item.title === "string" ||
        typeof item.header === "string" ||
        item.gemini_activity
      ) {
        if (detectedFormat === "Multi-Provider Export") {
          detectedFormat = "Google Takeout Gemini Activity (MyActivity.json)";
        }
        const rawTitle = typeof item.title === "string" ? item.title.trim() : "";
        const lowerTitle = rawTitle.toLowerCase();
        const isSystemEvent =
          lowerTitle.startsWith("cleared ") ||
          lowerTitle.startsWith("created gemini canvas") ||
          lowerTitle.startsWith("selected preferred draft") ||
          lowerTitle.startsWith("used gemini apps") ||
          lowerTitle.startsWith("gave feedback") ||
          lowerTitle.startsWith("opened ") ||
          lowerTitle === "gemini apps";

        if (isSystemEvent) {
          totalRaw += 1;
          noiseFiltered += 1;
          return;
        }

        const stripped = rawTitle
          .replace(/^Prompted\s+/i, "")
          .replace(/^Asked\s+/i, "")
          .replace(/^Submitted prompt:\s*/i, "")
          .replace(/^Branched\s+/i, "")
          .replace(/^Added chat from link:\s*/i, "")
          .trim();

        const subtitleParts: string[] = [];
        if (Array.isArray(item.subtitles)) {
          for (const sub of item.subtitles as Record<string, unknown>[]) {
            const s = typeof sub?.name === "string" ? sub.name.trim() : "";
            const sl = s.toLowerCase();
            if (
              !s ||
              sl.startsWith("from ") ||
              sl.endsWith("generated image.") ||
              sl.endsWith("generated images.") ||
              sl.startsWith("attached ") ||
              sl.startsWith("audio included") ||
              sl.startsWith("http://") ||
              sl.startsWith("https://") ||
              sl.startsWith("<p>") ||
              sl.startsWith("<div") ||
              sl.startsWith("<ul")
            ) {
              continue;
            }
            subtitleParts.push(s);
          }
        }

        const combined =
          stripped && subtitleParts.length > 0
            ? `${stripped}\n${subtitleParts.join("\n")}`
            : stripped || subtitleParts.join("\n");

        const ts = normalizeTimestampClient(item.time ?? item.timestamp ?? item.created_at) || fallbackTs;
        if (combined.trim()) {
          pushPrompt(combined, ts, convoId, "gemini_takeout");
        }
      } else if (typeof item.prompt === "string" || typeof item.text === "string") {
        const text = String(item.prompt || item.text);
        pushPrompt(text, fallbackTs, convoId, "markdown_journal");
      }
    });
  }

  if (prompts.length === 0 && warnings.length === 0) {
    warnings.push(
      `0 qualifying prompts were kept from this file (${totalRaw} raw entries scanned, ${noiseFiltered} filtered as short/system noise).`
    );
  }

  const summary = summarizePromptsClient(
    prompts,
    filesScanned,
    totalRaw,
    noiseFiltered,
    duplicatesRemoved,
    detectedFormat,
    warnings,
    manifestLinks
  );
  return { prompts, summary };
}

function summarizePromptsClient(
  prompts: NormalizedPrompt[],
  filesScanned?: number,
  totalRaw?: number,
  noiseFiltered = 0,
  duplicatesRemoved = 0,
  detectedFormat = "Local Vault",
  warnings: string[] = [],
  manifestLinks: ManifestFileLink[] = []
): IngestionSummary {
  const sorted = [...prompts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hourly = new Array<number>(24).fill(0);
  const tier_counts: [number, number, number] = [0, 0, 0];
  const catMap = new Map<string, number>();
  const srcMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  const convos = new Set<string>();
  let highSignal = 0;
  let redactions = 0;

  for (const p of sorted) {
    convos.add(p.conversation_id);
    redactions += p.redactions_made;
    if (p.is_high_signal) highSignal += 1;
    const trimmedDt = p.created_at.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmedDt)) {
      const dayKey = trimmedDt.slice(0, 10);
      dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
    }
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
  const daily_counts = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

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
    daily_counts,
    detected_format: detectedFormat,
    warnings,
    manifest_links: manifestLinks,
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
      story_chapter: "excel",
      story_chapter_title: "1. Where You Currently Excel",
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
      story_chapter: "excel",
      story_chapter_title: "1. Where You Currently Excel",
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
      story_chapter: "grow",
      story_chapter_title: "2. Where We Think You Could Grow",
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
      story_chapter: "friction",
      story_chapter_title: "3. What Is Causing You Friction",
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
      story_chapter: "grow",
      story_chapter_title: "2. Where We Think You Could Grow",
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

function loadBrowserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (!raw) return { ...DEFAULT_USER_PROFILE };
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      avatar_data_url: typeof parsed.avatar_data_url === "string" ? parsed.avatar_data_url : null,
      theme_mode: parsed.theme_mode === "dark" ? "dark" : "light",
      mirror_story_completed: Boolean(parsed.mirror_story_completed),
      shortlisted_onet_codes: Array.isArray(parsed.shortlisted_onet_codes)
        ? parsed.shortlisted_onet_codes
        : [],
    };
  } catch {
    return { ...DEFAULT_USER_PROFILE };
  }
}

function saveBrowserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export async function updateUserProfile(
  partial: Partial<UserProfile>
): Promise<UserProfile> {
  if (isTauriRuntime()) {
    const current = (await invoke<VaultDashboardPayload>("get_vault_dashboard")).profile;
    const next: UserProfile = {
      ...current,
      ...partial,
    };
    return invoke<UserProfile>("update_user_profile", { profile: next });
  }
  const current = loadBrowserProfile();
  const next: UserProfile = {
    ...current,
    ...partial,
  };
  saveBrowserProfile(next);
  return next;
}

function loadBrowserUpdateStatus(): AppUpdateStatus {
  try {
    const raw = localStorage.getItem(STORAGE_BACKUP_META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      installed_version: "0.2.0",
      schema_version: 2,
      last_backup_path: parsed?.last_backup_path ?? null,
      last_migrated_at: parsed?.last_migrated_at ?? "2026-10-30 00:00",
    };
  } catch {
    return {
      installed_version: "0.2.0",
      schema_version: 2,
      last_backup_path: null,
      last_migrated_at: "2026-10-30 00:00",
    };
  }
}

function buildBrowserDashboard(): VaultDashboardPayload {
  const profile = loadBrowserProfile();
  const prompts = loadBrowserPrompts();
  const quests = loadBrowserQuests();
  const journals = loadBrowserJournals();
  const summary = summarizePromptsClient(prompts);
  const mirror_cards = buildMirrorCardsClient(prompts);
  const onet_matches = matchOnetPathsClient(prompts);

  return {
    db_path: "localStorage://clearspace_vault.db (Zero-Cloud Local Vault)",
    profile,
    summary,
    mirror_cards,
    onet_matches,
    quests,
    journals,
    recent_high_signal_prompts: prompts.filter((p) => p.is_high_signal).slice(-40).reverse(),
    update_status: loadBrowserUpdateStatus(),
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

const BINARY_MEDIA_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".wav",
  ".mp3",
  ".mp4",
  ".mov",
  ".avi",
  ".ogg",
  ".pdf",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".exe",
  ".dll",
  ".bin",
]);

function isBinaryMediaFilename(name: string): boolean {
  const lower = name.toLowerCase();
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx === -1) return false;
  return BINARY_MEDIA_EXTENSIONS.has(lower.slice(dotIdx));
}

export async function extractZipTextEntriesClient(
  arrayBuffer: ArrayBuffer
): Promise<{ entries: Array<{ name: string; content: string }>; skippedBinaryCount: number }> {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minEocdSearch = Math.max(0, bytes.length - 65558);
  for (let i = bytes.length - 22; i >= minEocdSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("Invalid or unsupported ZIP archive (EOCD header not found)");
  }

  const cdCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let pos = cdOffset;
  const entries: Array<{ name: string; content: string }> = [];
  let skippedBinaryCount = 0;
  const decoder = new TextDecoder("utf-8", { fatal: false });

  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const fileNameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const fileName = decoder.decode(bytes.subarray(pos + 46, pos + 46 + fileNameLen));
    pos += 46 + fileNameLen + extraLen + commentLen;

    if (fileName.endsWith("/")) continue;
    if (isBinaryMediaFilename(fileName)) {
      skippedBinaryCount += 1;
      continue;
    }
    // Skip files > 25MB uncompressed in browser memory
    if (uncompressedSize > 25 * 1024 * 1024) {
      skippedBinaryCount += 1;
      continue;
    }

    if (
      localHeaderOffset + 30 > bytes.length ||
      view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      continue;
    }
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedSlice = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      entries.push({ name: fileName, content: decoder.decode(compressedSlice) });
    } else if (compressionMethod === 8 && typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(compressedSlice).catch(() => {});
      writer.close().catch(() => {});
      const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
      entries.push({ name: fileName, content: decoder.decode(new Uint8Array(decompressedBuffer)) });
    }
  }

  return { entries, skippedBinaryCount };
}

export interface UploadableFileInput {
  name: string;
  size?: number;
  text?: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  rawText?: string;
  rawBuffer?: ArrayBuffer;
}

export async function importFilesBatch(
  files: UploadableFileInput[]
): Promise<{ report: BatchImportReport; dashboard: VaultDashboardPayload }> {
  const existingBefore = loadBrowserPrompts();
  const promptMap = new Map<string, NormalizedPrompt>();
  for (const p of existingBefore) {
    promptMap.set(p.id, p);
  }

  const fileReports: FileImportReport[] = [];
  let totalRawScanned = 0;
  let totalCleanKept = 0;
  let totalNewAdded = 0;
  let totalNoiseFiltered = 0;
  let totalDuplicatesSkipped = 0;
  let totalRedactions = 0;

  const processSingleTextEntry = async (entryName: string, rawContent: string) => {
    try {
      if (isTauriRuntime()) {
        const beforeCount = (await invoke<VaultDashboardPayload>("get_vault_dashboard")).summary
          .clean_prompts_kept;
        const summary = await invoke<IngestionSummary>("import_exported_json", {
          jsonContent: rawContent,
        });
        const afterDashboard = await invoke<VaultDashboardPayload>("get_vault_dashboard");
        const newAdded = Math.max(0, afterDashboard.summary.clean_prompts_kept - beforeCount);
        const isManifest = summary.detected_format.includes("Manifest") || (summary.manifest_links?.length ?? 0) > 0;
        const status: FileImportReport["status"] = isManifest
          ? "manifest_ready"
          : summary.clean_prompts_kept > 0
          ? "imported"
          : "empty";

        totalRawScanned += summary.total_raw_prompts;
        totalCleanKept += summary.clean_prompts_kept;
        totalNewAdded += newAdded;
        totalNoiseFiltered += summary.noise_filtered_out;
        totalDuplicatesSkipped += summary.duplicates_removed + Math.max(0, summary.clean_prompts_kept - newAdded);
        totalRedactions += summary.total_redactions;

        fileReports.push({
          file_name: entryName,
          status,
          detected_format: summary.detected_format,
          raw_prompts_scanned: summary.total_raw_prompts,
          clean_prompts_kept: summary.clean_prompts_kept,
          new_prompts_added: newAdded,
          noise_filtered_out: summary.noise_filtered_out,
          duplicates_removed:
            summary.duplicates_removed + Math.max(0, summary.clean_prompts_kept - newAdded),
          redactions_made: summary.total_redactions,
          sources: (summary.source_counts ?? []).map(([label]) => label),
          warnings: summary.warnings ?? [],
          manifest_links: summary.manifest_links ?? [],
        });
        return;
      }

      const { prompts, summary } = parseMultiProviderClient(rawContent);
      let newAddedForFile = 0;
      let existingDupsForFile = 0;
      for (const p of prompts) {
        if (promptMap.has(p.id)) {
          existingDupsForFile += 1;
        } else {
          promptMap.set(p.id, p);
          newAddedForFile += 1;
        }
      }

      const isManifest =
        summary.detected_format.includes("Manifest") || (summary.manifest_links?.length ?? 0) > 0;
      const status: FileImportReport["status"] = isManifest
        ? "manifest_ready"
        : summary.clean_prompts_kept > 0
        ? "imported"
        : "empty";

      const combinedDuplicates = summary.duplicates_removed + existingDupsForFile;
      totalRawScanned += summary.total_raw_prompts;
      totalCleanKept += summary.clean_prompts_kept;
      totalNewAdded += newAddedForFile;
      totalNoiseFiltered += summary.noise_filtered_out;
      totalDuplicatesSkipped += combinedDuplicates;
      totalRedactions += summary.total_redactions;

      const warnings = [...(summary.warnings ?? [])];
      if (summary.clean_prompts_kept > 0 && newAddedForFile === 0 && existingDupsForFile > 0) {
        warnings.push(
          `All ${summary.clean_prompts_kept} valid prompts in this file were already present in your vault (deduplicated by SHA-256 hash).`
        );
      }

      fileReports.push({
        file_name: entryName,
        status,
        detected_format: summary.detected_format,
        raw_prompts_scanned: summary.total_raw_prompts,
        clean_prompts_kept: summary.clean_prompts_kept,
        new_prompts_added: newAddedForFile,
        noise_filtered_out: summary.noise_filtered_out,
        duplicates_removed: combinedDuplicates,
        redactions_made: summary.total_redactions,
        sources: (summary.source_counts ?? []).map(([label]) => label),
        warnings,
        manifest_links: summary.manifest_links ?? [],
      });
    } catch (err) {
      fileReports.push({
        file_name: entryName,
        status: "error",
        detected_format: "Unrecognized / Invalid File",
        raw_prompts_scanned: 0,
        clean_prompts_kept: 0,
        new_prompts_added: 0,
        noise_filtered_out: 0,
        duplicates_removed: 0,
        redactions_made: 0,
        sources: [],
        warnings: [],
        manifest_links: [],
        error_message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".zip")) {
      try {
        const buf =
          file.rawBuffer ??
          (typeof file.arrayBuffer === "function" ? await file.arrayBuffer() : null);
        if (!buf) {
          throw new Error("Could not read binary buffer from ZIP archive");
        }
        const { entries, skippedBinaryCount } = await extractZipTextEntriesClient(buf);
        if (entries.length === 0) {
          fileReports.push({
            file_name: file.name,
            status: "empty",
            detected_format: "ZIP Archive (No Text Exports Found)",
            raw_prompts_scanned: 0,
            clean_prompts_kept: 0,
            new_prompts_added: 0,
            noise_filtered_out: 0,
            duplicates_removed: 0,
            redactions_made: 0,
            sources: [],
            warnings: [
              `Scanned ZIP archive (${skippedBinaryCount} binary media files skipped), but found 0 text/JSON prompt files inside.`,
            ],
            manifest_links: [],
          });
        } else {
          for (const entry of entries) {
            const shortEntryName = entry.name.split("/").slice(-2).join("/");
            await processSingleTextEntry(`${file.name} → ${shortEntryName}`, entry.content);
          }
        }
      } catch (err) {
        fileReports.push({
          file_name: file.name,
          status: "error",
          detected_format: "ZIP Archive Error",
          raw_prompts_scanned: 0,
          clean_prompts_kept: 0,
          new_prompts_added: 0,
          noise_filtered_out: 0,
          duplicates_removed: 0,
          redactions_made: 0,
          sources: [],
          warnings: [],
          manifest_links: [],
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (isBinaryMediaFilename(file.name)) {
      fileReports.push({
        file_name: file.name,
        status: "empty",
        detected_format: "Binary Media Attachment (Skipped)",
        raw_prompts_scanned: 0,
        clean_prompts_kept: 0,
        new_prompts_added: 0,
        noise_filtered_out: 0,
        duplicates_removed: 0,
        redactions_made: 0,
        sources: [],
        warnings: [
          "Binary media/document file skipped. Clearspace ingests text/JSON/HTML/Markdown/ZIP conversation exports.",
        ],
        manifest_links: [],
      });
    } else {
      try {
        const rawText =
          file.rawText ?? (typeof file.text === "function" ? await file.text() : "");
        await processSingleTextEntry(file.name, rawText);
      } catch (err) {
        fileReports.push({
          file_name: file.name,
          status: "error",
          detected_format: "File Read Error",
          raw_prompts_scanned: 0,
          clean_prompts_kept: 0,
          new_prompts_added: 0,
          noise_filtered_out: 0,
          duplicates_removed: 0,
          redactions_made: 0,
          sources: [],
          warnings: [],
          manifest_links: [],
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (!isTauriRuntime()) {
    saveBrowserPrompts(Array.from(promptMap.values()));
  }

  const dashboard = await getVaultDashboard();
  const report: BatchImportReport = {
    timestamp_iso: new Date().toISOString(),
    files_processed: fileReports.length,
    total_raw_scanned: totalRawScanned,
    total_clean_kept: totalCleanKept,
    total_new_added: totalNewAdded,
    total_noise_filtered: totalNoiseFiltered,
    total_duplicates_skipped: totalDuplicatesSkipped,
    total_redactions: totalRedactions,
    file_reports: fileReports,
  };

  return { report, dashboard };
}

export async function importExportedContent(
  rawContent: string,
  fileName = "uploaded-export.json"
): Promise<{
  summary: IngestionSummary;
  report: BatchImportReport;
  dashboard: VaultDashboardPayload;
}> {
  if (isTauriRuntime()) {
    const summary = await invoke<IngestionSummary>("import_exported_json", {
      jsonContent: rawContent,
    });
    const dashboard = await invoke<VaultDashboardPayload>("get_vault_dashboard");
    const isManifest =
      summary.detected_format?.includes("Manifest") || (summary.manifest_links?.length ?? 0) > 0;
    const report: BatchImportReport = {
      timestamp_iso: new Date().toISOString(),
      files_processed: 1,
      total_raw_scanned: summary.total_raw_prompts,
      total_clean_kept: summary.clean_prompts_kept,
      total_new_added: summary.clean_prompts_kept,
      total_noise_filtered: summary.noise_filtered_out,
      total_duplicates_skipped: summary.duplicates_removed,
      total_redactions: summary.total_redactions,
      file_reports: [
        {
          file_name: fileName,
          status: isManifest
            ? "manifest_ready"
            : summary.clean_prompts_kept > 0
            ? "imported"
            : "empty",
          detected_format: summary.detected_format ?? "Multi-Provider Export",
          raw_prompts_scanned: summary.total_raw_prompts,
          clean_prompts_kept: summary.clean_prompts_kept,
          new_prompts_added: summary.clean_prompts_kept,
          noise_filtered_out: summary.noise_filtered_out,
          duplicates_removed: summary.duplicates_removed,
          redactions_made: summary.total_redactions,
          sources: (summary.source_counts ?? []).map(([label]) => label),
          warnings: summary.warnings ?? [],
          manifest_links: summary.manifest_links ?? [],
        },
      ],
    };
    return { summary, report, dashboard };
  }
  const { prompts, summary } = parseMultiProviderClient(rawContent);
  const existing = loadBrowserPrompts();
  const map = new Map<string, NormalizedPrompt>();
  for (const p of existing) map.set(p.id, p);
  let newAdded = 0;
  let existingDups = 0;
  for (const p of prompts) {
    if (map.has(p.id)) {
      existingDups += 1;
    } else {
      map.set(p.id, p);
      newAdded += 1;
    }
  }
  saveBrowserPrompts(Array.from(map.values()));
  const isManifest =
    summary.detected_format.includes("Manifest") || (summary.manifest_links?.length ?? 0) > 0;
  const report: BatchImportReport = {
    timestamp_iso: new Date().toISOString(),
    files_processed: 1,
    total_raw_scanned: summary.total_raw_prompts,
    total_clean_kept: summary.clean_prompts_kept,
    total_new_added: newAdded,
    total_noise_filtered: summary.noise_filtered_out,
    total_duplicates_skipped: summary.duplicates_removed + existingDups,
    total_redactions: summary.total_redactions,
    file_reports: [
      {
        file_name: fileName,
        status: isManifest
          ? "manifest_ready"
          : summary.clean_prompts_kept > 0
          ? "imported"
          : "empty",
        detected_format: summary.detected_format,
        raw_prompts_scanned: summary.total_raw_prompts,
        clean_prompts_kept: summary.clean_prompts_kept,
        new_prompts_added: newAdded,
        noise_filtered_out: summary.noise_filtered_out,
        duplicates_removed: summary.duplicates_removed + existingDups,
        redactions_made: summary.total_redactions,
        sources: (summary.source_counts ?? []).map(([label]) => label),
        warnings: summary.warnings ?? [],
        manifest_links: summary.manifest_links ?? [],
      },
    ],
  };
  return { summary, report, dashboard: buildBrowserDashboard() };
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
  const profile = loadBrowserProfile();
  saveBrowserProfile({
    ...profile,
    mirror_story_completed: false,
    shortlisted_onet_codes: [],
  });
  return buildBrowserDashboard();
}

export async function resetFullFactory(): Promise<VaultDashboardPayload> {
  if (isTauriRuntime()) {
    return invoke<VaultDashboardPayload>("reset_full_factory");
  }
  saveBrowserPrompts([]);
  saveBrowserJournals([]);
  const resetQuests = DEFAULT_QUESTS.map((q) => ({ ...q, accepted: false, completed: false }));
  saveBrowserQuests(resetQuests);
  saveBrowserProfile({ ...DEFAULT_USER_PROFILE });
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

export function compareSemver(a: string, b: string): number {
  const clean = (v: string) =>
    v
      .replace(/^v/i, "")
      .split("-")[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [aMaj = 0, aMin = 0, aPat = 0] = clean(a);
  const [bMaj = 0, bMin = 0, bPat = 0] = clean(b);
  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPat !== bPat) return aPat > bPat ? 1 : -1;
  return 0;
}

export async function backupLocalVault(): Promise<AppUpdateStatus> {
  if (isTauriRuntime()) {
    return invoke<AppUpdateStatus>("backup_local_vault");
  }
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const bakPath = "localStorage://clearspace_vault.db.bak-v2";
  try {
    localStorage.setItem(
      STORAGE_BACKUP_META_KEY,
      JSON.stringify({
        last_backup_path: bakPath,
        last_migrated_at: now,
      })
    );
  } catch {
    // ignore
  }
  return loadBrowserUpdateStatus();
}

export async function checkForAppUpdates(
  installedVersion = "0.2.0",
  schemaVersion = 2
): Promise<UpdateCheckResult> {
  const nowIso = new Date().toISOString().slice(0, 16).replace("T", " ");
  try {
    const res = await fetch("/latest.json", { cache: "no-store" });
    if (res.ok) {
      const manifest = await res.json();
      const latestVersion: string = manifest.version ?? installedVersion;
      const winPlatform = manifest.platforms?.["windows-x86_64"] ?? null;
      return {
        installed_version: installedVersion,
        latest_version: latestVersion,
        schema_version: manifest.schemaVersion ?? schemaVersion,
        update_available: compareSemver(latestVersion, installedVersion) > 0,
        release_notes:
          manifest.notes ??
          "Zero-Knowledge local SQLite vault with v2 schema migration guard and pre-upgrade DB backup.",
        pub_date: (manifest.pub_date ?? "2026-10-30").slice(0, 10),
        download_url: winPlatform?.url ?? "/downloads/Clearspace_0.2.0_x64-setup.exe",
        sha256: winPlatform?.sha256 ?? null,
        checked_at: nowIso,
      };
    }
  } catch {
    // Offline or non-HTTP environment fallback
  }

  return {
    installed_version: installedVersion,
    latest_version: installedVersion,
    schema_version: schemaVersion,
    update_available: false,
    release_notes:
      "Zero-Knowledge local SQLite vault with v2 schema migration guard and automatic pre-upgrade DB backup.",
    pub_date: "2026-10-30",
    download_url: "/downloads/Clearspace_0.2.0_x64-setup.exe",
    sha256: null,
    checked_at: nowIso,
  };
}

