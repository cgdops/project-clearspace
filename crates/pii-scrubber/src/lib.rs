use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrubResult {
    pub cleaned_text: String,
    pub word_count: usize,
    pub symbol_ratio: f32,
    pub redactions_made: usize,
    pub is_noise_or_boilerplate: bool,
    pub noise_reason: Option<String>,
}

struct ScrubberRegexes {
    email: Regex,
    phone: Regex,
    ssn: Regex,
    api_key: Regex,
    credit_card: Regex,
    fenced_code: Regex,
}

fn regexes() -> &'static ScrubberRegexes {
    static INSTANCE: OnceLock<ScrubberRegexes> = OnceLock::new();
    INSTANCE.get_or_init(|| ScrubberRegexes {
        email: Regex::new(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
            .expect("valid email regex"),
        phone: Regex::new(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
            .expect("valid phone regex"),
        ssn: Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").expect("valid ssn regex"),
        api_key: Regex::new(
            r"\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,45}|ghp_[a-zA-Z0-9]{30,45}|xox[baprs]-[0-9a-zA-Z-]{10,})\b",
        )
        .expect("valid api_key regex"),
        credit_card: Regex::new(r"\b(?:\d[ -]*?){13,16}\b").expect("valid credit_card regex"),
        fenced_code: Regex::new(r"(?s)```[\s\S]*?```").expect("valid fenced_code regex"),
    })
}

/// Deterministically scrubs PII, API keys, and code dumps locally on the user's machine.
/// Never sends raw secrets or code blocks downstream.
pub fn scrub_prompt(raw: &str) -> ScrubResult {
    let rx = regexes();
    let trimmed = raw.trim();

    if trimmed.is_empty() {
        return ScrubResult {
            cleaned_text: String::new(),
            word_count: 0,
            symbol_ratio: 0.0,
            redactions_made: 0,
            is_noise_or_boilerplate: true,
            noise_reason: Some("empty".to_string()),
        };
    }

    // Filter out automated subagent delegations or system role assignments
    let lower = trimmed.to_lowercase();
    if lower.starts_with("you are a ")
        || lower.starts_with("you are the ")
        || lower.starts_with("your role is ")
        || lower.starts_with("your sole job is ")
        || lower.starts_with("the following changes were made by the user")
    {
        return ScrubResult {
            cleaned_text: String::new(),
            word_count: 0,
            symbol_ratio: 0.0,
            redactions_made: 0,
            is_noise_or_boilerplate: true,
            noise_reason: Some("system_or_subagent_delegation".to_string()),
        };
    }

    let mut redactions = 0usize;

    // Strip large fenced code blocks first so we keep the human prose around the code
    let without_code = rx
        .fenced_code
        .replace_all(trimmed, "[CODE_BLOCK_OMITTED]")
        .to_string();

    let after_keys = rx.api_key.replace_all(&without_code, |_: &regex::Captures| {
        redactions += 1;
        "[REDACTED_API_KEY]"
    });

    let after_ssn = rx.ssn.replace_all(&after_keys, |_: &regex::Captures| {
        redactions += 1;
        "[REDACTED_SSN]"
    });

    let after_cc = rx.credit_card.replace_all(&after_ssn, |_: &regex::Captures| {
        redactions += 1;
        "[REDACTED_CARD]"
    });

    let after_email = rx.email.replace_all(&after_cc, |_: &regex::Captures| {
        redactions += 1;
        "[REDACTED_EMAIL]"
    });

    let cleaned = rx
        .phone
        .replace_all(&after_email, |_: &regex::Captures| {
            redactions += 1;
            "[REDACTED_PHONE]"
        })
        .trim()
        .to_string();

    let word_count = cleaned.split_whitespace().count();
    let total_chars = cleaned.chars().count().max(1);
    let raw_syntax_chars = cleaned
        .chars()
        .filter(|c| matches!(c, '{' | '}' | '[' | ']' | '<' | '>' | ';' | '='))
        .count();
    let syntax_chars = raw_syntax_chars.saturating_sub(redactions * 2);
    let symbol_ratio = (syntax_chars as f32) / (total_chars as f32);

    // Tactical commands < 5 words ("continue", "proceed", "commit push") or raw stack traces
    let is_short_command = word_count < 5;
    let is_stack_trace_or_dump = symbol_ratio > 0.06 || word_count > 650;

    let (is_noise, reason) = if is_short_command {
        (true, Some("short_tactical_command".to_string()))
    } else if is_stack_trace_or_dump {
        (true, Some("code_or_log_dump".to_string()))
    } else {
        (false, None)
    };

    ScrubResult {
        cleaned_text: cleaned,
        word_count,
        symbol_ratio,
        redactions_made: redactions,
        is_noise_or_boilerplate: is_noise,
        noise_reason: reason,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrubs_secrets_and_emails_deterministically() {
        let input = "Reach me at alex@example.com or 305-555-1234 with key sk-proj1234567890abcdefghijklmno and let's discuss my career strategy.";
        let res = scrub_prompt(input);
        assert!(!res.cleaned_text.contains("alex@example.com"));
        assert!(!res.cleaned_text.contains("305-555-1234"));
        assert!(!res.cleaned_text.contains("sk-proj"));
        assert!(res.cleaned_text.contains("[REDACTED_EMAIL]"));
        assert!(res.cleaned_text.contains("[REDACTED_PHONE]"));
        assert!(res.cleaned_text.contains("[REDACTED_API_KEY]"));
        assert_eq!(res.redactions_made, 3);
        assert!(!res.is_noise_or_boilerplate);
    }

    #[test]
    fn flags_short_commands_as_noise() {
        let res = scrub_prompt("commit push main");
        assert!(res.is_noise_or_boilerplate);
        assert_eq!(res.noise_reason.as_deref(), Some("short_tactical_command"));
    }

    #[test]
    fn flags_empty_or_whitespace_prompts_as_noise() {
        let res = scrub_prompt("   \n\t  ");
        assert!(res.is_noise_or_boilerplate);
        assert_eq!(res.word_count, 0);
        assert_eq!(res.noise_reason.as_deref(), Some("empty"));
    }

    #[test]
    fn filters_system_and_subagent_role_delegations() {
        let res1 = scrub_prompt("You are a senior software engineer reviewing this pull request for security defects.");
        assert!(res1.is_noise_or_boilerplate);
        assert_eq!(
            res1.noise_reason.as_deref(),
            Some("system_or_subagent_delegation")
        );

        let res2 = scrub_prompt("Your sole job is to format the JSON payload and return valid schema output.");
        assert!(res2.is_noise_or_boilerplate);
        assert_eq!(
            res2.noise_reason.as_deref(),
            Some("system_or_subagent_delegation")
        );
    }

    #[test]
    fn scrubs_ssn_and_credit_cards_accurately() {
        let input = "Please verify why test record 123-45-6789 and card 4532 0151 1283 0366 appeared in our staging logs during the audit.";
        let res = scrub_prompt(input);
        assert!(!res.cleaned_text.contains("123-45-6789"));
        assert!(!res.cleaned_text.contains("4532 0151 1283 0366"));
        assert!(res.cleaned_text.contains("[REDACTED_SSN]"));
        assert!(res.cleaned_text.contains("[REDACTED_CARD]"));
        assert_eq!(res.redactions_made, 2);
        assert!(!res.is_noise_or_boilerplate);
    }

    #[test]
    fn scrubs_github_google_and_slack_api_tokens() {
        let input = "We need to rotate ghp_1234567890abcdefghijklmnopqrstuvwxyz, AIzaSyA1234567890abcdefghijklmnopqrstuv, and xoxb-1234567890-abcdefghij immediately.";
        let res = scrub_prompt(input);
        assert!(!res.cleaned_text.contains("ghp_"));
        assert!(!res.cleaned_text.contains("AIzaSy"));
        assert!(!res.cleaned_text.contains("xoxb-"));
        assert_eq!(res.redactions_made, 3);
        assert!(!res.is_noise_or_boilerplate);
    }

    #[test]
    fn omits_fenced_code_blocks_while_preserving_surrounding_human_prose() {
        let input = "I want to understand why this Rust pipeline is blocking our async worker:\n```rust\nfn main() {\n    let x = vec![1, 2, 3];\n}\n```\nHow should we redesign the architecture for better throughput?";
        let res = scrub_prompt(input);
        assert!(res.cleaned_text.contains("[CODE_BLOCK_OMITTED]"));
        assert!(!res.cleaned_text.contains("vec![1, 2, 3]"));
        assert!(res
            .cleaned_text
            .contains("How should we redesign the architecture for better throughput?"));
        assert!(!res.is_noise_or_boilerplate);
    }

    #[test]
    fn flags_high_symbol_ratio_stack_traces_as_code_dump() {
        let input = "error[E0308]: {{{ [[[ <<< === ;;; >>> ]]] }}} {{{ [[[ <<< === ;;; >>> ]]] }}} mismatched types in compiler ast node";
        let res = scrub_prompt(input);
        assert!(res.is_noise_or_boilerplate);
        assert_eq!(res.noise_reason.as_deref(), Some("code_or_log_dump"));
        assert!(res.symbol_ratio > 0.06);
    }

    #[test]
    fn flags_excessively_long_paste_dumps_over_650_words() {
        let word_list = std::iter::repeat("architecture")
            .take(660)
            .collect::<Vec<_>>()
            .join(" ");
        let res = scrub_prompt(&word_list);
        assert!(res.is_noise_or_boilerplate);
        assert_eq!(res.noise_reason.as_deref(), Some("code_or_log_dump"));
        assert!(res.word_count > 650);
    }
}
