// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clearspace_onet_engine::{match_onet_paths, RoleMatchResult};
use clearspace_prompt_parsers::{
    parse_exported_conversations_json, scan_antigravity_brain_dir, IngestionSummary,
    NormalizedPrompt,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
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

    // Seed default 5-Year Equity Quests if empty
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM quests", [], |r| r.get(0))?;
    if count == 0 {
        let default_quests = vec![
            (
                "q-reposition-architect",
                "Now (30 Days)",
                "Reposition from '$90k SEO Marketer' to 'AI Growth & Systems Architect' ($145k–$180k band)",
                "Your prompts prove you replaced $46,000/mo in agency & SaaS costs at Tallo while growing clicks +1,343%. Lead every interview with unit-economics savings and programmatic architecture.",
                "Positioning Clarity",
                250,
                1,
                0,
            ),
            (
                "q-trinity-focus",
                "Now (30 Days)",
                "Enforce the 'Trinity Rule': 1 W-2 Anchor Track, 1 Productized Engine, 1 Night-Lab Project",
                "Extracted from your Aug 8 prompt ('I want to build a Trinity...'). Eliminates context-switching fatigue across 30+ repos and protects deep evening flow.",
                "Pitfall Immunity",
                200,
                1,
                0,
            ),
            (
                "q-drop-linear-work",
                "Year 1 Milestone",
                "Zero Bespoke Manual Flyer/Maintenance Gigs — 100% Programmatic or Productized Leverage",
                "Every burnout mention in your prompt logs (June 9, June 10, Sept 6) followed manual asset or content maintenance. Only build 1-to-Many engines.",
                "Pitfall Immunity",
                300,
                1,
                0,
            ),
            (
                "q-gaming-platform-bridge",
                "Year 1 Milestone",
                "Target Gaming Companion & Ecosystem Platforms (Overwolf, Mobalytics, U.GG, CurseForge)",
                "Bridges your love for game design (Oct 22 prompt) with your top 1% programmatic SEO and Lua/MCP tooling skills—without starting over as a junior gameplay coder.",
                "Mastered Proof-of-Work",
                350,
                0,
                0,
            ),
            (
                "q-open-core-equity",
                "Year 3 Milestone",
                "Compound Open-Core Software Equity (Clearspace + Automated B2B Engines)",
                "Turn your 'Blocked -> Build the Tool' reflex into recurring software equity where every GitHub star and automated page compounds toward your family home goal.",
                "Compounding Distribution",
                500,
                1,
                0,
            ),
            (
                "q-year5-autonomy",
                "Year 5 Horizon",
                "Full Financial & Creative Autonomy (Family Home Secured + Principal/Founder Track)",
                "Directly aligned with your Aug 5 North Star prompt: 'I'm 36, I have a big family, 5 kids, a wife, and I'd like to purchase a home where I can give my family stability and safety.'",
                "Compounding Distribution",
                1000,
                1,
                0,
            ),
        ];

        for q in default_quests {
            conn.execute(
                "INSERT INTO quests (id, horizon, title, rationale, equity_category, equity_points, accepted, completed)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![q.0, q.1, q.2, q.3, q.4, q.5, q.6, q.7],
            )?;
        }
    }

    Ok(())
}

fn build_mirror_cards(prompts: &[NormalizedPrompt]) -> Vec<MirrorInsightCard> {
    let find_quotes = |keywords: &[&str], limit: usize| -> Vec<QuoteCitation> {
        let mut out = Vec::new();
        for p in prompts.iter().rev() {
            if p.word_count < 14 {
                continue;
            }
            let lower = p.cleaned_text.to_lowercase();
            if keywords.iter().any(|k| lower.contains(k)) {
                let text = if p.cleaned_text.len() > 260 {
                    format!("{}…", &p.cleaned_text[..260])
                } else {
                    p.cleaned_text.clone()
                };
                out.push(QuoteCitation {
                    date: p.created_at.chars().take(10).collect(),
                    convo_id: p.conversation_id.chars().take(8).collect(),
                    text,
                });
                if out.len() >= limit {
                    break;
                }
            }
        }
        out
    };

    vec![
        MirrorInsightCard {
            id: "card-tool-builder".to_string(),
            category: "Superpower".to_string(),
            title: "The 'Blocked → Build the Tool' Reflex".to_string(),
            summary: "When you hit friction in an unfamiliar domain (like 2D skeletal animation, quest routing, or token bloat), you don't grind manually—you pause, diagnose your exact strengths and weaknesses, and architect a custom software tool to eliminate the bottleneck.".to_string(),
            confidence_pct: 97,
            pinned: true,
            quotes: find_quotes(&["strengths", "character editor", "build a tool", "lodestar"], 3),
        },
        MirrorInsightCard {
            id: "card-bilingual-empathy".to_string(),
            category: "Superpower".to_string(),
            title: "Bilingual Empathy: Deep Architecture → Plain Human Value".to_string(),
            summary: "You build FTS5 MCP servers, n8n pipelines, and pSEO engines, yet relentlessly police your own copy so normal humans and vibe coders immediately get the 'sizzle' without intimidating jargon.".to_string(),
            confidence_pct: 95,
            pinned: true,
            quotes: find_quotes(&["vibe coder", "sizzle", "straight to the point", "mitm"], 3),
        },
        MirrorInsightCard {
            id: "card-family-anchor".to_string(),
            category: "Core Value".to_string(),
            title: "Family Stability, Radical Authenticity & Unit Economics".to_string(),
            summary: "Your primary financial and emotional anchor is providing stability, health benefits, and a home for your wife and 5 kids—while refusing to wear a fake corporate mask ('none of it sounds like me... married father of 5, gamer dad, nerd, techy').".to_string(),
            confidence_pct: 99,
            pinned: true,
            quotes: find_quotes(&["5 kids", "father of 5", "unfair advantage", "saved"], 3),
        },
        MirrorInsightCard {
            id: "card-burnout-trigger".to_string(),
            category: "Burnout Trigger".to_string(),
            title: "The Linear Manual Maintenance Trap".to_string(),
            summary: "Every single instance of burnout or demoralization in your prompt history occurred when a project required repetitive manual asset creation or hand-editing data instead of 1-to-Many programmatic leverage.".to_string(),
            confidence_pct: 94,
            pinned: true,
            quotes: find_quotes(&["burnout", "so much work", "manual maintenance", "demoralized"], 3),
        },
        MirrorInsightCard {
            id: "card-grill-me".to_string(),
            category: "Cognitive Rhythm".to_string(),
            title: "Adversarial Truth-Seeking ('/grill-me' & Skeptic Mode)".to_string(),
            summary: "Unlike users who use AI for validation, you repeatedly command the AI to act as a ruthless skeptic ('pick at it relentlessly', 'is this worth solving?', 'be super critical and realistic').".to_string(),
            confidence_pct: 96,
            pinned: true,
            quotes: find_quotes(&["/grill-me", "skeptic", "super critical", "worth solving"], 3),
        },
    ]
}

fn persist_prompts_to_sqlite(conn: &Connection, prompts: &[NormalizedPrompt]) {
    let _ = conn.execute("DELETE FROM prompts", []);
    for p in prompts {
        let cats_json = serde_json::to_string(&p.signal_categories).unwrap_or_else(|_| "[]".into());
        let _ = conn.execute(
            "INSERT OR REPLACE INTO prompts
             (id, source, conversation_id, created_at, local_hour, cleaned_text, word_count, redactions_made, is_high_signal, signal_categories_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                p.id,
                "antigravity",
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

fn load_quests(conn: &Connection) -> Vec<EquityQuest> {
    let mut stmt = conn
        .prepare("SELECT id, horizon, title, rationale, equity_category, equity_points, accepted, completed FROM quests")
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
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
        })
        .unwrap();
    rows.filter_map(|r| r.ok()).collect()
}

fn load_journals(conn: &Connection) -> Vec<JournalEntry> {
    let mut stmt = conn
        .prepare("SELECT id, created_at, prompt_question, reflection_text, mood_valence FROM journals ORDER BY id DESC")
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok(JournalEntry {
                id: row.get(0)?,
                created_at: row.get(1)?,
                prompt_question: row.get(2)?,
                reflection_text: row.get(3)?,
                mood_valence: row.get(4)?,
            })
        })
        .unwrap();
    rows.filter_map(|r| r.ok()).collect()
}

#[tauri::command]
fn scan_local_vault(state: State<AppState>) -> Result<VaultDashboardPayload, String> {
    let user_profile = env::var("USERPROFILE")
        .or_else(|_| env::var("HOME"))
        .unwrap_or_else(|_| "C:/Users/chris".to_string());
    let brain_dir = PathBuf::from(user_profile)
        .join(".gemini")
        .join("antigravity")
        .join("brain");

    let (prompts, summary) = scan_antigravity_brain_dir(&brain_dir);
    let mirror_cards = build_mirror_cards(&prompts);
    let onet_matches = match_onet_paths(&prompts);

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    persist_prompts_to_sqlite(&conn, &prompts);
    let quests = load_quests(&conn);
    let journals = load_journals(&conn);

    let recent_high_signal_prompts: Vec<NormalizedPrompt> = prompts
        .into_iter()
        .filter(|p| p.is_high_signal)
        .rev()
        .take(40)
        .collect();

    Ok(VaultDashboardPayload {
        db_path: state.db_path.to_string_lossy().to_string(),
        summary,
        mirror_cards,
        onet_matches,
        quests,
        journals,
        recent_high_signal_prompts,
    })
}

#[tauri::command]
fn import_exported_json(
    json_content: String,
    state: State<AppState>,
) -> Result<IngestionSummary, String> {
    let (prompts, summary) = parse_exported_conversations_json(&json_content)?;
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    for p in &prompts {
        let cats_json = serde_json::to_string(&p.signal_categories).unwrap_or_else(|_| "[]".into());
        let _ = conn.execute(
            "INSERT OR REPLACE INTO prompts
             (id, source, conversation_id, created_at, local_hour, cleaned_text, word_count, redactions_made, is_high_signal, signal_categories_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                p.id,
                format!("{:?}", p.source),
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
    Ok(summary)
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
            scan_local_vault,
            import_exported_json,
            toggle_quest_state,
            add_journal_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running Clearspace desktop application");
}
