"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
  maxDisplay?: number;
}

export default function AdminVendorComparisonChart({
  data,
  selectedYear,
  title = "Vendor Performance & On-Time Comparison",
  subtitle,
  maxDisplay = 4,
}: AdminVendorComparisonChartProps) {
  const chartSubtitle = subtitle || (selectedYear ? `Evaluation of On-Time Completion Rate and task volume in Year ${selectedYear}` : "Evaluation of On-Time Completion Rate and task volume per partner vendor");
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"onTime" | "volume">("onTime");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Sort vendors based on chosen criteria
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === "onTime") {
      return b.onTimeRate !== a.onTimeRate
        ? b.onTimeRate - a.onTimeRate
        : b.totalAssigned - a.totalAssigned;
    }
    return b.totalAssigned !== a.totalAssigned
      ? b.totalAssigned - a.totalAssigned
      : b.onTimeRate - a.onTimeRate;
  });

  const displayedVendors = sortedData.slice(0, maxDisplay);

  const getRatingBadge = (rate: number, totalAssigned?: number) => {
    if (totalAssigned === 0) {
      return { label: "NO TASKS", color: "bg-gray-100 text-gray-600 border-gray-300" };
    }
    if (rate >= 90) {
      return { label: "EXCELLENT", color: "bg-green-100 text-green-800 border-green-500" };
    } else if (rate >= 75) {
      return { label: "GOOD", color: "bg-blue-100 text-blue-800 border-blue-500" };
    } else if (rate >= 60) {
      return { label: "FAIR", color: "bg-yellow-100 text-yellow-800 border-yellow-500" };
    } else {
      return { label: "NEEDS ATTENTION", color: "bg-red-100 text-red-800 border-red-500" };
    }
  };

  const filteredModalVendors = sortedData.filter((v) =>
    v.vendorName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 lg:p-8 flex flex-col justify-between shadow-none relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b-2 border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D32F2F]/10 border border-[#D32F2F] flex items-center justify-center text-[#D32F2F]">
              <span className="material-symbols-outlined text-lg">leaderboard</span>
            </div>
            <h3 className="font-headline-md text-base lg:text-lg font-black text-[#1A1A1A] uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold mt-1">
            {chartSubtitle}
          </p>
        </div>

        {/* Custom Industrial Sort Dropdown & Year Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedYear && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-2 border-[#1A1A1A] rounded-xl text-xs font-black uppercase text-[#1A1A1A]">
              <span className="material-symbols-outlined text-xs text-[#D32F2F]">calendar_month</span>
              <span>Year {selectedYear}</span>
            </div>
          )}

          {/* Custom Sort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-2 bg-white border-2 border-[#1A1A1A] rounded-xl py-1.5 px-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#1A1A1A] hover:border-[#D32F2F] cursor-pointer transition-all"
            >
              <span className="flex items-center gap-1 text-[#D32F2F]">
                <span className="material-symbols-outlined text-xs">sort</span>
                Sort:
              </span>
              <span className="text-[#1A1A1A] font-extrabold">
                {sortBy === "onTime" ? "Performance (% On-Time)" : "Most Tasks"}
              </span>
              <span className="material-symbols-outlined text-sm text-gray-500">
                {isSortDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isSortDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsSortDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-[#1A1A1A] rounded-xl p-1.5 shadow-[4px_4px_0px_0px_#1A1A1A] z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[9px] uppercase font-bold text-gray-400 border-b border-gray-100 mb-1">
                    Sorting Criteria
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("onTime");
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs uppercase font-black transition-colors cursor-pointer border-none text-left mb-1 ${
                      sortBy === "onTime"
                        ? "bg-[#D32F2F] text-white"
                        : "text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                    }`}
                  >
                    <span>Performance (% On-Time)</span>
                    {sortBy === "onTime" && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("volume");
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs uppercase font-black transition-colors cursor-pointer border-none text-left ${
                      sortBy === "volume"
                        ? "bg-[#D32F2F] text-white"
                        : "text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                    }`}
                  >
                    <span>Most Tasks</span>
                    {sortBy === "volume" && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 border-2 border-[#1A1A1A] px-3 py-1.5 rounded-xl text-right">
            <span className="text-[9px] uppercase font-bold text-gray-400 block leading-none">
              Active Partners
            </span>
            <span className="text-sm font-black text-[#1A1A1A]">
              {data.length} Vendors
            </span>
          </div>
        </div>
      </div>

      {/* Vendors Horizontal Bar List */}
      <div className="mt-5 space-y-3">
        {displayedVendors.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-bold uppercase text-xs border-2 border-dashed border-gray-200 rounded-xl">
            No vendor task data available for comparison.
          </div>
        ) : (
          displayedVendors.map((vendor, idx) => {
            const badge = getRatingBadge(vendor.onTimeRate, vendor.totalAssigned);
            return (
              <div
                key={vendor.vendorId || idx}
                className="p-3.5 border-2 border-[#1A1A1A] rounded-xl hover:border-[#D32F2F] transition-all bg-gray-50/60"
              >
                {/* Top Row: Ranking number, Name, Tasks count, Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        idx === 0
                          ? "bg-[#D32F2F] text-white"
                          : "bg-[#1A1A1A] text-white"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <h4 className="font-headline-md text-xs sm:text-sm font-extrabold text-[#1A1A1A] uppercase tracking-tight">
                      {vendor.vendorName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase">
                      {vendor.totalAssigned} Tasks
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Bar representation */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-500">
                    <span>On-Time Rate</span>
                    <span className="font-black text-[#1A1A1A] text-xs">
                      {vendor.onTimeRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden border border-[#1A1A1A] flex">
                    {vendor.totalAssigned > 0 ? (
                      <>
                        <div
                          className="bg-green-600 h-full transition-all duration-500"
                          style={{ width: `${Math.min(vendor.onTimeRate, 100)}%` }}
                        />
                        <div
                          className="bg-[#D32F2F] h-full transition-all duration-500"
                          style={{ width: `${Math.max(100 - vendor.onTimeRate, 0)}%` }}
                        />
                      </>
                    ) : (
                      <div className="bg-gray-300 h-full w-full" />
                    )}
                  </div>
                </div>

                {/* Sub metrics */}
                <div className="flex items-center justify-between text-[10px] text-gray-600 font-bold mt-2 pt-2 border-t border-gray-200/80">
                  <span className="text-green-700">✓ On-Time: {vendor.completedOnTime}</span>
                  <span className="text-[#D32F2F]">⚠ Late: {vendor.completedLate}</span>
                  <span className="text-gray-600">⏱ Active: {vendor.pending}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer & Dual Actions (View All Modal vs Manage Accounts) */}
      <div className="mt-5 pt-3 border-t-2 border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
        <span className="text-gray-500 text-[11px]">
          Showing Top {Math.min(maxDisplay, sortedData.length)} of {sortedData.length} registered partners
        </span>

        <div className="flex items-center gap-3">
          {/* Button 1: Open Full Performance Ranking Modal (Always Available) */}
          <button
            onClick={() => setShowAllModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D32F2F] text-white rounded-lg text-xs font-black uppercase hover:bg-[#1A1A1A] transition-colors cursor-pointer border-none shadow-[2px_2px_0px_0px_#1A1A1A]"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>View All Vendors ({sortedData.length})</span>
          </button>

          {/* Button 2: Navigate to Personnel Account Management */}
          <button
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] rounded-lg text-xs font-black uppercase hover:bg-gray-100 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A]"
            title="Manage accounts, add personnel, or configure vendor access in User Management"
          >
            <span className="material-symbols-outlined text-sm">manage_accounts</span>
            <span>Manage Partner Accounts</span>
          </button>
        </div>
      </div>

      {/* Modal Popup: View All Vendors Performance */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-4 border-[#1A1A1A] rounded-[24px] max-w-2xl w-full max-h-[85vh] flex flex-col p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.25)] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#1A1A1A]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D32F2F] text-2xl">
                    leaderboard
                  </span>
                  <h3 className="font-headline-md text-base sm:text-lg font-black uppercase text-[#1A1A1A]">
                    Comprehensive Vendor Rankings &amp; Scorecard
                  </h3>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                  Total {sortedData.length} Partners • Sorted by:{" "}
                  {sortBy === "onTime" ? "Performance (% On-Time)" : "Most Tasks"}
                </p>
              </div>

              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white flex items-center justify-center cursor-pointer transition-colors bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="py-4">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search vendor name..."
                  className="w-full bg-gray-50 border-2 border-[#1A1A1A] rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:outline-none focus:border-[#D32F2F]"
                />
              </div>
            </div>

            {/* Vendor List in Modal */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredModalVendors.length === 0 ? (
                <div className="py-12 text-center text-gray-400 font-bold uppercase text-xs">
                  No vendor found matching that name.
                </div>
              ) : (
                filteredModalVendors.map((vendor, idx) => {
                  const badge = getRatingBadge(vendor.onTimeRate, vendor.totalAssigned);
                  return (
                    <div
                      key={vendor.vendorId || idx}
                      className="p-3.5 border-2 border-[#1A1A1A] rounded-xl bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D32F2F] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-[#1A1A1A] uppercase">
                            {vendor.vendorName}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                            Total {vendor.totalAssigned} Tasks • {vendor.completedOnTime} On-Time • {vendor.completedLate} Late • {vendor.pending} In Progress
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">
                            On-Time Rate
                          </span>
                          <span className="text-base font-black text-[#1A1A1A]">
                            {vendor.onTimeRate}%
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t-2 border-[#1A1A1A] mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowAllModal(false);
                  router.push("/admin/users");
                }}
                className="text-xs font-black uppercase text-[#D32F2F] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <span>Open Personnel Account Management</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </button>

              <button
                onClick={() => setShowAllModal(false)}
                className="px-5 py-2 bg-[#1A1A1A] text-white rounded-xl text-xs font-black uppercase hover:bg-[#D32F2F] transition-colors cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
