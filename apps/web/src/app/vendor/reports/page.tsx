"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";

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
  supervisorId?: string;
  photos: string[];
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


  const { toasts, triggerToast } = useToasts(3500, "success");

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
          confidence: rep.ai_confidence_score ?? 0,
          date: rep.submitted_at ? new Date(rep.submitted_at).toLocaleDateString() : "N/A",
          findings: rep.findings || "No critical discrepancies logged.",
          recommendations: rep.recommendations || "Routine check schedule standard.",
          avatar_url: supervisorProfile?.avatar_url || "https://ui-avatars.com/api/?name=Supervisor&background=000&color=fff",
          supervisor: supervisorProfile?.full_name || "Lead Supervisor",
          supervisorId: rep.pm_tasks?.assigned_supervisor_id || undefined,
          photos: rep.photos_urls || []
        };
      });

      setReports(list);

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load reports: " + e.message, "error");
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

  // Drawer interactions
  const handleOpenDrawer = (rep: Report) => {
    setSelectedReport(rep);
    setIsPanelOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsPanelOpen(false);
  };

  const handleDownloadPDF = () => {
    if (selectedReport?.reportId) {
      window.open(`/supervisor/tasks/report-preview?reportId=${selectedReport.reportId}`, "_blank");
    } else if (selectedReport?.taskId) {
      window.open(`/supervisor/tasks/report-preview?taskId=${selectedReport.taskId}`, "_blank");
    } else {
      triggerToast("Invalid report.", "error");
    }
  };

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-page text-on-surface font-body-md overflow-hidden relative">
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
            onClick={() => { }}
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
              triggerToast("Logging out...", "info");
              await supabase.auth.signOut();
              setTimeout(() => router.push("/"), 1000);
            }}
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

      {/* Main Content Area */}
      <main className="lg:ml-[220px] h-screen overflow-y-auto bg-page flex-grow flex flex-col relative w-full lg:w-[calc(100%-220px)] pb-20 lg:pb-0">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-20 px-6 lg:px-10 border-b border-gray-200 bg-white shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">
              Task Reports
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              Past PM reports
            </p>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-grow p-4 lg:p-10 space-y-6 lg:space-y-10 max-w-[1400px] w-full mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 sm:p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">Total Reports</span>
                <span className="material-symbols-outlined text-gray-400 shrink-0">assessment</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-semibold text-gray-900 tracking-tighter">{totalReportsCount}</p>
                <p className="text-xs text-red-600 font-medium uppercase mt-1">Logs stored in core database</p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">Approved Logs</span>
                <span className="material-symbols-outlined text-green-600 shrink-0">verified</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-semibold text-green-600 tracking-tighter">{approvedReportsCount}</p>
                <p className="text-xs text-green-700 font-medium uppercase mt-1">Audit verification success</p>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">Awaiting Review</span>
                <span className="material-symbols-outlined text-black shrink-0">hourglass_empty</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-semibold text-black tracking-tighter">{pendingReportsCount}</p>
                <p className="text-xs text-gray-700 font-medium uppercase mt-1">Pending approval from audit lead</p>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] shadow-sm">
            <div className="flex flex-wrap gap-4 flex-grow">
              <div className="flex-grow min-w-[250px]">
                <label className="block text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Search Reports</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by Title, ID, Supervisor..."
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm focus:border-[#D32F2F] outline-none"
                  />
                </div>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm outline-none cursor-pointer bg-white"
                >
                  <option value="All Categories">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Audit Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm outline-none cursor-pointer bg-white"
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
                    className="flex items-center gap-1 px-4 py-3 border border-gray-200 rounded-[20px] font-medium text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer bg-white text-[#1A1A1A]"
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reports Table Bento Box */}
          <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white uppercase text-[10px] font-medium tracking-widest border-b border-gray-200">
                    <th className="py-4 px-6">Report Ref</th>
                    <th className="py-4 px-6">Task Reference</th>
                    <th className="py-4 px-6">Audited Category</th>
                    <th className="py-4 px-6 text-center">Audit Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 font-medium uppercase tracking-wider text-xs">
                        No reports logged in database matching filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-xs text-[#D32F2F] tracking-wide">
                          {rep.taskCode || rep.id}
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-sm uppercase text-black">{rep.taskTitle}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Logged: {rep.date}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="border border-gray-200 text-[#1A1A1A] px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">
                            {rep.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-3 py-0.5 border border-gray-200 rounded-full text-[9px] font-semibold uppercase tracking-wider text-white ${rep.status === "Approved" ? "bg-green-600" : rep.status === "Rejected" ? "bg-[#D32F2F]" : "bg-black"
                            }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenDrawer(rep)}
                              className="px-4 py-2 border border-gray-200 rounded-md font-semibold text-[10px] uppercase tracking-wider bg-white hover:bg-black hover:text-white transition-colors cursor-pointer text-black"
                            >
                              Review Details
                            </button>
                            <button
                              onClick={handleDownloadPDF}
                              className="p-2 border border-gray-200 rounded-md flex items-center justify-center bg-white hover:bg-black hover:text-white transition-all cursor-pointer text-black"
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
              <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="w-10 h-10 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer bg-white rounded"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="w-10 h-10 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer bg-white rounded"
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
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l border-gray-200 z-[70] transition-transform duration-300 flex flex-col ${isPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {selectedReport && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-[#1A1A1A] text-white shrink-0">
              <h2 className="text-sm uppercase font-semibold tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">analytics</span>
                Report details: {selectedReport.taskCode || selectedReport.id}
              </h2>
              <button onClick={handleCloseDrawer} className="p-1 hover:bg-white/10 rounded cursor-pointer text-white border-none bg-transparent">
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow p-8 overflow-y-auto space-y-6 scroll-container text-left">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Main Task Title</p>
                <h3 className="font-headline-md text-xl text-black font-semibold uppercase mt-1">{selectedReport.taskTitle}</h3>
              </div>

              {/* Status block */}
              <div className="bg-gray-50 p-4 border-black/10 rounded-xl">
                <div>
                  <p className="text-[9px] uppercase font-medium text-gray-400">Audit Status</p>
                  <span className={`mt-1 inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${selectedReport.status === "Approved" ? "bg-green-600" : "bg-[#D32F2F]"
                    }`}>
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Observations & Findings</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l border-gray-200 p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.findings}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Recommendations & Actions</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l border-[#D32F2F] p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.recommendations}
                </p>
              </div>

              {/* Photos Gallery */}
              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest mb-2">Evidence Photos ({selectedReport.photos.length})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReport.photos.map((photo, i) => (
                      <div key={i} className="aspect-video border border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                        <img src={photo} alt={`Inspection Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auditor Sign-off */}
              <div className="bg-gray-50 p-6 rounded-xl border-black/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-gray-200 overflow-hidden bg-white shrink-0">
                  <img src={selectedReport.avatar_url} alt={selectedReport.supervisor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-medium text-gray-400">Lead Supervisor</p>
                  <p className="font-semibold text-sm uppercase text-black">{selectedReport.supervisor}</p>
                  <p className="text-[9px] font-medium text-green-600 uppercase mt-0.5">Signed off digitally</p>
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="p-8 pb-24 lg:pb-8 border-t border-gray-200 bg-white flex flex-col gap-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent("open-task-chat", {
                    detail: {
                      taskCode: selectedReport.taskCode || selectedReport.id,
                      taskTitle: selectedReport.taskTitle,
                      taskId: selectedReport.taskId || selectedReport.id,
                      supervisorId: selectedReport.supervisorId,
                      type: "report"
                    }
                  });
                  window.dispatchEvent(event);
                  handleCloseDrawer();
                }}
                className="w-full py-3.5 bg-white text-[#D32F2F] border border-gray-200 hover:bg-gray-50 font-semibold uppercase text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-sm">forum</span>
                <span>Ask Supervisor (Discuss Report)</span>
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full py-4 border border-gray-200 text-black font-semibold uppercase text-xs rounded-lg hover:bg-black hover:text-white transition-all cursor-pointer bg-white"
                >
                  Download PDF
                </button>
                <button
                  onClick={handleCloseDrawer}
                  className="w-full py-4 bg-[#D32F2F] text-white border border-gray-200 font-semibold uppercase text-xs rounded-lg hover:bg-black transition-all cursor-pointer border-none"
                >
                  Close Details
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Floating Toast Containers */}
      <div className="fixed top-10 right-10 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border border-gray-200 bg-white text-black animate-in fade-in slide-in-from-top-4 duration-300">
            <span className={`material-symbols-outlined ${t.type === "success" ? "text-green-600" : t.type === "error" ? "text-[#D32F2F]" : "text-blue-500"
              }`}>
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-label-md text-xs uppercase font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
