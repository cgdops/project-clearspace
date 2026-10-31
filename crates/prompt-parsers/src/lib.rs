use clearspace_pii_scrubber::scrub_prompt;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::cmp::Reverse;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::sync::OnceLock;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum PromptSource {
    Antigravity,
    ClaudeWeb,
    ChatGptWeb,
    GeminiTakeout,
    MarkdownJournal,
}

impl PromptSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            PromptSource::Antigravity => "antigravity",
            PromptSource::ClaudeWeb => "claude_web",
            PromptSource::ChatGptWeb => "chat_gpt_web",
            PromptSource::GeminiTakeout => "gemini_takeout",
            PromptSource::MarkdownJournal => "markdown_journal",
        }
    }

    pub fn display_label(&self) -> &'static str {
        match self {
            PromptSource::Antigravity => "Antigravity Local",
            PromptSource::ClaudeWeb => "Anthropic Claude",
            PromptSource::ChatGptWeb => "OpenAI ChatGPT",
            PromptSource::GeminiTakeout => "Google Gemini Takeout",
            PromptSource::MarkdownJournal => "Markdown Journal",
        }
    }

    pub fn from_str_lossy(raw: &str) -> Self {
        match raw.trim().to_lowercase().as_str() {
            "claude_web" | "claudeweb" | "claude" | "anthropic" => PromptSource::ClaudeWeb,
            "chat_gpt_web" | "chatgptweb" | "chatgpt" | "openai" => PromptSource::ChatGptWeb,
            "gemini_takeout" | "geminitakeout" | "gemini" | "google" => PromptSource::GeminiTakeout,
            "markdown_journal" | "markdownjournal" | "markdown" | "md" => {
                PromptSource::MarkdownJournal
            }
            _ => PromptSource::Antigravity,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "snake_case")]
pub enum SkillTier {
    #[default]
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "snake_case")]
pub enum WritingLevel {
    #[default]
    Everyday,
    Professional,
    Technical,
}

impl WritingLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            WritingLevel::Everyday => "everyday",
            WritingLevel::Professional => "professional",
            WritingLevel::Technical => "technical",
        }
    }

    pub fn display_label(&self) -> &'static str {
        match self {
            WritingLevel::Everyday => "Everyday / Plain English",
            WritingLevel::Professional => "Professional / Clear",
            WritingLevel::Technical => "Technical / Deep",
        }
    }

    pub fn short_label(&self) -> &'static str {
        match self {
            WritingLevel::Everyday => "Everyday",
            WritingLevel::Professional => "Professional",
            WritingLevel::Technical => "Technical",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            WritingLevel::Everyday => {
                "Conversational, warm, and direct—insights and next steps are written in plain everyday English without industry buzzwords."
            }
            WritingLevel::Professional => {
                "Clear workplace English—insights and career steps use direct, practical project language without dense academic or venture jargon."
            }
            WritingLevel::Technical => {
                "Deep systems & architectural language—insights and recommendations use full engineering and strategic terminology."
            }
        }
    }

    pub fn resolve(mode: &str, measured: WritingLevel) -> Self {
        match mode.trim().to_lowercase().as_str() {
            "everyday" => WritingLevel::Everyday,
            "professional" => WritingLevel::Professional,
            "technical" => WritingLevel::Technical,
            _ => measured,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WritingLevelMetrics {
    pub avg_words_per_sentence: f32,
    pub avg_syllables_per_word: f32,
    pub flesch_kincaid_grade: f32,
    pub jargon_density_pct: f32,
    pub measured_level: WritingLevel,
    pub level_label: String,
    pub level_description: String,
}

impl Default for WritingLevelMetrics {
    fn default() -> Self {
        Self {
            avg_words_per_sentence: 0.0,
            avg_syllables_per_word: 0.0,
            flesch_kincaid_grade: 8.0,
            jargon_density_pct: 0.0,
            measured_level: WritingLevel::Everyday,
            level_label: WritingLevel::Everyday.display_label().to_string(),
            level_description: WritingLevel::Everyday.description().to_string(),
        }
    }
}

impl SkillTier {
    pub fn as_str(&self) -> &'static str {
        match self {
            SkillTier::Beginner => "beginner",
            SkillTier::Intermediate => "intermediate",
            SkillTier::Advanced => "advanced",
        }
    }

    pub fn positioning_label(&self) -> &'static str {
        match self {
            SkillTier::Beginner => "Beginner → Junior",
            SkillTier::Intermediate => "Intermediate → Mid-Level",
            SkillTier::Advanced => "Advanced → Senior / Staff",
        }
    }

    pub fn depth_weight(&self) -> f32 {
        match self {
            SkillTier::Beginner => 0.35,
            SkillTier::Intermediate => 0.75,
            SkillTier::Advanced => 1.15,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedPrompt {
    pub id: String,
    pub source: PromptSource,
    pub conversation_id: String,
    pub created_at: String,
    pub local_hour: Option<u8>,
    pub cleaned_text: String,
    pub word_count: usize,
    pub redactions_made: usize,
    pub is_high_signal: bool,
    pub signal_categories: Vec<String>,
    #[serde(default)]
    pub skill_tier: SkillTier,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManifestFileLink {
    pub filename: String,
    pub category: String,
    pub export_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DailyPromptQuality {
    pub date: String,
    pub prompt_count: usize,
    pub avg_quality_score: f32,
    pub tier_counts: [usize; 3],
}

pub fn compute_prompt_quality_score(tier: SkillTier, is_high_signal: bool) -> f32 {
    let base = match tier {
        SkillTier::Beginner => 25.0,
        SkillTier::Intermediate => 65.0,
        SkillTier::Advanced => 90.0,
    };
    if is_high_signal { base + 10.0 } else { base }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IngestionSummary {
    pub total_files_scanned: usize,
    pub total_raw_prompts: usize,
    pub noise_filtered_out: usize,
    pub duplicates_removed: usize,
    pub clean_prompts_kept: usize,
    pub high_signal_prompts: usize,
    pub total_redactions: usize,
    pub earliest_date: Option<String>,
    pub latest_date: Option<String>,
    pub hourly_distribution: [usize; 24],
    pub category_counts: Vec<(String, usize)>,
    #[serde(default)]
    pub source_counts: Vec<(String, usize)>,
    #[serde(default)]
    pub tier_counts: [usize; 3],
    #[serde(default)]
    pub overall_positioning: String,
    #[serde(default)]
    pub detected_format: String,
    #[serde(default)]
    pub warnings: Vec<String>,
    #[serde(default)]
    pub manifest_links: Vec<ManifestFileLink>,
    #[serde(default)]
    pub daily_counts: Vec<(String, usize)>,
    #[serde(default)]
    pub daily_prompt_quality: Vec<DailyPromptQuality>,
    #[serde(default)]
    pub writing_level: WritingLevelMetrics,
}

struct SignalPatterns {
    user_req: Regex,
    local_time: Regex,
    hour_iso: Regex,
    md_date_heading: Regex,
    yaml_date: Regex,
    html_tag: Regex,
    career: Regex,
    values_emotion: Regex,
    architecture: Regex,
    learning: Regex,
    grill_me: Regex,
    beginner_markers: Regex,
    intermediate_markers: Regex,
    advanced_markers: Regex,
}

fn patterns() -> &'static SignalPatterns {
    static INSTANCE: OnceLock<SignalPatterns> = OnceLock::new();
    INSTANCE.get_or_init(|| SignalPatterns {
        user_req: Regex::new(r"(?s)<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>")
            .expect("valid user_req regex"),
        local_time: Regex::new(r"The current local time is:\s*([^\n\r.]+)")
            .expect("valid local_time regex"),
        hour_iso: Regex::new(r"(?:T|\s)(\d{2}):\d{2}").expect("valid hour_iso regex"),
        md_date_heading: Regex::new(r"(?m)^#{1,4}\s*(\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)")
            .expect("valid md_date_heading regex"),
        yaml_date: Regex::new(r"(?m)^date:\s*['\x22]?(\d{4}-\d{2}-\d{2})['\x22]?")
            .expect("valid yaml_date regex"),
        html_tag: Regex::new(r"<[^>]+>").expect("valid html_tag regex"),
        career: Regex::new(r"(?i)\b(career|job|resume|interview|role|salary|hire|hiring|company|director|manager|lead|position|linkedin|portfolio|freelance|agency|client|pricing|revenue|offer|laid off|industry|market|positioning|strategy|icp)\b")
            .expect("valid career regex"),
        values_emotion: Regex::new(r"(?i)\b(i want|i feel|i think|my goal|honestly|frustrat|worry|afraid|doubt|wonder|struggl|burnout|demoraliz|excited|love|hate|family|kids|home|stability|unfair advantage|authentic|simplify|meaningful|autonomy|peace|clarity|energy)\b")
            .expect("valid values_emotion regex"),
        architecture: Regex::new(r"(?i)\b(architect|system|design|principle|tradeoff|scale|database|graph|vector|agent|automation|pipeline|telemetry|optimize|routing|engine|editor|tool|platform|workflow|api|schema|compiler)\b")
            .expect("valid architecture regex"),
        learning: Regex::new(r"(?i)\b(why|how does|what is the best|explain|understand|learn|teach|difference between|should i|recommend|what do you think|first principles|mental model)\b")
            .expect("valid learning regex"),
        grill_me: Regex::new(r"(?i)(/grill-me|as a skeptic|expose its flaws|super critical|worth solving|steelman|devil's advocate|blind spot|critique)\b")
            .expect("valid grill_me regex"),
        beginner_markers: Regex::new(r"(?i)\b(what is a|what is an|how do i|how to basic|explain like i'm|for a beginner|step by step tutorial|fix this syntax|syntax error|what does this error mean|help me understand basic|beginner|newbie|just starting out|hello world)\b")
            .expect("valid beginner_markers regex"),
        intermediate_markers: Regex::new(r"(?i)\b(integrate|refactor|implement|workflow|api|database|sqlite|rust|typescript|test|endpoint|component|deployment|optimize|automation|query|parser)\b")
            .expect("valid intermediate_markers regex"),
        advanced_markers: Regex::new(r"(?i)(/grill-me|\b(architect|architecture|tradeoff|trade-off|scale|scalability|unit economics|first principles|bottleneck|telemetry|idempoten|concurrency|distributed|schema|compiler|pipeline|deterministic|zero-knowledge|autonomy|icp|positioning|multi-tenant|latency|throughput)\b)")
            .expect("valid advanced_markers regex"),
    })
}

fn compute_hash(text: &str) -> String {
    let mut hasher = Sha256::new();
    let norm = text
        .trim()
        .to_lowercase()
        .chars()
        .take(180)
        .collect::<String>();
    hasher.update(norm.as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

pub fn extract_hour(timestamp_str: &str) -> Option<u8> {
    let p = patterns();
    if let Some(caps) = p.hour_iso.captures(timestamp_str) {
        if let Ok(h) = caps[1].parse::<u8>() {
            if h < 24 {
                return Some(h);
            }
        }
    }
    None
}

fn format_epoch_seconds(ts: f64) -> String {
    if !ts.is_finite() || ts <= 0.0 {
        return String::new();
    }
    // Handle milliseconds if timestamp is > 1e11
    let secs = if ts > 100_000_000_000.0 {
        (ts / 1000.0).floor() as i64
    } else {
        ts.floor() as i64
    };
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let hour = rem / 3600;
    let minute = (rem % 3600) / 60;
    let second = rem % 60;

    // Howard Hinnant's civil_from_days algorithm (proleptic Gregorian calendar)
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    format!("{year:04}-{m:02}-{d:02}T{hour:02}:{minute:02}:{second:02}Z")
}

fn normalize_timestamp_value(val: Option<&Value>) -> String {
    let Some(v) = val else {
        return String::new();
    };
    if let Some(s) = v.as_str() {
        let trimmed = s.trim();
        if let Ok(epoch) = trimmed.parse::<f64>() {
            let formatted = format_epoch_seconds(epoch);
            if !formatted.is_empty() {
                return formatted;
            }
        }
        return trimmed.to_string();
    }
    if let Some(f) = v.as_f64() {
        return format_epoch_seconds(f);
    }
    if let Some(i) = v.as_i64() {
        return format_epoch_seconds(i as f64);
    }
    String::new()
}

pub fn classify_signals(text: &str, word_count: usize) -> (bool, Vec<String>) {
    if word_count < 10 {
        return (false, Vec::new());
    }
    let p = patterns();
    let mut cats = Vec::new();
    if p.career.is_match(text) {
        cats.push("Career & Positioning".to_string());
    }
    if p.values_emotion.is_match(text) {
        cats.push("Values & Motivation".to_string());
    }
    if p.architecture.is_match(text) {
        cats.push("Systems & Architecture".to_string());
    }
    if p.learning.is_match(text) {
        cats.push("Curiosity & Learning".to_string());
    }
    if p.grill_me.is_match(text) {
        cats.push("Skeptical Truth-Seeking".to_string());
    }
    let is_high = !cats.is_empty() && word_count >= 12;
    (is_high, cats)
}

/// Objectively classifies a prompt's cognitive & technical depth into:
/// - `Beginner` (`Beginner → Junior`): basic syntax, "how do I", introductory lookup
/// - `Intermediate` (`Intermediate → Mid-Level`): feature implementation, component wiring, testing
/// - `Advanced` (`Advanced → Senior / Staff`): systems architecture, tradeoffs, unit economics, adversarial verification
pub fn classify_skill_tier(
    text: &str,
    word_count: usize,
    signal_categories: &[String],
) -> SkillTier {
    let p = patterns();
    let has_beginner = p.beginner_markers.is_match(text);
    let has_advanced = p.advanced_markers.is_match(text);
    let has_intermediate = p.intermediate_markers.is_match(text);

    if has_beginner && !has_advanced {
        return SkillTier::Beginner;
    }

    let has_arch_or_skeptic = signal_categories
        .iter()
        .any(|c| c == "Systems & Architecture" || c == "Skeptical Truth-Seeking");

    if has_advanced && (has_arch_or_skeptic || signal_categories.len() >= 2 || word_count >= 14) {
        return SkillTier::Advanced;
    }

    if has_intermediate || !signal_categories.is_empty() {
        return SkillTier::Intermediate;
    }

    SkillTier::Beginner
}

const TECHNICAL_ACRONYMS: &[&str] = &[
    "mcp", "sdk", "api", "apis", "icp", "seo", "pseo", "crm", "gtm", "arr", "llm", "llms", "n8n",
    "sqlite", "graphql", "oauth", "jwt", "rbac", "cidr", "grpc",
];

const TECHNICAL_JARGON_TERMS: &[&str] = &[
    "architect",
    "architecture",
    "architectural",
    "pipeline",
    "pipelines",
    "telemetry",
    "idempotent",
    "idempotency",
    "concurrency",
    "distributed",
    "schema",
    "schemas",
    "compiler",
    "compilers",
    "deterministic",
    "deterministically",
    "economics",
    "throughput",
    "latency",
    "scalability",
    "programmatic",
    "programmatically",
    "dialectical",
    "adversarial",
    "orchestration",
    "asynchronous",
    "microservices",
    "vector",
    "rust",
    "typescript",
    "agentic",
    "autonomy",
    "heuristics",
    "regression",
    "benchmarks",
    "benchmark",
    "tradeoff",
    "tradeoffs",
    "bottleneck",
    "bottlenecks",
    "homeostatic",
    "cybernetic",
    "topology",
    "ingestion",
    "deduplication",
    "redaction",
    "scrubber",
];

const EVERYDAY_POLYSYLLABIC_ALLOWLIST: &[&str] = &[
    "everything",
    "something",
    "anything",
    "everyone",
    "someone",
    "anyone",
    "another",
    "together",
    "family",
    "families",
    "different",
    "important",
    "understand",
    "interesting",
    "afternoon",
    "yesterday",
    "tomorrow",
    "remember",
    "usually",
    "actually",
    "probably",
    "already",
    "beautiful",
    "favorite",
    "holiday",
    "saturday",
    "wednesday",
    "january",
    "february",
    "september",
    "october",
    "november",
    "december",
    "bakery",
    "confused",
    "customer",
    "customers",
    "company",
    "companies",
    "business",
    "businesses",
    "however",
    "whenever",
    "wherever",
    "whatever",
    "continue",
    "continued",
    "possible",
    "possibly",
    "personal",
    "personally",
    "general",
    "generally",
    "natural",
    "naturally",
    "simple",
    "simply",
    "example",
    "examples",
    "question",
    "questions",
    "idea",
    "ideas",
    "area",
    "areas",
    "video",
    "videos",
    "computer",
    "computers",
    "internet",
    "website",
    "websites",
    "morning",
    "evening",
];

fn count_word_syllables_and_jargon(raw_token: &str) -> (usize, bool) {
    // Ignore bracketed redaction tokens like [REDACTED_EMAIL] or [CODE_BLOCK_OMITTED]
    if raw_token.starts_with('[') && raw_token.ends_with(']') {
        return (0, false);
    }

    let mut alnum_buf = [0u8; 48];
    let mut alnum_len = 0usize;
    let mut alpha_buf = [0u8; 48];
    let mut alpha_len = 0usize;

    for b in raw_token.bytes() {
        if b.is_ascii_alphanumeric() && alnum_len < alnum_buf.len() {
            let lower = b.to_ascii_lowercase();
            alnum_buf[alnum_len] = lower;
            alnum_len += 1;
            if lower.is_ascii_alphabetic() {
                alpha_buf[alpha_len] = lower;
                alpha_len += 1;
            }
        }
    }

    if alnum_len == 0 {
        return (0, false);
    }

    if alnum_len <= 8 {
        if let Ok(alnum_str) = std::str::from_utf8(&alnum_buf[..alnum_len]) {
            if TECHNICAL_ACRONYMS.contains(&alnum_str) {
                return (3, true);
            }
        }
    }

    if alpha_len == 0 {
        return (0, false);
    }

    let alpha_str = match std::str::from_utf8(&alpha_buf[..alpha_len]) {
        Ok(s) => s,
        Err(_) => return (0, false),
    };

    let syllables = if alpha_len <= 3 {
        1
    } else {
        let mut working = alpha_str;
        let strip_two_char_suffix = working.len() > 4
            && ((working.ends_with("es")
                && !working.ends_with("aes")
                && !working.ends_with("ees")
                && !working.ends_with("oes"))
                || (working.ends_with("ed")
                    && !working.ends_with("ted")
                    && !working.ends_with("ded")));
        if strip_two_char_suffix {
            working = &working[..working.len() - 2];
        } else if working.len() > 3 && working.ends_with('e') && !working.ends_with("le") {
            working = &working[..working.len() - 1];
        }

        let mut vowel_runs = 0usize;
        let mut prev_vowel = false;
        for ch in working.bytes() {
            let is_vowel = matches!(ch, b'a' | b'e' | b'i' | b'o' | b'u' | b'y');
            if is_vowel && !prev_vowel {
                vowel_runs += 1;
            }
            prev_vowel = is_vowel;
        }
        vowel_runs.max(1)
    };

    let is_jargon = if syllables >= 3 {
        !EVERYDAY_POLYSYLLABIC_ALLOWLIST.contains(&alpha_str)
    } else if alpha_len >= 4 {
        TECHNICAL_JARGON_TERMS.contains(&alpha_str)
    } else {
        false
    };

    (syllables, is_jargon)
}

/// Computes deterministic Flesch-Kincaid Grade Level (`clamp(0.39 * ASL + 11.8 * ASW - 15.59, 4.0, 16.0)`)
/// and complex/jargon word density across ingested user prompts, classifying into `Everyday`, `Professional`, or `Technical`.
pub fn compute_writing_level(prompts: &[NormalizedPrompt]) -> WritingLevelMetrics {
    if prompts.is_empty() {
        return WritingLevelMetrics::default();
    }

    let mut total_sentences = 0usize;
    let mut total_words = 0usize;
    let mut total_syllables = 0usize;
    let mut jargon_words = 0usize;

    for p in prompts {
        let sent_count = p
            .cleaned_text
            .split(['.', '!', '?', ';', '\n'])
            .filter(|s| s.chars().any(|ch| ch.is_ascii_alphabetic()))
            .count()
            .max(1);
        total_sentences += sent_count;

        for token in p.cleaned_text.split(|c: char| c.is_whitespace() || c == '—' || c == '-') {
            let (syl, is_jargon) = count_word_syllables_and_jargon(token);
            if syl > 0 {
                total_words += 1;
                total_syllables += syl;
                if is_jargon {
                    jargon_words += 1;
                }
            }
        }
    }

    if total_words == 0 {
        return WritingLevelMetrics::default();
    }

    let asl = (total_words as f32) / (total_sentences.max(1) as f32);
    let asw = (total_syllables as f32) / (total_words as f32);
    let raw_fkgl = (0.39 * asl + 11.8 * asw - 15.59).clamp(4.0, 16.0);
    let raw_jargon_pct = ((jargon_words as f32) / (total_words as f32)) * 100.0;

    let avg_words_per_sentence = (asl * 10.0).round() / 10.0;
    let avg_syllables_per_word = (asw * 100.0).round() / 100.0;
    let flesch_kincaid_grade = (raw_fkgl * 10.0).round() / 10.0;
    let jargon_density_pct = (raw_jargon_pct * 10.0).round() / 10.0;

    let measured_level = if flesch_kincaid_grade >= 12.5 && jargon_density_pct >= 20.0 {
        WritingLevel::Technical
    } else if flesch_kincaid_grade < 9.5 && jargon_density_pct < 12.0 {
        WritingLevel::Everyday
    } else {
        WritingLevel::Professional
    };

    WritingLevelMetrics {
        avg_words_per_sentence,
        avg_syllables_per_word,
        flesch_kincaid_grade,
        jargon_density_pct,
        measured_level,
        level_label: measured_level.display_label().to_string(),
        level_description: measured_level.description().to_string(),
    }
}

fn finalize_summary(results: &mut [NormalizedPrompt], summary: &mut IngestionSummary) {
    results.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    summary.earliest_date = results
        .iter()
        .map(|r| r.created_at.trim())
        .find(|d| !d.is_empty())
        .map(|s| s.to_string());
    summary.latest_date = results
        .iter()
        .rev()
        .map(|r| r.created_at.trim())
        .find(|d| !d.is_empty())
        .map(|s| s.to_string());

    let mut cat_map: HashMap<String, usize> = HashMap::new();
    let mut src_map: HashMap<String, usize> = HashMap::new();
    let mut day_map: HashMap<String, (usize, f32, [usize; 3])> = HashMap::new();
    summary.hourly_distribution = [0usize; 24];
    summary.tier_counts = [0usize; 3];
    summary.high_signal_prompts = 0;

    for r in results.iter() {
        if r.is_high_signal {
            summary.high_signal_prompts += 1;
        }
        let tier_idx = match r.skill_tier {
            SkillTier::Beginner => 0,
            SkillTier::Intermediate => 1,
            SkillTier::Advanced => 2,
        };
        summary.tier_counts[tier_idx] += 1;
        if let Some(day_key) = r.created_at.trim().get(..10) {
            if day_key.as_bytes().get(4) == Some(&b'-') && day_key.as_bytes().get(7) == Some(&b'-')
            {
                let entry = day_map.entry(day_key.to_string()).or_insert((0, 0.0, [0; 3]));
                entry.0 += 1;
                entry.1 += compute_prompt_quality_score(r.skill_tier, r.is_high_signal);
                entry.2[tier_idx] += 1;
            }
        }
        if let Some(h) = r.local_hour {
            if (h as usize) < 24 {
                summary.hourly_distribution[h as usize] += 1;
            }
        }
        for c in &r.signal_categories {
            *cat_map.entry(c.clone()).or_insert(0usize) += 1;
        }
        *src_map
            .entry(r.source.display_label().to_string())
            .or_insert(0usize) += 1;
    }

    let mut cat_vec: Vec<(String, usize)> = cat_map.into_iter().collect();
    cat_vec.sort_by_key(|entry| Reverse(entry.1));
    summary.category_counts = cat_vec;

    let mut src_vec: Vec<(String, usize)> = src_map.into_iter().collect();
    src_vec.sort_by_key(|entry| Reverse(entry.1));
    summary.source_counts = src_vec;

    let mut day_vec: Vec<_> = day_map.into_iter().collect();
    day_vec.sort_by(|a, b| a.0.cmp(&b.0));
    summary.daily_counts = day_vec.iter().map(|(d, (c, _, _))| (d.clone(), *c)).collect();
    summary.daily_prompt_quality = day_vec
        .into_iter()
        .map(|(date, (prompt_count, sum, tier_counts))| DailyPromptQuality {
            date,
            prompt_count,
            avg_quality_score: ((sum / prompt_count.max(1) as f32) * 10.0).round() / 10.0,
            tier_counts,
        })
        .collect();

    summary.clean_prompts_kept = results.len();

    summary.overall_positioning = if results.is_empty() {
        "Awaiting Evidence".to_string()
    } else {
        let total = results.len() as f32;
        let weighted_idx =
            (summary.tier_counts[1] as f32 + 2.0 * summary.tier_counts[2] as f32) / total;
        if weighted_idx < 0.65 {
            SkillTier::Beginner.positioning_label().to_string()
        } else if weighted_idx < 1.35 {
            SkillTier::Intermediate.positioning_label().to_string()
        } else {
            SkillTier::Advanced.positioning_label().to_string()
        }
    };
    summary.writing_level = compute_writing_level(results);
}

/// Rebuilds an `IngestionSummary` from a slice of persisted `NormalizedPrompt` items.
pub fn summarize_persisted_prompts(prompts: &[NormalizedPrompt]) -> IngestionSummary {
    let mut cloned = prompts.to_vec();
    let mut convos = HashSet::new();
    let mut total_redactions = 0usize;
    for p in &cloned {
        convos.insert(p.conversation_id.clone());
        total_redactions += p.redactions_made;
    }
    let mut summary = IngestionSummary {
        total_files_scanned: convos.len(),
        total_raw_prompts: cloned.len(),
        noise_filtered_out: 0,
        duplicates_removed: 0,
        clean_prompts_kept: cloned.len(),
        high_signal_prompts: 0,
        total_redactions,
        ..Default::default()
    };
    finalize_summary(&mut cloned, &mut summary);
    summary
}

/// Scans a local Antigravity `brain` directory for `.jsonl` transcripts and normalizes all user prompts.
pub fn scan_antigravity_brain_dir(brain_dir: &Path) -> (Vec<NormalizedPrompt>, IngestionSummary) {
    let p = patterns();
    let mut summary = IngestionSummary::default();
    let mut seen_hashes = HashSet::new();
    let mut results = Vec::new();

    if !brain_dir.exists() {
        return (results, summary);
    }

    for entry in WalkDir::new(brain_dir)
        .max_depth(4)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if file_name != "transcript_full.jsonl" && file_name != "transcript.jsonl" {
            continue;
        }
        if file_name == "transcript.jsonl" {
            if let Some(parent) = path.parent() {
                if parent.join("transcript_full.jsonl").exists() {
                    continue;
                }
            }
        }

        summary.total_files_scanned += 1;
        let convo_id = path
            .ancestors()
            .nth(3)
            .and_then(|a| a.file_name())
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        let Ok(content) = fs::read_to_string(path) else {
            continue;
        };

        for line in content.lines() {
            if !line.contains("USER_INPUT") && !line.contains("<USER_REQUEST>") {
                continue;
            }
            let Ok(val) = serde_json::from_str::<Value>(line) else {
                continue;
            };
            let step_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if step_type != "USER_INPUT" {
                continue;
            }
            let raw_content = val.get("content").and_then(|v| v.as_str()).unwrap_or("");
            if !raw_content.contains("<USER_REQUEST>") {
                continue;
            }

            let Some(caps) = p.user_req.captures(raw_content) else {
                continue;
            };
            let extracted_text = caps[1].trim();
            if extracted_text.is_empty() {
                continue;
            }

            let created_at = val
                .get("created_at")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let local_ts = p
                .local_time
                .captures(raw_content)
                .map(|c| c[1].to_string())
                .unwrap_or_else(|| created_at.clone());

            ingest_single_prompt_with_local_ts(
                extracted_text,
                created_at,
                &local_ts,
                &convo_id,
                PromptSource::Antigravity,
                &mut seen_hashes,
                &mut summary,
                &mut results,
            );
        }
    }

    finalize_summary(&mut results, &mut summary);
    (results, summary)
}

/// Parses Markdown or plain-text reflective journals/notes into normalized prompts.
pub fn parse_markdown_journal(md_str: &str) -> (Vec<NormalizedPrompt>, IngestionSummary) {
    let p = patterns();
    let mut summary = IngestionSummary {
        total_files_scanned: 1,
        detected_format: "Markdown / Plain-Text Journal".to_string(),
        ..Default::default()
    };
    let mut seen_hashes = HashSet::new();
    let mut results = Vec::new();

    let mut current_date = String::from("2026-01-15T20:00:00Z");
    if let Some(caps) = p.yaml_date.captures(md_str) {
        current_date = format!("{}T20:00:00Z", &caps[1]);
    }

    // Strip leading YAML frontmatter (`--- ... ---`) so metadata keys are not ingested as prompts
    let body_str = if let Some(rest) = md_str.trim_start().strip_prefix("---") {
        if let Some(end_idx) = rest.find("\n---") {
            let after = &rest[end_idx + 4..];
            after.strip_prefix('\n').or_else(|| after.strip_prefix("\r\n")).unwrap_or(after)
        } else {
            md_str
        }
    } else {
        md_str
    };

    let mut current_block = String::new();

    for line in body_str.lines() {
        let trimmed = line.trim();
        if let Some(caps) = p.md_date_heading.captures(trimmed) {
            if !current_block.trim().is_empty() {
                ingest_single_prompt(
                    current_block.trim(),
                    current_date.clone(),
                    "md-journal",
                    PromptSource::MarkdownJournal,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
                current_block.clear();
            }
            let raw_dt = caps[1].trim().replace(' ', "T");
            current_date = if raw_dt.contains('T') {
                if raw_dt.ends_with('Z') {
                    raw_dt
                } else {
                    format!("{raw_dt}:00Z")
                }
            } else {
                format!("{raw_dt}T20:00:00Z")
            };
            continue;
        }

        if trimmed.is_empty() || trimmed.starts_with("---") {
            if !current_block.trim().is_empty() {
                ingest_single_prompt(
                    current_block.trim(),
                    current_date.clone(),
                    "md-journal",
                    PromptSource::MarkdownJournal,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
                current_block.clear();
            }
        } else {
            let cleaned_line = trimmed
                .trim_start_matches('#')
                .trim_start_matches('-')
                .trim_start_matches('*')
                .trim_start_matches('>')
                .trim();
            if !cleaned_line.is_empty() {
                if !current_block.is_empty() {
                    current_block.push(' ');
                }
                current_block.push_str(cleaned_line);
            }
        }
    }

    if !current_block.trim().is_empty() {
        ingest_single_prompt(
            current_block.trim(),
            current_date,
            "md-journal",
            PromptSource::MarkdownJournal,
            &mut seen_hashes,
            &mut summary,
            &mut results,
        );
    }

    finalize_summary(&mut results, &mut summary);
    (results, summary)
}

fn decode_basic_html_entities(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
}

fn parse_html_export(
    html_str: &str,
) -> Result<(Vec<NormalizedPrompt>, IngestionSummary), String> {
    let p = patterns();

    // 1. OpenAI ChatGPT `chat.html` export (`var jsonData = [...]`)
    if let Some(idx) = html_str.find("var jsonData =") {
        let after = html_str[idx + "var jsonData =".len()..].trim_start();
        if after.starts_with('[') {
            if let Some(end_script) = after.find(";\n</script>").or_else(|| after.find(";</script>")) {
                let json_slice = after[..end_script].trim();
                if let Ok(res) = parse_exported_conversations_json(json_slice) {
                    return Ok(res);
                }
            }
        }
    }

    // 2. Google Gemini Takeout `gemini_gems_data.html` (`<b>Name:</b>...<b>Instructions:</b>...`)
    if html_str.contains("<b>Name:</b>") && html_str.contains("<b>Instructions:</b>") {
        let mut summary = IngestionSummary {
            total_files_scanned: 1,
            detected_format: "Google Gemini Takeout (Custom Gems HTML)".to_string(),
            ..Default::default()
        };
        let mut seen_hashes = HashSet::new();
        let mut results = Vec::new();

        for (idx, chunk) in html_str.split("<b>Name:</b>").skip(1).enumerate() {
            let mut parts = chunk.splitn(2, "<b>Instructions:</b>");
            let raw_name = parts.next().unwrap_or("");
            let raw_rest = parts.next().unwrap_or("");
            let raw_instr = raw_rest.split("<b>Files:</b>").next().unwrap_or(raw_rest);
            let name = decode_basic_html_entities(&p.html_tag.replace_all(raw_name, " "))
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ");
            let instr = decode_basic_html_entities(&p.html_tag.replace_all(raw_instr, " "))
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ");
            if !instr.is_empty() {
                let text = if name.is_empty() {
                    format!("Gemini Custom Gem: {instr}")
                } else {
                    format!("Gemini Custom Gem ({name}): {instr}")
                };
                let convo_id = format!("gemini-gem-{}", idx + 1);
                ingest_single_prompt(
                    &text,
                    "2026-02-15T20:00:00Z".to_string(),
                    &convo_id,
                    PromptSource::GeminiTakeout,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
            }
        }
        finalize_summary(&mut results, &mut summary);
        return Ok((results, summary));
    }

    // 3. Generic / empty HTML export (`<div></div>` like `gemini_scheduled_actions_data.html`)
    let stripped = decode_basic_html_entities(&p.html_tag.replace_all(html_str, " "));
    let cleaned = stripped.trim();
    if cleaned.is_empty() {
        let mut summary = IngestionSummary {
            total_files_scanned: 1,
            detected_format: "Empty HTML Export".to_string(),
            warnings: vec![
                "This HTML export file is empty and contains 0 conversation or activity records."
                    .to_string(),
            ],
            ..Default::default()
        };
        finalize_summary(&mut [], &mut summary);
        return Ok((Vec::new(), summary));
    }

    Ok(parse_markdown_journal(cleaned))
}

/// Universal multi-provider parser supporting:
/// 1. OpenAI ChatGPT `conversations.json` (`mapping` nodes or `messages` arrays with Unix epoch `create_time`)
/// 2. Anthropic Claude `conversations.json` (`chat_messages`), `projects.json` (`prompt_template` / `docs`), and Export Batch Manifests (`data_files` / `export_url`)
/// 3. Google Gemini Takeout `MyActivity.json` (`title: "Prompted ..."` / `Branched ...` / `gemini_activity`), Workspace `conversation_*.txt` (`conversation_turns`), and `gemini_gems_data.html`
/// 4. Markdown / Plain-Text Journals (with optional YAML frontmatter and date headings)
pub fn parse_exported_conversations_json(
    raw_input: &str,
) -> Result<(Vec<NormalizedPrompt>, IngestionSummary), String> {
    let trimmed = raw_input.trim();
    if trimmed.is_empty() {
        return Err("Empty import file".to_string());
    }

    // Handle HTML exports (`gemini_gems_data.html`, `gemini_scheduled_actions_data.html`, `chat.html`)
    if trimmed.starts_with('<') {
        return parse_html_export(trimmed);
    }

    // If the file does not start with JSON delimiters `{` or `[`, parse as Markdown journal
    if !trimmed.starts_with('[') && !trimmed.starts_with('{') {
        return Ok(parse_markdown_journal(trimmed));
    }

    let root: Value = serde_json::from_str(trimmed).map_err(|e| e.to_string())?;

    // Check for Anthropic Claude Export Batch Manifest (`data_files` with `export_url`)
    if let Some(obj) = root.as_object() {
        if let Some(data_files) = obj.get("data_files").and_then(|v| v.as_array()) {
            let mut manifest_links = Vec::new();
            for df in data_files {
                let filename = df
                    .get("filename")
                    .and_then(|v| v.as_str())
                    .unwrap_or("export.zip")
                    .to_string();
                let category = df
                    .get("category")
                    .and_then(|v| v.as_str())
                    .unwrap_or("archive")
                    .to_string();
                let export_url = df
                    .get("export_url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if !export_url.is_empty() {
                    manifest_links.push(ManifestFileLink {
                        filename,
                        category,
                        export_url,
                    });
                }
            }
            let mut summary = IngestionSummary {
                total_files_scanned: 1,
                detected_format: "Anthropic Claude Export Manifest".to_string(),
                warnings: vec![format!(
                    "Anthropic Claude Export Manifest detected ({} archive download link(s) found). This JSON file is a download manifest rather than the conversations archive itself—download conversations-000.zip (and projects-000.zip) using the links below while signed into claude.ai, then upload the .zip or conversations.json file.",
                    manifest_links.len()
                )],
                manifest_links,
                ..Default::default()
            };
            finalize_summary(&mut [], &mut summary);
            return Ok((Vec::new(), summary));
        }
    }

    // Unwrap either a top-level array or an object containing an array (`conversations`, `activities`, `conversation_turns`, `messages`, `items`, `data`)
    let items_vec: Vec<Value> = if let Some(arr) = root.as_array() {
        arr.clone()
    } else if let Some(obj) = root.as_object() {
        if let Some(arr) = obj
            .get("conversations")
            .or_else(|| obj.get("activities"))
            .or_else(|| obj.get("conversation_turns"))
            .or_else(|| obj.get("items"))
            .or_else(|| obj.get("data"))
            .and_then(|v| v.as_array())
        {
            arr.clone()
        } else if obj.contains_key("chat_messages")
            || obj.contains_key("messages")
            || obj.contains_key("mapping")
            || obj.contains_key("title")
            || obj.contains_key("gemini_activity")
            || obj.contains_key("user_turn")
            || obj.contains_key("prompt_template")
            || obj.contains_key("docs")
        {
            vec![root]
        } else {
            return Err("Expected JSON array or conversation container object".to_string());
        }
    } else {
        return Err("Expected JSON array of conversations or activities".to_string());
    };

    let mut summary = IngestionSummary {
        total_files_scanned: items_vec.len().max(1),
        ..Default::default()
    };
    let mut seen_hashes = HashSet::new();
    let mut results = Vec::new();

    for (idx, item) in items_vec.iter().enumerate() {
        let default_id = format!("export-{}", idx + 1);
        let convo_id = item
            .get("uuid")
            .or_else(|| item.get("id"))
            .or_else(|| item.get("conversation_id"))
            .and_then(|v| v.as_str())
            .unwrap_or(&default_id)
            .to_string();

        let convo_fallback_time = normalize_timestamp_value(
            item.get("created_at")
                .or_else(|| item.get("create_time"))
                .or_else(|| item.get("time"))
                .or_else(|| item.get("timestamp")),
        );

        // 1. Anthropic Claude `chat_messages` or OpenAI/Claude `messages` array
        if let Some(msgs) = item
            .get("chat_messages")
            .or_else(|| item.get("messages"))
            .and_then(|v| v.as_array())
        {
            let has_chat_messages_key = item.get("chat_messages").is_some();
            for msg in msgs {
                let sender_raw = msg.get("sender").and_then(|v| v.as_str()).unwrap_or("");
                let role_raw = msg
                    .get("role")
                    .or_else(|| msg.get("author").and_then(|a| a.get("role")))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let effective_sender = if !sender_raw.is_empty() {
                    sender_raw
                } else {
                    role_raw
                };
                if effective_sender != "human" && effective_sender != "user" {
                    continue;
                }
                let text = extract_claude_or_generic_message_text(msg);
                if text.trim().is_empty() {
                    continue;
                }
                let mut created_at = normalize_timestamp_value(
                    msg.get("created_at")
                        .or_else(|| msg.get("create_time"))
                        .or_else(|| msg.get("timestamp")),
                );
                if created_at.is_empty() {
                    created_at = convo_fallback_time.clone();
                }
                let source = if has_chat_messages_key || sender_raw == "human" {
                    PromptSource::ClaudeWeb
                } else {
                    // Check if conversation has `uuid` (Claude) vs `id`/`create_time` (OpenAI)
                    if item.get("uuid").is_some() {
                        PromptSource::ClaudeWeb
                    } else {
                        PromptSource::ChatGptWeb
                    }
                };
                ingest_single_prompt(
                    &text,
                    created_at,
                    &convo_id,
                    source,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
            }
        }
        // 2. OpenAI ChatGPT format (`mapping`)
        else if let Some(mapping) = item.get("mapping").and_then(|v| v.as_object()) {
            for (_node_id, node) in mapping {
                let Some(message) = node.get("message") else {
                    continue;
                };
                if message.is_null() {
                    continue;
                }
                let role = message
                    .get("author")
                    .and_then(|a| a.get("role"))
                    .or_else(|| message.get("role"))
                    .and_then(|r| r.as_str())
                    .unwrap_or("");
                if role != "user" && role != "human" {
                    continue;
                }
                let text = extract_chatgpt_message_text(message);
                if text.trim().is_empty() {
                    continue;
                }
                let mut created_at = normalize_timestamp_value(
                    message
                        .get("create_time")
                        .or_else(|| message.get("created_at"))
                        .or_else(|| message.get("timestamp")),
                );
                if created_at.is_empty() {
                    created_at = convo_fallback_time.clone();
                }
                ingest_single_prompt(
                    &text,
                    created_at,
                    &convo_id,
                    PromptSource::ChatGptWeb,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
            }
        }
        // 3. Google Gemini Workspace Conversation History (`user_turn` or nested `conversation_turns`)
        else if item.get("user_turn").is_some() || item.get("conversation_turns").is_some() {
            if let Some(ut) = item.get("user_turn") {
                if let Some(prompt_text) = ut
                    .get("prompt")
                    .or_else(|| ut.get("text"))
                    .and_then(|v| v.as_str())
                {
                    let created_at = normalize_timestamp_value(
                        ut.get("turn_last_modified")
                            .or_else(|| ut.get("created_at"))
                            .or_else(|| ut.get("timestamp")),
                    );
                    ingest_single_prompt(
                        prompt_text,
                        if created_at.is_empty() {
                            convo_fallback_time.clone()
                        } else {
                            created_at
                        },
                        &convo_id,
                        PromptSource::GeminiTakeout,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
            }
            if let Some(turns) = item.get("conversation_turns").and_then(|v| v.as_array()) {
                for turn in turns {
                    if let Some(ut) = turn.get("user_turn") {
                        if let Some(prompt_text) = ut
                            .get("prompt")
                            .or_else(|| ut.get("text"))
                            .and_then(|v| v.as_str())
                        {
                            let created_at = normalize_timestamp_value(
                                ut.get("turn_last_modified")
                                    .or_else(|| ut.get("created_at"))
                                    .or_else(|| ut.get("timestamp")),
                            );
                            ingest_single_prompt(
                                prompt_text,
                                if created_at.is_empty() {
                                    convo_fallback_time.clone()
                                } else {
                                    created_at
                                },
                                &convo_id,
                                PromptSource::GeminiTakeout,
                                &mut seen_hashes,
                                &mut summary,
                                &mut results,
                            );
                        }
                    }
                }
            }
        }
        // 4. Anthropic Claude `projects.json` (`prompt_template` / `description` / `docs`)
        else if item.get("prompt_template").is_some() || item.get("docs").is_some() {
            if let Some(pt) = item.get("prompt_template").and_then(|v| v.as_str()) {
                if !pt.trim().is_empty() {
                    ingest_single_prompt(
                        pt,
                        convo_fallback_time.clone(),
                        &convo_id,
                        PromptSource::ClaudeWeb,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
            }
            if let Some(desc) = item.get("description").and_then(|v| v.as_str()) {
                if !desc.trim().is_empty() {
                    ingest_single_prompt(
                        desc,
                        convo_fallback_time.clone(),
                        &convo_id,
                        PromptSource::ClaudeWeb,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
            }
            if let Some(docs) = item.get("docs").and_then(|v| v.as_array()) {
                for doc in docs {
                    if let Some(content) = doc.get("content").and_then(|v| v.as_str()) {
                        let doc_ts = normalize_timestamp_value(doc.get("created_at"));
                        ingest_single_prompt(
                            content,
                            if doc_ts.is_empty() {
                                convo_fallback_time.clone()
                            } else {
                                doc_ts
                            },
                            &convo_id,
                            PromptSource::ClaudeWeb,
                            &mut seen_hashes,
                            &mut summary,
                            &mut results,
                        );
                    }
                }
            }
        }
        // 5. Google Gemini Takeout format (`MyActivity.json` or Gemini prompt objects)
        else if is_gemini_takeout_item(item) {
            match extract_gemini_takeout_text(item) {
                GeminiExtraction::Prompt(prompt_text) => {
                    let created_at = normalize_timestamp_value(
                        item.get("time")
                            .or_else(|| item.get("timestamp"))
                            .or_else(|| item.get("created_at")),
                    );
                    ingest_single_prompt(
                        &prompt_text,
                        created_at,
                        &convo_id,
                        PromptSource::GeminiTakeout,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
                GeminiExtraction::SystemEvent => {
                    summary.total_raw_prompts += 1;
                    summary.noise_filtered_out += 1;
                }
                GeminiExtraction::Empty => {}
            }
        }
        // 6. Direct single message object in array (`{ "sender": "human", "text": "..." }` or `{ "role": "user", "content": "..." }`)
        else if item.get("sender").is_some() || item.get("role").is_some() || item.get("author").is_some() {
            let sender_raw = item.get("sender").and_then(|v| v.as_str()).unwrap_or("");
            let role_raw = item
                .get("role")
                .or_else(|| item.get("author").and_then(|a| a.get("role")))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let effective = if !sender_raw.is_empty() {
                sender_raw
            } else {
                role_raw
            };
            if effective == "human" || effective == "user" {
                let text = extract_claude_or_generic_message_text(item);
                if !text.trim().is_empty() {
                    let source = if sender_raw == "human" {
                        PromptSource::ClaudeWeb
                    } else {
                        PromptSource::ChatGptWeb
                    };
                    ingest_single_prompt(
                        &text,
                        convo_fallback_time,
                        &convo_id,
                        source,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
            }
        }
        // 7. Generic prompt/reflection entry in JSON array (`{ "prompt": "...", "source": "..." }`)
        else if let Some(text) = item
            .get("prompt")
            .or_else(|| item.get("text"))
            .or_else(|| item.get("cleaned_text"))
            .and_then(|v| v.as_str())
        {
            let source = item
                .get("source")
                .and_then(|v| v.as_str())
                .map(PromptSource::from_str_lossy)
                .unwrap_or(PromptSource::MarkdownJournal);
            ingest_single_prompt(
                text,
                convo_fallback_time,
                &convo_id,
                source,
                &mut seen_hashes,
                &mut summary,
                &mut results,
            );
        }
    }

    finalize_summary(&mut results, &mut summary);
    if summary.detected_format.is_empty() {
        summary.detected_format = summary
            .source_counts
            .first()
            .map(|(s, _)| s.clone())
            .unwrap_or_else(|| "JSON Conversation Archive".to_string());
    }
    Ok((results, summary))
}

fn extract_claude_or_generic_message_text(msg: &Value) -> String {
    if let Some(t) = msg.get("text").and_then(|v| v.as_str()) {
        if !t.trim().is_empty() {
            return t.to_string();
        }
    }
    if let Some(content) = msg.get("content") {
        if let Some(s) = content.as_str() {
            if !s.trim().is_empty() {
                return s.to_string();
            }
        }
        if let Some(content_arr) = content.as_array() {
            let joined = content_arr
                .iter()
                .filter_map(|block| {
                    block
                        .get("text")
                        .and_then(|v| v.as_str())
                        .or_else(|| block.get("content").and_then(|v| v.as_str()))
                        .or_else(|| block.as_str())
                })
                .collect::<Vec<_>>()
                .join("\n");
            if !joined.trim().is_empty() {
                return joined;
            }
        }
        if content.is_object() {
            let from_chatgpt = extract_chatgpt_message_text(msg);
            if !from_chatgpt.trim().is_empty() {
                return from_chatgpt;
            }
        }
    }
    String::new()
}

fn extract_chatgpt_message_text(message: &Value) -> String {
    if let Some(content) = message.get("content") {
        if let Some(s) = content.as_str() {
            if !s.trim().is_empty() {
                return s.to_string();
            }
        }
        if let Some(parts) = content.get("parts").and_then(|p| p.as_array()) {
            let joined = parts
                .iter()
                .filter_map(|p| {
                    if let Some(s) = p.as_str() {
                        Some(s)
                    } else {
                        p.get("text")
                            .or_else(|| p.get("content"))
                            .and_then(|t| t.as_str())
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");
            if !joined.trim().is_empty() {
                return joined;
            }
        }
        if let Some(text) = content.get("text").and_then(|t| t.as_str()) {
            if !text.trim().is_empty() {
                return text.to_string();
            }
        }
    }
    if let Some(text) = message.get("text").and_then(|t| t.as_str()) {
        return text.to_string();
    }
    String::new()
}

fn is_gemini_takeout_item(item: &Value) -> bool {
    if item.get("gemini_activity").is_some() || item.get("safeHtmlItem").is_some() {
        return true;
    }
    if let Some(header) = item.get("header").and_then(|v| v.as_str()) {
        let lower = header.to_lowercase();
        if lower.contains("gemini") || lower.contains("bard") {
            return true;
        }
    }
    if let Some(title) = item.get("title").and_then(|v| v.as_str()) {
        if title.starts_with("Prompted ")
            || title.starts_with("Asked ")
            || title.starts_with("Submitted prompt:")
            || title.starts_with("Branched ")
            || title.starts_with("Added chat from link:")
        {
            return true;
        }
    }
    if item.get("subtitles").is_some() && item.get("time").is_some() {
        return true;
    }
    false
}

enum GeminiExtraction {
    Prompt(String),
    SystemEvent,
    Empty,
}

fn is_gemini_system_event_title(title: &str) -> bool {
    let t = title.trim();
    t.starts_with("Cleared ")
        || t.starts_with("Created Gemini Canvas")
        || t.starts_with("Selected preferred draft")
        || t.starts_with("Used Gemini Apps")
        || t.starts_with("Gave feedback")
        || t.starts_with("Opened ")
}

fn is_gemini_attachment_subtitle(sub: &Value, text: &str) -> bool {
    if sub.get("url").is_some() {
        return true;
    }
    let t = text.trim();
    let lower = t.to_lowercase();
    t.starts_with("- ")
        || t.starts_with("```")
        || t.starts_with("<!DOCTYPE")
        || lower.ends_with("generated image.")
        || lower.ends_with("generated images.")
        || (lower.starts_with("attached ") && lower.ends_with("file."))
        || (lower.starts_with("attached ") && lower.ends_with("files."))
        || lower == "audio included."
}

fn extract_gemini_takeout_text(item: &Value) -> GeminiExtraction {
    if let Some(ga) = item.get("gemini_activity") {
        if let Some(p) = ga.get("prompt").or_else(|| ga.get("text")).and_then(|v| v.as_str()) {
            if !p.trim().is_empty() {
                return GeminiExtraction::Prompt(p.to_string());
            }
        }
    }
    let mut parts = Vec::new();
    if let Some(title) = item.get("title").and_then(|v| v.as_str()) {
        if is_gemini_system_event_title(title) {
            return GeminiExtraction::SystemEvent;
        }
        let stripped = title
            .strip_prefix("Prompted ")
            .or_else(|| title.strip_prefix("Asked "))
            .or_else(|| title.strip_prefix("Submitted prompt:"))
            .or_else(|| title.strip_prefix("Branched "))
            .or_else(|| title.strip_prefix("Added chat from link:"))
            .unwrap_or(title)
            .trim();
        if !stripped.is_empty() && !stripped.eq_ignore_ascii_case("Gemini Apps") {
            parts.push(stripped.to_string());
        }
    }
    if let Some(subs) = item.get("subtitles").and_then(|v| v.as_array()) {
        for sub in subs {
            if let Some(name) = sub.get("name").or_else(|| sub.get("text")).and_then(|v| v.as_str())
            {
                let trimmed = name.trim();
                if !trimmed.is_empty()
                    && !is_gemini_attachment_subtitle(sub, trimmed)
                    && !parts.iter().any(|existing| existing == trimmed)
                {
                    parts.push(trimmed.to_string());
                }
            }
        }
    }
    if parts.is_empty() {
        GeminiExtraction::Empty
    } else {
        GeminiExtraction::Prompt(parts.join("\n"))
    }
}

#[allow(clippy::too_many_arguments)]
fn ingest_single_prompt_with_local_ts(
    raw_text: &str,
    created_at: String,
    local_ts: &str,
    convo_id: &str,
    source: PromptSource,
    seen_hashes: &mut HashSet<String>,
    summary: &mut IngestionSummary,
    results: &mut Vec<NormalizedPrompt>,
) {
    summary.total_raw_prompts += 1;
    let scrubbed = scrub_prompt(raw_text);
    summary.total_redactions += scrubbed.redactions_made;
    if scrubbed.is_noise_or_boilerplate {
        summary.noise_filtered_out += 1;
        return;
    }
    let hash = compute_hash(&scrubbed.cleaned_text);
    if !seen_hashes.insert(hash.clone()) {
        summary.duplicates_removed += 1;
        return;
    }
    let local_hour = extract_hour(local_ts);
    let (is_high_signal, signal_categories) =
        classify_signals(&scrubbed.cleaned_text, scrubbed.word_count);
    let skill_tier = classify_skill_tier(
        &scrubbed.cleaned_text,
        scrubbed.word_count,
        &signal_categories,
    );

    results.push(NormalizedPrompt {
        id: hash,
        source,
        conversation_id: convo_id.to_string(),
        created_at,
        local_hour,
        cleaned_text: scrubbed.cleaned_text,
        word_count: scrubbed.word_count,
        redactions_made: scrubbed.redactions_made,
        is_high_signal,
        signal_categories,
        skill_tier,
    });
}

fn ingest_single_prompt(
    raw_text: &str,
    created_at: String,
    convo_id: &str,
    source: PromptSource,
    seen_hashes: &mut HashSet<String>,
    summary: &mut IngestionSummary,
    results: &mut Vec<NormalizedPrompt>,
) {
    let local_ts = created_at.clone();
    ingest_single_prompt_with_local_ts(
        raw_text,
        created_at,
        &local_ts,
        convo_id,
        source,
        seen_hashes,
        summary,
        results,
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn parses_openai_chatgpt_export_with_epoch_timestamps() {
        let sample_chatgpt = r#"[
            {
                "id": "conv-openai-1",
                "create_time": 1729026000.0,
                "mapping": {
                    "node-1": {
                        "message": {
                            "author": { "role": "user" },
                            "create_time": 1729026000.0,
                            "content": {
                                "parts": [
                                    "I want to architect an automated data pipeline that replaces manual maintenance and scales our product strategy."
                                ]
                            }
                        }
                    }
                }
            }
        ]"#;
        let (prompts, summary) =
            parse_exported_conversations_json(sample_chatgpt).expect("valid openai export");
        assert_eq!(prompts.len(), 1);
        assert_eq!(prompts[0].source, PromptSource::ChatGptWeb);
        assert!(prompts[0].created_at.starts_with("2024-10-15T"));
        assert!(prompts[0].local_hour.is_some());
        assert_eq!(summary.clean_prompts_kept, 1);
        assert!(summary.earliest_date.is_some());
        assert!(!summary.category_counts.is_empty());
    }

    #[test]
    fn parses_anthropic_claude_export_with_text_and_content_blocks() {
        let sample_claude = r#"[
            {
                "uuid": "claude-conv-1",
                "chat_messages": [
                    {
                        "sender": "human",
                        "created_at": "2026-02-14T21:30:00Z",
                        "text": "As a skeptic, critique my developer tooling architecture and expose its flaws so I can build a resilient engine."
                    },
                    {
                        "role": "user",
                        "created_at": "2026-02-14T22:15:00Z",
                        "content": [
                            { "type": "text", "text": "How does our database schema scale when we add vector search and graph telemetry for enterprise clients?" }
                        ]
                    },
                    {
                        "sender": "assistant",
                        "created_at": "2026-02-14T22:16:00Z",
                        "text": "Assistant response should be ignored by user prompt ingestion."
                    }
                ]
            }
        ]"#;
        let (claude_prompts, claude_sum) =
            parse_exported_conversations_json(sample_claude).expect("valid claude export");
        assert_eq!(claude_prompts.len(), 2);
        assert_eq!(claude_prompts[0].source, PromptSource::ClaudeWeb);
        assert_eq!(claude_prompts[0].local_hour, Some(21));
        assert_eq!(claude_prompts[1].local_hour, Some(22));
        assert_eq!(claude_sum.hourly_distribution[21], 1);
        assert_eq!(claude_sum.hourly_distribution[22], 1);
    }

    #[test]
    fn parses_google_gemini_takeout_activity_records() {
        let sample_gemini = r#"[
            {
                "header": "Gemini Apps",
                "title": "Prompted How should I position my systems architecture portfolio for principal platform engineering roles?",
                "time": "2026-03-01T19:15:00Z",
                "subtitles": [
                    { "name": "Focus on measurable unit economics and reusable developer tooling." }
                ]
            },
            {
                "gemini_activity": {
                    "prompt": "Why is first principles thinking essential when designing interactive simulation economies and telemetry pipelines?"
                },
                "timestamp": "2026-03-02T20:00:00Z"
            }
        ]"#;
        let (gemini_prompts, gemini_sum) =
            parse_exported_conversations_json(sample_gemini).expect("valid gemini takeout");
        assert_eq!(gemini_prompts.len(), 2);
        assert_eq!(gemini_prompts[0].source, PromptSource::GeminiTakeout);
        assert_eq!(gemini_prompts[0].local_hour, Some(19));
        assert_eq!(gemini_prompts[1].local_hour, Some(20));
        assert_eq!(gemini_sum.clean_prompts_kept, 2);
        assert_eq!(
            gemini_sum.source_counts,
            vec![("Google Gemini Takeout".to_string(), 2)]
        );
    }

    #[test]
    fn parses_markdown_journals_with_date_headings_and_sections() {
        let sample_md = "# 2026-03-10 22:00\nI feel energized when building automated developer workflows and eliminating repetitive manual tasks for my team.\n\n---\n\n## 2026-03-11 09:30\n- My goal this quarter is to ship an open-core schema compiler that gives engineers clarity and autonomy.";
        let (md_prompts, md_sum) =
            parse_exported_conversations_json(sample_md).expect("valid markdown journal");
        assert_eq!(md_prompts.len(), 2);
        assert_eq!(md_prompts[0].source, PromptSource::MarkdownJournal);
        assert_eq!(md_prompts[0].local_hour, Some(22));
        assert_eq!(md_prompts[1].local_hour, Some(9));
        assert_eq!(md_sum.clean_prompts_kept, 2);
    }

    #[test]
    fn unwraps_container_objects_for_conversations_and_activities() {
        let wrapped = r#"{
            "conversations": [
                {
                    "uuid": "wrapped-1",
                    "chat_messages": [
                        {
                            "sender": "human",
                            "created_at": "2026-01-20T14:00:00Z",
                            "text": "Let us design a clean API workflow that simplifies client onboarding and pricing strategy."
                        }
                    ]
                }
            ]
        }"#;
        let (prompts, summary) =
            parse_exported_conversations_json(wrapped).expect("valid wrapped object");
        assert_eq!(prompts.len(), 1);
        assert_eq!(summary.clean_prompts_kept, 1);
    }

    #[test]
    fn deduplicates_identical_prompts_and_counts_redactions_and_noise() {
        let export_with_dups = r#"[
            {
                "uuid": "dup-test",
                "chat_messages": [
                    {
                        "sender": "human",
                        "created_at": "2026-02-01T10:00:00Z",
                        "text": "Contact me at founder@domain.io to review our platform architecture and product pricing strategy."
                    },
                    {
                        "sender": "human",
                        "created_at": "2026-02-01T11:00:00Z",
                        "text": "Contact me at founder@domain.io to review our platform architecture and product pricing strategy."
                    },
                    {
                        "sender": "human",
                        "created_at": "2026-02-01T12:00:00Z",
                        "text": "git status"
                    }
                ]
            }
        ]"#;
        let (prompts, summary) =
            parse_exported_conversations_json(export_with_dups).expect("valid export");
        assert_eq!(summary.total_raw_prompts, 3);
        assert_eq!(summary.noise_filtered_out, 1);
        assert_eq!(summary.duplicates_removed, 1);
        assert_eq!(summary.clean_prompts_kept, 1);
        assert_eq!(summary.total_redactions, 2);
        assert_eq!(prompts.len(), 1);
        assert!(prompts[0].cleaned_text.contains("[REDACTED_EMAIL]"));
    }

    #[test]
    fn classifies_all_five_behavioral_signal_categories_accurately() {
        let text = "As a skeptic (/grill-me), why should I architect this automated database pipeline to grow my career revenue and achieve family stability and autonomy?";
        let word_count = text.split_whitespace().count();
        let (is_high, cats) = classify_signals(text, word_count);
        assert!(is_high);
        assert!(cats.contains(&"Career & Positioning".to_string()));
        assert!(cats.contains(&"Values & Motivation".to_string()));
        assert!(cats.contains(&"Systems & Architecture".to_string()));
        assert!(cats.contains(&"Curiosity & Learning".to_string()));
        assert!(cats.contains(&"Skeptical Truth-Seeking".to_string()));
    }

    #[test]
    fn summarizes_persisted_multi_provider_prompts_with_source_breakdown() {
        let p1 = NormalizedPrompt {
            id: "h1".to_string(),
            source: PromptSource::ChatGptWeb,
            conversation_id: "c1".to_string(),
            created_at: "2026-01-10T08:00:00Z".to_string(),
            local_hour: Some(8),
            cleaned_text: "Designing an automated system architecture for enterprise scale and clarity.".to_string(),
            word_count: 10,
            redactions_made: 1,
            is_high_signal: true,
            signal_categories: vec!["Systems & Architecture".to_string()],
            skill_tier: SkillTier::Advanced,
        };
        let p2 = NormalizedPrompt {
            id: "h2".to_string(),
            source: PromptSource::GeminiTakeout,
            conversation_id: "c2".to_string(),
            created_at: "2026-02-20T21:00:00Z".to_string(),
            local_hour: Some(21),
            cleaned_text: "Evaluating product pricing strategy and ICP positioning for long-term autonomy.".to_string(),
            word_count: 10,
            redactions_made: 2,
            is_high_signal: true,
            signal_categories: vec!["Career & Positioning".to_string()],
            skill_tier: SkillTier::Advanced,
        };
        let summary = summarize_persisted_prompts(&[p1, p2]);
        assert_eq!(summary.clean_prompts_kept, 2);
        assert_eq!(summary.high_signal_prompts, 2);
        assert_eq!(summary.total_redactions, 3);
        assert_eq!(
            summary.earliest_date.as_deref(),
            Some("2026-01-10T08:00:00Z")
        );
        assert_eq!(summary.latest_date.as_deref(), Some("2026-02-20T21:00:00Z"));
        assert_eq!(summary.hourly_distribution[8], 1);
        assert_eq!(summary.hourly_distribution[21], 1);
        assert_eq!(summary.source_counts.len(), 2);
        assert_eq!(summary.tier_counts, [0, 0, 2]);
        assert_eq!(summary.overall_positioning, "Advanced → Senior / Staff");
    }

    #[test]
    fn classifies_beginner_intermediate_and_advanced_skill_tiers_honestly() {
        let beg_text = "How do I write a basic hello world function for a beginner in python?";
        let (_, beg_cats) = classify_signals(beg_text, 14);
        assert_eq!(
            classify_skill_tier(beg_text, 14, &beg_cats),
            SkillTier::Beginner
        );

        let int_text = "Let us implement and test an API endpoint using SQLite and TypeScript for our user component.";
        let (_, int_cats) = classify_signals(int_text, 16);
        assert_eq!(
            classify_skill_tier(int_text, 16, &int_cats),
            SkillTier::Intermediate
        );

        let adv_text = "As a skeptic (/grill-me), critique our distributed schema architecture, latency tradeoffs, and unit economics from first principles.";
        let (_, adv_cats) = classify_signals(adv_text, 17);
        assert_eq!(
            classify_skill_tier(adv_text, 17, &adv_cats),
            SkillTier::Advanced
        );
    }

    #[test]
    fn scans_antigravity_brain_dir_and_prefers_transcript_full_over_transcript() {
        let temp_root = std::env::temp_dir().join(format!(
            "clearspace_brain_test_{}",
            std::process::id()
        ));
        let convo_dir = temp_root.join("convo-abc-123").join("logs").join("sub");
        let _ = fs::remove_dir_all(&temp_root);
        fs::create_dir_all(&convo_dir).expect("create temp brain dir");

        let line_full = r#"{"type":"USER_INPUT","created_at":"2026-03-05T20:15:00Z","content":"The current local time is: 2026-03-05T20:15:00-05:00\n<USER_REQUEST>\nI want to architect a modular Rust and SQLite telemetry engine that eliminates manual maintenance.\n</USER_REQUEST>"}"#;
        let line_dup = r#"{"type":"USER_INPUT","created_at":"2026-03-05T20:15:00Z","content":"<USER_REQUEST>\nDifferent prompt inside transcript.jsonl that should be skipped when transcript_full.jsonl exists in same folder.\n</USER_REQUEST>"}"#;

        fs::write(convo_dir.join("transcript_full.jsonl"), line_full).expect("write full");
        fs::write(convo_dir.join("transcript.jsonl"), line_dup).expect("write transcript");

        let (prompts, summary) = scan_antigravity_brain_dir(&temp_root);
        let _ = fs::remove_dir_all(&temp_root);

        assert_eq!(summary.total_files_scanned, 1);
        assert_eq!(prompts.len(), 1);
        assert_eq!(prompts[0].source, PromptSource::Antigravity);
        assert_eq!(prompts[0].local_hour, Some(20));
        assert!(prompts[0].is_high_signal);
    }

    #[test]
    fn returns_error_on_empty_or_malformed_json_payloads() {
        assert!(parse_exported_conversations_json("   ").is_err());
        assert!(parse_exported_conversations_json("[{bad json").is_err());
        assert!(parse_exported_conversations_json(r#"{"unrelated_key": 123}"#).is_err());
    }

    #[test]
    fn benchmark_1000_prompts_ingestion_completes_under_150ms() {
        let mut items = Vec::with_capacity(1000);
        for i in 0..1000 {
            let hour = i % 24;
            items.push(format!(
                r#"{{"sender":"human","created_at":"2026-03-01T{:02}:15:00Z","text":"Prompt #{i}: I want to architect a scalable Rust and SQLite automation pipeline for enterprise client strategy and long-term autonomy without manual maintenance."}}"#,
                hour
            ));
        }
        let payload = format!(
            r#"[{{"uuid":"bench-1000","chat_messages":[{}]}}]"#,
            items.join(",")
        );

        // Warm up regex compilation OnceLock before timing
        let _ = scrub_prompt("warmup prompt with enough words to initialize static regexes");
        let _ = classify_signals("warmup career architecture prompt for signal regexes", 12);

        let start = Instant::now();
        let (prompts, summary) =
            parse_exported_conversations_json(&payload).expect("benchmark payload valid");
        let elapsed = start.elapsed();

        assert_eq!(prompts.len(), 1000);
        assert_eq!(summary.clean_prompts_kept, 1000);
        assert_eq!(summary.high_signal_prompts, 1000);
        assert!(
            elapsed.as_millis() < 150,
            "Expected 1,000-prompt ingestion under 150ms, took {}ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn detects_anthropic_export_manifest_with_actionable_download_links() {
        let manifest_json = r#"{
            "instructions": "Download each file using the export_url.",
            "created_at": "2026-10-30T16:38:23.517958+00:00",
            "total_files": 3,
            "data_files": [
                {
                    "batch_index": 0,
                    "export_url": "https://claude.ai/export/abc/download/111",
                    "category": "light_metadata",
                    "part": 0,
                    "filename": "light_metadata-000.zip"
                },
                {
                    "batch_index": 1,
                    "export_url": "https://claude.ai/export/abc/download/222",
                    "category": "projects",
                    "part": 0,
                    "filename": "projects-000.zip"
                },
                {
                    "batch_index": 2,
                    "export_url": "https://claude.ai/export/abc/download/333",
                    "category": "conversations",
                    "part": 0,
                    "filename": "conversations-000.zip"
                }
            ],
            "version": "1.0"
        }"#;
        let (prompts, summary) =
            parse_exported_conversations_json(manifest_json).expect("manifest handled gracefully");
        assert!(prompts.is_empty());
        assert_eq!(summary.detected_format, "Anthropic Claude Export Manifest");
        assert_eq!(summary.manifest_links.len(), 3);
        assert_eq!(summary.manifest_links[2].filename, "conversations-000.zip");
        assert_eq!(summary.manifest_links[2].category, "conversations");
        assert!(!summary.warnings.is_empty());
    }

    #[test]
    fn parses_gemini_workspace_conversation_turns_and_filters_system_canvas_events() {
        let workspace_txt = r#"{
            "conversation_turns": [
                {
                    "user_turn": {
                        "prompt": "what's the time to kill formula again? Enemy max health is 100",
                        "turn_index": 0,
                        "turn_last_modified": "2026-08-23T01:29:39.506159+00:00"
                    }
                },
                {
                    "user_turn": {
                        "prompt": "how to format in miliseconds?",
                        "turn_index": 2,
                        "turn_last_modified": "2026-08-23T01:31:02.403039+00:00"
                    }
                }
            ]
        }"#;
        let (prompts, summary) =
            parse_exported_conversations_json(workspace_txt).expect("valid workspace turns");
        assert_eq!(summary.total_raw_prompts, 2);
        assert_eq!(summary.noise_filtered_out, 0);
        assert_eq!(prompts.len(), 2);
        assert_eq!(prompts[0].source, PromptSource::GeminiTakeout);

        let mixed_gemini = r#"[
            {
                "header": "Gemini Apps",
                "title": "Cleared previous feedback",
                "time": "2026-10-30T14:09:23.535Z"
            },
            {
                "header": "Gemini Apps",
                "title": "Created Gemini Canvas titled HomeSchoolPup Growth & Rev-Share Launch Checklist",
                "time": "2026-10-30T14:09:00.000Z",
                "subtitles": [{ "name": "```html\n<!DOCTYPE html><html></html>\n```" }]
            },
            {
                "header": "Gemini Apps",
                "title": "Branched How can I build a structured dataset pipeline that powers gaming LLMs and telemetry?",
                "time": "2026-10-28T21:18:06.123Z",
                "subtitles": [{ "name": "1 generated image." }]
            }
        ]"#;
        let (g_prompts, g_summary) =
            parse_exported_conversations_json(mixed_gemini).expect("valid mixed gemini");
        assert_eq!(g_prompts.len(), 1);
        assert_eq!(g_summary.noise_filtered_out, 2);
        assert!(g_prompts[0]
            .cleaned_text
            .starts_with("How can I build a structured dataset pipeline"));
        assert!(!g_prompts[0].cleaned_text.contains("1 generated image"));
    }

    #[test]
    fn parses_gemini_gems_html_and_empty_scheduled_actions_html() {
        let gems_html = "<div><b>Name:</b>LoL Matchup Coach<br><b>Instructions:</b>You are a league of legends expert analyst. You look at matchups and recommend the optimal strategy and early build recommendations.<br><br></div>";
        let (prompts, summary) =
            parse_exported_conversations_json(gems_html).expect("valid gems html");
        assert_eq!(prompts.len(), 1);
        assert_eq!(prompts[0].source, PromptSource::GeminiTakeout);
        assert!(prompts[0].cleaned_text.contains("LoL Matchup Coach"));
        assert_eq!(
            summary.detected_format,
            "Google Gemini Takeout (Custom Gems HTML)"
        );

        let empty_html = "<div></div>";
        let (empty_p, empty_s) =
            parse_exported_conversations_json(empty_html).expect("empty html handled");
        assert!(empty_p.is_empty());
        assert_eq!(empty_s.detected_format, "Empty HTML Export");
        assert!(!empty_s.warnings.is_empty());
    }

    #[test]
    fn computes_everyday_professional_and_technical_writing_levels_from_prompt_complexity() {
        let empty_metrics = compute_writing_level(&[]);
        assert_eq!(empty_metrics.measured_level, WritingLevel::Everyday);
        assert_eq!(empty_metrics.level_label, "Everyday / Plain English");

        let everyday_md = "# 2026-03-01 10:00\nHow do I make a simple website for my small bakery shop? I want people to see our menu and order bread online without getting confused.";
        let (ev_prompts, ev_sum) =
            parse_exported_conversations_json(everyday_md).expect("valid everyday md");
        assert_eq!(ev_prompts.len(), 1);
        assert_eq!(ev_sum.writing_level.measured_level, WritingLevel::Everyday);
        assert!(ev_sum.writing_level.flesch_kincaid_grade < 9.5);
        assert!(ev_sum.writing_level.jargon_density_pct < 12.0);

        let prof_md = "# 2026-03-02 11:00\nCan you help me organize our quarterly project roadmap and prepare a clear status update for our client stakeholders? We need to review delivery milestones and resource allocation.";
        let (prof_prompts, prof_sum) =
            parse_exported_conversations_json(prof_md).expect("valid prof md");
        assert_eq!(prof_prompts.len(), 1);
        assert_eq!(
            prof_sum.writing_level.measured_level,
            WritingLevel::Professional
        );
        assert!(
            prof_sum.writing_level.flesch_kincaid_grade >= 9.5
                || prof_sum.writing_level.jargon_density_pct >= 12.0
        );

        let tech_md = "# 2026-03-03 21:00\nI want to architect an automated pipeline and MCP agent workflow using Rust and SQLite so our team can eliminate manual maintenance and scale system throughput with clear unit economics.";
        let (tech_prompts, tech_sum) =
            parse_exported_conversations_json(tech_md).expect("valid tech md");
        assert_eq!(tech_prompts.len(), 1);
        assert_eq!(tech_sum.writing_level.measured_level, WritingLevel::Technical);
        assert!(tech_sum.writing_level.flesch_kincaid_grade >= 12.5);
        assert!(tech_sum.writing_level.jargon_density_pct >= 20.0);
    }

    #[test]
    fn tracks_daily_prompt_quality_improvements_and_regressions_chronologically() {
        let md = "# 2026-03-01 10:00\nWhat is a syntax error for a beginner just starting out?\n\n# 2026-03-02 10:00\nI want to architect an automated telemetry pipeline with deterministic schema tradeoffs and unit economics.\n\n# 2026-03-03 10:00\nHow do I fix this syntax error in my basic hello world tutorial for a newbie?";
        let (_prompts, summary) = parse_exported_conversations_json(md).expect("valid md");
        assert_eq!(summary.daily_prompt_quality.len(), 3);
        assert_eq!(summary.daily_prompt_quality[0].date, "2026-03-01");
        assert_eq!(summary.daily_prompt_quality[0].tier_counts, [1, 0, 0]);
        assert_eq!(summary.daily_prompt_quality[1].date, "2026-03-02");
        assert_eq!(summary.daily_prompt_quality[1].tier_counts, [0, 0, 1]);
        assert!(summary.daily_prompt_quality[1].avg_quality_score > summary.daily_prompt_quality[0].avg_quality_score);
        assert_eq!(summary.daily_prompt_quality[2].date, "2026-03-03");
        assert_eq!(summary.daily_prompt_quality[2].tier_counts, [1, 0, 0]);
        assert!(summary.daily_prompt_quality[2].avg_quality_score < summary.daily_prompt_quality[1].avg_quality_score);
    }
}
