"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";

interface AuditReportItem {
  id: string;
  title: string;
  asset: string;
  tech: string;
  vendorName: string;
  category: string;
  date: string;
  status: "Approved" | "Rejected";
  notes: string;
  reportId: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reports, setReports] = useState<AuditReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewTargetReport, setViewTargetReport] = useState<AuditReportItem | null>(null);

  // Statistics state
  const [stats, setStats] = useState({
    completionRate: "100%",
    rejectionRate: "0%",
    totalAudits: 0,
    approvedCount: 0,
    rejectedCount: 0
  });

  // Category breakdown distribution state
  const [categoryDist, setCategoryDist] = useState<Record<string, number>>({
    Mechanical: 0,
    Electrical: 0,
    HVAC: 0,
    Safety: 0,
    Facilities: 0
  });

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // Fetch completed reports linked to supervisor
      const { data: reportsData, error } = await supabase
        .from("pm_reports")
        .select(`
          id,
          findings,
          recommendations,
          submitted_at,
          status,
          review_notes,
          pm_tasks!inner (
            id,
            task_code,
            assigned_supervisor_id,
            assets (
              name,
              category
            ),
            vendor:profiles!pm_tasks_assigned_vendor_id_fkey (
              full_name
            )
          )
        `)
        .eq("pm_tasks.assigned_supervisor_id", user.id)
        .in("status", ["approved", "rejected"])
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Transform reports
      const list: AuditReportItem[] = (reportsData || []).map((r: any) => ({
        id: r.pm_tasks?.task_code || `TK-${r.id.substring(0,4).toUpperCase()}`,
        title: r.findings ? (r.findings.substring(0, 40) + "...") : "PM Maintenance Report",
        asset: r.pm_tasks?.assets?.name || "Equipment Asset",
        tech: r.pm_tasks?.vendor?.full_name || "Technician Partner",
        vendorName: r.pm_tasks?.vendor?.full_name || "Vendor Partner",
        category: r.pm_tasks?.assets?.category || "Mechanical",
        date: new Date(r.submitted_at).toLocaleDateString(),
        status: r.status === "approved" ? "Approved" : "Rejected",
        notes: r.review_notes || "No notes filed by reviewer.",
        reportId: r.id
      }));

      setReports(list);

      // Calculate statistics
      const total = list.length;
      const approved = list.filter(r => r.status === "Approved").length;
      const rejected = list.filter(r => r.status === "Rejected").length;
      
      const completionRate = total > 0 ? ((approved / total) * 100).toFixed(1) + "%" : "100%";
      const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) + "%" : "0%";

      setStats({
        completionRate,
        rejectionRate,
        totalAudits: total,
        approvedCount: approved,
        rejectedCount: rejected
      });

      // Calculate Category Distribution percentage
      const dist: Record<string, number> = { Mechanical: 0, Electrical: 0, HVAC: 0, Safety: 0, Facilities: 0 };
      list.forEach(r => {
        const cat = (r.category || "").toLowerCase();
        if (cat.includes("mech")) dist.Mechanical += 1;
        else if (cat.includes("elect")) dist.Electrical += 1;
        else if (cat.includes("hvac")) dist.HVAC += 1;
        else if (cat.includes("safe")) dist.Safety += 1;
        else dist.Facilities += 1;
      });

      const totalDist = (dist.Mechanical + dist.Electrical + dist.HVAC + dist.Safety + dist.Facilities) || 1;
      setCategoryDist({
        Mechanical: Math.round((dist.Mechanical / totalDist) * 100),
        Electrical: Math.round((dist.Electrical / totalDist) * 100),
        HVAC: Math.round((dist.HVAC / totalDist) * 100),
        Safety: Math.round((dist.Safety / totalDist) * 100),
        Facilities: Math.round((dist.Facilities / totalDist) * 100)
      });

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load report logs: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = (report: AuditReportItem) => {
    const element = document.createElement("a");
    const file = new Blob([
      `AUDIT REPORT - ${report.id}\n`,
      `====================================\n`,
      `Title: ${report.title}\n`,
      `Asset: ${report.asset}\n`,
      `Category: ${report.category}\n`,
      `Vendor: ${report.vendorName}\n`,
      `Technician: ${report.tech}\n`,
      `Date: ${report.date}\n`,
      `Status: ${report.status}\n`,
      `Notes: ${report.notes}\n`,
      `====================================\n`,
      `Signed off by Lead Auditor: ${currentUser?.full_name || "Lead Auditor"}\n`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Audit_Report_${report.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredReports = reports.filter((rep) => {
    const matchesSearch = 
      rep.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.asset.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = categoryFilter === "All" || rep.category.toUpperCase() === categoryFilter.toUpperCase();
    const matchesStatus = statusFilter === "All" || rep.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "S")}&background=D32F2F&color=fff&size=200`;

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      <style jsx global>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #FFFFFF; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #D32F2F; }
        * { box-shadow: none !important; }
      `}</style>

      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest font-bold">
            Industrial Precision
          </p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => router.push("/supervisor/dashboard")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
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
            onClick={() => {}}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
            <span>Reports</span>
          </button>
        </nav>

        {/* User Footer Profile */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={async () => {
              triggerToast("CLOSING SESSION...", "info");
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
              <img
                className="w-full h-full object-cover"
                alt="Supervisor Profile Portrait"
                src={avatarSrc}
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase">{currentUser?.full_name || "Supervisor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold font-bold">{currentUser?.department || "Auditor"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Auditing Reports
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            Monitor precision statistics and compliance rates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src={avatarSrc} alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-12">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Audit Passing Rate
                </span>
                <span className="material-symbols-outlined text-green-600">done_all</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-green-600 tracking-tighter">{stats.completionRate}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Total: {stats.totalAudits} Reports</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Approved
                </span>
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-black tracking-tighter">{stats.approvedCount}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Approved reports</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Rejection Frequency
                </span>
                <span className="material-symbols-outlined text-[#D32F2F]">error_outline</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-[#D32F2F] tracking-tighter">{stats.rejectionRate}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Rejected reports</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between border-l-8 border-l-[#D32F2F]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  System Compliance
                </span>
                <span className="material-symbols-outlined text-[#D32F2F]">verified_user</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-[#1A1A1A] tracking-tighter">OPTIMAL</p>
                <p className="text-[10px] text-[#D32F2F] font-bold uppercase mt-1">No major system breaches</p>
              </div>
            </div>
          </div>

          {/* Details & Statistics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Category Breakdown Progress */}
            <div className="lg:col-span-1 bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 space-y-6">
              <div>
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Distribution Category</h3>
                <p className="text-xs text-gray-500 font-medium">Audit distribution based on machine category</p>
              </div>
              
              <div className="space-y-4">
                {/* Mechanical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Mechanical</span>
                    <span>{categoryDist.Mechanical || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-[#D32F2F] h-full" style={{ width: `${categoryDist.Mechanical || 0}%` }}></div>
                  </div>
                </div>

                {/* Electrical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Electrical</span>
                    <span>{categoryDist.Electrical || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-[#1A1A1A] h-full" style={{ width: `${categoryDist.Electrical || 0}%` }}></div>
                  </div>
                </div>

                {/* HVAC */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>HVAC</span>
                    <span>{categoryDist.HVAC || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${categoryDist.HVAC || 0}%` }}></div>
                  </div>
                </div>

                {/* Safety */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Safety</span>
                    <span>{categoryDist.Safety || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-green-600 h-full" style={{ width: `${categoryDist.Safety || 0}%` }}></div>
                  </div>
                </div>

                {/* Facilities */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Facilities</span>
                    <span>{categoryDist.Facilities || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${categoryDist.Facilities || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auditor Quality Insights */}
            <div className="lg:col-span-2 bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Report Quality Analysis</h3>
                <p className="text-xs text-gray-500 font-medium">System analysis on maintenance audit performance</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-[#1A1A1A]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    <h4 className="font-bold text-xs uppercase text-gray-700">Vendor Validation Accuracy</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Digital file synchronization with field log data runs smoothly 100% without corrupt data.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-[#1A1A1A]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#D32F2F] text-sm">trending_up</span>
                    <h4 className="font-bold text-xs uppercase text-gray-700">Audit Ledger Efficiency</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Visual automation system optimally detects workflow compliance on each assignment item.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500 uppercase">Database Sync</span>
                <span className="font-black text-green-600 uppercase flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-600 inline-block animate-pulse"></span>
                  Active & Synced
                </span>
              </div>
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Audit History Ledger</h3>
                <p className="text-xs text-gray-500 font-medium">History log of all approved / rejected reports</p>
              </div>
              
              <div className="flex gap-4 items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search Reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold outline-none focus:border-[#D32F2F] bg-white text-[#1A1A1A]"
                />

                {/* Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold bg-white text-[#1A1A1A] cursor-pointer outline-none font-bold"
                >
                  <option value="All">All Categories</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Safety">Safety</option>
                  <option value="Facilities">Facilities</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold bg-white text-[#1A1A1A] cursor-pointer outline-none font-bold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A] font-bold text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Task Code</th>
                    <th className="pb-3 px-4">Title / Asset</th>
                    <th className="pb-3 px-4">Vendor</th>
                    <th className="pb-3 px-4">Audit Date</th>
                    <th className="pb-3 px-4">Audit Status</th>
                    <th className="pb-3 px-4">Reviewer Notes</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredReports.map((report) => (
                    <tr key={report.reportId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4 font-black text-[#D32F2F]">{report.id}</td>
                      <td className="py-4 px-4 font-bold">
                        <p>{report.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">{report.asset}</p>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-[#1A1A1A]">{report.vendorName}</td>
                      <td className="py-4 px-4 font-bold text-gray-500">{report.date}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          report.status === "Approved" 
                            ? "bg-green-100 text-green-700 border border-green-600/20" 
                            : "bg-red-100 text-red-700 border border-red-600/20"
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-500 leading-relaxed max-w-[200px] truncate animate-in" title={report.notes}>
                        {report.notes}
                      </td>
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/supervisor/tasks/report-preview?reportId=${report.reportId}`, "_blank")}
                            className="p-1.5 hover:bg-[#D32F2F]/10 rounded-full transition-all border border-[#1A1A1A] bg-white cursor-pointer text-[#1A1A1A] hover:text-[#D32F2F] flex items-center justify-center"
                            title="Open PDF Report"
                          >
                            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            className="p-1.5 hover:bg-[#D32F2F]/10 rounded-full transition-all border border-[#1A1A1A] bg-white cursor-pointer text-[#1A1A1A] hover:text-[#D32F2F] flex items-center justify-center"
                            title="Download Report File"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-bold uppercase text-[10px]">
                        No completed audit history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Ledger Report Details Modal */}
      {viewTargetReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewTargetReport(null)}
          ></div>
          <div className="relative bg-white border-2 border-[#1A1A1A] w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#1A1A1A] uppercase ${
                  viewTargetReport.status === "Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {viewTargetReport.status}
                </span>
                <h3 className="font-headline-lg text-xl font-extrabold mt-2 text-[#1A1A1A]">
                  {viewTargetReport.title}
                </h3>
              </div>
              <button
                onClick={() => setViewTargetReport(null)}
                className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-[#1A1A1A] rounded-xl p-4 space-y-2 text-xs font-semibold text-gray-700">
              <p>
                <strong>Task Code:</strong> {viewTargetReport.id}
              </p>
              <p>
                <strong>Machine Asset:</strong> {viewTargetReport.asset}
              </p>
              <p>
                <strong>Vendor Partner:</strong> {viewTargetReport.vendorName}
              </p>
              <p>
                <strong>Category Craft:</strong> {viewTargetReport.category}
              </p>
              <p>
                <strong>Completion Date:</strong> {viewTargetReport.date}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-headline-lg text-xs font-black uppercase tracking-wider text-gray-500 border-b pb-2">
                Audit Supervisor Notes
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-3 rounded-lg border border-dashed">
                {viewTargetReport.notes}
              </p>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => handleDownload(viewTargetReport)}
                className="flex-1 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Log File
              </button>
              <button
                onClick={() => setViewTargetReport(null)}
                className="flex-1 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] rounded-full py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <span className="material-symbols-outlined text-[#D32F2F]">
              {t.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
