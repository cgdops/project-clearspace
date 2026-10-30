use clearspace_pii_scrubber::scrub_prompt;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::OnceLock;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PromptSource {
    Antigravity,
    ClaudeWeb,
    ChatGptWeb,
    GeminiTakeout,
    MarkdownJournal,
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
}

struct SignalPatterns {
    user_req: Regex,
    local_time: Regex,
    hour_iso: Regex,
    career: Regex,
    values_emotion: Regex,
    architecture: Regex,
    learning: Regex,
    grill_me: Regex,
}

fn patterns() -> &'static SignalPatterns {
    static INSTANCE: OnceLock<SignalPatterns> = OnceLock::new();
    INSTANCE.get_or_init(|| SignalPatterns {
        user_req: Regex::new(r"(?s)<USER_REQUEST>\s*(.*?)\s*</USER_REQUEST>").unwrap(),
        local_time: Regex::new(r"The current local time is:\s*([^\n\r.]+)").unwrap(),
        hour_iso: Regex::new(r"T(\d{2}):\d{2}").unwrap(),
        career: Regex::new(r"(?i)\b(career|job|resume|interview|role|salary|hire|hiring|company|director|manager|lead|position|linkedin|portfolio|freelance|agency|client|pricing|revenue|offer|laid off|industry)\b").unwrap(),
        values_emotion: Regex::new(r"(?i)\b(i want|i feel|i think|my goal|honestly|frustrat|worry|afraid|doubt|wonder|struggl|burnout|demoraliz|excited|love|hate|family|kids|home|stability|unfair advantage|authentic|simplify)\b").unwrap(),
        architecture: Regex::new(r"(?i)\b(architect|system|design|principle|tradeoff|scale|database|graph|vector|agent|automation|pipeline|telemetry|optimize|routing|engine|editor)\b").unwrap(),
        learning: Regex::new(r"(?i)\b(why|how does|what is the best|explain|understand|learn|teach|difference between|should i|recommend|what do you think)\b").unwrap(),
        grill_me: Regex::new(r"(?i)(/grill-me|as a skeptic|expose its flaws|super critical|worth solving)").unwrap(),
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

fn extract_hour(timestamp_str: &str) -> Option<u8> {
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

fn classify_signals(text: &str, word_count: usize) -> (bool, Vec<String>) {
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
        // If transcript_full.jsonl exists in the same folder, skip transcript.jsonl to avoid double scanning
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

            summary.total_raw_prompts += 1;
            let scrubbed = scrub_prompt(extracted_text);
            summary.total_redactions += scrubbed.redactions_made;

            if scrubbed.is_noise_or_boilerplate {
                summary.noise_filtered_out += 1;
                continue;
            }

            let hash = compute_hash(&scrubbed.cleaned_text);
            if !seen_hashes.insert(hash.clone()) {
                summary.duplicates_removed += 1;
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

            let local_hour = extract_hour(&local_ts);
            if let Some(h) = local_hour {
                summary.hourly_distribution[h as usize] += 1;
            }

            let (is_high_signal, signal_categories) =
                classify_signals(&scrubbed.cleaned_text, scrubbed.word_count);
            if is_high_signal {
                summary.high_signal_prompts += 1;
            }

            summary.clean_prompts_kept += 1;
            results.push(NormalizedPrompt {
                id: hash,
                source: PromptSource::Antigravity,
                conversation_id: convo_id.clone(),
                created_at,
                local_hour,
                cleaned_text: scrubbed.cleaned_text,
                word_count: scrubbed.word_count,
                redactions_made: scrubbed.redactions_made,
                is_high_signal,
                signal_categories,
            });
        }
    }

    results.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    summary.earliest_date = results.first().map(|r| r.created_at.clone());
    summary.latest_date = results.last().map(|r| r.created_at.clone());

    let mut cat_map = std::collections::HashMap::new();
    for r in &results {
        for c in &r.signal_categories {
            *cat_map.entry(c.clone()).or_insert(0usize) += 1;
        }
    }
    let mut cat_vec: Vec<(String, usize)> = cat_map.into_iter().collect();
    cat_vec.sort_by(|a, b| b.1.cmp(&a.1));
    summary.category_counts = cat_vec;

    (results, summary)
}

/// Parses Claude Web `conversations.json` or ChatGPT `conversations.json` export string.
pub fn parse_exported_conversations_json(
    json_str: &str,
) -> Result<(Vec<NormalizedPrompt>, IngestionSummary), String> {
    let root: Value = serde_json::from_str(json_str).map_err(|e| e.to_string())?;
    let Some(arr) = root.as_array() else {
        return Err("Expected JSON array of conversations".to_string());
    };

    let mut summary = IngestionSummary {
        total_files_scanned: 1,
        ..Default::default()
    };
    let mut seen_hashes = HashSet::new();
    let mut results = Vec::new();

    for convo in arr {
        let convo_id = convo
            .get("uuid")
            .or_else(|| convo.get("id"))
            .and_then(|v| v.as_str())
            .unwrap_or("export")
            .to_string();

        // Check Claude format (`chat_messages`)
        if let Some(msgs) = convo.get("chat_messages").and_then(|v| v.as_array()) {
            for msg in msgs {
                let sender = msg.get("sender").and_then(|v| v.as_str()).unwrap_or("");
                if sender != "human" {
                    continue;
                }
                let text = msg.get("text").and_then(|v| v.as_str()).unwrap_or("");
                let created_at = msg
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                ingest_single_prompt(
                    text,
                    created_at,
                    &convo_id,
                    PromptSource::ClaudeWeb,
                    &mut seen_hashes,
                    &mut summary,
                    &mut results,
                );
            }
        }
        // Check ChatGPT format (`mapping`)
        else if let Some(mapping) = convo.get("mapping").and_then(|v| v.as_object()) {
            for (_node_id, node) in mapping {
                let Some(message) = node.get("message") else {
                    continue;
                };
                let role = message
                    .get("author")
                    .and_then(|a| a.get("role"))
                    .and_then(|r| r.as_str())
                    .unwrap_or("");
                if role != "user" {
                    continue;
                }
                let parts = message
                    .get("content")
                    .and_then(|c| c.get("parts"))
                    .and_then(|p| p.as_array());
                if let Some(parts_arr) = parts {
                    let joined = parts_arr
                        .iter()
                        .filter_map(|p| p.as_str())
                        .collect::<Vec<_>>()
                        .join("\n");
                    let created_at = message
                        .get("create_time")
                        .and_then(|v| v.as_f64())
                        .map(|ts| ts.to_string())
                        .unwrap_or_default();
                    ingest_single_prompt(
                        &joined,
                        created_at,
                        &convo_id,
                        PromptSource::ChatGptWeb,
                        &mut seen_hashes,
                        &mut summary,
                        &mut results,
                    );
                }
            }
        }
    }

    Ok((results, summary))
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
    let local_hour = extract_hour(&created_at);
    if let Some(h) = local_hour {
        summary.hourly_distribution[h as usize] += 1;
    }
    let (is_high_signal, signal_categories) =
        classify_signals(&scrubbed.cleaned_text, scrubbed.word_count);
    if is_high_signal {
        summary.high_signal_prompts += 1;
    }
    summary.clean_prompts_kept += 1;
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
    });
}
