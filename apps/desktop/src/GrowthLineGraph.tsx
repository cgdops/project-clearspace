import React, { useMemo, useState } from "react";
import { EquityQuest, NormalizedPrompt } from "./vaultClient";

export interface GrowthDailyQualityInput {
  date: string;
  prompt_count: number;
  avg_quality_score: number;
  tier_counts?: [number, number, number];
}
export interface GrowthQuestInput extends EquityQuest {
  accepted_at?: string | null;
  completed_at?: string | null;
}
export interface GrowthLineGraphProps {
  dailyPromptQuality?: GrowthDailyQualityInput[];
  recentPrompts?: NormalizedPrompt[];
  dailyCounts?: [string, number][];
  quests: GrowthQuestInput[];
  latestDate?: string | null;
}

type PeriodKey = "7d" | "30d" | "1y";

function addUtcDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + days)).toISOString().slice(0, 10);
}

export function GrowthLineGraph({
  dailyPromptQuality = [],
  recentPrompts = [],
  dailyCounts = [],
  quests,
  latestDate = null,
}: GrowthLineGraphProps) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    let anchor = latestDate && /^\d{4}-\d{2}-\d{2}/.test(latestDate) ? latestDate.slice(0, 10) : "";

    const qualityMap = new Map<string, number>();
    if (dailyPromptQuality.length > 0) {
      for (const item of dailyPromptQuality) {
        const d = item.date?.slice(0, 10);
        if (d && item.prompt_count > 0) {
          qualityMap.set(d, Math.max(0, Math.min(100, item.avg_quality_score)));
          if (d > anchor) anchor = d;
        }
      }
    } else {
      for (const [rawDate, count] of dailyCounts) {
        const d = rawDate?.slice(0, 10);
        if (d && count > 0) {
          qualityMap.set(d, 65);
          if (d > anchor) anchor = d;
        }
      }
      const promptSums = new Map<string, { sum: number; count: number }>();
      for (const p of recentPrompts) {
        const d = p.created_at?.slice(0, 10);
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (d > anchor) anchor = d;
        const tier = p.skill_tier ?? "intermediate";
        const base = tier === "advanced" ? 90 : tier === "intermediate" ? 65 : 25;
        const score = Math.min(100, base + (p.is_high_signal ? 10 : 0));
        const cur = promptSums.get(d) ?? { sum: 0, count: 0 };
        promptSums.set(d, { sum: cur.sum + score, count: cur.count + 1 });
      }
      for (const [d, { sum, count }] of promptSums.entries()) qualityMap.set(d, sum / count);
    }

    for (const q of quests) {
      for (const ts of [q.accepted_at, q.completed_at]) {
        const d = ts?.slice(0, 10);
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d > anchor) anchor = d;
      }
    }
    if (!anchor) anchor = new Date().toISOString().slice(0, 10);

    const totalQuestPts = quests.reduce((acc, q) => acc + q.equity_points, 0);
    let ewma: number | null = null;
    const windowStart = addUtcDaysStr(anchor, -364);
    for (const [d, v] of Array.from(qualityMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      if (d < windowStart) ewma = ewma === null ? v : 0.35 * v + 0.65 * ewma;
    }
    const dailyScores = new Map<string, { composite: number; promptScore: number; commitmentScore: number }>();

    for (let i = 364; i >= 0; i--) {
      const d = addUtcDaysStr(anchor, -i);
      const qVal = qualityMap.get(d);
      if (qVal !== undefined) ewma = ewma === null ? qVal : 0.35 * qVal + 0.65 * ewma;
      const promptScore = Math.round((ewma ?? 0) * 0.5);
      let earnedPts = 0;
      for (const q of quests) {
        const accDate = q.accepted_at?.slice(0, 10) || "0000-01-01";
        const compDate = q.completed_at?.slice(0, 10) || "0000-01-01";
        if (q.completed && compDate <= d) earnedPts += q.equity_points;
        else if (q.accepted && accDate <= d) earnedPts += q.equity_points * 0.5;
      }
      const commitmentScore = totalQuestPts > 0 ? Math.round((earnedPts / totalQuestPts) * 50) : 0;
      dailyScores.set(d, { composite: Math.min(100, promptScore + commitmentScore), promptScore, commitmentScore });
    }

    const stepDays = period === "1y" ? 7 : 1;
    const count = period === "7d" ? 7 : period === "30d" ? 30 : 52;
    return Array.from({ length: count }, (_, idx) => {
      const d = addUtcDaysStr(anchor, -(count - 1 - idx) * stepDays);
      return { date: d, ...(dailyScores.get(d) ?? { composite: 0, promptScore: 0, commitmentScore: 0 }) };
    });
  }, [dailyPromptQuality, recentPrompts, dailyCounts, quests, latestDate, period]);

  const latest = series[series.length - 1] ?? { date: "", composite: 0, promptScore: 0, commitmentScore: 0 };
  const first = series[0] ?? latest;
  const mid = series[Math.floor(series.length / 2)] ?? latest;
  const activePt = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : latest;
  const delta = latest.composite - first.composite;
  const promptDelta = latest.promptScore - first.promptScore;

  const xAt = (i: number) => 48 + (i / Math.max(1, series.length - 1)) * 556;
  const yAt = (v: number) => 148 - (Math.max(0, Math.min(100, v)) / 100) * 124;
  const coords = series.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.composite).toFixed(1)}`).join(" ");
  const areaPoints = `${xAt(0).toFixed(1)},148 ${coords} ${xAt(series.length - 1).toFixed(1)},148`;

  return (
    <section className="insight-card" style={{ marginTop: 18 }} data-testid="growth-line-graph-card">
      <div className="growth-graph-header">
        <div>
          <div className="stat-label">Longitudinal Progress &amp; Calibration</div>
          <h3 style={{ fontSize: 20, marginTop: 2 }}>Growth Trajectory</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            0–100 score combining <strong>Learning Commitments</strong> and <strong>Prompt Depth Trajectory</strong>.
          </p>
        </div>
        <div className="growth-period-tabs" role="group" aria-label="Growth graph time period">
          {([["7d", "Past 7 Days"], ["30d", "Past 30 Days"], ["1y", "Past Year"]] as const).map(([key, label]) => (
            <button key={key} type="button" className={`btn-outline ${period === key ? "active" : ""}`} onClick={() => { setPeriod(key); setHoverIdx(null); }} data-testid={`growth-period-${key}`}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <span className="badge superpower">Current Growth: {latest.composite}/100 ({delta >= 0 ? `+${delta}` : delta} pts)</span>
        <span className={`badge ${promptDelta < 0 ? "burnout" : "value"}`}>Prompt Quality: {latest.promptScore}/50 ({promptDelta < 0 ? `Regression ${promptDelta}` : `+${promptDelta} trajectory`})</span>
        <span className="badge superpower">Learning Commitments: {latest.commitmentScore}/50</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }} data-testid="growth-hover-readout">
          {activePt.date}: <strong>{activePt.composite}/100</strong> (Prompt {activePt.promptScore}/50 • Quests {activePt.commitmentScore}/50)
        </span>
      </div>

      <div className="growth-svg-wrap">
        <svg viewBox="0 0 624 182" width="100%" role="img" aria-label="User growth line graph over time" data-testid="growth-line-svg" onMouseLeave={() => setHoverIdx(null)}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={48} y1={yAt(v)} x2={604} y2={yAt(v)} stroke="var(--border-warm)" strokeDasharray={v === 0 ? undefined : "4 4"} />
              <text x={40} y={yAt(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{v}</text>
            </g>
          ))}
          <text x={14} y={88} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--text-secondary)" transform="rotate(-90 14 88)">Growth</text>
          <polygon points={areaPoints} fill="var(--bg-accent-soft)" opacity="0.75" />
          <polyline fill="none" stroke="var(--accent-sage)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" points={coords} />
          {series.map((pt, i) => (
            <circle key={pt.date} cx={xAt(i)} cy={yAt(pt.composite)} r={hoverIdx === i ? 5 : 3} fill="var(--accent-sage)" opacity={hoverIdx === i ? 1 : 0.35} tabIndex={0} aria-label={`${pt.date}: Growth ${pt.composite} of 100`} onMouseEnter={() => setHoverIdx(i)} onFocus={() => setHoverIdx(i)} onBlur={() => setHoverIdx(null)} style={{ cursor: "pointer" }} />
          ))}
          <circle cx={xAt(series.length - 1)} cy={yAt(latest.composite)} r={5.5} fill="var(--accent-sage)" stroke="var(--bg-card)" strokeWidth="2" data-testid="growth-line-terminal-dot" />
          <text x={48} y={168} textAnchor="start" fontSize="10" fill="var(--text-muted)">{first.date}</text>
          <text x={326} y={168} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{mid.date} • Time →</text>
          <text x={604} y={168} textAnchor="end" fontSize="10" fill="var(--text-muted)">{latest.date}</text>
        </svg>
      </div>
    </section>
  );
}
