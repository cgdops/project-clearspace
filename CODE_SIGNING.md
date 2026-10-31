# Code Signing & Privacy Policy

Free code signing on Windows is provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

---

## 1. Open-Source Build Scope & Provenance

All official Windows desktop builds (`Clearspace_*_x64-setup.exe`, `Clearspace_*_x64_en-US.msi`, and `Clearspace_*_x64-portable.exe`) are compiled and packaged exclusively from the **MIT-licensed open-source Cargo workspace** in this repository via verifiable GitHub Actions runs (`.github/workflows/release.yml`):

- `crates/prompt-parsers` (MIT)
- `crates/pii-scrubber` (MIT)
- `crates/onet-engine` (MIT)
- `apps/desktop/src-tauri` (MIT)

No external or unverified binaries are injected into the build pipeline. SignPath verifies the GitHub Actions workflow artifact directly against the commit SHA and `.github/workflows/release.yml` definition before applying the Authenticode signature.

---

## 2. Team Roles

- **Committers & Reviewers:** [Christian Gomez (`@cgdops`)](https://github.com/cgdops)
- **Approvers / Release Managers:** [Christian Gomez (`@cgdops`)](https://github.com/cgdops)

---

## 3. Privacy Policy (SignPath Foundation Compliance)

**This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.**

Specifically:
- **100% Local-First Execution:** All conversation parsing, PII/secret scrubbing, O*NET role matching, and SQLite storage (`clearspace.db`) execute locally on the user's machine with zero background telemetry, analytics, or crash-reporting calls.
- **No Unsolicited Network Requests:** Clearspace does not phone home on startup or run background network daemons. Any optional release-version check or cloud synthesis action occurs strictly upon explicit user interaction.

---

## 4. SignPath Artifact Configuration XML

When configuring the **Artifact Configuration** in your [SignPath.io](https://app.signpath.io/) project (`clearspace`), use the following configuration so SignPath signs the portable executable, the MSI installer, and the NSIS setup installer (including inner binaries):

```xml
<artifact-configuration xmlns="http://signpath.io/schema/artifact-configuration/v1">
  <zip-file>
    <!-- Sign the standalone portable binary -->
    <pe-file path="Clearspace_*_x64-portable.exe" />

    <!-- Sign the Windows MSI installer and any embedded PE binaries -->
    <msi-file path="Clearspace_*_x64_en-US.msi">
      <pe-file path="**" />
    </msi-file>

    <!-- Sign the NSIS Setup installer -->
    <pe-file path="Clearspace_*_x64-setup.exe" />
  </zip-file>
</artifact-configuration>
```

---

## 5. GitHub Repository Secrets & Variables for SignPath

Once your SignPath project is approved:

1. In GitHub → **Settings → Secrets and variables → Actions → Secrets**, add:
   - `SIGNPATH_API_TOKEN`: Your CI user API token from SignPath.
2. In GitHub → **Settings → Secrets and variables → Actions → Variables**, add:
   - `SIGNPATH_ORG_ID`: Your SignPath Organization ID (UUID).
   - `SIGNPATH_PROJECT_SLUG`: `clearspace` (optional, defaults to `clearspace`).
   - `SIGNPATH_POLICY_SLUG`: `release-signing` (optional, defaults to `release-signing`).
