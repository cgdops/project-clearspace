use clearspace_prompt_parsers::NormalizedPrompt;
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;

#[derive(Debug, Clone, Serialize)]
pub struct OnetRoleArchetype {
    pub onet_code: String,
    pub title: String,
    pub modern_titles: Vec<String>,
    pub bucket: String, // "Immediate High-Leverage Upgrade", "Hidden Natural Fit", "5-Year North Star"
    pub salary_range_usd: String,
    pub why_it_fits_template: String,
    pub burnout_guardrail: String,
    pub skill_keywords: Vec<&'static str>,
    pub energy_keywords: Vec<&'static str>,
    pub value_keywords: Vec<&'static str>,
    pub burnout_conflict_keywords: Vec<&'static str>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleMatchResult {
    pub onet_code: String,
    pub title: String,
    pub modern_titles: Vec<String>,
    pub bucket: String,
    pub salary_range_usd: String,
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
            modern_titles: vec![
                "Staff Growth Systems Architect".to_string(),
                "AI Automation & Revenue Architect".to_string(),
                "Principal Marketing & GTM Technologist".to_string(),
            ],
            bucket: "Immediate High-Leverage Upgrade".to_string(),
            salary_range_usd: "$145,000 – $185,000".to_string(),
            why_it_fits_template: "Your prompt history shows a strong focus on replacing manual operational bottlenecks with programmatic 1-to-Many pipelines, automated data workflows, and measurable unit economics.".to_string(),
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
        },
        OnetRoleArchetype {
            onet_code: "15-1252.00".to_string(),
            title: "Software Developers, Tools & Platforms".to_string(),
            modern_titles: vec![
                "Developer Experience (DX) & AI Tooling Engineer".to_string(),
                "Forward-Deployed AI Solutions Engineer".to_string(),
                "Internal Tools & Agentic Workflow Architect".to_string(),
            ],
            bucket: "Immediate High-Leverage Upgrade".to_string(),
            salary_range_usd: "$150,000 – $195,000".to_string(),
            why_it_fits_template: "Whenever you encounter a workflow bottleneck, your immediate reflex is to design a custom developer tool, schema, or agentic workflow while translating complex architecture into clear human value.".to_string(),
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
        },
        OnetRoleArchetype {
            onet_code: "15-1255.01".to_string(),
            title: "Interactive Systems & Companion Platform Architects".to_string(),
            modern_titles: vec![
                "Interactive Ecosystem & Companion Platform Lead".to_string(),
                "Technical Growth PM — Interactive Media & Simulation".to_string(),
                "Simulation Tools & Economy Systems Designer".to_string(),
            ],
            bucket: "Hidden Natural Fit (Unexplored Path)".to_string(),
            salary_range_usd: "$135,000 – $175,000".to_string(),
            why_it_fits_template: "Your deep-flow prompts frequently explore interactive state machines, simulation economies, routing algorithms, and telemetry-driven companion tools—blending systems engineering with user engagement.".to_string(),
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
        },
        OnetRoleArchetype {
            onet_code: "11-2021.00".to_string(),
            title: "Technical Product & Growth Strategy Directors".to_string(),
            modern_titles: vec![
                "Head of AI Growth & Product-Led Acquisition".to_string(),
                "VP / Director of Technical Growth & GTM Engineering".to_string(),
                "Founder — Productized B2B Automation & Open-Core Software".to_string(),
            ],
            bucket: "5-Year North Star Track".to_string(),
            salary_range_usd: "$180,000 – $250,000+ (or Equity / ARR)".to_string(),
            why_it_fits_template: "You naturally synthesize systems engineering, unit economics, buyer psychology, and adversarial truth-seeking. Over a 5-year horizon, owning both product architecture and organic distribution compounds your personal equity fastest.".to_string(),
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
        },
    ]
}

/// Evaluates a user's normalized local prompts against the O*NET + Modern Role Catalog
/// using the documented blueprint formula:
/// `PathFit = 0.35(SkillOverlap) + 0.30(EnergyAlignment) + 0.20(ValuesMatch) - 0.15(BurnoutPenalty)`
/// normalized across the positive weight sum (0.85) and clamped to `[0, 98]`.
/// When `prompts` is empty, returns `0` for all percentage metrics.
pub fn match_onet_paths(prompts: &[NormalizedPrompt]) -> Vec<RoleMatchResult> {
    let catalog = get_curated_onet_catalog();
    if prompts.is_empty() {
        return catalog
            .into_iter()
            .map(|role| RoleMatchResult {
                onet_code: role.onet_code,
                title: role.title,
                modern_titles: role.modern_titles,
                bucket: role.bucket,
                salary_range_usd: role.salary_range_usd,
                overall_fit_pct: 0,
                skill_overlap_pct: 0,
                energy_alignment_pct: 0,
                values_match_pct: 0,
                burnout_risk_pct: 0,
                why_it_fits: "Import or scan your prompt history to compute personalized O*NET behavioral alignment and evidence citations.".to_string(),
                burnout_guardrail: role.burnout_guardrail,
                supporting_quotes: Vec::new(),
            })
            .collect();
    }

    let mut results = Vec::new();
    // Adaptive denominator so both concise exports (5-25 prompts) and multi-year vaults (500+ prompts)
    // calibrate smoothly without artificial floors when a role has zero signal hits.
    let corpus_scale = (prompts.len() as f32).sqrt().clamp(1.2, 16.0);

    for role in catalog {
        let mut skill_hits = 0usize;
        let mut energy_hits = 0usize;
        let mut value_hits = 0usize;
        let mut burnout_hits = 0usize;
        let mut matched_terms: Vec<&'static str> = Vec::new();
        let mut quotes: Vec<EvidenceQuote> = Vec::new();

        for p in prompts {
            let lower = p.cleaned_text.to_lowercase();
            let mut matched_this_prompt = false;

            for kw in &role.skill_keywords {
                if lower.contains(kw) {
                    skill_hits += 1;
                    matched_this_prompt = true;
                    if matched_terms.len() < 5 && !matched_terms.contains(kw) {
                        matched_terms.push(kw);
                    }
                }
            }
            for kw in &role.energy_keywords {
                if lower.contains(kw) {
                    energy_hits += 2;
                    matched_this_prompt = true;
                    if matched_terms.len() < 5 && !matched_terms.contains(kw) {
                        matched_terms.push(kw);
                    }
                }
            }
            for kw in &role.value_keywords {
                if lower.contains(kw) {
                    value_hits += 1;
                }
            }
            for kw in &role.burnout_conflict_keywords {
                if lower.contains(kw) {
                    burnout_hits += 1;
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

        let score_dimension = |hits: usize, factor: f32| -> u8 {
            if hits == 0 {
                0
            } else {
                let ratio = (hits as f32 / (corpus_scale * factor)).min(1.0);
                (52.0 + 46.0 * ratio).round().clamp(0.0, 98.0) as u8
            }
        };

        let skill_pct = score_dimension(skill_hits, 2.1);
        let energy_pct = score_dimension(energy_hits, 1.3);
        let values_pct = score_dimension(value_hits, 1.4);
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

        let why_it_fits = if matched_terms.is_empty() {
            role.why_it_fits_template.clone()
        } else {
            format!(
                "{} Detected {} recurring behavioral signals across your vault ({}).",
                role.why_it_fits_template,
                skill_hits + energy_hits + value_hits,
                matched_terms.join(", ")
            )
        };

        results.push(RoleMatchResult {
            onet_code: role.onet_code,
            title: role.title,
            modern_titles: role.modern_titles,
            bucket: role.bucket,
            salary_range_usd: role.salary_range_usd,
            overall_fit_pct,
            skill_overlap_pct: skill_pct,
            energy_alignment_pct: energy_pct,
            values_match_pct: values_pct,
            burnout_risk_pct: burnout_pct,
            why_it_fits,
            burnout_guardrail: role.burnout_guardrail,
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
            signal_categories: vec!["Systems & Architecture".to_string()],
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
}
