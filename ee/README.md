# Clearspace `/ee` — Auditable Enterprise & Pro Modules

This directory contains the commercial modules of Clearspace:

1. **`mirror-synthesizer`**: Multi-stage LLM prompt distillation and citation-backed Cognitive Mirror synthesis.
2. **`trajectory-5yr`**: The interactive 5-Year Personal Equity Tree & Accepted Quest progression engine.
3. **`journal-coach`**: Socratic `/grill-me` reflective journaling and live role/company fit evaluator.

## Radical Transparency Guarantee

Unlike closed-source SaaS tools that hide how your personal data is processed, all code inside `/ee` is **publicly readable in this repository** so any user or security researcher can verify:
- Raw prompts never leave your local SQLite database (`clearspace_vault.db`).
- Only scrubbed, high-signal excerpts or user-approved batches are ever sent to the stateless inference proxy (or your own local Ollama / BYOK key).
