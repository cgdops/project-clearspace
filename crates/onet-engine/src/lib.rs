use clearspace_prompt_parsers::{
    classify_skill_tier, compute_writing_level, NormalizedPrompt, SkillTier, WritingLevel,
};
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;

#[derive(Debug, Clone, Serialize)]
pub struct OnetRoleArchetype {
    pub onet_code: String,
    pub title: String,
    pub plain_english_description: String,
    pub modern_titles: Vec<String>,
    pub junior_title: String,
    pub junior_salary_usd: String,
    pub mid_title: String,
    pub mid_salary_usd: String,
    pub senior_title: String,
    pub senior_salary_usd: String,
    pub bucket: String, // "Immediate High-Leverage Upgrade", "Hidden Natural Fit", "5-Year North Star"
    pub salary_range_usd: String,
    pub why_it_fits_everyday: String,
    pub why_it_fits_professional: String,
    pub why_it_fits_template: String,
    pub burnout_guardrail_everyday: String,
    pub burnout_guardrail_professional: String,
    pub burnout_guardrail: String,
    pub skill_keywords: Vec<&'static str>,
    pub energy_keywords: Vec<&'static str>,
    pub value_keywords: Vec<&'static str>,
    pub burnout_conflict_keywords: Vec<&'static str>,
    pub competency_pillars: Vec<(&'static str, &'static str, &'static [&'static str])>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleMatchResult {
    pub onet_code: String,
    pub title: String,
    #[serde(default)]
    pub plain_english_description: String,
    pub modern_titles: Vec<String>,
    pub bucket: String,
    pub salary_range_usd: String,
    pub assessed_tier: String,
    pub positioned_title: String,
    pub positioned_salary_usd: String,
    pub honest_positioning_rationale: String,
    pub identified_gaps: Vec<String>,
    pub tested_assumptions: Vec<String>,
    pub overall_fit_pct: u8,
    pub skill_overlap_pct: u8,
    pub energy_alignment_pct: u8,
    pub values_match_pct: u8,
    pub burnout_risk_pct: u8,
    pub why_it_fits: String,
    pub burnout_guardrail: String,
    pub supporting_quotes: Vec<EvidenceQuote>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceQuote {
    pub prompt_id: String,
    pub date: String,
    pub excerpt: String,
}

pub fn get_curated_onet_catalog() -> Vec<OnetRoleArchetype> {
    vec![
        OnetRoleArchetype {
            onet_code: "15-1299.08".to_string(),
            title: "Computer Systems Engineers / Architects".to_string(),
            plain_english_description: "Designing and connecting software tools and automations so teams can get work done faster with less repetitive manual effort.".to_string(),
            modern_titles: vec![
                "Staff Growth Systems Architect".to_string(),
                "AI Automation & Revenue Architect".to_string(),
                "Principal Marketing & GTM Technologist".to_string(),
            ],
            junior_title: "Junior Systems & Marketing Automation Engineer".to_string(),
            junior_salary_usd: "$75,000 – $100,000".to_string(),
            mid_title: "Mid-Level Growth Systems & Automation Engineer".to_string(),
            mid_salary_usd: "$110,000 – $140,000".to_string(),
            senior_title: "Staff Growth Systems Architect".to_string(),
            senior_salary_usd: "$145,000 – $185,000".to_string(),
            bucket: "Immediate High-Leverage Upgrade".to_string(),
            salary_range_usd: "$145,000 – $185,000".to_string(),
            why_it_fits_everyday: "Your questions show that you love finding ways to save time, organize workflows, and set up tools so work happens automatically instead of by hand.".to_string(),
            why_it_fits_professional: "Your prompt history shows a strong focus on streamlining operations, connecting software tools, and automating repetitive workflows to save time and budget.".to_string(),
            why_it_fits_template: "Your prompt history shows a focus on replacing manual operational bottlenecks with programmatic 1-to-Many pipelines, automated data workflows, and measurable unit economics.".to_string(),
            burnout_guardrail_everyday: "Look for roles where you are trusted to improve how the work gets done, rather than just copying and pasting tasks from a checklist all day.".to_string(),
            burnout_guardrail_professional: "Avoid roles where you are limited to manual task coordination; look for teams that give you ownership to improve and automate workflows.".to_string(),
            burnout_guardrail: "Avoid roles where you are treated as a ticket-taking execution coordinator; require architectural ownership over the automation stack.".to_string(),
            skill_keywords: vec![
                "seo", "pseo", "n8n", "automation", "cloudflare", "astro", "api", "scraper", "crm",
                "pipeline", "ranking", "search console", "architecture", "system", "scale", "telemetry",
            ],
            energy_keywords: vec![
                "unfair advantage", "specialize", "compound", "velocity", "automat", "scale",
                "system", "saved", "optimize", "leverage",
            ],
            value_keywords: vec![
                "efficiency", "costs", "stability", "benefits", "clear", "simple", "impact", "autonomy",
            ],
            burnout_conflict_keywords: vec!["manual maintenance", "repetitive", "hand-editing", "tedious"],
            competency_pillars: vec![
                ("Workflow & Process Automation", "Programmatic Pipeline & Workflow Automation", &["pipeline", "automation", "n8n", "workflow"]),
                ("Cloud & Web Systems Setup", "Cloud & Edge Systems Architecture", &["cloudflare", "astro", "architecture", "system", "scale"]),
                ("Search & Performance Analytics", "Search, Telemetry & Ranking Analytics", &["seo", "pseo", "ranking", "search console", "telemetry"]),
                ("Connected Tools & Cost Efficiency", "API Integration & Unit-Economics Modeling", &["api", "crm", "scraper", "costs", "efficiency"]),
            ],
        },
        OnetRoleArchetype {
            onet_code: "15-1252.00".to_string(),
            title: "Software Developers, Tools & Platforms".to_string(),
            plain_english_description: "Building helpful software, internal tools, and AI assistants that make everyday work easier and clearer for other people.".to_string(),
            modern_titles: vec![
                "Developer Experience (DX) & AI Tooling Engineer".to_string(),
                "Forward-Deployed AI Solutions Engineer".to_string(),
                "Internal Tools & Agentic Workflow Architect".to_string(),
            ],
            junior_title: "Junior Developer Tools & SDK Engineer".to_string(),
            junior_salary_usd: "$80,000 – $105,000".to_string(),
            mid_title: "Mid-Level Platform & Agentic Tooling Engineer".to_string(),
            mid_salary_usd: "$115,000 – $145,000".to_string(),
            senior_title: "Developer Experience (DX) & AI Tooling Engineer (Senior / Staff)".to_string(),
            senior_salary_usd: "$150,000 – $195,000".to_string(),
            bucket: "Immediate High-Leverage Upgrade".to_string(),
            salary_range_usd: "$150,000 – $195,000".to_string(),
            why_it_fits_everyday: "Whenever you run into a frustrating or slow step, your natural instinct is to build a helpful tool or checklist that makes the job easier for everyone.".to_string(),
            why_it_fits_professional: "Whenever you hit a workflow bottleneck, your instinct is to design a reusable tool or AI workflow while keeping the experience clear and practical for users.".to_string(),
            why_it_fits_template: "Whenever you encounter a workflow bottleneck, your reflex is to design a custom developer tool, schema, or agentic workflow while translating complex architecture into clear human value.".to_string(),
            burnout_guardrail_everyday: "Focus on roles where you get to build reusable helpers and tools, rather than doing the same manual fixes over and over.".to_string(),
            burnout_guardrail_professional: "Stay focused on building reusable tools and shared platforms rather than repetitive ticket-by-ticket manual production.".to_string(),
            burnout_guardrail: "Stay focused on the reusable tooling and platform layer rather than repetitive manual asset or ticket production.".to_string(),
            skill_keywords: vec![
                "agent", "mcp", "editor", "tool", "token", "model", "database", "sqlite", "graph",
                "vector", "workflow", "skill", "compiler", "rust", "typescript", "sdk",
            ],
            energy_keywords: vec![
                "build a tool", "click", "fast", "spin up", "prototype", "architect", "design", "solve",
            ],
            value_keywords: vec![
                "skeptic", "worth solving", "center", "honestly", "minimum", "first principles", "clarity",
            ],
            burnout_conflict_keywords: vec!["burnout", "so much work", "boilerplate", "manual"],
            competency_pillars: vec![
                ("AI Assistants & Workflow Tools", "Agentic & MCP Workflow Orchestration", &["agent", "mcp", "workflow", "token", "model", "skill"]),
                ("Software & Tool Development", "Systems Languages & SDK Compilation", &["rust", "typescript", "compiler", "sdk", "editor", "tool"]),
                ("Local Data & Organized Storage", "Local-First Storage & Graph/Vector Schemas", &["database", "sqlite", "graph", "vector"]),
                ("Clear Problem-Solving & Quality Checks", "First-Principles Verification & Stress-Testing", &["skeptic", "worth solving", "first principles", "clarity"]),
            ],
        },
        OnetRoleArchetype {
            onet_code: "15-1255.01".to_string(),
            title: "Interactive Systems & Companion Platform Architects".to_string(),
            plain_english_description: "Creating interactive apps, game systems, or companion guides that help communities learn, plan, and enjoy complex experiences.".to_string(),
            modern_titles: vec![
                "Interactive Ecosystem & Companion Platform Lead".to_string(),
                "Technical Growth PM — Interactive Media & Simulation".to_string(),
                "Simulation Tools & Economy Systems Designer".to_string(),
            ],
            junior_title: "Junior Gameplay & Companion Tools Developer".to_string(),
            junior_salary_usd: "$70,000 – $95,000".to_string(),
            mid_title: "Mid-Level Simulation & Interactive Systems Designer".to_string(),
            mid_salary_usd: "$105,000 – $135,000".to_string(),
            senior_title: "Interactive Ecosystem & Companion Platform Lead".to_string(),
            senior_salary_usd: "$135,000 – $175,000".to_string(),
            bucket: "Hidden Natural Fit (Unexplored Path)".to_string(),
            salary_range_usd: "$135,000 – $175,000".to_string(),
            why_it_fits_everyday: "Your prompts show how much energy you get from games, interactive worlds, and building helpful guides or tools that make complex rules fun and easy to follow.".to_string(),
            why_it_fits_professional: "Your prompts explore interactive systems, game balance, and companion tools—combining structured problem-solving with engaging user experiences.".to_string(),
            why_it_fits_template: "Your deep-flow prompts explore interactive state machines, simulation economies, routing algorithms, and telemetry-driven companion tools—blending systems engineering with user engagement.".to_string(),
            burnout_guardrail_everyday: "Avoid roles that ask you to do endless repetitive content updates by hand; aim for roles where you design the systems, guides, or companion tools.".to_string(),
            burnout_guardrail_professional: "Avoid roles focused on manual content grinding; lead through companion apps, player data insights, or interactive systems design.".to_string(),
            burnout_guardrail: "Do not enter through manual content or asset grinding; lead through Companion Platforms, Data Telemetry, or Systems Design.".to_string(),
            skill_keywords: vec![
                "game", "godot", "addon", "quest", "route", "hero", "character", "rpg",
                "lua", "economy", "balance", "simulation", "interactive", "state", "telemetry",
            ],
            energy_keywords: vec![
                "designing", "building", "playing", "optimising", "optimizing", "speedrun", "flow", "deep",
            ],
            value_keywords: vec!["fun", "immersive", "player", "community", "guide", "craft", "creative"],
            burnout_conflict_keywords: vec!["manual maintenance", "asset grind", "repetitive"],
            competency_pillars: vec![
                ("Game Balance & Interactive Rules", "Simulation Economy & Balance Modeling", &["economy", "balance", "simulation", "telemetry"]),
                ("Interactive Progress & Routing", "Interactive State Machines & Routing", &["quest", "route", "state", "interactive", "rpg"]),
                ("Game Engine & Addon Scripting", "Engine & Addon Tooling (Godot / Lua)", &["game", "godot", "addon", "lua", "hero", "character"]),
                ("Player Community & Helpful Guides", "Player Community & Companion Craft", &["player", "community", "guide", "craft", "immersive"]),
            ],
        },
        OnetRoleArchetype {
            onet_code: "11-2021.00".to_string(),
            title: "Technical Product & Growth Strategy Directors".to_string(),
            plain_english_description: "Planning what products to build, how to price them fairly, and how to help the right customers discover and love them.".to_string(),
            modern_titles: vec![
                "Head of AI Growth & Product-Led Acquisition".to_string(),
                "VP / Director of Technical Growth & GTM Engineering".to_string(),
                "Founder — Productized B2B Automation & Open-Core Software".to_string(),
            ],
            junior_title: "Junior Technical Product & GTM Analyst".to_string(),
            junior_salary_usd: "$80,000 – $105,000".to_string(),
            mid_title: "Mid-Level Technical Product & Growth Manager".to_string(),
            mid_salary_usd: "$120,000 – $155,000".to_string(),
            senior_title: "Head of AI Growth & Product-Led Acquisition (Senior / Staff)".to_string(),
            senior_salary_usd: "$180,000 – $250,000+ (or Equity / ARR)".to_string(),
            bucket: "5-Year North Star Track".to_string(),
            salary_range_usd: "$180,000 – $250,000+ (or Equity / ARR)".to_string(),
            why_it_fits_everyday: "You care about the big picture: making sure what you build actually helps real people, makes financial sense, and supports a stable, independent life.".to_string(),
            why_it_fits_professional: "You combine product planning, customer psychology, and practical business strategy so that what you build grows steadily and sustainably.".to_string(),
            why_it_fits_template: "You synthesize systems engineering, unit economics, buyer psychology, and adversarial truth-seeking. Over a 5-year horizon, owning both product architecture and organic distribution compounds your personal equity fastest.".to_string(),
            burnout_guardrail_everyday: "Protect your focus by working on one main project and one clear way to reach customers at a time, instead of juggling too many scattered tasks.".to_string(),
            burnout_guardrail_professional: "Protect your focus by prioritizing one core product and one repeatable growth channel at a time, avoiding fragmented ad-hoc client requests.".to_string(),
            burnout_guardrail: "Protect your cognitive bandwidth by focusing on 1 flagship product and 1 automated distribution engine at a time, eliminating fragmented ad-hoc client work.".to_string(),
            skill_keywords: vec![
                "product", "pricing", "icp", "competitor", "value prop", "market", "business",
                "client", "retainer", "outreach", "strategy", "positioning", "revenue", "growth",
            ],
            energy_keywords: vec![
                "niche", "unfair advantage", "vision", "big picture", "compound", "strategy", "leader",
            ],
            value_keywords: vec![
                "authentic", "stability", "home", "equity", "journey", "clarity", "autonomy", "family",
            ],
            burnout_conflict_keywords: vec!["adhoc", "fragmented", "conflicting", "context switching"],
            competency_pillars: vec![
                ("Customer Fit & Clear Messaging", "ICP Positioning & Competitive Differentiation", &["icp", "positioning", "competitor", "value prop", "market"]),
                ("Pricing & Business Sustainability", "Pricing Architecture & Revenue Unit Economics", &["pricing", "revenue", "retainer", "business", "equity"]),
                ("Product Growth & Customer Outreach", "Product-Led Growth & Acquisition Strategy", &["product", "growth", "strategy", "outreach", "client"]),
                ("Long-Term Career & Work-Life Balance", "Long-Term Portfolio & Autonomy Governance", &["autonomy", "stability", "compound", "unfair advantage"]),
            ],
        },
    ]
}

/// Evaluates a user's normalized local prompts against the O*NET + Modern Role Catalog
/// using their measured writing level.
pub fn match_onet_paths(prompts: &[NormalizedPrompt]) -> Vec<RoleMatchResult> {
    let level = compute_writing_level(prompts).measured_level;
    match_onet_paths_for_level(prompts, level)
}

/// Evaluates a user's normalized local prompts against the O*NET + Modern Role Catalog
/// using depth-weighted scoring (Beginner -> Junior, Intermediate -> Mid-Level, Advanced -> Senior/Staff)
/// and adapts all explanations, gaps, and guardrails to the active `WritingLevel`.
pub fn match_onet_paths_for_level(
    prompts: &[NormalizedPrompt],
    level: WritingLevel,
) -> Vec<RoleMatchResult> {
    let catalog = get_curated_onet_catalog();
    if prompts.is_empty() {
        return catalog
            .into_iter()
            .map(|role| {
                let guardrail = match level {
                    WritingLevel::Everyday => role.burnout_guardrail_everyday.clone(),
                    WritingLevel::Professional => role.burnout_guardrail_professional.clone(),
                    WritingLevel::Technical => role.burnout_guardrail.clone(),
                };
                RoleMatchResult {
                    onet_code: role.onet_code,
                    title: role.title,
                    plain_english_description: role.plain_english_description,
                    modern_titles: role.modern_titles,
                    bucket: role.bucket,
                    salary_range_usd: role.salary_range_usd,
                    assessed_tier: "Awaiting Evidence".to_string(),
                    positioned_title: role.junior_title,
                    positioned_salary_usd: "Import vault to calibrate".to_string(),
                    honest_positioning_rationale: match level {
                        WritingLevel::Everyday => "No prompts analyzed yet. Add your prompt history so we can match your experience level honestly.".to_string(),
                        WritingLevel::Professional => "No prompts analyzed yet. Clearspace calibrates your role level from your actual project and workflow questions.".to_string(),
                        WritingLevel::Technical => "No prompts analyzed yet. Clearspace never guesses or inflates seniority without behavioral evidence.".to_string(),
                    },
                    identified_gaps: role
                        .competency_pillars
                        .iter()
                        .map(|(plain_name, tech_name, _)| {
                            let label = if level == WritingLevel::Technical {
                                tech_name
                            } else {
                                plain_name
                            };
                            format!("Unverified area: {label}")
                        })
                        .collect(),
                    tested_assumptions: vec![
                        "Upload your prompt history to see how your everyday questions compare against this career path.".to_string(),
                    ],
                    overall_fit_pct: 0,
                    skill_overlap_pct: 0,
                    energy_alignment_pct: 0,
                    values_match_pct: 0,
                    burnout_risk_pct: 0,
                    why_it_fits: "Import or scan your prompt history to compute personalized career path matches and quote citations.".to_string(),
                    burnout_guardrail: guardrail,
                    supporting_quotes: Vec::new(),
                }
            })
            .collect();
    }

    let mut results = Vec::new();
    let corpus_scale = (prompts.len() as f32).sqrt().clamp(1.2, 16.0);

    for role in catalog {
        let mut skill_hits = 0usize;
        let mut energy_hits = 0usize;
        let mut value_hits = 0usize;
        let mut burnout_hits = 0usize;

        let mut weighted_skill = 0.0f32;
        let mut weighted_energy = 0.0f32;
        let mut weighted_value = 0.0f32;

        let mut matched_tier_counts = [0usize; 3]; // [Beginner, Intermediate, Advanced]
        let mut matched_terms: Vec<&'static str> = Vec::new();
        let mut quotes: Vec<EvidenceQuote> = Vec::new();
        let mut pillar_hits = vec![0usize; role.competency_pillars.len()];

        for p in prompts {
            let lower = p.cleaned_text.to_lowercase();
            let effective_tier = if p.skill_tier == SkillTier::Beginner && !p.signal_categories.is_empty() {
                classify_skill_tier(&p.cleaned_text, p.word_count, &p.signal_categories)
            } else {
                p.skill_tier
            };
            let weight = effective_tier.depth_weight();

            let mut matched_this_prompt = false;

            for kw in &role.skill_keywords {
                if lower.contains(kw) {
                    skill_hits += 1;
                    weighted_skill += weight;
                    matched_this_prompt = true;
                    if matched_terms.len() < 5 && !matched_terms.contains(kw) {
                        matched_terms.push(kw);
                    }
                }
            }
            for kw in &role.energy_keywords {
                if lower.contains(kw) {
                    energy_hits += 2;
                    weighted_energy += 2.0 * weight;
                    matched_this_prompt = true;
                    if matched_terms.len() < 5 && !matched_terms.contains(kw) {
                        matched_terms.push(kw);
                    }
                }
            }
            for kw in &role.value_keywords {
                if lower.contains(kw) {
                    value_hits += 1;
                    weighted_value += weight;
                }
            }
            for kw in &role.burnout_conflict_keywords {
                if lower.contains(kw) {
                    burnout_hits += 1;
                }
            }

            for (idx, (_plain_name, _tech_name, pillar_kws)) in
                role.competency_pillars.iter().enumerate()
            {
                if pillar_kws.iter().any(|k| lower.contains(k)) {
                    pillar_hits[idx] += 1;
                }
            }

            if matched_this_prompt {
                match effective_tier {
                    SkillTier::Beginner => matched_tier_counts[0] += 1,
                    SkillTier::Intermediate => matched_tier_counts[1] += 1,
                    SkillTier::Advanced => matched_tier_counts[2] += 1,
                }
            }

            if matched_this_prompt && p.is_high_signal && quotes.len() < 4 && p.word_count >= 12 {
                let excerpt = if p.cleaned_text.chars().count() > 220 {
                    let truncated: String = p.cleaned_text.chars().take(220).collect();
                    format!("{truncated}…")
                } else {
                    p.cleaned_text.clone()
                };
                quotes.push(EvidenceQuote {
                    prompt_id: p.id.clone(),
                    date: p.created_at.chars().take(10).collect(),
                    excerpt,
                });
            }
        }

        let total_matched_prompts =
            matched_tier_counts[0] + matched_tier_counts[1] + matched_tier_counts[2];

        let assessed_skill_tier: Option<SkillTier> = if skill_hits == 0 && energy_hits == 0 && value_hits == 0 {
            None
        } else if total_matched_prompts == 0 {
            Some(SkillTier::Beginner)
        } else {
            let tier_score = (matched_tier_counts[1] as f32 + 2.0 * matched_tier_counts[2] as f32)
                / (total_matched_prompts as f32);
            if tier_score < 0.65 {
                Some(SkillTier::Beginner)
            } else if tier_score < 1.35 {
                Some(SkillTier::Intermediate)
            } else {
                Some(SkillTier::Advanced)
            }
        };

        let score_dimension = |w_hits: f32, factor: f32, tier: Option<SkillTier>| -> u8 {
            if w_hits <= 0.0 {
                return 0;
            }
            let ratio = (w_hits / (corpus_scale * factor)).min(1.0);
            match tier {
                None => 0,
                Some(SkillTier::Beginner) => (22.0 + 24.0 * ratio).round().clamp(18.0, 46.0) as u8,
                Some(SkillTier::Intermediate) => {
                    (48.0 + 24.0 * ratio).round().clamp(45.0, 72.0) as u8
                }
                Some(SkillTier::Advanced) => (56.0 + 42.0 * ratio).round().clamp(56.0, 98.0) as u8,
            }
        };

        let skill_pct = score_dimension(weighted_skill, 2.1, assessed_skill_tier);
        let energy_pct = score_dimension(weighted_energy, 1.3, assessed_skill_tier);
        let values_pct = score_dimension(weighted_value, 1.4, assessed_skill_tier);
        let burnout_pct = if burnout_hits == 0 {
            8
        } else {
            ((burnout_hits as f32 / (corpus_scale * 1.2)).min(0.45) * 100.0)
                .round()
                .clamp(10.0, 45.0) as u8
        };

        let overall_fit_pct = if skill_hits == 0 && energy_hits == 0 && value_hits == 0 {
            0
        } else {
            let positive_weighted = 0.35 * (skill_pct as f32)
                + 0.30 * (energy_pct as f32)
                + 0.20 * (values_pct as f32);
            let scaled_positive = positive_weighted / 0.85;
            let net_fit = scaled_positive - 0.15 * (burnout_pct as f32);
            net_fit.round().clamp(0.0, 98.0) as u8
        };

        let (assessed_tier, positioned_title, positioned_salary_usd, honest_positioning_rationale) =
            match assessed_skill_tier {
                None => (
                    "No Demonstrated Evidence".to_string(),
                    role.junior_title.clone(),
                    role.junior_salary_usd.clone(),
                    match level {
                        WritingLevel::Everyday => "We haven't seen any prompts related to this career path yet, so we're starting at the entry level until you add more examples.".to_string(),
                        WritingLevel::Professional => "0 domain signals detected in your vault for this track. Positioned at baseline until concrete project samples are present.".to_string(),
                        WritingLevel::Technical => "0 domain signals detected in your vault for this track. Positioned at baseline until concrete work samples are present.".to_string(),
                    },
                ),
                Some(SkillTier::Beginner) => (
                    SkillTier::Beginner.positioning_label().to_string(),
                    role.junior_title.clone(),
                    role.junior_salary_usd.clone(),
                    match level {
                        WritingLevel::Everyday => format!(
                            "Matched at an Entry / Junior level ({} starter / {} hands-on / {} advanced prompts). You're asking great learning questions in this area, and building a couple of small hands-on projects will help you grow to the next level.",
                            matched_tier_counts[0], matched_tier_counts[1], matched_tier_counts[2]
                        ),
                        WritingLevel::Professional => format!(
                            "Scored at Junior level ({} Beginner / {} Intermediate / {} Advanced prompts). You touch key topics in this field, and adding end-to-end project examples will strengthen your readiness for Mid-Level roles.",
                            matched_tier_counts[0], matched_tier_counts[1], matched_tier_counts[2]
                        ),
                        WritingLevel::Technical => format!(
                            "Objectively scored at Junior ({} Beginner / {} Intermediate / {} Advanced prompts). You touch domain keywords, but your prompts currently focus on foundational lookup or syntax rather than independent component or systems ownership.",
                            matched_tier_counts[0], matched_tier_counts[1], matched_tier_counts[2]
                        ),
                    },
                ),
                Some(SkillTier::Intermediate) => (
                    SkillTier::Intermediate.positioning_label().to_string(),
                    role.mid_title.clone(),
                    role.mid_salary_usd.clone(),
                    match level {
                        WritingLevel::Everyday => format!(
                            "Matched at a Mid-Level ({} hands-on / {} advanced / {} starter prompts). You already know how to build and connect practical features—practicing bigger-picture planning will help you reach Senior roles.",
                            matched_tier_counts[1], matched_tier_counts[2], matched_tier_counts[0]
                        ),
                        WritingLevel::Professional => format!(
                            "Scored at Mid-Level ({} Intermediate / {} Advanced / {} Beginner prompts). You show solid feature implementation and workflow building; documenting system design tradeoffs and business impact will prepare you for Senior roles.",
                            matched_tier_counts[1], matched_tier_counts[2], matched_tier_counts[0]
                        ),
                        WritingLevel::Technical => format!(
                            "Objectively scored at Mid-Level ({} Intermediate / {} Advanced / {} Beginner prompts). You demonstrate solid component implementation and workflow wiring, but need more architectural tradeoff, scale, and unit-economics evidence for Senior/Staff.",
                            matched_tier_counts[1], matched_tier_counts[2], matched_tier_counts[0]
                        ),
                    },
                ),
                Some(SkillTier::Advanced) => (
                    SkillTier::Advanced.positioning_label().to_string(),
                    role.senior_title.clone(),
                    role.senior_salary_usd.clone(),
                    match level {
                        WritingLevel::Everyday => format!(
                            "Matched at a Senior / Lead level ({} advanced / {} hands-on / {} starter prompts). Your prompts show that you think ahead, weigh pros and cons carefully, and design solutions that help whole teams.",
                            matched_tier_counts[2], matched_tier_counts[1], matched_tier_counts[0]
                        ),
                        WritingLevel::Professional => format!(
                            "Scored at Senior / Staff ({} Advanced / {} Intermediate / {} Beginner prompts). Your prompts consistently tackle complex system design, practical tradeoffs, and measurable team impact.",
                            matched_tier_counts[2], matched_tier_counts[1], matched_tier_counts[0]
                        ),
                        WritingLevel::Technical => format!(
                            "Objectively scored at Senior / Staff ({} Advanced / {} Intermediate / {} Beginner prompts). Your prompts consistently frame problems around systems architecture, first-principles tradeoffs, and measurable leverage.",
                            matched_tier_counts[2], matched_tier_counts[1], matched_tier_counts[0]
                        ),
                    },
                ),
            };

        let mut identified_gaps: Vec<String> = role
            .competency_pillars
            .iter()
            .enumerate()
            .filter_map(|(idx, (plain_name, tech_name, kws))| {
                if pillar_hits[idx] == 0 {
                    let sample_kws = kws.iter().take(3).copied().collect::<Vec<_>>().join(", ");
                    match level {
                        WritingLevel::Everyday => Some(format!(
                            "Next area to explore: {plain_name} (try a small project using {sample_kws})"
                        )),
                        WritingLevel::Professional => Some(format!(
                            "Skill area to build: {plain_name} (0 prompts covering {sample_kws} so far)"
                        )),
                        WritingLevel::Technical => Some(format!(
                            "Missing evidence in {tech_name} (0 prompts covering {sample_kws})"
                        )),
                    }
                } else {
                    None
                }
            })
            .collect();

        if matched_tier_counts[2] == 0 && total_matched_prompts > 0 {
            let gap_msg = match level {
                WritingLevel::Everyday => "Growth step for Senior roles: Practice comparing pros, cons, and costs before building so you can lead bigger projects confidently.".to_string(),
                WritingLevel::Professional => "Next-Level Growth Gap: Practice documenting system tradeoffs, edge cases, and business ROI to step up from hands-on builder to Senior lead.".to_string(),
                WritingLevel::Technical => "Seniority Gap: 0 prompts in this track demonstrate multi-constraint tradeoff analysis, failure-mode bounding, or unit-economics modeling required for Senior/Staff.".to_string(),
            };
            identified_gaps.push(gap_msg);
        }
        if identified_gaps.is_empty() {
            let depth_msg = match level {
                WritingLevel::Everyday => format!(
                    "Keep going! You've touched all 4 core areas across {} prompt(s)—keep practicing across more projects to build a strong portfolio.",
                    prompts.len()
                ),
                WritingLevel::Professional => format!(
                    "Consistent Depth Goal: All 4 core areas covered across {} prompt(s); continue documenting real project outcomes across 20+ sessions.",
                    prompts.len()
                ),
                WritingLevel::Technical => format!(
                    "Longitudinal Depth Gap: All 4 core pillars touched across {} prompt(s); sustain adversarial stress-testing and production post-mortems across 20+ sessions to harden Principal-level proof.",
                    prompts.len()
                ),
            };
            identified_gaps.push(depth_msg);
        }

        let mut tested_assumptions = Vec::new();
        if matched_tier_counts[2] == 0 && total_matched_prompts > 0 {
            let msg = match level {
                WritingLevel::Everyday => "Reality Check: Asking about a tool is a great start, but employers look for a small finished project or example you can walk them through.".to_string(),
                WritingLevel::Professional => "Reality Check: Mentioning tools in prompts is a starting point—build a complete, shareable project example to prove Mid/Senior readiness.".to_string(),
                WritingLevel::Technical => "Assumption Tested: Mentioning domain tools in prompts does not equate to Senior architectural readiness—scores are capped at Junior/Mid-Level until tradeoff & system-design prompts appear.".to_string(),
            };
            tested_assumptions.push(msg);
        }
        if burnout_hits > 0 {
            let msg = match level {
                WritingLevel::Everyday => format!(
                    "Energy Check: You mentioned feeling bogged down by repetitive work {} time(s)—make sure any job you take lets you improve the process instead of doing manual busywork.",
                    burnout_hits
                ),
                WritingLevel::Professional => format!(
                    "Energy Check: You logged {} repetitive-work friction signal(s); look for teams that value workflow improvements over manual ticket volume.",
                    burnout_hits
                ),
                WritingLevel::Technical => format!(
                    "Assumption Tested: You logged {} maintenance/burnout friction signal(s); taking this role in an execution-only culture without automation authority will replicate past burnout.",
                    burnout_hits
                ),
            };
            tested_assumptions.push(msg);
        }
        if values_pct < skill_pct {
            let msg = match level {
                WritingLevel::Everyday => format!(
                    "Goal Check: Your technical skills match this role ({skill_pct}%), so double-check that the day-to-day schedule and responsibilities fit the lifestyle you want ({values_pct}%)."
                ),
                WritingLevel::Professional => format!(
                    "Alignment Check: Your skill overlap ({skill_pct}%) is higher than your values match ({values_pct}%)—verify you enjoy the day-to-day responsibilities of this role, not just the title."
                ),
                WritingLevel::Technical => format!(
                    "Assumption Tested: Technical skill overlap ({skill_pct}%) exceeds explicit value alignment ({values_pct}%)—verify you want the day-to-day operational accountability of this role, not just the title."
                ),
            };
            tested_assumptions.push(msg);
        }
        if tested_assumptions.is_empty() {
            let msg = match level {
                WritingLevel::Everyday => "Career Tip: You have a strong match here—decide whether you enjoy building things directly yourself or managing and guiding a team.".to_string(),
                WritingLevel::Professional => "Career Tip: Strong alignment verified—confirm whether you prefer hands-on individual contributor ownership or people management before targeting Director titles.".to_string(),
                WritingLevel::Technical => "Assumption Tested: High architectural alignment verified, but confirm whether you want hands-on Staff IC systems ownership vs. people-management overhead before targeting Director titles.".to_string(),
            };
            tested_assumptions.push(msg);
        }

        let base_why = match level {
            WritingLevel::Everyday => &role.why_it_fits_everyday,
            WritingLevel::Professional => &role.why_it_fits_professional,
            WritingLevel::Technical => &role.why_it_fits_template,
        };

        let why_it_fits = if matched_terms.is_empty() {
            base_why.clone()
        } else {
            match level {
                WritingLevel::Everyday => format!(
                    "{} We spotted {} matching topic signals in your questions ({}).",
                    base_why,
                    skill_hits + energy_hits + value_hits,
                    matched_terms.join(", ")
                ),
                WritingLevel::Professional => format!(
                    "{} Matched {} recurring topic signals across your prompts ({}).",
                    base_why,
                    skill_hits + energy_hits + value_hits,
                    matched_terms.join(", ")
                ),
                WritingLevel::Technical => format!(
                    "{} Detected {} recurring behavioral signals across your vault ({}).",
                    base_why,
                    skill_hits + energy_hits + value_hits,
                    matched_terms.join(", ")
                ),
            }
        };

        let burnout_guardrail = match level {
            WritingLevel::Everyday => role.burnout_guardrail_everyday,
            WritingLevel::Professional => role.burnout_guardrail_professional,
            WritingLevel::Technical => role.burnout_guardrail,
        };

        results.push(RoleMatchResult {
            onet_code: role.onet_code,
            title: role.title,
            plain_english_description: role.plain_english_description,
            modern_titles: role.modern_titles,
            bucket: role.bucket,
            salary_range_usd: role.salary_range_usd,
            assessed_tier,
            positioned_title,
            positioned_salary_usd,
            honest_positioning_rationale,
            identified_gaps,
            tested_assumptions,
            overall_fit_pct,
            skill_overlap_pct: skill_pct,
            energy_alignment_pct: energy_pct,
            values_match_pct: values_pct,
            burnout_risk_pct: burnout_pct,
            why_it_fits,
            burnout_guardrail,
            supporting_quotes: quotes,
        });
    }

    results.sort_by_key(|b| Reverse(b.overall_fit_pct));
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use clearspace_prompt_parsers::{parse_exported_conversations_json, NormalizedPrompt, PromptSource};

    fn make_prompt(id: &str, text: &str, is_high_signal: bool) -> NormalizedPrompt {
        let word_count = text.split_whitespace().count();
        let cats = vec!["Systems & Architecture".to_string()];
        let skill_tier = classify_skill_tier(text, word_count, &cats);
        NormalizedPrompt {
            id: id.to_string(),
            source: PromptSource::ClaudeWeb,
            conversation_id: "convo-test".to_string(),
            created_at: "2026-03-01T20:00:00Z".to_string(),
            local_hour: Some(20),
            cleaned_text: text.to_string(),
            word_count,
            redactions_made: 0,
            is_high_signal,
            signal_categories: cats,
            skill_tier,
        }
    }

    #[test]
    fn empty_prompts_return_zero_scores() {
        let matches = match_onet_paths(&[]);
        assert_eq!(matches.len(), 4);
        for m in matches {
            assert_eq!(m.overall_fit_pct, 0);
            assert_eq!(m.skill_overlap_pct, 0);
            assert_eq!(m.energy_alignment_pct, 0);
            assert_eq!(m.values_match_pct, 0);
            assert_eq!(m.burnout_risk_pct, 0);
            assert!(m.supporting_quotes.is_empty());
        }
    }

    #[test]
    fn ranks_computer_systems_architect_first_for_automation_pipeline_prompts() {
        let prompts = vec![
            make_prompt(
                "p1",
                "We need to scale our seo and pseo automation pipeline on cloudflare and astro with a scraper and crm api to optimize velocity and reduce costs with simple efficiency.",
                true,
            ),
            make_prompt(
                "p2",
                "By automating search console ranking telemetry in n8n, our system saved significant budget and gave the team leverage and stability.",
                true,
            ),
        ];
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches[0].onet_code, "15-1299.08");
        assert!(matches[0].overall_fit_pct >= 80);
    }

    #[test]
    fn ranks_software_tools_developer_first_for_dx_and_agent_sdk_prompts() {
        let prompts = vec![
            make_prompt(
                "p1",
                "Let us build a tool and custom editor using rust, typescript, and sqlite with a vector graph database so our mcp agent workflow and compiler sdk can spin up a fast prototype.",
                true,
            ),
            make_prompt(
                "p2",
                "As a skeptic, is this model token workflow worth solving from first principles so developers get clarity with minimum friction?",
                true,
            ),
        ];
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches[0].onet_code, "15-1252.00");
        assert!(matches[0].overall_fit_pct >= 80);
    }

    #[test]
    fn ranks_interactive_systems_architect_first_for_simulation_and_game_economy_prompts() {
        let prompts = vec![
            make_prompt(
                "p1",
                "I love designing and building an interactive rpg game simulation in godot and lua where quest route state, hero character balance, and economy telemetry create deep flow.",
                true,
            ),
            make_prompt(
                "p2",
                "Playing and optimizing this addon guide for our player community makes the creative craft fun and immersive during a speedrun.",
                true,
            ),
        ];
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches[0].onet_code, "15-1255.01");
        assert!(matches[0].overall_fit_pct >= 80);
    }

    #[test]
    fn ranks_technical_product_director_first_for_gtm_pricing_and_icp_strategy_prompts() {
        let prompts = vec![
            make_prompt(
                "p1",
                "Our product strategy and market positioning must focus on enterprise icp pricing, value prop clarity, and retainer business revenue to beat the competitor and compound growth.",
                true,
            ),
            make_prompt(
                "p2",
                "As a leader with a big picture vision in our niche, building authentic client outreach and long-term equity gives my family home stability and autonomy.",
                true,
            ),
        ];
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches[0].onet_code, "11-2021.00");
        assert!(matches[0].overall_fit_pct >= 80);
    }

    #[test]
    fn applies_burnout_penalty_deterministically_when_conflict_keywords_present() {
        let clean_prompts = vec![make_prompt(
            "p1",
            "Build a tool in rust and sqlite with an mcp agent workflow to prototype a fast compiler sdk from first principles.",
            true,
        )];
        let burned_prompts = vec![make_prompt(
            "p2",
            "Build a tool in rust and sqlite with an mcp agent workflow to prototype a fast compiler sdk from first principles, but avoid burnout, so much work, boilerplate, and manual tasks.",
            true,
        )];

        let clean_res = match_onet_paths(&clean_prompts)
            .into_iter()
            .find(|r| r.onet_code == "15-1252.00")
            .expect("15-1252.00 present");
        let burned_res = match_onet_paths(&burned_prompts)
            .into_iter()
            .find(|r| r.onet_code == "15-1252.00")
            .expect("15-1252.00 present");

        assert_eq!(clean_res.burnout_risk_pct, 8);
        assert!(burned_res.burnout_risk_pct > clean_res.burnout_risk_pct);
        assert!(burned_res.overall_fit_pct < clean_res.overall_fit_pct);
    }

    #[test]
    fn returns_zero_fit_when_prompts_contain_no_matching_keywords() {
        let unrelated = vec![make_prompt(
            "p-unrelated",
            "Yesterday afternoon we walked through the botanical garden and admired the blooming orchids under the warm sunlight.",
            false,
        )];
        let matches = match_onet_paths(&unrelated);
        for m in matches {
            assert_eq!(m.overall_fit_pct, 0);
            assert_eq!(m.skill_overlap_pct, 0);
            assert_eq!(m.energy_alignment_pct, 0);
            assert_eq!(m.values_match_pct, 0);
        }
    }

    #[test]
    fn extracts_supporting_evidence_quotes_and_truncates_excerpts_over_220_chars() {
        let long_text = format!(
            "I want to architect an automated pipeline and mcp agent tool in rust and sqlite to scale system velocity and optimize unit economics. {}",
            "Extra context padding words for truncation verification. ".repeat(6)
        );
        let prompts = vec![make_prompt("p-long", &long_text, true)];
        let matches = match_onet_paths(&prompts);
        let top = &matches[0];
        assert!(!top.supporting_quotes.is_empty());
        assert!(top.supporting_quotes[0].excerpt.ends_with('…'));
        assert!(top.supporting_quotes[0].excerpt.chars().count() <= 221);
    }

    #[test]
    fn catalog_contains_zero_hardcoded_founder_biographical_strings() {
        let forbidden = [
            ["tal", "lo"].concat(),
            ["god", "forge"].concat(),
            ["far", "ever"].concat(),
            ["lode", "star"].concat(),
            ["1,3", "43%"].concat(),
            ["father", " of 5"].concat(),
            ["5 ", "kids"].concat(),
        ];
        for role in get_curated_onet_catalog() {
            let combined = format!(
                "{} {} {} {}",
                role.title,
                role.modern_titles.join(" "),
                role.why_it_fits_template,
                role.burnout_guardrail
            )
            .to_lowercase();
            for term in &forbidden {
                assert!(
                    !combined.contains(term),
                    "O*NET catalog leaked forbidden string: {term}"
                );
            }
        }

        let sample_export = r#"[
            {
                "uuid": "convo-1",
                "chat_messages": [
                    {
                        "sender": "human",
                        "created_at": "2026-03-01T21:00:00Z",
                        "text": "I want to architect an automated pipeline and MCP agent tool using Rust and SQLite to scale our system velocity, optimize unit economics, and build an unfair advantage with clarity and autonomy."
                    }
                ]
            }
        ]"#;
        let (prompts, _) =
            parse_exported_conversations_json(sample_export).expect("valid sample export");
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches.len(), 4);
        assert!(matches[0].overall_fit_pct >= 80);
    }

    #[test]
    fn honestly_positions_beginner_intermediate_and_advanced_users_without_ego_inflation() {
        let beginner_prompts = vec![NormalizedPrompt {
            id: "beg-1".to_string(),
            source: PromptSource::ChatGptWeb,
            conversation_id: "c-beg".to_string(),
            created_at: "2026-03-01T10:00:00Z".to_string(),
            local_hour: Some(10),
            cleaned_text: "How do I write a basic rust tool and sqlite database query for a beginner step by step tutorial?".to_string(),
            word_count: 19,
            redactions_made: 0,
            is_high_signal: false,
            signal_categories: Vec::new(),
            skill_tier: SkillTier::Beginner,
        }];
        let beg_matches = match_onet_paths(&beginner_prompts);
        let beg_top = &beg_matches[0];
        assert_eq!(beg_top.assessed_tier, "Beginner → Junior");
        assert!(beg_top.positioned_title.contains("Junior"));
        assert!(
            beg_top.overall_fit_pct > 0 && beg_top.overall_fit_pct <= 46,
            "Beginner fit score should not be falsely inflated above 46%, got {}%",
            beg_top.overall_fit_pct
        );
        assert!(!beg_top.identified_gaps.is_empty());
        assert!(!beg_top.tested_assumptions.is_empty());

        let intermediate_prompts = vec![NormalizedPrompt {
            id: "int-1".to_string(),
            source: PromptSource::ChatGptWeb,
            conversation_id: "c-int".to_string(),
            created_at: "2026-03-01T11:00:00Z".to_string(),
            local_hour: Some(11),
            cleaned_text: "Let us implement and test an agent tool workflow with rust, typescript, and sqlite to solve developer tasks cleanly.".to_string(),
            word_count: 19,
            redactions_made: 0,
            is_high_signal: true,
            signal_categories: vec!["Curiosity & Learning".to_string()],
            skill_tier: SkillTier::Intermediate,
        }];
        let int_matches = match_onet_paths(&intermediate_prompts);
        let int_top = &int_matches[0];
        assert_eq!(int_top.assessed_tier, "Intermediate → Mid-Level");
        assert!(int_top.positioned_title.contains("Mid-Level"));
        assert!(
            int_top.overall_fit_pct >= 45 && int_top.overall_fit_pct <= 74,
            "Intermediate fit score should sit in Mid-Level band (45-74%), got {}%",
            int_top.overall_fit_pct
        );

        let advanced_prompts = vec![make_prompt(
            "adv-1",
            "As a skeptic (/grill-me), let us architect a deterministic mcp agent tool and compiler sdk in rust and sqlite from first principles to scale throughput and clarity.",
            true,
        )];
        let adv_matches = match_onet_paths(&advanced_prompts);
        let adv_top = &adv_matches[0];
        assert_eq!(adv_top.assessed_tier, "Advanced → Senior / Staff");
        assert!(adv_top.overall_fit_pct >= 80);
    }

    #[test]
    fn adapts_role_matches_across_writing_levels_with_zero_jargon_in_everyday_and_professional() {
        let prompts = vec![make_prompt(
            "p1",
            "I want to build a tool and workflow in rust and sqlite to avoid repetitive manual tasks.",
            true,
        )];
        let forbidden = [
            "unit economics",
            "unit-economics",
            "telemetry contracts",
            "automated regression",
            "load-testing benchmarks",
            "1-to-many",
            "dialectical verification",
        ];

        for level in [WritingLevel::Everyday, WritingLevel::Professional] {
            let matches = match_onet_paths_for_level(&prompts, level);
            assert_eq!(matches.len(), 4);
            for m in matches {
                assert!(!m.plain_english_description.is_empty());
                let combined = format!(
                    "{} {} {} {} {}",
                    m.plain_english_description,
                    m.why_it_fits,
                    m.honest_positioning_rationale,
                    m.identified_gaps.join(" "),
                    m.tested_assumptions.join(" ")
                )
                .to_lowercase();
                for term in &forbidden {
                    assert!(
                        !combined.contains(term),
                        "Leaked forbidden jargon '{term}' in {:?} mode: {combined}",
                        level
                    );
                }
            }
        }
    }
}
