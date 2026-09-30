"use client";

import React from "react";
import { ChartCard, COLORS, EmptyChart } from "./ChartCard";

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  totalAssigned: number;
  completedOnTime: number;
  completedLate: number;
  pending: number;
  onTimeRate: number; // percentage, e.g. 94
  email?: string;
}

interface AdminVendorComparisonChartProps {
  data: VendorPerformance[];
  selectedYear?: number;
  title?: string;
  subtitle?: string;
}

export default function AdminVendorComparisonChart({
  data,
  selectedYear,
  title = "Vendor On-Time Rate",
  subtitle,
}: AdminVendorComparisonChartProps) {
  const sorted = [...data].sort(
    (a, b) => b.onTimeRate - a.onTimeRate || b.totalAssigned - a.totalAssigned
  );

  return (
    <ChartCard
      title={title}
      subtitle={subtitle ?? `Completed on time, ${selectedYear ?? "all years"} · ${data.length} vendors`}
    >
      {sorted.length === 0 ? (
        <EmptyChart text="No vendor data yet." />
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {sorted.map((v) => (
            <div
              key={v.vendorId}
              className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-3 text-xs"
              title={`${v.vendorName}\nOn time: ${v.completedOnTime}\nLate: ${v.completedLate}\nIn progress: ${v.pending}`}
            >
              <span className="font-semibold text-[#1A1A1A] truncate">{v.vendorName}</span>
              <div className="h-2 rounded-full bg-gray-100">
                {v.totalAssigned > 0 && (
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(v.onTimeRate, 100)}%`, background: COLORS.ink }}
                  />
                )}
              </div>
              <span className="w-24 text-right tabular-nums text-gray-600">
                {v.totalAssigned > 0 ? (
                  <>
                    <span className="font-bold text-[#1A1A1A]">{v.onTimeRate}%</span> · {v.totalAssigned} tasks
                  </>
                ) : (
                  "No tasks"
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
