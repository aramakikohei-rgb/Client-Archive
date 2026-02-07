"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_ROUTES } from "@/lib/constants";

interface ActivityChartProps {
  clientId: number;
}

interface InteractionRecord {
  interaction_type: string;
  interaction_date: string;
}

const TYPES = [
  { key: "meeting", label: "面会", color: "bg-blue-500" },
  { key: "call", label: "電話", color: "bg-green-500" },
  { key: "email", label: "メール", color: "bg-purple-500" },
  { key: "card_exchange", label: "名刺交換", color: "bg-red-500" },
];

function getMonthLabel(date: Date): string {
  return `${date.getMonth() + 1}月`;
}

function getYearLabel(date: Date): string {
  return `${date.getFullYear()}年`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function ActivityChart({ clientId }: ActivityChartProps) {
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(
    new Set(TYPES.map((t) => t.key))
  );

  useEffect(() => {
    fetch(`${API_ROUTES.CLIENT_INTERACTIONS(clientId)}?limit=200`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setInteractions(json.data || json || []))
      .catch(() => {});
  }, [clientId]);

  const months = useMemo(() => {
    const result: { key: string; label: string; yearLabel?: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prev = i < 11 ? new Date(now.getFullYear(), now.getMonth() - i - 1, 1) : null;
      result.push({
        key: getMonthKey(d),
        label: getMonthLabel(d),
        yearLabel: !prev || prev.getFullYear() !== d.getFullYear() ? getYearLabel(d) : undefined,
      });
    }
    return result;
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const m of months) {
      map[m.key] = {};
      for (const t of TYPES) map[m.key][t.key] = 0;
    }
    for (const ix of interactions) {
      const d = new Date(ix.interaction_date);
      const key = getMonthKey(d);
      if (map[key]) {
        const type = ix.interaction_type;
        if (map[key][type] !== undefined) {
          map[key][type]++;
        }
      }
    }
    return map;
  }, [interactions, months]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const monthData of Object.values(grouped)) {
      let sum = 0;
      for (const [type, count] of Object.entries(monthData)) {
        if (enabledTypes.has(type)) sum += count;
      }
      max = Math.max(max, sum);
    }
    return Math.max(max, 1);
  }, [grouped, enabledTypes]);

  const hasData = interactions.length > 0;
  const yScale = maxValue <= 5 ? 5 : maxValue <= 10 ? 10 : Math.ceil(maxValue / 5) * 5;

  function toggleType(key: string) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">活動量</h3>
        <div className="flex items-center gap-4">
          {TYPES.map((type) => (
            <label key={type.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={enabledTypes.has(type.key)}
                onChange={() => toggleType(type.key)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${type.color}`} />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative rounded-lg border border-slate-200 bg-white p-4">
        {!hasData ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            まだ接点がありません。
          </div>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {/* Y-axis labels */}
            <div className="flex h-full w-8 flex-col justify-between text-right text-[10px] text-slate-400">
              <span>{yScale}</span>
              <span>{Math.round(yScale / 2)}</span>
              <span>0</span>
            </div>

            {/* Bars */}
            <div className="flex flex-1 items-end justify-between gap-1">
              {months.map((month) => {
                const data = grouped[month.key] || {};
                const enabledData = TYPES.filter((t) => enabledTypes.has(t.key));
                const total = enabledData.reduce(
                  (sum, t) => sum + (data[t.key] || 0),
                  0
                );
                const heightPct = (total / yScale) * 100;

                return (
                  <div key={month.key} className="flex flex-1 flex-col items-center gap-1">
                    {/* Stacked bar */}
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm"
                      style={{ height: `${Math.max(heightPct, 0)}%`, minHeight: total > 0 ? 4 : 0 }}
                    >
                      {enabledData.map((type) => {
                        const count = data[type.key] || 0;
                        if (count === 0) return null;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div
                            key={type.key}
                            className={`w-full ${type.color}`}
                            style={{ height: `${pct}%`, minHeight: 2 }}
                          />
                        );
                      })}
                    </div>
                    {/* Label */}
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500">{month.label}</span>
                      {month.yearLabel && (
                        <span className="block text-[9px] text-slate-400">
                          {month.yearLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Count label */}
        {hasData && (
          <div className="absolute bottom-4 left-4 text-[10px] text-slate-400">(回)</div>
        )}
      </div>
    </div>
  );
}
