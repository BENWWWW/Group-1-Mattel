"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";


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
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE";
  techs: string[];
  time: string;
  icon: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
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
    pendingCount: 0,
    completedCount: 0,
    awaitingStartCount: 0,
    complianceScore: "100%"
  });

  // Notifications Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadDashboardData = async () => {
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
          assets (
            name,
            category,
            location
          ),
          pm_reports (
            ai_confidence_score
          )
        `)
        .eq("assigned_vendor_id", user.id);

      if (error) throw error;

      // Transform data
      const list: Task[] = (tasksData || []).map((t: any) => {
        const reportsList = t.pm_reports;
        const firstReport = Array.isArray(reportsList) && reportsList.length > 0 ? reportsList[0] : null;
        const score = firstReport?.ai_confidence_score || 90;
        let confStr: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" = "HIGH CONFIDENCE";
        if (score < 50) confStr = "LOW CONFIDENCE";
        else if (score < 80) confStr = "MEDIUM CONFIDENCE";

        let statusStr: "Active" | "Pending" | "Completed" = "Active";
        if (t.status === "pending" || t.status === "submitted") {
          statusStr = "Pending";
        } else if (t.status === "approved" || t.status === "completed") {
          statusStr = "Completed";
        } else if (t.status === "in_progress" || t.status === "rejected") {
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
          confidence: confStr,
          techs: [profile?.full_name || "Vendor Tech"],
          time: new Date(t.created_at).toLocaleDateString(),
          icon: categoryMapped === "Electrical" ? "bolt" : categoryMapped === "HVAC" ? "air" : "settings"
        };
      });

      setTasks(list);

      // Calculate stats
      const active = (tasksData || []).filter((t: any) => t.status === "in_progress" || t.status === "rejected").length;
      const pendingReview = (tasksData || []).filter((t: any) => t.status === "submitted").length;
      const completed = (tasksData || []).filter((t: any) => t.status === "approved" || t.status === "completed").length;
      const awaitingStart = (tasksData || []).filter((t: any) => t.status === "pending").length;

      // Calculate average compliance score based on reports ai_confidence_score
      const scoredReports = (tasksData || []).filter((t: any) => {
        const rep = Array.isArray(t.pm_reports) && t.pm_reports.length > 0 ? t.pm_reports[0] : null;
        return rep && rep.ai_confidence_score !== undefined;
      });
      const avgCompliance = scoredReports.length > 0
        ? Math.round(scoredReports.reduce((acc: number, curr: any) => {
            const rep = curr.pm_reports[0];
            return acc + (rep.ai_confidence_score || 0);
          }, 0) / scoredReports.length)
        : 100;

      setStats({
        activeCount: active,
        pendingCount: pendingReview,
        completedCount: completed,
        awaitingStartCount: awaitingStart,
        complianceScore: `${avgCompliance}%`
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    triggerToast("CLOSING VENDOR TERMINAL...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  const awaitingStartTasks = tasks.filter(t => t.dbStatus === "pending");

  const avatarSrc = currentUser?.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "Apex Services")}&background=D32F2F&color=fff&size=200`;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full select-none bg-white text-[#1A1A1A] font-body-md overflow-hidden relative"
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

      {/* Fixed Sidebar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
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
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <button
            onClick={() => router.push("/vendor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
              <img
                alt="Vendor Headshot"
                className="w-full h-full object-cover"
                src={avatarSrc}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">{currentUser?.full_name || "Apex Services"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Top NavBar (aligned with Admin Dashboard style) */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Vendor Dashboard
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            Field Operations & Task Execution
          </p>
        </div>

        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img
              className="w-full h-full object-cover"
              src={avatarSrc}
              alt="User Profile"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="p-10 max-w-[1400px] mx-auto space-y-10">
          
          {/* Stats Overview Grid (Adapted from Admin Dashboard style) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Active Tasks", value: stats.activeCount, icon: "assignment", delta: `${stats.awaitingStartCount} awaiting start` },
              { label: "Pending Review", value: stats.pendingCount, icon: "schedule", delta: "Awaiting supervisor signoff" },
              { label: "Completed Tasks", value: stats.completedCount, icon: "check_circle", delta: "Archived this week" },
              { label: "Compliance Score", value: stats.complianceScore, icon: "verified", delta: "Nominal rating grade A" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <span className="material-symbols-outlined text-[#D32F2F]">{stat.icon}</span>
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">{stat.delta}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Awaiting Start Tasks Panel */}
          <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold uppercase tracking-tight text-[#1A1A1A]">
                  Awaiting Start ({awaitingStartTasks.length})
                </h3>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mt-0.5">
                  Tasks assigned to you that have not been started yet
                </p>
              </div>
              <span className="material-symbols-outlined text-gray-400">pending_actions</span>
            </div>

            {awaitingStartTasks.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-[16px] text-gray-400 font-bold uppercase tracking-wider text-xs">
                <span className="material-symbols-outlined text-4xl block mb-2 opacity-30 text-[#D32F2F]">check_circle</span>
                All tasks have been started or completed.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {awaitingStartTasks.map((task) => (
                  <div key={task.dbId} className="border-2 border-[#1A1A1A] hover:border-[#D32F2F] rounded-[16px] p-5 flex flex-col justify-between transition-all group bg-gray-50/50">
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <div>
                        <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 bg-[#1A1A1A] text-white rounded border border-black mb-2 tracking-wide">
                          {task.id}
                        </span>
                        <h4 className="font-extrabold text-base uppercase tracking-tight text-[#1A1A1A]">
                          {task.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500 font-bold">
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
                        <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 bg-[#D32F2F] text-white rounded-[12px] border-none animate-pulse">
                          HIGH PRIORITY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                      <div className="text-left">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Due Date</p>
                        <p className="text-xs font-black text-[#1a1a1a]">{task.due}</p>
                      </div>

                      <button
                        onClick={() => router.push(`/vendor/tasks?taskId=${task.dbId}`)}
                        className="bg-[#D32F2F] hover:bg-[#1A1A1A] text-white transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-[10px] uppercase tracking-wider cursor-pointer border-none"
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
                className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col gap-4 hover:border-[#D32F2F] transition-all text-left cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#D32F2F] text-4xl">{card.icon}</span>
                <div className="flex-grow">
                  <h3 className="font-extrabold text-base uppercase tracking-tight group-hover:text-[#D32F2F] transition-colors">{card.label}</h3>
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
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border-2 border-on-surface bg-white text-on-surface animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <span
              className={`material-symbols-outlined ${
                toast.type === "success"
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
            <span className="font-label-md text-xs uppercase font-bold">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
