// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clearspace_onet_engine::{match_onet_paths, RoleMatchResult};
use clearspace_prompt_parsers::{
    parse_exported_conversations_json, scan_antigravity_brain_dir, summarize_persisted_prompts,
    IngestionSummary, NormalizedPrompt, PromptSource,
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
    pub title: String,
    pub summary: String,
    pub confidence_pct: u8,
    pub pinned: bool,
    pub quotes: Vec<QuoteCitation>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultDashboardPayload {
    pub db_path: String,
    pub summary: IngestionSummary,
    pub mirror_cards: Vec<MirrorInsightCard>,
    pub onet_matches: Vec<RoleMatchResult>,
    pub quests: Vec<EquityQuest>,
    pub journals: Vec<JournalEntry>,
    pub recent_high_signal_prompts: Vec<NormalizedPrompt>,
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

fn init_sqlite_schema(conn: &Connection) -> rusqlite::Result<()> {
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
        ",
    )?;

    seed_or_migrate_quests(conn)?;
    Ok(())
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
            68
        } else {
            let norm = (hits as f32 / (prompts.len() as f32 * 0.25).max(2.0)).min(1.0);
            (76.0 + 22.0 * norm).round().clamp(72.0, 98.0) as u8
        }
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
            title: "The 'Bottleneck → Build the System' Reflex".to_string(),
            summary: format!(
                "Across {} matching prompts, when you encounter friction or manual overhead, you instinctively step back to design a reusable software tool, schema, or automated pipeline rather than grinding through repetitive tasks.",
                tool_hits.max(1)
            ),
            confidence_pct: calc_conf(tool_hits),
            pinned: true,
            quotes: tool_quotes,
        },
        MirrorInsightCard {
            id: "card-bilingual-empathy".to_string(),
            category: "Superpower".to_string(),
            title: "Bilingual Translation: Systems Depth → Clear Human Value".to_string(),
            summary: format!(
                "Identified across {} prompts: you bridge backend systems architecture with clear, human-centered positioning so stakeholders and end-users immediately grasp the practical outcome without jargon.",
                empathy_hits.max(1)
            ),
            confidence_pct: calc_conf(empathy_hits),
            pinned: true,
            quotes: empathy_quotes,
        },
        MirrorInsightCard {
            id: "card-values-anchor".to_string(),
            category: "Core Value".to_string(),
            title: "Autonomy, Sustainable Stability & High-Leverage Ownership".to_string(),
            summary: format!(
                "Synthesized from {} value-signal reflections: your core motivation centers on building durable personal equity, household stability, and authentic work aligned with your natural strengths.",
                values_hits.max(1)
            ),
            confidence_pct: calc_conf(values_hits),
            pinned: true,
            quotes: values_quotes,
        },
        MirrorInsightCard {
            id: "card-burnout-trigger".to_string(),
            category: "Burnout Trigger".to_string(),
            title: "The Repetitive Manual Maintenance Trap".to_string(),
            summary: format!(
                "Detected {} friction signals: energy drain in your prompt archive correlates strongly with linear, repetitive asset maintenance or fragmented context-switching rather than 1-to-Many systems design.",
                burnout_hits
            ),
            confidence_pct: calc_conf(burnout_hits),
            pinned: true,
            quotes: burnout_quotes,
        },
        MirrorInsightCard {
            id: "card-grill-me".to_string(),
            category: "Cognitive Rhythm".to_string(),
            title: format!("First-Principles Truth-Seeking & {} Deep Flow", peak_window),
            summary: format!(
                "With {}% of your timestamped prompts concentrated during {} and {} skeptical inquiry signals, you use AI as a dialectical sparring partner to stress-test assumptions before committing engineering effort.",
                peak_share,
                peak_window,
                skeptic_hits.max(1)
            ),
            confidence_pct: calc_conf(skeptic_hits),
            pinned: true,
            quotes: skeptic_quotes,
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
        let cats_str: String = row.get(9)?;
        let signal_categories: Vec<String> =
            serde_json::from_str(&cats_str).unwrap_or_default();
        Ok(NormalizedPrompt {
            id: row.get(0)?,
            source: PromptSource::from_str_lossy(&source_str),
            conversation_id: row.get(2)?,
            created_at: row.get(3)?,
            local_hour: row.get::<_, Option<u8>>(4)?,
            cleaned_text: row.get(5)?,
            word_count: row.get::<_, usize>(6)?,
            redactions_made: row.get::<_, usize>(7)?,
            is_high_signal: row.get::<_, i64>(8)? != 0,
            signal_categories,
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

fn build_dashboard_from_sqlite(conn: &Connection, db_path: &Path) -> VaultDashboardPayload {
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

    VaultDashboardPayload {
        db_path: db_path.to_string_lossy().to_string(),
        summary,
        mirror_cards,
        onet_matches,
        quests,
        journals,
        recent_high_signal_prompts,
    }
}

#[tauri::command]
fn get_vault_dashboard(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    Ok(build_dashboard_from_sqlite(&conn, &state.db_path))
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
    init_sqlite_schema(&conn).expect("Failed to initialize Clearspace SQLite schema");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(conn),
            db_path,
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_dashboard,
            scan_local_vault,
            import_exported_json,
            reset_local_vault,
            toggle_quest_state,
            add_journal_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running Clearspace desktop application");
}
