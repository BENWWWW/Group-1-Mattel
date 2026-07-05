"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Report {
  id: string;
  taskId?: string;
  report_code: string;
  asset_name: string;
  asset_location: string;
  vendor_name: string;
  supervisor_name: string;
  submitted_at: string;
  ai_score: number | null;
  status: string;
  category: string;
}

interface ToastType { id: string; message: string; type: "success" | "error" | "info"; }

const PAGE_SIZE = 10;

export default function ReportsPage() {
  const supabase = createClient();

  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("any");
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Stats
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  const triggerToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const fetchStats = useCallback(async () => {
    const [total, approved, pending, rejected] = await Promise.all([
      supabase.from("pm_reports").select("id", { count: "exact", head: true }),
      supabase.from("pm_reports").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("pm_reports").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("pm_reports").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    ]);
    setStats({ total: total.count??0, approved: approved.count??0, pending: pending.count??0, rejected: rejected.count??0 });
  }, [supabase]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
          .from("pm_reports")
          .select(`id, status, submitted_at, ai_confidence_score,
          pm_tasks(id, task_code, assets(name, location, category),
          vendor:profiles!pm_tasks_assigned_vendor_id_fkey(full_name),
          supervisor:profiles!pm_tasks_assigned_supervisor_id_fkey(full_name))`,
          { count: "exact" })
        .order("submitted_at", { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (statusFilter !== "any") query = query.eq("status", statusFilter);

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped: Report[] = (data || []).map((r: any) => ({
        id: r.id,
        taskId: r.pm_tasks?.id,
        report_code: r.pm_tasks?.task_code ?? r.id.slice(0, 8).toUpperCase(),
        asset_name: r.pm_tasks?.assets?.name ?? "—",
        asset_location: r.pm_tasks?.assets?.location ?? "—",
        vendor_name: r.pm_tasks?.vendor?.full_name ?? "—",
        supervisor_name: r.pm_tasks?.supervisor?.full_name ?? "—",
        submitted_at: r.submitted_at,
        ai_score: r.ai_confidence_score,
        status: r.status,
        category: r.pm_tasks?.assets?.category ?? "General",
      }));

      setReports(mapped);
      setTotalCount(count ?? 0);
    } catch {
      triggerToast("Failed to load reports.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentPage, statusFilter, triggerToast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r =>
      r.report_code.toLowerCase().includes(q) ||
      r.asset_name.toLowerCase().includes(q) ||
      r.vendor_name.toLowerCase().includes(q) ||
      r.supervisor_name.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── Download CSV ────────────────────────────────────────────────────────────
  const handleDownloadCSV = async () => {
    setIsExportingCSV(true);
    triggerToast("Preparing CSV export...", "info");
    try {
      // Fetch ALL reports (no pagination) matching current status filter
      let query = supabase
        .from("pm_reports")
        .select(`id, status, submitted_at, ai_confidence_score,
          pm_tasks(id, task_code, assets(name, location, category),
          vendor:profiles!pm_tasks_assigned_vendor_id_fkey(full_name),
          supervisor:profiles!pm_tasks_assigned_supervisor_id_fkey(full_name))`)
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "any") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;

      const rows: Report[] = (data || []).map((r: any) => ({
        id: r.id,
        taskId: r.pm_tasks?.id,
        report_code: r.pm_tasks?.task_code ?? r.id.slice(0, 8).toUpperCase(),
        asset_name: r.pm_tasks?.assets?.name ?? "—",
        asset_location: r.pm_tasks?.assets?.location ?? "—",
        vendor_name: r.pm_tasks?.vendor?.full_name ?? "—",
        supervisor_name: r.pm_tasks?.supervisor?.full_name ?? "—",
        submitted_at: r.submitted_at,
        ai_score: r.ai_confidence_score,
        status: r.status,
        category: r.pm_tasks?.assets?.category ?? "General",
      }));

      // Apply search filter if active
      const exportRows = searchQuery
        ? rows.filter(r => {
            const q = searchQuery.toLowerCase();
            return (
              r.report_code.toLowerCase().includes(q) ||
              r.asset_name.toLowerCase().includes(q) ||
              r.vendor_name.toLowerCase().includes(q) ||
              r.supervisor_name.toLowerCase().includes(q)
            );
          })
        : rows;

      // Build CSV content
      const headers = [
        "Task Code",
        "Asset Name",
        "Location",
        "Category",
        "Vendor",
        "Supervisor",
        "Submitted At",
        "AI Score (%)",
        "Status",
        "Report ID",
      ];

      const escape = (val: string | number | null | undefined): string => {
        const str = val === null || val === undefined ? "" : String(val);
        // Wrap in quotes if contains comma, quote, or newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        headers.map(escape).join(","),
        ...exportRows.map(r =>
          [
            r.report_code,
            r.asset_name,
            r.asset_location,
            r.category,
            r.vendor_name,
            r.supervisor_name,
            r.submitted_at
              ? new Date(r.submitted_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
            r.ai_score !== null ? r.ai_score : "—",
            r.status,
            r.id,
          ]
            .map(escape)
            .join(",")
        ),
      ];

      const csvContent = "\uFEFF" + csvLines.join("\r\n"); // BOM for Excel UTF-8

      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `pm_reports_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerToast(`CSV successfully downloaded (${exportRows.length} rows).`, "success");
    } catch (err: any) {
      triggerToast("Failed to export CSV: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsExportingCSV(false);
    }
  };

  // ─── Download PDF per-row (same preview page as vendor/supervisor) ───────────
  const handleDownloadPDF = (report: Report) => {
    // Open the same report-preview page used by vendor & supervisor
    window.open(
      `/supervisor/tasks/report-preview?reportId=${report.id}`,
      "_blank"
    );
  };

  // ─── Approve / Reject ────────────────────────────────────────────────────────
  const handleUpdateStatus = async (reportId: string, newStatus: "approved" | "rejected") => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (report && report.taskId) {
        const { error: taskError } = await supabase
          .from("pm_tasks")
          .update({ status: newStatus })
          .eq("id", report.taskId);
        if (taskError) throw taskError;
      }

      const { error } = await supabase.from("pm_reports").update({ status: newStatus }).eq("id", reportId);
      if (error) throw error;

      triggerToast(`Report ${newStatus === "approved" ? "APPROVED" : "REJECTED"} successfully.`, newStatus === "approved" ? "success" : "error");
      fetchReports();
      fetchStats();
    } catch (err: any) {
      triggerToast(err.message || "Update failed.", "error");
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      approved: "bg-green-100 text-green-800 border-green-300",
      submitted: "bg-amber-100 text-amber-800 border-amber-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
    };
    const dot: Record<string, string> = { approved: "bg-green-600", submitted: "bg-amber-500", rejected: "bg-red-600" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border-[1.5px] border-[#1A1A1A] ${map[status]||"bg-gray-100 text-gray-700 border-gray-300"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot[status]||"bg-gray-400"}`}/>
        {status.charAt(0).toUpperCase()+status.slice(1)}
      </span>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400 font-bold";
    if (score >= 90) return "text-green-700 font-extrabold";
    if (score >= 70) return "text-amber-600 font-extrabold";
    return "text-[#D32F2F] font-extrabold";
  };

  return (
    <div className="flex h-screen w-full bg-[#fff8f7] text-[#1A1A1A] font-body-md overflow-hidden">
      <main className="ml-[220px] w-[calc(100%-220px)] h-screen flex flex-col overflow-hidden bg-[#fff8f7] relative">
        {/* TopNavBar */}
        <header className="h-20 px-10 flex justify-between items-center bg-[#fff8f7] border-b-2 border-[#1A1A1A] sticky top-0 z-40">
          <div>
            <h2 className="font-headline-md text-2xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">Reports</h2>
            <p className="text-[10px] text-gray-500 uppercase font-bold">PM Submission & Audit Trail</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-[#1A1A1A]">
            <span className="material-symbols-outlined text-[#D32F2F] text-xl">search</span>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search reports..." className="bg-transparent border-none focus:ring-0 text-xs w-48 outline-none font-bold uppercase"/>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 pb-28">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Total Reports", value: stats.total, icon: "description", color: "text-[#D32F2F]" },
              { label: "Approved", value: stats.approved, icon: "check_circle", color: "text-green-600", accent: "border-l-8 border-l-green-600" },
              { label: "Pending", value: stats.pending, icon: "hourglass_empty", color: "text-amber-500", accent: "border-l-8 border-l-amber-500" },
              { label: "Rejected", value: stats.rejected, icon: "cancel", color: "text-[#D32F2F]", accent: "border-l-8 border-l-[#D32F2F]" },
            ].map(card => (
              <div key={card.label} className={`bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between ${card.accent||""}`}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{card.label}</span>
                  <span className={`material-symbols-outlined ${card.color}`}>{card.icon}</span>
                </div>
                <div className="mt-4">
                  {isLoading ? <div className="h-12 w-16 bg-gray-100 rounded animate-pulse"/> : <p className="text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{card.value.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Status Filter</label>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm outline-none appearance-none bg-white cursor-pointer">
                  <option value="any">Any Status</option>
                  <option value="approved">Approved</option>
                  <option value="submitted">Submitted (Pending)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              {/* Download CSV — real implementation */}
              <button
                onClick={handleDownloadCSV}
                disabled={isExportingCSV}
                className="px-6 py-3 rounded-full border-2 border-[#1A1A1A] bg-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExportingCSV ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin"/>
                    Exporting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">download</span>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A1A1A] text-white uppercase text-xs tracking-wider">
                  {["Task Code","Asset","Location","Vendor","Supervisor","Date","AI Score","Status","Actions"].map(h=>(
                    <th key={h} className="px-6 py-4 font-extrabold border-r border-white/10 last:border-r-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm font-bold uppercase">
                {isLoading ? (
                  Array.from({length:5}).map((_,i)=>(
                    <tr key={i}><td colSpan={9} className="px-6 py-4"><div className="h-6 bg-gray-100 rounded animate-pulse"/></td></tr>
                  ))
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-black">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">description</span>
                    No reports found.
                  </td></tr>
                ) : filteredReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-black border-r border-b border-gray-100 text-[#D32F2F]">{report.report_code}</td>
                    <td className="px-6 py-4 border-r border-b border-gray-100">{report.asset_name}</td>
                    <td className="px-6 py-4 border-r border-b border-gray-100 text-gray-500">{report.asset_location}</td>
                    <td className="px-6 py-4 border-r border-b border-gray-100">{report.vendor_name}</td>
                    <td className="px-6 py-4 border-r border-b border-gray-100">{report.supervisor_name}</td>
                    <td className="px-6 py-4 border-r border-b border-gray-100 text-gray-500 normal-case">
                      {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                    </td>
                    <td className="px-6 py-4 border-r border-b border-gray-100 text-center">
                      <span className={getScoreColor(report.ai_score)}>{report.ai_score !== null ? `${report.ai_score}%` : "—"}</span>
                    </td>
                    <td className="px-6 py-4 border-r border-b border-gray-100">{getStatusBadge(report.status)}</td>
                    <td className="px-6 py-4 border-b border-gray-100">
                      <div className="flex gap-2">
                        {/* Download PDF — opens same report-preview used by vendor & supervisor */}
                        <button
                          onClick={() => handleDownloadPDF(report)}
                          className="p-1.5 rounded-lg border border-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <footer className="flex justify-between items-center bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
              <p className="text-xs font-bold text-gray-500 uppercase opacity-60">
                Showing {(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE,totalCount)} of {totalCount.toLocaleString()} reports
              </p>
              <div className="flex items-center gap-2">
                <button disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)} className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-30 cursor-pointer">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(page=>(
                  <button key={page} onClick={()=>setCurrentPage(page)} className={`w-10 h-10 rounded-lg font-bold text-xs transition-all cursor-pointer ${currentPage===page?"bg-[#D32F2F] text-white border-2 border-[#D32F2F]":"border-2 border-[#1A1A1A] hover:bg-gray-50"}`}>{page}</button>
                ))}
                <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)} className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-30 cursor-pointer">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </footer>
          )}
        </div>

        {/* Toasts */}
        <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
          {toasts.map(toast=>(
            <div key={toast.id} className="pointer-events-auto bg-[#1a1c1c] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border-2 border-[#D32F2F] animate-in fade-in slide-in-from-top-5 duration-300">
              <span className={`material-symbols-outlined text-sm ${toast.type==="success"?"text-green-400":toast.type==="error"?"text-[#D32F2F]":"text-blue-400"}`}>
                {toast.type==="success"?"check_circle":toast.type==="error"?"error":"info"}
              </span>
              <span className="font-bold text-xs uppercase tracking-wider">{toast.message}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
