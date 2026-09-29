"use client";

import React, { useState } from "react";

export interface MonthlyPMData {
  month: string;
  monthIndex: number; // 0 for Jan, 11 for Des
  completed: number;
  inProgress: number;
  overdue: number;
  isFuture?: boolean;
}

interface AdminMonthlyTrendChartProps {
  data: MonthlyPMData[];
  selectedYear: number;
  availableYears?: number[];
  onYearChange?: (year: number) => void;
  title?: string;
  subtitle?: string;
}

export default function AdminMonthlyTrendChart({
  data,
  selectedYear,
  availableYears = [2026, 2025, 2024],
  onYearChange,
  title = "Monthly PM Execution Trends",
  subtitle = "Historical PM task volume: Completed, In Progress, and Overdue (Jan - Dec)",
}: AdminMonthlyTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [chartDecade, setChartDecade] = useState<number>(Math.floor(selectedYear / 10) * 10);

  // Compute maximum for chart scaling
  const maxTotal = Math.max(
    ...data.map((d) => d.completed + d.inProgress + d.overdue),
    10
  );

  const totalCompleted = data.reduce((acc, curr) => acc + curr.completed, 0);
  const totalTasks = data.reduce(
    (acc, curr) => acc + curr.completed + curr.inProgress + curr.overdue,
    0
  );
  const complianceRate =
    totalTasks > 0 ? `${Math.round((totalCompleted / totalTasks) * 100)}%` : "0%";

  const chartHeight = 170;

  // Active item info for status banner
  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 lg:p-8 flex flex-col justify-between shadow-none relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/10 border border-[#D32F2F] flex items-center justify-center text-[#D32F2F]">
              <span className="material-symbols-outlined text-lg">bar_chart</span>
            </div>
            <h3 className="font-headline-md text-base lg:text-lg font-black text-[#1A1A1A] uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mt-1">
            {subtitle}
          </p>
        </div>

        {/* Custom Industrial Year Selector & Compliance Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Year Dropdown with Decade Navigation */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setChartDecade(Math.floor(selectedYear / 10) * 10);
                setIsYearDropdownOpen(!isYearDropdownOpen);
              }}
              className="flex items-center gap-2 bg-white border-2 border-[#1A1A1A] rounded-xl py-1.5 px-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#1A1A1A] hover:border-[#D32F2F] cursor-pointer transition-all bg-white"
            >
              <span className="flex items-center gap-1 text-[#D32F2F]">
                <span className="material-symbols-outlined text-xs">calendar_today</span>
                Year:
              </span>
              <span className="text-[#1A1A1A] font-extrabold">{selectedYear}</span>
              <span className="material-symbols-outlined text-sm text-gray-500">
                {isYearDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isYearDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsYearDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[#1A1A1A] rounded-2xl p-3 shadow-[6px_6px_0px_0px_#1A1A1A] z-40 animate-in fade-in zoom-in-95 duration-150">
                  {/* Decade Header Navigator */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => setChartDecade((prev) => prev - 10)}
                      className="px-2 py-0.5 rounded border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-xs font-black cursor-pointer bg-white transition-colors"
                      title="Previous Decade"
                    >
                      ◀
                    </button>
                    <span className="text-[10px] font-black uppercase text-[#1A1A1A] tracking-wider">
                      {chartDecade} - {chartDecade + 9}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChartDecade((prev) => prev + 10)}
                      className="px-2 py-0.5 rounded border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-xs font-black cursor-pointer bg-white transition-colors"
                      title="Next Decade"
                    >
                      ▶
                    </button>
                  </div>

                  {/* 12 Years Grid */}
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 12 }, (_, i) => chartDecade - 1 + i).map((yr) => {
                      const isSelected = yr === selectedYear;
                      const isOutside = yr < chartDecade || yr > chartDecade + 9;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            onYearChange?.(yr);
                            setIsYearDropdownOpen(false);
                          }}
                          className={`py-1.5 text-xs font-black uppercase rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#D32F2F] text-white border-[#D32F2F]"
                              : isOutside
                              ? "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300"
                              : "bg-white text-gray-700 border-gray-200 hover:border-[#1A1A1A] hover:bg-gray-50"
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Compliance Score Pill */}
          <div className="bg-green-50 border-2 border-green-700 px-3 py-1.5 rounded-xl text-right flex items-center gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-green-800 block leading-none">
                PM Compliance
              </span>
              <span className="text-sm font-black text-green-800">
                {complianceRate}
              </span>
            </div>
            <span className="material-symbols-outlined text-green-700 text-lg">verified</span>
          </div>
        </div>
      </div>

      {/* Zero Data Indicator for Selected Year */}
      {totalTasks === 0 && (
        <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">info</span>
            <span>
              No PM task assignments recorded for year <strong>{selectedYear}</strong> in database.
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-black shrink-0 hidden sm:inline">
            100% Pure Database Data
          </span>
        </div>
      )}

      {/* Legend & Dynamic Hover Preview Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-2">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-600 border border-[#1A1A1A]" />
            <span className="text-[11px] uppercase tracking-wide">Completed (Approved)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#1A1A1A]" />
            <span className="text-[11px] uppercase tracking-wide">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#D32F2F]" />
            <span className="text-[11px] uppercase tracking-wide">Overdue</span>
          </div>
        </div>

        {/* Hover Detail Card to avoid any cut-off text */}
        <div className="text-right">
          {activeItem ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] text-white rounded-lg text-xs font-black animate-in fade-in">
              <span className="text-[#D32F2F] uppercase">{activeItem.month} {selectedYear}:</span>
              <span>{activeItem.completed + activeItem.inProgress + activeItem.overdue} Total</span>
              <span className="text-gray-400 font-normal">
                (✓ {activeItem.completed} Done • ⏱ {activeItem.inProgress} Active • ⚠ {activeItem.overdue} Late)
              </span>
            </div>
          ) : (
            <span className="text-[10px] uppercase font-bold text-gray-400">
              Hover over a month bar for breakdown details
            </span>
          )}
        </div>
      </div>

      {/* 12-Month Bar Chart Area (Spacious & No Text Cut-Off) */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="h-[210px] w-full flex items-end justify-between gap-1 sm:gap-2 px-1 border-b-2 border-[#1A1A1A]">
          {data.map((item, idx) => {
            const sum = item.completed + item.inProgress + item.overdue;
            const completedHeight = (item.completed / maxTotal) * chartHeight;
            const inProgressHeight = (item.inProgress / maxTotal) * chartHeight;
            const overdueHeight = (item.overdue / maxTotal) * chartHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group py-1"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Stacked Bar Container */}
                <div
                  className={`w-full max-w-[28px] sm:max-w-[34px] flex flex-col-reverse rounded-t-md overflow-hidden border border-[#1A1A1A] transition-all duration-200 ${
                    item.isFuture ? "border-dashed opacity-50 bg-gray-100" : ""
                  } ${isHovered ? "ring-2 ring-[#D32F2F] scale-105 opacity-100" : ""}`}
                  style={{ height: `${Math.max((sum / maxTotal) * chartHeight, 6)}px` }}
                >
                  {/* Completed (Bottom) */}
                  <div
                    style={{ height: `${completedHeight}px` }}
                    className="bg-green-600 w-full transition-all"
                  />
                  {/* In Progress / Scheduled (Middle) */}
                  <div
                    style={{ height: `${inProgressHeight}px` }}
                    className={`${item.isFuture ? "bg-gray-400" : "bg-[#1A1A1A]"} w-full transition-all`}
                  />
                  {/* Overdue (Top) */}
                  <div
                    style={{ height: `${overdueHeight}px` }}
                    className="bg-[#D32F2F] w-full transition-all"
                  />
                </div>

                {/* X-axis Month Label */}
                <div className="flex flex-col items-center mt-3">
                  <span
                    className={`text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-colors ${
                      item.monthIndex === 8 && selectedYear === 2026
                        ? "text-[#D32F2F] font-black bg-[#D32F2F]/10 px-1 rounded"
                        : isHovered
                        ? "text-[#D32F2F] font-black"
                        : item.isFuture
                        ? "text-gray-400"
                        : "text-gray-700"
                    }`}
                  >
                    {item.month}
                  </span>
                  {item.isFuture && (
                    <span className="text-[7px] text-gray-400 uppercase font-bold leading-none mt-0.5">
                      Planned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-2 flex flex-wrap items-center justify-between text-xs text-gray-600 font-bold gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-600" />
          Year {selectedYear}: Total {totalTasks} PM Tasks ({totalCompleted} Completed)
        </span>
        <span className="text-[#D32F2F] flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">warning</span>
          {data.reduce((acc, curr) => acc + curr.overdue, 0)} Overdue Tasks
        </span>
      </div>
    </div>
  );
}
