"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";


interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface DashboardStats {
  totalAssets: number;
  activePMs: number;
  totalReports: number;
  activeUsers: number;
  pendingTasks: number;
  criticalTasks: number;
}

interface RecentTask {
  id: string;
  task_code: string;
  status: string;
  priority: string;
  due_date: string;
  asset_name: string;
  vendor_name: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activePMs: 0,
    totalReports: 0,
    activeUsers: 0,
    pendingTasks: 0,
    criticalTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [adminName, setAdminName] = useState("Admin");
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Toast Helper
  const triggerToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  // Fetch all dashboard data from Supabase
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Run all queries in parallel
      const [
        assetsRes,
        activeTasksRes,
        reportsRes,
        usersRes,
        pendingTasksRes,
        criticalTasksRes,
        recentTasksRes,
        profileRes,
      ] = await Promise.all([
        // Total assets
        supabase.from("assets").select("id", { count: "exact", head: true }).or("is_deleted.is.null,is_deleted.eq.false"),

        // Active PM tasks (in_progress or pending)
        supabase
          .from("pm_tasks")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"]),

        // Total PM reports
        supabase
          .from("pm_reports")
          .select("id", { count: "exact", head: true }),

        // Active users (vendors + supervisors)
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("role", ["vendor", "supervisor"])
          .eq("is_active", true),

        // Pending tasks
        supabase
          .from("pm_tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        // Critical tasks
        supabase
          .from("pm_tasks")
          .select("id", { count: "exact", head: true })
          .eq("priority", "critical")
          .in("status", ["pending", "in_progress"]),

        // Recent 5 tasks with asset & vendor info
        supabase
          .from("pm_tasks")
          .select(
            `id, task_code, status, priority, due_date,
             assets(name),
             vendor:profiles!pm_tasks_assigned_vendor_id_fkey(full_name)`
          )
          .order("created_at", { ascending: false })
          .limit(5),

        // Current admin profile
        supabase.auth.getUser(),
      ]);

      setStats({
        totalAssets: assetsRes.count ?? 0,
        activePMs: activeTasksRes.count ?? 0,
        totalReports: reportsRes.count ?? 0,
        activeUsers: usersRes.count ?? 0,
        pendingTasks: pendingTasksRes.count ?? 0,
        criticalTasks: criticalTasksRes.count ?? 0,
      });

      // Map recent tasks
      if (recentTasksRes.data) {
        const mapped: RecentTask[] = recentTasksRes.data.map((t: any) => ({
          id: t.id,
          task_code: t.task_code,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          asset_name: t.assets?.name ?? "—",
          vendor_name: t.vendor?.full_name ?? "—",
        }));
        setRecentTasks(mapped);
      }

      // Get admin name from localStorage or Supabase
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("userName");
        const storedAvatar = localStorage.getItem("userAvatar");
        if (storedName) setAdminName(storedName);
        if (storedAvatar) setAdminAvatar(storedAvatar);

        if (profileRes.data?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", profileRes.data.user.id)
            .single();
          if (profile) {
            if (profile.full_name) {
              setAdminName(profile.full_name);
              localStorage.setItem("userName", profile.full_name);
            }
            if (profile.avatar_url) {
              setAdminAvatar(profile.avatar_url);
              localStorage.setItem("userAvatar", profile.avatar_url);
            }
          }
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      triggerToast("Failed to load dashboard data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, triggerToast]);

  useEffect(() => {
    fetchDashboardData();

    const handleProfileUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [fetchDashboardData]);

  // Status badge helper
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "approved": return "text-green-700 bg-green-50 border-green-300";
      case "submitted": return "text-blue-700 bg-blue-50 border-blue-300";
      case "in_progress": return "text-yellow-700 bg-yellow-50 border-yellow-300";
      case "rejected": return "text-red-700 bg-red-50 border-red-300";
      default: return "text-gray-600 bg-gray-50 border-gray-300";
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "critical": return "text-[#D32F2F] font-black";
      case "high": return "text-orange-600 font-bold";
      case "medium": return "text-yellow-600 font-bold";
      default: return "text-gray-500 font-bold";
    }
  };

  const statCards = [
    {
      label: "Total Assets",
      value: isLoading ? "—" : stats.totalAssets.toLocaleString(),
      icon: "precision_manufacturing",
      delta: "Registered equipment units",
    },
    {
      label: "Active PMs",
      value: isLoading ? "—" : stats.activePMs.toLocaleString(),
      icon: "settings_applications",
      delta: `${isLoading ? "—" : stats.pendingTasks} pending assignment`,
    },
    {
      label: "Total Reports",
      value: isLoading ? "—" : stats.totalReports.toLocaleString(),
      icon: "assessment",
      delta: "All submitted PM reports",
    },
    {
      label: "Active Users",
      value: isLoading ? "—" : stats.activeUsers.toLocaleString(),
      icon: "group",
      delta: "Vendors & supervisors active",
    },
  ];

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden">

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Admin Dashboard
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            System overview &amp; management
          </p>
        </div>
        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="flex items-center gap-2">

            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold uppercase text-[#1A1A1A] leading-none">
                {adminName}
              </p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">
                Admin Access
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
              {adminAvatar ? (
                <img
                  className="w-full h-full object-cover"
                  src={adminAvatar}
                  alt="Admin Portrait"
                />
              ) : (
                <span className="material-symbols-outlined text-[#D32F2F]">
                  account_circle
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)]">
        <div className="p-10 max-w-[1400px] mx-auto space-y-10">

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <span className="material-symbols-outlined text-[#D32F2F]">
                    {stat.icon}
                  </span>
                </div>
                <div className="mt-4">
                  {isLoading ? (
                    <div className="h-12 w-20 bg-gray-100 rounded-lg animate-pulse" />
                  ) : (
                    <p className="text-5xl font-extrabold text-[#D32F2F] tracking-tighter">
                      {stat.value}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    {stat.delta}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Tasks Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-headline-md text-lg text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                  Recent Tasks
                </h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  Latest 5 PM task assignments
                </p>
              </div>
              <button
                onClick={() => router.push("/admin/tasks")}
                className="text-[10px] font-extrabold uppercase tracking-wider text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1"
              >
                View All
                <span className="material-symbols-outlined text-[14px]">
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden">
              {isLoading ? (
                <div className="p-10 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold uppercase text-sm">
                  <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">
                    assignment
                  </span>
                  No tasks yet. Assign a new PM task to get started.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#1A1A1A] bg-gray-50">
                      {["Task Code", "Asset", "Vendor", "Priority", "Status", "Due Date"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((task, i) => (
                      <tr
                        key={task.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          i === recentTasks.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-black text-xs uppercase tracking-wider text-[#D32F2F]">
                          {task.task_code}
                        </td>
                        <td className="px-6 py-4 font-bold text-xs uppercase text-gray-700">
                          {task.asset_name}
                        </td>
                        <td className="px-6 py-4 font-bold text-xs uppercase text-gray-700">
                          {task.vendor_name}
                        </td>
                        <td className={`px-6 py-4 text-xs uppercase ${getPriorityStyle(task.priority)}`}>
                          {task.priority}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${getStatusStyle(task.status)}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-xs text-gray-500">
                          {new Date(task.due_date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <div>
              <h3 className="font-headline-md text-lg text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                Quick Actions
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                Trigger direct operational tasks
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  label: "Assign New Task",
                  desc: "Dispatch a PM task to vendor & supervisor",
                  icon: "assignment_add",
                  color: "bg-[#D32F2F] text-white border-[#D32F2F]",
                  hover: "hover:bg-white hover:text-[#D32F2F]",
                  action: () => {
                    router.push("/admin/tasks");
                    triggerToast("Redirecting to task assignment dispatch...", "info");
                  },
                },
                {
                  label: "Add Asset Unit",
                  desc: "Onboard new heavy machinery or equipment",
                  icon: "add_to_photos",
                  color: "bg-[#1A1A1A] text-white border-[#1A1A1A]",
                  hover: "hover:bg-white hover:text-[#1A1A1A]",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddAsset", "true");
                    }
                    router.push("/admin/assets");
                    triggerToast("Opening Asset Onboarding page...", "info");
                  },
                },
                {
                  label: "Onboard Personnel",
                  desc: "Register a new vendor or supervisor account",
                  icon: "person_add",
                  color: "bg-white text-[#1A1A1A] border-[#1A1A1A]",
                  hover: "hover:bg-[#1A1A1A] hover:text-white",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddUser", "true");
                    }
                    router.push("/admin/users");
                    triggerToast("Opening User Registration form...", "info");
                  },
                },
                {
                  label: "Create PM Template",
                  desc: "Draft a new checklist protocol template",
                  icon: "post_add",
                  color: "bg-[#2E7D32] text-white border-[#2E7D32]",
                  hover: "hover:bg-white hover:text-[#2E7D32]",
                  action: () => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("autoOpenAddTemplate", "true");
                    }
                    router.push("/admin/pm");
                    triggerToast("Opening PM Template creator...", "info");
                  },
                },
              ].map((act) => (
                <button
                  key={act.label}
                  onClick={act.action}
                  className={`border-2 rounded-[20px] p-6 flex flex-col justify-between gap-6 transition-all text-left cursor-pointer group shadow-none min-h-[160px] ${act.color} ${act.hover}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="material-symbols-outlined text-3xl">
                      {act.icon}
                    </span>
                    <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity">
                      arrow_outward
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-tight">
                      {act.label}
                    </h4>
                    <p className="text-[10px] opacity-80 mt-1 font-medium">
                      {act.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Toast Popups */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#1a1c1c] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border-2 border-[#D32F2F] animate-in fade-in slide-in-from-top-5 duration-300"
          >
            <span
              className={`material-symbols-outlined text-sm ${
                toast.type === "success"
                  ? "text-green-400"
                  : toast.type === "error"
                  ? "text-[#D32F2F]"
                  : "text-blue-400"
              }`}
            >
              {toast.type === "success"
                ? "check_circle"
                : toast.type === "error"
                ? "error"
                : "info"}
            </span>
            <span className="font-bold text-xs uppercase tracking-wider">
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
