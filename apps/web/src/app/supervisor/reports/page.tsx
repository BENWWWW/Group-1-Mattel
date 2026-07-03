"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
}

const COMPLETED_AUDITS: AuditReportItem[] = [
  {
    id: "TK-7832",
    title: "Conveyor Belt Lubrication",
    asset: "Conveyor B-Prime",
    tech: "Alex Rivera",
    vendorName: "SteelWork Solutions",
    category: "Mechanical",
    date: "2026-07-01",
    status: "Approved",
    notes: "All drive bearings greased. System running below nominal friction coefficients."
  },
  {
    id: "TK-7611",
    title: "Main Breaker Thermal Scan",
    asset: "Breaker Substation B",
    tech: "David Miller",
    vendorName: "Apex Electrics Ltd.",
    category: "Electrical",
    date: "2026-07-01",
    status: "Rejected",
    notes: "Hot spot detected on Phase C connector (82°C). Dispatched immediate emergency maintenance ticket."
  },
  {
    id: "TK-7422",
    title: "Fire Damper Inspection",
    asset: "Fire Damper Sector 7G",
    tech: "John Doe",
    vendorName: "SafeGuard Systems",
    category: "Safety",
    date: "2026-07-01",
    status: "Approved",
    notes: "Fusible link intact. Shutter drops properly on test release. Archived in registry."
  },
  {
    id: "TK-7301",
    title: "Cooling Tower Fan Check",
    asset: "Cooling Tower C",
    tech: "Robert Chen",
    vendorName: "HVACPro Services",
    category: "Facilities",
    date: "2026-06-30",
    status: "Approved",
    notes: "Shield re-secured and motor bearings lubricated. Vibration telemetry is within safety tolerances."
  },
  {
    id: "TK-7110",
    title: "Lighting System Audit",
    asset: "Factory Floor Lighting",
    tech: "Emma Watson",
    vendorName: "FacilitiesCare Corp.",
    category: "Facilities",
    date: "2026-06-29",
    status: "Approved",
    notes: "Illumination maps show average 520 lux. Nominal output registered."
  }
];

export default function ReportsPage() {
  const router = useRouter();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [reports, setReports] = useState<AuditReportItem[]>(COMPLETED_AUDITS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewTargetReport, setViewTargetReport] = useState<AuditReportItem | null>(null);

  // Download Action Handler
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
      `Signed off by Lead Auditor: E. Schmidt\n`
    ], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Audit_Report_${report.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filtering reports
  const filteredReports = reports.filter((rep) => {
    const matchesSearch = 
      rep.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.asset.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = categoryFilter === "All" || rep.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || rep.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
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

          {/* Active Navigation: Reports */}
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
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("userRole");
                localStorage.removeItem("lastReviewStatus");
                localStorage.removeItem("lastReviewNotes");
                localStorage.removeItem("lastReviewSupervisor");
              }
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
                alt="A professional headshot of E. Schmidt."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase">E. Schmidt</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Lead Auditor</p>
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

      </header>

      {/* Main Content */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-12">
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Audit Completion Rate
                </span>
                <span className="material-symbols-outlined text-green-600">done_all</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-green-600 tracking-tighter">96.4%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Above target threshold (95%)</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Avg Decision Time
                </span>
                <span className="material-symbols-outlined text-[#1A1A1A]">schedule</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-4xl font-extrabold text-[#1A1A1A] tracking-tighter">3.8 mins</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">94% automated core checkouts</p>
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
                <p className="font-headline-xl text-4xl font-extrabold text-[#D32F2F] tracking-tighter">5.2%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Returned for vendor rework</p>
              </div>
            </div>

            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-between border-l-8 border-l-[#D32F2F]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Current Compliance Index
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
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Category Distribution</h3>
                <p className="text-xs text-gray-500 font-medium">Breakdown of audit files by craft sector</p>
              </div>
              
              <div className="space-y-4">
                {/* Mechanical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Mechanical</span>
                    <span>32%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-[#D32F2F] h-full" style={{ width: "32%" }}></div>
                  </div>
                </div>

                {/* Electrical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Electrical</span>
                    <span>26%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-[#1A1A1A] h-full" style={{ width: "26%" }}></div>
                  </div>
                </div>

                {/* HVAC */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>HVAC</span>
                    <span>18%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: "18%" }}></div>
                  </div>
                </div>

                {/* Safety */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Safety</span>
                    <span>14%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-green-600 h-full" style={{ width: "14%" }}></div>
                  </div>
                </div>

                {/* Facilities */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Facilities</span>
                    <span>10%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 border border-[#1A1A1A]/10 overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: "10%" }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auditor Quality Insights */}
            <div className="lg:col-span-2 bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Audit Quality Insight</h3>
                <p className="text-xs text-gray-500 font-medium">AI analysis on auditor precision metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-[#1A1A1A]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    <h4 className="font-bold text-xs uppercase text-gray-700">Auto-Calibration Match</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Auditor decisions match Core Vision Core AI classification with a 98.9% reliability score, minimizing audit slippage.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-[#1A1A1A]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#D32F2F] text-sm">trending_up</span>
                    <h4 className="font-bold text-xs uppercase text-gray-700">Workload Efficiency</h4>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Audits are processed 14% faster since signature-modal protocols were introduced, preserving quality checks.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500 uppercase">System Sync</span>
                <span className="font-black text-green-600 uppercase flex items-center gap-1">
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
                <h3 className="font-headline-lg text-lg font-extrabold uppercase tracking-tight">Auditor Log Ledger</h3>
                <p className="text-xs text-gray-500 font-medium">Historically signed audit reports in current shift</p>
              </div>
              
              <div className="flex gap-4 items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Filter log..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold outline-none focus:border-[#D32F2F] bg-white text-[#1A1A1A]"
                />

                {/* Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold bg-white text-[#1A1A1A] cursor-pointer outline-none"
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
                  className="px-4 py-2 border-2 border-[#1A1A1A] rounded-xl text-xs font-bold bg-white text-[#1A1A1A] cursor-pointer outline-none"
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
                    <th className="pb-3 pr-4">Task ID</th>
                    <th className="pb-3 px-4">Title / Asset</th>
                    <th className="pb-3 px-4">Technician</th>
                    <th className="pb-3 px-4">Vendor</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Audit Status</th>
                    <th className="pb-3 px-4">Supervisor Audit Notes</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4 font-black text-[#D32F2F]">{report.id}</td>
                      <td className="py-4 px-4 font-bold">
                        <p>{report.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-medium">{report.asset}</p>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-600">{report.tech}</td>
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
                      <td className="py-4 px-4 font-medium text-gray-500 leading-relaxed max-w-[200px] truncate" title={report.notes}>
                        {report.notes}
                      </td>
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewTargetReport(report)}
                            className="p-1.5 hover:bg-[#D32F2F]/10 rounded-full transition-all border border-[#1A1A1A] bg-white cursor-pointer text-[#1A1A1A] hover:text-[#D32F2F] flex items-center justify-center"
                            title="View Audit Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            className="p-1.5 hover:bg-[#D32F2F]/10 rounded-full transition-all border border-[#1A1A1A] bg-white cursor-pointer text-[#1A1A1A] hover:text-[#D32F2F] flex items-center justify-center"
                            title="Download Audit File"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 font-bold uppercase text-[10px]">
                        No completed audits match filters
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

            <div className="bg-gray-50 border-2 border-[#1A1A1A] rounded-xl p-4 space-y-2 text-xs">
              <p>
                <strong>Task ID:</strong> {viewTargetReport.id}
              </p>
              <p>
                <strong>Asset Location:</strong> {viewTargetReport.asset}
              </p>
              <p>
                <strong>Vendor Partner:</strong> {viewTargetReport.vendorName}
              </p>
              <p>
                <strong>Assigned Tech:</strong> {viewTargetReport.tech}
              </p>
              <p>
                <strong>Category Sector:</strong> {viewTargetReport.category}
              </p>
              <p>
                <strong>Completed Date:</strong> {viewTargetReport.date}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-headline-lg text-xs font-black uppercase tracking-wider text-gray-500 border-b pb-2">
                Supervisor Audit Notes
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-3 rounded-lg border border-dashed">
                {viewTargetReport.notes || "No supervisor audit notes filed."}
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
    </div>
  );
}
