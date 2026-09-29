"use client";

import React from "react";

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
  title = "Task Urgency & SLA Deadlines",
  subtitle = "Active PM tasks for current monthly cycle (automatically resets each month)",
}: VendorWorkloadDistributionChartProps) {
  const totalPriorities = data.highPriority + data.normalPriority;

  const highPct = totalPriorities > 0 ? Math.round((data.highPriority / totalPriorities) * 100) : 0;
  const normalPct = totalPriorities > 0 ? 100 - highPct : 0;

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 lg:p-8 flex flex-col justify-between shadow-none relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/10 border border-[#D32F2F] flex items-center justify-center text-[#D32F2F]">
              <span className="material-symbols-outlined text-lg">alarm_on</span>
            </div>
            <h3 className="font-headline-md text-base lg:text-lg font-black text-[#1A1A1A] uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">
            {subtitle}
          </p>
        </div>

        {/* Current Monthly Cycle Badge & Focus Counter */}
        <div className="flex flex-wrap items-center gap-2">
          {data.periodLabel && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-2 border-[#1A1A1A] rounded-xl text-xs font-black uppercase text-[#1A1A1A]">
              <span className="material-symbols-outlined text-xs text-[#D32F2F]">calendar_month</span>
              <span>Cycle: {data.periodLabel}</span>
            </div>
          )}

          <div className="bg-gray-50 border border-[#1A1A1A] px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[9px] uppercase font-bold text-gray-400 block leading-none">
              Urgent Focus
            </span>
            <span className="text-sm font-black text-[#D32F2F]">
              {data.highPriority} High Priority
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {data.totalActive === 0 ? (
          <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center space-y-1 bg-gray-50/50">
            <span className="material-symbols-outlined text-3xl text-gray-400 block mb-1">
              task_alt
            </span>
            <p className="text-xs font-bold uppercase text-gray-600">
              No active tasks pending SLA deadlines in this monthly cycle.
            </p>
            <p className="text-[10px] uppercase font-extrabold text-gray-400">
              All tasks completed or awaiting new dispatch • 100% Pure Database Data
            </p>
          </div>
        ) : (
          <>
            {/* Priority Urgency Bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="text-gray-500 uppercase">Equipment Urgency Level</span>
                <span className="text-[#D32F2F] font-black uppercase">
                  {data.highPriority} High Priority Tasks
                </span>
              </div>

              <div className="w-full h-4 rounded-full overflow-hidden border border-[#1A1A1A] flex bg-gray-100">
                {data.highPriority > 0 && (
                  <div
                    style={{ width: `${highPct}%` }}
                    className="bg-[#D32F2F] h-full transition-all duration-300"
                    title={`High Priority: ${data.highPriority}`}
                  />
                )}
                {data.normalPriority > 0 && (
                  <div
                    style={{ width: `${normalPct}%` }}
                    className="bg-[#1A1A1A] h-full transition-all duration-300"
                    title={`Normal Priority: ${data.normalPriority}`}
                  />
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mt-1.5">
                <span className="flex items-center gap-1 text-[#D32F2F]">
                  <span className="w-2 h-2 rounded-full bg-[#D32F2F]" />
                  High / Critical ({highPct}%)
                </span>
                <span className="flex items-center gap-1 text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                  Normal ({normalPct}%)
                </span>
              </div>
            </div>

            {/* Deadline Urgency Breakdown (NO overlap with top cards) */}
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                SLA Deadline Urgency Breakdown (Active Tasks Only)
              </p>

              <div className="grid grid-cols-3 gap-3">
                {/* Urgent / Overdue */}
                <div className={`p-3.5 border-2 rounded-xl text-center ${
                  data.dueTodayOrOverdue > 0
                    ? "border-[#D32F2F] bg-red-50/50"
                    : "border-[#1A1A1A] bg-gray-50"
                }`}>
                  <div className="flex items-center justify-center gap-1 text-[#D32F2F] mb-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span className="text-[9px] uppercase font-black">
                      Today / Overdue
                    </span>
                  </div>
                  <span className="text-2xl font-black text-[#D32F2F]">
                    {data.dueTodayOrOverdue}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 block mt-0.5 uppercase">
                    &lt; 24 Hours
                  </span>
                </div>

                {/* Due Soon */}
                <div className="p-3.5 border-2 border-[#1A1A1A] rounded-xl bg-amber-50/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-700 mb-1">
                    <span className="material-symbols-outlined text-sm">hourglass_top</span>
                    <span className="text-[9px] uppercase font-black">
                      Due Soon
                    </span>
                  </div>
                  <span className="text-2xl font-black text-amber-700">
                    {data.dueSoon}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 block mt-0.5 uppercase">
                    1 - 3 Days
                  </span>
                </div>

                {/* Safe */}
                <div className="p-3.5 border-2 border-[#1A1A1A] rounded-xl bg-green-50/40 text-center">
                  <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span className="text-[9px] uppercase font-black">
                      Safe Schedule
                    </span>
                  </div>
                  <span className="text-2xl font-black text-green-700">
                    {data.dueSafe}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 block mt-0.5 uppercase">
                    &gt; 3 Days
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Recommendation */}
      <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-bold">
        {data.dueTodayOrOverdue > 0 ? (
          <span className="text-[#D32F2F] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">warning</span>
            Attention: {data.dueTodayOrOverdue} active task(s) due today or overdue. Prioritize execution immediately!
          </span>
        ) : (
          <span className="text-green-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">task_alt</span>
            All active assignments are within safe SLA completion deadlines.
          </span>
        )}
      </div>
    </div>
  );
}
