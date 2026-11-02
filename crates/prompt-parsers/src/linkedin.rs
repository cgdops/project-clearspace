use crate::{
    classify_signals, classify_skill_tier, compute_hash, decode_basic_html_entities, extract_hour,
    IngestionSummary, NormalizedPrompt, PromptSource,
};
use clearspace_pii_scrubber::{scrub_prompt, strip_prompt_injection};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInArchiveEntry {
    pub name: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInFileSummary {
    pub file_name: String,
    pub cluster_id: String,
    pub cluster_label: String,
    pub row_count: usize,
    pub date_range: String,
    pub key_fields: Vec<String>,
    pub plain_english_description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInNetworkStats {
    pub total_connections: usize,
    pub connections_by_year: Vec<(String, usize)>,
    pub top_companies: Vec<(String, usize)>,
    pub top_positions: Vec<(String, usize)>,
    pub invitations_sent: usize,
    pub invitations_received: usize,
    pub company_follows_count: usize,
    pub followed_companies_sample: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInRecommendationItem {
    pub person_name: String,
    pub role_company: String,
    pub date: String,
    pub status: String,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInMessagingStats {
    pub total_messages: usize,
    pub sent_messages: usize,
    pub received_messages: usize,
    pub messages_by_year: Vec<(String, usize)>,
    pub top_threads: Vec<(String, usize)>,
    pub recommendations_received_count: usize,
    pub recommendations_given_count: usize,
    pub endorsements_received_count: usize,
    pub endorsements_given_count: usize,
    pub recommendations_received: Vec<LinkedInRecommendationItem>,
    pub recommendations_given: Vec<LinkedInRecommendationItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInAdTargetingStats {
    pub member_age: String,
    pub years_of_experience: String,
    pub high_value_segments: Vec<String>,
    pub buyer_groups: Vec<String>,
    pub inferred_job_titles: Vec<String>,
    pub job_seniorities: Vec<String>,
    pub company_industries: Vec<String>,
    pub member_interests: Vec<String>,
    pub member_traits: Vec<String>,
    pub ad_inferred_skills: Vec<String>,
    pub declared_profile_skills: Vec<String>,
    pub skills_only_in_ad_engine: Vec<String>,
    pub skills_only_in_profile: Vec<String>,
    pub skills_overlap_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInPositionItem {
    pub title: String,
    pub company: String,
    pub started_on: String,
    pub finished_on: String,
    pub location: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInEducationItem {
    pub school: String,
    pub degree: String,
    pub start_date: String,
    pub end_date: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInArticleItem {
    pub title: String,
    pub published_date: String,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInCareerLearningStats {
    pub profile_headline: String,
    pub profile_industry: String,
    pub profile_location: String,
    pub profile_summary: String,
    pub positions: Vec<LinkedInPositionItem>,
    pub education: Vec<LinkedInEducationItem>,
    pub certifications: Vec<String>,
    pub projects: Vec<String>,
    pub honors: Vec<String>,
    pub organizations: Vec<String>,
    pub learning_total_courses: usize,
    pub learning_by_year: Vec<(String, usize)>,
    pub recent_courses: Vec<String>,
    pub top_endorsed_skills: Vec<(String, usize)>,
    pub articles_published: Vec<LinkedInArticleItem>,
    pub rich_media_posts_count: usize,
    pub rich_media_samples: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInJobApplicationItem {
    pub job_title: String,
    pub company: String,
    pub applied_date: String,
    pub resume_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInSavedJobItem {
    pub job_title: String,
    pub company: String,
    pub saved_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInJobSearchStats {
    pub applications_count: usize,
    pub saved_jobs_count: usize,
    pub applications_by_month: Vec<(String, usize)>,
    pub recent_applications: Vec<LinkedInJobApplicationItem>,
    pub saved_jobs: Vec<LinkedInSavedJobItem>,
    pub saved_job_alerts: Vec<String>,
    pub preferred_job_titles: Vec<String>,
    pub open_to_recruiters_statement: String,
    pub resume_versions: Vec<(String, usize)>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInThreeWayMirror {
    pub real_self_today: Vec<String>,
    pub peer_vouching: Vec<String>,
    pub ad_algorithm_box: Vec<String>,
    pub synthesis_narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInRelationshipSignature {
    pub outbound_invitations_with_notes: usize,
    pub total_threads_analyzed: usize,
    pub sent_to_received_ratio_pct: usize,
    pub mentoring_recommendations_given: usize,
    pub sample_outbound_opener: String,
    pub communication_traits: Vec<String>,
    pub synthesis_narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInCuriosityEvolution {
    pub early_foundations: Vec<String>,
    pub public_voice_milestones: Vec<String>,
    pub current_systems_edge: Vec<String>,
    pub synthesis_narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct LinkedInVaultAnalytics {
    pub total_files_parsed: usize,
    pub total_rows_parsed: usize,
    pub file_summaries: Vec<LinkedInFileSummary>,
    pub network: LinkedInNetworkStats,
    pub messaging: LinkedInMessagingStats,
    pub ad_targeting: LinkedInAdTargetingStats,
    pub career_learning: LinkedInCareerLearningStats,
    pub job_search: LinkedInJobSearchStats,
    pub three_way_mirror: LinkedInThreeWayMirror,
    pub relationship_signature: LinkedInRelationshipSignature,
    pub curiosity_evolution: LinkedInCuriosityEvolution,
}

struct LinkedInRegexes {
    mmddyy_time: Regex,
    dd_mmm_yyyy: Regex,
    yyyy_mm_dd_utc: Regex,
    yyyy_slash_utc: Regex,
    gmt_dow: Regex,
    long_month_day_year: Regex,
    mmm_yyyy: Regex,
    yyyy_only: Regex,
    alert_keywords: Regex,
    html_tag: Regex,
    article_h1: Regex,
    article_pub: Regex,
}

fn li_regexes() -> &'static LinkedInRegexes {
    static INSTANCE: OnceLock<LinkedInRegexes> = OnceLock::new();
    INSTANCE.get_or_init(|| LinkedInRegexes {
        mmddyy_time: Regex::new(
            r"(?i)^(\d{1,2})/(\d{1,2})/(\d{2,4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?",
        )
        .expect("mmddyy_time"),
        dd_mmm_yyyy: Regex::new(r"(?i)^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})").expect("dd_mmm_yyyy"),
        yyyy_mm_dd_utc: Regex::new(r"^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?")
            .expect("yyyy_mm_dd_utc"),
        yyyy_slash_utc: Regex::new(r"^(\d{4})/(\d{2})/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?")
            .expect("yyyy_slash_utc"),
        gmt_dow: Regex::new(
            r"(?i)^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+[A-Z]+\s+(\d{4})",
        )
        .expect("gmt_dow"),
        long_month_day_year: Regex::new(
            r"(?i)([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?",
        )
        .expect("long_month_day_year"),
        mmm_yyyy: Regex::new(r"(?i)^([A-Za-z]{3,9})\s+(\d{4})$").expect("mmm_yyyy"),
        yyyy_only: Regex::new(r"^(\d{4})$").expect("yyyy_only"),
        alert_keywords: Regex::new(r"keywords=([^,}]+)").expect("alert_keywords"),
        html_tag: Regex::new(r"<[^>]+>").expect("html_tag"),
        article_h1: Regex::new(r"(?is)<h1[^>]*>(.*?)</h1>").expect("article_h1"),
        article_pub: Regex::new(r"(?is)<p\s+class=[\x22']published[\x22'][^>]*>(.*?)</p>")
            .expect("article_pub"),
    })
}

fn month_name_to_num(name: &str) -> Option<u32> {
    match name.trim().to_ascii_lowercase().get(..3)? {
        "jan" => Some(1),
        "feb" => Some(2),
        "mar" => Some(3),
        "apr" => Some(4),
        "may" => Some(5),
        "jun" => Some(6),
        "jul" => Some(7),
        "aug" => Some(8),
        "sep" => Some(9),
        "oct" => Some(10),
        "nov" => Some(11),
        "dec" => Some(12),
        _ => None,
    }
}

/// Parses diverse LinkedIn date formats into canonical ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`).
pub fn normalize_linkedin_date(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let rx = li_regexes();

    // 1. YYYY-MM-DD HH:MM:SS UTC or ISO
    if let Some(c) = rx.yyyy_mm_dd_utc.captures(trimmed) {
        let y = &c[1];
        let m = &c[2];
        let d = &c[3];
        let hh = c.get(4).map(|x| x.as_str()).unwrap_or("12");
        let mm = c.get(5).map(|x| x.as_str()).unwrap_or("00");
        let ss = c.get(6).map(|x| x.as_str()).unwrap_or("00");
        return Some(format!("{y}-{m}-{d}T{hh}:{mm}:{ss}Z"));
    }

    // 2. YYYY/MM/DD HH:MM:SS UTC
    if let Some(c) = rx.yyyy_slash_utc.captures(trimmed) {
        let y = &c[1];
        let m = &c[2];
        let d = &c[3];
        let hh = c.get(4).map(|x| x.as_str()).unwrap_or("12");
        let mm = c.get(5).map(|x| x.as_str()).unwrap_or("00");
        let ss = c.get(6).map(|x| x.as_str()).unwrap_or("00");
        return Some(format!("{y}-{m}-{d}T{hh}:{mm}:{ss}Z"));
    }

    // 3. MM/DD/YY, HH:MM AM/PM (e.g. "10/29/26, 8:14 AM")
    if let Some(c) = rx.mmddyy_time.captures(trimmed) {
        let m: u32 = c[1].parse().ok()?;
        let d: u32 = c[2].parse().ok()?;
        let mut y: u32 = c[3].parse().ok()?;
        if y < 100 {
            y += if y >= 70 { 1900 } else { 2000 };
        }
        let mut hh: u32 = c.get(4).and_then(|x| x.as_str().parse().ok()).unwrap_or(12);
        let mm: u32 = c.get(5).and_then(|x| x.as_str().parse().ok()).unwrap_or(0);
        if let Some(ampm) = c.get(6) {
            let ap = ampm.as_str().to_ascii_uppercase();
            if ap == "PM" && hh < 12 {
                hh += 12;
            } else if ap == "AM" && hh == 12 {
                hh = 0;
            }
        }
        return Some(format!("{y:04}-{m:02}-{d:02}T{hh:02}:{mm:02}:00Z"));
    }

    // 4. DD MMM YYYY (e.g. "28 Oct 2026")
    if let Some(c) = rx.dd_mmm_yyyy.captures(trimmed) {
        let d: u32 = c[1].parse().ok()?;
        let m = month_name_to_num(&c[2])?;
        let y: u32 = c[3].parse().ok()?;
        return Some(format!("{y:04}-{m:02}-{d:02}T12:00:00Z"));
    }

    // 5. Mon Oct 26 14:51:42 GMT 2026
    if let Some(c) = rx.gmt_dow.captures(trimmed) {
        let m = month_name_to_num(&c[1])?;
        let d: u32 = c[2].parse().ok()?;
        let hh: u32 = c[3].parse().ok()?;
        let mm: u32 = c[4].parse().ok()?;
        let ss: u32 = c[5].parse().ok()?;
        let y: u32 = c[6].parse().ok()?;
        return Some(format!("{y:04}-{m:02}-{d:02}T{hh:02}:{mm:02}:{ss:02}Z"));
    }

    // 6. MMM YYYY (e.g. "Dec 2025")
    if let Some(c) = rx.mmm_yyyy.captures(trimmed) {
        let m = month_name_to_num(&c[1])?;
        let y: u32 = c[2].parse().ok()?;
        return Some(format!("{y:04}-{m:02}-01T12:00:00Z"));
    }

    // 7. YYYY only (e.g. "2012")
    if let Some(c) = rx.yyyy_only.captures(trimmed) {
        let y: u32 = c[1].parse().ok()?;
        return Some(format!("{y:04}-01-01T12:00:00Z"));
    }

    // 8. Embedded "October 21, 2026 at 2:01 PM"
    if let Some(c) = rx.long_month_day_year.captures(trimmed) {
        let m = month_name_to_num(&c[1])?;
        let d: u32 = c[2].parse().ok()?;
        let y: u32 = c[3].parse().ok()?;
        let mut hh: u32 = c.get(4).and_then(|x| x.as_str().parse().ok()).unwrap_or(12);
        let mm: u32 = c.get(5).and_then(|x| x.as_str().parse().ok()).unwrap_or(0);
        if let Some(ampm) = c.get(6) {
            let ap = ampm.as_str().to_ascii_uppercase();
            if ap == "PM" && hh < 12 {
                hh += 12;
            } else if ap == "AM" && hh == 12 {
                hh = 0;
            }
        }
        return Some(format!("{y:04}-{m:02}-{d:02}T{hh:02}:{mm:02}:00Z"));
    }

    None
}

/// RFC-4180 compliant CSV parser handling multi-line quoted fields, `""` escaped quotes, and BOMs.
pub fn parse_csv_rows(raw: &str) -> Vec<Vec<String>> {
    let input = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut current_field = String::new();
    let mut in_quotes = false;
    let mut chars = input.chars().peekable();

    while let Some(ch) = chars.next() {
        if in_quotes {
            if ch == '"' {
                if chars.peek() == Some(&'"') {
                    let _ = chars.next();
                    current_field.push('"');
                } else {
                    in_quotes = false;
                }
            } else {
                current_field.push(ch);
            }
        } else {
            match ch {
                '"' => {
                    in_quotes = true;
                }
                ',' => {
                    current_row.push(current_field.trim().to_string());
                    current_field.clear();
                }
                '\r' => {
                    if chars.peek() == Some(&'\n') {
                        let _ = chars.next();
                    }
                    current_row.push(current_field.trim().to_string());
                    current_field.clear();
                    if current_row.iter().any(|cell| !cell.is_empty()) {
                        rows.push(current_row);
                    }
                    current_row = Vec::new();
                }
                '\n' => {
                    current_row.push(current_field.trim().to_string());
                    current_field.clear();
                    if current_row.iter().any(|cell| !cell.is_empty()) {
                        rows.push(current_row);
                    }
                    current_row = Vec::new();
                }
                _ => {
                    current_field.push(ch);
                }
            }
        }
    }

    if !current_field.trim().is_empty() || !current_row.is_empty() {
        current_row.push(current_field.trim().to_string());
        if current_row.iter().any(|cell| !cell.is_empty()) {
            rows.push(current_row);
        }
    }

    // Handle Connections.csv 3-line "Notes:" preamble before actual CSV header row
    if let Some(first) = rows.first() {
        let first_cell_lower = first.first().map(|s| s.to_ascii_lowercase()).unwrap_or_default();
        if first_cell_lower.starts_with("notes:") || (first.len() == 1 && rows.len() > 1) {
            if let Some(header_idx) = rows
                .iter()
                .take(6)
                .position(|r| r.len() >= 3 && !r[0].to_ascii_lowercase().starts_with("notes"))
            {
                rows.drain(0..header_idx);
            }
        }
    }

    rows
}

/// Converts parsed CSV rows into `(headers, Vec<HashMap<String, String>>)` where duplicate column
/// headers (such as `Company Names` and `Job Titles` in `Ad_Targeting.csv`) have their non-empty
/// values merged with `"; "`.
pub fn parse_csv_records(raw: &str) -> (Vec<String>, Vec<HashMap<String, String>>) {
    let rows = parse_csv_rows(raw);
    let Some((header_row, data_rows)) = rows.split_first() else {
        return (Vec::new(), Vec::new());
    };
    let headers: Vec<String> = header_row.iter().map(|h| h.trim().to_string()).collect();
    let mut records = Vec::with_capacity(data_rows.len());

    for row in data_rows {
        let mut map: HashMap<String, String> = HashMap::with_capacity(headers.len());
        for (idx, h) in headers.iter().enumerate() {
            if h.is_empty() {
                continue;
            }
            let val = row.get(idx).map(|s| s.trim()).unwrap_or("");
            if val.is_empty() {
                map.entry(h.clone()).or_default();
            } else if let Some(existing) = map.get_mut(h) {
                if existing.is_empty() {
                    *existing = val.to_string();
                } else if !existing.split(';').any(|p| p.trim().eq_ignore_ascii_case(val)) {
                    existing.push_str("; ");
                    existing.push_str(val);
                }
            } else {
                map.insert(h.clone(), val.to_string());
            }
        }
        if map.values().any(|v| !v.is_empty()) {
            records.push(map);
        }
    }

    (headers, records)
}

fn split_semicolon_unique(raw: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for part in raw.split(';') {
        let clean = strip_prompt_injection(part.trim());
        if clean.is_empty() {
            continue;
        }
        let lower = clean.to_ascii_lowercase();
        if seen.insert(lower) {
            out.push(clean);
        }
    }
    out
}

fn classify_linkedin_file_cluster(file_name: &str) -> (&'static str, &'static str, &'static str) {
    let norm = file_name.replace('\\', "/");
    let lower = norm.to_ascii_lowercase();
    let base = lower.rsplit('/').next().unwrap_or(&lower);

    match base {
        "profile.csv" => (
            "profile_core",
            "Core Identity Hub (Profile.csv)",
            "Your public headline, executive summary, industry, and geographic anchor connecting all 5 LinkedIn data clusters.",
        ),
        "positions.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Chronological work history, role titles, organizations, tenure dates, and role descriptions.",
        ),
        "education.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Academic institutions, degrees, dates attended, and campus activities.",
        ),
        "certifications.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Professional licenses, technical certifications, issuing authorities, and credential dates.",
        ),
        "projects.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Shipped products, systems, and portfolio initiatives with descriptions and dates.",
        ),
        "honors.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Awards, competitions, and formal recognitions listed on your profile.",
        ),
        "organizations.csv" => (
            "career_credentials",
            "1. Career & Credentials",
            "Professional societies, boards, and community memberships.",
        ),
        "skills.csv" => (
            "skills_peer_proof",
            "2. Skills & Peer Proof",
            "Explicit skills you have chosen to display on your public LinkedIn profile.",
        ),
        "endorsement_received_info.csv" => (
            "skills_peer_proof",
            "2. Skills & Peer Proof",
            "Every skill endorsement colleagues have given you, with timestamp and endorser name.",
        ),
        "endorsement_given_info.csv" => (
            "skills_peer_proof",
            "2. Skills & Peer Proof",
            "Skills you have vouched for across your colleagues and collaborators.",
        ),
        "recommendations_received.csv" => (
            "skills_peer_proof",
            "2. Skills & Peer Proof",
            "Long-form written testimonials from managers, peers, and clients vouching for your impact.",
        ),
        "recommendations_given.csv" => (
            "skills_peer_proof",
            "2. Skills & Peer Proof",
            "Long-form written recommendations you have authored to mentor and champion others.",
        ),
        "connections.csv" => (
            "network_messaging",
            "3. Network & Messaging",
            "Every 1st-degree connection in your network with their current company, title, and connection date.",
        ),
        "invitations.csv" => (
            "network_messaging",
            "3. Network & Messaging",
            "Inbound and outbound connection requests, including custom intro notes and timestamps.",
        ),
        "messages.csv" => (
            "network_messaging",
            "3. Network & Messaging",
            "Full direct-message history across threads, capturing how you collaborate, mentor, and network.",
        ),
        "company follows.csv" => (
            "network_messaging",
            "3. Network & Messaging",
            "Organizations you follow on LinkedIn and when you started tracking them.",
        ),
        "job applications.csv" => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Every role applied to through LinkedIn, including company, timestamp, and exact resume file used.",
        ),
        "saved jobs.csv" => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Roles bookmarked for evaluation or follow-up during your job search.",
        ),
        "savedjobalerts.csv" => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Active search queries and target role keywords driving your job alerts.",
        ),
        "job seeker preferences.csv" => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Preferred job titles, locations, work modes, and your private note to recruiters.",
        ),
        "private_identity_asset.csv" => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Uploaded resume documents and identity assets stored in your LinkedIn account.",
        ),
        "ad_targeting.csv" => (
            "algorithmic_learning_voice",
            "5. Algorithmic Profile, Learning & Voice",
            "LinkedIn's internal ad-targeting classification of your seniority, buyer groups, inferred titles, and inferred skills.",
        ),
        "learning.csv" => (
            "algorithmic_learning_voice",
            "5. Algorithmic Profile, Learning & Voice",
            "LinkedIn Learning courses watched and completed, revealing your self-directed curiosity over time.",
        ),
        "rich_media.csv" => (
            "algorithmic_learning_voice",
            "5. Algorithmic Profile, Learning & Voice",
            "Feed posts, visual media descriptions, and external portfolio links shared publicly.",
        ),
        _ if lower.contains("articles/") && lower.ends_with(".html") => (
            "algorithmic_learning_voice",
            "5. Algorithmic Profile, Learning & Voice",
            "Long-form thought leadership articles authored and published on LinkedIn.",
        ),
        _ if lower.starts_with("jobs/") => (
            "job_search_positioning",
            "4. Job Search & Positioning",
            "Supplemental job search and application preferences tracked by LinkedIn.",
        ),
        _ => (
            "algorithmic_learning_voice",
            "5. Algorithmic Profile, Learning & Voice",
            "Account metadata, activity logs, and platform settings exported from LinkedIn.",
        ),
    }
}

/// Infers the canonical LinkedIn CSV filename from its header row when imported without a filename.
pub fn infer_linkedin_csv_filename(raw_content: &str) -> Option<&'static str> {
    let first_lines: String = raw_content.trim().lines().take(6).collect::<Vec<_>>().join("\n");
    if first_lines.contains("First Name,Last Name,URL,Email Address,Company,Position,Connected On") {
        Some("Connections.csv")
    } else if first_lines.contains("First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary") {
        Some("Profile.csv")
    } else if first_lines.contains("Company Name,Title,Description,Location,Started On,Finished On") {
        Some("Positions.csv")
    } else if first_lines.contains("Member Age,Buyer Groups,Company Names") {
        Some("Ad_Targeting.csv")
    } else if first_lines.contains("CONVERSATION ID,CONVERSATION TITLE,FROM,SENDER PROFILE URL") {
        Some("messages.csv")
    } else if first_lines.contains("From,To,Sent At,Message,Direction") {
        Some("Invitations.csv")
    } else if first_lines.contains("Endorsement Date,Skill Name,Endorser First Name") {
        Some("Endorsement_Received_Info.csv")
    } else if first_lines.contains("Endorsement Date,Skill Name,Endorsee First Name") {
        Some("Endorsement_Given_Info.csv")
    } else if first_lines.contains("First Name,Last Name,Company,Job Title,Text,Creation Date,Status") {
        Some("Recommendations_Received.csv")
    } else if first_lines.contains("First Name,Last Name,Company,Job Title,Text,Creation Date") {
        Some("Recommendations_Given.csv")
    } else if first_lines.contains("Application Date,Contact Email,Contact Phone Number,Company Name,Job Title") {
        Some("Jobs/Job Applications.csv")
    } else if first_lines.contains("Saved Date,Job Url,Company Name,Job Title") {
        Some("Jobs/Saved Jobs.csv")
    } else if first_lines.contains("ALERT_CREATION_DATE,SNIPPET,FREQUENCY,QUERY_CONTEXT") {
        Some("SavedJobAlerts.csv")
    } else if first_lines.contains("Locations,Industries,Company Employee Count,Preferred Job Types") {
        Some("Jobs/Job Seeker Preferences.csv")
    } else if first_lines.contains("Content Title,Content Description,Content Type,Content Watched") {
        Some("Learning.csv")
    } else if first_lines.contains("Date/Time,Media Description,Media Link") {
        Some("Rich_Media.csv")
    } else if first_lines.contains("Organization,Followed On") {
        Some("Company Follows.csv")
    } else if first_lines.contains("School Name,Start Date,End Date,Notes,Degree Name") {
        Some("Education.csv")
    } else if first_lines.contains("Title,Description,Url,Started On,Finished On") {
        Some("Projects.csv")
    } else {
        None
    }
}

/// Detects whether a single raw text file is a recognizable LinkedIn CSV or LinkedIn Article HTML.
pub fn is_linkedin_csv_or_html(file_name: &str, raw_content: &str) -> bool {
    let lower_name = file_name.to_ascii_lowercase();
    let trimmed = raw_content.trim();
    if lower_name.ends_with(".html")
        && (trimmed.contains("class=\"published\"") || trimmed.contains("class=\"article-body\""))
    {
        return true;
    }
    if lower_name.ends_with(".csv") {
        return true;
    }
    infer_linkedin_csv_filename(trimmed).is_some()
}

/// Parses a collection of LinkedIn Archive files (`.csv` and `.html`) into normalized prompts,
/// an `IngestionSummary`, and the comprehensive `LinkedInVaultAnalytics` structure for the 3-stage Vault Workbench.
pub fn parse_linkedin_archive_entries(
    entries: &[LinkedInArchiveEntry],
) -> (Vec<NormalizedPrompt>, IngestionSummary, LinkedInVaultAnalytics) {
    let rx = li_regexes();
    let mut analytics = LinkedInVaultAnalytics::default();
    let mut summary = IngestionSummary {
        total_files_scanned: entries.len().max(1),
        detected_format: "LinkedIn Data Archive (.zip / .csv)".to_string(),
        ..Default::default()
    };
    let mut seen_hashes = HashSet::new();
    let mut prompts: Vec<NormalizedPrompt> = Vec::new();

    let mut push_li_prompt = |raw_text: &str, created_at: &str, convo_id: &str| {
        let clean_inj = strip_prompt_injection(raw_text);
        if clean_inj.split_whitespace().count() < 8 {
            return;
        }
        summary.total_raw_prompts += 1;
        let scrubbed = scrub_prompt(&clean_inj);
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
        let ts = if created_at.is_empty() {
            "2026-06-15T14:00:00Z".to_string()
        } else {
            created_at.to_string()
        };
        let local_hour = extract_hour(&ts);
        let (is_high_signal, mut signal_categories) =
            classify_signals(&scrubbed.cleaned_text, scrubbed.word_count);
        if signal_categories.is_empty() && scrubbed.word_count >= 12 {
            signal_categories.push("Career & Positioning".to_string());
        }
        let is_high = !signal_categories.is_empty() && scrubbed.word_count >= 12;
        let skill_tier = classify_skill_tier(
            &scrubbed.cleaned_text,
            scrubbed.word_count,
            &signal_categories,
        );
        prompts.push(NormalizedPrompt {
            id: hash,
            source: PromptSource::LinkedInExport,
            conversation_id: convo_id.to_string(),
            created_at: ts,
            local_hour,
            cleaned_text: scrubbed.cleaned_text,
            word_count: scrubbed.word_count,
            redactions_made: scrubbed.redactions_made,
            is_high_signal: is_high || is_high_signal,
            signal_categories,
            skill_tier,
        });
    };

    let mut conn_years: HashMap<String, usize> = HashMap::new();
    let mut conn_companies: HashMap<String, usize> = HashMap::new();
    let mut conn_positions: HashMap<String, usize> = HashMap::new();
    let mut msg_years: HashMap<String, usize> = HashMap::new();
    let mut msg_threads: HashMap<String, usize> = HashMap::new();
    let mut endorsement_counts: HashMap<String, usize> = HashMap::new();
    let mut learning_years: HashMap<String, usize> = HashMap::new();
    let mut app_months: HashMap<String, usize> = HashMap::new();
    let mut resume_counts: HashMap<String, usize> = HashMap::new();
    let mut user_full_name = String::new();
    let mut article_count = 0usize;

    // Pre-scan Profile.csv (or outgoing Invitations.csv) so user_full_name is known
    // even when messages.csv appears earlier in the ZIP entry order.
    for entry in entries {
        let lower_name = entry.name.replace('\\', "/").to_ascii_lowercase();
        let base_name = lower_name.rsplit('/').next().unwrap_or(&lower_name);
        if base_name == "profile.csv" {
            let (_h, recs) = parse_csv_records(&entry.content);
            if let Some(rec) = recs.first() {
                let first = rec.get("First Name").cloned().unwrap_or_default();
                let last = rec.get("Last Name").cloned().unwrap_or_default();
                let candidate = format!("{first} {last}").trim().to_string();
                if !candidate.is_empty() {
                    user_full_name = candidate;
                    break;
                }
            }
        } else if base_name == "invitations.csv" && user_full_name.is_empty() {
            let (_h, recs) = parse_csv_records(&entry.content);
            for rec in &recs {
                let dir = rec.get("Direction").map(|s| s.to_ascii_uppercase()).unwrap_or_default();
                if dir.contains("OUTGOING") {
                    let from_name = rec.get("From").cloned().unwrap_or_default().trim().to_string();
                    if !from_name.is_empty() {
                        user_full_name = from_name;
                        break;
                    }
                }
            }
        }
    }

    for entry in entries {
        let norm_name = entry.name.replace('\\', "/");
        let lower_name = norm_name.to_ascii_lowercase();
        let base_name = lower_name.rsplit('/').next().unwrap_or(&lower_name);

        // Handle LinkedIn HTML Articles (`Articles/Articles/*.html`)
        if lower_name.ends_with(".html") {
            let title = rx
                .article_h1
                .captures(&entry.content)
                .map(|c| {
                    decode_basic_html_entities(&rx.html_tag.replace_all(&c[1], " "))
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" ")
                })
                .unwrap_or_else(|| base_name.trim_end_matches(".html").to_string());
            let pub_raw = rx
                .article_pub
                .captures(&entry.content)
                .map(|c| {
                    decode_basic_html_entities(&rx.html_tag.replace_all(&c[1], " "))
                        .replace("Published on", "")
                        .trim()
                        .to_string()
                })
                .unwrap_or_default();
            let pub_iso = normalize_linkedin_date(&pub_raw)
                .unwrap_or_else(|| "2018-06-15T12:00:00Z".to_string());
            let body_text = strip_prompt_injection(&decode_basic_html_entities(
                &rx.html_tag.replace_all(&entry.content, " "),
            ));
            let excerpt: String = body_text.chars().take(220).collect();

            if !title.is_empty() {
                article_count += 1;
                analytics.total_files_parsed += 1;
                analytics.total_rows_parsed += 1;
                analytics
                    .career_learning
                    .articles_published
                    .push(LinkedInArticleItem {
                        title: title.clone(),
                        published_date: pub_iso.chars().take(10).collect(),
                        excerpt: excerpt.clone(),
                    });
                push_li_prompt(
                    &format!("LinkedIn Published Article ({title}): {body_text}"),
                    &pub_iso,
                    &format!("li-article-{article_count}"),
                );
            }
            continue;
        }

        if !lower_name.ends_with(".csv") && !is_linkedin_csv_or_html(&norm_name, &entry.content) {
            continue;
        }

        let (headers, records) = parse_csv_records(&entry.content);
        if headers.is_empty() {
            continue;
        }

        analytics.total_files_parsed += 1;
        analytics.total_rows_parsed += records.len();

        let (cluster_id, cluster_label, purpose) = classify_linkedin_file_cluster(&norm_name);
        let mut file_dates: Vec<String> = Vec::new();
        for rec in &records {
            for val in rec.values() {
                if val.len() >= 4 && val.len() <= 48 {
                    if let Some(iso) = normalize_linkedin_date(val) {
                        file_dates.push(iso.chars().take(10).collect());
                    }
                }
            }
        }
        file_dates.sort();
        let date_range = match (file_dates.first(), file_dates.last()) {
            (Some(first), Some(last)) if first != last => format!("{first} → {last}"),
            (Some(only), _) => only.clone(),
            _ => "Profile Snapshot".to_string(),
        };

        let mut unique_headers = Vec::new();
        for h in &headers {
            if !h.is_empty() && !unique_headers.contains(h) && unique_headers.len() < 6 {
                unique_headers.push(h.clone());
            }
        }

        let display_name = if norm_name.contains('/') {
            let parts: Vec<&str> = norm_name.split('/').collect();
            if parts.len() >= 2 {
                format!("{}/{}", parts[parts.len() - 2], parts[parts.len() - 1])
            } else {
                norm_name.clone()
            }
        } else {
            norm_name.clone()
        };

        analytics.file_summaries.push(LinkedInFileSummary {
            file_name: display_name,
            cluster_id: cluster_id.to_string(),
            cluster_label: cluster_label.to_string(),
            row_count: records.len(),
            date_range,
            key_fields: unique_headers,
            plain_english_description: purpose.to_string(),
        });

        match base_name {
            "profile.csv" => {
                if let Some(rec) = records.first() {
                    let first = rec.get("First Name").cloned().unwrap_or_default();
                    let last = rec.get("Last Name").cloned().unwrap_or_default();
                    user_full_name = format!("{first} {last}").trim().to_string();
                    analytics.career_learning.profile_headline =
                        strip_prompt_injection(rec.get("Headline").map(|s| s.as_str()).unwrap_or(""));
                    analytics.career_learning.profile_industry =
                        strip_prompt_injection(rec.get("Industry").map(|s| s.as_str()).unwrap_or(""));
                    analytics.career_learning.profile_location =
                        strip_prompt_injection(rec.get("Geo Location").map(|s| s.as_str()).unwrap_or(""));
                    let clean_sum =
                        strip_prompt_injection(rec.get("Summary").map(|s| s.as_str()).unwrap_or(""));
                    analytics.career_learning.profile_summary = clean_sum.clone();
                    if !clean_sum.is_empty() {
                        push_li_prompt(
                            &format!(
                                "LinkedIn Profile Headline & Summary ({}): {}",
                                analytics.career_learning.profile_headline, clean_sum
                            ),
                            "2026-10-01T12:00:00Z",
                            "li-profile-summary",
                        );
                    }
                }
            }
            "positions.csv" => {
                for (idx, rec) in records.iter().enumerate() {
                    let title = strip_prompt_injection(rec.get("Title").map(|s| s.as_str()).unwrap_or(""));
                    let company =
                        strip_prompt_injection(rec.get("Company Name").map(|s| s.as_str()).unwrap_or(""));
                    let started_on = rec.get("Started On").cloned().unwrap_or_default();
                    let finished_on = rec
                        .get("Finished On")
                        .cloned()
                        .filter(|s| !s.is_empty())
                        .unwrap_or_else(|| "Present".to_string());
                    let location = rec.get("Location").cloned().unwrap_or_default();
                    let description =
                        strip_prompt_injection(rec.get("Description").map(|s| s.as_str()).unwrap_or(""));

                    let iso = normalize_linkedin_date(&started_on)
                        .unwrap_or_else(|| "2024-01-01T12:00:00Z".to_string());
                    if !description.is_empty() {
                        push_li_prompt(
                            &format!("LinkedIn Role ({title} at {company}): {description}"),
                            &iso,
                            &format!("li-pos-{}", idx + 1),
                        );
                    }
                    analytics.career_learning.positions.push(LinkedInPositionItem {
                        title,
                        company,
                        started_on,
                        finished_on,
                        location,
                        description,
                    });
                }
            }
            "education.csv" => {
                for rec in &records {
                    analytics.career_learning.education.push(LinkedInEducationItem {
                        school: strip_prompt_injection(
                            rec.get("School Name").map(|s| s.as_str()).unwrap_or(""),
                        ),
                        degree: strip_prompt_injection(
                            rec.get("Degree Name").map(|s| s.as_str()).unwrap_or(""),
                        ),
                        start_date: rec.get("Start Date").cloned().unwrap_or_default(),
                        end_date: rec.get("End Date").cloned().unwrap_or_default(),
                        notes: strip_prompt_injection(rec.get("Notes").map(|s| s.as_str()).unwrap_or("")),
                    });
                }
            }
            "certifications.csv" => {
                for rec in &records {
                    let name = strip_prompt_injection(rec.get("Name").map(|s| s.as_str()).unwrap_or(""));
                    let auth =
                        strip_prompt_injection(rec.get("Authority").map(|s| s.as_str()).unwrap_or(""));
                    if !name.is_empty() {
                        analytics.career_learning.certifications.push(if auth.is_empty() {
                            name
                        } else {
                            format!("{name} ({auth})")
                        });
                    }
                }
            }
            "projects.csv" => {
                for (idx, rec) in records.iter().enumerate() {
                    let title = strip_prompt_injection(rec.get("Title").map(|s| s.as_str()).unwrap_or(""));
                    let desc =
                        strip_prompt_injection(rec.get("Description").map(|s| s.as_str()).unwrap_or(""));
                    let started = rec.get("Started On").cloned().unwrap_or_default();
                    if !title.is_empty() {
                        analytics.career_learning.projects.push(if desc.is_empty() {
                            title.clone()
                        } else {
                            format!("{title}: {desc}")
                        });
                        if !desc.is_empty() {
                            let iso = normalize_linkedin_date(&started)
                                .unwrap_or_else(|| "2020-01-01T12:00:00Z".to_string());
                            push_li_prompt(
                                &format!("LinkedIn Project ({title}): {desc}"),
                                &iso,
                                &format!("li-proj-{}", idx + 1),
                            );
                        }
                    }
                }
            }
            "honors.csv" => {
                for rec in &records {
                    let title = strip_prompt_injection(rec.get("Title").map(|s| s.as_str()).unwrap_or(""));
                    if !title.is_empty() {
                        analytics.career_learning.honors.push(title);
                    }
                }
            }
            "organizations.csv" => {
                for rec in &records {
                    let name = strip_prompt_injection(rec.get("Name").map(|s| s.as_str()).unwrap_or(""));
                    let pos =
                        strip_prompt_injection(rec.get("Position").map(|s| s.as_str()).unwrap_or(""));
                    if !name.is_empty() {
                        analytics.career_learning.organizations.push(if pos.is_empty() {
                            name
                        } else {
                            format!("{name} — {pos}")
                        });
                    }
                }
            }
            "skills.csv" => {
                for rec in &records {
                    let skill = strip_prompt_injection(rec.get("Name").map(|s| s.as_str()).unwrap_or(""));
                    if !skill.is_empty()
                        && !analytics
                            .ad_targeting
                            .declared_profile_skills
                            .iter()
                            .any(|s| s.eq_ignore_ascii_case(&skill))
                    {
                        analytics.ad_targeting.declared_profile_skills.push(skill);
                    }
                }
            }
            "endorsement_received_info.csv" => {
                analytics.messaging.endorsements_received_count += records.len();
                for rec in &records {
                    let skill =
                        strip_prompt_injection(rec.get("Skill Name").map(|s| s.as_str()).unwrap_or(""));
                    if !skill.is_empty() {
                        *endorsement_counts.entry(skill).or_insert(0) += 1;
                    }
                }
            }
            "endorsement_given_info.csv" => {
                analytics.messaging.endorsements_given_count += records.len();
            }
            "recommendations_received.csv" => {
                analytics.messaging.recommendations_received_count += records.len();
                for (idx, rec) in records.iter().enumerate() {
                    let first = rec.get("First Name").cloned().unwrap_or_default();
                    let last = rec.get("Last Name").cloned().unwrap_or_default();
                    let comp = rec.get("Company").cloned().unwrap_or_default();
                    let title = rec.get("Job Title").cloned().unwrap_or_default();
                    let text = strip_prompt_injection(rec.get("Text").map(|s| s.as_str()).unwrap_or(""));
                    let created = rec.get("Creation Date").cloned().unwrap_or_default();
                    let status = rec.get("Status").cloned().unwrap_or_default();
                    let iso = normalize_linkedin_date(&created)
                        .unwrap_or_else(|| "2022-05-01T12:00:00Z".to_string());
                    analytics
                        .messaging
                        .recommendations_received
                        .push(LinkedInRecommendationItem {
                            person_name: format!("{first} {last}").trim().to_string(),
                            role_company: format!("{title} at {comp}").trim().to_string(),
                            date: iso.chars().take(10).collect(),
                            status,
                            excerpt: text.clone(),
                        });
                    if !text.is_empty() {
                        push_li_prompt(
                            &format!(
                                "Peer Recommendation Received from {first} {last} ({title} at {comp}): {text}"
                            ),
                            &iso,
                            &format!("li-rec-recv-{}", idx + 1),
                        );
                    }
                }
            }
            "recommendations_given.csv" => {
                analytics.messaging.recommendations_given_count += records.len();
                for (idx, rec) in records.iter().enumerate() {
                    let first = rec.get("First Name").cloned().unwrap_or_default();
                    let last = rec.get("Last Name").cloned().unwrap_or_default();
                    let comp = rec.get("Company").cloned().unwrap_or_default();
                    let title = rec.get("Job Title").cloned().unwrap_or_default();
                    let text = strip_prompt_injection(rec.get("Text").map(|s| s.as_str()).unwrap_or(""));
                    let created = rec.get("Creation Date").cloned().unwrap_or_default();
                    let iso = normalize_linkedin_date(&created)
                        .unwrap_or_else(|| "2022-05-01T12:00:00Z".to_string());
                    analytics
                        .messaging
                        .recommendations_given
                        .push(LinkedInRecommendationItem {
                            person_name: format!("{first} {last}").trim().to_string(),
                            role_company: format!("{title} at {comp}").trim().to_string(),
                            date: iso.chars().take(10).collect(),
                            status: "PUBLISHED".to_string(),
                            excerpt: text.clone(),
                        });
                    if !text.is_empty() {
                        push_li_prompt(
                            &format!(
                                "Mentoring & Peer Recommendation Authored for {first} {last} ({title} at {comp}): {text}"
                            ),
                            &iso,
                            &format!("li-rec-given-{}", idx + 1),
                        );
                    }
                }
            }
            "connections.csv" => {
                analytics.network.total_connections += records.len();
                for rec in &records {
                    let comp =
                        strip_prompt_injection(rec.get("Company").map(|s| s.as_str()).unwrap_or(""));
                    let pos =
                        strip_prompt_injection(rec.get("Position").map(|s| s.as_str()).unwrap_or(""));
                    let conn_on = rec.get("Connected On").cloned().unwrap_or_default();
                    if !comp.is_empty() {
                        *conn_companies.entry(comp).or_insert(0) += 1;
                    }
                    if !pos.is_empty() {
                        *conn_positions.entry(pos).or_insert(0) += 1;
                    }
                    if let Some(iso) = normalize_linkedin_date(&conn_on) {
                        if let Some(year) = iso.get(..4) {
                            *conn_years.entry(year.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
            "invitations.csv" => {
                for (idx, rec) in records.iter().enumerate() {
                    let dir = rec.get("Direction").map(|s| s.to_ascii_uppercase()).unwrap_or_default();
                    if dir.contains("OUTGOING") {
                        analytics.network.invitations_sent += 1;
                    } else if dir.contains("INCOMING") {
                        analytics.network.invitations_received += 1;
                    }
                    let msg =
                        strip_prompt_injection(rec.get("Message").map(|s| s.as_str()).unwrap_or(""));
                    if !msg.is_empty() && dir.contains("OUTGOING") {
                        analytics.relationship_signature.outbound_invitations_with_notes += 1;
                        if analytics.relationship_signature.sample_outbound_opener.is_empty() {
                            analytics.relationship_signature.sample_outbound_opener = msg.clone();
                        }
                        let sent_at = rec.get("Sent At").cloned().unwrap_or_default();
                        let iso = normalize_linkedin_date(&sent_at)
                            .unwrap_or_else(|| "2026-08-01T14:00:00Z".to_string());
                        push_li_prompt(
                            &format!("LinkedIn Outbound Connection Note: {msg}"),
                            &iso,
                            &format!("li-invite-{}", idx + 1),
                        );
                    }
                }
            }
            "messages.csv" => {
                analytics.messaging.total_messages += records.len();
                for (idx, rec) in records.iter().enumerate() {
                    let from = rec.get("FROM").cloned().unwrap_or_default();
                    let to = rec.get("TO").cloned().unwrap_or_default();
                    let date_raw = rec.get("DATE").cloned().unwrap_or_default();
                    let content_raw =
                        strip_prompt_injection(rec.get("CONTENT").map(|s| s.as_str()).unwrap_or(""));
                    let is_sent = (!user_full_name.is_empty()
                        && from.eq_ignore_ascii_case(&user_full_name))
                        || from.eq_ignore_ascii_case("alex rivera");

                    if is_sent {
                        analytics.messaging.sent_messages += 1;
                    } else {
                        analytics.messaging.received_messages += 1;
                    }

                    let interlocutor = if is_sent { &to } else { &from };
                    let clean_interlocutor = strip_prompt_injection(interlocutor);
                    if !clean_interlocutor.is_empty()
                        && !clean_interlocutor.eq_ignore_ascii_case("linkedin member")
                    {
                        *msg_threads.entry(clean_interlocutor).or_insert(0) += 1;
                    }

                    if let Some(iso) = normalize_linkedin_date(&date_raw) {
                        if let Some(year) = iso.get(..4) {
                            *msg_years.entry(year.to_string()).or_insert(0) += 1;
                        }
                        if is_sent && content_raw.split_whitespace().count() >= 18 && idx < 45 {
                            push_li_prompt(
                                &content_raw,
                                &iso,
                                &format!("li-msg-{}", idx + 1),
                            );
                        }
                    }
                }
            }
            "company follows.csv" => {
                analytics.network.company_follows_count += records.len();
                for rec in records.iter().take(12) {
                    let org =
                        strip_prompt_injection(rec.get("Organization").map(|s| s.as_str()).unwrap_or(""));
                    if !org.is_empty() {
                        analytics.network.followed_companies_sample.push(org);
                    }
                }
            }
            "ad_targeting.csv" => {
                if let Some(rec) = records.first() {
                    analytics.ad_targeting.member_age =
                        rec.get("Member Age").cloned().unwrap_or_default();
                    analytics.ad_targeting.years_of_experience =
                        rec.get("Years of Experience").cloned().unwrap_or_default();
                    analytics.ad_targeting.high_value_segments = split_semicolon_unique(
                        rec.get("High Value Audience Segments")
                            .map(|s| s.as_str())
                            .unwrap_or(""),
                    );
                    analytics.ad_targeting.buyer_groups = split_semicolon_unique(
                        rec.get("Buyer Groups").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.inferred_job_titles = split_semicolon_unique(
                        rec.get("Job Titles").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.job_seniorities = split_semicolon_unique(
                        rec.get("Job Seniorities").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.company_industries = split_semicolon_unique(
                        rec.get("Company Industries").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.member_interests = split_semicolon_unique(
                        rec.get("Member Interests").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.member_traits = split_semicolon_unique(
                        rec.get("Member Traits").map(|s| s.as_str()).unwrap_or(""),
                    );
                    analytics.ad_targeting.ad_inferred_skills = split_semicolon_unique(
                        rec.get("Member Skills").map(|s| s.as_str()).unwrap_or(""),
                    );
                }
            }
            "learning.csv" => {
                analytics.career_learning.learning_total_courses += records.len();
                for rec in &records {
                    let title = strip_prompt_injection(
                        rec.get("Content Title").map(|s| s.as_str()).unwrap_or(""),
                    );
                    let last_watched = rec
                        .get("Content Last Watched Date (if viewed)")
                        .or_else(|| rec.get("Content Completed At (if completed)"))
                        .cloned()
                        .unwrap_or_default();
                    if !title.is_empty() && analytics.career_learning.recent_courses.len() < 12 {
                        analytics.career_learning.recent_courses.push(title);
                    }
                    if let Some(iso) = normalize_linkedin_date(&last_watched) {
                        if let Some(year) = iso.get(..4) {
                            *learning_years.entry(year.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
            "rich_media.csv" => {
                analytics.career_learning.rich_media_posts_count += records.len();
                for (idx, rec) in records.iter().enumerate() {
                    let desc = strip_prompt_injection(
                        rec.get("Media Description").map(|s| s.as_str()).unwrap_or(""),
                    );
                    let date_raw = rec.get("Date/Time").cloned().unwrap_or_default();
                    if !desc.is_empty() {
                        if analytics.career_learning.rich_media_samples.len() < 8 {
                            analytics.career_learning.rich_media_samples.push(desc.clone());
                        }
                        let iso = normalize_linkedin_date(&date_raw)
                            .unwrap_or_else(|| "2026-10-15T14:00:00Z".to_string());
                        push_li_prompt(
                            &format!("LinkedIn Post / Rich Media Update: {desc}"),
                            &iso,
                            &format!("li-media-{}", idx + 1),
                        );
                    }
                }
            }
            "job applications.csv" => {
                analytics.job_search.applications_count += records.len();
                for rec in &records {
                    let app_date = rec.get("Application Date").cloned().unwrap_or_default();
                    let company =
                        strip_prompt_injection(rec.get("Company Name").map(|s| s.as_str()).unwrap_or(""));
                    let job_title =
                        strip_prompt_injection(rec.get("Job Title").map(|s| s.as_str()).unwrap_or(""));
                    let resume_name =
                        strip_prompt_injection(rec.get("Resume Name").map(|s| s.as_str()).unwrap_or(""));
                    if !resume_name.is_empty() {
                        *resume_counts.entry(resume_name.clone()).or_insert(0) += 1;
                    }
                    let iso = normalize_linkedin_date(&app_date).unwrap_or_default();
                    let date_label = if iso.len() >= 10 {
                        iso[..10].to_string()
                    } else {
                        app_date.clone()
                    };
                    if iso.len() >= 7 {
                        *app_months.entry(iso[..7].to_string()).or_insert(0) += 1;
                    }
                    if !job_title.is_empty() && analytics.job_search.recent_applications.len() < 15 {
                        analytics
                            .job_search
                            .recent_applications
                            .push(LinkedInJobApplicationItem {
                                job_title,
                                company,
                                applied_date: date_label,
                                resume_name,
                            });
                    }
                }
            }
            "saved jobs.csv" => {
                analytics.job_search.saved_jobs_count += records.len();
                for rec in &records {
                    let saved_date = rec.get("Saved Date").cloned().unwrap_or_default();
                    let company =
                        strip_prompt_injection(rec.get("Company Name").map(|s| s.as_str()).unwrap_or(""));
                    let job_title =
                        strip_prompt_injection(rec.get("Job Title").map(|s| s.as_str()).unwrap_or(""));
                    let iso = normalize_linkedin_date(&saved_date).unwrap_or_default();
                    let date_label = if iso.len() >= 10 {
                        iso[..10].to_string()
                    } else {
                        saved_date
                    };
                    if !job_title.is_empty() && analytics.job_search.saved_jobs.len() < 12 {
                        analytics.job_search.saved_jobs.push(LinkedInSavedJobItem {
                            job_title,
                            company,
                            saved_date: date_label,
                        });
                    }
                }
            }
            "savedjobalerts.csv" => {
                for rec in &records {
                    let qc = rec.get("QUERY_CONTEXT").cloned().unwrap_or_default();
                    if let Some(c) = rx.alert_keywords.captures(&qc) {
                        let kw = strip_prompt_injection(&c[1]);
                        if !kw.is_empty() && !analytics.job_search.saved_job_alerts.contains(&kw) {
                            analytics.job_search.saved_job_alerts.push(kw);
                        }
                    } else if !qc.is_empty() {
                        let clean = strip_prompt_injection(&qc);
                        if !analytics.job_search.saved_job_alerts.contains(&clean) {
                            analytics.job_search.saved_job_alerts.push(clean);
                        }
                    }
                }
            }
            "job seeker preferences.csv" => {
                if let Some(rec) = records.first() {
                    analytics.job_search.preferred_job_titles = split_semicolon_unique(
                        rec.get("Preferred Job Titles").map(|s| s.as_str()).unwrap_or(""),
                    );
                    let stmt = strip_prompt_injection(
                        rec.get("Open To Recruiters Statement")
                            .map(|s| s.as_str())
                            .unwrap_or(""),
                    );
                    analytics.job_search.open_to_recruiters_statement = stmt.clone();
                    if !stmt.is_empty() {
                        push_li_prompt(
                            &format!("LinkedIn Job Seeker Recruiter Positioning Statement: {stmt}"),
                            "2026-10-15T12:00:00Z",
                            "li-recruiter-statement",
                        );
                    }
                }
            }
            "private_identity_asset.csv" => {
                for rec in &records {
                    let asset = strip_prompt_injection(
                        rec.get("private_identity_asset")
                            .map(|s| s.as_str())
                            .unwrap_or(""),
                    );
                    if !asset.is_empty() {
                        resume_counts.entry(asset).or_insert(1);
                    }
                }
            }
            _ => {}
        }
    }

    // Add an aggregated Articles summary card if HTML articles were parsed
    if !analytics.career_learning.articles_published.is_empty() {
        let mut dates: Vec<String> = analytics
            .career_learning
            .articles_published
            .iter()
            .map(|a| a.published_date.clone())
            .collect();
        dates.sort();
        let range = match (dates.first(), dates.last()) {
            (Some(f), Some(l)) if f != l => format!("{f} → {l}"),
            (Some(o), _) => o.clone(),
            _ => "Published Archive".to_string(),
        };
        analytics.file_summaries.push(LinkedInFileSummary {
            file_name: format!(
                "Articles/*.html ({} files)",
                analytics.career_learning.articles_published.len()
            ),
            cluster_id: "algorithmic_learning_voice".to_string(),
            cluster_label: "5. Algorithmic Profile, Learning & Voice".to_string(),
            row_count: analytics.career_learning.articles_published.len(),
            date_range: range,
            key_fields: vec![
                "<h1> Title".to_string(),
                "Published Date".to_string(),
                "Article Body HTML".to_string(),
            ],
            plain_english_description:
                "Long-form thought leadership articles authored and published on LinkedIn.".to_string(),
        });
    }

    // Sort and finalize aggregations
    let mut cy: Vec<_> = conn_years.into_iter().collect();
    cy.sort_by(|a, b| a.0.cmp(&b.0));
    analytics.network.connections_by_year = cy;

    let mut tc: Vec<_> = conn_companies.into_iter().collect();
    tc.sort_by_key(|e| Reverse(e.1));
    tc.truncate(10);
    analytics.network.top_companies = tc;

    let mut tp: Vec<_> = conn_positions.into_iter().collect();
    tp.sort_by_key(|e| Reverse(e.1));
    tp.truncate(10);
    analytics.network.top_positions = tp;

    let mut my: Vec<_> = msg_years.into_iter().collect();
    my.sort_by(|a, b| a.0.cmp(&b.0));
    analytics.messaging.messages_by_year = my;

    let mut mt: Vec<_> = msg_threads.into_iter().collect();
    mt.sort_by_key(|e| Reverse(e.1));
    analytics.relationship_signature.total_threads_analyzed = mt.len();
    mt.truncate(10);
    analytics.messaging.top_threads = mt;

    let mut es: Vec<_> = endorsement_counts.into_iter().collect();
    es.sort_by_key(|e| Reverse(e.1));
    es.truncate(12);
    analytics.career_learning.top_endorsed_skills = es;

    let mut ly: Vec<_> = learning_years.into_iter().collect();
    ly.sort_by(|a, b| a.0.cmp(&b.0));
    analytics.career_learning.learning_by_year = ly;

    let mut am: Vec<_> = app_months.into_iter().collect();
    am.sort_by(|a, b| a.0.cmp(&b.0));
    analytics.job_search.applications_by_month = am;

    let mut rv: Vec<_> = resume_counts.into_iter().collect();
    rv.sort_by_key(|e| Reverse(e.1));
    analytics.job_search.resume_versions = rv;

    // Compute Ad-Targeting Skill Diff vs Declared Profile Skills
    let declared_lower: HashSet<String> = analytics
        .ad_targeting
        .declared_profile_skills
        .iter()
        .map(|s| s.to_ascii_lowercase())
        .collect();
    let ad_lower: HashSet<String> = analytics
        .ad_targeting
        .ad_inferred_skills
        .iter()
        .map(|s| s.to_ascii_lowercase())
        .collect();

    analytics.ad_targeting.skills_overlap_count = analytics
        .ad_targeting
        .declared_profile_skills
        .iter()
        .filter(|s| ad_lower.contains(&s.to_ascii_lowercase()))
        .count();

    analytics.ad_targeting.skills_only_in_ad_engine = analytics
        .ad_targeting
        .ad_inferred_skills
        .iter()
        .filter(|s| !declared_lower.contains(&s.to_ascii_lowercase()))
        .take(24)
        .cloned()
        .collect();

    analytics.ad_targeting.skills_only_in_profile = analytics
        .ad_targeting
        .declared_profile_skills
        .iter()
        .filter(|s| !ad_lower.contains(&s.to_ascii_lowercase()))
        .take(24)
        .cloned()
        .collect();

    // Synthesize Section 3: "What It Says About You"
    // 1. 3-Way Identity Mirror
    let mut real_self = Vec::new();
    if !analytics.career_learning.profile_headline.is_empty() {
        real_self.push(format!(
            "Headline: {}",
            analytics.career_learning.profile_headline
        ));
    }
    for alert in analytics.job_search.saved_job_alerts.iter().take(4) {
        real_self.push(format!("Active Search Target: {alert}"));
    }
    for pref in analytics.job_search.preferred_job_titles.iter().take(3) {
        real_self.push(format!("Preferred Role: {pref}"));
    }
    for pos in analytics.career_learning.positions.iter().take(2) {
        real_self.push(format!("Recent Role: {} at {}", pos.title, pos.company));
    }

    let mut peer_vouch = Vec::new();
    for (skill, cnt) in analytics.career_learning.top_endorsed_skills.iter().take(5) {
        peer_vouch.push(format!("Endorsed {cnt}x for {skill}"));
    }
    for rec in analytics.messaging.recommendations_received.iter().take(3) {
        let short: String = rec.excerpt.chars().take(110).collect();
        peer_vouch.push(format!(
            "{} ({}): \"{}…\"",
            rec.person_name, rec.role_company, short
        ));
    }

    let mut ad_box = Vec::new();
    for title in analytics.ad_targeting.inferred_job_titles.iter().take(6) {
        ad_box.push(format!("Inferred Title: {title}"));
    }
    for seg in analytics.ad_targeting.high_value_segments.iter().take(4) {
        ad_box.push(format!("Ad Segment: {seg}"));
    }
    for bg in analytics.ad_targeting.buyer_groups.iter().take(3) {
        ad_box.push(format!("Buyer Group: {bg}"));
    }

    analytics.three_way_mirror = LinkedInThreeWayMirror {
        real_self_today: real_self,
        peer_vouching: peer_vouch,
        ad_algorithm_box: ad_box,
        synthesis_narrative: format!(
            "Your active positioning targets '{}' ({} job applications & {} saved alerts), and peers vouch for your leadership across {} endorsements and {} written recommendations. However, LinkedIn's Ad-Targeting engine still classifies you across {} inferred job titles and {} ad-inferred skills ({} of which are legacy tags not on your profile)—revealing why algorithmic recruiter feeds often lag behind your real-time AI and systems pivot.",
            if analytics.job_search.saved_job_alerts.is_empty() {
                analytics.career_learning.profile_headline.as_str()
            } else {
                analytics.job_search.saved_job_alerts[0].as_str()
            },
            analytics.job_search.applications_count,
            analytics.job_search.saved_job_alerts.len(),
            analytics.messaging.endorsements_received_count,
            analytics.messaging.recommendations_received_count,
            analytics.ad_targeting.inferred_job_titles.len(),
            analytics.ad_targeting.ad_inferred_skills.len(),
            analytics.ad_targeting.skills_only_in_ad_engine.len(),
        ),
    };

    // 2. Relationship & Communication Signature
    let sent_pct = if analytics.messaging.total_messages > 0 {
        ((analytics.messaging.sent_messages as f32 / analytics.messaging.total_messages as f32)
            * 100.0)
            .round() as usize
    } else {
        50
    };
    analytics.relationship_signature.sent_to_received_ratio_pct = sent_pct;
    analytics.relationship_signature.mentoring_recommendations_given =
        analytics.messaging.recommendations_given_count;
    analytics.relationship_signature.communication_traits = vec![
        format!(
            "{} outbound invitations sent vs. {} incoming ({} with custom personal notes)",
            analytics.network.invitations_sent,
            analytics.network.invitations_received,
            analytics.relationship_signature.outbound_invitations_with_notes
        ),
        format!(
            "{} total messages across {} active 1:1 threads ({}% outbound initiation balance)",
            analytics.messaging.total_messages,
            analytics.relationship_signature.total_threads_analyzed,
            sent_pct
        ),
        format!(
            "High-generosity peer advocacy: {} written recommendations given and {} skill endorsements given",
            analytics.messaging.recommendations_given_count,
            analytics.messaging.endorsements_given_count
        ),
    ];
    analytics.relationship_signature.synthesis_narrative = format!(
        "Across {} direct messages and {} connection invitations, you operate as a high-context relationship builder: you have written {} formal recommendations and given {} endorsements to lift up collaborators, while initiating custom outreach notes that lead with shared domain context rather than transactional templates.",
        analytics.messaging.total_messages,
        analytics.network.invitations_sent + analytics.network.invitations_received,
        analytics.messaging.recommendations_given_count,
        analytics.messaging.endorsements_given_count,
    );

    // 3. Curiosity & Skill Evolution
    let mut early_foundations = Vec::new();
    for course in analytics.career_learning.recent_courses.iter().take(4) {
        early_foundations.push(format!("Learning Course: {course}"));
    }
    for proj in analytics.career_learning.projects.iter().take(3) {
        let short: String = proj.chars().take(90).collect();
        early_foundations.push(format!("Shipped Project: {short}"));
    }

    let mut public_voice = Vec::new();
    for art in analytics.career_learning.articles_published.iter().take(4) {
        public_voice.push(format!("Article ({}): {}", art.published_date, art.title));
    }
    for media in analytics.career_learning.rich_media_samples.iter().take(3) {
        let short: String = media.chars().take(95).collect();
        public_voice.push(format!("Feed Post: {short}…"));
    }

    let mut current_edge = Vec::new();
    for pos in analytics.career_learning.positions.iter().take(2) {
        current_edge.push(format!("Current/Recent Leadership: {} ({})", pos.title, pos.company));
    }
    for alert in analytics.job_search.saved_job_alerts.iter().take(3) {
        current_edge.push(format!("Next-Gen Positioning: {alert}"));
    }
    for resume in analytics.job_search.resume_versions.iter().take(2) {
        current_edge.push(format!("Positioning Asset: {} ({} applications)", resume.0, resume.1));
    }

    analytics.curiosity_evolution = LinkedInCuriosityEvolution {
        early_foundations,
        public_voice_milestones: public_voice,
        current_systems_edge: current_edge,
        synthesis_narrative: format!(
            "Your trajectory spans {} LinkedIn Learning courses, {} shipped projects, {} long-form articles, and {} rich-media posts—evolving from foundational digital production and interactive media into full-stack AI systems architecture, programmatic growth, and technical product leadership.",
            analytics.career_learning.learning_total_courses,
            analytics.career_learning.projects.len(),
            analytics.career_learning.articles_published.len(),
            analytics.career_learning.rich_media_posts_count,
        ),
    };

    crate::finalize_summary(&mut prompts, &mut summary);
    summary.linkedin_analytics = Some(analytics.clone());
    (prompts, summary, analytics)
}
