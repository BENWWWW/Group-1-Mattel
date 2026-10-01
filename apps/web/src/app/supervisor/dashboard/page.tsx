"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";
import NotificationBell from "@/components/NotificationBell";
import SupervisorVerificationVelocityChart, { WeeklyVerificationData } from "@/components/charts/SupervisorVerificationVelocityChart";
import SupervisorQualityDonutChart, { VerificationQualityData } from "@/components/charts/SupervisorQualityDonutChart";


interface QueueItem {
  id: string;
  task_code: string;
  title: string;
  tech: string;
  location: string;
  time: string;
  status: "submitted" | "approved" | "rejected" | "pending" | "in_progress";
  priority: string;
  due_date: string;
}

interface VendorCard {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  employee_id: string;
  is_active: boolean;
  taskCount: number;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  employee_id: string;
  department: string | null;
}

export default function ReviewQueuePage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<VendorCard | null>(null);

  const currentNow = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentNow.getMonth()); // 8 = September
  const [selectedYear, setSelectedYear] = useState<number>(currentNow.getFullYear()); // 2026
  const [isHeaderCalendarOpen, setIsHeaderCalendarOpen] = useState(false);
  const [tempHeaderYear, setTempHeaderYear] = useState<number>(currentNow.getFullYear());
  const [qualityRange, setQualityRange] = useState<string>("month");

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    pendingInCycle: 0,
    supervisedInCycle: 0,
    supervisedAllTime: 0,
    approvedInCycle: 0,
    passRateInCycle: 0,
    needAction: 0,
    needActionInCycle: 0,
    monthShort: "Sep",
    year: 2026,
  });

  // Chart States
  const [velocityData, setVelocityData] = useState<WeeklyVerificationData[]>([]);
  const [qualityData, setQualityData] = useState<VerificationQualityData>({
    approved: 0,
    revisionRequested: 0,
    rejected: 0,
  });

  const { toasts, triggerToast } = useToasts(3000, "success");


  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const loadProfileOnly = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) {
        setCurrentUser(profileData);
        if (typeof window !== "undefined") {
          localStorage.setItem("userName", profileData.full_name || "");
          if (profileData.avatar_url) localStorage.setItem("userAvatar", profileData.avatar_url);
        }
      }
    }
  }, [supabase]);

  const fetchTasksAndVendors = useCallback(async (targetMonth = selectedMonth, targetYear = selectedYear, targetRange = qualityRange) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get tasks assigned to this supervisor
    const { data: tasks, error: taskErr } = await supabase
      .from("pm_tasks")
      .select(`
        id,
        task_code,
        notes,
        status,
        priority,
        due_date,
        created_at,
        assigned_vendor_id,
        assets (name, location),
        vendor:profiles!pm_tasks_assigned_vendor_id_fkey (id, full_name)
      `)
      .eq("assigned_supervisor_id", user.id)
      .order("created_at", { ascending: false });

    if (taskErr) {
      triggerToast("Failed to load tasks: " + taskErr.message, "error");
    } else if (tasks) {
      const mapped: QueueItem[] = tasks.map((t: any) => ({
        id: t.id,
        task_code: t.task_code,
        title: t.assets?.name || "Unnamed Task",
        tech: t.vendor?.full_name || "Unassigned",
        location: t.assets?.location || "—",
        time: timeAgo(t.created_at),
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
      }));
      setQueue(mapped);

      // Build vendor list from unique vendors in tasks
      const vendorMap = new Map<string, VendorCard>();
      for (const t of tasks as any[]) {
        if (t.vendor && !vendorMap.has(t.vendor.id)) {
          vendorMap.set(t.vendor.id, {
            id: t.vendor.id,
            full_name: t.vendor.full_name,
            email: "",
            phone: null,
            department: null,
            employee_id: "",
            is_active: true,
            taskCount: 0,
          });
        }
        if (t.vendor) {
          const v = vendorMap.get(t.vendor.id)!;
          v.taskCount += 1;
        }
      }

      // Enrich vendor info
      if (vendorMap.size > 0) {
        const vendorIds = Array.from(vendorMap.keys());
        const { data: vendorProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, department, employee_id, is_active")
          .in("id", vendorIds);
        if (vendorProfiles) {
          for (const vp of vendorProfiles) {
            if (vendorMap.has(vp.id)) {
              const existing = vendorMap.get(vp.id)!;
              vendorMap.set(vp.id, { ...existing, ...vp });
            }
          }
        }
      }
      setVendors(Array.from(vendorMap.values()));

      // Fetch PM Reports to calculate Verification Velocity & Quality Ratio
      const { data: reportsData } = await supabase
        .from("pm_reports")
        .select("id, status, submitted_at, reviewed_at");

      // Weekly Verification Velocity (Realtime Calendar Weeks: 4 or 5 weeks)
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mLabel = monthNamesShort[targetMonth];

      const weekDefs = [
        { week: "Week 1", start: 1, end: 7, label: `1 - 7 ${mLabel}` },
        { week: "Week 2", start: 8, end: 14, label: `8 - 14 ${mLabel}` },
        { week: "Week 3", start: 15, end: 21, label: `15 - 21 ${mLabel}` },
        { week: "Week 4", start: 22, end: 28, label: `22 - 28 ${mLabel}` },
      ];

      if (daysInMonth > 28) {
        weekDefs.push({
          week: "Week 5",
          start: 29,
          end: daysInMonth,
          label: `29 - ${daysInMonth} ${mLabel}`,
        });
      }

      const velocityList: WeeklyVerificationData[] = weekDefs.map((def) => {
        let subm = 0;
        let rev = 0;

        if (reportsData && reportsData.length > 0) {
          reportsData.forEach((rep: any) => {
            const d = new Date(rep.submitted_at || rep.reviewed_at);
            if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
              const day = d.getDate();
              if (day >= def.start && day <= def.end) {
                subm++;
                if (rep.status === "approved" || rep.status === "rejected") {
                  rev++;
                }
              }
            }
          });
        }

        return {
          week: def.week,
          dateRange: def.label,
          submitted: subm,
          reviewed: rev,
        };
      });
      setVelocityData(velocityList);

      // Quality Breakdown Calculation with Time Range Filter
      let approvedCount = 0;
      let revisionCount = 0;
      let rejectedCount = 0;

      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      if (reportsData && reportsData.length > 0) {
        reportsData.forEach((rep: any) => {
          const repDate = new Date(rep.reviewed_at || rep.submitted_at).getTime();
          let inRange = true;

          if (targetRange === "month") {
            const d = new Date(rep.reviewed_at || rep.submitted_at);
            inRange = d.getMonth() === targetMonth && d.getFullYear() === targetYear;
          } else if (targetRange === "30d") {
            inRange = now - repDate <= thirtyDaysMs;
          } else if (targetRange === "90d") {
            inRange = now - repDate <= ninetyDaysMs;
          }

          if (inRange) {
            if (rep.status === "approved") approvedCount++;
            else if (rep.status === "revision_requested") revisionCount++;
            else if (rep.status === "rejected") rejectedCount++;
          }
        });
      }

      setQualityData({
        approved: approvedCount,
        revisionRequested: revisionCount,
        rejected: rejectedCount,
      });

      // Compute Top Executive Stats Synchronized for Cycle
      // Tasks belonging to the selected monthly cycle
      const cycleTasks = tasks.filter((t: any) => {
        const d = new Date(t.created_at || t.due_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });

      // 1. Pending Approvals (Real-time queue across all time so no vendor submission is missed)
      const allPendingReviews = tasks.filter((t: any) => t.status === "submitted");
      const pendingInCycle = allPendingReviews.filter((t: any) => {
        const d = new Date(t.created_at || t.due_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      }).length;

      // 2. Supervised PMs in Cycle
      const supervisedInCycleCount = cycleTasks.length;
      const approvedInCycleCount = cycleTasks.filter((t: any) => t.status === "approved" || t.status === "completed").length;

      // 3. Approval Rate & Approved Count in selected cycle
      const cycleReports = (reportsData || []).filter((rep: any) => {
        const d = new Date(rep.reviewed_at || rep.submitted_at);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const cycleApprovedReports = cycleReports.filter((rep: any) => rep.status === "approved").length;
      const cycleDecidedReports = cycleReports.filter((rep: any) => rep.status === "approved" || rep.status === "rejected" || rep.status === "revision_requested").length;
      const passRateInCycle = cycleDecidedReports > 0 ? Math.round((cycleApprovedReports / cycleDecidedReports) * 100) : 0;

      // 4. Requires Action (Rejected or overdue)
      const needActionRealtime = tasks.filter((t: any) => t.status === "rejected" || (t.status !== "approved" && t.status !== "completed" && new Date(t.due_date).getTime() < now)).length;
      const needActionInCycle = cycleTasks.filter((t: any) => t.status === "rejected" || (t.status !== "approved" && t.status !== "completed" && new Date(t.due_date).getTime() < now)).length;

      setStats({
        pending: allPendingReviews.length,
        pendingInCycle: pendingInCycle,
        supervisedInCycle: supervisedInCycleCount,
        supervisedAllTime: tasks.length,
        approvedInCycle: cycleApprovedReports || approvedInCycleCount,
        passRateInCycle: passRateInCycle,
        needAction: needActionRealtime,
        needActionInCycle: needActionInCycle,
        monthShort: mLabel,
        year: targetYear,
      });
    }
  }, [supabase]);

  const handlePeriodChange = useCallback((m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setTempHeaderYear(y);
    fetchTasksAndVendors(m, y, qualityRange);
  }, [fetchTasksAndVendors, qualityRange]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadProfileOnly();
      await fetchTasksAndVendors();
      setLoading(false);
    };

    load();
  }, [loadProfileOnly, fetchTasksAndVendors]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadProfileOnly();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [loadProfileOnly]);

  const filteredQueue = queue.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.task_code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.tech.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });

  const submittedItems = filteredQueue.filter((i) => i.status === "submitted");
  const urgentItems = filteredQueue.filter((i) => (i.priority === "critical" || i.priority === "high") && i.status !== "approved" && i.status !== "rejected");
  const activeQueue = filteredQueue.filter((i) => i.status !== "approved" && i.status !== "rejected");

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "S")}&background=D32F2F&color=fff&size=200`;

  const statusColor: Record<string, string> = {
    submitted: "bg-[#D32F2F] text-white",
    pending: "bg-yellow-500 text-white",
    in_progress: "bg-blue-500 text-white",
    approved: "bg-green-600 text-white",
    rejected: "bg-gray-700 text-white",
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-page text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* SideNavBar */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-semibold text-white leading-tight">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-medium uppercase tracking-[0.2em] mt-1">PM Verification</p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => triggerToast("Dashboard reloaded.", "info")}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.push("/supervisor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>
          <button
            onClick={() => router.push("/supervisor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">analytics</span>
            <span>Reports</span>
          </button>
        </nav>

        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={async () => {
              triggerToast("CLOSING SUPERVISOR SESSION...", "info");
              await supabase.auth.signOut();
              setTimeout(() => router.push("/"), 1000);
            }}
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>
          <button
            onClick={() => router.push("/supervisor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img className="w-full h-full object-cover" alt="Profile" src={avatarSrc} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate text-white uppercase">{currentUser?.full_name || "Supervisor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">{currentUser?.department || "Supervisor"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] bg-white border-b border-gray-200 h-20 px-6 lg:px-10 flex justify-between items-center z-40 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">Supervisor Dashboard</h2>
            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider font-medium">Manage & approve maintenance reports</p>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-4 relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by task code, title, tech..."
            className="w-full bg-white border border-gray-200 rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[#D32F2F] font-body-md"
          />
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src={avatarSrc} alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] pb-20 lg:pb-0">
        <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-10">

          {/* Section Header with Global Period Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-md text-base sm:text-lg font-semibold text-[#1A1A1A] uppercase tracking-tight">
                  Verification Overview
                </h3>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mt-0.5">
                {stats.monthShort} {selectedYear}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Reset to Current Month Button (visible if navigating away from current month) */}
              {(selectedMonth !== currentNow.getMonth() || selectedYear !== currentNow.getFullYear()) && (
                <button
                  type="button"
                  onClick={() => handlePeriodChange(currentNow.getMonth(), currentNow.getFullYear())}
                  className="px-2.5 py-1.5 text-[10px] font-semibold uppercase rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:text-[#1A1A1A] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Return to Current Month"
                >
                  <span className="material-symbols-outlined text-xs text-gray-400">today</span>
                  This Month
                </button>
              )}

              {/* Month & Year Navigation with Popover */}
              <div className="relative inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 0) {
                      handlePeriodChange(11, selectedYear - 1);
                    } else {
                      handlePeriodChange(selectedMonth - 1, selectedYear);
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A1A1A] font-semibold cursor-pointer transition-colors"
                  title="Previous Month"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTempHeaderYear(selectedYear);
                    setIsHeaderCalendarOpen(!isHeaderCalendarOpen);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase text-[#1A1A1A] hover:text-[#D32F2F] cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-gray-400">calendar_month</span>
                  <span>{stats.monthShort} {selectedYear}</span>
                  <span className="material-symbols-outlined text-xs text-gray-500">
                    {isHeaderCalendarOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 11) {
                      handlePeriodChange(0, selectedYear + 1);
                    } else {
                      handlePeriodChange(selectedMonth + 1, selectedYear);
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A1A1A] font-semibold cursor-pointer transition-colors"
                  title="Next Month"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>

                {/* Popover Calendar */}
                {isHeaderCalendarOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsHeaderCalendarOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl p-4 shadow-lg z-40 animate-in fade-in zoom-in-95 duration-150">
                      {/* Popover Year Navigation */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                        <button
                          type="button"
                          onClick={() => setTempHeaderYear((prev) => prev - 1)}
                          className="px-2 py-0.5 rounded border border-gray-200 hover:bg-[#1A1A1A] hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                        >
                          ◀
                        </button>
                        <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
                          Year {tempHeaderYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTempHeaderYear((prev) => prev + 1)}
                          className="px-2 py-0.5 rounded border border-gray-200 hover:bg-[#1A1A1A] hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                        >
                          ▶
                        </button>
                      </div>

                      {/* 12 Months Grid */}
                      <div className="grid grid-cols-4 gap-1">
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((mShort, idx) => {
                          const isSelected = idx === selectedMonth && tempHeaderYear === selectedYear;
                          const isCurrentActual = idx === currentNow.getMonth() && tempHeaderYear === currentNow.getFullYear();
                          return (
                            <button
                              key={mShort}
                              type="button"
                              onClick={() => {
                                handlePeriodChange(idx, tempHeaderYear);
                                setIsHeaderCalendarOpen(false);
                              }}
                              className={`py-1.5 text-[10px] font-semibold uppercase rounded-lg border transition-all cursor-pointer relative ${
                                isSelected
                                  ? "bg-[#D32F2F] text-white border-[#D32F2F]"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                              }`}
                            >
                              {mShort}
                              {isCurrentActual && (
                                <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#D32F2F]"}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stats Overview Grid (Matching Vendor & Admin High-Clarity Design) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {[
              {
                label: "Pending Approvals",
                value: stats.pending,
                icon: "rate_review",
                delta: `${stats.pendingInCycle} submitted in ${stats.monthShort} • Awaiting inspection signoff`,
              },
              {
                label: "Supervised PMs",
                value: stats.supervisedInCycle,
                icon: "assignment",
                delta: `${stats.approvedInCycle} approved • Total ${stats.supervisedAllTime} all-time`,
              },
              {
                label: "Approved & Verified",
                value: stats.approvedInCycle,
                icon: "verified",
                delta: stats.approvedInCycle > 0
                  ? `${stats.passRateInCycle}% first-time pass rate in ${stats.monthShort}`
                  : `0% pass rate • No reports verified yet in ${stats.monthShort}`,
              },
              {
                label: "Requires Action",
                value: stats.needAction,
                icon: "warning",
                delta: stats.needActionInCycle > 0 
                  ? `${stats.needActionInCycle} in ${stats.monthShort} cycle • Immediate inspection`
                  : "Rejected reports or SLA overdue tasks",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-[20px] p-6 lg:p-8 flex flex-col justify-between hover:shadow-md transition-all group shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider block">
                      {stat.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-semibold text-gray-900 tracking-tighter">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {stat.delta}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Verification Velocity & Quality Analytics Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SupervisorVerificationVelocityChart
              data={velocityData}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPeriodChange={handlePeriodChange}
            />
            <SupervisorQualityDonutChart
              data={qualityData}
              selectedRange={qualityRange}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onRangeChange={(range) => {
                setQualityRange(range);
                fetchTasksAndVendors(selectedMonth, selectedYear, range);
              }}
            />
          </div>

          {/* Urgent Items */}
          {urgentItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="font-headline-lg text-lg font-semibold text-[#1A1A1A] uppercase tracking-wide">High Priority</h3>
                <span className="bg-[#D32F2F] text-white px-3 py-0.5 rounded-full font-medium text-[10px] border border-gray-200 uppercase tracking-wider">
                  {urgentItems.length} Items
                </span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {urgentItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push("/supervisor/tasks")}
                    className="bg-white border-l-[12px] border-l-[#D32F2F] rounded-[20px] p-6 cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-6 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#D32F2F] text-white px-2 py-0.5 rounded-full text-[9px] font-medium uppercase">{item.priority.toUpperCase()}</span>
                        <span className="text-gray-400 text-[10px] font-medium">{item.task_code}</span>
                      </div>
                      <h4 className="font-semibold text-base text-[#1A1A1A]">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Tech: <strong className="text-[#1A1A1A]">{item.tech}</strong> • {item.location}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Due: {item.due_date} • {item.time}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push("/supervisor/tasks"); }}
                      className="bg-[#D32F2F] text-white border border-gray-200 rounded-full px-6 py-2 font-medium text-xs uppercase tracking-wider hover:bg-[#B71C1C] transition-all cursor-pointer shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Queue — Submitted Reports */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-lg text-lg font-semibold text-[#1A1A1A] uppercase tracking-wide">
                Active Queue
                {submittedItems.length > 0 && (
                  <span className="ml-3 bg-[#D32F2F] text-white px-2 py-0.5 rounded-full text-[10px] font-medium">{submittedItems.length}</span>
                )}
              </h3>
              <button
                onClick={() => router.push("/supervisor/tasks")}
                className="text-[#D32F2F] font-medium hover:underline flex items-center gap-1 uppercase text-xs tracking-wider border-none bg-transparent cursor-pointer"
              >
                View All
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {activeQueue.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-[20px]">
                <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
                <p className="text-xs font-medium uppercase text-gray-400 tracking-wider mt-2">
                  No active or incomplete tasks
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeQueue.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push("/supervisor/tasks")}
                    className="bg-white rounded-[20px] p-6 flex items-center justify-between hover:shadow-md transition-all duration-200 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 border border-gray-200 rounded-xl overflow-hidden bg-[#D32F2F]/5 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-gray-400 text-2xl">build</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${statusColor[item.status] || "bg-gray-400 text-white"} px-2 py-0.5 rounded-full text-[9px] font-medium uppercase`}>
                            {item.status.replace("_", " ")}
                          </span>
                          <span className="text-gray-400 text-[10px] font-medium">{item.time}</span>
                        </div>
                        <h5 className="font-headline-md text-sm font-semibold mb-0.5 text-[#1A1A1A]">{item.title}</h5>
                        <p className="text-gray-500 text-xs">
                          <span className="font-medium text-[10px] text-gray-400 uppercase">{item.task_code}</span> • Tech: <strong className="text-[#1A1A1A]">{item.tech}</strong> • {item.location}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-[#D32F2F] transition-colors">chevron_right</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vendors Under Responsibility */}
          <section className="space-y-6 pt-6 border-t border-gray-100">
            <div>
              <h3 className="font-headline-lg text-lg font-semibold text-[#1A1A1A] uppercase tracking-wide">Vendors Under Responsibility</h3>
              <p className="text-xs text-gray-500 font-medium">Vendors that have active tasks with this supervisor.</p>
            </div>

            {vendors.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-[20px]">
                <span className="material-symbols-outlined text-4xl text-gray-300">groups</span>
                <p className="text-xs font-medium uppercase text-gray-400 tracking-wider mt-2">No vendors connected yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendorDetail(vendor)}
                    className="bg-white rounded-[20px] p-6 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-44 relative group shadow-sm"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-medium border border-gray-200 uppercase ${vendor.is_active ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <h4 className="font-headline-lg text-base font-semibold mt-3 text-[#1A1A1A] group-hover:text-[#D32F2F] transition-colors leading-tight">
                        {vendor.full_name}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium mt-1 truncate">{vendor.email || vendor.department || "—"}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="text-[10px] text-gray-500 font-medium uppercase">{vendor.taskCount} Total tasks</span>
                      <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Vendor Detail Modal Popup */}
      {selectedVendorDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedVendorDetail(null)}
          ></div>
          <div className="relative bg-white p-8 rounded-[24px] max-w-sm w-full z-10 flex flex-col gap-6 text-left shadow-lg animate-in zoom-in-95 duration-200">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400 text-2xl">badge</span>
                <h3 className="font-headline-md text-base uppercase font-semibold tracking-tight">Vendor Profile</h3>
              </div>
              <button
                onClick={() => setSelectedVendorDetail(null)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-gray-200 bg-[#D32F2F]/5 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-gray-400 text-3xl">engineering</span>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-medium border border-gray-200 uppercase ${selectedVendorDetail.is_active ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {selectedVendorDetail.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <h4 className="font-headline-lg text-lg font-semibold leading-tight text-[#1A1A1A] uppercase truncate">
                  {selectedVendorDetail.full_name}
                </h4>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-[9px] uppercase font-medium text-gray-400">Vendor ID</p>
                  <p className="font-semibold text-xs text-[#1A1A1A]">#{selectedVendorDetail.employee_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-medium text-gray-400">Department</p>
                  <p className="font-semibold text-xs text-[#1A1A1A]">{selectedVendorDetail.department || "General Maintenance"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase font-medium text-gray-400">Email Address</p>
                  <p className="font-semibold text-xs text-[#1A1A1A] break-all">{selectedVendorDetail.email || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase font-medium text-gray-400">Phone Contact</p>
                  <p className="font-semibold text-xs text-[#1A1A1A]">{selectedVendorDetail.phone || "No phone registered"}</p>
                </div>
              </div>

              <div className="bg-[#1A1A1A] text-white p-4 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-[9px] uppercase font-medium text-white/50">Current Workload</p>
                  <p className="font-semibold text-sm uppercase tracking-tight text-white">Active Assignments</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-[#D32F2F] bg-white border border-gray-200 px-3 py-1 rounded-lg">
                    {selectedVendorDetail.taskCount}
                  </span>
                  <span className="text-white/60 font-medium text-[10px] uppercase">Tasks</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedVendorDetail(null);
                router.push("/supervisor/tasks");
              }}
              className="w-full py-3.5 bg-[#D32F2F] text-white font-semibold text-xs uppercase tracking-widest rounded-lg border border-gray-200 hover:bg-[#1A1A1A] transition-all cursor-pointer text-center"
            >
              View Associated Tasks
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-gray-400">
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-semibold uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
