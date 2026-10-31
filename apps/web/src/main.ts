interface ReleaseArtifact {
  id: string;
  platform: string;
  kind: string;
  recommended: boolean;
  filename: string;
  url: string;
  sizeBytes: number;
  sizeFormatted: string;
  sha256: string;
}

interface ReleaseManifest {
  productName: string;
  version: string;
  releaseDate: string;
  identifier: string;
  license: string;
  artifacts: ReleaseArtifact[];
}

const SCRUBBER_PRESETS: Record<string, string> = {
  secrets:
    "Can you help me refactor the auth worker at C:\\Users\\jane\\projects\\acme-vault\\src\\auth.rs? My test OpenAI key is sk-proj-98a7b6c5d4e3f2a1b2c3d4e5f6a7b8c9 and my email is jane.doe@example.com. I want to design a zero-knowledge token rotation system that cuts p99 latency by 40%.",
  contact:
    "Please draft a technical architecture memo for alex.rivera@corp.io (cell: 415-890-2341, SSN 123-45-6789) comparing local SQLite WAL throughput vs cloud Postgres for an offline-first desktop telemetry client.",
  architecture:
    "How do we design a homeostatic control loop for our multi-agent verification pipeline so that token budget allocation self-corrects based on unit-economics yield and p95 latency invariants?",
};

function scrubPromptClient(raw: string): { scrubbed: string; redactedCount: number; tierLabel: string } {
  let count = 0;
  let text = raw;

  const rules: Array<[RegExp, string]> = [
    [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]"],
    [/\bghp_[A-Za-z0-9]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
    [/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]"],
    [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "[REDACTED_PHONE]"],
    [/[A-Za-z]:\\(?:Users|home)\\[^\s?,"']+/g, "[REDACTED_LOCAL_PATH]"],
    [/\/(?:Users|home)\/[A-Za-z0-9._-]+\/[^\s?,"']+/g, "[REDACTED_LOCAL_PATH]"],
  ];

  for (const [regex, token] of rules) {
    text = text.replace(regex, () => {
      count += 1;
      return token;
    });
  }

  const lower = text.toLowerCase();
  let tierLabel = "Tier 2: Applied Implementation";
  if (
    lower.includes("architecture") ||
    lower.includes("invariant") ||
    lower.includes("homeostatic") ||
    lower.includes("zero-knowledge") ||
    lower.includes("throughput") ||
    lower.includes("unit-economics")
  ) {
    tierLabel = "Tier 4: Systems Architecture & Tradeoffs";
  } else if (lower.includes("refactor") || lower.includes("pipeline") || lower.includes("sqlite")) {
    tierLabel = "Tier 3: Multi-Component Engineering";
  }

  return { scrubbed: text, redactedCount: count, tierLabel };
}

function announceStatus(message: string): void {
  const region = document.getElementById("status-announcer");
  if (region) {
    region.textContent = message;
  }
}

async function copyTextToClipboard(text: string, label: string, buttonEl?: HTMLElement | null): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    document.body.removeChild(fallback);
  }
  announceStatus(`Copied ${label} to clipboard`);
  if (buttonEl) {
    const prev = buttonEl.textContent;
    buttonEl.textContent = "Copied ✓";
    window.setTimeout(() => {
      buttonEl.textContent = prev;
    }, 1800);
  }
}

function initThemeToggle(): void {
  const btn = document.getElementById("theme-toggle-btn");
  const label = document.getElementById("theme-toggle-label");
  if (!btn || !label) return;

  const modes: Array<{ scheme: string; name: string }> = [
    { scheme: "light dark", name: "Auto" },
    { scheme: "light", name: "Light" },
    { scheme: "dark", name: "Dark" },
  ];
  let idx = 0;

  btn.addEventListener("click", () => {
    idx = (idx + 1) % modes.length;
    const next = modes[idx];
    document.documentElement.style.colorScheme = next.scheme;
    label.textContent = `Theme: ${next.name}`;
    btn.setAttribute("aria-label", `Switch color theme (currently ${next.name})`);
    announceStatus(`Color theme set to ${next.name}`);
  });
}

function initFeatureTabs(): void {
  const tablist = document.getElementById("feature-tablist");
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

  function activateTab(nextTab: HTMLButtonElement, focus = false): void {
    const targetKey = nextTab.dataset.tab;
    for (const tab of tabs) {
      const isSelected = tab === nextTab;
      tab.setAttribute("aria-selected", String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      tab.classList.toggle("active", isSelected);

      const panelId = tab.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      if (panel) {
        panel.hidden = !isSelected;
      }
    }
    if (focus) {
      nextTab.focus();
    }
    if (targetKey) {
      announceStatus(`Showing ${nextTab.textContent?.trim() ?? targetKey} module preview`);
    }
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => activateTab(tab, false));
    tab.addEventListener("keydown", (e: KeyboardEvent) => {
      const currentIndex = tabs.indexOf(tab);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        activateTab(tabs[(currentIndex + 1) % tabs.length], true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        activateTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length], true);
      } else if (e.key === "Home") {
        e.preventDefault();
        activateTab(tabs[0], true);
      } else if (e.key === "End") {
        e.preventDefault();
        activateTab(tabs[tabs.length - 1], true);
      }
    });
  }
}

function initScrubberSandbox(): void {
  const input = document.getElementById("raw-prompt-input") as HTMLTextAreaElement | null;
  const output = document.getElementById("scrubbed-prompt-output");
  const stats = document.getElementById("scrubber-stats-badge");
  const tierOut = document.getElementById("scrubber-tier-output");
  const presetBtns = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-preset]"));

  if (!input || !output || !stats || !tierOut) return;

  const update = () => {
    const res = scrubPromptClient(input.value);
    output.textContent = res.scrubbed;
    stats.textContent = `${res.redactedCount} PII / Secret token${res.redactedCount === 1 ? "" : "s"} redacted`;
    tierOut.textContent = res.tierLabel;
  };

  input.addEventListener("input", update);

  for (const btn of presetBtns) {
    btn.addEventListener("click", () => {
      const key = btn.dataset.preset ?? "secrets";
      if (SCRUBBER_PRESETS[key]) {
        input.value = SCRUBBER_PRESETS[key];
        for (const b of presetBtns) b.classList.toggle("active", b === btn);
        update();
      }
    });
  }

  update();
}

async function initReleaseDownloadsAndDialog(): Promise<void> {
  const activeFilenameEl = document.getElementById("active-artifact-filename");
  const activeShaEl = document.getElementById("active-artifact-sha256");
  const btnCopySha = document.getElementById("btn-copy-sha256");
  const btnCopyPs = document.getElementById("btn-copy-ps-verify");
  const btnOpenGuide = document.getElementById("btn-open-install-guide");

  const dialog = document.getElementById("install-guide-dialog") as HTMLDialogElement | null;
  const btnCloseDialog = document.getElementById("btn-close-dialog");
  const btnDialogDone = document.getElementById("btn-dialog-done");
  const btnDialogCopyCmd = document.getElementById("btn-dialog-copy-cmd");
  const dialogFilename = document.getElementById("dialog-filename");
  const dialogPsCmd = document.getElementById("dialog-ps-cmd");

  let manifest: ReleaseManifest | null = null;
  let activeArtifact: ReleaseArtifact = {
    id: "win-nsis",
    platform: "Windows 10/11 (x64)",
    kind: "NSIS Setup Installer (.exe)",
    recommended: true,
    filename: "Clearspace_0.3.0_x64-setup.exe",
    url: "/downloads/Clearspace_0.3.0_x64-setup.exe",
    sizeBytes: 0,
    sizeFormatted: "v0.3.0",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

  function setSelectedArtifact(artifact: ReleaseArtifact): void {
    activeArtifact = artifact;
    if (activeFilenameEl) activeFilenameEl.textContent = artifact.filename;
    if (activeShaEl) activeShaEl.textContent = artifact.sha256;
    if (dialogFilename) dialogFilename.textContent = artifact.filename;
    if (dialogPsCmd) {
      dialogPsCmd.textContent = `Get-FileHash .\\${artifact.filename} -Algorithm SHA256`;
    }
  }

  try {
    const res = await fetch("/downloads/release-manifest.json");
    if (res.ok) {
      manifest = (await res.json()) as ReleaseManifest;
      if (manifest.artifacts && manifest.artifacts.length > 0) {
        const nsis = manifest.artifacts.find((a) => a.id === "win-nsis");
        const msi = manifest.artifacts.find((a) => a.id === "win-msi");
        const portable = manifest.artifacts.find((a) => a.id === "win-portable");

        if (nsis) {
          const metaNsis = document.getElementById("meta-win-nsis");
          if (metaNsis) metaNsis.textContent = `Recommended NSIS Installer • ${nsis.sizeFormatted} • v${manifest.version}`;
          const sizeCell = document.getElementById("table-size-nsis");
          const hashCell = document.getElementById("table-hash-nsis");
          if (sizeCell) sizeCell.textContent = nsis.sizeFormatted;
          if (hashCell) hashCell.textContent = `${nsis.sha256.slice(0, 20)}...`;
        }

        if (msi) {
          const metaMsi = document.getElementById("meta-win-msi");
          if (metaMsi) metaMsi.textContent = `Windows MSI • ${msi.sizeFormatted}`;
          const sizeCell = document.getElementById("table-size-msi");
          const hashCell = document.getElementById("table-hash-msi");
          if (sizeCell) sizeCell.textContent = msi.sizeFormatted;
          if (hashCell) hashCell.textContent = `${msi.sha256.slice(0, 20)}...`;
        }

        if (portable) {
          const metaPort = document.getElementById("meta-win-portable");
          if (metaPort) metaPort.textContent = `Zero-Install Binary • ${portable.sizeFormatted}`;
          const sizeCell = document.getElementById("table-size-portable");
          const hashCell = document.getElementById("table-hash-portable");
          if (sizeCell) sizeCell.textContent = portable.sizeFormatted;
          if (hashCell) hashCell.textContent = `${portable.sha256.slice(0, 20)}...`;
        }

        setSelectedArtifact(nsis ?? manifest.artifacts[0]);
      }
    }
  } catch {
    if (activeShaEl) {
      activeShaEl.textContent = activeArtifact.sha256;
    }
  }

  function openInstallDialogFor(artifactId?: string): void {
    if (manifest && artifactId) {
      const found = manifest.artifacts.find((a) => a.id === artifactId);
      if (found) setSelectedArtifact(found);
    }
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }
  }

  const downloadLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-artifact-id]"));
  for (const link of downloadLinks) {
    link.addEventListener("click", () => {
      const id = link.dataset.artifactId;
      announceStatus(`Downloading ${id ?? "Clearspace installer"}`);
      openInstallDialogFor(id);
    });
  }

  btnOpenGuide?.addEventListener("click", () => openInstallDialogFor(activeArtifact.id));
  btnCloseDialog?.addEventListener("click", () => dialog?.close());
  btnDialogDone?.addEventListener("click", () => dialog?.close());

  // Close native dialog on backdrop click
  dialog?.addEventListener("click", (e: MouseEvent) => {
    const rect = dialog.getBoundingClientRect();
    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!clickedInDialog) {
      dialog.close();
    }
  });

  btnCopySha?.addEventListener("click", () => {
    copyTextToClipboard(activeArtifact.sha256, "SHA-256 checksum", btnCopySha);
  });

  btnCopyPs?.addEventListener("click", () => {
    const cmd = `Get-FileHash .\\${activeArtifact.filename} -Algorithm SHA256`;
    copyTextToClipboard(cmd, "PowerShell verification command", btnCopyPs);
  });

  btnDialogCopyCmd?.addEventListener("click", () => {
    const cmd = `Get-FileHash .\\${activeArtifact.filename} -Algorithm SHA256`;
    copyTextToClipboard(cmd, "PowerShell verification command", btnDialogCopyCmd);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initFeatureTabs();
  initScrubberSandbox();
  void initReleaseDownloadsAndDialog();
});
