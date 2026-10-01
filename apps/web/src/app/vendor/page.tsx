"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";
import NotificationBell from "@/components/NotificationBell";
import VendorPersonalTrendChart, { VendorWeeklyProgress } from "@/components/charts/VendorPersonalTrendChart";
import VendorWorkloadDistributionChart, { VendorWorkloadData } from "@/components/charts/VendorWorkloadDistributionChart";


// Define Task interface matching the industrial requirements
interface Task {
  id: string;
  dbId?: string;
  dbStatus?: string;
  title: string;
  priority: "High" | "Normal";
  status: "Active" | "Pending" | "Completed";
  location: string;
  due: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  techs: string[];
  time: string;
  icon: string;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistics state
  const [stats, setStats] = useState({
    activeCount: 0,
    activeInCycle: 0,
    activeCarryover: 0,
    pendingCount: 0,
    pendingInCycle: 0,
    completedCount: 0,
    completedAllTime: 0,
    awaitingStartCount: 0,
    complianceScore: "0%",
    complianceScoreAllTime: "0%",
    cycleLabel: "September 2026",
    monthShort: "Sep",
    year: 2026,
  });

  // Chart states
  const [personalTrends, setPersonalTrends] = useState<VendorWeeklyProgress[]>([]);
  const [workloadData, setWorkloadData] = useState<VendorWorkloadData>({
    highPriority: 0,
    normalPriority: 0,
    dueTodayOrOverdue: 0,
    dueSoon: 0,
    dueSafe: 0,
    totalActive: 0,
  });
  const currentNow = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentNow.getMonth()); // Current month
  const [selectedYear, setSelectedYear] = useState<number>(currentNow.getFullYear());
  const [isHeaderCalendarOpen, setIsHeaderCalendarOpen] = useState(false);
  const [tempHeaderYear, setTempHeaderYear] = useState<number>(currentNow.getFullYear());


  // Show toast helper
  const { toasts, triggerToast } = useToasts(4000, "success");

  const handlePeriodChange = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setTempHeaderYear(y);
    loadDashboardData(m, y);
  };

  const loadDashboardData = async (targetMonth = selectedMonth, targetYear = selectedYear) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      // Fetch Tasks assigned to this Vendor
      const { data: tasksData, error } = await supabase
        .from("pm_tasks")
        .select(`
          id,
          task_code,
          priority,
          status,
          due_date,
          created_at,
          updated_at,
          assets (
            name,
            category,
            location
          ),
          pm_reports (
            ai_confidence_score,
            submitted_at,
            reviewed_at
          )
        `)
        .eq("assigned_vendor_id", user.id);

      if (error) throw error;

      // Transform data
      const list: Task[] = (tasksData || []).map((t: any) => {

        let statusStr: "Active" | "Pending" | "Completed" = "Active";
        if (t.status === "submitted") {
          statusStr = "Pending";
        } else if (t.status === "approved" || t.status === "completed") {
          statusStr = "Completed";
        } else if (t.status === "in_progress" || t.status === "rejected" || t.status === "pending") {
          statusStr = "Active";
        }

        const categoryMapped = t.assets?.category || "Mechanical";

        return {
          id: t.task_code || `TK-${t.id.substring(0, 4).toUpperCase()}`,
          dbId: t.id,
          dbStatus: t.status,
          title: t.assets?.name || "PM Maintenance",
          priority: t.priority === "high" ? "High" : "Normal",
          status: statusStr,
          location: t.assets?.location || "Main Plant",
          due: t.due_date ? new Date(t.due_date).toLocaleDateString() : "No Due Date",
          category: categoryMapped,
          techs: [profile?.full_name || "Vendor Tech"],
          time: new Date(t.created_at).toLocaleDateString(),
          icon: categoryMapped === "Electrical" ? "bolt" : categoryMapped === "HVAC" ? "air" : "settings"
        };
      });

      setTasks(list);

      // Month formatting labels
      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNamesFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const mLabel = monthNamesShort[targetMonth];
      const currentCycleLabel = `${monthNamesFull[targetMonth]} ${targetYear}`;

      const allTasks = tasksData || [];

      // 1. Active Tasks (Real-time operational queue across all periods so nothing is missed)
      const allActive = allTasks.filter((t: any) => t.status === "in_progress" || t.status === "rejected" || t.status === "pending");
      const activeInCycleCount = allActive.filter((t: any) => {
        const d = new Date(t.created_at || t.due_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      }).length;
      const activeCarryoverCount = allActive.length - activeInCycleCount;
      const awaitingStart = allActive.filter((t: any) => t.status === "pending").length;

      // 2. Pending Review (Tasks awaiting supervisor approval)
      const allPendingReview = allTasks.filter((t: any) => t.status === "submitted");
      const pendingInCycleCount = allPendingReview.filter((t: any) => {
        const d = new Date(t.created_at || t.due_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      }).length;

      // 3. Completed Tasks (Cycle-specific vs All-time)
      const completedAllTimeCount = allTasks.filter((t: any) => t.status === "approved" || t.status === "completed").length;
      const completedInCycleCount = allTasks.filter((t: any) => {
        if (t.status !== "approved" && t.status !== "completed") return false;
        const rep = Array.isArray(t.pm_reports) && t.pm_reports.length > 0 ? t.pm_reports[0] : null;
        const dateStr = rep?.reviewed_at || t.updated_at || t.due_date || t.created_at;
        const d = new Date(dateStr);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      }).length;

      // 4. Compliance Score (Cycle-specific AI average vs All-time)
      const scoredAllReports = allTasks.filter((t: any) => {
        const rep = Array.isArray(t.pm_reports) && t.pm_reports.length > 0 ? t.pm_reports[0] : null;
        return rep && rep.ai_confidence_score !== undefined;
      });
      const avgComplianceAll = scoredAllReports.length > 0
        ? Math.round(scoredAllReports.reduce((acc: number, curr: any) => acc + (curr.pm_reports[0].ai_confidence_score || 0), 0) / scoredAllReports.length)
        : 0;

      const scoredCycleReports = allTasks.filter((t: any) => {
        const rep = Array.isArray(t.pm_reports) && t.pm_reports.length > 0 ? t.pm_reports[0] : null;
        if (!rep || rep.ai_confidence_score === undefined) return false;
        const dateStr = rep.submitted_at || t.updated_at || t.created_at;
        const d = new Date(dateStr);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
      const avgComplianceCycle = scoredCycleReports.length > 0
        ? Math.round(scoredCycleReports.reduce((acc: number, curr: any) => acc + (curr.pm_reports[0].ai_confidence_score || 0), 0) / scoredCycleReports.length)
        : avgComplianceAll;

      setStats({
        activeCount: allActive.length,
        activeInCycle: activeInCycleCount,
        activeCarryover: activeCarryoverCount,
        pendingCount: allPendingReview.length,
        pendingInCycle: pendingInCycleCount,
        completedCount: completedInCycleCount,
        completedAllTime: completedAllTimeCount,
        awaitingStartCount: awaitingStart,
        complianceScore: `${avgComplianceCycle}%`,
        complianceScoreAllTime: `${avgComplianceAll}%`,
        cycleLabel: currentCycleLabel,
        monthShort: mLabel,
        year: targetYear,
      });

      // Calculate Realtime Calendar Weeks (handles 4 or 5 weeks depending on month)
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

      const weekDefs = [
        { period: "Week 1", start: 1, end: 7, label: `1 - 7 ${mLabel}` },
        { period: "Week 2", start: 8, end: 14, label: `8 - 14 ${mLabel}` },
        { period: "Week 3", start: 15, end: 21, label: `15 - 21 ${mLabel}` },
        { period: "Week 4", start: 22, end: 28, label: `22 - 28 ${mLabel}` },
      ];

      if (daysInMonth > 28) {
        weekDefs.push({
          period: "Week 5",
          start: 29,
          end: daysInMonth,
          label: `29 - ${daysInMonth} ${mLabel}`,
        });
      }

      const weeklyList: VendorWeeklyProgress[] = weekDefs.map((def, idx) => {
        let comp = 0;
        let targ = 0;

        if (tasksData && tasksData.length > 0) {
          tasksData.forEach((task: any) => {
            const d = new Date(task.created_at || task.due_date);
            if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
              const day = d.getDate();
              if (day >= def.start && day <= def.end) {
                targ++;
                if (task.status === "approved" || task.status === "completed") {
                  comp++;
                }
              }
            }
          });
        }

        // 100% PURE REAL DATABASE DATA! No dummy fallback.
        return {
          weekIndex: idx + 1,
          period: def.period,
          dateRange: def.label,
          completed: comp,
          target: targ,
        };
      });

      setPersonalTrends(weeklyList);

      // Workload Urgency & SLA Deadline Calculation for the selected monthly cycle

      // Filter tasks belonging to the current monthly cycle (resets per month)
      const cycleTasks = (tasksData || []).filter((task: any) => {
        const d = new Date(task.created_at || task.due_date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });

      const activeInCycle = cycleTasks.filter(
        (t: any) => t.status !== "approved" && t.status !== "completed"
      );

      const highPrio = activeInCycle.filter(
        (t: any) => t.priority === "high" || t.priority === "critical"
      ).length;
      const normalPrio = activeInCycle.filter(
        (t: any) => t.priority !== "high" && t.priority !== "critical"
      ).length;

      const nowMs = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const threeDaysMs = 72 * 60 * 60 * 1000;

      let dueTodayOrOverdue = 0;
      let dueSoon = 0;
      let dueSafe = 0;

      activeInCycle.forEach((t: any) => {
        if (!t.due_date) {
          dueSafe++;
        } else {
          const dueTime = new Date(t.due_date).getTime();
          const diff = dueTime - nowMs;
          if (diff <= oneDayMs) {
            dueTodayOrOverdue++;
          } else if (diff <= threeDaysMs) {
            dueSoon++;
          } else {
            dueSafe++;
          }
        }
      });

      setWorkloadData({
        periodLabel: currentCycleLabel,
        highPriority: highPrio,
        normalPriority: normalPrio,
        dueTodayOrOverdue,
        dueSoon,
        dueSafe,
        totalActive: activeInCycle.length,
      });

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load dashboard data: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleProfileUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    triggerToast("Logging out...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const awaitingStartTasks = tasks.filter(t => t.dbStatus === "pending");

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && tasks.length === 0) {
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
    <div
      className="flex h-screen w-full select-none bg-page text-[#1A1A1A] font-body-md overflow-hidden relative"
    >
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #FFFFFF;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A1A1A;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #D32F2F;
        }
        * {
          box-shadow: none !important;
        }
      `}</style>

      {/* SideNavBar */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-semibold text-white leading-tight">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-medium uppercase tracking-[0.2em] mt-1">PM Verification</p>
        </div>

        <nav className="flex-1 space-y-2 px-2">
          {/* Active Navigation: Dashboard (rounded-full) */}
          <button className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              dashboard
            </span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/vendor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => router.push("/vendor/pm")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">settings_applications</span>
            <span>PM</span>
          </button>

          <button
            onClick={() => router.push("/vendor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assessment</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* User Footer Profile */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={handleLogout}
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <button
            onClick={() => router.push("/vendor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img
                alt="Vendor Headshot"
                className="w-full h-full object-cover"
                src={avatarSrc}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate text-white uppercase leading-none mb-1">{currentUser?.full_name || "Vendor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Top NavBar (aligned with Admin Dashboard style) */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] bg-white border-b border-gray-200 h-20 px-6 lg:px-10 flex justify-between items-center z-40">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-headline-md text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">
              Vendor Dashboard
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              Field Operations & Task Execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <img
              className="w-full h-full object-cover"
              src={avatarSrc}
              alt="User Profile"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
        <div className="p-4 lg:p-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-10">

          {/* Section Header with Global Period Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-md text-base sm:text-lg font-semibold text-[#1A1A1A] uppercase tracking-tight">
                  Field Operations Summary
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

          {/* Stats Overview Grid (Adapted from Admin Dashboard style with Badges) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {[
              {
                label: "Active Tasks",
                value: stats.activeCount,
                icon: "assignment",
                delta: stats.activeCarryover > 0 
                  ? `${stats.activeInCycle} in ${stats.monthShort} • ${stats.activeCarryover} carryover`
                  : `${stats.awaitingStartCount} tasks awaiting start`,
              },
              {
                label: "Pending Review",
                value: stats.pendingCount,
                icon: "schedule",
                delta: `${stats.pendingInCycle} submitted in ${stats.monthShort}`,
              },
              {
                label: "Completed Tasks",
                value: stats.completedCount,
                icon: "check_circle",
                delta: `${stats.monthShort} done (${stats.completedAllTime} all-time)`,
              },
              {
                label: "Compliance Score",
                value: stats.complianceScore,
                icon: "verified",
                delta: `${stats.monthShort} rating (${stats.complianceScoreAllTime} all-time)`,
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

          {/* Vendor PM Performance & Workload Distribution Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <VendorPersonalTrendChart
              data={personalTrends}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onPeriodChange={handlePeriodChange}
            />
            <VendorWorkloadDistributionChart data={workloadData} />
          </div>

          {/* Awaiting Start Tasks Panel */}
          <div className="bg-white rounded-[20px] p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold uppercase tracking-tight text-[#1A1A1A]">
                  Awaiting Start ({awaitingStartTasks.length})
                </h3>
                <p className="text-xs text-gray-500 uppercase font-medium tracking-wide mt-0.5">
                  Tasks assigned to you that have not been started yet
                </p>
              </div>
              <span className="material-symbols-outlined text-gray-400">pending_actions</span>
            </div>

            {awaitingStartTasks.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-[16px] text-gray-400 font-medium uppercase tracking-wider text-xs">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-30 text-gray-400">check_circle</span>
                All tasks have been started or completed.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {awaitingStartTasks.map((task) => (
                  <div key={task.dbId} className="hover:shadow-md rounded-[16px] p-5 flex flex-col justify-between transition-all group bg-gray-50/50">
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <div>
                        <span className="inline-block text-[9px] font-semibold uppercase px-2 py-0.5 bg-gray-100 text-gray-700 rounded mb-2 tracking-wide">
                          {task.id}
                        </span>
                        <h4 className="font-semibold text-base uppercase tracking-tight text-[#1A1A1A]">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500 font-medium">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">category</span>
                            {task.category}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {task.location}
                          </span>
                        </div>
                      </div>

                      {task.priority === "High" && (
                        <span className="text-[9px] font-semibold uppercase px-2.5 py-0.5 bg-[#D32F2F] text-white rounded-[12px] border-none">
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                      <div className="text-left">
                        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Due Date</p>
                        <p className="text-xs font-semibold text-[#1a1a1a]">{task.due}</p>
                      </div>

                      <button
                        onClick={() => router.push(`/vendor/tasks?taskId=${task.dbId}`)}
                        className="bg-[#D32F2F] hover:bg-[#1A1A1A] text-white transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-[10px] uppercase tracking-wider cursor-pointer border-none"
                      >
                        <span>Start Work</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access Panel (Adapted from Admin Dashboard style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Operator Tasks", desc: "View and execute active maintenance checklists", icon: "assignment", path: "/vendor/tasks" },
              { label: "Preventive Maintenance", desc: "Track scheduled preventative maintenance runs", icon: "settings_applications", path: "/vendor/pm" },
              { label: "Task Reports", desc: "Access completed inspection logs & downloads", icon: "assessment", path: "/vendor/reports" },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => router.push(card.path)}
                className="bg-white rounded-[20px] p-8 flex flex-col gap-4 hover:shadow-md transition-all text-left cursor-pointer group shadow-sm"
              >
                <span className="material-symbols-outlined text-gray-400 text-4xl">{card.icon}</span>
                <div className="flex-grow">
                  <h3 className="font-semibold text-base uppercase tracking-tight group-hover:text-[#D32F2F] transition-colors">{card.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                </div>
                <span className="material-symbols-outlined text-gray-300 group-hover:text-[#D32F2F] transition-colors self-end">arrow_forward</span>
              </button>
            ))}
          </div>

        </div>
      </main>

      {/* Floating Toast Notification Containers */}
      <div className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border border-gray-200 bg-white text-on-surface animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <span
              className={`material-symbols-outlined ${toast.type === "success"
                ? "text-green-600"
                : toast.type === "error"
                  ? "text-[#D32F2F]"
                  : "text-blue-500"
                }`}
            >
              {toast.type === "success"
                ? "check_circle"
                : toast.type === "error"
                  ? "error"
                  : "info"}
            </span>
            <span className="font-label-md text-xs uppercase font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
