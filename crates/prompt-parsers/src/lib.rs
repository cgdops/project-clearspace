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
}

struct SignalPatterns {
    user_req: Regex,
    local_time: Regex,
    hour_iso: Regex,
    md_date_heading: Regex,
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
    summary.hourly_distribution = [0usize; 24];
    summary.tier_counts = [0usize; 3];
    summary.high_signal_prompts = 0;

    for r in results.iter() {
        if r.is_high_signal {
            summary.high_signal_prompts += 1;
        }
        if let Some(h) = r.local_hour {
            if (h as usize) < 24 {
                summary.hourly_distribution[h as usize] += 1;
            }
        }
        match r.skill_tier {
            SkillTier::Beginner => summary.tier_counts[0] += 1,
            SkillTier::Intermediate => summary.tier_counts[1] += 1,
            SkillTier::Advanced => summary.tier_counts[2] += 1,
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
        ..Default::default()
    };
    let mut seen_hashes = HashSet::new();
    let mut results = Vec::new();

    let mut current_date = String::from("2026-01-15T20:00:00Z");
    let mut current_block = String::new();

    for line in md_str.lines() {
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

/// Universal multi-provider parser supporting:
/// 1. OpenAI ChatGPT `conversations.json` (`mapping` nodes with Unix epoch `create_time`)
/// 2. Anthropic Claude `conversations.json` (`chat_messages` array with `sender == "human"` or `role == "user"`)
/// 3. Google Gemini Takeout `MyActivity.json` (`title: "Prompted ..."` / `gemini_activity` / `subtitles`)
/// 4. Markdown / Plain-Text Journals (when content is Markdown prose/headings)
pub fn parse_exported_conversations_json(
    raw_input: &str,
) -> Result<(Vec<NormalizedPrompt>, IngestionSummary), String> {
    let trimmed = raw_input.trim();
    if trimmed.is_empty() {
        return Err("Empty import file".to_string());
    }

    // If the file does not start with JSON delimiters `{` or `[`, parse as Markdown journal
    if !trimmed.starts_with('[') && !trimmed.starts_with('{') {
        return Ok(parse_markdown_journal(trimmed));
    }

    let root: Value = serde_json::from_str(trimmed).map_err(|e| e.to_string())?;

    // Unwrap either a top-level array or an object containing an array (`conversations`, `activities`, `messages`, `items`)
    let items_vec: Vec<Value> = if let Some(arr) = root.as_array() {
        arr.clone()
    } else if let Some(obj) = root.as_object() {
        if let Some(arr) = obj
            .get("conversations")
            .or_else(|| obj.get("activities"))
            .or_else(|| obj.get("items"))
            .or_else(|| obj.get("data"))
            .and_then(|v| v.as_array())
        {
            arr.clone()
        } else if obj.contains_key("chat_messages")
            || obj.contains_key("mapping")
            || obj.contains_key("title")
            || obj.contains_key("gemini_activity")
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

        // 1. Anthropic Claude format (`chat_messages` or `messages`)
        if let Some(msgs) = item
            .get("chat_messages")
            .or_else(|| item.get("messages"))
            .and_then(|v| v.as_array())
        {
            for msg in msgs {
                let sender = msg
                    .get("sender")
                    .or_else(|| msg.get("role"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if sender != "human" && sender != "user" {
                    continue;
                }
                let text = extract_claude_message_text(msg);
                let mut created_at = normalize_timestamp_value(
                    msg.get("created_at")
                        .or_else(|| msg.get("create_time"))
                        .or_else(|| msg.get("timestamp")),
                );
                if created_at.is_empty() {
                    created_at = convo_fallback_time.clone();
                }
                ingest_single_prompt(
                    &text,
                    created_at,
                    &convo_id,
                    PromptSource::ClaudeWeb,
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
                    .and_then(|r| r.as_str())
                    .unwrap_or("");
                if role != "user" {
                    continue;
                }
                let text = extract_chatgpt_message_text(message);
                if text.is_empty() {
                    continue;
                }
                let mut created_at = normalize_timestamp_value(
                    message
                        .get("create_time")
                        .or_else(|| message.get("created_at")),
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
        // 3. Google Gemini Takeout format (`MyActivity.json` or Gemini prompt objects)
        else if is_gemini_takeout_item(item) {
            if let Some(prompt_text) = extract_gemini_takeout_text(item) {
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
        }
        // 4. Generic prompt/reflection entry in JSON array (`{ "prompt": "...", "source": "..." }`)
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
    Ok((results, summary))
}

fn extract_claude_message_text(msg: &Value) -> String {
    if let Some(t) = msg.get("text").and_then(|v| v.as_str()) {
        if !t.trim().is_empty() {
            return t.to_string();
        }
    }
    if let Some(content_arr) = msg.get("content").and_then(|v| v.as_array()) {
        let joined = content_arr
            .iter()
            .filter_map(|block| {
                block
                    .get("text")
                    .and_then(|v| v.as_str())
                    .or_else(|| block.as_str())
            })
            .collect::<Vec<_>>()
            .join("\n");
        return joined;
    }
    if let Some(s) = msg.get("content").and_then(|v| v.as_str()) {
        return s.to_string();
    }
    String::new()
}

fn extract_chatgpt_message_text(message: &Value) -> String {
    let Some(content) = message.get("content") else {
        return String::new();
    };
    if let Some(parts) = content.get("parts").and_then(|p| p.as_array()) {
        let joined = parts
            .iter()
            .filter_map(|p| {
                if let Some(s) = p.as_str() {
                    Some(s)
                } else {
                    p.get("text").and_then(|t| t.as_str())
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        if !joined.trim().is_empty() {
            return joined;
        }
    }
    if let Some(text) = content.get("text").and_then(|t| t.as_str()) {
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
        {
            return true;
        }
    }
    if item.get("subtitles").is_some() && item.get("time").is_some() {
        return true;
    }
    false
}

fn extract_gemini_takeout_text(item: &Value) -> Option<String> {
    if let Some(ga) = item.get("gemini_activity") {
        if let Some(p) = ga.get("prompt").or_else(|| ga.get("text")).and_then(|v| v.as_str()) {
            return Some(p.to_string());
        }
    }
    let mut parts = Vec::new();
    if let Some(title) = item.get("title").and_then(|v| v.as_str()) {
        let stripped = title
            .strip_prefix("Prompted ")
            .or_else(|| title.strip_prefix("Asked "))
            .or_else(|| title.strip_prefix("Submitted prompt:"))
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
                if !trimmed.is_empty() && !parts.iter().any(|existing| existing == trimmed) {
                    parts.push(trimmed.to_string());
                }
            }
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("\n"))
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
}
