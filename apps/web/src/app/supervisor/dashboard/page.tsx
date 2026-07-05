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

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<VendorCard | null>(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

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

  const fetchTasksAndVendors = useCallback(async () => {
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

      // Compute stats
      const pending = tasks.filter((t: any) => t.status === "submitted" || t.status === "pending" || t.status === "in_progress").length;
      const approved = tasks.filter((t: any) => t.status === "approved").length;
      const rejected = tasks.filter((t: any) => t.status === "rejected").length;
      setStats({ pending, approved, rejected, total: tasks.length });

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
    }
  }, [supabase]);

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
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">Industrial Precision</p>
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
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>
          <button
            onClick={() => router.push("/supervisor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
              <img className="w-full h-full object-cover" alt="Profil" src={avatarSrc} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase">{currentUser?.full_name || "Supervisor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">{currentUser?.department || "Supervisor"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Review Queue</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Manage & approve maintenance reports</p>
        </div>
        <div className="flex-1 max-w-md mx-8 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by task code, title, tech..."
            className="w-full bg-white border-2 border-[#1A1A1A] rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[#D32F2F] font-body-md"
          />
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src={avatarSrc} alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)]">
        <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-12">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "Pending Reviews", value: stats.pending, color: "text-[#D32F2F]" },
              { label: "Total Tasks", value: stats.total, color: "text-[#1A1A1A]" },
              { label: "Approved", value: stats.approved, color: "text-green-600" },
              { label: "Rejected", value: stats.rejected, color: "text-gray-700" },
            ].map((s) => (
              <div key={s.label} className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">{s.label}</p>
                <div className={`text-[44px] font-extrabold leading-none ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Urgent Items */}
          {urgentItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">High Priority</h3>
                <span className="bg-[#D32F2F] text-white px-3 py-0.5 rounded-full font-bold text-[10px] border-2 border-[#1A1A1A] uppercase tracking-wider">
                  {urgentItems.length} Items
                </span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {urgentItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push("/supervisor/tasks")}
                    className="bg-white border-2 border-[#1A1A1A] border-l-[12px] border-l-[#D32F2F] rounded-[20px] p-6 cursor-pointer hover:border-[#D32F2F] transition-all flex items-center justify-between gap-6"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#D32F2F] text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">{item.priority.toUpperCase()}</span>
                        <span className="text-gray-400 text-[10px] font-bold">{item.task_code}</span>
                      </div>
                      <h4 className="font-extrabold text-base text-[#1A1A1A]">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">Tech: <strong className="text-[#1A1A1A]">{item.tech}</strong> • {item.location}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Due: {item.due_date} • {item.time}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push("/supervisor/tasks"); }}
                      className="bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full px-6 py-2 font-bold text-xs uppercase tracking-wider hover:bg-[#B71C1C] transition-all cursor-pointer shrink-0"
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
              <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                Active Queue
                {submittedItems.length > 0 && (
                  <span className="ml-3 bg-[#D32F2F] text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{submittedItems.length}</span>
                )}
              </h3>
              <button
                onClick={() => router.push("/supervisor/tasks")}
                className="text-[#D32F2F] font-bold hover:underline flex items-center gap-1 uppercase text-xs tracking-wider border-none bg-transparent cursor-pointer"
              >
                View All
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {activeQueue.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-[20px]">
                <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mt-2">
                  No active or incomplete tasks
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeQueue.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push("/supervisor/tasks")}
                    className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex items-center justify-between hover:border-[#D32F2F] transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 border-2 border-[#1A1A1A] rounded-xl overflow-hidden bg-[#D32F2F]/5 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#D32F2F] text-2xl">build</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${statusColor[item.status] || "bg-gray-400 text-white"} px-2 py-0.5 rounded-full text-[9px] font-bold uppercase`}>
                            {item.status.replace("_", " ")}
                          </span>
                          <span className="text-gray-400 text-[10px] font-bold">{item.time}</span>
                        </div>
                        <h5 className="font-headline-md text-sm font-extrabold mb-0.5 text-[#1A1A1A]">{item.title}</h5>
                        <p className="text-gray-500 text-xs">
                          <span className="font-bold text-[10px] text-gray-400 uppercase">{item.task_code}</span> • Tech: <strong className="text-[#1A1A1A]">{item.tech}</strong> • {item.location}
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
              <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">Vendors Under Responsibility</h3>
              <p className="text-xs text-gray-500 font-medium">Vendors that have active tasks with this supervisor.</p>
            </div>

            {vendors.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-[20px]">
                <span className="material-symbols-outlined text-4xl text-gray-300">groups</span>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider mt-2">No vendors connected yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendorDetail(vendor)}
                    className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 hover:border-[#D32F2F] transition-all duration-200 cursor-pointer flex flex-col justify-between h-44 relative group"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#1A1A1A] uppercase ${vendor.is_active ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {vendor.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <h4 className="font-headline-lg text-base font-extrabold mt-3 text-[#1A1A1A] group-hover:text-[#D32F2F] transition-colors leading-tight">
                        {vendor.full_name}
                      </h4>
                      <p className="text-xs text-gray-400 font-bold mt-1 truncate">{vendor.email || vendor.department || "—"}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">{vendor.taskCount} Total tasks</span>
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
          <div className="relative bg-white border-4 border-[#1A1A1A] p-8 rounded-[24px] max-w-sm w-full z-10 flex flex-col gap-6 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <header className="flex justify-between items-center pb-4 border-b-2 border-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D32F2F] text-2xl">badge</span>
                <h3 className="font-headline-md text-base uppercase font-black tracking-tight">Vendor Profile</h3>
              </div>
              <button 
                onClick={() => setSelectedVendorDetail(null)} 
                className="w-8 h-8 flex items-center justify-center border-2 border-[#1A1A1A] rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-[#1A1A1A] bg-[#D32F2F]/5 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#D32F2F] text-3xl">engineering</span>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-[#1A1A1A] uppercase ${selectedVendorDetail.is_active ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {selectedVendorDetail.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <h4 className="font-headline-lg text-lg font-black leading-tight text-[#1A1A1A] uppercase truncate">
                  {selectedVendorDetail.full_name}
                </h4>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border-2 border-[#1A1A1A] rounded-xl">
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Vendor ID</p>
                  <p className="font-extrabold text-xs text-[#1A1A1A]">#{selectedVendorDetail.employee_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Department</p>
                  <p className="font-extrabold text-xs text-[#1A1A1A]">{selectedVendorDetail.department || "General Maintenance"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase font-bold text-gray-400">Email Address</p>
                  <p className="font-extrabold text-xs text-[#1A1A1A] break-all">{selectedVendorDetail.email || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] uppercase font-bold text-gray-400">Phone Contact</p>
                  <p className="font-extrabold text-xs text-[#1A1A1A]">{selectedVendorDetail.phone || "No phone registered"}</p>
                </div>
              </div>

              <div className="bg-[#1A1A1A] text-white p-4 rounded-xl border-2 border-[#1A1A1A] flex justify-between items-center">
                <div>
                  <p className="text-[9px] uppercase font-bold text-white/50">Current Workload</p>
                  <p className="font-black text-sm uppercase tracking-tight text-white">Active Assignments</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#D32F2F] bg-white border border-[#1A1A1A] px-3 py-1 rounded-lg">
                    {selectedVendorDetail.taskCount}
                  </span>
                  <span className="text-white/60 font-bold text-[10px] uppercase">Tasks</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedVendorDetail(null);
                router.push("/supervisor/tasks");
              }}
              className="w-full py-3.5 bg-[#D32F2F] text-white font-black text-xs uppercase tracking-widest rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all cursor-pointer text-center"
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
            className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-[#D32F2F]">
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
