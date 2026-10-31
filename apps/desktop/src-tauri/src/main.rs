// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clearspace_onet_engine::{match_onet_paths, RoleMatchResult};
use clearspace_prompt_parsers::{
    classify_skill_tier, parse_exported_conversations_json, scan_antigravity_brain_dir,
    summarize_persisted_prompts, IngestionSummary, NormalizedPrompt, PromptSource, SkillTier,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

struct AppState {
    db: Mutex<Connection>,
    db_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorInsightCard {
    pub id: String,
    pub category: String, // "Superpower", "Core Value", "Burnout Trigger", "Cognitive Rhythm"
    pub story_chapter: String, // "excel", "grow", "friction"
    pub story_chapter_title: String,
    pub title: String,
    pub summary: String,
    pub confidence_pct: u8,
    pub pinned: bool,
    pub quotes: Vec<QuoteCitation>,
    pub assessed_tier: String,
    pub assumption_challenged: String,
    pub identified_gap: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub name: String,
    pub avatar_data_url: Option<String>,
    pub theme_mode: String, // "light" or "dark"
    pub mirror_story_completed: bool,
    pub shortlisted_onet_codes: Vec<String>,
}

impl Default for UserProfile {
    fn default() -> Self {
        Self {
            name: String::new(),
            avatar_data_url: None,
            theme_mode: "light".to_string(),
            mirror_story_completed: false,
            shortlisted_onet_codes: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuoteCitation {
    pub date: String,
    pub convo_id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquityQuest {
    pub id: String,
    pub horizon: String, // "Now (30 Days)", "Year 1 Milestone", "Year 3 Milestone", "Year 5 Horizon"
    pub title: String,
    pub rationale: String,
    pub equity_category: String, // "Positioning Clarity", "Mastered Proof-of-Work", "Pitfall Immunity", "Compounding Distribution"
    pub equity_points: u16,
    pub accepted: bool,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: i64,
    pub created_at: String,
    pub prompt_question: String,
    pub reflection_text: String,
    pub mood_valence: String,
}

pub const CURRENT_SCHEMA_VERSION: i32 = 2;
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUpdateStatus {
    pub installed_version: String,
    pub schema_version: i32,
    pub last_backup_path: Option<String>,
    pub last_migrated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultDashboardPayload {
    pub db_path: String,
    pub profile: UserProfile,
    pub summary: IngestionSummary,
    pub mirror_cards: Vec<MirrorInsightCard>,
    pub onet_matches: Vec<RoleMatchResult>,
    pub quests: Vec<EquityQuest>,
    pub journals: Vec<JournalEntry>,
    pub recent_high_signal_prompts: Vec<NormalizedPrompt>,
    pub update_status: AppUpdateStatus,
}

fn default_universal_quests() -> Vec<(&'static str, &'static str, &'static str, &'static str, &'static str, u16, i64, i64)> {
    vec![
        (
            "q-reposition-architect",
            "Now (30 Days)",
            "Anchor Positioning in Systems Architecture & Unit-Economics Impact",
            "Lead your portfolio and interviews with measurable system throughput, automation leverage, and cost-efficiency outcomes synthesized from your high-signal engineering and strategy prompts.",
            "Positioning Clarity",
            250,
            0,
            0,
        ),
        (
            "q-focus-guardrail",
            "Now (30 Days)",
            "Enforce a 3-Pillar Cognitive Focus Rule (1 Core Role, 1 Compounding Engine, 1 Deep-Flow Lab)",
            "Eliminates context-switching fatigue across fragmented side projects and protects your highest-leverage deep work hours.",
            "Pitfall Immunity",
            200,
            0,
            0,
        ),
        (
            "q-drop-linear-work",
            "Year 1 Milestone",
            "Replace Repetitive Manual Maintenance with 1-to-Many Programmatic Workflows",
            "Burnout signals in your prompt archive correlate with repetitive hand-maintenance. Standardize on reusable tools, schemas, and automated pipelines.",
            "Pitfall Immunity",
            300,
            0,
            0,
        ),
        (
            "q-domain-bridge",
            "Year 1 Milestone",
            "Bridge Deep Technical Tooling with Interactive & Companion Ecosystems",
            "Combine your systems architecture, data telemetry, and workflow automation strengths into high-leverage platform engineering roles without resetting your seniority.",
            "Mastered Proof-of-Work",
            350,
            0,
            0,
        ),
        (
            "q-open-core-equity",
            "Year 3 Milestone",
            "Compound Open-Core Software & Reusable Intellectual Property",
            "Convert your 'bottleneck -> build the tool' reflex into durable open-core software assets and automated distribution channels that compound independent of linear hours.",
            "Compounding Distribution",
            500,
            0,
            0,
        ),
        (
            "q-year5-autonomy",
            "Year 5 Horizon",
            "Full Creative & Financial Autonomy (Principal Architect / Founder Track)",
            "Align your 5-year trajectory toward long-term household stability, creative ownership, and high-margin technical leadership.",
            "Compounding Distribution",
            1000,
            0,
            0,
        ),
    ]
}

fn seed_or_migrate_quests(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM quests", [], |r| r.get(0))
        .unwrap_or(0);

    // Also migrate if legacy non-universal quest id `q-trinity-focus` is present
    let has_legacy: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quests WHERE id = 'q-trinity-focus'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if count == 0 || has_legacy > 0 {
        let _ = conn.execute("DELETE FROM quests", []);
        for q in default_universal_quests() {
            conn.execute(
                "INSERT INTO quests (id, horizon, title, rationale, equity_category, equity_points, accepted, completed)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![q.0, q.1, q.2, q.3, q.4, q.5, q.6, q.7],
            )?;
        }
    }
    Ok(())
}

fn get_schema_version(conn: &Connection) -> i32 {
    conn.query_row("PRAGMA user_version", [], |r| r.get(0))
        .unwrap_or(0)
}

fn set_schema_version(conn: &Connection, version: i32) -> rusqlite::Result<()> {
    conn.execute_batch(&format!("PRAGMA user_version = {};", version))
}

fn table_has_column(conn: &Connection, table: &str, col: &str) -> bool {
    let sql = format!("PRAGMA table_info({})", table);
    let Ok(mut stmt) = conn.prepare(&sql) else {
        return false;
    };
    let Ok(rows) = stmt.query_map([], |row| row.get::<_, String>(1)) else {
        return false;
    };
    for name in rows.flatten() {
        if name.eq_ignore_ascii_case(col) {
            return true;
        }
    }
    false
}

fn table_exists(conn: &Connection, table: &str) -> bool {
    conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        params![table],
        |r| r.get::<_, i64>(0),
    )
    .unwrap_or(0)
        > 0
}

fn set_app_meta(conn: &Connection, key: &str, value: &str) {
    let _ = conn.execute(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?1, ?2)",
        params![key, value],
    );
}

fn get_app_meta(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM app_meta WHERE key = ?1",
        params![key],
        |r| r.get(0),
    )
    .ok()
}

fn init_sqlite_schema(conn: &Connection) -> rusqlite::Result<()> {
    init_sqlite_schema_with_backup(conn, None)
}

fn init_sqlite_schema_with_backup(
    conn: &Connection,
    db_path: Option<&Path>,
) -> rusqlite::Result<()> {
    let initial_version = get_schema_version(conn);
    let had_existing_tables = table_exists(conn, "prompts");

    // If upgrading an existing database file from an older schema version, create a pre-migration backup on disk
    let mut created_backup_path: Option<String> = None;
    if had_existing_tables && initial_version < CURRENT_SCHEMA_VERSION {
        if let Some(path) = db_path {
            if path.exists() {
                let bak_name = format!(
                    "{}.bak-v{}",
                    path.file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("clearspace_vault.db"),
                    initial_version
                );
                let bak_path = path.with_file_name(bak_name);
                if fs::copy(path, &bak_path).is_ok() {
                    created_backup_path = Some(bak_path.to_string_lossy().to_string());
                }
            }
        }
    }

    // Step 1: Ensure base v1 tables exist
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            conversation_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            local_hour INTEGER,
            cleaned_text TEXT NOT NULL,
            word_count INTEGER NOT NULL,
            redactions_made INTEGER NOT NULL,
            is_high_signal INTEGER NOT NULL,
            signal_categories_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS quests (
            id TEXT PRIMARY KEY,
            horizon TEXT NOT NULL,
            title TEXT NOT NULL,
            rationale TEXT NOT NULL,
            equity_category TEXT NOT NULL,
            equity_points INTEGER NOT NULL,
            accepted INTEGER NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS journals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            prompt_question TEXT NOT NULL,
            reflection_text TEXT NOT NULL,
            mood_valence TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mirror_pins (
            card_id TEXT PRIMARY KEY,
            pinned INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL DEFAULT '',
            avatar_data_url TEXT,
            theme_mode TEXT NOT NULL DEFAULT 'light',
            mirror_story_completed INTEGER NOT NULL DEFAULT 0,
            shortlisted_onet_codes_json TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;

    // Step 2: Forward-compatible column migrations for existing installs upgrading from early v0.1.0 builds
    if !table_has_column(conn, "user_profile", "mirror_story_completed") {
        let _ = conn.execute(
            "ALTER TABLE user_profile ADD COLUMN mirror_story_completed INTEGER NOT NULL DEFAULT 0",
            [],
        );
    }
    if !table_has_column(conn, "user_profile", "shortlisted_onet_codes_json") {
        let _ = conn.execute(
            "ALTER TABLE user_profile ADD COLUMN shortlisted_onet_codes_json TEXT NOT NULL DEFAULT '[]'",
            [],
        );
    }

    let _ = conn.execute(
        "INSERT OR IGNORE INTO user_profile (id, name, avatar_data_url, theme_mode, mirror_story_completed, shortlisted_onet_codes_json)
         VALUES (1, '', NULL, 'light', 0, '[]')",
        [],
    );

    seed_or_migrate_quests(conn)?;

    if initial_version < CURRENT_SCHEMA_VERSION {
        set_schema_version(conn, CURRENT_SCHEMA_VERSION)?;
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
        set_app_meta(conn, "last_migrated_at", &now);
    }
    set_app_meta(conn, "installed_app_version", APP_VERSION);
    if let Some(bak) = created_backup_path {
        set_app_meta(conn, "last_backup_path", &bak);
    }

    Ok(())
}

fn load_update_status(conn: &Connection) -> AppUpdateStatus {
    AppUpdateStatus {
        installed_version: APP_VERSION.to_string(),
        schema_version: get_schema_version(conn),
        last_backup_path: get_app_meta(conn, "last_backup_path"),
        last_migrated_at: get_app_meta(conn, "last_migrated_at"),
    }
}

fn compute_peak_window_description(prompts: &[NormalizedPrompt]) -> (String, usize) {
    let mut hours = [0usize; 24];
    let mut total_with_hour = 0usize;
    for p in prompts {
        if let Some(h) = p.local_hour {
            if (h as usize) < 24 {
                hours[h as usize] += 1;
                total_with_hour += 1;
            }
        }
    }
    if total_with_hour == 0 {
        return ("Flexible Schedule".to_string(), 0);
    }

    // Find best 4-hour contiguous window
    let mut best_start = 9usize;
    let mut best_sum = 0usize;
    for start in 0..24 {
        let sum: usize = (0..4).map(|offset| hours[(start + offset) % 24]).sum();
        if sum > best_sum {
            best_sum = sum;
            best_start = start;
        }
    }
    let end_hr = (best_start + 4) % 24;
    let fmt_hr = |h: usize| -> String {
        match h {
            0 => "12 AM".to_string(),
            1..=11 => format!("{h} AM"),
            12 => "12 PM".to_string(),
            _ => format!("{} PM", h - 12),
        }
    };
    let share_pct = ((best_sum as f32 / total_with_hour as f32) * 100.0).round() as usize;
    (format!("{} – {}", fmt_hr(best_start), fmt_hr(end_hr)), share_pct)
}

fn build_mirror_cards(prompts: &[NormalizedPrompt]) -> Vec<MirrorInsightCard> {
    if prompts.is_empty() {
        return Vec::new();
    }

    let find_quotes_and_hits = |keywords: &[&str], limit: usize| -> (Vec<QuoteCitation>, usize) {
        let mut out = Vec::new();
        let mut hits = 0usize;
        for p in prompts.iter().rev() {
            let lower = p.cleaned_text.to_lowercase();
            if keywords.iter().any(|k| lower.contains(k)) {
                hits += 1;
                if p.word_count >= 10 && out.len() < limit {
                    let text = if p.cleaned_text.chars().count() > 260 {
                        let truncated: String = p.cleaned_text.chars().take(260).collect();
                        format!("{truncated}…")
                    } else {
                        p.cleaned_text.clone()
                    };
                    out.push(QuoteCitation {
                        date: p.created_at.chars().take(10).collect(),
                        convo_id: p.conversation_id.chars().take(8).collect(),
                        text,
                    });
                }
            }
        }
        (out, hits)
    };

    let calc_conf = |hits: usize| -> u8 {
        if hits == 0 {
            0
        } else {
            let norm = (hits as f32 / (prompts.len() as f32 * 0.35).max(2.0)).min(1.0);
            (32.0 + 62.0 * norm).round().clamp(25.0, 94.0) as u8
        }
    };

    let mut tier_counts = [0usize; 3];
    for p in prompts {
        match p.skill_tier {
            SkillTier::Beginner => tier_counts[0] += 1,
            SkillTier::Intermediate => tier_counts[1] += 1,
            SkillTier::Advanced => tier_counts[2] += 1,
        }
    }
    let total_prompts = prompts.len().max(1);
    let weighted_tier_idx =
        (tier_counts[1] as f32 + 2.0 * tier_counts[2] as f32) / (total_prompts as f32);
    let overall_tier_label = if weighted_tier_idx < 0.65 {
        SkillTier::Beginner.positioning_label()
    } else if weighted_tier_idx < 1.35 {
        SkillTier::Intermediate.positioning_label()
    } else {
        SkillTier::Advanced.positioning_label()
    };

    let (tool_quotes, tool_hits) = find_quotes_and_hits(
        &[
            "tool", "editor", "architect", "pipeline", "automate", "system", "engine", "schema",
            "workflow",
        ],
        3,
    );
    let (empathy_quotes, empathy_hits) = find_quotes_and_hits(
        &[
            "clear", "simple", "human", "explain", "value", "user", "client", "positioning",
            "strategy",
        ],
        3,
    );
    let (values_quotes, values_hits) = find_quotes_and_hits(
        &[
            "stability", "autonomy", "family", "home", "authentic", "goal", "meaningful", "impact",
            "unfair advantage", "equity",
        ],
        3,
    );
    let (burnout_quotes, burnout_hits) = find_quotes_and_hits(
        &[
            "burnout", "manual", "repetitive", "frustrat", "struggl", "tedious", "maintenance",
            "fatigue", "overwhelm",
        ],
        3,
    );
    let (skeptic_quotes, skeptic_hits) = find_quotes_and_hits(
        &[
            "/grill-me", "skeptic", "critical", "worth solving", "flaws", "tradeoff",
            "first principles", "why", "blind spot",
        ],
        3,
    );

    let (peak_window, peak_share) = compute_peak_window_description(prompts);

    vec![
        MirrorInsightCard {
            id: "card-tool-builder".to_string(),
            category: "Superpower".to_string(),
            story_chapter: "excel".to_string(),
            story_chapter_title: "1. Where You Currently Excel".to_string(),
            title: "The 'Bottleneck → Build the System' Reflex".to_string(),
            summary: format!(
                "Detected in {} of {} prompts ({} Beginner / {} Intermediate / {} Advanced across vault): when you encounter manual overhead, evaluate whether you are designing durable systems or just scripting one-off patches.",
                tool_hits, prompts.len(), tier_counts[0], tier_counts[1], tier_counts[2]
            ),
            confidence_pct: calc_conf(tool_hits),
            pinned: true,
            quotes: tool_quotes,
            assessed_tier: overall_tier_label.to_string(),
            assumption_challenged: if tool_hits == 0 {
                "Assumption Tested: 0 systems/tooling prompts found—do not position yourself as a platform architect without concrete build evidence.".to_string()
            } else if tier_counts[2] == 0 {
                "Assumption Tested: You reference tools/workflows, but your prompts lack Senior-level tradeoff, failure-mode, or scale constraints.".to_string()
            } else {
                "Assumption Tested: Building a new tool for every bottleneck can become procrastination if it avoids shipping and validating with real users.".to_string()
            },
            identified_gap: if tool_hits == 0 {
                "Gap Identified: No architectural or workflow automation prompts recorded in your vault yet.".to_string()
            } else {
                format!(
                    "Gap Identified: {} Beginner / {} Intermediate prompt(s) still rely on tactical execution rather than reusable schema or telemetry contracts.",
                    tier_counts[0], tier_counts[1]
                )
            },
        },
        MirrorInsightCard {
            id: "card-bilingual-empathy".to_string(),
            category: "Superpower".to_string(),
            story_chapter: "excel".to_string(),
            story_chapter_title: "1. Where You Currently Excel".to_string(),
            title: "Bilingual Translation: Systems Depth → Clear Human Value".to_string(),
            summary: format!(
                "Identified across {} of {} prompts: measures how consistently you connect backend engineering decisions to user clarity, positioning, and measurable unit economics.",
                empathy_hits, prompts.len()
            ),
            confidence_pct: calc_conf(empathy_hits),
            pinned: true,
            quotes: empathy_quotes,
            assessed_tier: overall_tier_label.to_string(),
            assumption_challenged: if empathy_hits == 0 {
                "Assumption Tested: 0 user/positioning signals detected—technical code alone rarely speaks for itself without explicit value translation.".to_string()
            } else {
                "Assumption Tested: Clear positioning language in prompts must be backed by quantified customer outcomes (latency, revenue, retention), not just clean copy.".to_string()
            },
            identified_gap: if empathy_hits < 2 {
                "Gap Identified: Sparse commercial/user-value framing—add explicit ICP, pricing, and outcome constraints when designing technical systems.".to_string()
            } else {
                "Gap Identified: Pair qualitative user empathy with hard unit-economics and conversion metrics to prove Staff/Principal business impact.".to_string()
            },
        },
        MirrorInsightCard {
            id: "card-values-anchor".to_string(),
            category: "Core Value".to_string(),
            story_chapter: "grow".to_string(),
            story_chapter_title: "2. Where We Think You Could Grow".to_string(),
            title: "Autonomy, Sustainable Stability & High-Leverage Ownership".to_string(),
            summary: format!(
                "Synthesized from {} value-signal prompt(s): tracks whether your daily technical work actually compounds toward household stability and autonomy.",
                values_hits
            ),
            confidence_pct: calc_conf(values_hits),
            pinned: true,
            quotes: values_quotes,
            assessed_tier: overall_tier_label.to_string(),
            assumption_challenged: "Assumption Tested: Wanting autonomy or founder-level equity does not create it—if your daily prompts are 80% reactive maintenance, your trajectory will stay linear.".to_string(),
            identified_gap: if values_hits == 0 {
                "Gap Identified: 0 explicit career/value constraints logged—define your non-negotiables (comp floor, ownership scope, work rhythm) in the Reflective Journal.".to_string()
            } else {
                "Gap Identified: Audit how many hours per week go toward compounding assets vs. unleveraged ad-hoc requests.".to_string()
            },
        },
        MirrorInsightCard {
            id: "card-burnout-trigger".to_string(),
            category: "Burnout Trigger".to_string(),
            story_chapter: "friction".to_string(),
            story_chapter_title: "3. What Is Causing You Friction".to_string(),
            title: "The Repetitive Manual Maintenance Trap".to_string(),
            summary: format!(
                "Detected {} friction signal(s): tracks where repetitive hand-maintenance, boilerplate, or fragmented context-switching drains your cognitive output.",
                burnout_hits
            ),
            confidence_pct: calc_conf(burnout_hits),
            pinned: true,
            quotes: burnout_quotes,
            assessed_tier: overall_tier_label.to_string(),
            assumption_challenged: "Assumption Tested: High output during crunch periods is not sustainable leverage—ignoring repetitive maintenance drag leads to silent skill stagnation.".to_string(),
            identified_gap: if burnout_hits == 0 {
                "Gap Identified: 0 explicit burnout markers detected yet—proactively document which weekly tasks drain your energy so Clearspace can flag role mismatches.".to_string()
            } else {
                format!(
                    "Gap Identified: {} prompt(s) show maintenance friction; convert the top recurring manual chore into a deterministic script or test suite.",
                    burnout_hits
                )
            },
        },
        MirrorInsightCard {
            id: "card-grill-me".to_string(),
            category: "Cognitive Rhythm".to_string(),
            story_chapter: "grow".to_string(),
            story_chapter_title: "2. Where We Think You Could Grow".to_string(),
            title: format!("First-Principles Truth-Seeking & {} Deep Flow", peak_window),
            summary: format!(
                "With {}% of timestamped prompts in {} and {} skeptical inquiry signal(s), evaluates whether you actively challenge your own assumptions before building.",
                peak_share,
                peak_window,
                skeptic_hits
            ),
            confidence_pct: calc_conf(skeptic_hits),
            pinned: true,
            quotes: skeptic_quotes,
            assessed_tier: overall_tier_label.to_string(),
            assumption_challenged: if skeptic_hits == 0 {
                "Assumption Tested: 0 skeptical/adversarial prompts found—using AI only for confirmation or code generation creates blind spots and inflates confidence.".to_string()
            } else {
                "Assumption Tested: Stress-testing ideas in chat is only half the loop—verify that critiques translate into shipped tests and falsifiable benchmarks.".to_string()
            },
            identified_gap: if skeptic_hits == 0 {
                "Gap Identified: Start asking AI to expose flaws, edge cases, and failure modes in your designs before writing implementation code.".to_string()
            } else {
                "Gap Identified: Expand adversarial verification from product strategy into automated regression and load-testing benchmarks.".to_string()
            },
        },
    ]
}

fn upsert_prompts_to_sqlite(conn: &Connection, prompts: &[NormalizedPrompt]) {
    for p in prompts {
        let cats_json = serde_json::to_string(&p.signal_categories).unwrap_or_else(|_| "[]".into());
        let _ = conn.execute(
            "INSERT OR REPLACE INTO prompts
             (id, source, conversation_id, created_at, local_hour, cleaned_text, word_count, redactions_made, is_high_signal, signal_categories_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                p.id,
                p.source.as_str(),
                p.conversation_id,
                p.created_at,
                p.local_hour,
                p.cleaned_text,
                p.word_count,
                p.redactions_made,
                if p.is_high_signal { 1 } else { 0 },
                cats_json
            ],
        );
    }
}

fn load_prompts_from_sqlite(conn: &Connection) -> Vec<NormalizedPrompt> {
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, source, conversation_id, created_at, local_hour, cleaned_text, word_count, redactions_made, is_high_signal, signal_categories_json
         FROM prompts
         ORDER BY created_at ASC",
    ) else {
        return Vec::new();
    };
    let Ok(rows) = stmt.query_map([], |row| {
        let source_str: String = row.get(1)?;
        let cleaned_text: String = row.get(5)?;
        let word_count: usize = row.get(6)?;
        let cats_str: String = row.get(9)?;
        let signal_categories: Vec<String> =
            serde_json::from_str(&cats_str).unwrap_or_default();
        let skill_tier = classify_skill_tier(&cleaned_text, word_count, &signal_categories);
        Ok(NormalizedPrompt {
            id: row.get(0)?,
            source: PromptSource::from_str_lossy(&source_str),
            conversation_id: row.get(2)?,
            created_at: row.get(3)?,
            local_hour: row.get::<_, Option<u8>>(4)?,
            cleaned_text,
            word_count,
            redactions_made: row.get::<_, usize>(7)?,
            is_high_signal: row.get::<_, i64>(8)? != 0,
            signal_categories,
            skill_tier,
        })
    }) else {
        return Vec::new();
    };
    rows.filter_map(|r| r.ok()).collect()
}

fn load_quests(conn: &Connection) -> Vec<EquityQuest> {
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, horizon, title, rationale, equity_category, equity_points, accepted, completed FROM quests",
    ) else {
        return Vec::new();
    };
    let Ok(rows) = stmt.query_map([], |row| {
        Ok(EquityQuest {
            id: row.get(0)?,
            horizon: row.get(1)?,
            title: row.get(2)?,
            rationale: row.get(3)?,
            equity_category: row.get(4)?,
            equity_points: row.get(5)?,
            accepted: row.get::<_, i64>(6)? != 0,
            completed: row.get::<_, i64>(7)? != 0,
        })
    }) else {
        return Vec::new();
    };
    rows.filter_map(|r| r.ok()).collect()
}

fn load_journals(conn: &Connection) -> Vec<JournalEntry> {
    let Ok(mut stmt) = conn.prepare(
        "SELECT id, created_at, prompt_question, reflection_text, mood_valence FROM journals ORDER BY id DESC",
    ) else {
        return Vec::new();
    };
    let Ok(rows) = stmt.query_map([], |row| {
        Ok(JournalEntry {
            id: row.get(0)?,
            created_at: row.get(1)?,
            prompt_question: row.get(2)?,
            reflection_text: row.get(3)?,
            mood_valence: row.get(4)?,
        })
    }) else {
        return Vec::new();
    };
    rows.filter_map(|r| r.ok()).collect()
}

fn load_user_profile(conn: &Connection) -> UserProfile {
    conn.query_row(
        "SELECT name, avatar_data_url, theme_mode, mirror_story_completed, shortlisted_onet_codes_json
         FROM user_profile WHERE id = 1",
        [],
        |row| {
            let name: String = row.get(0)?;
            let avatar_data_url: Option<String> = row.get(1)?;
            let theme_mode: String = row.get(2)?;
            let mirror_story_completed: i64 = row.get(3)?;
            let codes_json: String = row.get(4)?;
            let shortlisted_onet_codes: Vec<String> =
                serde_json::from_str(&codes_json).unwrap_or_default();
            Ok(UserProfile {
                name,
                avatar_data_url,
                theme_mode: if theme_mode == "dark" {
                    "dark".to_string()
                } else {
                    "light".to_string()
                },
                mirror_story_completed: mirror_story_completed != 0,
                shortlisted_onet_codes,
            })
        },
    )
    .unwrap_or_default()
}

fn save_user_profile_to_sqlite(conn: &Connection, profile: &UserProfile) -> rusqlite::Result<()> {
    let codes_json =
        serde_json::to_string(&profile.shortlisted_onet_codes).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT OR REPLACE INTO user_profile (id, name, avatar_data_url, theme_mode, mirror_story_completed, shortlisted_onet_codes_json)
         VALUES (1, ?1, ?2, ?3, ?4, ?5)",
        params![
            profile.name.trim(),
            profile.avatar_data_url,
            if profile.theme_mode == "dark" { "dark" } else { "light" },
            if profile.mirror_story_completed { 1 } else { 0 },
            codes_json,
        ],
    )?;
    Ok(())
}

fn build_dashboard_from_sqlite(conn: &Connection, db_path: &Path) -> VaultDashboardPayload {
    let profile = load_user_profile(conn);
    let prompts = load_prompts_from_sqlite(conn);
    let summary = summarize_persisted_prompts(&prompts);
    let mirror_cards = build_mirror_cards(&prompts);
    let onet_matches = match_onet_paths(&prompts);
    let quests = load_quests(conn);
    let journals = load_journals(conn);
    let recent_high_signal_prompts: Vec<NormalizedPrompt> = prompts
        .into_iter()
        .filter(|p| p.is_high_signal)
        .rev()
        .take(40)
        .collect();
    let update_status = load_update_status(conn);

    VaultDashboardPayload {
        db_path: db_path.to_string_lossy().to_string(),
        profile,
        summary,
        mirror_cards,
        onet_matches,
        quests,
        journals,
        recent_high_signal_prompts,
        update_status,
    }
}

#[tauri::command]
fn backup_local_vault(state: State<AppState>) -> Result<AppUpdateStatus, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let schema_ver = get_schema_version(&conn);
    let bak_name = format!(
        "{}.bak-v{}",
        state
            .db_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("clearspace_vault.db"),
        schema_ver
    );
    let bak_path = state.db_path.with_file_name(bak_name);
    if state.db_path.exists() {
        fs::copy(&state.db_path, &bak_path).map_err(|e| e.to_string())?;
    }
    let bak_str = bak_path.to_string_lossy().to_string();
    set_app_meta(&conn, "last_backup_path", &bak_str);
    Ok(load_update_status(&conn))
}

#[tauri::command]
fn get_vault_dashboard(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    Ok(build_dashboard_from_sqlite(&conn, &state.db_path))
}

#[tauri::command]
fn update_user_profile(
    profile: UserProfile,
    state: State<AppState>,
) -> Result<UserProfile, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    save_user_profile_to_sqlite(&conn, &profile).map_err(|e| e.to_string())?;
    Ok(load_user_profile(&conn))
}

#[tauri::command]
fn scan_local_vault(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let user_profile = env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let brain_dir = PathBuf::from(user_profile)
        .join(".gemini")
        .join("antigravity")
        .join("brain");

    let (prompts, _scan_summary) = scan_antigravity_brain_dir(&brain_dir);
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    upsert_prompts_to_sqlite(&conn, &prompts);

    Ok(build_dashboard_from_sqlite(&conn, &state.db_path))
}

#[tauri::command]
fn import_exported_json(
    json_content: String,
    state: State<AppState>,
) -> Result<IngestionSummary, String> {
    let (prompts, summary) = parse_exported_conversations_json(&json_content)?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    upsert_prompts_to_sqlite(&conn, &prompts);
    Ok(summary)
}

#[tauri::command]
fn reset_local_vault(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = conn.execute("DELETE FROM prompts", []);
    let _ = conn.execute("UPDATE quests SET accepted = 0, completed = 0", []);
    let _ = conn.execute(
        "UPDATE user_profile SET mirror_story_completed = 0, shortlisted_onet_codes_json = '[]' WHERE id = 1",
        [],
    );
    Ok(build_dashboard_from_sqlite(&conn, &state.db_path))
}

#[tauri::command]
fn reset_full_factory(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let _ = conn.execute("DELETE FROM prompts", []);
    let _ = conn.execute("DELETE FROM journals", []);
    let _ = conn.execute("UPDATE quests SET accepted = 0, completed = 0", []);
    let _ = conn.execute(
        "UPDATE user_profile SET name = '', avatar_data_url = NULL, mirror_story_completed = 0, shortlisted_onet_codes_json = '[]' WHERE id = 1",
        [],
    );
    Ok(build_dashboard_from_sqlite(&conn, &state.db_path))
}

#[tauri::command]
fn toggle_quest_state(
    quest_id: String,
    field: String,
    state: State<AppState>,
) -> Result<Vec<EquityQuest>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let col = if field == "completed" {
        "completed"
    } else {
        "accepted"
    };
    let sql = format!(
        "UPDATE quests SET {} = CASE WHEN {} = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        col, col
    );
    conn.execute(&sql, params![quest_id])
        .map_err(|e| e.to_string())?;
    Ok(load_quests(&conn))
}

#[tauri::command]
fn add_journal_entry(
    prompt_question: String,
    reflection_text: String,
    mood_valence: String,
    state: State<AppState>,
) -> Result<Vec<JournalEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    conn.execute(
        "INSERT INTO journals (created_at, prompt_question, reflection_text, mood_valence) VALUES (?1, ?2, ?3, ?4)",
        params![now, prompt_question, reflection_text, mood_valence],
    )
    .map_err(|e| e.to_string())?;
    Ok(load_journals(&conn))
}

fn main() {
    let app_dir = env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("Clearspace");
    let _ = fs::create_dir_all(&app_dir);
    let db_path = app_dir.join("clearspace_vault.db");

    let conn = Connection::open(&db_path).expect("Failed to open local Clearspace SQLite DB");
    init_sqlite_schema_with_backup(&conn, Some(&db_path))
        .expect("Failed to initialize Clearspace SQLite schema");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(conn),
            db_path,
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_dashboard,
            update_user_profile,
            scan_local_vault,
            import_exported_json,
            reset_local_vault,
            reset_full_factory,
            toggle_quest_state,
            add_journal_entry,
            backup_local_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running Clearspace desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlite_profile_and_story_chapters_roundtrip_and_reset_cleanly() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        init_sqlite_schema(&conn).expect("schema init");
        assert_eq!(get_schema_version(&conn), CURRENT_SCHEMA_VERSION);

        let default_profile = load_user_profile(&conn);
        assert_eq!(default_profile.name, "");
        assert_eq!(default_profile.theme_mode, "light");
        assert!(!default_profile.mirror_story_completed);
        assert!(default_profile.shortlisted_onet_codes.is_empty());

        let updated = UserProfile {
            name: "Chris".to_string(),
            avatar_data_url: Some("data:image/png;base64,abc".to_string()),
            theme_mode: "dark".to_string(),
            mirror_story_completed: true,
            shortlisted_onet_codes: vec!["15-1252.00".to_string()],
        };
        save_user_profile_to_sqlite(&conn, &updated).expect("save profile");

        let loaded = load_user_profile(&conn);
        assert_eq!(loaded.name, "Chris");
        assert_eq!(loaded.theme_mode, "dark");
        assert!(loaded.mirror_story_completed);
        assert_eq!(loaded.shortlisted_onet_codes, vec!["15-1252.00".to_string()]);

        let sample_prompts = vec![NormalizedPrompt {
            id: "p1".to_string(),
            source: PromptSource::ClaudeWeb,
            conversation_id: "c1".to_string(),
            created_at: "2026-03-10T21:00:00Z".to_string(),
            local_hour: Some(21),
            cleaned_text: "I want to architect an automated workflow and tool system from first principles to eliminate manual maintenance.".to_string(),
            word_count: 17,
            redactions_made: 0,
            is_high_signal: true,
            signal_categories: vec!["Systems & Architecture".to_string()],
            skill_tier: SkillTier::Advanced,
        }];
        let cards = build_mirror_cards(&sample_prompts);
        assert_eq!(cards.len(), 5);
        assert_eq!(cards[0].story_chapter, "excel");
        assert_eq!(cards[1].story_chapter, "excel");
        assert_eq!(cards[2].story_chapter, "grow");
        assert_eq!(cards[3].story_chapter, "friction");
        assert_eq!(cards[4].story_chapter, "grow");
    }

    #[test]
    fn sqlite_schema_migration_preserves_existing_user_data_and_creates_backup() {
        let temp_dir = env::temp_dir().join(format!("clearspace_upgrade_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&temp_dir);
        let db_path = temp_dir.join("clearspace_vault.db");
        let _ = fs::remove_file(&db_path);

        // Simulate a v0 legacy database from an already-installed v0.1.0 desktop client
        {
            let conn = Connection::open(&db_path).expect("open legacy db");
            conn.execute_batch(
                "
                PRAGMA user_version = 1;
                CREATE TABLE prompts (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    conversation_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    local_hour INTEGER,
                    cleaned_text TEXT NOT NULL,
                    word_count INTEGER NOT NULL,
                    redactions_made INTEGER NOT NULL,
                    is_high_signal INTEGER NOT NULL,
                    signal_categories_json TEXT NOT NULL
                );
                CREATE TABLE user_profile (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT NOT NULL DEFAULT '',
                    avatar_data_url TEXT,
                    theme_mode TEXT NOT NULL DEFAULT 'light'
                );
                INSERT INTO user_profile (id, name, avatar_data_url, theme_mode)
                VALUES (1, 'ExistingUser', NULL, 'dark');
                INSERT INTO prompts (id, source, conversation_id, created_at, local_hour, cleaned_text, word_count, redactions_made, is_high_signal, signal_categories_json)
                VALUES ('legacy-1', 'claude_web', 'conv-1', '2026-02-01T20:00:00Z', 20, 'Existing user prompt preserved across desktop upgrade.', 7, 0, 1, '[\"Systems & Architecture\"]');
                ",
            )
            .expect("seed legacy v1 db");
        }

        // Now run the new app startup schema migration with backup enabled
        {
            let conn = Connection::open(&db_path).expect("reopen db for upgrade");
            init_sqlite_schema_with_backup(&conn, Some(&db_path)).expect("migrate v1 -> v2");

            assert_eq!(get_schema_version(&conn), CURRENT_SCHEMA_VERSION);
            let profile = load_user_profile(&conn);
            assert_eq!(profile.name, "ExistingUser");
            assert_eq!(profile.theme_mode, "dark");

            let prompts = load_prompts_from_sqlite(&conn);
            assert_eq!(prompts.len(), 1);
            assert_eq!(prompts[0].id, "legacy-1");

            let status = load_update_status(&conn);
            assert_eq!(status.installed_version, APP_VERSION);
            assert_eq!(status.schema_version, CURRENT_SCHEMA_VERSION);
            assert!(status.last_backup_path.is_some());

            let bak_path = temp_dir.join("clearspace_vault.db.bak-v1");
            assert!(bak_path.exists(), "Pre-migration backup file should exist on disk");
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
