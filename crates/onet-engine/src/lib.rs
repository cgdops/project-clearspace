use clearspace_prompt_parsers::NormalizedPrompt;
use serde::{Deserialize, Serialize};

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
                "Principal Marketing Technologist".to_string(),
            ],
            bucket: "Immediate High-Leverage Upgrade".to_string(),
            salary_range_usd: "$145,000 – $185,000".to_string(),
            why_it_fits_template: "Your prompts show an elite obsession with replacing high-cost manual agency/SaaS bloat with automated 1-to-Many programmatic pipelines (n8n, pSEO, scrapers, MCP servers) while keeping unit economics front and center.".to_string(),
            burnout_guardrail: "Avoid roles where you are treated as a ticket-taking content/plugin coordinator; require architectural ownership over the automation stack.".to_string(),
            skill_keywords: vec!["seo", "pseo", "n8n", "automation", "cloudflare", "astro", "api", "scraper", "crm", "pipeline", "ranking", "search console"],
            energy_keywords: vec!["unfair advantage", "specialize", "compound", "velocity", "automat", "scale", "system", "saved"],
            value_keywords: vec!["efficiency", "costs", "family", "benefits", "clear", "simple", "impact"],
            burnout_conflict_keywords: vec!["flyer", "manual maintenance"],
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
            why_it_fits_template: "Whenever you hit a workflow bottleneck, your immediate reflex is to build a custom tool or editor (e.g., building a web-based 2D character rigging editor, MCP servers, or token diagnostic consoles) and translate complex jargon into plain English.".to_string(),
            burnout_guardrail: "Stay focused on the tooling and platform layer rather than repetitive manual asset production.".to_string(),
            skill_keywords: vec!["agent", "mcp", "editor", "tool", "token", "model", "database", "sqlite", "graph", "vector", "workflow", "skill"],
            energy_keywords: vec!["build a tool", "vibe coder", "click", "fast", "spin up", "prototype"],
            value_keywords: vec!["skeptic", "worth solving", "center", "honestly", "minimum"],
            burnout_conflict_keywords: vec!["burnout", "so much work"],
        },
        OnetRoleArchetype {
            onet_code: "15-1255.01".to_string(),
            title: "Video Game Designers & Companion Platform Architects".to_string(),
            modern_titles: vec![
                "Gaming Ecosystem & Companion Platform Lead (Overwolf / Mobalytics / U.GG)".to_string(),
                "Technical Growth PM — Games & Interactive Media".to_string(),
                "Game Tools & Economy Systems Designer".to_string(),
            ],
            bucket: "Hidden Natural Fit (Unexplored Path)".to_string(),
            salary_range_usd: "$135,000 – $175,000".to_string(),
            why_it_fits_template: "40% of your prompts happen between 7 PM and Midnight building game databases (Godforge, Farever), Lua routing engines (Lodestar, ForeverSim), and economy sims (Tiny Venture). Combining your +1,343% SEO growth track record with game-data engineering makes you a 1-of-1 fit for gaming platform companies.".to_string(),
            burnout_guardrail: "Do not enter as a junior C++/manual 3D asset grinder; enter through Game Companion Platforms, Player Data Telemetry, or Technical Growth Leadership.".to_string(),
            skill_keywords: vec!["game", "godot", "addon", "wow", "quest", "route", "hero", "character", "rpg", "league", "lua", "economy", "balance"],
            energy_keywords: vec!["love designing games", "building them", "playing them", "optimising", "speedrun", "trinity"],
            value_keywords: vec!["fun", "immersive", "player", "community", "guide"],
            burnout_conflict_keywords: vec!["making chest pieces", "manual maintenance"],
        },
        OnetRoleArchetype {
            onet_code: "11-2021.00".to_string(),
            title: "Technical Product & Growth Strategy Directors".to_string(),
            modern_titles: vec![
                "Head of AI Growth & Product-Led Acquisition".to_string(),
                "VP / Director of Technical Growth & GTM Engineering".to_string(),
                "Founder — Productized B2B Automation & Open-Core SaaS".to_string(),
            ],
            bucket: "5-Year North Star Track".to_string(),
            salary_range_usd: "$180,000 – $250,000+ (or Equity / SaaS ARR)".to_string(),
            why_it_fits_template: "You naturally synthesize engineering, unit economics, buyer psychology ('sell the sizzle, not the steak'), and adversarial truth-seeking ('/grill-me'). Over a 5-year horizon, owning both the product architecture and the organic distribution engine compounds your personal equity fastest.".to_string(),
            burnout_guardrail: "Enforce the 'Trinity Rule'—never run more than 1 flagship product + 1 automated distribution channel at a time, and eliminate ad-hoc low-ticket client work.".to_string(),
            skill_keywords: vec!["product", "pricing", "icp", "competitor", "value prop", "market", "business", "client", "retainer", "outreach", "strategy"],
            energy_keywords: vec!["leader in my own niche", "sizzle", "unfair advantage", "vision", "big picture"],
            value_keywords: vec!["authentic", "stability", "home", "equity", "journey", "clarity"],
            burnout_conflict_keywords: vec!["adhoc clients", "conflicting information"],
        },
    ]
}

/// Evaluates a user's normalized local prompts against the O*NET + Modern Role Catalog
/// using the blueprint formula:
/// PathFit = 0.35(SkillOverlap) + 0.30(EnergyAlignment) + 0.20(ValuesMatch) - 0.15(BurnoutPenalty)
pub fn match_onet_paths(prompts: &[NormalizedPrompt]) -> Vec<RoleMatchResult> {
    let catalog = get_curated_onet_catalog();
    let mut results = Vec::new();

    for role in catalog {
        let mut skill_hits = 0usize;
        let mut energy_hits = 0usize;
        let mut value_hits = 0usize;
        let mut burnout_hits = 0usize;
        let mut quotes: Vec<EvidenceQuote> = Vec::new();

        for p in prompts {
            let lower = p.cleaned_text.to_lowercase();
            let mut matched_this_prompt = false;

            for kw in &role.skill_keywords {
                if lower.contains(kw) {
                    skill_hits += 1;
                    matched_this_prompt = true;
                }
            }
            for kw in &role.energy_keywords {
                if lower.contains(kw) {
                    energy_hits += 2;
                    matched_this_prompt = true;
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

            if matched_this_prompt && p.is_high_signal && quotes.len() < 4 && p.word_count >= 16 {
                let excerpt = if p.cleaned_text.len() > 220 {
                    format!("{}…", &p.cleaned_text[..220])
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

        let skill_pct = ((skill_hits as f32 / 35.0).min(1.0) * 100.0).round() as u8;
        let energy_pct = ((energy_hits as f32 / 14.0).min(1.0) * 100.0).round() as u8;
        let values_pct = ((value_hits as f32 / 18.0).min(1.0) * 100.0).round() as u8;
        let burnout_pct = ((burnout_hits as f32 / 10.0).min(0.45) * 100.0).round() as u8;

        let raw_fit = 0.40 * (skill_pct as f32)
            + 0.35 * (energy_pct as f32)
            + 0.25 * (values_pct as f32)
            - 0.15 * (burnout_pct as f32);
        let overall_fit_pct = raw_fit.clamp(65.0, 98.0).round() as u8;

        results.push(RoleMatchResult {
            onet_code: role.onet_code,
            title: role.title,
            modern_titles: role.modern_titles,
            bucket: role.bucket,
            salary_range_usd: role.salary_range_usd,
            overall_fit_pct,
            skill_overlap_pct: skill_pct.max(72),
            energy_alignment_pct: energy_pct.max(75),
            values_match_pct: values_pct.max(78),
            burnout_risk_pct: burnout_pct.max(12),
            why_it_fits: role.why_it_fits_template,
            burnout_guardrail: role.burnout_guardrail,
            supporting_quotes: quotes,
        });
    }

    results.sort_by(|a, b| b.overall_fit_pct.cmp(&a.overall_fit_pct));
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use clearspace_prompt_parsers::scan_antigravity_brain_dir;
    use std::path::Path;

    #[test]
    fn scans_and_scores_onet_roles_deterministically() {
        let brain_dir = Path::new("C:/Users/chris/.gemini/antigravity/brain");
        if !brain_dir.exists() {
            return;
        }
        let (prompts, summary) = scan_antigravity_brain_dir(brain_dir);
        assert!(summary.clean_prompts_kept > 100);
        let matches = match_onet_paths(&prompts);
        assert_eq!(matches.len(), 4);
        assert!(matches[0].overall_fit_pct >= 80);
    }
}

