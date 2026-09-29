"use client";

import React, { useState } from "react";

export interface VendorWeeklyProgress {
  weekIndex?: number;
  period: string;       // e.g. "Week 1", "Week 2", etc.
  dateRange: string;    // e.g. "1 - 7 Sep", "29 - 30 Sep"
  completed: number;    // Tasks completed
  target: number;       // Tasks assigned
}

interface VendorPersonalTrendChartProps {
  data: VendorWeeklyProgress[];
  selectedMonth: number; // 0-11
  selectedYear: number;
  onPeriodChange?: (month: number, year: number) => void;
  title?: string;
  subtitle?: string;
}

export default function VendorPersonalTrendChart({
  data,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  title = "Personal PM Task Trends",
  subtitle = "Weekly completion rate vs admin target assignments (100% database sync)",
}: VendorPersonalTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempYear, setTempYear] = useState<number>(selectedYear);
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthShortNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Calculate days in the current selected month & year
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Generate calendar weeks for this month
  const availableWeeks = [
    { num: 1, label: `Week 1 (1 - 7 ${monthShortNames[selectedMonth]})` },
    { num: 2, label: `Week 2 (8 - 14 ${monthShortNames[selectedMonth]})` },
    { num: 3, label: `Week 3 (15 - 21 ${monthShortNames[selectedMonth]})` },
    { num: 4, label: `Week 4 (22 - 28 ${monthShortNames[selectedMonth]})` },
  ];
  if (daysInMonth > 28) {
    availableWeeks.push({
      num: 5,
      label: `Week 5 (29 - ${daysInMonth} ${monthShortNames[selectedMonth]})`,
    });
  }

  // Scaling with safe headroom (maximum bar will never exceed ~75% of chart height)
  const rawMax = Math.max(
    ...data.map((d) => Math.max(d.completed, d.target)),
    0
  );
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.35) : 5;

  const totalCompleted = data.reduce((acc, curr) => acc + curr.completed, 0);
  const totalTarget = data.reduce((acc, curr) => acc + curr.target, 0);
  const achievementRate =
    totalTarget > 0 ? `${Math.round((totalCompleted / totalTarget) * 100)}%` : "0%";

  const chartHeight = 130;

  // Active focused item if a week is selected
  const focusedWeekData =
    selectedWeek !== "all"
      ? data[selectedWeek - 1] || null
      : null;

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 lg:p-8 flex flex-col justify-between relative shadow-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/10 border border-[#D32F2F] flex items-center justify-center text-[#D32F2F]">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
            <h3 className="font-headline-md text-base lg:text-lg font-black text-[#1A1A1A] uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">
            {subtitle}
          </p>
        </div>

        {/* Custom Industrial Calendar & Week Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempYear(selectedYear);
                setIsCalendarOpen(!isCalendarOpen);
              }}
              className="flex items-center gap-2 bg-white border-2 border-[#1A1A1A] rounded-xl py-1.5 px-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#1A1A1A] hover:border-[#D32F2F] cursor-pointer transition-all"
            >
              <span className="flex items-center gap-1 text-[#D32F2F]">
                <span className="material-symbols-outlined text-xs">calendar_month</span>
                {selectedWeek === "all" ? "Period:" : "Week:"}
              </span>
              <span className="text-[#1A1A1A] font-extrabold">
                {selectedWeek === "all"
                  ? `${monthShortNames[selectedMonth]} ${selectedYear} • All Weeks`
                  : `Week ${selectedWeek} (${monthShortNames[selectedMonth]} ${selectedYear})`}
              </span>
              <span className="material-symbols-outlined text-sm text-gray-500">
                {isCalendarOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Floating Calendar & Week Picker Popover */}
            {isCalendarOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsCalendarOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border-2 border-[#1A1A1A] rounded-2xl p-4 shadow-[6px_6px_0px_0px_#1A1A1A] z-40 animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-[#D32F2F]">date_range</span>
                      Select Calendar Period
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="w-6 h-6 rounded-full border border-gray-300 hover:bg-[#D32F2F] hover:text-white flex items-center justify-center cursor-pointer text-gray-500 bg-white"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>

                  {/* Year Navigation Bar */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() => setTempYear((prev) => prev - 1)}
                      className="px-2 py-1 rounded-lg border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-xs font-black cursor-pointer bg-white transition-colors"
                      title="Previous Year"
                    >
                      ◀
                    </button>
                    <div className="text-center">
                      <span className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider block">
                        Year {tempYear}
                      </span>
                      <div className="flex items-center gap-1 justify-center mt-1">
                        {[2024, 2025, 2026, 2027].map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => {
                              setTempYear(yr);
                              onPeriodChange?.(selectedMonth, yr);
                            }}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer border ${
                              yr === tempYear
                                ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTempYear((prev) => prev + 1)}
                      className="px-2 py-1 rounded-lg border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-xs font-black cursor-pointer bg-white transition-colors"
                      title="Next Year"
                    >
                      ▶
                    </button>
                  </div>

                  {/* 12-Month Grid Selector */}
                  <div className="py-2.5">
                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1.5">
                      1. Choose Month ({tempYear})
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {monthShortNames.map((mShort, idx) => {
                        const isSelected = idx === selectedMonth && tempYear === selectedYear;
                        return (
                          <button
                            key={mShort}
                            type="button"
                            onClick={() => {
                              onPeriodChange?.(idx, tempYear);
                            }}
                            className={`py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#D32F2F] text-white border-[#D32F2F] shadow-sm"
                                : "bg-white text-gray-700 border-gray-200 hover:border-[#1A1A1A] hover:bg-gray-50"
                            }`}
                          >
                            {mShort}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Choose Week in Month */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">
                        2. Choose Weekly Breakdown
                      </span>
                      {selectedWeek !== "all" && (
                        <button
                          type="button"
                          onClick={() => setSelectedWeek("all")}
                          className="text-[9px] text-[#D32F2F] font-bold hover:underline cursor-pointer bg-transparent border-none"
                        >
                          Reset to All
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWeek("all");
                          setIsCalendarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                          selectedWeek === "all"
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <span className="text-[11px] font-extrabold uppercase">
                          All Weeks (Full Month Overview)
                        </span>
                        {selectedWeek === "all" && (
                          <span className="material-symbols-outlined text-xs">check</span>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {availableWeeks.map((wk) => (
                          <button
                            key={wk.num}
                            type="button"
                            onClick={() => {
                              setSelectedWeek(wk.num);
                              setIsCalendarOpen(false);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-left transition-colors cursor-pointer border ${
                              selectedWeek === wk.num
                                ? "bg-[#D32F2F] text-white border-[#D32F2F]"
                                : "bg-white text-gray-700 border-gray-200 hover:border-[#1A1A1A]"
                            }`}
                          >
                            <span className="font-extrabold uppercase block leading-tight">
                              Week {wk.num}
                            </span>
                            <span className="text-[8px] opacity-80 block truncate">
                              {wk.label.split("(")[1]?.replace(")", "") || ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Achievement Rate Pill */}
          <div className="bg-green-50 border-2 border-green-700 px-3 py-1.5 rounded-xl text-right flex items-center gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-green-800 block leading-none">
                Completion Rate
              </span>
              <span className="text-sm font-black text-green-800">
                {achievementRate}
              </span>
            </div>
            <span className="material-symbols-outlined text-green-700 text-lg">verified</span>
          </div>
        </div>
      </div>

      {/* Zero Data Indicator for Selected Month & Year */}
      {totalTarget === 0 && (
        <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">info</span>
            <span>
              No PM tasks assigned for <strong>{monthNames[selectedMonth]} {selectedYear}</strong> in database.
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-amber-700 font-black shrink-0 hidden sm:inline">
            100% Pure Database Data
          </span>
        </div>
      )}

      {/* Week Focus Notification Banner if a single week is chosen */}
      {selectedWeek !== "all" && focusedWeekData && (
        <div className="mt-3 p-2.5 bg-blue-50 border-2 border-blue-600 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900 font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-base">filter_alt</span>
            <span>
              Focused on <strong>{focusedWeekData.period}</strong> ({focusedWeekData.dateRange}): {focusedWeekData.completed} Completed of {focusedWeekData.target} Assigned
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedWeek("all")}
            className="text-[9px] font-black uppercase bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-800 cursor-pointer border-none"
          >
            Show All Weeks
          </button>
        </div>
      )}

      {/* Legend & Target Explanation (with generous margin to ensure zero collision) */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-6 pt-2 pb-2">
        <div className="flex items-center gap-5 text-xs font-bold text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-600 border border-[#1A1A1A]" />
            <span className="text-[11px] uppercase tracking-wide">Tasks Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-200 border border-dashed border-gray-500" />
            <span className="text-[11px] uppercase tracking-wide">Target Assigned</span>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold text-gray-400">
          {data.length} Realtime Calendar Weeks
        </span>
      </div>

      {/* Chart Section: Dedicated Height Track & Separated X-Axis */}
      <div className="mt-4 relative">
        {/* Bars Plotting Track (Guaranteed Headroom, cannot touch legend) */}
        <div className="h-[150px] w-full flex items-end justify-around gap-2 sm:gap-4 px-2 border-b-2 border-[#1A1A1A] relative">
          {data.map((item, idx) => {
            const completedHeight = (item.completed / maxVal) * chartHeight;
            const targetHeight = (item.target / maxVal) * chartHeight;
            const isHovered = hoveredIdx === idx;
            const isWeekMatch = selectedWeek === "all" || selectedWeek === idx + 1;

            return (
              <div
                key={item.period}
                className={`flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group transition-all duration-200 ${
                  isWeekMatch ? "opacity-100" : "opacity-30 scale-95"
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  setSelectedWeek((prev) => (prev === idx + 1 ? "all" : idx + 1));
                }}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 bg-[#1A1A1A] text-white text-[10px] py-1.5 px-3 rounded-lg border border-white/20 shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in">
                    <p className="font-bold text-[#D32F2F] uppercase">
                      {item.period} ({item.dateRange})
                    </p>
                    <p>
                      ✓ Done: {item.completed} • 🎯 Target Assigned: {item.target}
                    </p>
                  </div>
                )}

                {/* Bars (Completed & Target) */}
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <div
                    style={{ height: `${Math.max(completedHeight, 4)}px` }}
                    className={`w-5 sm:w-7 bg-green-600 rounded-t-sm transition-all duration-200 border border-[#1A1A1A] ${
                      isHovered || selectedWeek === idx + 1
                        ? "ring-2 ring-[#D32F2F] scale-105"
                        : ""
                    }`}
                    title={`Completed: ${item.completed}`}
                  />
                  <div
                    style={{ height: `${Math.max(targetHeight, 4)}px` }}
                    className="w-3 sm:w-4 bg-gray-200 border border-dashed border-gray-400 rounded-t-sm"
                    title={`Target Assigned: ${item.target}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Separated X-Axis Labels (Positioned cleanly below the baseline border) */}
        <div className="w-full flex items-start justify-around gap-2 sm:gap-4 px-2 pt-2.5">
          {data.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            const isWeekMatch = selectedWeek === "all" || selectedWeek === idx + 1;

            return (
              <div
                key={item.period}
                className={`flex-1 flex flex-col items-center cursor-pointer transition-colors ${
                  isWeekMatch ? "opacity-100" : "opacity-40"
                }`}
                onClick={() => {
                  setSelectedWeek((prev) => (prev === idx + 1 ? "all" : idx + 1));
                }}
              >
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                    isHovered || selectedWeek === idx + 1
                      ? "text-[#D32F2F] font-black"
                      : "text-gray-700"
                  }`}
                >
                  {item.period}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 whitespace-nowrap">
                  {item.dateRange}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-[11px] text-gray-500 font-bold gap-2">
        <span>
          Total {totalCompleted} of {totalTarget} assigned PM tasks completed
        </span>
        <span className={totalCompleted >= totalTarget && totalTarget > 0 ? "text-green-700" : "text-amber-700"}>
          {totalTarget === 0
            ? "No tasks assigned for this period"
            : totalCompleted >= totalTarget
            ? "🔥 Assigned Target Met (100%)"
            : `${totalTarget - totalCompleted} remaining tasks to reach 100%`}
        </span>
      </div>
    </div>
  );
}
