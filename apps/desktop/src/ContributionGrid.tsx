import React, { useMemo, useState } from "react";
import { NormalizedPrompt } from "./vaultClient";

export type GridIntensityLevel = 0 | 1 | 2 | 3 | 4;
export type GridColorTheme = "github-dark" | "clearspace-sage";

export interface DayCellData {
  dateStr: string;
  count: number;
  level: GridIntensityLevel;
  dayOfWeek: number; // 0 = Sun .. 6 = Sat
  inTargetPeriod: boolean;
  tooltipText: string;
}

export interface WeekColumnData {
  weekIndex: number;
  startDateStr: string;
  days: DayCellData[];
}

export interface MonthLabelPosition {
  monthShort: string;
  weekIndex: number;
}

export interface ContributionGridModel {
  weeks: WeekColumnData[];
  monthLabels: MonthLabelPosition[];
  totalPrompts: number;
  activeDays: number;
  maxDailyCount: number;
  longestStreak: number;
  availableYears: string[];
  periodLabel: string;
}

const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function ordinalDaySuffix(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function formatContributionTooltip(dateStr: string, count: number): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return `${count} prompts on ${dateStr}.`;
  }
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dayNum = parseInt(parts[2], 10);
  const monthName = MONTH_NAMES_FULL[monthIdx] ?? parts[1];
  const dayOrd = ordinalDaySuffix(dayNum);

  if (count <= 0) {
    return `No prompts on ${monthName} ${dayOrd}.`;
  }
  if (count === 1) {
    return `1 prompt on ${monthName} ${dayOrd}.`;
  }
  return `${count.toLocaleString()} prompts on ${monthName} ${dayOrd}.`;
}

export function computeIntensityLevel(count: number, maxCount: number): GridIntensityLevel {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 3;
  if (maxCount === 2) return count === 1 ? 2 : 4;
  if (maxCount === 3) return count === 1 ? 2 : count === 2 ? 3 : 4;

  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function toUtcDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseUtcDateStr(dateStr: string): Date {
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
}

function addUtcDays(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

export function buildContributionGridModel(
  dailyCounts: [string, number][],
  selectedPeriod: string = "last_year",
  referenceDateStr?: string | null
): ContributionGridModel {
  const countMap = new Map<string, number>();
  const yearSet = new Set<string>();

  for (const [rawDate, count] of dailyCounts) {
    if (!rawDate || count <= 0) continue;
    const dateKey = rawDate.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      countMap.set(dateKey, (countMap.get(dateKey) ?? 0) + count);
      yearSet.add(dateKey.slice(0, 4));
    }
  }

  const now = new Date();
  const todayStr = toUtcDateStr(now);
  yearSet.add(todayStr.slice(0, 4));

  // Ensure at least 3 recent calendar years appear in the year selector like GitHub
  const currentYearNum = parseInt(todayStr.slice(0, 4), 10);
  yearSet.add(String(currentYearNum));
  yearSet.add(String(currentYearNum - 1));
  yearSet.add(String(currentYearNum - 2));

  const availableYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

  // Determine the date range [rangeStart, rangeEnd]
  let rangeStart: Date;
  let rangeEnd: Date;
  let periodLabel: string;
  let isFixedYear = false;
  let targetYearNum = currentYearNum;

  if (/^\d{4}$/.test(selectedPeriod)) {
    isFixedYear = true;
    targetYearNum = parseInt(selectedPeriod, 10);
    // If selected year is the current year and reference date is before Dec 31, show full year or up to Dec 31
    rangeStart = new Date(Date.UTC(targetYearNum, 0, 1));
    rangeEnd = new Date(Date.UTC(targetYearNum, 11, 31));
    periodLabel = `in ${selectedPeriod}`;
  } else {
    // "last_year" (trailing 52 weeks + current week ending on anchor date)
    let anchorStr = todayStr;
    if (referenceDateStr && /^\d{4}-\d{2}-\d{2}/.test(referenceDateStr)) {
      const refDay = referenceDateStr.slice(0, 10);
      if (refDay > anchorStr) {
        anchorStr = refDay;
      }
    }
    rangeEnd = parseUtcDateStr(anchorStr);
    const endDow = rangeEnd.getUTCDay(); // 0 = Sun .. 6 = Sat
    const endSunday = addUtcDays(rangeEnd, -endDow);
    rangeStart = addUtcDays(endSunday, -52 * 7);
    periodLabel = "in the last year";
  }

  // Align grid start to Sunday of the first week and Saturday of the last week
  const startDow = rangeStart.getUTCDay();
  const gridStartSunday = addUtcDays(rangeStart, -startDow);
  const endDow = rangeEnd.getUTCDay();
  const gridEndSaturday = addUtcDays(rangeEnd, 6 - endDow);

  // Collect all in-period counts to compute maxDailyCount, totalPrompts, activeDays, longestStreak
  let maxDailyCount = 0;
  let totalPrompts = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  const totalDays =
    Math.round((gridEndSaturday.getTime() - gridStartSunday.getTime()) / 86_400_000) + 1;

  for (let i = 0; i < totalDays; i++) {
    const cur = addUtcDays(gridStartSunday, i);
    const curStr = toUtcDateStr(cur);
    const inPeriod = isFixedYear
      ? cur.getUTCFullYear() === targetYearNum
      : cur >= rangeStart && cur <= rangeEnd;

    if (!inPeriod) continue;

    const c = countMap.get(curStr) ?? 0;
    if (c > 0) {
      totalPrompts += c;
      activeDays += 1;
      if (c > maxDailyCount) maxDailyCount = c;
      runningStreak += 1;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  const weeks: WeekColumnData[] = [];
  const monthLabels: MonthLabelPosition[] = [];
  let lastLabeledMonth = -1;
  let lastLabelWeekIdx = -10;

  const numWeeks = Math.ceil(totalDays / 7);
  for (let w = 0; w < numWeeks; w++) {
    const weekStart = addUtcDays(gridStartSunday, w * 7);
    const days: DayCellData[] = [];

    for (let dow = 0; dow < 7; dow++) {
      const cellDate = addUtcDays(weekStart, dow);
      const dateStr = toUtcDateStr(cellDate);
      const inTargetPeriod = isFixedYear
        ? cellDate.getUTCFullYear() === targetYearNum
        : cellDate >= rangeStart && cellDate <= rangeEnd;

      const count = inTargetPeriod ? countMap.get(dateStr) ?? 0 : 0;
      const level = inTargetPeriod ? computeIntensityLevel(count, maxDailyCount) : 0;
      const tooltipText = formatContributionTooltip(dateStr, count);

      days.push({
        dateStr,
        count,
        level,
        dayOfWeek: dow,
        inTargetPeriod,
        tooltipText,
      });

      // Check if this week starts a new month (on the 1st of the month, or the first visible week)
      if (inTargetPeriod && (cellDate.getUTCDate() === 1 || (w === 0 && dow === 0))) {
        const mIdx = cellDate.getUTCMonth();
        if (mIdx !== lastLabeledMonth && w - lastLabelWeekIdx >= 2) {
          monthLabels.push({
            monthShort: MONTH_NAMES_SHORT[mIdx],
            weekIndex: w,
          });
          lastLabeledMonth = mIdx;
          lastLabelWeekIdx = w;
        } else if (w === 0 && lastLabeledMonth === -1) {
          monthLabels.push({
            monthShort: MONTH_NAMES_SHORT[mIdx],
            weekIndex: 0,
          });
          lastLabeledMonth = mIdx;
          lastLabelWeekIdx = 0;
        }
      }
    }

    // If week 0 was followed immediately at week 1 by a new month label, drop week 0's partial month label to prevent crowding
    if (
      monthLabels.length >= 2 &&
      monthLabels[monthLabels.length - 1].weekIndex -
        monthLabels[monthLabels.length - 2].weekIndex <
        2
    ) {
      monthLabels.splice(monthLabels.length - 2, 1);
    }

    weeks.push({
      weekIndex: w,
      startDateStr: toUtcDateStr(weekStart),
      days,
    });
  }

  return {
    weeks,
    monthLabels,
    totalPrompts,
    activeDays,
    maxDailyCount,
    longestStreak,
    availableYears,
    periodLabel,
  };
}

interface ContributionGridProps {
  dailyCounts?: [string, number][];
  recentPrompts?: NormalizedPrompt[];
  latestDate?: string | null;
}

interface HoveredCellState {
  cell: DayCellData;
  weekIndex: number;
  totalWeeks: number;
}

export function ContributionGrid({
  dailyCounts = [],
  recentPrompts = [],
  latestDate = null,
}: ContributionGridProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last_year");
  const [colorTheme, setColorTheme] = useState<GridColorTheme>("github-dark");
  const [hovered, setHovered] = useState<HoveredCellState | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Merge dailyCounts with any recentPrompts dates if dailyCounts is empty
  const effectiveDailyCounts = useMemo<[string, number][]>(() => {
    if (dailyCounts && dailyCounts.length > 0) {
      return dailyCounts;
    }
    if (!recentPrompts || recentPrompts.length === 0) {
      return [];
    }
    const map = new Map<string, number>();
    for (const p of recentPrompts) {
      const d = p.created_at?.slice(0, 10);
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        map.set(d, (map.get(d) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dailyCounts, recentPrompts]);

  const model = useMemo(
    () => buildContributionGridModel(effectiveDailyCounts, selectedPeriod, latestDate),
    [effectiveDailyCounts, selectedPeriod, latestDate]
  );

  const selectedDayPrompts = useMemo(() => {
    if (!selectedDate) return [];
    return recentPrompts.filter((p) => p.created_at.slice(0, 10) === selectedDate);
  }, [selectedDate, recentPrompts]);

  const selectedDayCount = useMemo(() => {
    if (!selectedDate) return 0;
    const found = effectiveDailyCounts.find(([d]) => d.slice(0, 10) === selectedDate);
    return found ? found[1] : selectedDayPrompts.length;
  }, [selectedDate, effectiveDailyCounts, selectedDayPrompts]);

  const monthByWeek = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of model.monthLabels) {
      map.set(m.weekIndex, m.monthShort);
    }
    return map;
  }, [model.monthLabels]);

  return (
    <section
      className={`insight-card contribution-section theme-${colorTheme}`}
      data-testid="prompt-contribution-grid"
      aria-label="Prompt contribution activity grid"
    >
      <div className="contribution-top-bar">
        <div>
          <h3 className="contribution-heading" data-testid="contribution-summary-heading">
            {model.totalPrompts.toLocaleString()}{" "}
            {model.totalPrompts === 1 ? "prompt" : "prompts"} {model.periodLabel}
          </h3>
          <div className="contribution-sub-metrics">
            <span>
              <strong>{model.activeDays}</strong> active {model.activeDays === 1 ? "day" : "days"}
            </span>
            <span>•</span>
            <span>
              Peak day: <strong>{model.maxDailyCount}</strong>{" "}
              {model.maxDailyCount === 1 ? "prompt" : "prompts"}
            </span>
            <span>•</span>
            <span>
              Longest streak: <strong>{model.longestStreak}</strong>{" "}
              {model.longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        <div className="contribution-controls">
          <button
            type="button"
            className="contribution-theme-toggle"
            onClick={() =>
              setColorTheme((prev) =>
                prev === "github-dark" ? "clearspace-sage" : "github-dark"
              )
            }
            title="Switch contribution color palette"
            data-testid="contribution-theme-toggle"
          >
            Palette: {colorTheme === "github-dark" ? "GitHub Emerald" : "Clearspace Sage"}
          </button>
        </div>
      </div>

      <div className="contribution-layout">
        <div
          className="contribution-board"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Floating hover / focus tooltip */}
          {hovered && (
            <div
              className="contribution-tooltip"
              role="status"
              aria-live="polite"
              data-testid="contribution-hover-tooltip"
              style={{
                left: `${Math.min(
                  92,
                  Math.max(8, ((hovered.weekIndex + 0.5) / Math.max(hovered.totalWeeks, 1)) * 100)
                )}%`,
              }}
            >
              {hovered.cell.tooltipText}
            </div>
          )}

          {/* Month labels row aligned to week columns */}
          <div className="contribution-months-row" aria-hidden="true">
            <div className="contribution-dow-spacer" />
            <div
              className="contribution-months-grid"
              style={{
                gridTemplateColumns: `repeat(${model.weeks.length}, minmax(0, 1fr))`,
              }}
            >
              {model.weeks.map((w) => (
                <span key={w.weekIndex} className="contribution-month-label">
                  {monthByWeek.get(w.weekIndex) ?? ""}
                </span>
              ))}
            </div>
          </div>

          {/* 7-day rows x 53-week columns */}
          <div className="contribution-matrix-wrap">
            <div className="contribution-dow-labels" aria-hidden="true">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            <div
              className="contribution-weeks-grid"
              role="grid"
              aria-label="Daily prompt count heatmap"
              style={{
                gridTemplateColumns: `repeat(${model.weeks.length}, minmax(0, 1fr))`,
              }}
            >
              {model.weeks.map((week) => (
                <div key={week.weekIndex} className="contribution-week-col" role="row">
                  {week.days.map((day) => {
                    const isSelected = selectedDate === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        role="gridcell"
                        disabled={!day.inTargetPeriod}
                        className={`contribution-cell level-${day.level} ${
                          !day.inTargetPeriod ? "out-of-period" : ""
                        } ${isSelected ? "selected" : ""}`}
                        data-testid="contribution-day-cell"
                        data-date={day.dateStr}
                        data-count={day.count}
                        data-level={day.level}
                        aria-label={day.tooltipText}
                        aria-pressed={isSelected}
                        onMouseEnter={() =>
                          day.inTargetPeriod &&
                          setHovered({
                            cell: day,
                            weekIndex: week.weekIndex,
                            totalWeeks: model.weeks.length,
                          })
                        }
                        onFocus={() =>
                          day.inTargetPeriod &&
                          setHovered({
                            cell: day,
                            weekIndex: week.weekIndex,
                            totalWeeks: model.weeks.length,
                          })
                        }
                        onBlur={() => setHovered(null)}
                        onClick={() => {
                          if (!day.inTargetPeriod) return;
                          setSelectedDate((prev) => (prev === day.dateStr ? null : day.dateStr));
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer with hint & Less/More color legend */}
          <div className="contribution-footer">
            <span className="contribution-footer-note">
              {hovered
                ? hovered.cell.tooltipText
                : "Hover over any square to see daily prompt count • Click to inspect day"}
            </span>
            <div
              className="contribution-legend"
              aria-label="Color gradient intensity legend from Less to More"
              data-testid="contribution-color-legend"
            >
              <span>Less</span>
              <span className="contribution-cell level-0 legend-box" aria-hidden="true" />
              <span className="contribution-cell level-1 legend-box" aria-hidden="true" />
              <span className="contribution-cell level-2 legend-box" aria-hidden="true" />
              <span className="contribution-cell level-3 legend-box" aria-hidden="true" />
              <span className="contribution-cell level-4 legend-box" aria-hidden="true" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Year selector pills (like GitHub's right-side year buttons) */}
        <div
          className="contribution-year-list"
          role="group"
          aria-label="Filter contribution grid by year"
        >
          <button
            type="button"
            className={`contribution-year-btn ${selectedPeriod === "last_year" ? "active" : ""}`}
            onClick={() => {
              setSelectedPeriod("last_year");
              setSelectedDate(null);
            }}
            data-testid="contribution-year-last"
          >
            Last Year
          </button>
          {model.availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              className={`contribution-year-btn ${selectedPeriod === yr ? "active" : ""}`}
              onClick={() => {
                setSelectedPeriod(yr);
                setSelectedDate(null);
              }}
              data-testid={`contribution-year-${yr}`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Drilldown Drawer */}
      {selectedDate && (
        <div className="contribution-day-Inspector" data-testid="contribution-day-inspector">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <strong>{formatContributionTooltip(selectedDate, selectedDayCount)}</strong>
            <button
              type="button"
              className="btn-outline"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => setSelectedDate(null)}
            >
              Clear Day Filter
            </button>
          </div>
          {selectedDayPrompts.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {selectedDayPrompts.slice(0, 3).map((p) => (
                <div key={p.id} className="quote-box" style={{ marginTop: 4 }}>
                  <div className="quote-meta">
                    {p.created_at.slice(0, 16).replace("T", " ")} • {p.word_count} words
                  </div>
                  <div>
                    “
                    {p.cleaned_text.length > 200
                      ? `${p.cleaned_text.slice(0, 200)}…`
                      : p.cleaned_text}
                    ”
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
