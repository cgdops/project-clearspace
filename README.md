# Clearspace (Codename) — The Zero-Knowledge Career & Cognitive Compass

> **Your resume shows who you had to be. Your AI prompts show who you actually are.**

Clearspace is a **100% local-first, zero-knowledge desktop application** (built with **Tauri v2 + Rust + SQLite**) that helps people discover who they are, what career paths and roles match their natural strengths, and how to build 5-year personal equity—using the most honest, unfiltered writing they have ever produced: **their own AI conversation prompts**.

---

## Radical Transparency & Privacy Promise

1. **We Never See Your Raw Prompts:** All parsing, code-dump filtering, and PII scrubbing happen **100% locally on your machine** via our open-source Rust crates (`crates/prompt-parsers` and `crates/pii-scrubber`).
2. **Your Data Is Never For Sale:** Your local database (`clearspace.db`) lives on your hard drive.
3. **Auditable Open-Core Monorepo:**
   - Everything outside `ee/` is **MIT Licensed**. Anyone can inspect, audit, and verify every line of code that reads local files or scrubs sensitive data.
   - Paid trajectory & synthesis modules live in `ee/` and are publicly readable in this repository so you never have to trust a black box.

---

## Monorepo Architecture

```text
project-clearspace/
├── LICENSE                          # MIT License (all code outside /ee)
├── Cargo.toml                       # Rust workspace (parsers, scrubber, O*NET engine, Tauri backend)
├── package.json                     # pnpm/npm workspace (Desktop UI, Web marketing, API worker)
├── crates/                          # [MIT Open-Source Rust Crates]
│   ├── prompt-parsers/              # Normalizes Antigravity, Claude, ChatGPT, Gemini Takeout, Cursor, Obsidian
│   ├── pii-scrubber/                # Deterministic regex + structural noise/secret scrubber
│   └── onet-engine/                 # Local SQLite O*NET 29.x + Modern AI/Tech Role Matcher
├── apps/
│   ├── desktop/                     # Tauri v2 Desktop App (React 19 + TypeScript + Rust)
│   ├── web/                         # Astro 5 Marketing, Transparency Docs & Download Page
│   └── api/                         # Stateless Cloudflare Worker AI Proxy (Zero-Data-Retention)
└── ee/                              # [Auditable Commercial License — Deep Mirror & 5-Year Compass]
    ├── mirror-synthesizer/          # Citation-backed Cognitive Mirror distillation engine
    ├── trajectory-5yr/              # Interactive 5-Year Equity Tree & Accepted Quest tracker
    └── journal-coach/               # Socratic "/grill-me" reflective journaling & role evaluator
```
