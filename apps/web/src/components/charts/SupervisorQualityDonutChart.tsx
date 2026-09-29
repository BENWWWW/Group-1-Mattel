"use client";

import React, { useState } from "react";

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

export default function SupervisorQualityDonutChart({
  data,
  selectedRange = "month",
  selectedMonth,
  selectedYear,
  onRangeChange,
  title = "Verification Quality & Approval Ratio",
  subtitle = "First-time approval rate vs revisions requested & rejected PM reports",
}: SupervisorQualityDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const cycleLabel = selectedMonth !== undefined && selectedYear !== undefined
    ? `Cycle: ${monthShortNames[selectedMonth]} ${selectedYear}`
    : "Current Cycle";

  const total = data.approved + data.revisionRequested + data.rejected;

  // Safe percentages (defaults to 0% when no reports exist)
  const approvedPct = total > 0 ? Math.round((data.approved / total) * 100) : 0;
  const revisionPct = total > 0 ? Math.round((data.revisionRequested / total) * 100) : 0;
  const rejectedPct = total > 0 ? Math.round((data.rejected / total) * 100) : 0;

  // Circumference for SVG circle of radius 40
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.32

  const approvedStroke = (data.approved / Math.max(total, 1)) * circumference;
  const revisionStroke = (data.revisionRequested / Math.max(total, 1)) * circumference;
  const rejectedStroke = (data.rejected / Math.max(total, 1)) * circumference;

  // Offsets
  const approvedOffset = 0;
  const revisionOffset = -approvedStroke;
  const rejectedOffset = -(approvedStroke + revisionStroke);

  const categories = [
    {
      id: "approved",
      label: "Directly Approved",
      count: data.approved,
      pct: approvedPct,
      color: "bg-green-600",
      strokeColor: "#16a34a",
    },
    {
      id: "revision",
      label: "Revision Requested",
      count: data.revisionRequested,
      pct: revisionPct,
      color: "bg-amber-500",
      strokeColor: "#f59e0b",
    },
    {
      id: "rejected",
      label: "Rejected",
      count: data.rejected,
      pct: rejectedPct,
      color: "bg-[#D32F2F]",
      strokeColor: "#D32F2F",
    },
  ];

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 lg:p-8 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D32F2F] text-xl">
              pie_chart
            </span>
            <h3 className="font-headline-md text-base lg:text-lg font-extrabold text-[#1A1A1A] uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Range Selector & Approval Rate Badge */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => onRangeChange?.(e.target.value)}
              aria-label="Select Verification Quality Time Range"
              className="bg-gray-50 border-2 border-[#1A1A1A] text-xs font-black uppercase py-1.5 pl-3 pr-7 rounded-xl focus:outline-none focus:border-[#D32F2F] cursor-pointer appearance-none"
            >
              <option value="month">{cycleLabel}</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-gray-500">
              arrow_drop_down
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-right border ${
            total > 0
              ? "bg-green-50 border-green-300 text-green-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}>
            <span className="text-[9px] uppercase font-bold block leading-none">
              Approval Rate
            </span>
            <span className="text-sm font-black">
              {total > 0 ? `${approvedPct}%` : "0%"}
            </span>
          </div>
        </div>
      </div>

      {/* Donut and Legend Body */}
      <div className="mt-6 flex flex-col md:flex-row items-center justify-around gap-6">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-gray-100"
              strokeWidth="14"
              stroke="currentColor"
              fill="transparent"
            />

            {/* Approved Segment */}
            {data.approved > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#16a34a"
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={`${approvedStroke} ${circumference}`}
                strokeDashoffset={approvedOffset}
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHoveredSlice("approved")}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            )}

            {/* Revision Segment */}
            {data.revisionRequested > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#f59e0b"
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={`${revisionStroke} ${circumference}`}
                strokeDashoffset={revisionOffset}
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHoveredSlice("revision")}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            )}

            {/* Rejected Segment */}
            {data.rejected > 0 && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#D32F2F"
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={`${rejectedStroke} ${circumference}`}
                strokeDashoffset={rejectedOffset}
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setHoveredSlice("rejected")}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            )}
          </svg>

          {/* Central Percentage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-2xl font-black text-[#1A1A1A]">
              {total > 0 ? `${approvedPct}%` : "0%"}
            </span>
            <span className="text-[9px] uppercase font-bold text-gray-400">
              Pass Rate
            </span>
          </div>
        </div>

        {/* Legend / Breakdown List */}
        <div className="flex-1 w-full space-y-3">
          {categories.map((cat) => {
            const isHovered = hoveredSlice === cat.id;
            return (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredSlice(cat.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  isHovered
                    ? "border-[#1A1A1A] bg-gray-50 scale-[1.02]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${cat.color}`} />
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#1A1A1A]">
                    {cat.count} ({cat.pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
        <span>Total {total} reports verified ({selectedRange === "month" ? "Current Cycle" : selectedRange})</span>
        <span className="text-green-700">Standard Target: &gt;85% Approved</span>
      </div>
    </div>
  );
}
