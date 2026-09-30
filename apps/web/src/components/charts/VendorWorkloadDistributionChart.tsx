"use client";

import React from "react";
import { ChartCard, COLORS, EmptyChart } from "./ChartCard";

export interface VendorWorkloadData {
  periodLabel?: string; // e.g. "September 2026"
  highPriority: number;
  normalPriority: number;
  dueTodayOrOverdue: number; // urgent / <24h
  dueSoon: number;           // 1-3 days
  dueSafe: number;           // >3 days
  totalActive: number;
}

interface VendorWorkloadDistributionChartProps {
  data: VendorWorkloadData;
  title?: string;
  subtitle?: string;
}

export default function VendorWorkloadDistributionChart({
  data,
  title = "Upcoming Deadlines",
  subtitle,
}: VendorWorkloadDistributionChartProps) {
  const rows = [
    { label: "Due today or overdue", count: data.dueTodayOrOverdue, color: COLORS.critical },
    { label: "Due in 1–3 days", count: data.dueSoon, color: COLORS.warning },
    { label: "Due later", count: data.dueSafe, color: COLORS.good },
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ChartCard
      title={title}
      subtitle={
        subtitle ??
        `${data.totalActive} active tasks${data.periodLabel ? ` · ${data.periodLabel}` : ""} · ${data.highPriority} high priority`
      }
    >
      {data.totalActive === 0 ? (
        <EmptyChart text="No active tasks right now." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-xs">
              <span className="text-gray-600">{r.label}</span>
              <div className="h-2 rounded-full bg-gray-100">
                {r.count > 0 && (
                  <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: r.color }} />
                )}
              </div>
              <span className="text-right font-bold text-[#1A1A1A] tabular-nums">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
