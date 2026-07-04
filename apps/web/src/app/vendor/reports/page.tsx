"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Report {
  id: string;        // unique report UUID (used as React key)
  taskCode?: string; // task_code for display (e.g. TASK-2026-5839)
  reportId?: string;
  taskId?: string;
  taskTitle: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  status: "Approved" | "Pending" | "Draft" | "Rejected";
  confidence: number;
  date: string;
  findings: string;
  recommendations: string;
  avatar_url: string;
  supervisor: string;
  audio_url: string;
  photos: string[];
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function VendorReportsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Selected report for slide-out drawer detail
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Audio Playback simulation
  const [isPlaying, setIsPlaying] = useState(false);

  // Notification Toasts
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setCurrentUser(profile);

      // Fetch reports where associated task is assigned to this vendor
      // Filter by inner join on pm_tasks
      const { data: reportsData, error } = await supabase
        .from("pm_reports")
        .select(`
          id,
          findings,
          recommendations,
          photos_urls,
          ai_confidence_score,
          status,
          submitted_at,
          pm_tasks!inner (
            id,
            task_code,
            assigned_vendor_id,
            assigned_supervisor_id,
            assets (
              name,
              category
            ),
            profiles:assigned_supervisor_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("pm_tasks.assigned_vendor_id", user.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Transform reports data
      const list: Report[] = (reportsData || []).map((rep: any) => {
        let statusStr: "Approved" | "Pending" | "Draft" | "Rejected" = "Pending";
        if (rep.status === "approved") statusStr = "Approved";
        else if (rep.status === "rejected") statusStr = "Rejected";
        else if (rep.status === "draft") statusStr = "Draft";

        const supervisorProfile: any = rep.pm_tasks?.profiles;

        return {
          id: rep.id,  // unique report UUID — used as React key
          taskCode: rep.pm_tasks?.task_code || `TK-${rep.pm_tasks?.id?.substring(0, 4).toUpperCase()}`,
          reportId: rep.id,
          taskId: rep.pm_tasks?.id,
          taskTitle: rep.pm_tasks?.assets?.name || "PM Checklist Verification",
          category: rep.pm_tasks?.assets?.category || "Mechanical",
          status: statusStr,
          confidence: rep.ai_confidence_score || 95,
          date: rep.submitted_at ? new Date(rep.submitted_at).toLocaleDateString() : "N/A",
          findings: rep.findings || "No critical discrepancies logged.",
          recommendations: rep.recommendations || "Routine check schedule standard.",
          avatar_url: supervisorProfile?.avatar_url || "https://ui-avatars.com/api/?name=Supervisor&background=000&color=fff",
          supervisor: supervisorProfile?.full_name || "Lead Supervisor",
          audio_url: "",
          photos: rep.photos_urls || []
        };
      });

      setReports(list);

    } catch (e: any) {
      console.error(e);
      triggerToast("Gagal memuat laporan: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered reports
  const filteredReports = reports.filter((rep) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (rep.taskCode || "").toLowerCase().includes(q) ||
      rep.taskTitle.toLowerCase().includes(q) ||
      rep.findings.toLowerCase().includes(q) ||
      rep.supervisor.toLowerCase().includes(q);

    // Case-insensitive category match
    const matchesCategory =
      categoryFilter === "All Categories" ||
      rep.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus = statusFilter === "All Statuses" || rep.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);

  // Dynamic category options from actual data
  const uniqueCategories = Array.from(new Set(reports.map((r) => r.category))).filter(Boolean).sort();

  // Helper to change filter + reset to page 1
  const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
  const handleCategoryChange = (val: string) => { setCategoryFilter(val); setCurrentPage(1); };
  const handleStatusChange = (val: string) => { setStatusFilter(val); setCurrentPage(1); };
  const handleResetFilters = () => { setSearchQuery(""); setCategoryFilter("All Categories"); setStatusFilter("All Statuses"); setCurrentPage(1); };

  // Summary Metrics calculations
  const totalReportsCount = reports.length;
  const approvedReportsCount = reports.filter((rep) => rep.status === "Approved").length;
  const pendingReportsCount = reports.filter((rep) => rep.status === "Pending").length;
  const avgConfidence = reports.length > 0
    ? Math.round(reports.reduce((acc, curr) => acc + curr.confidence, 0) / reports.length)
    : 100;

  // Drawer interactions
  const handleOpenDrawer = (rep: Report) => {
    setSelectedReport(rep);
    setIsPanelOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsPanelOpen(false);
  };

  const handlePlayAudio = () => {
    setIsPlaying(true);
    triggerToast("Memutar audio summary log...", "info");
    setTimeout(() => {
      setIsPlaying(false);
      triggerToast("Audio playback selesai.", "success");
    }, 4000);
  };

  const handleDownloadPDF = () => {
    if (selectedReport?.reportId) {
      window.open(`/supervisor/tasks/report-preview?reportId=${selectedReport.reportId}`, "_blank");
    } else if (selectedReport?.taskId) {
      window.open(`/supervisor/tasks/report-preview?taskId=${selectedReport.taskId}`, "_blank");
    } else {
      triggerToast("Laporan tidak valid.", "error");
    }
  };

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Memuat Laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-white text-on-surface font-body-md overflow-hidden relative">
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
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => router.push("/vendor")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
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
            onClick={() => {}}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              assessment
            </span>
            <span>Reports</span>
          </button>
        </nav>

        {/* Profile widget */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={async () => {
              triggerToast("CLOSING VENDOR TERMINAL...", "info");
              await supabase.auth.signOut();
              setTimeout(() => router.push("/"), 1000);
            }}
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

      {/* Main Content Area */}
      <main className="ml-[220px] h-screen overflow-y-auto bg-white flex-1 flex flex-col relative w-[calc(100%-220px)]">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-20 px-10 border-b-2 border-[#1A1A1A] bg-white shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
              Task Reports
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Archived Telemetry logs & Assessments
            </p>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-grow p-10 space-y-10 max-w-[1400px] w-full mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-[#D32F2F]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">Total Reports</span>
                <span className="material-symbols-outlined text-[#D32F2F]">assessment</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-[#D32F2F] tracking-tighter">{totalReportsCount}</p>
                <p className="text-xs text-red-600 font-bold uppercase mt-1">Logs stored in core database</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-green-600">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">Approved Logs</span>
                <span className="material-symbols-outlined text-green-600">verified</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-green-600 tracking-tighter">{approvedReportsCount}</p>
                <p className="text-xs text-green-700 font-bold uppercase mt-1">Audit verification success</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-black">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">Awaiting Review</span>
                <span className="material-symbols-outlined text-black">hourglass_empty</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-black tracking-tighter">{pendingReportsCount}</p>
                <p className="text-xs text-gray-700 font-bold uppercase mt-1">Pending approval from audit lead</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-blue-600">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Confidence</span>
                <span className="material-symbols-outlined text-blue-600">analytics</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-blue-600 tracking-tighter">{avgConfidence}%</p>
                <p className="text-xs text-blue-700 font-bold uppercase mt-1">Combined model accuracy rating</p>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
            <div className="flex flex-wrap gap-4 flex-grow">
              <div className="flex-grow min-w-[250px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Search Reports</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by Title, ID, Supervisor..."
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm focus:border-[#D32F2F] outline-none"
                  />
                </div>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm outline-none cursor-pointer bg-white"
                >
                  <option value="All Categories">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Audit Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm outline-none cursor-pointer bg-white"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(searchQuery || categoryFilter !== "All Categories" || statusFilter !== "All Statuses") && (
                <div className="flex items-end pb-0">
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-4 py-3 border-2 border-[#1A1A1A] rounded-[20px] font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer bg-white text-[#1A1A1A]"
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reports Table Bento Box */}
          <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white uppercase text-[10px] font-bold tracking-widest border-b border-[#1A1A1A]">
                    <th className="py-4 px-6">Report Ref</th>
                    <th className="py-4 px-6">Task Reference</th>
                    <th className="py-4 px-6">Audited Category</th>
                    <th className="py-4 px-6 text-center">Score</th>
                    <th className="py-4 px-6 text-center">Audit Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100">
                  {paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 font-bold uppercase tracking-wider text-xs">
                        No reports logged in database matching filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-xs text-[#D32F2F] tracking-wide">
                          {rep.taskCode || rep.id}
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-extrabold text-sm uppercase text-black">{rep.taskTitle}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Logged: {rep.date}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                            {rep.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="font-headline-md font-extrabold text-sm text-[#D32F2F]">{rep.confidence}%</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-3 py-0.5 border border-black rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
                            rep.status === "Approved" ? "bg-green-600" : rep.status === "Rejected" ? "bg-[#D32F2F]" : "bg-black"
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDrawer(rep)}
                              className="px-4 py-2 border border-black rounded-md font-black text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-colors cursor-pointer text-black"
                            >
                              Review Details
                            </button>
                            <button
                              onClick={handleDownloadPDF}
                              className="p-2 border border-black rounded-md flex items-center justify-center bg-white hover:bg-black hover:text-white transition-all cursor-pointer text-black"
                            >
                              <span className="material-symbols-outlined text-[16px]">download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Panel */}
            {totalPages > 1 && (
              <div className="p-6 border-t-2 border-gray-100 flex justify-between items-center bg-white">
                <p className="text-xs font-bold text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-10 h-10 border border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer bg-white rounded"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-10 h-10 border border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer bg-white rounded"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Drawer slide-out panel */}
      {isPanelOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60]" onClick={handleCloseDrawer} />
      )}

      <aside
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l-2 border-[#1A1A1A] z-[70] transition-transform duration-300 flex flex-col ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedReport && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b-2 border-[#1A1A1A] flex justify-between items-center bg-[#1A1A1A] text-white shrink-0">
              <h2 className="text-sm uppercase font-black tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D32F2F]">analytics</span>
                Report details: {selectedReport.taskCode || selectedReport.id}
              </h2>
              <button onClick={handleCloseDrawer} className="p-1 hover:bg-white/10 rounded cursor-pointer text-white border-none bg-transparent">
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow p-8 overflow-y-auto space-y-6 scroll-container text-left">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Main Task Title</p>
                <h3 className="font-headline-md text-xl text-black font-extrabold uppercase mt-1">{selectedReport.taskTitle}</h3>
              </div>

              {/* Status & Confidence block */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-black/10 rounded-xl">
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Audit Status</p>
                  <span className={`mt-1 inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                    selectedReport.status === "Approved" ? "bg-green-600" : "bg-[#D32F2F]"
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Confidence Score</p>
                  <p className="font-extrabold text-sm text-[#D32F2F] mt-1">{selectedReport.confidence}% Accurate</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Observations & Findings</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l-4 border-black p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.findings}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Recommendations & Actions</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l-4 border-[#D32F2F] p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.recommendations}
                </p>
              </div>

              {/* Audio playback summary */}
              {selectedReport.audio_url && (
                <div className="bg-white border-2 border-[#1A1A1A] p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#D32F2F] text-3xl">mic</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-black">Voice Transcribe Summary</h4>
                      <p className="text-[9px] font-semibold text-gray-500 uppercase">AI Audio Log Telemetry</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePlayAudio}
                    className="px-4 py-2 border-2 border-black rounded-lg text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer bg-white text-black"
                  >
                    {isPlaying ? "Playing..." : "Play Summary"}
                  </button>
                </div>
              )}

              {/* Photos Gallery */}
              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Evidence Photos ({selectedReport.photos.length})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReport.photos.map((photo, i) => (
                      <div key={i} className="aspect-video border-2 border-black rounded-xl overflow-hidden bg-gray-100">
                        <img src={photo} alt={`Inspection Photo ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auditor Sign-off */}
              <div className="bg-gray-50 p-6 rounded-xl border border-black/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-black overflow-hidden bg-white shrink-0">
                  <img src={selectedReport.avatar_url} alt={selectedReport.supervisor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Lead Supervisor</p>
                  <p className="font-extrabold text-sm uppercase text-black">{selectedReport.supervisor}</p>
                  <p className="text-[9px] font-bold text-green-600 uppercase mt-0.5">Signed off digitally</p>
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="p-8 border-t-2 border-[#1A1A1A] bg-white grid grid-cols-2 gap-4 shrink-0">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-4 border-2 border-black text-black font-black uppercase text-xs rounded-lg hover:bg-black hover:text-white transition-all cursor-pointer bg-white"
              >
                Download PDF
              </button>
              <button
                onClick={handleCloseDrawer}
                className="w-full py-4 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase text-xs rounded-lg hover:bg-black transition-all cursor-pointer border-none"
              >
                Close Details
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Floating Toast Containers */}
      <div className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border-2 border-black bg-white text-black animate-in fade-in slide-in-from-top-4 duration-300">
            <span className={`material-symbols-outlined ${
              t.type === "success" ? "text-green-600" : t.type === "error" ? "text-[#D32F2F]" : "text-blue-500"
            }`}>
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-label-md text-xs uppercase font-bold">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
