"use client";

import React from "react";
import { ChartCard, COLORS, EmptyChart, Select } from "./ChartCard";

export interface VerificationQualityData {
  approved: number;
  revisionRequested: number;
  rejected: number;
}

interface SupervisorQualityDonutChartProps {
  data: VerificationQualityData;
  selectedRange?: string;
  selectedMonth?: number;
  selectedYear?: number;
  onRangeChange?: (range: string) => void;
  title?: string;
  subtitle?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Part-to-whole of review outcomes: one split bar plus the counts.
export default function SupervisorQualityDonutChart({
  data,
  selectedRange = "month",
  selectedMonth,
  selectedYear,
  onRangeChange,
  title = "Review Outcomes",
  subtitle,
}: SupervisorQualityDonutChartProps) {
  const total = data.approved + data.revisionRequested + data.rejected;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const rows = [
    { label: "Approved", count: data.approved, color: COLORS.good },
    { label: "Revision requested", count: data.revisionRequested, color: COLORS.warning },
    { label: "Rejected", count: data.rejected, color: COLORS.critical },
  ];
  const monthLabel =
    selectedMonth !== undefined && selectedYear !== undefined ? `${MONTHS[selectedMonth]} ${selectedYear}` : "This month";

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={
        <Select
          label="Select time range"
          value={selectedRange}
          onChange={(v) => onRangeChange?.(v)}
          options={[
            { value: "month", label: monthLabel },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
            { value: "all", label: "All time" },
          ]}
        />
      }
    >
      {total === 0 ? (
        <EmptyChart text="No reviewed reports in this range." />
      ) : (
        <>
          <div>
            <div className="text-4xl font-semibold text-[#1A1A1A] leading-none">{pct(data.approved)}%</div>
            <div className="text-xs text-gray-500 mt-1">approved, of {total} reports</div>
          </div>
          <div className="flex h-3 gap-[2px]">
            {rows.map((r) =>
              r.count > 0 ? (
                <div
                  key={r.label}
                  className="h-full first:rounded-l last:rounded-r"
                  style={{ width: `${(r.count / total) * 100}%`, background: r.color }}
                  title={`${r.label}: ${r.count}`}
                />
              ) : null
            )}
          </div>
          <div className="space-y-2 text-xs">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
                <span className="text-gray-600 flex-1">{r.label}</span>
                <span className="font-medium text-[#1A1A1A] tabular-nums">{r.count}</span>
                <span className="w-10 text-right text-gray-500 tabular-nums">{pct(r.count)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}
