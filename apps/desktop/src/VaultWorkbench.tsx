import React, { useState } from "react";
import {
  Database,
  Layers,
  Network,
  MessageSquare,
  Eye,
  Briefcase,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  FileJson,
  BookOpen,
  Award,
  Users,
  Search,
} from "lucide-react";
import {
  IngestionSummary,
  LinkedInVaultAnalytics,
  LinkedInFileSummary,
  SAMPLE_ANONYMIZED_LINKEDIN_ENTRIES,
  parseLinkedInArchiveEntriesClient,
} from "./vaultClient";

export interface VaultWorkbenchProps {
  summary: IngestionSummary;
  selectedSource: string;
  onSelectSource: (sourceKey: string) => void;
  onContinueToMirror: () => void;
  isVaultEmpty: boolean;
  childrenMiddleVisuals?: React.ReactNode;
}

export const VAULT_SOURCE_OPTIONS = [
  { key: "ALL", label: "All Sources" },
  { key: "linkedin_export", label: "LinkedIn Archive" },
  { key: "chat_gpt_web", label: "OpenAI ChatGPT" },
  { key: "claude_web", label: "Anthropic Claude" },
  { key: "gemini_takeout", label: "Google Gemini Takeout" },
  { key: "markdown_journal", label: "Markdown & Notes" },
  { key: "antigravity", label: "Antigravity Local" },
];

interface LinkedInClusterSpec {
  id: string;
  numberLabel: string;
  title: string;
  subtitle: string;
  files: string[];
  whyTracked: string;
}

const LINKEDIN_CLUSTERS: LinkedInClusterSpec[] = [
  {
    id: "career_credentials",
    numberLabel: "Cluster 1",
    title: "Career & Credentials",
    subtitle: "What you have officially built, studied, and shipped",
    files: [
      "Positions.csv",
      "Education.csv",
      "Certifications.csv",
      "Projects.csv",
      "Honors.csv",
      "Organizations.csv",
    ],
    whyTracked:
      "Forms the canonical resume graph LinkedIn uses to index your career history, role progression, and institutional affiliations.",
  },
  {
    id: "skills_peer_proof",
    numberLabel: "Cluster 2",
    title: "Skills & Peer Proof",
    subtitle: "How colleagues vouch for your capabilities",
    files: [
      "Skills.csv",
      "Endorsement_Received_Info.csv",
      "Endorsement_Given_Info.csv",
      "Recommendations_Received.csv",
      "Recommendations_Given.csv",
    ],
    whyTracked:
      "Powers recruiter keyword matching and social proof by weighting declared skills against peer endorsements and written recommendations.",
  },
  {
    id: "network_messaging",
    numberLabel: "Cluster 3",
    title: "Network & Messaging",
    subtitle: "Your professional graph and relationship cadence",
    files: [
      "Connections.csv",
      "Invitations.csv",
      "messages.csv",
      "Company Follows.csv",
    ],
    whyTracked:
      "Maps your 1st-degree social graph, outreach velocity, and private conversation threads across companies and roles.",
  },
  {
    id: "job_search_positioning",
    numberLabel: "Cluster 4",
    title: "Job Search & Positioning",
    subtitle: "Where you are aiming next and how you apply",
    files: [
      "Jobs/Job Applications.csv",
      "Jobs/Saved Jobs.csv",
      "SavedJobAlerts.csv",
      "Jobs/Job Seeker Preferences.csv",
      "Private_identity_asset.csv",
    ],
    whyTracked:
      "Tracks active job search intent, saved search queries, recruiter visibility preferences, and resume variants submitted.",
  },
  {
    id: "algorithmic_learning_voice",
    numberLabel: "Cluster 5",
    title: "Algorithmic Profile, Learning & Voice",
    subtitle: "How LinkedIn's ad engine classifies you + your public voice",
    files: [
      "Ad_Targeting.csv",
      "Learning.csv",
      "Rich_Media.csv",
      "Articles/Articles/*.html",
    ],
    whyTracked:
      "Reveals the B2B ad segments, buyer groups, and inferred skills LinkedIn sells to advertisers alongside your courses and published articles.",
  },
];

interface AiSourceSummarySpec {
  sourceKey: string;
  fileName: string;
  providerLabel: string;
  dagPath: string;
  keyFields: string[];
  plainEnglish: string;
}

const AI_SOURCE_SUMMARIES: AiSourceSummarySpec[] = [
  {
    sourceKey: "chat_gpt_web",
    fileName: "conversations.json / chat.html",
    providerLabel: "OpenAI ChatGPT",
    dagPath: "conversations[] → mapping{node_id} → message → author.role='user' → content.parts[]",
    keyFields: ["id", "create_time", "mapping", "author.role", "content.parts"],
    plainEnglish:
      "Stores every ChatGPT thread as a Directed Acyclic Graph (DAG) of message nodes so branched edits and regenerations are preserved. Clearspace extracts only your human prompts and discards assistant replies.",
  },
  {
    sourceKey: "claude_web",
    fileName: "conversations.json / projects.json",
    providerLabel: "Anthropic Claude",
    dagPath: "conversations[] → chat_messages[] (sender='human') + projects[] → docs[]",
    keyFields: ["uuid", "chat_messages", "sender", "created_at", "prompt_template"],
    plainEnglish:
      "Captures chronological human/assistant turns in Claude chats plus custom instructions and reference documents inside Claude Projects.",
  },
  {
    sourceKey: "gemini_takeout",
    fileName: "MyActivity.json / gemini_gems_data.html",
    providerLabel: "Google Gemini Takeout",
    dagPath: "MyActivity[] (title='Prompted ...') + conversation_turns[] → user_turn.prompt",
    keyFields: ["header", "title", "time", "subtitles", "conversation_turns"],
    plainEnglish:
      "Logs Google Takeout activity records across Gemini Apps, Workspace conversations, and Custom Gems while Clearspace filters out UI/Canvas noise events.",
  },
  {
    sourceKey: "markdown_journal",
    fileName: "*.md / *.txt Notes & Journals",
    providerLabel: "Markdown & Notes",
    dagPath: "YAML frontmatter (date/title) → Markdown headings (# YYYY-MM-DD) → paragraphs[]",
    keyFields: ["frontmatter.date", "heading_timestamp", "body_paragraphs"],
    plainEnglish:
      "Ingests local Markdown notes, architecture docs, and reflective journals into timestamped first-person thought records.",
  },
  {
    sourceKey: "antigravity",
    fileName: "Antigravity Local Logs (.jsonl / .pb)",
    providerLabel: "Antigravity Local",
    dagPath: "brain/<conversation-id>/logs → USER_INPUT steps → local PII scrubber → NormalizedPrompt",
    keyFields: ["conversation_id", "step_index", "created_at", "USER_INPUT"],
    plainEnglish:
      "Scans your local Antigravity engineering sessions on disk to surface recurring architectural and problem-solving patterns.",
  },
];

const DEFAULT_PREVIEW_LINKEDIN: LinkedInVaultAnalytics =
  parseLinkedInArchiveEntriesClient(SAMPLE_ANONYMIZED_LINKEDIN_ENTRIES).analytics;

export const VaultWorkbench: React.FC<VaultWorkbenchProps> = ({
  summary,
  selectedSource,
  onSelectSource,
  onContinueToMirror,
  isVaultEmpty,
  childrenMiddleVisuals,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<string>("ALL");

  const activeLinkedIn: LinkedInVaultAnalytics =
    summary.linkedin_analytics ?? DEFAULT_PREVIEW_LINKEDIN;
  const isShowingLiPreview = !summary.linkedin_analytics;

  const displayLiModules =
    selectedSource === "ALL" || selectedSource === "linkedin_export";
  const showAiStructure =
    selectedSource === "ALL" || selectedSource !== "linkedin_export";

  const filteredLiFiles: LinkedInFileSummary[] =
    selectedClusterId === "ALL"
      ? activeLinkedIn.file_summaries
      : activeLinkedIn.file_summaries.filter((f) => f.cluster_id === selectedClusterId);

  const filteredAiSources =
    selectedSource === "ALL"
      ? AI_SOURCE_SUMMARIES
      : AI_SOURCE_SUMMARIES.filter((s) => s.sourceKey === selectedSource);

  const sourceCountMap = new Map<string, number>(summary.source_counts ?? []);
  const totalCategoryHits =
    summary.category_counts?.reduce((acc, [, c]) => acc + c, 0) || 1;

  return (
    <div className="vault-workbench" data-testid="vault-workbench">
      {/* Sticky Source Selector Bar */}
      <div
        className="insight-card"
        style={{
          marginTop: 18,
          padding: "16px 20px",
          borderLeft: "4px solid var(--accent-sage)",
        }}
        data-testid="vault-source-selector-bar"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="badge superpower">
                <Database size={13} />
                <span>3-Stage Data Exploration &amp; Visualization Workbench</span>
              </span>
              <span className="badge value">
                Understand Your Data → Understand Yourself
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
              Filter by data source below to explore <strong>1. How the Data is Structured</strong>,{" "}
              <strong>2. What Is In It</strong>, and <strong>3. What It Says About You</strong>.
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter Data Vault Workbench by source"
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}
        >
          {VAULT_SOURCE_OPTIONS.map((opt) => {
            const isSelected = selectedSource === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`btn-outline ${isSelected ? "active" : ""}`}
                style={{ padding: "6px 12px", fontSize: 12.5 }}
                aria-pressed={isSelected}
                onClick={() => onSelectSource(opt.key)}
                data-testid={`vault-source-filter-${opt.key}`}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: HOW THE DATA IS STRUCTURED (ER / Tree Diagram + Cards)
         ===================================================================== */}
      <section
        className="insight-card"
        style={{ marginTop: 20, padding: "22px 24px" }}
        data-testid="vault-section-structure"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <span className="badge superpower">Stage 1 of 3 • Schema &amp; Architecture</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
              1. How the Data is Structured
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
              Raw exports arrive as dozens of disconnected CSV tables, HTML files, and nested JSON trees.
              Here is how those files connect—and what each table actually tracks about you.
            </p>
          </div>
          {isShowingLiPreview && displayLiModules && (
            <span className="badge value">
              Previewing Reference LinkedIn Schema (Upload your .zip or Load Sample Vault)
            </span>
          )}
        </div>

        {/* Visual Entity-Relationship (ER) / Hierarchy Tree Diagram */}
        <div
          className="er-diagram-container"
          style={{ marginTop: 18 }}
          data-testid="vault-er-diagram"
        >
          {displayLiModules && (
            <div className="er-linkedin-blueprint" data-testid="er-linkedin-diagram">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={17} color="var(--accent-sage)" />
                  <strong style={{ fontSize: 15 }}>
                    LinkedIn Archive Entity-Relationship (ER) Map ({activeLinkedIn.total_files_parsed}{" "}
                    files • {activeLinkedIn.total_rows_parsed.toLocaleString()} structured rows)
                  </strong>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn-outline ${selectedClusterId === "ALL" ? "active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: 11.5 }}
                    onClick={() => setSelectedClusterId("ALL")}
                  >
                    All 5 Clusters ({activeLinkedIn.file_summaries.length})
                  </button>
                  {LINKEDIN_CLUSTERS.map((cl) => (
                    <button
                      key={cl.id}
                      type="button"
                      className={`btn-outline ${selectedClusterId === cl.id ? "active" : ""}`}
                      style={{ padding: "4px 10px", fontSize: 11.5 }}
                      onClick={() =>
                        setSelectedClusterId(selectedClusterId === cl.id ? "ALL" : cl.id)
                      }
                      data-testid={`er-cluster-btn-${cl.id}`}
                    >
                      {cl.numberLabel}: {cl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Root Hub Node: Profile.csv */}
              <div className="er-root-hub" data-testid="er-root-profile-node">
                <div className="er-root-badge">ROOT ENTITY HUB</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  Profile.csv — Core Identity Anchor
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                  {activeLinkedIn.career_learning.profile_headline ||
                    "Headline, Executive Summary, Industry & Location"}{" "}
                  • Connects 1-to-Many across 5 domain clusters below
                </div>
              </div>

              {/* 5 Connected Domain Clusters */}
              <div className="er-clusters-grid">
                {LINKEDIN_CLUSTERS.map((cluster) => {
                  const isActive =
                    selectedClusterId === "ALL" || selectedClusterId === cluster.id;
                  const clusterFiles = activeLinkedIn.file_summaries.filter(
                    (f) => f.cluster_id === cluster.id
                  );
                  const totalClusterRows = clusterFiles.reduce((acc, f) => acc + f.row_count, 0);
                  return (
                    <div
                      key={cluster.id}
                      className={`er-cluster-node ${isActive ? "active" : "dimmed"}`}
                      onClick={() =>
                        setSelectedClusterId(selectedClusterId === cluster.id ? "ALL" : cluster.id)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedClusterId(
                            selectedClusterId === cluster.id ? "ALL" : cluster.id
                          );
                        }
                      }}
                      data-testid={`er-cluster-card-${cluster.id}`}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span className="badge superpower" style={{ fontSize: 10.5 }}>
                          {cluster.numberLabel}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--text-muted)",
                          }}
                        >
                          {totalClusterRows.toLocaleString()} rows
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>
                        {cluster.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {cluster.subtitle}
                      </div>
                      <div className="er-file-pills" style={{ marginTop: 8 }}>
                        {cluster.files.map((fn) => (
                          <span key={fn} className="er-file-pill">
                            {fn}
                          </span>
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          marginTop: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        {cluster.whyTracked}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Conversation Export JSON / DAG Hierarchy Tree */}
          {showAiStructure && (
            <div
              className="er-ai-dag-blueprint"
              style={{ marginTop: displayLiModules ? 16 : 0 }}
              data-testid="er-ai-dag-diagram"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <FileJson size={17} color="var(--accent-sage)" />
                <strong style={{ fontSize: 15 }}>
                  AI Conversation Export JSON / DAG Normalization Pipeline
                </strong>
              </div>
              <div className="er-dag-flow">
                <div className="er-dag-step">
                  <span className="badge value">1. Raw Export Container</span>
                  <strong>conversations[] / MyActivity[]</strong>
                  <span>Nested JSON tree or HTML archive</span>
                </div>
                <ArrowRight size={16} color="var(--accent-sage)" className="er-dag-arrow" />
                <div className="er-dag-step">
                  <span className="badge value">2. Message Node Traversal</span>
                  <strong>mapping{"{}"} → message → author</strong>
                  <span>Keep role=&quot;user&quot; / &quot;human&quot; only; discard AI replies</span>
                </div>
                <ArrowRight size={16} color="var(--accent-sage)" className="er-dag-arrow" />
                <div className="er-dag-step">
                  <span className="badge superpower">3. On-Device PII &amp; Noise Gate</span>
                  <strong>PII Scrubber + Prompt-Injection Strip</strong>
                  <span>Redact emails, phones, keys &amp; strip &lt;IMPORTANT INSTRUCTIONS&gt;</span>
                </div>
                <ArrowRight size={16} color="var(--accent-sage)" className="er-dag-arrow" />
                <div className="er-dag-step">
                  <span className="badge superpower">4. Local SQLite Vault</span>
                  <strong>NormalizedPrompt Record</strong>
                  <span>SHA-256 deduplicated, tier-scored &amp; O*NET indexed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plain-English File / Table Summary Cards */}
        <div style={{ marginTop: 20 }} data-testid="vault-file-summary-cards">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <h3 style={{ fontSize: 16.5, fontWeight: 700 }}>
              Plain-English File &amp; Table Dictionary
            </h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              What each exported file contains, its date span, key columns, and why the platform tracks it
            </span>
          </div>

          <div className="file-summary-grid">
            {displayLiModules &&
              filteredLiFiles.map((file) => (
                <div
                  key={file.file_name}
                  className="file-summary-card"
                  data-testid="vault-file-summary-card"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileSpreadsheet size={15} color="var(--accent-sage)" />
                      <strong style={{ fontSize: 13.5 }}>{file.file_name}</strong>
                    </div>
                    <span className="badge superpower" style={{ fontSize: 10.5 }}>
                      {file.row_count.toLocaleString()} {file.row_count === 1 ? "row" : "rows"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--accent-sage)",
                      fontWeight: 600,
                      marginTop: 4,
                    }}
                  >
                    {file.cluster_label} • {file.date_range}
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
                    {file.plain_english_description}
                  </p>
                  {file.key_fields.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {file.key_fields.slice(0, 5).map((kf) => (
                        <span key={kf} className="er-file-pill">
                          {kf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            {showAiStructure &&
              filteredAiSources.map((ai) => {
                const count = sourceCountMap.get(ai.providerLabel) ?? 0;
                return (
                  <div
                    key={ai.sourceKey}
                    className="file-summary-card"
                    data-testid="vault-file-summary-card"
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FileJson size={15} color="var(--accent-sage)" />
                        <strong style={{ fontSize: 13.5 }}>{ai.fileName}</strong>
                      </div>
                      <span className="badge value" style={{ fontSize: 10.5 }}>
                        {count.toLocaleString()} prompts in vault
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--accent-sage)",
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      {ai.providerLabel} • {ai.dagPath}
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
                      {ai.plainEnglish}
                    </p>
                    <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {ai.keyFields.map((kf) => (
                        <span key={kf} className="er-file-pill">
                          {kf}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: WHAT IS IN IT (5 LinkedIn Visualization Modules + AI Visuals)
         ===================================================================== */}
      <section
        style={{ marginTop: 22 }}
        data-testid="vault-section-visualizations"
      >
        <div className="insight-card" style={{ padding: "20px 24px" }}>
          <span className="badge superpower">Stage 2 of 3 • Interactive Visual Telemetry</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
            2. What Is In It
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            Interactive visual breakdowns across your network velocity, messaging cadence, algorithmic
            ad-targeting X-ray, career &amp; learning timeline, job search funnel, and AI prompt telemetry.
          </p>

          {/* 5 LinkedIn Visualization Modules */}
          {displayLiModules && (
            <div className="linkedin-viz-stack" style={{ marginTop: 18 }}>
              {/* MODULE 1: Network & Connection Growth */}
              <div
                className="linkedin-viz-card"
                data-testid="viz-linkedin-network"
              >
                <div className="linkedin-viz-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Network size={18} color="var(--accent-sage)" />
                    <h3 style={{ fontSize: 17.5, fontWeight: 700 }}>
                      Module 1 — Network &amp; Connection Growth (Connections.csv, Invitations.csv, Company Follows.csv)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge superpower">
                      {activeLinkedIn.network.total_connections.toLocaleString()} Connections
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.network.invitations_sent} Outbound /{" "}
                      {activeLinkedIn.network.invitations_received} Inbound Invites
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.network.company_follows_count} Followed Orgs
                    </span>
                  </div>
                </div>

                <div className="viz-two-col" style={{ marginTop: 14 }}>
                  <div>
                    <div className="stat-label">Connection Velocity Over the Years</div>
                    <div className="mini-bar-chart" style={{ marginTop: 8 }}>
                      {activeLinkedIn.network.connections_by_year.map(([yr, cnt]) => {
                        const maxCnt = Math.max(
                          ...activeLinkedIn.network.connections_by_year.map(([, c]) => c),
                          1
                        );
                        const pct = Math.max(8, Math.round((cnt / maxCnt) * 100));
                        return (
                          <div key={yr} className="mini-bar-row">
                            <span className="mini-bar-label">{yr}</span>
                            <div className="mini-bar-track">
                              <div
                                className="mini-bar-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="mini-bar-val">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">Top Companies &amp; Roles in Your Network</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {activeLinkedIn.network.top_companies.slice(0, 8).map(([comp, cnt]) => (
                        <span key={comp} className="badge superpower">
                          {comp} ({cnt})
                        </span>
                      ))}
                    </div>
                    <div className="stat-label" style={{ marginTop: 12 }}>
                      Most Common Peer Titles
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.network.top_positions.slice(0, 6).map(([pos, cnt]) => (
                        <span key={pos} className="badge value">
                          {pos} ({cnt})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* MODULE 2: Messaging & Relationship Cadence */}
              <div
                className="linkedin-viz-card"
                data-testid="viz-linkedin-messaging"
              >
                <div className="linkedin-viz-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MessageSquare size={18} color="var(--accent-sage)" />
                    <h3 style={{ fontSize: 17.5, fontWeight: 700 }}>
                      Module 2 — Messaging &amp; Relationship Cadence (messages.csv, Recommendations_*.csv, Endorsement_*.csv)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge superpower">
                      {activeLinkedIn.messaging.total_messages.toLocaleString()} Messages (
                      {activeLinkedIn.messaging.sent_messages} Sent /{" "}
                      {activeLinkedIn.messaging.received_messages} Received)
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.messaging.recommendations_received_count} Recs Received •{" "}
                      {activeLinkedIn.messaging.recommendations_given_count} Given
                    </span>
                  </div>
                </div>

                <div className="viz-two-col" style={{ marginTop: 14 }}>
                  <div>
                    <div className="stat-label">Message Volume by Year &amp; Top Threads</div>
                    <div className="mini-bar-chart" style={{ marginTop: 8 }}>
                      {activeLinkedIn.messaging.messages_by_year.map(([yr, cnt]) => {
                        const maxCnt = Math.max(
                          ...activeLinkedIn.messaging.messages_by_year.map(([, c]) => c),
                          1
                        );
                        const pct = Math.max(8, Math.round((cnt / maxCnt) * 100));
                        return (
                          <div key={yr} className="mini-bar-row">
                            <span className="mini-bar-label">{yr}</span>
                            <div className="mini-bar-track">
                              <div className="mini-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="mini-bar-val">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                      {activeLinkedIn.messaging.top_threads.slice(0, 6).map(([person, cnt]) => (
                        <span key={person} className="er-file-pill">
                          <Users size={11} style={{ display: "inline", marginRight: 4 }} />
                          {person} ({cnt} msgs)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">Peer Recommendations Vouching for You</div>
                    {activeLinkedIn.messaging.recommendations_received.slice(0, 2).map((rec, i) => (
                      <div key={i} className="quote-box" style={{ marginTop: 8 }}>
                        <div className="quote-meta">
                          <strong>{rec.person_name}</strong> ({rec.role_company}) • {rec.date}
                        </div>
                        <div style={{ fontSize: 12.5 }}>“{rec.excerpt}”</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MODULE 3: Algorithmic Ad-Targeting X-Ray */}
              <div
                className="linkedin-viz-card"
                data-testid="viz-linkedin-ad-xray"
              >
                <div className="linkedin-viz-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Eye size={18} color="var(--accent-sage)" />
                    <h3 style={{ fontSize: 17.5, fontWeight: 700 }}>
                      Module 3 — Algorithmic Ad-Targeting X-Ray (Ad_Targeting.csv vs. Skills.csv)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {activeLinkedIn.ad_targeting.member_age && (
                      <span className="badge value">
                        Age Bracket: {activeLinkedIn.ad_targeting.member_age}
                      </span>
                    )}
                    {activeLinkedIn.ad_targeting.years_of_experience && (
                      <span className="badge superpower">
                        Experience: {activeLinkedIn.ad_targeting.years_of_experience}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                  How LinkedIn’s advertising auction classifies your profile to B2B marketers—and where its
                  inferred skill tags diverge from the skills you actually claim.
                </p>

                <div className="viz-two-col" style={{ marginTop: 12 }}>
                  <div>
                    <div className="stat-label">High-Value Audience Segments &amp; Buyer Groups</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.ad_targeting.high_value_segments.map((seg) => (
                        <span key={seg} className="badge superpower">
                          {seg}
                        </span>
                      ))}
                      {activeLinkedIn.ad_targeting.buyer_groups.map((bg) => (
                        <span key={bg} className="badge value">
                          {bg}
                        </span>
                      ))}
                    </div>

                    <div className="stat-label" style={{ marginTop: 12 }}>
                      Algorithmic Inferred Job Titles &amp; Seniorities
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.ad_targeting.job_seniorities.map((sen) => (
                        <span key={sen} className="badge superpower">
                          Seniority: {sen}
                        </span>
                      ))}
                      {activeLinkedIn.ad_targeting.inferred_job_titles.map((jt) => (
                        <span key={jt} className="er-file-pill">
                          {jt}
                        </span>
                      ))}
                    </div>

                    <div className="stat-label" style={{ marginTop: 12 }}>
                      Inferred Industries &amp; Member Interests
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.ad_targeting.company_industries.slice(0, 5).map((ind) => (
                        <span key={ind} className="er-file-pill">
                          {ind}
                        </span>
                      ))}
                      {activeLinkedIn.ad_targeting.member_interests.slice(0, 6).map((intr) => (
                        <span key={intr} className="er-file-pill">
                          {intr}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">
                      Declared Profile Skills ({activeLinkedIn.ad_targeting.declared_profile_skills.length}) vs.
                      Ad-Engine Inferred Skills ({activeLinkedIn.ad_targeting.ad_inferred_skills.length})
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--bg-warm)",
                        border: "1px solid var(--border-warm)",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-sage)" }}>
                        ✓ Claimed on Your Profile Only ({activeLinkedIn.ad_targeting.skills_only_in_profile.length})
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                        {activeLinkedIn.ad_targeting.skills_only_in_profile.slice(0, 10).map((sk) => (
                          <span key={sk} className="badge superpower" style={{ fontSize: 11 }}>
                            {sk}
                          </span>
                        ))}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--accent-rose)",
                          marginTop: 12,
                        }}
                      >
                        ⚠ Inferred by LinkedIn Ad Engine Only ({activeLinkedIn.ad_targeting.skills_only_in_ad_engine.length})
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                        {activeLinkedIn.ad_targeting.skills_only_in_ad_engine.slice(0, 10).map((sk) => (
                          <span key={sk} className="badge burnout" style={{ fontSize: 11 }}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODULE 4: Career Timeline, Learning & Endorsements */}
              <div
                className="linkedin-viz-card"
                data-testid="viz-linkedin-career-learning"
              >
                <div className="linkedin-viz-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Briefcase size={18} color="var(--accent-sage)" />
                    <h3 style={{ fontSize: 17.5, fontWeight: 700 }}>
                      Module 4 — Career Timeline, Learning &amp; Endorsements (Positions.csv, Learning.csv, Articles/*.html)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge superpower">
                      {activeLinkedIn.career_learning.positions.length} Roles
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.career_learning.learning_total_courses} Learning Courses
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.career_learning.articles_published.length} Articles •{" "}
                      {activeLinkedIn.career_learning.rich_media_posts_count} Media Posts
                    </span>
                  </div>
                </div>

                <div className="viz-two-col" style={{ marginTop: 14 }}>
                  <div>
                    <div className="stat-label">Chronological Role &amp; Project Progression</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                      {activeLinkedIn.career_learning.positions.slice(0, 5).map((pos, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            background: "var(--bg-warm)",
                            border: "1px solid var(--border-warm)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ fontSize: 13.5 }}>
                              {pos.title} @ {pos.company}
                            </strong>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              {pos.started_on} → {pos.finished_on}
                            </span>
                          </div>
                          {pos.description && (
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--text-secondary)",
                                marginTop: 4,
                              }}
                            >
                              {pos.description.slice(0, 180)}
                              {pos.description.length > 180 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="stat-label">Most-Endorsed Skills &amp; Self-Directed Learning</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {activeLinkedIn.career_learning.top_endorsed_skills.map(([sk, cnt]) => (
                        <span key={sk} className="badge superpower">
                          <Award size={12} style={{ display: "inline", marginRight: 4 }} />
                          {sk} ({cnt})
                        </span>
                      ))}
                    </div>

                    <div className="stat-label" style={{ marginTop: 12 }}>
                      LinkedIn Learning Courses Watched ({activeLinkedIn.career_learning.learning_total_courses})
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.career_learning.recent_courses.slice(0, 6).map((course) => (
                        <span key={course} className="er-file-pill">
                          <BookOpen size={11} style={{ display: "inline", marginRight: 4 }} />
                          {course}
                        </span>
                      ))}
                    </div>

                    {activeLinkedIn.career_learning.articles_published.length > 0 && (
                      <>
                        <div className="stat-label" style={{ marginTop: 12 }}>
                          Published Thought Leadership Articles
                        </div>
                        {activeLinkedIn.career_learning.articles_published.map((art, i) => (
                          <div key={i} className="quote-box" style={{ marginTop: 6 }}>
                            <div className="quote-meta">
                              <strong>{art.title}</strong> • {art.published_date}
                            </div>
                            <div style={{ fontSize: 12 }}>{art.excerpt}</div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MODULE 5: Job Search & Positioning Funnel */}
              <div
                className="linkedin-viz-card"
                data-testid="viz-linkedin-job-funnel"
              >
                <div className="linkedin-viz-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Target size={18} color="var(--accent-sage)" />
                    <h3 style={{ fontSize: 17.5, fontWeight: 700 }}>
                      Module 5 — Job Search &amp; Positioning Funnel (Job Applications.csv, SavedJobAlerts.csv, Job Seeker Preferences.csv)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge superpower">
                      {activeLinkedIn.job_search.applications_count} Applications Submitted
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.job_search.saved_jobs_count} Saved Jobs
                    </span>
                    <span className="badge value">
                      {activeLinkedIn.job_search.saved_job_alerts.length} Active Alert Queries
                    </span>
                  </div>
                </div>

                <div className="viz-two-col" style={{ marginTop: 14 }}>
                  <div>
                    <div className="stat-label">Target Role Keywords &amp; Preferred Titles</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {activeLinkedIn.job_search.saved_job_alerts.map((kw) => (
                        <span key={kw} className="badge superpower">
                          <Search size={11} style={{ display: "inline", marginRight: 4 }} />
                          Alert: {kw}
                        </span>
                      ))}
                      {activeLinkedIn.job_search.preferred_job_titles.map((pt) => (
                        <span key={pt} className="badge value">
                          Target: {pt}
                        </span>
                      ))}
                    </div>

                    {activeLinkedIn.job_search.open_to_recruiters_statement && (
                      <div className="quote-box" style={{ marginTop: 10 }}>
                        <div className="quote-meta">Private Note to Recruiters:</div>
                        <div style={{ fontSize: 12.5 }}>
                          “{activeLinkedIn.job_search.open_to_recruiters_statement}”
                        </div>
                      </div>
                    )}

                    {activeLinkedIn.job_search.resume_versions.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div className="stat-label">Resume Assets &amp; Application Versions</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {activeLinkedIn.job_search.resume_versions.map(([resName, cnt]) => (
                            <span key={resName} className="er-file-pill">
                              {resName} ({cnt}x)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="stat-label">Recent Job Applications &amp; Saved Opportunities</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {activeLinkedIn.job_search.recent_applications.slice(0, 5).map((app, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "8px 11px",
                            borderRadius: 8,
                            background: "var(--bg-warm)",
                            border: "1px solid var(--border-warm)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            fontSize: 12.5,
                          }}
                        >
                          <span>
                            <strong>{app.job_title}</strong> @ {app.company}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            {app.applied_date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signal Category Breakdown Visualization */}
          <div
            className="linkedin-viz-card"
            style={{ marginTop: 16 }}
            data-testid="vault-signal-category-breakdown"
          >
            <div className="linkedin-viz-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={18} color="var(--accent-sage)" />
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                  Cross-Source Behavioral Signal Category Breakdown
                </h3>
              </div>
              <span className="badge superpower">
                {summary.high_signal_prompts.toLocaleString()} High-Signal Records Classified
              </span>
            </div>
            <div className="mini-bar-chart" style={{ marginTop: 10 }}>
              {(summary.category_counts ?? []).map(([cat, cnt]) => {
                const pct = Math.max(6, Math.round((cnt / totalCategoryHits) * 100));
                return (
                  <div key={cat} className="mini-bar-row">
                    <span className="mini-bar-label" style={{ minWidth: 185 }}>
                      {cat}
                    </span>
                    <div className="mini-bar-track">
                      <div className="mini-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="mini-bar-val">
                      {cnt} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Injected existing AI Prompt Visualizations: Peak Flow Rhythm, Contribution Grid, Growth Line Graph, Searchable Explorer */}
        {childrenMiddleVisuals}
      </section>

      {/* =====================================================================
          SECTION 3: WHAT IT SAYS ABOUT YOU (Self-Discovery & Synthesis)
         ===================================================================== */}
      <section
        className="insight-card"
        style={{ marginTop: 22, padding: "22px 24px" }}
        data-testid="vault-section-insights"
      >
        <span className="badge superpower">Stage 3 of 3 • Cross-Source Self-Discovery</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
          3. What It Says About You
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
          Synthesizing your private AI problem-solving, your peer recommendations, and LinkedIn’s
          algorithmic classification into three honest mirrors of who you are and where you are headed.
        </p>

        {/* Insight Card 1: The 3-Way Identity Mirror */}
        <div
          className="linkedin-viz-card"
          style={{ marginTop: 16 }}
          data-testid="insight-three-way-mirror"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              1. The 3-Way Identity Mirror: Real Self vs. Peer Vouching vs. LinkedIn Ad-Algorithm Box
            </h3>
            <span className="badge superpower">Positioning Gap Diagnosis</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
            {activeLinkedIn.three_way_mirror.synthesis_narrative}
          </p>

          <div className="three-way-mirror-grid" style={{ marginTop: 12 }}>
            <div className="mirror-pillar-col">
              <span className="badge superpower">1. Real Self &amp; Active Target Today</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "var(--text-primary)" }}>
                {activeLinkedIn.three_way_mirror.real_self_today.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mirror-pillar-col">
              <span className="badge value">2. How Peers Vouch for You</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "var(--text-primary)" }}>
                {activeLinkedIn.three_way_mirror.peer_vouching.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mirror-pillar-col">
              <span className="badge burnout">3. Where LinkedIn’s Ad Engine Boxes You</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: "var(--text-primary)" }}>
                {activeLinkedIn.three_way_mirror.ad_algorithm_box.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Insight Card 2: Relationship & Communication Signature */}
        <div
          className="linkedin-viz-card"
          style={{ marginTop: 16 }}
          data-testid="insight-relationship-signature"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              2. Relationship &amp; Communication Signature
            </h3>
            <span className="badge value">
              {activeLinkedIn.relationship_signature.sent_to_received_ratio_pct}% Outbound Cadence •{" "}
              {activeLinkedIn.relationship_signature.mentoring_recommendations_given} Peer Recs Authored
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
            {activeLinkedIn.relationship_signature.synthesis_narrative}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {activeLinkedIn.relationship_signature.communication_traits.map((trait, idx) => (
              <span key={idx} className="badge superpower">
                ✓ {trait}
              </span>
            ))}
          </div>
          {activeLinkedIn.relationship_signature.sample_outbound_opener && (
            <div className="quote-box" style={{ marginTop: 10 }}>
              <div className="quote-meta">Representative Outbound Connection Opener (Invitations.csv):</div>
              <div style={{ fontSize: 12.5 }}>
                “{activeLinkedIn.relationship_signature.sample_outbound_opener}”
              </div>
            </div>
          )}
        </div>

        {/* Insight Card 3: Curiosity & Skill Evolution */}
        <div
          className="linkedin-viz-card"
          style={{ marginTop: 16 }}
          data-testid="insight-curiosity-evolution"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>
              3. Curiosity &amp; Skill Evolution Trajectory
            </h3>
            <span className="badge superpower">Multi-Year Arc</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
            {activeLinkedIn.curiosity_evolution.synthesis_narrative}
          </p>

          <div className="three-way-mirror-grid" style={{ marginTop: 12 }}>
            <div className="mirror-pillar-col">
              <span className="badge value">Phase 1: Foundations &amp; Early Roles</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
                {activeLinkedIn.curiosity_evolution.early_foundations.map((f, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mirror-pillar-col">
              <span className="badge superpower">Phase 2: Public Voice &amp; Learning</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
                {activeLinkedIn.curiosity_evolution.public_voice_milestones.map((m, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mirror-pillar-col">
              <span className="badge superpower">Phase 3: Current Systems &amp; AI Edge</span>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
                {activeLinkedIn.curiosity_evolution.current_systems_edge.map((e, i) => (
                  <li key={i} style={{ marginBottom: 5 }}>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom CTA to Continue into Cognitive Mirror */}
        <div
          style={{
            marginTop: 20,
            padding: "16px 20px",
            borderRadius: 14,
            background: "var(--bg-warm)",
            border: "1px solid var(--border-warm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
          data-testid="vault-continue-cta-card"
        >
          <div>
            <div className="stat-label">Next Step in Your Self-Discovery Flow</div>
            <div style={{ fontWeight: 700, fontSize: 15.5, marginTop: 2 }}>
              Ready to explore your 3-Chapter Narrative Story, O*NET Career Path Matches, and 5-Year Growth Plan?
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={onContinueToMirror}
            data-testid="vault-continue-to-mirror-cta"
          >
            <ShieldCheck size={15} />
            <span>
              {isVaultEmpty
                ? "Open Cognitive Mirror (Your Profile)"
                : "Continue to Cognitive Mirror (Your Profile)"}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
};
