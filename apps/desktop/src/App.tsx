import React, { useEffect, useMemo, useRef, useState } from "react";
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
  User,
  ShieldCheck,
  Cpu,
  ExternalLink,
  Sun,
  Moon,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Bookmark,
  Settings,
  X,
} from "lucide-react";
import {
  VaultDashboardPayload,
  BatchImportReport,
  StoryChapterKey,
  UpdateCheckResult,
  WritingLevel,
  WritingLevelMode,
  getVaultDashboard,
  updateUserProfile,
  scanLocalVault,
  importFilesBatch,
  loadSampleMultiProviderVault,
  resetLocalVault,
  resetFullFactory,
  toggleQuestState,
  addJournalEntry,
  backupLocalVault,
  checkForAppUpdates,
  launchUpdateInstaller,
  formatTierLabel,
  classifySkillTierClient,
  resolveEffectiveWritingLevel,
  writingLevelLabel,
  writingLevelDescription,
  SAMPLE_MULTI_PROVIDER_EXPORT,
  parseMultiProviderClient,
} from "./vaultClient";
import { ContributionGrid } from "./ContributionGrid";
import { GrowthDailyQualityInput, GrowthLineGraph } from "./GrowthLineGraph";

type TabKey = "mirror" | "onet" | "equity" | "journal" | "vault";
type StandalonePageKey = "none" | "zero-knowledge" | "how-ai-works";
type StoryFilterMode = StoryChapterKey | "all";

const TAB_ORDER: TabKey[] = ["mirror", "onet", "equity", "journal", "vault"];

const SOCRATIC_PROMPTS = [
  "Which task this week gave you energy and focus, and which task felt like draining busywork?",
  "If you picked just 3 main priorities for the next 30 days—one core project, one skill to practice, and one curiosity topic—what would you pause?",
  "Where are you giving yourself too little credit for organizing messy problems or making work easier for others?",
  "What is one helpful checklist, template, or project you could build this month to make your work easier next month?",
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

const STORY_CHAPTERS: Array<{
  key: StoryChapterKey;
  stepNum: number;
  label: string;
  headline: string;
  description: string;
}> = [
  {
    key: "excel",
    stepNum: 1,
    label: "1. Where You Currently Excel",
    headline: "Chapter 1 — Where You Currently Excel (Demonstrated Superpowers)",
    description:
      "Synthesized from your recurring problem-solving patterns: where you naturally build leverage, translate complexity into human value, and enter effortless flow.",
  },
  {
    key: "grow",
    stepNum: 2,
    label: "2. Where We Think You Could Grow",
    headline: "Chapter 2 — Where We Think You Could Grow (Calibrated Next-Level Edge)",
    description:
      "Honest, zero-flattery seniority calibration: where testing your assumptions, showing measurable real-world results, and protecting your core values will unlock your next tier.",
  },
  {
    key: "friction",
    stepNum: 3,
    label: "3. What Is Causing You Friction",
    headline: "Chapter 3 — What Is Causing You Friction (Burnout & Maintenance Traps)",
    description:
      "Early warning signals extracted from your prompts: where repetitive manual maintenance, context-switching, or unleveraged chores drain your energy.",
  },
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

function formatHour12(h: number): string {
  const normalized = ((h % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized < 12) return `${normalized} AM`;
  if (normalized === 12) return "12 PM";
  return `${normalized - 12} PM`;
}

function formatHour12Compact(h: number): string {
  const normalized = ((h % 24) + 24) % 24;
  if (normalized === 0) return "12a";
  if (normalized < 12) return `${normalized}a`;
  if (normalized === 12) return "12p";
  return `${normalized - 12}p`;
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
  const pct = Math.round((bestSum / total) * 100);
  return {
    windowLabel: `${formatHour12(bestStart)} – ${formatHour12(endHr)}`,
    shareSub: `${pct}% of timestamped prompts in this 4h block`,
  };
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "CS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("mirror");
  const [standalonePage, setStandalonePage] = useState<StandalonePageKey>("none");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [data, setData] = useState<VaultDashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState<number>(0);
  const [journalText, setJournalText] = useState<string>("");
  const [mood, setMood] = useState<string>("Energized & Clear");
  const [importStatus, setImportStatus] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [lastImportReport, setLastImportReport] = useState<BatchImportReport | null>(null);

  // Step 1 Profile Onboarding & Edit state
  const [profileNameDraft, setProfileNameDraft] = useState<string>("");
  const [profileAvatarDraft, setProfileAvatarDraft] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>("");

  // Step 3 Story Chapter Stepper state
  const [activeStoryChapter, setActiveStoryChapter] = useState<StoryFilterMode>("excel");
  const [visitedChapters, setVisitedChapters] = useState<Set<StoryChapterKey>>(
    () => new Set(["excel"])
  );

  // Interactive Prompt Explorer state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");

  // App Update & Schema Migration state
  const [updateCheckResult, setUpdateCheckResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<string>("");

  // Interactive Zero-Knowledge Live Scrubber Demo inside Standalone View
  const [zkDemoInput, setZkDemoInput] = useState<string>(
    "Reach me at alex.rivera@company.io or 415-890-2341 (OpenAI key sk-proj-98a7b6c5d4e3f2a1b2c3d4e5f6a7b8c9) at C:\\Users\\alex\\projects\\vault\\main.rs: how do we architect a deterministic SQLite pipeline?"
  );

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getVaultDashboard();
      setData(res);
      if (res.profile?.name) {
        setProfileNameDraft(res.profile.name);
        setProfileAvatarDraft(res.profile.avatar_data_url ?? null);
      }
      const theme = res.profile?.theme_mode === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      const metaScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
      if (metaScheme) metaScheme.content = theme;
    } catch (err) {
      console.error("Failed to load local vault dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const settingsCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasSettingsOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isSettingsOpen) {
      wasSettingsOpenRef.current = true;
      settingsCloseBtnRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsSettingsOpen(false);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    } else if (wasSettingsOpenRef.current) {
      wasSettingsOpenRef.current = false;
      if (!isEditingProfile) settingsTriggerRef.current?.focus();
    }
  }, [isSettingsOpen, isEditingProfile]);

  const appTheme: "light" | "dark" = data?.profile?.theme_mode === "dark" ? "dark" : "light";

  const handleToggleTheme = async () => {
    if (!data) return;
    const nextTheme: "light" | "dark" = appTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    const metaScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (metaScheme) metaScheme.content = nextTheme;
    const updatedProfile = await updateUserProfile({ theme_mode: nextTheme });
    setData({ ...data, profile: updatedProfile });
  };

  const handleProfileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileAvatarDraft(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfileStep1 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = profileNameDraft.trim();
    if (!trimmed) {
      setProfileError("Please enter your name to personalize your local vault.");
      return;
    }
    setProfileError("");
    const updatedProfile = await updateUserProfile({
      name: trimmed,
      avatar_data_url: profileAvatarDraft,
    });
    if (data) {
      setData({ ...data, profile: updatedProfile });
    }
    setIsEditingProfile(false);
  };

  const isVaultEmpty = Boolean(data && data.summary.clean_prompts_kept === 0);
  const hasProfileName = Boolean(data?.profile?.name && data.profile.name.trim().length > 0);
  const acceptedQuests = data?.quests.filter((q) => q.accepted) ?? [];
  const completedQuests = data?.quests.filter((q) => q.completed) ?? [];

  // Progressive dependent feature unlocking rules:
  // - Step 1: Profile Name
  // - Step 2: Upload Data (unlocks Mirror + Local Vault)
  // - Step 3: Complete Mirror Story (or view all chapters) -> unlocks O*NET Path Finder
  // - Step 4: Explore / Shortlist an O*NET role -> unlocks 5-Year Equity & Quests
  // - Step 5: Accept >= 1 Quest -> unlocks Reflective Journal
  const isMirrorUnlocked = !isVaultEmpty;
  const isVaultUnlocked = !isVaultEmpty;
  const isOnetUnlocked =
    !isVaultEmpty &&
    Boolean(
      data?.profile?.mirror_story_completed ||
        visitedChapters.size >= 3 ||
        activeStoryChapter === "all" ||
        (data?.profile?.shortlisted_onet_codes?.length ?? 0) > 0 ||
        acceptedQuests.length > 0
    );
  const isEquityUnlocked =
    !isVaultEmpty &&
    Boolean(
      (data?.profile?.shortlisted_onet_codes?.length ?? 0) > 0 ||
        acceptedQuests.length > 0 ||
        completedQuests.length > 0
    );
  const isJournalUnlocked =
    !isVaultEmpty &&
    Boolean(
      acceptedQuests.length > 0 ||
        completedQuests.length > 0 ||
        (data?.journals?.length ?? 0) > 0
    );

  const isTabUnlocked = (tab: TabKey): boolean => {
    switch (tab) {
      case "mirror":
        return isMirrorUnlocked;
      case "vault":
        return isVaultUnlocked;
      case "onet":
        return isOnetUnlocked;
      case "equity":
        return isEquityUnlocked;
      case "journal":
        return isJournalUnlocked;
    }
  };

  const unlockedTabOrder = TAB_ORDER.filter((t) => isTabUnlocked(t));

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const activeList = unlockedTabOrder.length > 0 ? unlockedTabOrder : TAB_ORDER;
    const currentIndex = activeList.indexOf(activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % activeList.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + activeList.length) % activeList.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = activeList.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = activeList[nextIndex];
      setStandalonePage("none");
      setActiveTab(nextTab);
      const nextBtn = document.getElementById(`tab-${nextTab}`);
      nextBtn?.focus();
    }
  };

  const handleSelectStoryChapter = async (mode: StoryFilterMode) => {
    setActiveStoryChapter(mode);
    if (mode === "all") {
      const nextVisited = new Set<StoryChapterKey>(["excel", "grow", "friction"]);
      setVisitedChapters(nextVisited);
      if (data && !data.profile.mirror_story_completed) {
        const updatedProfile = await updateUserProfile({ mirror_story_completed: true });
        setData({ ...data, profile: updatedProfile });
      }
      return;
    }
    const nextVisited = new Set(visitedChapters);
    nextVisited.add(mode);
    setVisitedChapters(nextVisited);
    if (nextVisited.size >= 3 && data && !data.profile.mirror_story_completed) {
      const updatedProfile = await updateUserProfile({ mirror_story_completed: true });
      setData({ ...data, profile: updatedProfile });
    }
  };

  const handleUnlockOnetFromMirror = async () => {
    if (data) {
      const updatedProfile = await updateUserProfile({ mirror_story_completed: true });
      setData({ ...data, profile: updatedProfile });
    }
    setStandalonePage("none");
    setActiveTab("onet");
  };

  const handleShortlistOnetRole = async (onetCode: string, goToEquity = false) => {
    if (!data) return;
    const existing = new Set(data.profile.shortlisted_onet_codes ?? []);
    if (existing.has(onetCode) && !goToEquity) {
      existing.delete(onetCode);
    } else {
      existing.add(onetCode);
    }
    const updatedProfile = await updateUserProfile({
      mirror_story_completed: true,
      shortlisted_onet_codes: Array.from(existing),
    });
    setData({ ...data, profile: updatedProfile });
    if (goToEquity) {
      setStandalonePage("none");
      setActiveTab("equity");
    }
  };

  const handleScanLocal = async () => {
    setIsImporting(true);
    setImportStatus("Scanning local Antigravity prompt logs & scrubbing PII…");
    try {
      const res = await scanLocalVault();
      setData(res);
      const s = res.summary;
      setLastImportReport({
        timestamp_iso: new Date().toISOString(),
        files_processed: s.total_files_scanned,
        total_raw_scanned: s.total_raw_prompts,
        total_clean_kept: s.clean_prompts_kept,
        total_new_added: s.clean_prompts_kept,
        total_noise_filtered: s.noise_filtered_out,
        total_duplicates_skipped: s.duplicates_removed,
        total_redactions: s.total_redactions,
        file_reports: [
          {
            file_name: "Antigravity Local Prompt Logs",
            status: s.clean_prompts_kept > 0 ? "imported" : "empty",
            detected_format: "Antigravity Local Workspace",
            raw_prompts_scanned: s.total_raw_prompts,
            clean_prompts_kept: s.clean_prompts_kept,
            new_prompts_added: s.clean_prompts_kept,
            noise_filtered_out: s.noise_filtered_out,
            duplicates_removed: s.duplicates_removed,
            redactions_made: s.total_redactions,
            sources: (s.source_counts ?? []).map(([label]) => label),
            warnings: s.warnings ?? [],
            manifest_links: [],
          },
        ],
      });
      setImportStatus(
        `Scanned & merged local vault: ${s.clean_prompts_kept.toLocaleString()} clean prompts ready (${s.total_redactions} PII redactions).`
      );
      setActiveTab("mirror");
    } catch (err) {
      setImportStatus(`Local scan error: ${String(err)}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadSample = async () => {
    setIsImporting(true);
    setImportStatus("Loading & scrubbing multi-provider sample archive…");
    try {
      if (data && !data.profile.name.trim()) {
        await updateUserProfile({ name: profileNameDraft.trim() || "Explorer" });
      }
      const res = await loadSampleMultiProviderVault();
      const updatedProfile = await updateUserProfile({
        name: res.profile.name.trim() || profileNameDraft.trim() || "Explorer",
        mirror_story_completed: true,
        shortlisted_onet_codes: ["15-1252.00"],
      });
      setData({ ...res, profile: updatedProfile });
      const sampleParsed = parseMultiProviderClient(SAMPLE_MULTI_PROVIDER_EXPORT);
      const s = sampleParsed.summary;
      setLastImportReport({
        timestamp_iso: new Date().toISOString(),
        files_processed: 1,
        total_raw_scanned: s.total_raw_prompts,
        total_clean_kept: s.clean_prompts_kept,
        total_new_added: s.clean_prompts_kept,
        total_noise_filtered: s.noise_filtered_out,
        total_duplicates_skipped: s.duplicates_removed,
        total_redactions: s.total_redactions,
        file_reports: [
          {
            file_name: "sample-multi-provider-vault.json",
            status: "imported",
            detected_format: "Multi-Provider Conversations JSON (OpenAI + Claude + Gemini)",
            raw_prompts_scanned: s.total_raw_prompts,
            clean_prompts_kept: s.clean_prompts_kept,
            new_prompts_added: s.clean_prompts_kept,
            noise_filtered_out: s.noise_filtered_out,
            duplicates_removed: s.duplicates_removed,
            redactions_made: s.total_redactions,
            sources: (s.source_counts ?? []).map(([label]) => label),
            warnings: [],
            manifest_links: [],
          },
        ],
      });
      setImportStatus(
        `Loaded multi-provider sample vault (${res.summary.clean_prompts_kept} prompts across OpenAI, Anthropic & Gemini).`
      );
      setActiveTab("mirror");
    } catch (err) {
      setImportStatus(`Sample load error: ${String(err)}`);
    } finally {
      setIsImporting(false);
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
      setLastImportReport(null);
      setVisitedChapters(new Set(["excel"]));
      setActiveStoryChapter("excel");
      setActiveTab("mirror");
      setStandalonePage("none");
      setImportStatus("Local vault cleared. Your profile is preserved—ready for fresh data upload.");
    } catch (err) {
      setImportStatus(`Reset error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFullFactoryReset = async () => {
    setLoading(true);
    try {
      const res = await resetFullFactory();
      setData(res);
      setProfileNameDraft("");
      setProfileAvatarDraft(null);
      setIsEditingProfile(false);
      setSearchQuery("");
      setSelectedSource("ALL");
      setSelectedCategory("All Categories");
      setLastImportReport(null);
      setVisitedChapters(new Set(["excel"]));
      setActiveStoryChapter("excel");
      setActiveTab("mirror");
      setStandalonePage("none");
      setImportStatus("");
    } catch (err) {
      setImportStatus(`Factory reset error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const installedVer = data?.update_status?.installed_version ?? "0.4.0";
      const schemaVer = data?.update_status?.schema_version ?? 4;
      const result = await checkForAppUpdates(installedVer, schemaVer);
      setUpdateCheckResult(result);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateCheckResult) return;
    try {
      const msg = await launchUpdateInstaller(
        updateCheckResult.latest_version,
        updateCheckResult.download_url
      );
      setBackupNotice(msg);
    } catch (err) {
      setBackupNotice(`Update installer error: ${String(err)}`);
    }
  };

  const handleBackupVault = async () => {
    const status = await backupLocalVault();
    if (data) {
      setData({ ...data, update_status: status });
    }
    setBackupNotice(
      `Vault backup verified at ${status.last_backup_path ?? "clearspace_vault.db.bak-v3"} (Schema v${status.schema_version}).`
    );
  };

  const handleSelectWritingLevelMode = async (mode: WritingLevelMode) => {
    if (!data) return;
    await updateUserProfile({ writing_level_mode: mode });
    const refreshed = await getVaultDashboard();
    setData(refreshed);
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
    const fileArray = Array.from(files);
    setIsImporting(true);
    setImportStatus(`Parsing & scrubbing ${fileArray.length} file(s) locally…`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (data && !data.profile.name.trim()) {
        await updateUserProfile({ name: profileNameDraft.trim() || "Explorer" });
      }
      const { report, dashboard } = await importFilesBatch(fileArray);
      setData(dashboard);
      setLastImportReport(report);

      const errorCount = report.file_reports.filter((r) => r.status === "error").length;
      const manifestCount = report.file_reports.filter((r) => r.status === "manifest_ready").length;
      const emptyCount = report.file_reports.filter((r) => r.status === "empty").length;

      if (manifestCount > 0 && report.total_clean_kept === 0) {
        // Automatically open the primary conversations archive link if available so the user doesn't feel stuck in a 2-step error
        const allLinks = report.file_reports.flatMap((r) => r.manifest_links);
        const primaryConvLink =
          allLinks.find((l) => l.category === "conversations") ?? allLinks[0];
        if (primaryConvLink?.export_url) {
          try {
            window.open(primaryConvLink.export_url, "_blank", "noopener,noreferrer");
          } catch {
            // ignore popup blocker in headless environments
          }
        }
        setImportStatus(
          `Step 1 of 2 Complete: Claude Export Index read! Click the green button below to grab ${primaryConvLink?.filename ?? "conversations-000.zip"} and drop it here.`
        );
      } else if (errorCount > 0 && report.total_clean_kept === 0) {
        setImportStatus(
          `Import error across ${errorCount} file(s): see per-file diagnostics below.`
        );
      } else {
        const noticeCount = errorCount + emptyCount;
        const issueNote =
          noticeCount > 0
            ? ` • ${noticeCount} file(s) flagged with notices below.`
            : "";
        setImportStatus(
          `Imported ${report.total_clean_kept.toLocaleString()} clean prompts (+${report.total_new_added.toLocaleString()} net-new) from ${report.files_processed} file(s) (${report.total_redactions.toLocaleString()} PII redactions made locally)${issueNote}`
        );
      }
    } catch (err) {
      setImportStatus(`Import error: ${String(err)}`);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const totalAvailableQuestPoints =
    data?.quests.reduce((acc, q) => acc + q.equity_points, 0) ?? 2600;
  const committedQuestPoints = acceptedQuests.reduce((acc, q) => acc + q.equity_points, 0);

  const equityProgressPct = Math.min(
    100,
    Math.round((committedQuestPoints / Math.max(totalAvailableQuestPoints, 1)) * 100)
  );

  const maxHourCount = data ? Math.max(...data.summary.hourly_distribution, 1) : 1;
  const peakInfo = data
    ? computePeakWindowLabel(data.summary.hourly_distribution)
    : { windowLabel: "Awaiting Data", shareSub: "" };

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

  const filteredStoryCards = useMemo(() => {
    const cards = data?.mirror_cards ?? [];
    if (activeStoryChapter === "all") return cards;
    return cards.filter((c) => (c.story_chapter ?? "excel") === activeStoryChapter);
  }, [data?.mirror_cards, activeStoryChapter]);

  const zkDemoScrubbed = useMemo(() => {
    let text = zkDemoInput;
    let redactions = 0;
    const rules: Array<[RegExp, string]> = [
      [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]"],
      [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
      [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "[REDACTED_PHONE]"],
      [/[A-Za-z]:\\(?:Users|home)\\[^\s?,"']+/g, "[REDACTED_LOCAL_PATH]"],
    ];
    for (const [rx, token] of rules) {
      text = text.replace(rx, () => {
        redactions += 1;
        return token;
      });
    }
    return { text, redactions };
  }, [zkDemoInput]);

  const measuredWritingLevel: WritingLevel =
    data?.summary?.writing_level?.measured_level ?? "everyday";
  const activeWritingLevelMode: WritingLevelMode =
    data?.profile?.writing_level_mode ?? "auto";
  const effectiveWritingLevel: WritingLevel = resolveEffectiveWritingLevel(
    activeWritingLevelMode,
    measuredWritingLevel
  );
  const writingStyleShortBand =
    effectiveWritingLevel === "everyday"
      ? "Everyday"
      : effectiveWritingLevel === "professional"
      ? "Professional"
      : "Technical";

  const renderWritingLevelSwitcherCard = () => {
    if (!data) return null;
    const wl = data.summary.writing_level;
    return (
      <div
        className="insight-card"
        style={{ marginTop: 18, padding: "16px 20px" }}
        data-testid="writing-level-card"
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
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="badge superpower" data-testid="writing-level-active-badge">
                Active Writing Style: {writingLevelLabel(effectiveWritingLevel)} (
                {activeWritingLevelMode === "auto" ? "Auto-Matched" : "Custom Override"})
              </span>
              {wl && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                  }}
                  data-testid="writing-level-metrics-summary"
                >
                  Measured: {wl.level_label} • Grade {wl.flesch_kincaid_grade.toFixed(1)} •{" "}
                  {wl.avg_words_per_sentence.toFixed(1)} words/sentence •{" "}
                  {wl.jargon_density_pct.toFixed(1)}% complex terms
                </span>
              )}
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
              {writingLevelDescription(effectiveWritingLevel)} Switch modes anytime to adjust how Clearspace explains your strengths, career matches, and next steps.
            </p>
          </div>

          <div
            role="group"
            aria-label="Writing level and explanation style"
            style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
          >
            <button
              type="button"
              className={`btn-outline ${activeWritingLevelMode === "auto" ? "active" : ""}`}
              style={{ padding: "6px 11px", fontSize: 12 }}
              aria-pressed={activeWritingLevelMode === "auto"}
              onClick={() => handleSelectWritingLevelMode("auto")}
              data-testid="writing-mode-auto"
            >
              Auto (Matched to You)
            </button>
            <button
              type="button"
              className={`btn-outline ${activeWritingLevelMode === "everyday" ? "active" : ""}`}
              style={{ padding: "6px 11px", fontSize: 12 }}
              aria-pressed={activeWritingLevelMode === "everyday"}
              onClick={() => handleSelectWritingLevelMode("everyday")}
              data-testid="writing-mode-everyday"
            >
              Everyday
            </button>
            <button
              type="button"
              className={`btn-outline ${activeWritingLevelMode === "professional" ? "active" : ""}`}
              style={{ padding: "6px 11px", fontSize: 12 }}
              aria-pressed={activeWritingLevelMode === "professional"}
              onClick={() => handleSelectWritingLevelMode("professional")}
              data-testid="writing-mode-professional"
            >
              Professional
            </button>
            <button
              type="button"
              className={`btn-outline ${activeWritingLevelMode === "technical" ? "active" : ""}`}
              style={{ padding: "6px 11px", fontSize: 12 }}
              aria-pressed={activeWritingLevelMode === "technical"}
              onClick={() => handleSelectWritingLevelMode("technical")}
              data-testid="writing-mode-technical"
            >
              Technical
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPeakFlowRhythmCard = () => {
    if (!data) return null;
    return (
      <div
        className="insight-card"
        style={{ marginTop: 18, padding: "18px 22px" }}
        data-testid="peak-flow-rhythm-card"
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
            <span className="badge superpower">Peak Flow Windows</span>
            <h3 style={{ fontSize: 19, marginTop: 6 }}>
              Your Deep-Flow Window: <strong>{peakInfo.windowLabel}</strong>
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 2 }}>
              {peakInfo.shareSub}. Protect these hours for high-leverage architecture and creative problem-solving.
            </p>
          </div>
        </div>

        <div className="hour-bars" style={{ height: 92, marginTop: 12 }}>
          {data.summary.hourly_distribution.map((count, hr) => {
            const heightPct = Math.round((count / maxHourCount) * 100);
            return (
              <div key={hr} className="hour-col" title={`${formatHour12(hr)} — ${count} prompts`}>
                <div className="hour-bar" style={{ height: `${Math.max(heightPct, 4)}%` }} />
                <span className="hour-label">{formatHour12Compact(hr)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProviderGuideSteps = () => (
    <div className="provider-grid onboarding-grid">
      <div className="provider-step">
        <div className="provider-step-header">
          <FileJson size={16} color="var(--accent-sage)" />
          <strong>1. OpenAI ChatGPT</strong>
        </div>
        <p>
          Open Data Controls and request your export archive. Upload <code>conversations.json</code>,{" "}
          <code>chat.html</code>, or the entire exported <code>.zip</code> directly without unzipping.
        </p>
        <div className="provider-action-row">
          <a
            href="https://chatgpt.com/#settings/DataControls"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{ textDecoration: "none", fontSize: 12, padding: "5px 10px" }}
            data-testid="provider-link-openai"
          >
            <ExternalLink size={13} />
            <span>Open ChatGPT Export Page ↗</span>
          </a>
        </div>
      </div>

      <div className="provider-step">
        <div className="provider-step-header">
          <FileJson size={16} color="var(--accent-sage)" />
          <strong>2. Anthropic Claude</strong>
        </div>
        <p>
          Open Claude Account Settings → Export Data. Drop <code>conversations-000.zip</code>,{" "}
          <code>conversations.json</code>, or your <code>manifest-*.json</code> index file and Clearspace handles the rest.
        </p>
        <div className="provider-action-row">
          <a
            href="https://claude.ai/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{ textDecoration: "none", fontSize: 12, padding: "5px 10px" }}
            data-testid="provider-link-claude"
          >
            <ExternalLink size={13} />
            <span>Open Claude Export Settings ↗</span>
          </a>
        </div>
      </div>

      <div className="provider-step">
        <div className="provider-step-header">
          <Layers size={16} color="var(--accent-sage)" />
          <strong>3. Google Gemini Takeout</strong>
        </div>
        <p>
          Select <strong>My Activity → Gemini Apps</strong> or <strong>Gemini in Workspace</strong> in Google Takeout and drop the <code>takeout-*.zip</code> or <code>MyActivity.json</code> directly.
        </p>
        <div className="provider-action-row">
          <a
            href="https://takeout.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
            style={{ textDecoration: "none", fontSize: 12, padding: "5px 10px" }}
            data-testid="provider-link-gemini"
          >
            <ExternalLink size={13} />
            <span>Open Google Takeout ↗</span>
          </a>
        </div>
      </div>

      <div className="provider-step">
        <div className="provider-step-header">
          <FileText size={16} color="var(--accent-sage)" />
          <strong>4. Markdown, Notes & Local Logs</strong>
        </div>
        <p>
          Drop local <code>.md</code> / <code>.txt</code> journals, YAML frontmatter notes, or click{" "}
          <strong>Scan Local Antigravity Prompts</strong> above for instant 1-click ingestion.
        </p>
      </div>
    </div>
  );

  const renderImportSummaryPanel = (compactVaultHeader = false) => {
    if (!isImporting && !lastImportReport && !importStatus) {
      return null;
    }

    if (isImporting) {
      return (
        <div
          className="import-summary-panel"
          role="status"
          aria-live="polite"
          data-testid="import-summary-panel"
        >
          <div className="import-summary-header">
            <div className="import-summary-title">
              <RefreshCw size={16} className="spin-icon" color="var(--accent-sage)" />
              <span>Processing Local Vault Import…</span>
            </div>
            <span className="badge superpower">100% On-Device Scrubber Active</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
            {importStatus ||
              "Parsing multi-provider records, stripping system noise, and redacting PII locally…"}
          </p>
        </div>
      );
    }

    if (!lastImportReport) {
      return importStatus ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--accent-sage)",
            fontWeight: 600,
            width: "100%",
            marginTop: 6,
          }}
          role="status"
          aria-live="polite"
        >
          {importStatus}
        </div>
      ) : null;
    }

    // Only real parse errors or empty files count as issues; manifest_ready is a positive green continuation step
    const hasErrors = lastImportReport.file_reports.some((r) => r.status === "error");

    const renderFileRows = () => (
      <div className="import-file-list" data-testid="import-file-list">
        {lastImportReport.file_reports.map((fr, idx) => (
          <div key={`${fr.file_name}-${idx}`} className={`import-file-row status-${fr.status}`}>
            <div className="import-file-top">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{fr.file_name}</strong>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  [{fr.detected_format}]
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {fr.status === "imported" && (
                  <span className="badge superpower">
                    ✓ Imported (+{fr.new_prompts_added.toLocaleString()} new /{" "}
                    {fr.clean_prompts_kept.toLocaleString()} valid)
                  </span>
                )}
                {fr.status === "manifest_ready" && (
                  <span className="badge superpower" data-testid="manifest-ready-badge">
                    ✓ Step 1 of 2 Complete: Ready to Download Conversations
                  </span>
                )}
                {fr.status === "empty" && <span className="badge value">Notice: 0 Prompts Kept</span>}
                {fr.status === "error" && <span className="badge burnout">✕ Parse Error</span>}
              </div>
            </div>

            {fr.status !== "manifest_ready" && (
              <div className="import-file-metrics">
                Raw scanned: {fr.raw_prompts_scanned.toLocaleString()} • Clean kept:{" "}
                {fr.clean_prompts_kept.toLocaleString()} • Net-new added: +
                {fr.new_prompts_added.toLocaleString()} • Short/system noise filtered:{" "}
                {fr.noise_filtered_out.toLocaleString()} • Duplicates skipped:{" "}
                {fr.duplicates_removed.toLocaleString()} • PII redacted:{" "}
                {fr.redactions_made.toLocaleString()}
                {fr.sources.length > 0 ? ` • Source: ${fr.sources.join(", ")}` : ""}
              </div>
            )}

            {fr.error_message && (
              <div className="import-warning-box" role="alert">
                <strong>Error:</strong> {fr.error_message}
              </div>
            )}

            {fr.manifest_links.length > 0 && (
              <div className="manifest-continuation-card" data-testid="manifest-continuation-card">
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--accent-sage)" }}>
                  ✓ Claude Export Index Verified ({fr.manifest_links.length} archive links extracted)
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                  Anthropic sends a lightweight index file first. Click the green button below to download your{" "}
                  <strong>conversations-000.zip</strong> archive from your browser session, then drop that{" "}
                  <code>.zip</code> right into Clearspace:
                </p>
                <div className="manifest-links-row" style={{ marginTop: 10 }}>
                  {[...fr.manifest_links]
                    .sort((a, b) => {
                      const priority = (cat: string) =>
                        cat === "conversations" ? 0 : cat === "projects" ? 1 : 2;
                      return priority(a.category) - priority(b.category);
                    })
                    .map((link, lIdx) => (
                      <div key={lIdx} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <a
                          href={link.export_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="manifest-download-link"
                        >
                          <span>
                            ↓ 1-Click Download {link.filename} ({link.category}
                            {link.size_bytes > 0 ? `, ${link.size_bytes.toLocaleString()} B` : ""})
                          </span>
                        </a>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: "4px 9px", fontSize: 11 }}
                          onClick={() => {
                            void navigator.clipboard?.writeText(link.export_url);
                            setImportStatus(
                              `Copied download link for ${link.filename} — paste into the browser where you are signed into claude.ai.`
                            );
                          }}
                          title={`Copy ${link.filename} download URL to clipboard`}
                        >
                          Copy Direct Link
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {fr.status !== "manifest_ready" &&
              fr.warnings.map((w, wIdx) => (
                <div key={wIdx} className="import-warning-box">
                  {w}
                </div>
              ))}
          </div>
        ))}
      </div>
    );

    return (
      <div
        className={`import-summary-panel ${hasErrors ? "has-issues" : ""}`}
        role="status"
        aria-live="polite"
        data-testid="import-summary-panel"
        style={compactVaultHeader ? { marginTop: 8, padding: "10px 14px", width: "100%" } : undefined}
      >
        <div className="import-summary-header">
          <div className="import-summary-title">
            {hasErrors ? (
              <AlertTriangle size={16} color="var(--accent-terracotta)" />
            ) : (
              <CheckCircle2 size={16} color="var(--accent-sage)" />
            )}
            <span>
              Import Summary & Status Report ({lastImportReport.files_processed}{" "}
              {lastImportReport.files_processed === 1 ? "file" : "files"} processed)
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge ${hasErrors ? "burnout" : "superpower"}`}>
              +{lastImportReport.total_new_added.toLocaleString()} Net-New Prompts Added
            </span>
            <button
              type="button"
              className="btn-outline"
              style={{ padding: "3px 9px", fontSize: 11.5 }}
              onClick={() => {
                setLastImportReport(null);
                setImportStatus("");
              }}
            >
              Dismiss Report
            </button>
          </div>
        </div>

        {importStatus && (
          <div
            style={{
              fontSize: 12.5,
              color: hasErrors ? "var(--accent-terracotta)" : "var(--accent-sage)",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {importStatus}
          </div>
        )}

        <div className="import-funnel-strip">
          <span className="import-funnel-pill">
            Raw Scanned: <strong>{lastImportReport.total_raw_scanned.toLocaleString()}</strong>
          </span>
          <span className="import-funnel-pill">
            Clean Kept: <strong>{lastImportReport.total_clean_kept.toLocaleString()}</strong>
          </span>
          <span className="import-funnel-pill">
            Net-New Merged: <strong>+{lastImportReport.total_new_added.toLocaleString()}</strong>
          </span>
          <span className="import-funnel-pill">
            Noise Filtered: <strong>{lastImportReport.total_noise_filtered.toLocaleString()}</strong>
          </span>
          <span className="import-funnel-pill">
            Duplicates Skipped:{" "}
            <strong>{lastImportReport.total_duplicates_skipped.toLocaleString()}</strong>
          </span>
          <span className="import-funnel-pill">
            PII Redacted: <strong>{lastImportReport.total_redactions.toLocaleString()}</strong>
          </span>
        </div>

        {compactVaultHeader && !hasErrors ? (
          <details style={{ marginTop: 8 }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--accent-sage)",
              }}
            >
              Inspect Per-File Status & Format Breakdown ({lastImportReport.file_reports.length}{" "}
              {lastImportReport.file_reports.length === 1 ? "file" : "files"})
            </summary>
            {renderFileRows()}
          </details>
        ) : (
          renderFileRows()
        )}
      </div>
    );
  };

  const renderStandaloneZeroKnowledgePage = () => (
    <div className="insight-card" data-testid="standalone-zero-knowledge-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="badge superpower">
          <ShieldCheck size={14} />
          <span>Standalone Privacy Architecture Brief</span>
        </span>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setStandalonePage("none")}
          data-testid="btn-close-standalone"
        >
          <ArrowLeft size={14} />
          <span>Back to {isVaultEmpty ? "Onboarding" : "Workspace"}</span>
        </button>
      </div>

      <h1 className="page-title" style={{ marginTop: 12 }}>
        What “Zero-Knowledge” Means in Clearspace
      </h1>
      <p className="page-lead">
        Most people rightly distrust uploading years of personal AI conversations to yet another cloud wrapper.
        Clearspace is architected from the ground up so <strong>we cannot see, read, or monetize your data—even if we wanted to</strong>.
      </p>

      <div className="provider-grid" style={{ marginTop: 20 }}>
        <div className="provider-step">
          <div className="provider-step-header">
            <Lock size={16} color="var(--accent-sage)" />
            <strong>1. Zero Cloud Servers or Telemetry</strong>
          </div>
          <p>
            When you drop an OpenAI, Claude, or Gemini archive into Clearspace, the file bytes are parsed in memory on your local CPU and written strictly to your local SQLite database (<code>clearspace_vault.db</code>). Zero bytes are transmitted over the network.
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <ShieldCheck size={16} color="var(--accent-sage)" />
            <strong>2. Deterministic Local PII Scrubber</strong>
          </div>
          <p>
            Before a single prompt is stored on your disk, our deterministic Rust/TypeScript regex scrubber strips API keys (<code>sk-...</code>, <code>ghp_...</code>), emails, phone numbers, SSNs, and local filesystem paths.
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <Database size={16} color="var(--accent-sage)" />
            <strong>3. Assistant Replies Are Discarded</strong>
          </div>
          <p>
            Clearspace only analyzes <strong>your</strong> first-person human prompts and inquiries—never verbose AI boilerplate or third-party code dumps.
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <Trash2 size={16} color="var(--accent-sage)" />
            <strong>4. Instant 1-Click Cryptographic Wipe</strong>
          </div>
          <p>
            You own the SQLite file on your machine. Clicking <em>Reset / Clear Vault</em> immediately purges all ingested records from local storage.
          </p>
        </div>
      </div>

      <div className="insight-card" style={{ marginTop: 20, background: "var(--bg-warm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <strong>Interactive On-Device Scrubber Proof</strong>
          <span className="badge superpower">
            {zkDemoScrubbed.redactions} PII / Secret Token(s) Redacted Live
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Type or paste any text with fake emails, phone numbers, API keys, or file paths below to see how Clearspace scrubs it before storage:
        </p>
        <textarea
          className="textarea-journal"
          style={{ minHeight: 74, marginTop: 8, background: "var(--bg-card)" }}
          value={zkDemoInput}
          onChange={(e) => setZkDemoInput(e.target.value)}
          aria-label="Test PII scrubber input"
        />
        <div className="quote-box" style={{ marginTop: 10, background: "var(--bg-card)" }}>
          <div className="quote-meta">Stored in Local SQLite Vault After Redaction:</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{zkDemoScrubbed.text}</div>
        </div>
      </div>
    </div>
  );

  const renderStandaloneHowAiWorksPage = () => (
    <div className="insight-card" data-testid="standalone-how-ai-works-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="badge superpower">
          <Cpu size={14} />
          <span>Standalone Methodology & AI Transparency Brief</span>
        </span>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setStandalonePage("none")}
          data-testid="btn-close-standalone"
        >
          <ArrowLeft size={14} />
          <span>Back to {isVaultEmpty ? "Onboarding" : "Workspace"}</span>
        </button>
      </div>

      <h1 className="page-title" style={{ marginTop: 12 }}>
        How Clearspace Uses AI & Deterministic Behavioral Scoring
      </h1>
      <p className="page-lead">
        Instead of sending your private thoughts to a black-box cloud LLM that flatters your ego, Clearspace uses{" "}
        <strong>deterministic local behavioral analysis</strong> on the AI prompts you have already written.
      </p>

      <div className="provider-grid" style={{ marginTop: 20 }}>
        <div className="provider-step">
          <div className="provider-step-header">
            <Sparkles size={16} color="var(--accent-sage)" />
            <strong>1. Your Prompts Are Your Unmasked Behavioral Graph</strong>
          </div>
          <p>
            Resumes show who you had to be for past employers. Your AI prompt archives across ChatGPT, Claude, and Gemini reveal what problems you voluntarily solve, when your mind enters deep flow, and what repetitive tasks drain you.
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <Cpu size={16} color="var(--accent-sage)" />
            <strong>2. Zero Ego-Inflation Depth Rubric</strong>
          </div>
          <p>
            Every prompt is scored deterministically by demonstrated engineering & strategic depth:
            <br />• <strong>0.35x Beginner → Junior</strong> (basic syntax & lookup)
            <br />• <strong>0.75x Intermediate → Mid-Level</strong> (component & workflow implementation)
            <br />• <strong>1.15x Advanced → Senior / Staff</strong> (systems architecture, tradeoffs, unit economics & <code>/grill-me</code> stress-testing).
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <Compass size={16} color="var(--accent-sage)" />
            <strong>3. O*NET 29.x Multi-Dimensional Role Matching</strong>
          </div>
          <p>
            We cross-reference your weighted behavioral signals against O*NET occupational competency pillars across four dimensions: <strong>Skill Overlap</strong>, <strong>Energy Alignment</strong>, <strong>Values Match</strong>, and <strong>Burnout Friction</strong>.
          </p>
        </div>
        <div className="provider-step">
          <div className="provider-step-header">
            <Quote size={16} color="var(--accent-sage)" />
            <strong>4. 100% Citation-Backed Insights</strong>
          </div>
          <p>
            Clearspace never hallucinates traits. Every card in Your Strengths &amp; Habits and Career Path Matches cites exact dates, conversation IDs, and verbatim scrubbed quotes from your own archive.
          </p>
        </div>
      </div>
    </div>
  );

  const renderOnboardingPanel = () => (
    <div className="onboarding-card" data-testid="step2-upload-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="badge superpower">Step 2 of 3 • Zero-Knowledge Local Data Upload</span>
          <h2 className="page-title" style={{ fontSize: 30, marginTop: 10 }}>
            Welcome{hasProfileName ? `, ${data?.profile.name}` : ""} to Clearspace — Bring Your Prompt Archive
          </h2>
          <p className="page-lead" style={{ marginTop: 8 }}>
            Every file is parsed, PII-scrubbed, and scored <strong>100% locally on your machine</strong>. Nothing ever leaves your device or touches a cloud server.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={handleLoadSample} disabled={isImporting}>
            <Sparkles size={15} />
            <span>Load Sample Multi-Provider Vault</span>
          </button>
          <button className="btn-outline" onClick={handleScanLocal} disabled={isImporting}>
            <RefreshCw size={14} className={isImporting ? "spin-icon" : ""} />
            <span>Opt-In: Scan Local Antigravity Prompts</span>
          </button>
        </div>
      </div>

      {/* Zero-Knowledge & AI Transparency Standalone Page Launchers */}
      <div className="trust-explainer-bar" data-testid="trust-explainer-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ShieldCheck size={18} color="var(--accent-sage)" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
            Privacy is monumental. Skeptical about how your data and AI are handled? Read our standalone architecture briefs:
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setStandalonePage("zero-knowledge")}
            data-testid="btn-open-zero-knowledge"
          >
            <Lock size={13} />
            <span>What is Zero-Knowledge?</span>
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setStandalonePage("how-ai-works")}
            data-testid="btn-open-how-ai-works"
          >
            <Cpu size={13} />
            <span>How We Use AI in the System</span>
          </button>
        </div>
      </div>

      {renderProviderGuideSteps()}

      <div className="upload-dropzone" aria-live="polite">
        <label className="btn-primary" style={{ cursor: "pointer" }}>
          <Upload size={15} />
          <span>Import Export Files (.json, .md, .html, .txt, .zip)</span>
          <input
            type="file"
            accept=".json,.md,.txt,.jsonl,.html,.zip"
            multiple
            hidden
            onChange={handleFileUpload}
            data-testid="vault-file-input"
          />
        </label>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Drop your exported <code>.zip</code> or <code>.json</code> directly—Clearspace extracts, deduplicates, and scrubs PII automatically.
        </span>
        {renderImportSummaryPanel(false)}
      </div>
    </div>
  );

  // Focused Step 1 Profile Setup Modal / Screen when user hasn't set their name yet (or clicked Edit Profile)
  const renderStep1ProfileCard = () => (
    <div className="onboarding-card" data-testid="step1-profile-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="badge superpower">Step 1 of 3 • Personalize Your Local Vault</span>
          <h1 className="page-title" style={{ fontSize: 32, marginTop: 10 }}>
            Welcome to Clearspace — Let’s Start With You
          </h1>
          <p className="page-lead" style={{ marginTop: 8 }}>
            We show you <strong>one step at a time</strong> so you are never overwhelmed. First, enter your name and optionally add a profile photo (stored strictly on your local disk).
          </p>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={handleLoadSample}
          disabled={isImporting}
          title="Quick-start with sample vault"
        >
          <Sparkles size={14} />
          <span>Load Sample Multi-Provider Vault</span>
        </button>
      </div>

      <form onSubmit={handleSaveProfileStep1} style={{ marginTop: 22 }}>
        <div
          style={{
            display: "flex",
             gap: 22,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "18px 20px",
            background: "var(--bg-warm)",
            border: "1px solid var(--border-warm)",
            borderRadius: 16,
          }}
        >
          <div className="profile-avatar-circle" data-testid="step1-avatar-preview">
            {profileAvatarDraft ? (
              <img src={profileAvatarDraft} alt="Selected profile avatar" />
            ) : (
              <span>{getInitials(profileNameDraft || "Clearspace")}</span>
            )}
          </div>

          <div style={{ flex: "1 1 260px" }}>
            <label
              htmlFor="profile-name-input"
              className="stat-label"
              style={{ display: "block", marginBottom: 6 }}
            >
              Your Name (Required)
            </label>
            <input
              id="profile-name-input"
              type="text"
              data-testid="profile-name-input"
              value={profileNameDraft}
              onChange={(e) => {
                setProfileNameDraft(e.target.value);
                if (profileError) setProfileError("");
              }}
              placeholder="e.g., Chris"
              style={{
                width: "100%",
                maxWidth: 380,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border-warm)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
              }}
            />
            {profileError && (
              <div style={{ color: "var(--accent-terracotta)", fontSize: 12.5, marginTop: 6 }} role="alert">
                {profileError}
              </div>
            )}
          </div>

          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>
              Profile Image (Optional)
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label className="btn-outline" style={{ cursor: "pointer" }}>
                <User size={14} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleProfileAvatarUpload}
                  data-testid="profile-avatar-input"
                />
              </label>
              {profileAvatarDraft && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setProfileAvatarDraft(null)}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStandalonePage("zero-knowledge")}
            >
              <Lock size={13} />
              <span>What is Zero-Knowledge?</span>
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setStandalonePage("how-ai-works")}
            >
              <Cpu size={13} />
              <span>How We Use AI</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {isEditingProfile && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => setIsEditingProfile(false)}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn-primary"
              data-testid="btn-complete-step1"
            >
              <span>{isEditingProfile ? "Save Profile" : "Continue to Step 2: Upload Your Data"}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  const ownerPossessive =
    data?.profile?.name && data.profile.name.trim().length > 0
      ? `${data.profile.name.trim()}’s`
      : "Your";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-header">
            <div className="brand-title">
              <Compass size={24} color="var(--accent-sage)" />
              <span>Clearspace</span>
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
              aria-selected={activeTab === "mirror" && standalonePage === "none"}
              aria-controls="panel-mirror"
              tabIndex={activeTab === "mirror" ? 0 : -1}
              className={`nav-btn ${activeTab === "mirror" && standalonePage === "none" ? "active" : ""}`}
              onClick={() => {
                setStandalonePage("none");
                setActiveTab("mirror");
              }}
            >
              <div className="profile-avatar-circle xs" data-testid="nav-profile-avatar" aria-hidden="true">
                {data?.profile?.avatar_data_url ? (
                  <img src={data.profile.avatar_data_url} alt={data.profile.name || "Profile"} />
                ) : (
                  <span>{getInitials(data?.profile?.name || "CS")}</span>
                )}
              </div>
              <span>Your Profile</span>
            </button>

            <button
              id="tab-onet"
              role="tab"
              aria-selected={activeTab === "onet" && standalonePage === "none"}
              aria-controls="panel-onet"
              aria-disabled={!isOnetUnlocked}
              tabIndex={activeTab === "onet" ? 0 : -1}
              className={`nav-btn ${activeTab === "onet" && standalonePage === "none" ? "active" : ""} ${
                !isOnetUnlocked ? "locked" : ""
              }`}
              onClick={() => {
                if (!isOnetUnlocked) return;
                setStandalonePage("none");
                setActiveTab("onet");
              }}
              title={
                isOnetUnlocked
                  ? "Career Path"
                  : "Unlocks after reviewing your 3-Chapter Story in Your Profile"
              }
            >
              {isOnetUnlocked ? <Compass size={17} /> : <Lock size={15} />}
              <span>Career Path</span>
            </button>

            <button
              id="tab-equity"
              role="tab"
              aria-selected={activeTab === "equity" && standalonePage === "none"}
              aria-controls="panel-equity"
              aria-disabled={!isEquityUnlocked}
              tabIndex={activeTab === "equity" ? 0 : -1}
              className={`nav-btn ${activeTab === "equity" && standalonePage === "none" ? "active" : ""} ${
                !isEquityUnlocked ? "locked" : ""
              }`}
              onClick={() => {
                if (!isEquityUnlocked) return;
                setStandalonePage("none");
                setActiveTab("equity");
              }}
              title={
                isEquityUnlocked
                  ? "Growth Plan"
                  : "Unlocks after exploring or shortlisting a role in Career Path"
              }
            >
              {isEquityUnlocked ? <TrendingUp size={17} /> : <Lock size={15} />}
              <span>Growth Plan</span>
            </button>

            <button
              id="tab-journal"
              role="tab"
              aria-selected={activeTab === "journal" && standalonePage === "none"}
              aria-controls="panel-journal"
              aria-disabled={!isJournalUnlocked}
              tabIndex={activeTab === "journal" ? 0 : -1}
              className={`nav-btn ${activeTab === "journal" && standalonePage === "none" ? "active" : ""} ${
                !isJournalUnlocked ? "locked" : ""
              }`}
              onClick={() => {
                if (!isJournalUnlocked) return;
                setStandalonePage("none");
                setActiveTab("journal");
              }}
              title={
                isJournalUnlocked
                  ? "Personal Journal"
                  : "Unlocks after accepting at least 1 milestone in Growth Plan"
              }
            >
              {isJournalUnlocked ? <BookOpen size={17} /> : <Lock size={15} />}
              <span>Personal Journal</span>
            </button>

            <button
              id="tab-vault"
              role="tab"
              aria-selected={activeTab === "vault" && standalonePage === "none"}
              aria-controls="panel-vault"
              aria-disabled={!isVaultUnlocked}
              tabIndex={activeTab === "vault" ? 0 : -1}
              className={`nav-btn ${activeTab === "vault" && standalonePage === "none" ? "active" : ""} ${
                !isVaultUnlocked ? "locked" : ""
              }`}
              onClick={() => {
                if (!isVaultUnlocked) return;
                setStandalonePage("none");
                setActiveTab("vault");
              }}
              title={
                isVaultUnlocked
                  ? "Your Data"
                  : "Unlocks as soon as you upload or scan your prompt archive"
              }
            >
              {isVaultUnlocked ? <Database size={17} /> : <Lock size={15} />}
              <span>Your Data</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <button
            ref={settingsTriggerRef}
            type="button"
            className={`nav-btn ${isSettingsOpen ? "active" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen(true)}
            data-testid="btn-settings-drawer"
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </div>

        {isSettingsOpen && (
        <div className="settings-drawer-backdrop" onClick={() => setIsSettingsOpen(false)} data-testid="settings-drawer-backdrop">
          <div className="settings-drawer" role="dialog" aria-modal="true" aria-label="Clearspace Settings" onClick={(e) => e.stopPropagation()} data-testid="settings-drawer">
            <div className="settings-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16 }}>
                <Settings size={18} color="var(--accent-sage)" />
                <span>Settings</span>
              </div>
              <button ref={settingsCloseBtnRef} type="button" className="btn-outline" style={{ padding: "5px 9px", fontSize: 12 }} onClick={() => setIsSettingsOpen(false)} aria-label="Close Settings" data-testid="btn-close-settings">
                <X size={16} />
              </button>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Profile</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div className="profile-avatar-circle sm">
                    {data?.profile?.avatar_data_url ? <img src={data.profile.avatar_data_url} alt={data.profile.name || "Profile"} /> : <span>{getInitials(data?.profile?.name || "CS")}</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-testid="sidebar-profile-name">
                      {hasProfileName ? data?.profile.name : "Step 1: Set Profile"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {isVaultEmpty ? (hasProfileName ? "Step 2: Upload Data" : "1-Step Onboarding") : `${unlockedTabOrder.length} of 5 Modules Unlocked`}
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-outline" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => { setProfileNameDraft(data?.profile?.name ?? ""); setProfileAvatarDraft(data?.profile?.avatar_data_url ?? null); setIsEditingProfile(true); setStandalonePage("none"); setIsSettingsOpen(false); }} title="Edit your profile name or photo" data-testid="btn-edit-profile">
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Appearance</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Color Theme ({appTheme === "dark" ? "Dark" : "Warm Daylight"})</span>
                <button type="button" className="btn-outline" style={{ padding: "6px 11px", fontSize: 12 }} onClick={handleToggleTheme} title="Switch application color theme" aria-label={`Switch color theme (currently ${appTheme === "dark" ? "Dark" : "Light"})`} data-testid="sidebar-theme-toggle">
                  {appTheme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                  <span>{appTheme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Writing Style &amp; Explanation Tone</div>
              <div style={{ fontSize: 12, color: "var(--accent-sage)", fontWeight: 600 }} data-testid="sidebar-writing-level-pill">
                Writing Style: {writingStyleShortBand} ({activeWritingLevelMode === "auto" ? "Auto" : "Custom"})
              </div>
              {renderWritingLevelSwitcherCard()}
            </div>

          <div className="settings-section">
            <div className="settings-section-title">
              Privacy &amp; AI Architecture
            </div>
            <button
              type="button"
              className={`nav-btn ${standalonePage === "zero-knowledge" ? "active" : ""}`}
              style={{ padding: "8px 11px", fontSize: 12.5 }}
              onClick={() => { setStandalonePage("zero-knowledge"); setIsSettingsOpen(false); }}
              data-testid="sidebar-link-zero-knowledge"
            >
              <ShieldCheck size={15} />
              <span>Zero-Knowledge Proof</span>
            </button>
            <button
              type="button"
              className={`nav-btn ${standalonePage === "how-ai-works" ? "active" : ""}`}
              style={{ padding: "8px 11px", fontSize: 12.5 }}
              onClick={() => { setStandalonePage("how-ai-works"); setIsSettingsOpen(false); }}
              data-testid="sidebar-link-how-ai"
            >
              <Cpu size={15} />
              <span>How We Use AI</span>
            </button>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Updates &amp; Vault Management</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 2,
              }}
              data-testid="sidebar-version-meta"
            >
              <span>
                v{data?.update_status?.installed_version ?? "0.4.0"} • Schema v
                {data?.update_status?.schema_version ?? 3}
              </span>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: "3px 8px", fontSize: 10.5 }}
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdates}
                data-testid="btn-check-updates"
                title="Check if a newer signed desktop build is available"
              >
                <RefreshCw size={11} className={isCheckingUpdates ? "spin-icon" : ""} />
                <span>{isCheckingUpdates ? "Checking…" : "Check Updates"}</span>
              </button>
            </div>
            {updateCheckResult && (
              <div
                style={{
                  fontSize: 11,
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: "var(--bg-warm)",
                  border: "1px solid var(--border-warm)",
                  color: "var(--text-secondary)",
                }}
                data-testid="update-status-banner"
              >
                {updateCheckResult.update_available ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div>
                      <strong style={{ color: "var(--accent-sage)" }}>
                        Update v{updateCheckResult.latest_version} available! (Schema v
                        {updateCheckResult.schema_version})
                      </strong>{" "}
                      Your local SQLite vault will be automatically backed up before upgrading.
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "5px 8px" }}
                      onClick={handleInstallUpdate}
                      data-testid="btn-install-update"
                    >
                      <span>Install v{updateCheckResult.latest_version} Update</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <strong style={{ color: "var(--accent-sage)" }}>
                      Up to date (v{updateCheckResult.installed_version})
                    </strong>{" "}
                    • Local vault auto-backed up across upgrades.
                  </>
                )}
              </div>
            )}
            <button
              className="btn-outline"
              style={{ width: "100%", justifyContent: "center", fontSize: 11.5, padding: "6px 10px" }}
              onClick={() => { void handleResetVault(); setIsSettingsOpen(false); }}
              title="Wipe imported prompts and return to Step 2 upload while keeping your profile"
            >
              <Trash2 size={12} />
              <span>Reset / Clear Vault</span>
            </button>
            {hasProfileName && (
              <button
                className="btn-outline"
                style={{ width: "100%", justifyContent: "center", fontSize: 11, padding: "5px 10px" }}
                onClick={() => { void handleFullFactoryReset(); setIsSettingsOpen(false); }}
                title="Wipe both profile and vault to restart at Step 1"
                data-testid="btn-full-factory-reset"
              >
                <span>Full Factory Reset (Step 1)</span>
              </button>
            )}
          </div>
          </div>
        </div>
        )}
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
        ) : standalonePage === "zero-knowledge" ? (
          renderStandaloneZeroKnowledgePage()
        ) : standalonePage === "how-ai-works" ? (
          renderStandaloneHowAiWorksPage()
        ) : isEditingProfile ? (
          renderStep1ProfileCard()
        ) : (
          <>
            {activeTab === "mirror" && (
              <div>
                <h1 className="page-title">{ownerPossessive} Profile</h1>
                <p className="page-lead">
                  {isVaultEmpty ? (
                    <>
                      Your local vault is currently empty (<strong>0 prompts ingested</strong>). Follow the
                      guided 1-step-at-a-time onboarding below to set up your profile and import your archive.
                    </>
                  ) : (
                    <>
                      Built from{" "}
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
                    <div className="stat-label">Meaningful Prompts</div>
                    <div className="stat-value">{data.summary.high_signal_prompts.toLocaleString()}</div>
                    <div className="stat-sub">Problem-solving, values &amp; career goals</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Local PII Redactions</div>
                    <div className="stat-value">{data.summary.total_redactions.toLocaleString()}</div>
                    <div className="stat-sub">Emails, phones &amp; keys scrubbed on disk</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Peak Deep-Flow Window</div>
                    <div className="stat-value" style={{ fontSize: 26 }}>{peakInfo.windowLabel}</div>
                    <div className="stat-sub">{peakInfo.shareSub}</div>
                  </div>
                </div>

                {isVaultEmpty ? (
                  <>
                    {/* Focused 1-Thing-at-a-Time Onboarding: Step 1 (Profile) -> Step 2 (Upload) */}
                    {!hasProfileName ? renderStep1ProfileCard() : renderOnboardingPanel()}
                    <ContributionGrid
                      dailyCounts={data.summary.daily_counts}
                      recentPrompts={data.recent_high_signal_prompts}
                      latestDate={data.summary.latest_date}
                      appTheme={appTheme}
                    />
                  </>
                ) : (
                  <>
                    {/* Front-and-center Peak Flow Windows (24-Hour Cognitive Rhythm) promoted from Vault */}
                    {renderPeakFlowRhythmCard()}

                    {/* Theme-synchronized Prompt Count Tracker */}
                    <ContributionGrid
                      dailyCounts={data.summary.daily_counts}
                      recentPrompts={data.recent_high_signal_prompts}
                      latestDate={data.summary.latest_date}
                      appTheme={appTheme}
                    />

                    <div
                      className="upload-dropzone"
                      style={{ marginTop: 18, padding: "12px 16px" }}
                      aria-live="polite"
                    >
                      <label className="btn-primary" style={{ cursor: "pointer" }}>
                        <Upload size={15} />
                        <span>Import More Export Files (.json, .md, .html, .txt, .zip)</span>
                        <input
                          type="file"
                          accept=".json,.md,.txt,.jsonl,.html,.zip"
                          multiple
                          hidden
                          onChange={handleFileUpload}
                          data-testid="vault-file-input"
                        />
                      </label>
                      {data.summary.source_counts && data.summary.source_counts.length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {data.summary.source_counts.map(([src, count]) => (
                            <span key={src} className="badge superpower">
                              {src}: {count.toLocaleString()} prompts
                            </span>
                          ))}
                        </div>
                      )}
                      {renderImportSummaryPanel(false)}
                    </div>

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

                    {/* 3-Chapter Narrative Story Stepper */}
                    <div className="story-chapter-stepper" data-testid="story-chapter-stepper">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {STORY_CHAPTERS.map((ch) => (
                          <button
                            key={ch.key}
                            type="button"
                            className={`story-chapter-btn ${
                              activeStoryChapter === ch.key ? "active" : ""
                            }`}
                            onClick={() => handleSelectStoryChapter(ch.key)}
                            data-testid={`story-chapter-btn-${ch.key}`}
                          >
                            <span>{ch.label}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`story-chapter-btn ${activeStoryChapter === "all" ? "active" : ""}`}
                        onClick={() => handleSelectStoryChapter("all")}
                        data-testid="story-chapter-btn-all"
                      >
                        <span>View All 3 Story Chapters ({data.mirror_cards.length})</span>
                      </button>
                    </div>

                    {activeStoryChapter !== "all" && (
                      <div
                        className={`story-banner ${activeStoryChapter}`}
                        data-testid="story-chapter-banner"
                      >
                        <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                          {STORY_CHAPTERS.find((c) => c.key === activeStoryChapter)?.headline}
                        </h2>
                        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 4 }}>
                          {STORY_CHAPTERS.find((c) => c.key === activeStoryChapter)?.description}
                        </p>
                      </div>
                    )}

                    <div className="card-stack">
                      {filteredStoryCards.map((card) => (
                        <div key={card.id} className="insight-card" data-testid="mirror-story-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {card.story_chapter_title && (
                                <span className="badge superpower">{card.story_chapter_title}</span>
                              )}
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
                            </div>
                            {card.assessed_tier && (
                              <span className="badge value">{card.assessed_tier}</span>
                            )}
                          </div>
                          <h3 style={{ fontSize: "20px", marginTop: "10px", fontWeight: 700 }}>
                            {card.title}
                          </h3>
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
                              <strong>
                                {effectiveWritingLevel === "everyday"
                                  ? "Reality Check:"
                                  : "Test Assumption:"}
                              </strong>{" "}
                              {card.assumption_challenged.replace(
                                /^(?:Assumption Tested|Reality Check):\s*/i,
                                ""
                              )}
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
                                color: "var(--accent-rose)",
                              }}
                              data-testid="mirror-gap-box"
                            >
                              <strong>
                                {effectiveWritingLevel === "everyday"
                                  ? "Next Step to Grow:"
                                  : "Identify Gap:"}
                              </strong>{" "}
                              {card.identified_gap.replace(
                                /^(?:Gap Identified|Next Step to Grow):\s*/i,
                                ""
                              )}
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

                    {/* Progressive Story Stepper Footer / Next Feature Unlock CTA */}
                    <div
                      className="insight-card"
                      style={{
                        marginTop: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div className="stat-label">Progressive Story Flow</div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                          {activeStoryChapter === "excel"
                            ? "Next Up: Chapter 2 — Where We Think You Could Grow"
                            : activeStoryChapter === "grow"
                            ? "Next Up: Chapter 3 — What Is Causing You Friction"
                            : "Story Complete — Unlock Your Career Path"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {activeStoryChapter === "excel" && (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleSelectStoryChapter("grow")}
                          >
                            <span>Next: 2. Where You Could Grow</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                        {activeStoryChapter === "grow" && (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleSelectStoryChapter("friction")}
                          >
                            <span>Next: 3. What Causes You Friction</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                        {(activeStoryChapter === "friction" || activeStoryChapter === "all" || isOnetUnlocked) && (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleUnlockOnetFromMirror}
                            data-testid="btn-unlock-onet"
                          >
                            <Compass size={15} />
                            <span>Continue to Career Path</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "onet" && (
              <div>
                <h1 className="page-title">{ownerPossessive} Career Path</h1>
                <p className="page-lead">
                  Most people don’t know what job titles exist that match who they naturally are. Below are the
                  occupations and modern role tracks matched directly to your demonstrated behaviors, energy
                  drivers, and burnout guardrails. Shortlist any track to unlock your{" "}
                  <strong>Growth Plan</strong>.
                </p>

                {isVaultEmpty && renderOnboardingPanel()}

                <div className="card-stack">
                  {data.onet_matches.map((role) => {
                    const isShortlisted = (data.profile?.shortlisted_onet_codes ?? []).includes(
                      role.onet_code
                    );
                    return (
                      <div key={role.onet_code} className="insight-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
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
                            {(effectiveWritingLevel === "everyday" ||
                              effectiveWritingLevel === "professional") &&
                              role.plain_english_description && (
                                <p
                                  style={{
                                    fontSize: "13.5px",
                                    color: "var(--accent-sage)",
                                    fontWeight: 600,
                                    marginTop: 4,
                                  }}
                                  data-testid="onet-plain-english-desc"
                                >
                                  <strong>In Plain English:</strong> {role.plain_english_description}
                                </p>
                              )}
                            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: 2 }}>
                              Track Ceiling ({role.salary_range_usd}): {role.modern_titles.join(" • ")}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <button
                              type="button"
                              className={`btn-outline ${isShortlisted ? "active" : ""}`}
                              onClick={() => handleShortlistOnetRole(role.onet_code, false)}
                              data-testid={`btn-shortlist-${role.onet_code}`}
                            >
                              <Bookmark size={14} />
                              <span>{isShortlisted ? "Shortlisted ✓" : "Shortlist Role"}</span>
                            </button>
                            <div style={{ textAlign: "right" }}>
                              <div className="equity-score-num">{role.overall_fit_pct}%</div>
                              <div className="stat-label">Path Fit</div>
                            </div>
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
                            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--accent-rose)" }}>
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
                                <li key={tIdx}>
                                  {ta.replace(/^(?:Assumption Tested|Reality Check):\s*/i, "")}
                                </li>
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
                            color: "var(--accent-rose)",
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
                    );
                  })}
                </div>

                <div
                  className="insight-card"
                  style={{
                    marginTop: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div className="stat-label">Next Dependent Milestone</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                      Ready to build your personalized growth plan based on your matched career paths?
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() =>
                      handleShortlistOnetRole(
                        data.onet_matches[0]?.onet_code ?? "15-1252.00",
                        true
                      )
                    }
                    data-testid="btn-unlock-equity"
                  >
                    <TrendingUp size={15} />
                    <span>Unlock Growth Plan</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "equity" && (
              <div>
                <h1 className="page-title">{ownerPossessive} Growth Plan</h1>
                <p className="page-lead">
                  Practical, personalized action steps tailored to your top career matches and growth areas. Accept at least 1 step below to unlock your{" "}
                  <strong>Personal Journal</strong>.
                </p>

                <div className="insight-card" style={{ marginTop: 22 }} data-testid="equity-summary-card">
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
                      <div className="stat-label">Growth Plan Commitment</div>
                      <h3 style={{ fontSize: 20, marginTop: 4 }}>
                        {committedQuestPoints.toLocaleString()} /{" "}
                        {totalAvailableQuestPoints.toLocaleString()} Growth Points Committed (
                        {equityProgressPct}%)
                      </h3>
                      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        {acceptedQuests.length} of {data.quests.length} milestones on your active path •{" "}
                        {completedQuests.length} completed
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="badge value">Next 7 Days (Quick Win)</span>
                      <span className="badge superpower">Next 30 Days (Skill Builder)</span>
                      <span className="badge superpower">3-Month Milestone (Practical Project)</span>
                      <span className="badge value">1-Year Goal (Career Growth)</span>
                    </div>
                  </div>
                  <div
                    className="equity-progress-track"
                    role="progressbar"
                    aria-label="Growth Plan Commitment Progress"
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

                <GrowthLineGraph
                  dailyPromptQuality={(data.summary as { daily_prompt_quality?: GrowthDailyQualityInput[] }).daily_prompt_quality}
                  recentPrompts={data.recent_high_signal_prompts}
                  dailyCounts={data.summary.daily_counts}
                  quests={data.quests}
                  latestDate={data.summary.latest_date}
                />

                <div className="card-stack">
                  {data.quests.map((q) => (
                    <div key={q.id} className="insight-card" data-testid="quest-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div>
                          <span className="badge value">{q.horizon}</span>
                          <span className="badge superpower" style={{ marginLeft: 8 }}>
                            +{q.equity_points} pts • {q.equity_category}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className={`btn-outline ${q.accepted ? "active" : ""}`}
                            onClick={() => handleToggleQuest(q.id, "accepted")}
                          >
                            <CheckCircle2 size={14} />
                            <span>{q.accepted ? "On My Path" : "Accept Step"}</span>
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

                {isJournalUnlocked && (
                  <div
                    className="insight-card"
                    style={{
                      marginTop: 20,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="stat-label">Milestone Unlocked</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                        Personal Journal is now unlocked!
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setActiveTab("journal")}
                      data-testid="btn-go-journal"
                    >
                      <BookOpen size={15} />
                      <span>Open Personal Journal</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "journal" && (
              <div>
                <h1 className="page-title">{ownerPossessive} Personal Journal</h1>
                <p className="page-lead">
                  A private, non-judgmental space stored strictly in your local vault. Choose a guided
                  reflection question below or write freely.
                </p>

                <div className="insight-card" style={{ marginTop: 22 }}>
                  <div className="stat-label">Guided Reflection Question</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {SOCRATIC_PROMPTS.map((_sp, idx) => (
                      <button
                        key={idx}
                        className={`btn-outline ${selectedPromptIdx === idx ? "active" : ""}`}
                        onClick={() => setSelectedPromptIdx(idx)}
                      >
                        Question #{idx + 1}
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
                        color: "var(--text-primary)",
                      }}
                    >
                      <option>Energized &amp; Clear</option>
                      <option>In Deep Flow</option>
                      <option>Questioning / At a Crossroads</option>
                      <option>Feeling Drained by Routine</option>
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
                      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                        {j.prompt_question}
                      </div>
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
                <h1 className="page-title">Your Data</h1>
                <p className="page-lead">
                  Inspect how your local data is parsed and scrubbed. Your local database lives at:{" "}
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{data.db_path}</code>
                </p>

                <div
                  className="insight-card"
                  style={{
                    marginTop: 14,
                    padding: "14px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                  data-testid="vault-upgrade-safety-card"
                >
                  <div>
                    <div className="stat-label">Desktop Upgrade &amp; Schema Migration Guard</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                      Clearspace v{data.update_status?.installed_version ?? "0.4.0"} • SQLite Schema v
                      {data.update_status?.schema_version ?? 3} (`PRAGMA user_version`)
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                      Installing a newer `.exe` or `.msi` release never overwrites your vault. Before any schema
                      upgrade, Clearspace automatically snapshots{" "}
                      <code>clearspace_vault.db.bak-v{data.update_status?.schema_version ?? 3}</code>.
                    </div>
                    {backupNotice && (
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--accent-sage)",
                          fontWeight: 600,
                          marginTop: 6,
                        }}
                        data-testid="vault-backup-notice"
                      >
                        {backupNotice}
                      </div>
                    )}
                    {updateCheckResult && (
                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }} data-testid="vault-update-status">
                        {updateCheckResult.update_available ? (
                          <span>
                            <strong style={{ color: "var(--accent-sage)" }}>
                              Update v{updateCheckResult.latest_version} available
                            </strong>{" "}
                            (Schema v{updateCheckResult.schema_version}) —{" "}
                            <button type="button" className="btn-primary" style={{ padding: "3px 8px", fontSize: 11.5 }} onClick={handleInstallUpdate}>
                              Install v{updateCheckResult.latest_version} Update
                            </button>
                          </span>
                        ) : (
                          <span>
                            <strong style={{ color: "var(--accent-sage)" }}>Up to date (v{updateCheckResult.installed_version})</strong> • Checked {updateCheckResult.checked_at}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleBackupVault}
                      data-testid="btn-backup-vault"
                    >
                      <ShieldCheck size={14} />
                      <span>Snapshot Vault Backup (.bak)</span>
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleCheckUpdates}
                      disabled={isCheckingUpdates}
                      data-testid="btn-vault-check-updates"
                    >
                      <RefreshCw size={14} className={isCheckingUpdates ? "spin-icon" : ""} />
                      <span>{isCheckingUpdates ? "Checking…" : "Check for Updates"}</span>
                    </button>
                  </div>
                </div>

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
                        <span>Import Export Files (.json, .md, .html, .txt, .zip)</span>
                        <input
                          type="file"
                          accept=".json,.md,.txt,.jsonl,.html,.zip"
                          multiple
                          hidden
                          onChange={handleFileUpload}
                          data-testid="vault-file-input"
                        />
                      </label>
                      <button className="btn-outline" onClick={handleLoadSample} disabled={isImporting}>
                        <Sparkles size={14} />
                        <span>Load Sample Multi-Provider Vault</span>
                      </button>
                      <button className="btn-outline" onClick={handleScanLocal} disabled={isImporting}>
                        <RefreshCw size={14} className={isImporting ? "spin-icon" : ""} />
                        <span>Opt-In: Scan Local Antigravity Prompts</span>
                      </button>
                      <button className="btn-outline" onClick={handleResetVault} disabled={isImporting}>
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
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--accent-sage)",
                            fontWeight: 600,
                            width: "100%",
                            marginTop: 4,
                          }}
                        >
                          {importStatus}
                        </div>
                      )}
                      {lastImportReport &&
                        lastImportReport.file_reports.some((r) => r.status !== "imported") &&
                        renderImportSummaryPanel(true)}
                    </div>
                  </div>
                )}

                {renderPeakFlowRhythmCard()}

                <div
                  className="insight-card"
                  style={{ marginTop: 16, padding: "20px 24px" }}
                  data-testid="vault-prompt-explorer"
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
                      <h3 style={{ fontSize: 18 }}>Interactive Scrubbed Prompt Explorer</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        Search and filter your Meaningful Prompts after deterministic local PII redaction.
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
                    <div className="stat-label" style={{ marginBottom: 6 }}>
                      Provider Source
                    </div>
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
                    <div className="stat-label" style={{ marginBottom: 6 }}>
                      Signal Category
                    </div>
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
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
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

                {!isVaultEmpty && renderImportSummaryPanel(false)}

                <ContributionGrid
                  dailyCounts={data.summary.daily_counts}
                  recentPrompts={data.recent_high_signal_prompts}
                  latestDate={data.summary.latest_date}
                  appTheme={appTheme}
                />

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
