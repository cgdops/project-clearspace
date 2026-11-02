export interface LinkedInArchiveEntry {
  name: string;
  content: string;
}

export interface LinkedInFileSummary {
  file_name: string;
  cluster_id: string;
  cluster_label: string;
  row_count: number;
  date_range: string;
  key_fields: string[];
  plain_english_description: string;
}

export interface LinkedInNetworkStats {
  total_connections: number;
  connections_by_year: [string, number][];
  top_companies: [string, number][];
  top_positions: [string, number][];
  invitations_sent: number;
  invitations_received: number;
  company_follows_count: number;
  followed_companies_sample: string[];
}

export interface LinkedInRecommendationItem {
  person_name: string;
  role_company: string;
  date: string;
  status: string;
  excerpt: string;
}

export interface LinkedInMessagingStats {
  total_messages: number;
  sent_messages: number;
  received_messages: number;
  messages_by_year: [string, number][];
  top_threads: [string, number][];
  recommendations_received_count: number;
  recommendations_given_count: number;
  endorsements_received_count: number;
  endorsements_given_count: number;
  recommendations_received: LinkedInRecommendationItem[];
  recommendations_given: LinkedInRecommendationItem[];
}

export interface LinkedInAdTargetingStats {
  member_age: string;
  years_of_experience: string;
  high_value_segments: string[];
  buyer_groups: string[];
  inferred_job_titles: string[];
  job_seniorities: string[];
  company_industries: string[];
  member_interests: string[];
  member_traits: string[];
  ad_inferred_skills: string[];
  declared_profile_skills: string[];
  skills_only_in_ad_engine: string[];
  skills_only_in_profile: string[];
  skills_overlap_count: number;
}

export interface LinkedInPositionItem {
  title: string;
  company: string;
  started_on: string;
  finished_on: string;
  location: string;
  description: string;
}

export interface LinkedInEducationItem {
  school: string;
  degree: string;
  start_date: string;
  end_date: string;
  notes: string;
}

export interface LinkedInArticleItem {
  title: string;
  published_date: string;
  excerpt: string;
}

export interface LinkedInCareerLearningStats {
  profile_headline: string;
  profile_industry: string;
  profile_location: string;
  profile_summary: string;
  positions: LinkedInPositionItem[];
  education: LinkedInEducationItem[];
  certifications: string[];
  projects: string[];
  honors: string[];
  organizations: string[];
  learning_total_courses: number;
  learning_by_year: [string, number][];
  recent_courses: string[];
  top_endorsed_skills: [string, number][];
  articles_published: LinkedInArticleItem[];
  rich_media_posts_count: number;
  rich_media_samples: string[];
}

export interface LinkedInJobApplicationItem {
  job_title: string;
  company: string;
  applied_date: string;
  resume_name: string;
}

export interface LinkedInSavedJobItem {
  job_title: string;
  company: string;
  saved_date: string;
}

export interface LinkedInJobSearchStats {
  applications_count: number;
  saved_jobs_count: number;
  applications_by_month: [string, number][];
  recent_applications: LinkedInJobApplicationItem[];
  saved_jobs: LinkedInSavedJobItem[];
  saved_job_alerts: string[];
  preferred_job_titles: string[];
  open_to_recruiters_statement: string;
  resume_versions: [string, number][];
}

export interface LinkedInThreeWayMirror {
  real_self_today: string[];
  peer_vouching: string[];
  ad_algorithm_box: string[];
  synthesis_narrative: string;
}

export interface LinkedInRelationshipSignature {
  outbound_invitations_with_notes: number;
  total_threads_analyzed: number;
  sent_to_received_ratio_pct: number;
  mentoring_recommendations_given: number;
  sample_outbound_opener: string;
  communication_traits: string[];
  synthesis_narrative: string;
}

export interface LinkedInCuriosityEvolution {
  early_foundations: string[];
  public_voice_milestones: string[];
  current_systems_edge: string[];
  synthesis_narrative: string;
}

export interface LinkedInVaultAnalytics {
  total_files_parsed: number;
  total_rows_parsed: number;
  file_summaries: LinkedInFileSummary[];
  network: LinkedInNetworkStats;
  messaging: LinkedInMessagingStats;
  ad_targeting: LinkedInAdTargetingStats;
  career_learning: LinkedInCareerLearningStats;
  job_search: LinkedInJobSearchStats;
  three_way_mirror: LinkedInThreeWayMirror;
  relationship_signature: LinkedInRelationshipSignature;
  curiosity_evolution: LinkedInCuriosityEvolution;
}

const PROMPT_INJECTION_REGEX =
  /<\s*(?:important|system|ignore)\s+instructions[^>]*>[\s\S]*?<\s*\/\s*(?:important|system|ignore)\s+instructions\s*>/gi;

export function stripPromptInjectionClient(raw: string): string {
  if (!raw) return "";
  return raw.replace(PROMPT_INJECTION_REGEX, " ").replace(/\s+/g, " ").trim();
}

export function hasPromptInjectionClient(raw: string): boolean {
  if (!raw) return false;
  return /<\s*(?:important|system|ignore)\s+instructions[^>]*>[\s\S]*?<\s*\/\s*(?:important|system|ignore)\s+instructions\s*>/i.test(
    raw
  );
}

const MONTH_MAP: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export function normalizeLinkedInDateClient(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;

  // 1. YYYY-MM-DD HH:MM:SS UTC or ISO
  const mIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (mIso) {
    const [, y, m, d, hh = "12", mm = "00", ss = "00"] = mIso;
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }

  // 2. YYYY/MM/DD HH:MM:SS UTC
  const mSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (mSlash) {
    const [, y, m, d, hh = "12", mm = "00", ss = "00"] = mSlash;
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }

  // 3. MM/DD/YY, HH:MM AM/PM (e.g. "10/29/26, 8:14 AM")
  const mUs = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  if (mUs) {
    const m = String(parseInt(mUs[1], 10)).padStart(2, "0");
    const d = String(parseInt(mUs[2], 10)).padStart(2, "0");
    let yNum = parseInt(mUs[3], 10);
    if (yNum < 100) {
      yNum += yNum >= 70 ? 1900 : 2000;
    }
    let hhNum = mUs[4] ? parseInt(mUs[4], 10) : 12;
    const mm = mUs[5] ? mUs[5].padStart(2, "0") : "00";
    const ampm = mUs[6]?.toUpperCase();
    if (ampm === "PM" && hhNum < 12) hhNum += 12;
    else if (ampm === "AM" && hhNum === 12) hhNum = 0;
    const hh = String(hhNum).padStart(2, "0");
    return `${yNum}-${m}-${d}T${hh}:${mm}:00Z`;
  }

  // 4. DD MMM YYYY (e.g. "28 Oct 2026")
  const mDmy = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (mDmy) {
    const d = String(parseInt(mDmy[1], 10)).padStart(2, "0");
    const m = MONTH_MAP[mDmy[2].slice(0, 3).toLowerCase()];
    const y = mDmy[3];
    if (m) return `${y}-${m}-${d}T12:00:00Z`;
  }

  // 5. Mon Oct 26 14:51:42 GMT 2026
  const mGmt = trimmed.match(
    /^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+[A-Z]+\s+(\d{4})/i
  );
  if (mGmt) {
    const m = MONTH_MAP[mGmt[1].slice(0, 3).toLowerCase()];
    const d = String(parseInt(mGmt[2], 10)).padStart(2, "0");
    const [, , , hh, mm, ss, y] = mGmt;
    if (m) return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
  }

  // 6. MMM YYYY (e.g. "Dec 2025")
  const mMy = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (mMy) {
    const m = MONTH_MAP[mMy[1].slice(0, 3).toLowerCase()];
    const y = mMy[2];
    if (m) return `${y}-${m}-01T12:00:00Z`;
  }

  // 7. YYYY only
  const mY = trimmed.match(/^(\d{4})$/);
  if (mY) {
    return `${mY[1]}-01-01T12:00:00Z`;
  }

  // 8. Embedded "October 21, 2026 at 2:01 PM"
  const mLong = trimmed.match(
    /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})(?:\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i
  );
  if (mLong) {
    const m = MONTH_MAP[mLong[1].slice(0, 3).toLowerCase()];
    if (m) {
      const d = String(parseInt(mLong[2], 10)).padStart(2, "0");
      const y = mLong[3];
      let hhNum = mLong[4] ? parseInt(mLong[4], 10) : 12;
      const mm = mLong[5] ? mLong[5].padStart(2, "0") : "00";
      const ampm = mLong[6]?.toUpperCase();
      if (ampm === "PM" && hhNum < 12) hhNum += 12;
      else if (ampm === "AM" && hhNum === 12) hhNum = 0;
      const hh = String(hhNum).padStart(2, "0");
      return `${y}-${m}-${d}T${hh}:${mm}:00Z`;
    }
  }

  return null;
}

export function parseCsvRowsClient(raw: string): string[][] {
  const input = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && input[i + 1] === "\n") {
          i += 1;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.trim().length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  // Handle Connections.csv 3-line "Notes:" preamble before actual CSV header row
  if (rows.length > 1) {
    const firstCellLower = (rows[0][0] ?? "").toLowerCase();
    if (firstCellLower.startsWith("notes:") || rows[0].length === 1) {
      const headerIdx = rows
        .slice(0, 6)
        .findIndex((r) => r.length >= 3 && !(r[0] ?? "").toLowerCase().startsWith("notes"));
      if (headerIdx > 0) {
        rows.splice(0, headerIdx);
      }
    }
  }

  return rows;
}

export function parseCsvRecordsClient(raw: string): {
  headers: string[];
  records: Array<Record<string, string>>;
} {
  const rows = parseCsvRowsClient(raw);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rec: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      const val = (row[c] ?? "").trim();
      if (!val) {
        if (!(h in rec)) rec[h] = "";
      } else if (rec[h]) {
        const existingParts = rec[h].split(";").map((p) => p.trim().toLowerCase());
        if (!existingParts.includes(val.toLowerCase())) {
          rec[h] = `${rec[h]}; ${val}`;
        }
      } else {
        rec[h] = val;
      }
    }
    if (Object.values(rec).some((v) => v.length > 0)) {
      records.push(rec);
    }
  }

  return { headers, records };
}

function splitSemicolonUniqueClient(raw: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(";")) {
    const clean = stripPromptInjectionClient(part);
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(clean);
    }
  }
  return out;
}

export function inferLinkedInCsvFilenameClient(rawContent: string): string | null {
  const firstLines = (rawContent ?? "").trim().split(/\r?\n/).slice(0, 6).join("\n");
  if (firstLines.includes("First Name,Last Name,URL,Email Address,Company,Position,Connected On")) {
    return "Connections.csv";
  }
  if (firstLines.includes("First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary")) {
    return "Profile.csv";
  }
  if (firstLines.includes("Company Name,Title,Description,Location,Started On,Finished On")) {
    return "Positions.csv";
  }
  if (
    firstLines.includes("Member Age,Buyer Groups,Company Names") ||
    firstLines.includes("Buyer Groups")
  ) {
    return "Ad_Targeting.csv";
  }
  if (firstLines.startsWith("Name\n") || firstLines.startsWith("Name\r\n")) {
    return "Skills.csv";
  }
  if (firstLines.includes("CONVERSATION ID,CONVERSATION TITLE,FROM,SENDER PROFILE URL")) {
    return "messages.csv";
  }
  if (firstLines.includes("From,To,Sent At,Message,Direction")) {
    return "Invitations.csv";
  }
  if (firstLines.includes("Endorsement Date,Skill Name,Endorser First Name")) {
    return "Endorsement_Received_Info.csv";
  }
  if (firstLines.includes("Endorsement Date,Skill Name,Endorsee First Name")) {
    return "Endorsement_Given_Info.csv";
  }
  if (firstLines.includes("First Name,Last Name,Company,Job Title,Text,Creation Date,Status")) {
    return "Recommendations_Received.csv";
  }
  if (firstLines.includes("First Name,Last Name,Company,Job Title,Text,Creation Date")) {
    return "Recommendations_Given.csv";
  }
  if (
    firstLines.includes("Application Date,Contact Email,Contact Phone Number,Company Name,Job Title")
  ) {
    return "Jobs/Job Applications.csv";
  }
  if (firstLines.includes("Saved Date,Job Url,Company Name,Job Title")) {
    return "Jobs/Saved Jobs.csv";
  }
  if (
    firstLines.includes("ALERT_CREATION_DATE,SNIPPET,FREQUENCY,QUERY_CONTEXT") ||
    firstLines.includes("Job Search AlertId")
  ) {
    return "SavedJobAlerts.csv";
  }
  if (firstLines.includes("Locations,Industries,Company Employee Count,Preferred Job Types")) {
    return "Jobs/Job Seeker Preferences.csv";
  }
  if (firstLines.includes("Content Title,Content Description,Content Type,Content Watched")) {
    return "Learning.csv";
  }
  if (firstLines.includes("Date/Time,Media Description,Media Link")) {
    return "Rich_Media.csv";
  }
  if (firstLines.includes("Organization,Followed On")) {
    return "Company Follows.csv";
  }
  if (firstLines.includes("School Name,Start Date,End Date,Notes,Degree Name")) {
    return "Education.csv";
  }
  if (firstLines.includes("Title,Description,Url,Started On,Finished On")) {
    return "Projects.csv";
  }
  return null;
}

export function isLinkedInEntryClient(fileName: string, rawContent: string): boolean {
  const lowerName = (fileName ?? "").toLowerCase();
  const trimmed = (rawContent ?? "").trim();
  if (
    lowerName.endsWith(".html") &&
    (trimmed.includes('class="published"') || trimmed.includes('class="article-body"'))
  ) {
    return true;
  }
  if (lowerName.endsWith(".csv")) {
    return true;
  }
  return inferLinkedInCsvFilenameClient(trimmed) !== null;
}

function classifyLinkedInFileClusterClient(fileName: string): {
  clusterId: string;
  clusterLabel: string;
  purpose: string;
} {
  const norm = fileName.replace(/\\/g, "/");
  const lower = norm.toLowerCase();
  const base = lower.split("/").pop() ?? lower;

  switch (base) {
    case "profile.csv":
      return {
        clusterId: "profile_core",
        clusterLabel: "Core Identity Hub (Profile.csv)",
        purpose:
          "Your public headline, executive summary, industry, and geographic anchor connecting all 5 LinkedIn data clusters.",
      };
    case "positions.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose:
          "Chronological work history, role titles, organizations, tenure dates, and role descriptions.",
      };
    case "education.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose: "Academic institutions, degrees, dates attended, and campus activities.",
      };
    case "certifications.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose:
          "Professional licenses, technical certifications, issuing authorities, and credential dates.",
      };
    case "projects.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose: "Shipped products, systems, and portfolio initiatives with descriptions and dates.",
      };
    case "honors.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose: "Awards, competitions, and formal recognitions listed on your profile.",
      };
    case "organizations.csv":
      return {
        clusterId: "career_credentials",
        clusterLabel: "1. Career & Credentials",
        purpose: "Professional societies, boards, and community memberships.",
      };
    case "skills.csv":
      return {
        clusterId: "skills_peer_proof",
        clusterLabel: "2. Skills & Peer Proof",
        purpose: "Explicit skills you have chosen to display on your public LinkedIn profile.",
      };
    case "endorsement_received_info.csv":
      return {
        clusterId: "skills_peer_proof",
        clusterLabel: "2. Skills & Peer Proof",
        purpose:
          "Every skill endorsement colleagues have given you, with timestamp and endorser name.",
      };
    case "endorsement_given_info.csv":
      return {
        clusterId: "skills_peer_proof",
        clusterLabel: "2. Skills & Peer Proof",
        purpose: "Skills you have vouched for across your colleagues and collaborators.",
      };
    case "recommendations_received.csv":
      return {
        clusterId: "skills_peer_proof",
        clusterLabel: "2. Skills & Peer Proof",
        purpose:
          "Long-form written testimonials from managers, peers, and clients vouching for your impact.",
      };
    case "recommendations_given.csv":
      return {
        clusterId: "skills_peer_proof",
        clusterLabel: "2. Skills & Peer Proof",
        purpose:
          "Long-form written recommendations you have authored to mentor and champion others.",
      };
    case "connections.csv":
      return {
        clusterId: "network_messaging",
        clusterLabel: "3. Network & Messaging",
        purpose:
          "Every 1st-degree connection in your network with their current company, title, and connection date.",
      };
    case "invitations.csv":
      return {
        clusterId: "network_messaging",
        clusterLabel: "3. Network & Messaging",
        purpose:
          "Inbound and outbound connection requests, including custom intro notes and timestamps.",
      };
    case "messages.csv":
      return {
        clusterId: "network_messaging",
        clusterLabel: "3. Network & Messaging",
        purpose:
          "Full direct-message history across threads, capturing how you collaborate, mentor, and network.",
      };
    case "company follows.csv":
      return {
        clusterId: "network_messaging",
        clusterLabel: "3. Network & Messaging",
        purpose: "Organizations you follow on LinkedIn and when you started tracking them.",
      };
    case "job applications.csv":
      return {
        clusterId: "job_search_positioning",
        clusterLabel: "4. Job Search & Positioning",
        purpose:
          "Every role applied to through LinkedIn, including company, timestamp, and exact resume file used.",
      };
    case "saved jobs.csv":
      return {
        clusterId: "job_search_positioning",
        clusterLabel: "4. Job Search & Positioning",
        purpose: "Roles bookmarked for evaluation or follow-up during your job search.",
      };
    case "savedjobalerts.csv":
      return {
        clusterId: "job_search_positioning",
        clusterLabel: "4. Job Search & Positioning",
        purpose: "Active search queries and target role keywords driving your job alerts.",
      };
    case "job seeker preferences.csv":
      return {
        clusterId: "job_search_positioning",
        clusterLabel: "4. Job Search & Positioning",
        purpose:
          "Preferred job titles, locations, work modes, and your private note to recruiters.",
      };
    case "private_identity_asset.csv":
      return {
        clusterId: "job_search_positioning",
        clusterLabel: "4. Job Search & Positioning",
        purpose: "Uploaded resume documents and identity assets stored in your LinkedIn account.",
      };
    case "ad_targeting.csv":
      return {
        clusterId: "algorithmic_learning_voice",
        clusterLabel: "5. Algorithmic Profile, Learning & Voice",
        purpose:
          "LinkedIn's internal ad-targeting classification of your seniority, buyer groups, inferred titles, and inferred skills.",
      };
    case "learning.csv":
      return {
        clusterId: "algorithmic_learning_voice",
        clusterLabel: "5. Algorithmic Profile, Learning & Voice",
        purpose:
          "LinkedIn Learning courses watched and completed, revealing your self-directed curiosity over time.",
      };
    case "rich_media.csv":
      return {
        clusterId: "algorithmic_learning_voice",
        clusterLabel: "5. Algorithmic Profile, Learning & Voice",
        purpose: "Feed posts, visual media descriptions, and external portfolio links shared publicly.",
      };
    default:
      if (lower.includes("articles/") && lower.endsWith(".html")) {
        return {
          clusterId: "algorithmic_learning_voice",
          clusterLabel: "5. Algorithmic Profile, Learning & Voice",
          purpose: "Long-form thought leadership articles authored and published on LinkedIn.",
        };
      }
      if (lower.startsWith("jobs/")) {
        return {
          clusterId: "job_search_positioning",
          clusterLabel: "4. Job Search & Positioning",
          purpose: "Supplemental job search and application preferences tracked by LinkedIn.",
        };
      }
      return {
        clusterId: "algorithmic_learning_voice",
        clusterLabel: "5. Algorithmic Profile, Learning & Voice",
        purpose: "Account metadata, activity logs, and platform settings exported from LinkedIn.",
      };
  }
}

function stripHtmlSimple(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLinkedInArchiveEntriesClient(entries: LinkedInArchiveEntry[]): {
  analytics: LinkedInVaultAnalytics;
  rawCandidatePrompts: Array<{ text: string; createdAt: string; convoId: string }>;
} {
  const analytics: LinkedInVaultAnalytics = {
    total_files_parsed: 0,
    total_rows_parsed: 0,
    file_summaries: [],
    network: {
      total_connections: 0,
      connections_by_year: [],
      top_companies: [],
      top_positions: [],
      invitations_sent: 0,
      invitations_received: 0,
      company_follows_count: 0,
      followed_companies_sample: [],
    },
    messaging: {
      total_messages: 0,
      sent_messages: 0,
      received_messages: 0,
      messages_by_year: [],
      top_threads: [],
      recommendations_received_count: 0,
      recommendations_given_count: 0,
      endorsements_received_count: 0,
      endorsements_given_count: 0,
      recommendations_received: [],
      recommendations_given: [],
    },
    ad_targeting: {
      member_age: "",
      years_of_experience: "",
      high_value_segments: [],
      buyer_groups: [],
      inferred_job_titles: [],
      job_seniorities: [],
      company_industries: [],
      member_interests: [],
      member_traits: [],
      ad_inferred_skills: [],
      declared_profile_skills: [],
      skills_only_in_ad_engine: [],
      skills_only_in_profile: [],
      skills_overlap_count: 0,
    },
    career_learning: {
      profile_headline: "",
      profile_industry: "",
      profile_location: "",
      profile_summary: "",
      positions: [],
      education: [],
      certifications: [],
      projects: [],
      honors: [],
      organizations: [],
      learning_total_courses: 0,
      learning_by_year: [],
      recent_courses: [],
      top_endorsed_skills: [],
      articles_published: [],
      rich_media_posts_count: 0,
      rich_media_samples: [],
    },
    job_search: {
      applications_count: 0,
      saved_jobs_count: 0,
      applications_by_month: [],
      recent_applications: [],
      saved_jobs: [],
      saved_job_alerts: [],
      preferred_job_titles: [],
      open_to_recruiters_statement: "",
      resume_versions: [],
    },
    three_way_mirror: {
      real_self_today: [],
      peer_vouching: [],
      ad_algorithm_box: [],
      synthesis_narrative: "",
    },
    relationship_signature: {
      outbound_invitations_with_notes: 0,
      total_threads_analyzed: 0,
      sent_to_received_ratio_pct: 50,
      mentoring_recommendations_given: 0,
      sample_outbound_opener: "",
      communication_traits: [],
      synthesis_narrative: "",
    },
    curiosity_evolution: {
      early_foundations: [],
      public_voice_milestones: [],
      current_systems_edge: [],
      synthesis_narrative: "",
    },
  };

  const rawCandidatePrompts: Array<{ text: string; createdAt: string; convoId: string }> = [];
  const pushLiPrompt = (rawText: string, createdAt: string, convoId: string) => {
    const clean = stripPromptInjectionClient(rawText);
    if (clean.split(/\s+/).filter(Boolean).length < 8) return;
    rawCandidatePrompts.push({
      text: rawText, // keep original so scrubPromptClient counts prompt-injection redactions accurately
      createdAt: createdAt || "2026-06-15T14:00:00Z",
      convoId,
    });
  };

  const connYears = new Map<string, number>();
  const connCompanies = new Map<string, number>();
  const connPositions = new Map<string, number>();
  const msgYears = new Map<string, number>();
  const msgThreads = new Map<string, number>();
  const endorsementCounts = new Map<string, number>();
  const learningYears = new Map<string, number>();
  const appMonths = new Map<string, number>();
  const resumeCounts = new Map<string, number>();
  let userFullName = "";
  let articleCount = 0;

  // Pre-scan Profile.csv (or outgoing Invitations.csv) so userFullName is known
  // even when messages.csv appears earlier in the ZIP entry order.
  for (const entry of entries) {
    const lowerName = (entry.name ?? "").replace(/\\/g, "/").toLowerCase();
    const baseName = lowerName.split("/").pop() ?? lowerName;
    if (baseName === "profile.csv") {
      const { records } = parseCsvRecordsClient(entry.content);
      const rec = records[0];
      if (rec) {
        const candidate = `${rec["First Name"] ?? ""} ${rec["Last Name"] ?? ""}`.trim();
        if (candidate) {
          userFullName = candidate;
          break;
        }
      }
    } else if (baseName === "invitations.csv" && !userFullName) {
      const { records } = parseCsvRecordsClient(entry.content);
      for (const rec of records) {
        const dir = (rec["Direction"] ?? "").toUpperCase();
        if (dir.includes("OUTGOING")) {
          const fromName = (rec["From"] ?? "").trim();
          if (fromName) {
            userFullName = fromName;
            break;
          }
        }
      }
    }
  }

  for (const entry of entries) {
    const normName = (entry.name ?? "").replace(/\\/g, "/");
    const lowerName = normName.toLowerCase();
    const baseName = lowerName.split("/").pop() ?? lowerName;

    if (lowerName.endsWith(".html")) {
      const h1Match = entry.content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = h1Match
        ? stripHtmlSimple(h1Match[1])
        : baseName.replace(/\.html$/i, "");
      const pubMatch = entry.content.match(/<p\s+class=['"]published['"][^>]*>([\s\S]*?)<\/p>/i);
      const pubRaw = pubMatch
        ? stripHtmlSimple(pubMatch[1]).replace(/^Published on\s*/i, "")
        : "";
      const pubIso = normalizeLinkedInDateClient(pubRaw) ?? "2018-06-15T12:00:00Z";
      const bodyText = stripPromptInjectionClient(stripHtmlSimple(entry.content));
      const excerpt = bodyText.slice(0, 220);

      if (title) {
        articleCount += 1;
        analytics.total_files_parsed += 1;
        analytics.total_rows_parsed += 1;
        analytics.career_learning.articles_published.push({
          title,
          published_date: pubIso.slice(0, 10),
          excerpt,
        });
        pushLiPrompt(
          `LinkedIn Published Article (${title}): ${bodyText}`,
          pubIso,
          `li-article-${articleCount}`
        );
      }
      continue;
    }

    if (!lowerName.endsWith(".csv") && !isLinkedInEntryClient(normName, entry.content)) {
      continue;
    }

    const { headers, records } = parseCsvRecordsClient(entry.content);
    if (headers.length === 0) continue;

    analytics.total_files_parsed += 1;
    analytics.total_rows_parsed += records.length;

    const { clusterId, clusterLabel, purpose } = classifyLinkedInFileClusterClient(normName);
    const fileDates: string[] = [];
    for (const rec of records) {
      for (const val of Object.values(rec)) {
        if (val.length >= 4 && val.length <= 48) {
          const iso = normalizeLinkedInDateClient(val);
          if (iso) fileDates.push(iso.slice(0, 10));
        }
      }
    }
    fileDates.sort();
    const dateRange =
      fileDates.length >= 2 && fileDates[0] !== fileDates[fileDates.length - 1]
        ? `${fileDates[0]} → ${fileDates[fileDates.length - 1]}`
        : fileDates[0] ?? "Profile Snapshot";

    const uniqueHeaders: string[] = [];
    for (const h of headers) {
      if (h && !uniqueHeaders.includes(h) && uniqueHeaders.length < 6) {
        uniqueHeaders.push(h);
      }
    }

    const parts = normName.split("/");
    const displayName =
      parts.length >= 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : normName;

    analytics.file_summaries.push({
      file_name: displayName,
      cluster_id: clusterId,
      cluster_label: clusterLabel,
      row_count: records.length,
      date_range: dateRange,
      key_fields: uniqueHeaders,
      plain_english_description: purpose,
    });

    switch (baseName) {
      case "profile.csv": {
        const rec = records[0];
        if (rec) {
          const first = rec["First Name"] ?? "";
          const last = rec["Last Name"] ?? "";
          userFullName = `${first} ${last}`.trim();
          analytics.career_learning.profile_headline = stripPromptInjectionClient(
            rec["Headline"] ?? ""
          );
          analytics.career_learning.profile_industry = stripPromptInjectionClient(
            rec["Industry"] ?? ""
          );
          analytics.career_learning.profile_location = stripPromptInjectionClient(
            rec["Geo Location"] ?? ""
          );
          const rawSummary = rec["Summary"] ?? "";
          analytics.career_learning.profile_summary = stripPromptInjectionClient(rawSummary);
          if (rawSummary.trim()) {
            pushLiPrompt(
              `LinkedIn Profile Headline & Summary (${analytics.career_learning.profile_headline}): ${rawSummary}`,
              "2026-10-01T12:00:00Z",
              "li-profile-summary"
            );
          }
        }
        break;
      }
      case "positions.csv": {
        records.forEach((rec, idx) => {
          const title = stripPromptInjectionClient(rec["Title"] ?? "");
          const company = stripPromptInjectionClient(rec["Company Name"] ?? "");
          const started_on = rec["Started On"] ?? "";
          const finished_on = rec["Finished On"] || "Present";
          const location = rec["Location"] ?? "";
          const description = stripPromptInjectionClient(rec["Description"] ?? "");
          const iso = normalizeLinkedInDateClient(started_on) ?? "2024-01-01T12:00:00Z";
          if (description) {
            pushLiPrompt(
              `LinkedIn Role (${title} at ${company}): ${description}`,
              iso,
              `li-pos-${idx + 1}`
            );
          }
          analytics.career_learning.positions.push({
            title,
            company,
            started_on,
            finished_on,
            location,
            description,
          });
        });
        break;
      }
      case "education.csv": {
        for (const rec of records) {
          analytics.career_learning.education.push({
            school: stripPromptInjectionClient(rec["School Name"] ?? ""),
            degree: stripPromptInjectionClient(rec["Degree Name"] ?? ""),
            start_date: rec["Start Date"] ?? "",
            end_date: rec["End Date"] ?? "",
            notes: stripPromptInjectionClient(rec["Notes"] ?? ""),
          });
        }
        break;
      }
      case "certifications.csv": {
        for (const rec of records) {
          const name = stripPromptInjectionClient(rec["Name"] ?? "");
          const auth = stripPromptInjectionClient(rec["Authority"] ?? "");
          if (name) {
            analytics.career_learning.certifications.push(auth ? `${name} (${auth})` : name);
          }
        }
        break;
      }
      case "projects.csv": {
        records.forEach((rec, idx) => {
          const title = stripPromptInjectionClient(rec["Title"] ?? "");
          const desc = stripPromptInjectionClient(rec["Description"] ?? "");
          const started = rec["Started On"] ?? "";
          if (title) {
            analytics.career_learning.projects.push(desc ? `${title}: ${desc}` : title);
            if (desc) {
              const iso = normalizeLinkedInDateClient(started) ?? "2020-01-01T12:00:00Z";
              pushLiPrompt(`LinkedIn Project (${title}): ${desc}`, iso, `li-proj-${idx + 1}`);
            }
          }
        });
        break;
      }
      case "honors.csv": {
        for (const rec of records) {
          const title = stripPromptInjectionClient(rec["Title"] ?? "");
          if (title) analytics.career_learning.honors.push(title);
        }
        break;
      }
      case "organizations.csv": {
        for (const rec of records) {
          const name = stripPromptInjectionClient(rec["Name"] ?? "");
          const pos = stripPromptInjectionClient(rec["Position"] ?? "");
          if (name) {
            analytics.career_learning.organizations.push(pos ? `${name} — ${pos}` : name);
          }
        }
        break;
      }
      case "skills.csv": {
        for (const rec of records) {
          const skill = stripPromptInjectionClient(rec["Name"] ?? "");
          if (
            skill &&
            !analytics.ad_targeting.declared_profile_skills.some(
              (s) => s.toLowerCase() === skill.toLowerCase()
            )
          ) {
            analytics.ad_targeting.declared_profile_skills.push(skill);
          }
        }
        break;
      }
      case "endorsement_received_info.csv": {
        analytics.messaging.endorsements_received_count += records.length;
        for (const rec of records) {
          const skill = stripPromptInjectionClient(rec["Skill Name"] ?? "");
          if (skill) {
            endorsementCounts.set(skill, (endorsementCounts.get(skill) ?? 0) + 1);
          }
        }
        break;
      }
      case "endorsement_given_info.csv": {
        analytics.messaging.endorsements_given_count += records.length;
        break;
      }
      case "recommendations_received.csv": {
        analytics.messaging.recommendations_received_count += records.length;
        records.forEach((rec, idx) => {
          const first = rec["First Name"] ?? "";
          const last = rec["Last Name"] ?? "";
          const comp = rec["Company"] ?? "";
          const title = rec["Job Title"] ?? "";
          const text = stripPromptInjectionClient(rec["Text"] ?? "");
          const created = rec["Creation Date"] ?? "";
          const status = rec["Status"] ?? "";
          const iso = normalizeLinkedInDateClient(created) ?? "2022-05-01T12:00:00Z";
          analytics.messaging.recommendations_received.push({
            person_name: `${first} ${last}`.trim(),
            role_company: `${title} at ${comp}`.trim(),
            date: iso.slice(0, 10),
            status,
            excerpt: text,
          });
          if (text) {
            pushLiPrompt(
              `Peer Recommendation Received from ${first} ${last} (${title} at ${comp}): ${text}`,
              iso,
              `li-rec-recv-${idx + 1}`
            );
          }
        });
        break;
      }
      case "recommendations_given.csv": {
        analytics.messaging.recommendations_given_count += records.length;
        records.forEach((rec, idx) => {
          const first = rec["First Name"] ?? "";
          const last = rec["Last Name"] ?? "";
          const comp = rec["Company"] ?? "";
          const title = rec["Job Title"] ?? "";
          const text = stripPromptInjectionClient(rec["Text"] ?? "");
          const created = rec["Creation Date"] ?? "";
          const iso = normalizeLinkedInDateClient(created) ?? "2022-05-01T12:00:00Z";
          analytics.messaging.recommendations_given.push({
            person_name: `${first} ${last}`.trim(),
            role_company: `${title} at ${comp}`.trim(),
            date: iso.slice(0, 10),
            status: "PUBLISHED",
            excerpt: text,
          });
          if (text) {
            pushLiPrompt(
              `Mentoring & Peer Recommendation Authored for ${first} ${last} (${title} at ${comp}): ${text}`,
              iso,
              `li-rec-given-${idx + 1}`
            );
          }
        });
        break;
      }
      case "connections.csv": {
        analytics.network.total_connections += records.length;
        for (const rec of records) {
          const comp = stripPromptInjectionClient(rec["Company"] ?? "");
          const pos = stripPromptInjectionClient(rec["Position"] ?? "");
          const connOn = rec["Connected On"] ?? "";
          if (comp) connCompanies.set(comp, (connCompanies.get(comp) ?? 0) + 1);
          if (pos) connPositions.set(pos, (connPositions.get(pos) ?? 0) + 1);
          const iso = normalizeLinkedInDateClient(connOn);
          if (iso) {
            const yr = iso.slice(0, 4);
            connYears.set(yr, (connYears.get(yr) ?? 0) + 1);
          }
        }
        break;
      }
      case "invitations.csv": {
        records.forEach((rec, idx) => {
          const dir = (rec["Direction"] ?? "").toUpperCase();
          if (dir.includes("OUTGOING")) analytics.network.invitations_sent += 1;
          else if (dir.includes("INCOMING")) analytics.network.invitations_received += 1;
          const msg = stripPromptInjectionClient(rec["Message"] ?? "");
          if (msg && dir.includes("OUTGOING")) {
            analytics.relationship_signature.outbound_invitations_with_notes += 1;
            if (!analytics.relationship_signature.sample_outbound_opener) {
              analytics.relationship_signature.sample_outbound_opener = msg;
            }
            const sentAt = rec["Sent At"] ?? "";
            const iso = normalizeLinkedInDateClient(sentAt) ?? "2026-08-01T14:00:00Z";
            pushLiPrompt(`LinkedIn Outbound Connection Note: ${msg}`, iso, `li-invite-${idx + 1}`);
          }
        });
        break;
      }
      case "messages.csv": {
        analytics.messaging.total_messages += records.length;
        records.forEach((rec, idx) => {
          const from = rec["FROM"] ?? "";
          const to = rec["TO"] ?? "";
          const dateRaw = rec["DATE"] ?? "";
          const contentRaw = stripPromptInjectionClient(rec["CONTENT"] ?? "");
          const isSent =
            (Boolean(userFullName) && from.toLowerCase() === userFullName.toLowerCase()) ||
            from.toLowerCase() === "alex rivera";

          if (isSent) analytics.messaging.sent_messages += 1;
          else analytics.messaging.received_messages += 1;

          const interlocutor = stripPromptInjectionClient(isSent ? to : from);
          if (interlocutor && interlocutor.toLowerCase() !== "linkedin member") {
            msgThreads.set(interlocutor, (msgThreads.get(interlocutor) ?? 0) + 1);
          }

          const iso = normalizeLinkedInDateClient(dateRaw);
          if (iso) {
            const yr = iso.slice(0, 4);
            msgYears.set(yr, (msgYears.get(yr) ?? 0) + 1);
            if (isSent && contentRaw.split(/\s+/).length >= 18 && idx < 45) {
              pushLiPrompt(contentRaw, iso, `li-msg-${idx + 1}`);
            }
          }
        });
        break;
      }
      case "company follows.csv": {
        analytics.network.company_follows_count += records.length;
        for (const rec of records.slice(0, 12)) {
          const org = stripPromptInjectionClient(rec["Organization"] ?? "");
          if (org) analytics.network.followed_companies_sample.push(org);
        }
        break;
      }
      case "ad_targeting.csv": {
        const rec = records[0];
        if (rec) {
          analytics.ad_targeting.member_age = rec["Member Age"] ?? "";
          analytics.ad_targeting.years_of_experience = rec["Years of Experience"] ?? "";
          analytics.ad_targeting.high_value_segments = splitSemicolonUniqueClient(
            rec["High Value Audience Segments"] ?? ""
          );
          analytics.ad_targeting.buyer_groups = splitSemicolonUniqueClient(
            rec["Buyer Groups"] ?? ""
          );
          analytics.ad_targeting.inferred_job_titles = splitSemicolonUniqueClient(
            rec["Job Titles"] ?? ""
          );
          analytics.ad_targeting.job_seniorities = splitSemicolonUniqueClient(
            rec["Job Seniorities"] ?? ""
          );
          analytics.ad_targeting.company_industries = splitSemicolonUniqueClient(
            rec["Company Industries"] ?? ""
          );
          analytics.ad_targeting.member_interests = splitSemicolonUniqueClient(
            rec["Member Interests"] ?? ""
          );
          analytics.ad_targeting.member_traits = splitSemicolonUniqueClient(
            rec["Member Traits"] ?? ""
          );
          analytics.ad_targeting.ad_inferred_skills = splitSemicolonUniqueClient(
            rec["Member Skills"] ?? ""
          );
        }
        break;
      }
      case "learning.csv": {
        analytics.career_learning.learning_total_courses += records.length;
        for (const rec of records) {
          const title = stripPromptInjectionClient(rec["Content Title"] ?? "");
          const lastWatched =
            rec["Content Last Watched Date (if viewed)"] ||
            rec["Content Completed At (if completed)"] ||
            "";
          if (title && analytics.career_learning.recent_courses.length < 12) {
            analytics.career_learning.recent_courses.push(title);
          }
          const iso = normalizeLinkedInDateClient(lastWatched);
          if (iso) {
            const yr = iso.slice(0, 4);
            learningYears.set(yr, (learningYears.get(yr) ?? 0) + 1);
          }
        }
        break;
      }
      case "rich_media.csv": {
        analytics.career_learning.rich_media_posts_count += records.length;
        records.forEach((rec, idx) => {
          const desc = stripPromptInjectionClient(rec["Media Description"] ?? "");
          const dateRaw = rec["Date/Time"] ?? "";
          if (desc) {
            if (analytics.career_learning.rich_media_samples.length < 8) {
              analytics.career_learning.rich_media_samples.push(desc);
            }
            const iso = normalizeLinkedInDateClient(dateRaw) ?? "2026-10-15T14:00:00Z";
            pushLiPrompt(`LinkedIn Post / Rich Media Update: ${desc}`, iso, `li-media-${idx + 1}`);
          }
        });
        break;
      }
      case "job applications.csv": {
        analytics.job_search.applications_count += records.length;
        for (const rec of records) {
          const appDate = rec["Application Date"] ?? "";
          const company = stripPromptInjectionClient(rec["Company Name"] ?? "");
          const jobTitle = stripPromptInjectionClient(rec["Job Title"] ?? "");
          const resumeName = stripPromptInjectionClient(rec["Resume Name"] ?? "");
          if (resumeName) {
            resumeCounts.set(resumeName, (resumeCounts.get(resumeName) ?? 0) + 1);
          }
          const iso = normalizeLinkedInDateClient(appDate) ?? "";
          const dateLabel = iso.length >= 10 ? iso.slice(0, 10) : appDate;
          if (iso.length >= 7) {
            const ym = iso.slice(0, 7);
            appMonths.set(ym, (appMonths.get(ym) ?? 0) + 1);
          }
          if (jobTitle && analytics.job_search.recent_applications.length < 15) {
            analytics.job_search.recent_applications.push({
              job_title: jobTitle,
              company,
              applied_date: dateLabel,
              resume_name: resumeName,
            });
          }
        }
        break;
      }
      case "saved jobs.csv": {
        analytics.job_search.saved_jobs_count += records.length;
        for (const rec of records) {
          const savedDate = rec["Saved Date"] ?? "";
          const company = stripPromptInjectionClient(rec["Company Name"] ?? "");
          const jobTitle = stripPromptInjectionClient(rec["Job Title"] ?? "");
          const iso = normalizeLinkedInDateClient(savedDate) ?? "";
          const dateLabel = iso.length >= 10 ? iso.slice(0, 10) : savedDate;
          if (jobTitle && analytics.job_search.saved_jobs.length < 12) {
            analytics.job_search.saved_jobs.push({
              job_title: jobTitle,
              company,
              saved_date: dateLabel,
            });
          }
        }
        break;
      }
      case "savedjobalerts.csv": {
        for (const rec of records) {
          const qc = rec["QUERY_CONTEXT"] || rec["Query"] || "";
          const m = qc.match(/keywords=([^,}]+)/);
          const kw = stripPromptInjectionClient(m ? m[1] : qc);
          if (kw && !analytics.job_search.saved_job_alerts.includes(kw)) {
            analytics.job_search.saved_job_alerts.push(kw);
          }
        }
        break;
      }
      case "job seeker preferences.csv": {
        const rec = records[0];
        if (rec) {
          analytics.job_search.preferred_job_titles = splitSemicolonUniqueClient(
            rec["Preferred Job Titles"] ?? ""
          );
          const stmt = stripPromptInjectionClient(rec["Open To Recruiters Statement"] ?? "");
          analytics.job_search.open_to_recruiters_statement = stmt;
          if (stmt) {
            pushLiPrompt(
              `LinkedIn Job Seeker Recruiter Positioning Statement: ${stmt}`,
              "2026-10-15T12:00:00Z",
              "li-recruiter-statement"
            );
          }
        }
        break;
      }
      case "private_identity_asset.csv": {
        for (const rec of records) {
          const asset = stripPromptInjectionClient(rec["private_identity_asset"] ?? "");
          if (asset && !resumeCounts.has(asset)) {
            resumeCounts.set(asset, 1);
          }
        }
        break;
      }
    }
  }

  if (analytics.career_learning.articles_published.length > 0) {
    const dates = analytics.career_learning.articles_published
      .map((a) => a.published_date)
      .sort();
    const range =
      dates.length >= 2 && dates[0] !== dates[dates.length - 1]
        ? `${dates[0]} → ${dates[dates.length - 1]}`
        : dates[0] ?? "Published Archive";
    analytics.file_summaries.push({
      file_name: `Articles/*.html (${analytics.career_learning.articles_published.length} files)`,
      cluster_id: "algorithmic_learning_voice",
      cluster_label: "5. Algorithmic Profile, Learning & Voice",
      row_count: analytics.career_learning.articles_published.length,
      date_range: range,
      key_fields: ["<h1> Title", "Published Date", "Article Body HTML"],
      plain_english_description:
        "Long-form thought leadership articles authored and published on LinkedIn.",
    });
  }

  analytics.network.connections_by_year = Array.from(connYears.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  analytics.network.top_companies = Array.from(connCompanies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  analytics.network.top_positions = Array.from(connPositions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  analytics.messaging.messages_by_year = Array.from(msgYears.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const sortedThreads = Array.from(msgThreads.entries()).sort((a, b) => b[1] - a[1]);
  analytics.relationship_signature.total_threads_analyzed = sortedThreads.length;
  analytics.messaging.top_threads = sortedThreads.slice(0, 10);

  analytics.career_learning.top_endorsed_skills = Array.from(endorsementCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  analytics.career_learning.learning_by_year = Array.from(learningYears.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  analytics.job_search.applications_by_month = Array.from(appMonths.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  analytics.job_search.resume_versions = Array.from(resumeCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const declaredLower = new Set(
    analytics.ad_targeting.declared_profile_skills.map((s) => s.toLowerCase())
  );
  const adLower = new Set(analytics.ad_targeting.ad_inferred_skills.map((s) => s.toLowerCase()));

  analytics.ad_targeting.skills_overlap_count =
    analytics.ad_targeting.declared_profile_skills.filter((s) =>
      adLower.has(s.toLowerCase())
    ).length;

  analytics.ad_targeting.skills_only_in_ad_engine = analytics.ad_targeting.ad_inferred_skills
    .filter((s) => !declaredLower.has(s.toLowerCase()))
    .slice(0, 24);

  analytics.ad_targeting.skills_only_in_profile = analytics.ad_targeting.declared_profile_skills
    .filter((s) => !adLower.has(s.toLowerCase()))
    .slice(0, 24);

  // Section 3: What It Says About You
  const realSelf: string[] = [];
  if (analytics.career_learning.profile_headline) {
    realSelf.push(`Headline: ${analytics.career_learning.profile_headline}`);
  }
  for (const alert of analytics.job_search.saved_job_alerts.slice(0, 4)) {
    realSelf.push(`Active Search Target: ${alert}`);
  }
  for (const pref of analytics.job_search.preferred_job_titles.slice(0, 3)) {
    realSelf.push(`Preferred Role: ${pref}`);
  }
  for (const pos of analytics.career_learning.positions.slice(0, 2)) {
    realSelf.push(`Recent Role: ${pos.title} at ${pos.company}`);
  }

  const peerVouch: string[] = [];
  for (const [skill, cnt] of analytics.career_learning.top_endorsed_skills.slice(0, 5)) {
    peerVouch.push(`Endorsed ${cnt}x for ${skill}`);
  }
  for (const rec of analytics.messaging.recommendations_received.slice(0, 3)) {
    peerVouch.push(`${rec.person_name} (${rec.role_company}): "${rec.excerpt.slice(0, 110)}…"`);
  }

  const adBox: string[] = [];
  for (const title of analytics.ad_targeting.inferred_job_titles.slice(0, 6)) {
    adBox.push(`Inferred Title: ${title}`);
  }
  for (const seg of analytics.ad_targeting.high_value_segments.slice(0, 4)) {
    adBox.push(`Ad Segment: ${seg}`);
  }
  for (const bg of analytics.ad_targeting.buyer_groups.slice(0, 3)) {
    adBox.push(`Buyer Group: ${bg}`);
  }

  const targetFocus =
    analytics.job_search.saved_job_alerts[0] ||
    analytics.career_learning.profile_headline ||
    "AI & Systems Leadership";

  analytics.three_way_mirror = {
    real_self_today: realSelf,
    peer_vouching: peerVouch,
    ad_algorithm_box: adBox,
    synthesis_narrative: `Your active positioning targets '${targetFocus}' (${analytics.job_search.applications_count} job applications & ${analytics.job_search.saved_job_alerts.length} saved alerts), and peers vouch for your leadership across ${analytics.messaging.endorsements_received_count} endorsements and ${analytics.messaging.recommendations_received_count} written recommendations. However, LinkedIn's Ad-Targeting engine still classifies you across ${analytics.ad_targeting.inferred_job_titles.length} inferred job titles and ${analytics.ad_targeting.ad_inferred_skills.length} ad-inferred skills (${analytics.ad_targeting.skills_only_in_ad_engine.length} of which are legacy tags not on your profile)—revealing why algorithmic recruiter feeds often lag behind your real-time AI and systems pivot.`,
  };

  const sentPct =
    analytics.messaging.total_messages > 0
      ? Math.round(
          (analytics.messaging.sent_messages / analytics.messaging.total_messages) * 100
        )
      : 50;
  analytics.relationship_signature.sent_to_received_ratio_pct = sentPct;
  analytics.relationship_signature.mentoring_recommendations_given =
    analytics.messaging.recommendations_given_count;
  analytics.relationship_signature.communication_traits = [
    `${analytics.network.invitations_sent} outbound invitations sent vs. ${analytics.network.invitations_received} incoming (${analytics.relationship_signature.outbound_invitations_with_notes} with custom personal notes)`,
    `${analytics.messaging.total_messages} total messages across ${analytics.relationship_signature.total_threads_analyzed} active 1:1 threads (${sentPct}% outbound initiation balance)`,
    `High-generosity peer advocacy: ${analytics.messaging.recommendations_given_count} written recommendations given and ${analytics.messaging.endorsements_given_count} skill endorsements given`,
  ];
  analytics.relationship_signature.synthesis_narrative = `Across ${analytics.messaging.total_messages} direct messages and ${analytics.network.invitations_sent + analytics.network.invitations_received} connection invitations, you operate as a high-context relationship builder: you have written ${analytics.messaging.recommendations_given_count} formal recommendations and given ${analytics.messaging.endorsements_given_count} endorsements to lift up collaborators, while initiating custom outreach notes that lead with shared domain context rather than transactional templates.`;

  const earlyFoundations: string[] = [];
  for (const course of analytics.career_learning.recent_courses.slice(0, 4)) {
    earlyFoundations.push(`Learning Course: ${course}`);
  }
  for (const proj of analytics.career_learning.projects.slice(0, 3)) {
    earlyFoundations.push(`Shipped Project: ${proj.slice(0, 90)}`);
  }

  const publicVoice: string[] = [];
  for (const art of analytics.career_learning.articles_published.slice(0, 4)) {
    publicVoice.push(`Article (${art.published_date}): ${art.title}`);
  }
  for (const media of analytics.career_learning.rich_media_samples.slice(0, 3)) {
    publicVoice.push(`Feed Post: ${media.slice(0, 95)}…`);
  }

  const currentEdge: string[] = [];
  for (const pos of analytics.career_learning.positions.slice(0, 2)) {
    currentEdge.push(`Current/Recent Leadership: ${pos.title} (${pos.company})`);
  }
  for (const alert of analytics.job_search.saved_job_alerts.slice(0, 3)) {
    currentEdge.push(`Next-Gen Positioning: ${alert}`);
  }
  for (const resume of analytics.job_search.resume_versions.slice(0, 2)) {
    currentEdge.push(`Positioning Asset: ${resume[0]} (${resume[1]} applications)`);
  }

  analytics.curiosity_evolution = {
    early_foundations: earlyFoundations,
    public_voice_milestones: publicVoice,
    current_systems_edge: currentEdge,
    synthesis_narrative: `Your trajectory spans ${analytics.career_learning.learning_total_courses} LinkedIn Learning courses, ${analytics.career_learning.projects.length} shipped projects, ${analytics.career_learning.articles_published.length} long-form articles, and ${analytics.career_learning.rich_media_posts_count} rich-media posts—evolving from foundational digital production and interactive media into full-stack AI systems architecture, programmatic growth, and technical product leadership.`,
  };

  return { analytics, rawCandidatePrompts };
}

/**
 * 100% Anonymized Sample LinkedIn Archive covering all 5 Domain Clusters, all 5 Visualization Modules,
 * and the 3-Way Identity Mirror out of the box when clicking "Load Sample Vault".
 */
export const SAMPLE_ANONYMIZED_LINKEDIN_ENTRIES: LinkedInArchiveEntry[] = [
  {
    name: "Profile.csv",
    content:
      'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\n' +
      'Alex,Rivera,,,,Principal AI Systems Architect & Technical Product Director,"I want to architect automated data pipelines, deterministic schema compilers, and MCP agent workflows using Rust, TypeScript, and SQLite so engineering teams eliminate manual maintenance and scale system throughput with clear unit economics.",Software Development,98101,"Seattle, Washington",,[OTHER:https://alexrivera.example.dev],\n',
  },
  {
    name: "Positions.csv",
    content:
      "Company Name,Title,Description,Location,Started On,Finished On\n" +
      'Vertex Systems AI,Principal Systems Architect,"Architected distributed telemetry pipelines, deterministic schema compilers, and automated agentic orchestration workflows with measurable unit economics and system throughput.","Seattle, WA",Jan 2024,\n' +
      'NovaFlow Interactive,Director of Platform Engineering,"Led cross-functional engineering and interactive simulation architecture, replacing repetitive manual maintenance with programmatic build pipelines and telemetry routing.","Austin, TX",Mar 2020,Dec 2023\n' +
      'Meridian Digital Studio,Senior Technical Producer,"Directed digital media pipelines, real-time 3D interactive tools, and stakeholder delivery workflows across enterprise product launches.","San Francisco, CA",Jun 2016,Feb 2020\n',
  },
  {
    name: "Education.csv",
    content:
      "School Name,Start Date,End Date,Notes,Degree Name,Activities and societies\n" +
      "Pacific Northwest Institute of Technology,2011,2015,Graduated with Honors in Systems Engineering & Interactive Computing,B.S. Computer Science & Digital Systems,Systems Architecture Society\n",
  },
  {
    name: "Certifications.csv",
    content:
      "Name,Url,Authority,Started On,Finished On,License Number\n" +
      "Distributed Systems & Telemetry Architecture,https://example.org/cert/1,Cloud Native Computing Foundation,Jan 2025,,CNCF-9921\n" +
      "Programmatic Growth & Product Strategy,https://example.org/cert/2,Reforge Executive Track,Jun 2023,,RFG-4410\n",
  },
  {
    name: "Projects.csv",
    content:
      "Title,Description,Url,Started On,Finished On\n" +
      'Open-Core Schema Compiler,"Designed a deterministic Rust and TypeScript schema compiler that eliminates manual API boilerplate and enforces zero-knowledge PII scrubbing.",https://example.dev/schema-compiler,Feb 2025,Present\n' +
      'Interactive Economy Telemetry Engine,"Built a homeostatic simulation and telemetry routing pipeline for real-time user progression analytics.",https://example.dev/telemetry-engine,May 2022,Nov 2023\n',
  },
  {
    name: "Honors.csv",
    content:
      "Title,Description,Issued On\n" +
      "Best Developer Tooling Innovation Award,Recognized for reducing cross-team deployment latency by 68% through automated pipeline verification.,Nov 2024\n",
  },
  {
    name: "Organizations.csv",
    content:
      "Name,Description,Position,Started On,Finished On\n" +
      "Local-First Software Alliance,Community of engineers building zero-cloud local-first desktop software.,Working Group Contributor,Jan 2024,Present\n",
  },
  {
    name: "Skills.csv",
    content:
      "Name\nRust\nTypeScript\nSystems Architecture\nSQLite\nAgentic Workflows\nTelemetry Pipelines\nProduct Strategy\nUnit Economics\nDeterministic Compilers\n",
  },
  {
    name: "Endorsement_Received_Info.csv",
    content:
      "Endorsement Date,Skill Name,Endorser First Name,Endorser Last Name,Endorser Public Url,Endorsement Status\n" +
      "2026/02/10 18:20:00 UTC,Systems Architecture,Jordan,Lee,www.linkedin.com/in/jlee,ACCEPTED\n" +
      "2026/01/15 14:10:00 UTC,Systems Architecture,Elena,Vance,www.linkedin.com/in/evance,ACCEPTED\n" +
      "2025/11/04 09:30:00 UTC,Systems Architecture,Marcus,Chen,www.linkedin.com/in/mchen,ACCEPTED\n" +
      "2025/10/19 16:45:00 UTC,Product Strategy,Sarah,Jenkins,www.linkedin.com/in/sjenkins,ACCEPTED\n" +
      "2025/09/12 11:15:00 UTC,Product Strategy,David,Kim,www.linkedin.com/in/dkim,ACCEPTED\n" +
      "2025/08/01 15:00:00 UTC,Telemetry Pipelines,Priya,Patel,www.linkedin.com/in/ppatel,ACCEPTED\n" +
      "2025/07/22 10:00:00 UTC,Rust,Liam,O'Connor,www.linkedin.com/in/loconnor,ACCEPTED\n",
  },
  {
    name: "Endorsement_Given_Info.csv",
    content:
      "Endorsement Date,Skill Name,Endorsee First Name,Endorsee Last Name,Endorsee Public Url,Endorsement Status\n" +
      "2026/02/11 19:00:00 UTC,Distributed Systems,Jordan,Lee,www.linkedin.com/in/jlee,ACCEPTED\n" +
      "2025/12/05 12:30:00 UTC,Product Design,Elena,Vance,www.linkedin.com/in/evance,ACCEPTED\n" +
      "2025/09/14 08:20:00 UTC,TypeScript,Marcus,Chen,www.linkedin.com/in/mchen,ACCEPTED\n",
  },
  {
    name: "Recommendations_Received.csv",
    content:
      "First Name,Last Name,Company,Job Title,Text,Creation Date,Status\n" +
      'Jordan,Lee,Vertex Systems AI,VP of Engineering,"Alex has a rare superpower: whenever our engineering organization hits a complex bottleneck, Alex translates the messy workflow into a clean, deterministic system architecture that scales effortlessly across teams.","05/14/25, 10:30 AM",VISIBLE\n' +
      'Elena,Vance,NovaFlow Interactive,Chief Product Officer,"Working with Alex transformed how we bridge deep backend telemetry with clear human product value and unit economics. A true force-multiplier leader.","11/18/23, 04:15 PM",VISIBLE\n',
  },
  {
    name: "Recommendations_Given.csv",
    content:
      "First Name,Last Name,Company,Job Title,Text,Creation Date\n" +
      'Marcus,Chen,Vertex Systems AI,Senior Staff Engineer,"Marcus brings rigorous first-principles thinking to every distributed schema design and consistently mentors junior engineers with patience and clarity.","08/22/25, 02:10 PM"\n' +
      'Priya,Patel,NovaFlow Interactive,Lead Platform Engineer,"Priya architected our real-time telemetry ingestion layer from scratch, turning a high-friction maintenance chore into a rock-solid automated pipeline.","12/02/23, 11:05 AM"\n',
  },
  {
    name: "Connections.csv",
    content:
      'Notes:\n"When exporting your connection data, you may notice that some email addresses are missing."\n\n' +
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n" +
      "Jordan,Lee,https://www.linkedin.com/in/jlee,,Vertex Systems AI,VP of Engineering,28 Oct 2026\n" +
      "Elena,Vance,https://www.linkedin.com/in/evance,,Vertex Systems AI,Principal Architect,14 Sep 2026\n" +
      "Marcus,Chen,https://www.linkedin.com/in/mchen,,Vertex Systems AI,Senior Staff Engineer,03 May 2025\n" +
      "Priya,Patel,https://www.linkedin.com/in/ppatel,,NovaFlow Interactive,Lead Platform Engineer,19 Aug 2025\n" +
      "Sarah,Jenkins,https://www.linkedin.com/in/sjenkins,,NovaFlow Interactive,Director of Product,11 Nov 2024\n" +
      "David,Kim,https://www.linkedin.com/in/dkim,,Apex Cloud Systems,Founder & CEO,22 Apr 2024\n" +
      "Liam,O'Connor,https://www.linkedin.com/in/loconnor,,Apex Cloud Systems,Principal Systems Engineer,09 Jul 2023\n" +
      "Hannah,Abbott,https://www.linkedin.com/in/habbott,,Meridian Digital Studio,Creative Technologist,15 Feb 2022\n",
  },
  {
    name: "Company Follows.csv",
    content:
      "Organization,Followed On\n" +
      "Anthropic,Mon Oct 26 14:51:42 GMT 2026\n" +
      "OpenAI,Tue Sep 15 10:20:00 GMT 2026\n" +
      "Stripe,Wed Aug 12 09:00:00 GMT 2025\n" +
      "Vercel,Fri May 02 16:30:00 GMT 2025\n",
  },
  {
    name: "Invitations.csv",
    content:
      "From,To,Sent At,Message,Direction,inviterProfileUrl,inviteeProfileUrl\n" +
      'Alex Rivera,Jordan Lee,"10/12/26, 9:15 AM","Hi Jordan — loved your breakdown on deterministic local-first SQLite architectures and agentic telemetry pipelines. Would love to connect and compare notes on schema compilers.",OUTGOING,https://www.linkedin.com/in/arivera,https://www.linkedin.com/in/jlee\n' +
      'Alex Rivera,David Kim,"09/04/26, 2:40 PM","Hi David — saw your team is scaling multi-provider AI orchestration workflows with clear unit economics. Connecting to share our open-core architecture benchmarks.",OUTGOING,https://www.linkedin.com/in/arivera,https://www.linkedin.com/in/dkim\n' +
      'Sarah Jenkins,Alex Rivera,"08/19/25, 4:10 PM",,INCOMING,https://www.linkedin.com/in/sjenkins,https://www.linkedin.com/in/arivera\n',
  },
  {
    name: "messages.csv",
    content:
      "CONVERSATION ID,CONVERSATION TITLE,FROM,SENDER PROFILE URL,TO,RECIPIENT PROFILE URLS,DATE,SUBJECT,CONTENT,FOLDER,ATTACHMENTS\n" +
      'conv-1,,Alex Rivera,https://www.linkedin.com/in/arivera,Jordan Lee,https://www.linkedin.com/in/jlee,2026-10-20 19:30:00 UTC,,"Whenever our engineering workflow hits a bottleneck, my reflex is to build a deterministic schema compiler or automated pipeline that makes the complex architecture simple and clear for every user.",INBOX,\n' +
      'conv-1,,Jordan Lee,https://www.linkedin.com/in/jlee,Alex Rivera,https://www.linkedin.com/in/arivera,2026-10-20 20:05:00 UTC,,"Completely agree—having local-first SQLite verification saves so much maintenance overhead.",INBOX,\n' +
      'conv-2,,Alex Rivera,https://www.linkedin.com/in/arivera,Elena Vance,https://www.linkedin.com/in/evance,2025-11-12 17:15:00 UTC,,"Let us review the telemetry routing tradeoffs and unit economics before locking the Q1 platform roadmap.",INBOX,\n',
  },
  {
    name: "Ad_Targeting.csv",
    content:
      "Member Age,Buyer Groups,Company Names,Company Names,High Value Audience Segments,Job Seniorities,Job Titles,Job Titles,Member Skills,Company Industries,Member Interests,Member Traits,Years of Experience\n" +
      "35 to 54,Tech Decision Makers; Enterprise Architecture Buyers; Senior Leadership,Vertex Systems AI,Meridian Digital Studio,AI Decision Makers; Cloud Platform Leaders; B2B SaaS Executives,Director; VP; Senior IC,Creative Producer; Multimedia Manager,Video Production Specialist; Technical Director,Rust; Systems Architecture; Legacy Flash Video; ActionScript; Broadcast Television; Digital Storytelling,Computer Software; Internet,Artificial Intelligence; Distributed Systems; Venture Strategy,Early Adopters; Frequent Contributors,12+ years\n",
  },
  {
    name: "Learning.csv",
    content:
      "Content Title,Content Description,Content Type,Content Watched,Content Completed,Content Saved,Content Last Watched Date (if viewed),Content Completed At (if completed)\n" +
      'Rust for High-Throughput Systems Architecture,"Building zero-copy parsers and embedded SQLite engines.",Course,true,true,true,"Oct 14, 2026, 8:00 PM GMT","Oct 15, 2026, 9:00 PM GMT"\n' +
      'Agentic AI Orchestration & Evaluation,"Designing deterministic guardrails for multi-agent workflows.",Course,true,true,false,"Mar 10, 2025, 7:30 PM GMT","Mar 12, 2025, 8:00 PM GMT"\n' +
      'Foundations of Interactive Media Production,"Early career course on interactive storytelling and production pipelines.",Course,true,true,false,"Jun 05, 2019, 4:00 PM GMT","Jun 06, 2019, 5:00 PM GMT"\n',
  },
  {
    name: "Rich_Media.csv",
    content:
      "Date/Time,Media Description,Media Link\n" +
      '"You uploaded a feed post on October 21, 2026 at 2:01 PM (GMT)","Shipped v0.4 of our local-first SQLite and Rust telemetry workbench—turning raw multi-provider AI exports into deterministic self-discovery insights.",https://example.dev/post/1\n' +
      '"You shared media on May 12, 2025 at 6:30 PM (GMT)","Why every principal platform architect should pair first-principles system design with measurable unit economics and clear human language.",https://example.dev/post/2\n',
  },
  {
    name: "Articles/Articles/deterministic-ai-systems-architecture-2026.html",
    content:
      '<html><head><title>From Bottlenecks to Deterministic Systems</title></head><body><h1>From Manual Bottlenecks to Deterministic AI Systems Architecture</h1><p class="published">Published on October 10, 2026</p><div class="article-body"><p>Whenever an engineering team drowns in repetitive manual maintenance, the highest-leverage response is to architect a deterministic schema compiler and local-first telemetry pipeline with clear unit economics.</p></div></body></html>',
  },
  {
    name: "Jobs/Job Applications.csv",
    content:
      "Application Date,Contact Email,Contact Phone Number,Company Name,Job Title,Job Url,Resume Name,Question And Answers\n" +
      '"10/29/26, 8:14 AM",alex@example.dev,+12065550199,Anthropic,Principal AI Systems Architect,http://www.linkedin.com/jobs/view/101,Alex_Rivera_AI_Systems_Architect_v2.pdf,\n' +
      '"10/18/26, 3:40 PM",alex@example.dev,+12065550199,Stripe,Staff Developer Platform Architect,http://www.linkedin.com/jobs/view/102,Alex_Rivera_AI_Systems_Architect_v2.pdf,\n' +
      '"09/25/26, 11:20 AM",alex@example.dev,+12065550199,Linear,Head of Systems & Workflow Automation,http://www.linkedin.com/jobs/view/103,Alex_Rivera_Product_Director_v1.pdf,\n',
  },
  {
    name: "Jobs/Saved Jobs.csv",
    content:
      "Saved Date,Job Url,Company Name,Job Title\n" +
      '"10/28/26, 9:00 PM",http://www.linkedin.com/jobs/view/201,Vercel,Principal Platform & DX Architect\n' +
      '"10/14/26, 6:15 PM",http://www.linkedin.com/jobs/view/202,OpenAI,Applied AI Systems Lead\n',
  },
  {
    name: "SavedJobAlerts.csv",
    content:
      "ALERT_CREATION_DATE,SNIPPET,FREQUENCY,QUERY_CONTEXT\n" +
      '2026-10-08 02:51:04 UTC,Principal AI Systems Architect,DAILY,"{keywords=Principal AI Systems Architect, spellCheckEnabled=true}"\n' +
      '2026-09-19 18:10:00 UTC,Staff Platform Engineer,WEEKLY,"{keywords=Staff Platform & Workflow Architect, spellCheckEnabled=true}"\n',
  },
  {
    name: "Jobs/Job Seeker Preferences.csv",
    content:
      "Locations,Industries,Company Employee Count,Preferred Job Types,Preferred Job Titles,Open To Recruiters Statement,Dream Companies,Profile Shared With Job Poster,Job Title Shared For Searching,Job Seeker Activity Level\n" +
      "United States,Software Development,51-200; 201-500,Full-time,Principal AI Systems Architect; Director of Platform Engineering; Staff Systems Architect,Focused on Principal AI Systems Architecture and Technical Product Leadership roles where deterministic tooling and telemetry drive compounding product equity.,Anthropic; Stripe; Vercel,Yes,Principal AI Systems Architect,CASUAL_BROWSE\n",
  },
  {
    name: "Private_identity_asset.csv",
    content:
      "private_identity_asset\n" +
      "Alex_Rivera_AI_Systems_Architect_v2.pdf\n" +
      "Alex_Rivera_Product_Director_v1.pdf\n",
  },
];
