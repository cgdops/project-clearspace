import React, { useEffect, useMemo, useState } from "react";
import {
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
  Trash2,
  FileJson,
  FileText,
  Layers,
  Search,
} from "lucide-react";
import {
  VaultDashboardPayload,
  getVaultDashboard,
  scanLocalVault,
  importExportedContent,
  loadSampleMultiProviderVault,
  resetLocalVault,
  toggleQuestState,
  addJournalEntry,
  formatTierLabel,
  classifySkillTierClient,
} from "./vaultClient";

type TabKey = "mirror" | "onet" | "equity" | "journal" | "vault";

const TAB_ORDER: TabKey[] = ["mirror", "onet", "equity", "journal", "vault"];

const SOCRATIC_PROMPTS = [
  "Which task this week gave you effortless 'deep flow' energy, and which task felt like repetitive maintenance drag?",
  "If you focused your next 30 days on 1 core anchor, 1 compounding engine, and 1 deep-flow lab, what would you stop doing immediately?",
  "Where are you currently underselling your systems architecture as 'just execution' instead of strategic unit-economics leverage?",
  "What is one reusable tool, workflow, or asset you built this month that compounds your 5-year career & financial autonomy?",
];

const PROVIDER_FILTER_OPTIONS = [
  { key: "ALL", label: "All Sources" },
  { key: "chat_gpt_web", label: "OpenAI ChatGPT" },
  { key: "claude_web", label: "Anthropic Claude" },
  { key: "gemini_takeout", label: "Google Gemini Takeout" },
  { key: "markdown_journal", label: "Markdown & Notes" },
  { key: "antigravity", label: "Antigravity Local" },
];

const SIGNAL_CATEGORY_OPTIONS = [
  "All Categories",
  "Systems & Architecture",
  "Career & Positioning",
  "Values & Motivation",
  "Curiosity & Learning",
  "Skeptical Truth-Seeking",
];

function formatSourceLabel(rawSource: string): string {
  switch (rawSource) {
    case "chat_gpt_web":
      return "OpenAI ChatGPT";
    case "claude_web":
      return "Anthropic Claude";
    case "gemini_takeout":
      return "Google Gemini Takeout";
    case "markdown_journal":
      return "Markdown & Notes";
    default:
      return "Antigravity Local";
  }
}

function computePeakWindowLabel(hourly: number[]): { windowLabel: string; shareSub: string } {
  const total = hourly.reduce((acc, v) => acc + v, 0);
  if (total === 0) {
    return {
      windowLabel: "Awaiting Data",
      shareSub: "Import prompts to map your peak flow hours",
    };
  }
  let bestStart = 9;
  let bestSum = 0;
  for (let start = 0; start < 24; start++) {
    let sum = 0;
    for (let offset = 0; offset < 4; offset++) {
      sum += hourly[(start + offset) % 24] ?? 0;
    }
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  const endHr = (bestStart + 4) % 24;
  const fmt = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };
  const pct = Math.round((bestSum / total) * 100);
  return {
    windowLabel: `${fmt(bestStart)} – ${fmt(endHr)}`,
    shareSub: `${pct}% of timestamped prompts in this 4h block`,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("mirror");
  const [data, setData] = useState<VaultDashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState<number>(0);
  const [journalText, setJournalText] = useState<string>("");
  const [mood, setMood] = useState<string>("Energized & Clear");
  const [importStatus, setImportStatus] = useState<string>("");

  // Interactive Prompt Explorer state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getVaultDashboard();
      setData(res);
    } catch (err) {
      console.error("Failed to load local vault dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TAB_ORDER.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = TAB_ORDER[nextIndex];
      setActiveTab(nextTab);
      const nextBtn = document.getElementById(`tab-${nextTab}`);
      nextBtn?.focus();
    }
  };

  const handleScanLocal = async () => {
    setLoading(true);
    try {
      const res = await scanLocalVault();
      setData(res);
      setImportStatus(
        `Scanned & merged local vault: ${res.summary.clean_prompts_kept.toLocaleString()} clean prompts ready.`
      );
    } catch (err) {
      setImportStatus(`Local scan error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const res = await loadSampleMultiProviderVault();
      setData(res);
      setImportStatus(
        `Loaded multi-provider sample vault (${res.summary.clean_prompts_kept} prompts across OpenAI, Anthropic & Gemini).`
      );
    } catch (err) {
      setImportStatus(`Sample load error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVault = async () => {
    setLoading(true);
    try {
      const res = await resetLocalVault();
      setData(res);
      setSearchQuery("");
      setSelectedSource("ALL");
      setSelectedCategory("All Categories");
      setImportStatus("Local vault cleared. Ready for fresh multi-provider onboarding.");
    } catch (err) {
      setImportStatus(`Reset error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleQuest = async (questId: string, field: "accepted" | "completed") => {
    if (!data) return;
    const updated = await toggleQuestState(questId, field);
    setData({ ...data, quests: updated });
  };

  const handleSaveJournal = async () => {
    if (!journalText.trim() || !data) return;
    const updated = await addJournalEntry(
      SOCRATIC_PROMPTS[selectedPromptIdx],
      journalText,
      mood
    );
    setJournalText("");
    setData({ ...data, journals: updated });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let totalImported = 0;
    let totalRedactions = 0;
    let latestDashboard: VaultDashboardPayload | null = null;

    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        const { summary, dashboard } = await importExportedContent(text);
        totalImported += summary.clean_prompts_kept;
        totalRedactions += summary.total_redactions;
        latestDashboard = dashboard;
      }
      if (latestDashboard) {
        setData(latestDashboard);
      }
      setImportStatus(
        `Imported ${totalImported} clean prompts from ${files.length} file(s) (${totalRedactions} PII redactions made locally).`
      );
    } catch (err) {
      setImportStatus(`Import error: ${String(err)}`);
    } finally {
      e.target.value = "";
    }
  };

  const acceptedQuests = data?.quests.filter((q) => q.accepted) ?? [];
  const completedQuests = data?.quests.filter((q) => q.completed) ?? [];
  const totalAvailableQuestPoints =
    data?.quests.reduce((acc, q) => acc + q.equity_points, 0) ?? 2600;
  const committedQuestPoints = acceptedQuests.reduce((acc, q) => acc + q.equity_points, 0);

  const baseEquity =
    data && data.summary.clean_prompts_kept > 0 && acceptedQuests.length > 0 ? 225 : 0;
  const totalEquityPoints = acceptedQuests.reduce(
    (acc, q) => acc + (q.completed ? q.equity_points : Math.round(q.equity_points * 0.35)),
    baseEquity
  );

  const equityProgressPct = Math.min(
    100,
    Math.round((committedQuestPoints / Math.max(totalAvailableQuestPoints, 1)) * 100)
  );

  const maxHourCount = data ? Math.max(...data.summary.hourly_distribution, 1) : 1;
  const peakInfo = data
    ? computePeakWindowLabel(data.summary.hourly_distribution)
    : { windowLabel: "Awaiting Data", shareSub: "" };

  const isVaultEmpty = Boolean(data && data.summary.clean_prompts_kept === 0);

  const filteredExplorerPrompts = useMemo(() => {
    const list = data?.recent_high_signal_prompts ?? [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      if (selectedSource !== "ALL" && item.source !== selectedSource) {
        return false;
      }
      if (
        selectedCategory !== "All Categories" &&
        !item.signal_categories.includes(selectedCategory)
      ) {
        return false;
      }
      if (q && !item.cleaned_text.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [data?.recent_high_signal_prompts, searchQuery, selectedSource, selectedCategory]);

  const renderProviderGuideSteps = () => (
    <div className="provider-grid onboarding-grid">
      <div className="provider-step">
        <div className="provider-step-header">
          <FileJson size={16} color="#2b5b48" />
          <strong>1. OpenAI ChatGPT</strong>
        </div>
        <p>
          Settings → Data Controls → Export Data. Upload <code>conversations.json</code> (Unix epoch
          timestamps & message trees normalized automatically).
        </p>
      </div>
      <div className="provider-step">
        <div className="provider-step-header">
          <FileJson size={16} color="#2b5b48" />
          <strong>2. Anthropic Claude</strong>
        </div>
        <p>
          Settings → Account → Export Data. Upload Claude’s <code>conversations.json</code> (extracts
          human prompts & ISO timestamps).
        </p>
      </div>
      <div className="provider-step">
        <div className="provider-step-header">
          <Layers size={16} color="#2b5b48" />
          <strong>3. Google Gemini Takeout</strong>
        </div>
        <p>
          Google Takeout → My Activity → Gemini Apps. Upload <code>MyActivity.json</code> to map your
          Gemini prompt history.
        </p>
      </div>
      <div className="provider-step">
        <div className="provider-step-header">
          <FileText size={16} color="#2b5b48" />
          <strong>4. Markdown & Notes</strong>
        </div>
        <p>
          Upload local <code>.md</code> journals or plain-text reflections with date headings (e.g.,{" "}
          <code># 2026-03-10</code>).
        </p>
      </div>
    </div>
  );

  const renderOnboardingPanel = () => (
    <div className="onboarding-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="badge superpower">Zero-Knowledge Local Onboarding</span>
          <h2 className="page-title" style={{ fontSize: 30, marginTop: 10 }}>
            Welcome to Clearspace — Your Career & Cognitive Compass
          </h2>
          <p className="page-lead" style={{ marginTop: 8 }}>
            Bring your own AI prompt archives from any major provider. Every file is parsed, PII-scrubbed,
            and scored 100% locally on your machine—nothing ever leaves your device.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={handleLoadSample}>
            <Sparkles size={15} />
            <span>Load Sample Multi-Provider Vault</span>
          </button>
          <button className="btn-outline" onClick={handleScanLocal}>
            <RefreshCw size={14} />
            <span>Opt-In: Scan Local Antigravity Prompts</span>
          </button>
        </div>
      </div>

      {renderProviderGuideSteps()}

      <div className="upload-dropzone" aria-live="polite">
        <label className="btn-primary" style={{ cursor: "pointer" }}>
          <Upload size={15} />
          <span>Import Export Files (.json, .md)</span>
          <input
            type="file"
            accept=".json,.md,.txt,.jsonl"
            multiple
            hidden
            onChange={handleFileUpload}
            data-testid="vault-file-input"
          />
        </label>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Supports multi-file additive merging into your local SQLite vault.
        </span>
        {importStatus && (
          <div style={{ fontSize: 13, color: "var(--accent-sage)", fontWeight: 600, width: "100%", marginTop: 6 }}>
            {importStatus}
          </div>
        )}
      </div>
    </div>
  );

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

          <nav
            className="nav-list"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Clearspace primary navigation"
            onKeyDown={handleTabKeyDown}
          >
            <button
              id="tab-mirror"
              role="tab"
              aria-selected={activeTab === "mirror"}
              aria-controls="panel-mirror"
              tabIndex={activeTab === "mirror" ? 0 : -1}
              className={`nav-btn ${activeTab === "mirror" ? "active" : ""}`}
              onClick={() => setActiveTab("mirror")}
            >
              <Sparkles size={17} />
              <span>Cognitive Mirror</span>
            </button>
            <button
              id="tab-onet"
              role="tab"
              aria-selected={activeTab === "onet"}
              aria-controls="panel-onet"
              tabIndex={activeTab === "onet" ? 0 : -1}
              className={`nav-btn ${activeTab === "onet" ? "active" : ""}`}
              onClick={() => setActiveTab("onet")}
            >
              <Compass size={17} />
              <span>O*NET Path Finder</span>
            </button>
            <button
              id="tab-equity"
              role="tab"
              aria-selected={activeTab === "equity"}
              aria-controls="panel-equity"
              tabIndex={activeTab === "equity" ? 0 : -1}
              className={`nav-btn ${activeTab === "equity" ? "active" : ""}`}
              onClick={() => setActiveTab("equity")}
            >
              <TrendingUp size={17} />
              <span>5-Year Equity & Quests</span>
            </button>
            <button
              id="tab-journal"
              role="tab"
              aria-selected={activeTab === "journal"}
              aria-controls="panel-journal"
              tabIndex={activeTab === "journal" ? 0 : -1}
              className={`nav-btn ${activeTab === "journal" ? "active" : ""}`}
              onClick={() => setActiveTab("journal")}
            >
              <BookOpen size={17} />
              <span>Reflective Journal</span>
            </button>
            <button
              id="tab-vault"
              role="tab"
              aria-selected={activeTab === "vault"}
              aria-controls="panel-vault"
              tabIndex={activeTab === "vault" ? 0 : -1}
              className={`nav-btn ${activeTab === "vault" ? "active" : ""}`}
              onClick={() => setActiveTab("vault")}
            >
              <Database size={17} />
              <span>Local Vault & Scrubber</span>
            </button>
          </nav>
        </div>

        <div className="equity-widget" aria-live="polite">
          <div className="stat-label">5-Year Personal Equity Index</div>
          <div className="equity-score-num">{totalEquityPoints.toLocaleString()} pts</div>
          <p className="stat-sub">
            Compounding across {acceptedQuests.length} active career commitments.
          </p>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-warm)", display: "flex", gap: 8 }}>
            <button
              className="btn-outline"
              style={{ width: "100%", justifyContent: "center", fontSize: 11.5, padding: "6px 10px" }}
              onClick={handleResetVault}
              title="Wipe imported prompts and return to clean new-user onboarding"
            >
              <Trash2 size={12} />
              <span>Reset / Clear Vault</span>
            </button>
          </div>
        </div>
      </aside>

      <main
        className="main-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {loading || !data ? (
          <div className="insight-card">
            <h2 className="page-title">Initializing local vault…</h2>
            <p className="page-lead">
              Preparing deterministic PII scrubber and O*NET behavioral matcher on your local machine.
            </p>
          </div>
        ) : (
          <>
            {activeTab === "mirror" && (
              <div>
                <h1 className="page-title">Your Unmasked Cognitive Mirror</h1>
                <p className="page-lead">
                  {isVaultEmpty ? (
                    <>
                      Your local vault is currently empty (<strong>0 prompts ingested</strong>). Import your
                      OpenAI, Anthropic, Google Gemini Takeout, or Markdown archives below to synthesize your
                      cognitive mirror.
                    </>
                  ) : (
                    <>
                      Synthesized locally from{" "}
                      <strong>{data.summary.clean_prompts_kept.toLocaleString()} unique first-person prompts</strong>{" "}
                      across <strong>{data.summary.total_files_scanned} conversations</strong> (
                      {data.summary.earliest_date?.slice(0, 10) ?? "N/A"} →{" "}
                      {data.summary.latest_date?.slice(0, 10) ?? "N/A"}). Every insight is backed by your exact
                      words.
                    </>
                  )}
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
                    <div className="stat-value" style={{ fontSize: 26 }}>{peakInfo.windowLabel}</div>
                    <div className="stat-sub">{peakInfo.shareSub}</div>
                  </div>
                </div>

                {isVaultEmpty ? (
                  renderOnboardingPanel()
                ) : (
                  <>
                    <div
                      className="insight-card"
                      style={{ marginTop: 20, borderLeft: "4px solid var(--accent-sage)" }}
                      data-testid="honest-positioning-banner"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span className="badge superpower">
                            Objective Positioning: {data.summary.overall_positioning ?? "Calibrated"}
                          </span>
                          <span className="badge value">
                            Zero Ego-Inflation • Evidence-Weighted Rubric
                          </span>
                        </div>
                        {data.summary.tier_counts && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            Beginner→Junior: {data.summary.tier_counts[0]} • Intermediate→Mid-Level:{" "}
                            {data.summary.tier_counts[1]} • Advanced→Senior/Staff:{" "}
                            {data.summary.tier_counts[2]}
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--text-secondary)" }}>
                        <strong>Why you can trust this score:</strong> Clearspace never flatters your ego or assigns Senior/Staff titles for basic keyword mentions. Every prompt is weighted by demonstrated depth (0.35x Beginner, 0.75x Intermediate, 1.15x Advanced), assumptions are explicitly stress-tested, and missing evidence gaps are surfaced below.
                      </p>
                    </div>

                    <div className="card-stack">
                      {data.mirror_cards.map((card) => (
                        <div key={card.id} className="insight-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              className={`badge ${
                                card.category === "Burnout Trigger"
                                  ? "burnout"
                                  : card.category === "Core Value"
                                  ? "value"
                                  : "superpower"
                              }`}
                            >
                              {card.category} • {card.confidence_pct}% Evidence Confidence
                            </span>
                            {card.assessed_tier && (
                              <span className="badge value">{card.assessed_tier}</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: "20px", marginTop: "10px", fontWeight: 700 }}>{card.title}</h3>
                          <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "14.5px" }}>
                            {card.summary}
                          </p>

                          {card.assumption_challenged && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: "9px 13px",
                                background: "var(--bg-amber-soft)",
                                borderRadius: 10,
                                fontSize: 13,
                                color: "var(--accent-gold)",
                              }}
                              data-testid="mirror-assumption-box"
                            >
                              <strong>Test Assumption:</strong>{" "}
                              {card.assumption_challenged.replace(/^Assumption Tested:\s*/i, "")}
                            </div>
                          )}

                          {card.identified_gap && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: "9px 13px",
                                background: "var(--bg-rose-soft)",
                                borderRadius: 10,
                                fontSize: 13,
                                color: "#7a2828",
                              }}
                              data-testid="mirror-gap-box"
                            >
                              <strong>Identify Gap:</strong>{" "}
                              {card.identified_gap.replace(/^Gap Identified:\s*/i, "")}
                            </div>
                          )}

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
                  </>
                )}
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

                {isVaultEmpty && renderOnboardingPanel()}

                <div className="card-stack">
                  {data.onet_matches.map((role) => (
                    <div key={role.onet_code} className="insight-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span className="badge superpower">{role.bucket}</span>
                            <span className="badge value" data-testid="onet-assessed-tier">
                              Objective Level: {role.assessed_tier}
                            </span>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              O*NET {role.onet_code} • Calibrated Band: {role.positioned_salary_usd}
                            </span>
                          </div>
                          <h3 style={{ fontSize: "21px", marginTop: "8px" }}>
                            {role.positioned_title}
                          </h3>
                          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: 2 }}>
                            Track Ceiling ({role.salary_range_usd}): {role.modern_titles.join(" • ")}
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
                          <div
                            className="meter-bar-track"
                            role="progressbar"
                            aria-label={`${role.modern_titles[0]} Skill Overlap`}
                            aria-valuenow={role.skill_overlap_pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="meter-bar-fill"
                              style={{ width: `${role.skill_overlap_pct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Energy Alignment</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--accent-sage)" }}>
                            {role.energy_alignment_pct}%
                          </div>
                          <div
                            className="meter-bar-track"
                            role="progressbar"
                            aria-label={`${role.modern_titles[0]} Energy Alignment`}
                            aria-valuenow={role.energy_alignment_pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="meter-bar-fill"
                              style={{ width: `${role.energy_alignment_pct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Values Match</div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{role.values_match_pct}%</div>
                          <div
                            className="meter-bar-track"
                            role="progressbar"
                            aria-label={`${role.modern_titles[0]} Values Match`}
                            aria-valuenow={role.values_match_pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="meter-bar-fill"
                              style={{ width: `${role.values_match_pct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="stat-label">Burnout Friction</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#a93b3b" }}>
                            {role.burnout_risk_pct}%
                          </div>
                          <div
                            className="meter-bar-track"
                            role="progressbar"
                            aria-label={`${role.modern_titles[0]} Burnout Friction`}
                            aria-valuenow={role.burnout_risk_pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="meter-bar-fill burnout"
                              style={{ width: `${role.burnout_risk_pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <p style={{ marginTop: 14, fontSize: 14, color: "var(--text-primary)" }}>
                        <strong>Honest Seniority Calibration:</strong> {role.honest_positioning_rationale}
                      </p>

                      <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                        <strong>Why this track fits your behavior:</strong> {role.why_it_fits}
                      </p>

                      {role.identified_gaps && role.identified_gaps.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 14px",
                            background: "var(--bg-warm)",
                            border: "1px solid var(--border-warm)",
                            borderRadius: 10,
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                          data-testid="onet-identified-gaps"
                        >
                          <strong style={{ color: "var(--text-primary)" }}>
                            Identified Gaps to Next Level:
                          </strong>
                          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                            {role.identified_gaps.map((gap, gIdx) => (
                              <li key={gIdx}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {role.tested_assumptions && role.tested_assumptions.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "10px 14px",
                            background: "var(--bg-amber-soft)",
                            borderRadius: 10,
                            fontSize: 13,
                            color: "var(--accent-gold)",
                          }}
                          data-testid="onet-tested-assumptions"
                        >
                          <strong>Tested Assumptions:</strong>
                          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                            {role.tested_assumptions.map((ta, tIdx) => (
                              <li key={tIdx}>{ta.replace(/^Assumption Tested:\s*/i, "")}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 10,
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

                <div className="insight-card" style={{ marginTop: 22 }} data-testid="equity-summary-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div className="stat-label">5-Year Trajectory Commitment</div>
                      <h3 style={{ fontSize: 20, marginTop: 4 }}>
                        {committedQuestPoints.toLocaleString()} / {totalAvailableQuestPoints.toLocaleString()} Equity Points Committed ({equityProgressPct}%)
                      </h3>
                      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        {acceptedQuests.length} of {data.quests.length} milestones on your active path •{" "}
                        {completedQuests.length} completed
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="badge value">Now (30 Days)</span>
                      <span className="badge superpower">Year 1 Milestone</span>
                      <span className="badge superpower">Year 3 Milestone</span>
                      <span className="badge value">Year 5 Horizon</span>
                    </div>
                  </div>
                  <div
                    className="equity-progress-track"
                    role="progressbar"
                    aria-label="5-Year Equity Commitment Progress"
                    aria-valuenow={equityProgressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="equity-progress-fill"
                      style={{ width: `${equityProgressPct}%` }}
                    />
                  </div>
                </div>

                <div className="card-stack">
                  {data.quests.map((q) => (
                    <div key={q.id} className="insight-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
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
                  A private, non-judgmental space stored strictly in your local vault. Choose a Socratic
                  prompt derived from your behavioral graph or write freely.
                </p>

                <div className="insight-card" style={{ marginTop: 22 }}>
                  <div className="stat-label">Socratic Prompt (Derived from Your Graph)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {SOCRATIC_PROMPTS.map((_sp, idx) => (
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
                    aria-label="Journal reflection entry"
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
                      aria-label="Current mood valence"
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
                  Inspect how your local data is parsed and scrubbed. Your local database lives at:{" "}
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{data.db_path}</code>
                </p>

                {isVaultEmpty ? (
                  renderOnboardingPanel()
                ) : (
                  <div className="insight-card" style={{ marginTop: 16, padding: "16px 22px" }}>
                    <div
                      className="upload-dropzone"
                      style={{ marginTop: 0, padding: "12px 16px" }}
                      aria-live="polite"
                    >
                      <label className="btn-primary" style={{ cursor: "pointer" }}>
                        <Upload size={15} />
                        <span>Import Export Files (.json, .md)</span>
                        <input
                          type="file"
                          accept=".json,.md,.txt,.jsonl"
                          multiple
                          hidden
                          onChange={handleFileUpload}
                          data-testid="vault-file-input"
                        />
                      </label>
                      <button className="btn-outline" onClick={handleLoadSample}>
                        <Sparkles size={14} />
                        <span>Load Sample Multi-Provider Vault</span>
                      </button>
                      <button className="btn-outline" onClick={handleScanLocal}>
                        <RefreshCw size={14} />
                        <span>Opt-In: Scan Local Antigravity Prompts</span>
                      </button>
                      <button className="btn-outline" onClick={handleResetVault}>
                        <Trash2 size={14} />
                        <span>Reset / Clear Vault</span>
                      </button>
                      {data.summary.source_counts && data.summary.source_counts.length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {data.summary.source_counts.map(([src, count]) => (
                            <span key={src} className="badge superpower">
                              {src}: {count.toLocaleString()} prompts
                            </span>
                          ))}
                        </div>
                      )}
                      {importStatus && (
                        <div style={{ fontSize: 13, color: "var(--accent-sage)", fontWeight: 600, width: "100%", marginTop: 4 }}>
                          {importStatus}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="insight-card" style={{ marginTop: 16, padding: "18px 22px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18 }}>24-Hour Cognitive Rhythm (Local Time)</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Peak 4-hour deep-flow window: <strong>{peakInfo.windowLabel}</strong> ({peakInfo.shareSub}).
                      </p>
                    </div>
                  </div>

                  <div className="hour-bars" style={{ height: 92, marginTop: 12 }}>
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

                <div
                  className="insight-card"
                  style={{ marginTop: 16, padding: "20px 24px" }}
                  data-testid="vault-prompt-explorer"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 18 }}>Interactive Scrubbed Prompt Explorer</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Search and filter your high-signal prompts after deterministic local PII redaction.
                      </p>
                    </div>
                    <div className="search-input-wrap">
                      <Search size={15} color="var(--text-muted)" />
                      <input
                        type="search"
                        className="vault-search-input"
                        data-testid="vault-search-input"
                        placeholder="Search scrubbed prompts by keyword..."
                        aria-label="Search scrubbed prompts by keyword"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div className="stat-label" style={{ marginBottom: 6 }}>Provider Source</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {PROVIDER_FILTER_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          className={`btn-outline ${selectedSource === opt.key ? "active" : ""}`}
                          style={{ padding: "5px 11px", fontSize: 12 }}
                          onClick={() => setSelectedSource(opt.key)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div className="stat-label" style={{ marginBottom: 6 }}>Signal Category</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {SIGNAL_CATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat}
                          className={`btn-outline ${selectedCategory === cat ? "active" : ""}`}
                          style={{ padding: "5px 11px", fontSize: 12 }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {filteredExplorerPrompts.length === 0 ? (
                      <div className="quote-box" style={{ borderLeftColor: "var(--border-warm)" }}>
                        No scrubbed prompts match the active filters. Import a provider archive or load the Sample Vault above to inspect normalized records.
                      </div>
                    ) : (
                      filteredExplorerPrompts.map((p) => (
                        <div key={p.id} className="quote-box" data-testid="explorer-prompt-row">
                          <div
                            className="quote-meta"
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
                          >
                            <span>
                              <strong>{formatSourceLabel(p.source)}</strong> • {p.created_at.slice(0, 10)} •{" "}
                              {p.word_count} words
                            </span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <span className="badge value">
                                {formatTierLabel(
                                  p.skill_tier ??
                                    classifySkillTierClient(
                                      p.cleaned_text,
                                      p.word_count,
                                      p.signal_categories
                                    )
                                )}
                              </span>
                              {p.redactions_made > 0 && (
                                <span className="badge burnout">
                                  {p.redactions_made} PII Redacted
                                </span>
                              )}
                              {p.signal_categories.map((sc) => (
                                <span key={sc} className="badge superpower">
                                  {sc}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ marginTop: 4 }}>“{p.cleaned_text}”</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!isVaultEmpty && (
                  <div className="onboarding-card" style={{ marginTop: 16 }}>
                    <h3 style={{ fontSize: 17 }}>Multi-Provider Export Instructions Reference</h3>
                    {renderProviderGuideSteps()}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
