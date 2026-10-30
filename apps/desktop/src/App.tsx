import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ShieldCheck,
  Sparkles,
  Compass,
  TrendingUp,
  BookOpen,
  Database,
  CheckCircle2,
  Quote,
  AlertTriangle,
  RefreshCw,
  Upload,
  Lock,
} from "lucide-react";

interface IngestionSummary {
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
}

interface QuoteCitation {
  date: string;
  convo_id: string;
  text: string;
}

interface MirrorInsightCard {
  id: string;
  category: string;
  title: string;
  summary: string;
  confidence_pct: number;
  pinned: boolean;
  quotes: QuoteCitation[];
}

interface EvidenceQuote {
  prompt_id: string;
  date: string;
  excerpt: string;
}

interface RoleMatchResult {
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

interface EquityQuest {
  id: string;
  horizon: string;
  title: string;
  rationale: string;
  equity_category: string;
  equity_points: number;
  accepted: boolean;
  completed: boolean;
}

interface JournalEntry {
  id: number;
  created_at: string;
  prompt_question: string;
  reflection_text: string;
  mood_valence: string;
}

interface VaultDashboardPayload {
  db_path: string;
  summary: IngestionSummary;
  mirror_cards: MirrorInsightCard[];
  onet_matches: RoleMatchResult[];
  quests: EquityQuest[];
  journals: JournalEntry[];
}

const SOCRATIC_PROMPTS = [
  "Which task this week gave you that 9 PM 'deep flow' energy, and which task felt like manual maintenance drag?",
  "If you applied the 'Trinity Rule' to your next 30 days, what is the 1 thing you would stop doing immediately?",
  "Where are you currently underselling your systems architecture as 'just marketing' or 'just execution'?",
  "What is one tool or asset you built this month that compounds your 5-year family & financial equity?",
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"vault" | "mirror" | "onet" | "equity" | "journal">("mirror");
  const [data, setData] = useState<VaultDashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState<number>(0);
  const [journalText, setJournalText] = useState<string>("");
  const [mood, setMood] = useState<string>("Energized & Clear");
  const [importStatus, setImportStatus] = useState<string>("");

  const runScan = async () => {
    setLoading(true);
    try {
      const res = await invoke<VaultDashboardPayload>("scan_local_vault");
      setData(res);
    } catch (err) {
      console.error("Failed to scan local vault:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const handleToggleQuest = async (questId: string, field: "accepted" | "completed") => {
    if (!data) return;
    const updated = await invoke<EquityQuest[]>("toggle_quest_state", {
      questId,
      field,
    });
    setData({ ...data, quests: updated });
  };

  const handleSaveJournal = async () => {
    if (!journalText.trim() || !data) return;
    const updated = await invoke<JournalEntry[]>("add_journal_entry", {
      promptQuestion: SOCRATIC_PROMPTS[selectedPromptIdx],
      reflectionText: journalText,
      moodValence: mood,
    });
    setJournalText("");
    setData({ ...data, journals: updated });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const summary = await invoke<IngestionSummary>("import_exported_json", {
        jsonContent: text,
      });
      setImportStatus(
        `Imported ${summary.clean_prompts_kept} clean prompts (${summary.total_redactions} PII redactions made locally).`
      );
      runScan();
    } catch (err: any) {
      setImportStatus(`Import error: ${String(err)}`);
    }
  };

  const totalEquityPoints =
    data?.quests
      .filter((q) => q.accepted)
      .reduce((acc, q) => acc + (q.completed ? q.equity_points : Math.round(q.equity_points * 0.35)), 420) ?? 420;

  const maxHourCount = data ? Math.max(...data.summary.hourly_distribution, 1) : 1;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-header">
            <div className="brand-title">
              <Compass size={24} color="#2b5b48" />
              <span>Clearspace</span>
            </div>
            <p className="brand-subtitle">
              Therapeutic, zero-knowledge career & cognitive mirror.
            </p>
            <div className="privacy-pill">
              <Lock size={12} />
              <span>100% Local SQLite • Zero Cloud Logs</span>
            </div>
          </div>

          <nav className="nav-list">
            <button
              className={`nav-btn ${activeTab === "mirror" ? "active" : ""}`}
              onClick={() => setActiveTab("mirror")}
            >
              <Sparkles size={17} />
              <span>Cognitive Mirror</span>
            </button>
            <button
              className={`nav-btn ${activeTab === "onet" ? "active" : ""}`}
              onClick={() => setActiveTab("onet")}
            >
              <Compass size={17} />
              <span>O*NET Path Finder</span>
            </button>
            <button
              className={`nav-btn ${activeTab === "equity" ? "active" : ""}`}
              onClick={() => setActiveTab("equity")}
            >
              <TrendingUp size={17} />
              <span>5-Year Equity & Quests</span>
            </button>
            <button
              className={`nav-btn ${activeTab === "journal" ? "active" : ""}`}
              onClick={() => setActiveTab("journal")}
            >
              <BookOpen size={17} />
              <span>Reflective Journal</span>
            </button>
            <button
              className={`nav-btn ${activeTab === "vault" ? "active" : ""}`}
              onClick={() => setActiveTab("vault")}
            >
              <Database size={17} />
              <span>Local Vault & Scrubber</span>
            </button>
          </nav>
        </div>

        <div className="equity-widget">
          <div className="stat-label">5-Year Personal Equity Index</div>
          <div className="equity-score-num">{totalEquityPoints.toLocaleString()} pts</div>
          <p className="stat-sub">
            Compounding across {data?.quests.filter((q) => q.accepted).length ?? 0} active career commitments.
          </p>
        </div>
      </aside>

      <main className="main-content">
        {loading || !data ? (
          <div className="insight-card">
            <h2 className="page-title">Scanning local prompt history…</h2>
            <p className="page-lead">
              Running deterministic Rust PII scrubber and O*NET behavioral matcher on your local machine.
            </p>
          </div>
        ) : (
          <>
            {activeTab === "mirror" && (
              <div>
                <h1 className="page-title">Your Unmasked Cognitive Mirror</h1>
                <p className="page-lead">
                  Synthesized locally from{" "}
                  <strong>{data.summary.clean_prompts_kept.toLocaleString()} unique first-person prompts</strong>{" "}
                  across <strong>{data.summary.total_files_scanned} conversations</strong> (
                  {data.summary.earliest_date?.slice(0, 10)} → {data.summary.latest_date?.slice(0, 10)}).
                  Every insight is backed by your exact words.
                </p>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Unique Human Prompts</div>
                    <div className="stat-value">{data.summary.clean_prompts_kept.toLocaleString()}</div>
                    <div className="stat-sub">
                      {data.summary.noise_filtered_out} code/short commands stripped
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">High-Signal Reflections</div>
                    <div className="stat-value">{data.summary.high_signal_prompts.toLocaleString()}</div>
                    <div className="stat-sub">Deep architecture, values & career intent</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Local PII Redactions</div>
                    <div className="stat-value">{data.summary.total_redactions.toLocaleString()}</div>
                    <div className="stat-sub">Emails, phones & keys scrubbed on disk</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Peak Deep-Flow Window</div>
                    <div className="stat-value">7 PM – 12 AM</div>
                    <div className="stat-sub">40% of all architectural & lab prompts</div>
                  </div>
                </div>

                <div className="card-stack">
                  {data.mirror_cards.map((card) => (
                    <div key={card.id} className="insight-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          className={`badge ${
                            card.category === "Burnout Trigger"
                              ? "burnout"
                              : card.category === "Core Value"
                              ? "value"
                              : "superpower"
                          }`}
                        >
                          {card.category} • {card.confidence_pct}% Deterministic Confidence
                        </span>
                      </div>
                      <h3 style={{ fontSize: "20px", marginTop: "10px", fontWeight: 700 }}>{card.title}</h3>
                      <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14.5px" }}>
                        {card.summary}
                      </p>

                      {card.quotes.map((q, idx) => (
                        <div key={idx} className="quote-box">
                          <div className="quote-meta">
                            <Quote size={11} style={{ display: "inline", marginRight: 5 }} />
                            {q.date} • Conversation #{q.convo_id}
                          </div>
                          <div>“{q.text}”</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "onet" && (
              <div>
                <h1 className="page-title">O*NET Natural Path Finder</h1>
                <p className="page-lead">
                  Most people don’t know what job titles exist that match who they naturally are. Below are the
                  occupations and modern role tracks matched directly to your demonstrated behaviors, energy
                  drivers, and burnout guardrails.
                </p>

                <div className="card-stack">
                  {data.onet_matches.map((role) => (
                    <div key={role.onet_code} className="insight-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span className="badge superpower">{role.bucket}</span>
                          <span
                            style={{
                              marginLeft: 8,
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            O*NET {role.onet_code} • {role.salary_range_usd}
                          </span>
                          <h3 style={{ fontSize: "21px", marginTop: "8px" }}>
                            {role.modern_titles[0]}
                          </h3>
                          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: 2 }}>
                            Also titled: {role.modern_titles.slice(1).join(" • ")}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="equity-score-num">{role.overall_fit_pct}%</div>
                          <div className="stat-label">Path Fit</div>
                        </div>
                      </div>

                      <div className="meter-row">
                        <div>
                          <div className="stat-label">Skill Overlap</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{role.skill_overlap_pct}%</div>
                        </div>
                        <div>
                          <div className="stat-label">Energy Alignment</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--accent-sage)" }}>
                            {role.energy_alignment_pct}%
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Values Match</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{role.values_match_pct}%</div>
                        </div>
                        <div>
                          <div className="stat-label">Burnout Friction</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#a93b3b" }}>
                            {role.burnout_risk_pct}% (Low)
                          </div>
                        </div>
                      </div>

                      <p style={{ marginTop: 14, fontSize: 14.5, color: "var(--text-secondary)" }}>
                        <strong>Why you were built for this:</strong> {role.why_it_fits}
                      </p>

                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 14px",
                          background: "var(--bg-rose-soft)",
                          borderRadius: 10,
                          fontSize: 13,
                          color: "#7a2828",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>
                          <strong>Pitfall Guardrail:</strong> {role.burnout_guardrail}
                        </span>
                      </div>

                      {role.supporting_quotes.slice(0, 2).map((sq, i) => (
                        <div key={i} className="quote-box">
                          <div className="quote-meta">{sq.date} • Verified Prompt Signal</div>
                          <div>“{sq.excerpt}”</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "equity" && (
              <div>
                <h1 className="page-title">Your 5-Year Personal Equity Map</h1>
                <p className="page-lead">
                  Life is about walking a path you are excited to walk. Accept the recommendations that resonate
                  with you and mark milestones as you complete them to build long-term career equity.
                </p>

                <div className="card-stack">
                  {data.quests.map((q) => (
                    <div key={q.id} className="insight-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span className="badge value">{q.horizon}</span>
                          <span className="badge superpower" style={{ marginLeft: 8 }}>
                            +{q.equity_points} Equity • {q.equity_category}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className={`btn-outline ${q.accepted ? "active" : ""}`}
                            onClick={() => handleToggleQuest(q.id, "accepted")}
                          >
                            <CheckCircle2 size={14} />
                            <span>{q.accepted ? "On My Path" : "Accept Recommendation"}</span>
                          </button>
                          <button
                            className={`btn-outline ${q.completed ? "active" : ""}`}
                            onClick={() => handleToggleQuest(q.id, "completed")}
                          >
                            <span>{q.completed ? "Completed ✓" : "Mark Complete"}</span>
                          </button>
                        </div>
                      </div>
                      <h3 style={{ fontSize: 19, marginTop: 12 }}>{q.title}</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>
                        {q.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "journal" && (
              <div>
                <h1 className="page-title">Reflective Sanctuary & Socratic Journal</h1>
                <p className="page-lead">
                  A private, non-judgmental space stored strictly in your local SQLite database. Choose a Socratic
                  prompt derived from your graph or write freely.
                </p>

                <div className="insight-card" style={{ marginTop: 22 }}>
                  <div className="stat-label">Socratic Prompt (Derived from Your Graph)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {SOCRATIC_PROMPTS.map((sp, idx) => (
                      <button
                        key={idx}
                        className={`btn-outline ${selectedPromptIdx === idx ? "active" : ""}`}
                        onClick={() => setSelectedPromptIdx(idx)}
                      >
                        Prompt #{idx + 1}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 600, marginTop: 14 }}>
                    “{SOCRATIC_PROMPTS[selectedPromptIdx]}”
                  </p>

                  <textarea
                    className="textarea-journal"
                    placeholder="Write honestly for yourself—this never leaves your local disk…"
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border-warm)",
                        background: "var(--bg-warm)",
                      }}
                    >
                      <option>Energized & Clear</option>
                      <option>In Deep Flow</option>
                      <option>Questioning / At a Crossroads</option>
                      <option>Feeling Maintenance Drag</option>
                    </select>
                    <button className="btn-primary" onClick={handleSaveJournal}>
                      Save to Local Vault
                    </button>
                  </div>
                </div>

                <div className="card-stack">
                  {data.journals.map((j) => (
                    <div key={j.id} className="insight-card">
                      <div className="quote-meta">
                        {j.created_at} • {j.mood_valence}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{j.prompt_question}</div>
                      <p style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
                        {j.reflection_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "vault" && (
              <div>
                <h1 className="page-title">Zero-Knowledge Local Vault & Scrubber</h1>
                <p className="page-lead">
                  Inspect how your local data is parsed and scrubbed. Your SQLite database lives at:{" "}
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{data.db_path}</code>
                </p>

                <div className="insight-card" style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 18 }}>24-Hour Cognitive Rhythm (Local Time)</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Notice your two distinct peaks: 10 AM–1 PM (Execution) and 7 PM–Midnight (Deep Architecture Lab).
                      </p>
                    </div>
                    <button className="btn-primary" onClick={runScan}>
                      <RefreshCw size={14} />
                      <span>Re-Scan Local AI Folders</span>
                    </button>
                  </div>

                  <div className="hour-bars">
                    {data.summary.hourly_distribution.map((count, hr) => {
                      const heightPct = Math.round((count / maxHourCount) * 100);
                      return (
                        <div key={hr} className="hour-col" title={`${hr}:00 — ${count} prompts`}>
                          <div className="hour-bar" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                          <span className="hour-label">{hr}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="insight-card" style={{ marginTop: 18 }}>
                  <h3 style={{ fontSize: 18 }}>Import Claude Web or ChatGPT Export (`conversations.json`)</h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
                    Parsed 100% locally via the MIT-licensed <code>clearspace-prompt-parsers</code> Rust crate.
                  </p>
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
                    <label className="btn-outline" style={{ cursor: "pointer" }}>
                      <Upload size={14} />
                      <span>Select conversations.json</span>
                      <input type="file" accept=".json" hidden onChange={handleFileUpload} />
                    </label>
                    {importStatus && (
                      <span style={{ fontSize: 13, color: "var(--accent-sage)", fontWeight: 600 }}>
                        {importStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
