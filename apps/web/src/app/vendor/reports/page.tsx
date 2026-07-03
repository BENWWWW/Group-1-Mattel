"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VendorReport {
  id: string;
  title: string;
  asset: string;
  category: string;
  date: string;
  status: "Approved" | "Rejected" | "Pending Review";
  auditedBy: string;
  score: number;
  notes: string;
  techs: string[];
}

const INITIAL_REPORTS: VendorReport[] = [
  {
    id: "RP-88219",
    title: "HVAC Chiller Unit A-1 Weekly Check",
    asset: "HVAC Chiller Unit A-1",
    category: "Facilities",
    date: "2026-07-01",
    status: "Approved",
    auditedBy: "Supervisor Schmidt",
    score: 92,
    notes: "Freon pressure is nominal. Belt tension alignment verified. Electrical contacts cleaned.",
    techs: ["J. Doe", "M. Kovalski"]
  },
  {
    id: "RP-88104",
    title: "Main Power Generator Calibration",
    asset: "Main Power Generator",
    category: "Electrical",
    date: "2026-07-01",
    status: "Rejected",
    auditedBy: "Lead Auditor Rivera",
    score: 48,
    notes: "Severe thermal hotspot detected on primary starter solenoid. Emergency override engaged.",
    techs: ["J. Doe"]
  },
  {
    id: "RP-88241",
    title: "Water Chiller Loop 2 Refit",
    asset: "Water Chiller Loop 2",
    category: "Facilities",
    date: "2026-07-01",
    status: "Pending Review",
    auditedBy: "Pending Assignment",
    score: 85,
    notes: "Submitted checklist awaiting supervisor verification.",
    techs: ["J. Doe", "S. Vance"]
  },
  {
    id: "RP-87942",
    title: "Conveyor Belt System B Overhaul",
    asset: "Conveyor Belt System B",
    category: "Mechanical",
    date: "2026-06-28",
    status: "Approved",
    auditedBy: "Supervisor Schmidt",
    score: 98,
    notes: "New drive roller installed. Bearings packed with high-temperature grease. Speed tests nominal.",
    techs: ["J. Doe", "F. Carter"]
  },
  {
    id: "RP-87551",
    title: "Pneumatic Press #4 Calibration",
    asset: "Pneumatic Press #4",
    category: "Mechanical",
    date: "2026-06-25",
    status: "Approved",
    auditedBy: "Lead Auditor Rivera",
    score: 89,
    notes: "Regulator seal replaced. Air cylinder stroke verified. Safety cage sensors adjusted.",
    techs: ["J. Doe"]
  },
  {
    id: "RP-87309",
    title: "Hydraulic Pump Station 2 Valve Test",
    asset: "Hydraulic Pump Station 2",
    category: "Mechanical",
    date: "2026-06-22",
    status: "Rejected",
    auditedBy: "Supervisor Schmidt",
    score: 35,
    notes: "Low fluid warning active. Seal leakage observed on auxiliary pump coupling.",
    techs: ["A. Rivera"]
  }
];

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function VendorReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<VendorReport[]>(INITIAL_REPORTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReport, setSelectedReport] = useState<VendorReport | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Trigger Toast Notification helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Filter logic
  const filteredReports = reports.filter((rep) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      rep.id.toLowerCase().includes(query) ||
      rep.title.toLowerCase().includes(query) ||
      rep.asset.toLowerCase().includes(query) ||
      rep.auditedBy.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === "All" || rep.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || rep.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate statistics
  const totalCount = reports.length;
  const approvedCount = reports.filter((r) => r.status === "Approved").length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;
  const pendingCount = reports.filter((r) => r.status === "Pending Review").length;

  // Calculate average compliance score of reviewed items
  const reviewedItems = reports.filter((r) => r.status !== "Pending Review");
  const averageScore = reviewedItems.length > 0 
    ? Math.round(reviewedItems.reduce((acc, curr) => acc + curr.score, 0) / reviewedItems.length)
    : 0;

  // Handle Download File Blob Action
  const handleDownload = (report: VendorReport) => {
    if (report.status === "Pending Review") {
      triggerToast("Report is pending review and cannot be downloaded.", "error");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([
      `VENDOR MAINTENANCE REPORT - ${report.id}\n`,
      `====================================\n`,
      `Title: ${report.title}\n`,
      `Asset Name: ${report.asset}\n`,
      `Category: ${report.category}\n`,
      `Technicians: ${report.techs.join(", ")}\n`,
      `Completed Date: ${report.date}\n`,
      `Verification Score: ${report.score}%\n`,
      `Audit Status: ${report.status}\n`,
      `Audited By: ${report.auditedBy}\n`,
      `====================================\n`,
      `Audit Notes:\n${report.notes}\n`,
      `====================================\n`,
      `Signed off by Lead Technician: J. Doe\n`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Vendor_Report_${report.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerToast("Report log file downloaded.", "success");
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      <style jsx global>{`
        * {
          box-shadow: none !important;
        }
      `}</style>

      {/* Fixed Sidebar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] font-bold tracking-widest text-[#D32F2F] uppercase">
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

          {/* Active Navigation: Reports */}
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

        {/* Profile Info Footer Widget */}
        <div className="px-4 mt-auto border-t border-white/20 pt-4 pb-2">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("userRole");
              }
              router.push("/");
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
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkcXzppBB6fuF01AvoMkYO_AOqmpkcq3D2Vlss7eZ_ZAD8O3zoshCALMS0lGvJ0suvCu7yCme9VBwgGW0_5gWcKdEhZpezn9UL5gM3Q6sFoD1w1AtYSkaBEsK9LvfsRGytarIgnQDyvH4RSrhJ4Uk8QzCn2YYVKs1xbRHYlntioLqTlBA03RqqQrOvg3RDTFG_jhPxbfLxjGwtWXlawO997mjbvuWuGMta8W2b_9-wqNJlv8AsFrQwXO_F27qzdnPfDeWPGD1IuyKP"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">Apex Services</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Vendor ID: #7721</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Top Header Navbar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
        <div className="flex-1 flex items-center gap-6">
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight whitespace-nowrap">
            Vendor Task Reports
          </h2>
          <div className="relative w-full max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-[#1A1A1A] rounded-[20px] py-2 pl-12 pr-4 focus:ring-2 focus:ring-[#D32F2F] focus:border-[#D32F2F] focus:outline-none transition-all placeholder:text-[#1A1A1A]/40 font-body-md"
              placeholder="Search by ID, title, asset, or auditor..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer animate-in fade-in"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="min-h-[calc(100vh-80px)] py-8 px-10 max-w-7xl mx-auto space-y-8">
          
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Total Reports
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">{totalCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Approved Audits
              </p>
              <div className="text-[44px] font-extrabold text-green-600 leading-none">{approvedCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Rejected Audits
              </p>
              <div className="text-[44px] font-extrabold text-[#D32F2F] leading-none">{rejectedCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Pending Review
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">{pendingCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center border-l-4 border-l-[#D32F2F]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Avg Score
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">{averageScore}%</div>
            </div>
          </div>

          {/* Filters & Actions Panel */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-gray-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-[#D32F2F] cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Mechanical">Mechanical</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-gray-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-[#D32F2F] cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending Review">Pending Review</option>
                </select>
              </div>
            </div>

            <div className="text-xs font-bold text-gray-500 uppercase">
              Showing {filteredReports.length} of {totalCount} records
            </div>
          </div>

          {/* Reports Table Data Grid */}
          <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A1A1A] text-white uppercase text-[10px] tracking-wider border-b-2 border-[#1A1A1A]">
                    <th className="py-4 px-6 font-extrabold">Report ID</th>
                    <th className="py-4 px-6 font-extrabold">Task / Title</th>
                    <th className="py-4 px-6 font-extrabold">Asset</th>
                    <th className="py-4 px-6 font-extrabold">Category</th>
                    <th className="py-4 px-6 font-extrabold">Completed Date</th>
                    <th className="py-4 px-6 font-extrabold">Audited By</th>
                    <th className="py-4 px-6 font-extrabold">Status</th>
                    <th className="py-4 px-6 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/10 text-xs">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-gray-400 uppercase font-bold">
                        <span className="material-symbols-outlined text-4xl block mb-2">folder_open</span>
                        No reports matching filters found.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-black text-black">{report.id}</td>
                        <td className="py-4 px-6 font-bold text-[#1A1A1A] max-w-[200px] truncate">
                          {report.title}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-600">{report.asset}</td>
                        <td className="py-4 px-6">
                          <span className="border border-black px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">
                            {report.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold text-gray-600">{report.date}</td>
                        <td className="py-4 px-6 font-semibold text-gray-700">{report.auditedBy}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                            report.status === "Approved"
                              ? "bg-white text-[#1A1A1A]"
                              : report.status === "Pending Review"
                              ? "bg-black text-white"
                              : "bg-[#D32F2F] text-white"
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                if (report.status === "Pending Review") {
                                  triggerToast("Details not finalized. Pending supervisor audit.", "info");
                                } else {
                                  setSelectedReport(report);
                                }
                              }}
                              className={`p-2 border-2 border-black rounded-lg transition-all cursor-pointer ${
                                report.status === "Pending Review"
                                  ? "opacity-40 cursor-not-allowed hover:bg-transparent"
                                  : "hover:bg-black hover:text-white"
                              }`}
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-sm block">visibility</span>
                            </button>
                            <button
                              onClick={() => handleDownload(report)}
                              className={`p-2 border-2 border-black rounded-lg transition-all cursor-pointer ${
                                report.status === "Pending Review"
                                  ? "opacity-40 cursor-not-allowed hover:bg-transparent"
                                  : "hover:bg-[#D32F2F] hover:text-white hover:border-[#D32F2F]"
                              }`}
                              title="Download Report"
                            >
                              <span className="material-symbols-outlined text-sm block">download</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-250">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          ></div>
          <div className="relative bg-white w-full max-w-lg p-8 rounded-[20px] border-2 border-[#1A1A1A] z-10 mx-4 flex flex-col gap-6 animate-in slide-in-from-bottom-6 duration-300">
            <header className="flex justify-between items-center pb-4 border-b-2 border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{selectedReport.id}</span>
                <h3 className="font-headline-md text-xl font-extrabold uppercase text-black leading-tight mt-1">
                  Report Detail
                </h3>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#D32F2F] hover:text-white hover:border-[#D32F2F] transition-all cursor-pointer bg-transparent"
              >
                <span className="material-symbols-outlined text-sm font-black">close</span>
              </button>
            </header>

            <div className="space-y-4 text-xs font-body-md overflow-y-auto max-h-[400px] pr-2">
              <div className="bg-gray-50 border-2 border-[#1A1A1A] rounded-xl p-4 space-y-2">
                <p className="uppercase font-bold tracking-wider text-gray-500 text-[9px]">Asset Information</p>
                <h4 className="font-extrabold text-black text-sm uppercase">{selectedReport.title}</h4>
                <p className="text-gray-600 font-semibold mt-1">Name: <span className="text-black font-extrabold">{selectedReport.asset}</span></p>
                <p className="text-gray-600 font-semibold">Category: <span className="text-black font-extrabold">{selectedReport.category}</span></p>
              </div>

              <div className="border border-gray-100 p-4 rounded-xl space-y-2">
                <p className="uppercase font-bold tracking-wider text-gray-400 text-[9px]">Audit Overview</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-600">Verification Status:</span>
                  <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedReport.status === "Approved" ? "bg-green-600 text-white border-green-600" : "bg-[#D32F2F] text-white border-[#D32F2F]"
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-600">Compliance Score:</span>
                  <span className="font-black text-black">{selectedReport.score}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-600">Audited By:</span>
                  <span className="font-black text-[#1A1A1A]">{selectedReport.auditedBy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-600">Technicians:</span>
                  <span className="font-bold text-gray-700">{selectedReport.techs.join(", ")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-600">Date Logged:</span>
                  <span className="font-bold text-gray-700">{selectedReport.date}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="uppercase font-bold tracking-wider text-gray-400 text-[9px]">Supervisor Audit Remarks</p>
                <p className="bg-gray-50 border border-gray-200 rounded-lg p-3 italic text-gray-600 font-semibold">
                  &ldquo;{selectedReport.notes}&rdquo;
                </p>
              </div>
            </div>

            <footer className="border-t border-gray-100 pt-4 flex gap-4 mt-2">
              <button 
                onClick={() => handleDownload(selectedReport)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#D32F2F] hover:bg-black text-white py-3 border-none rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-black">download</span>
                Download Log
              </button>
              <button 
                onClick={() => setSelectedReport(null)}
                className="flex-1 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer bg-white text-black"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              t.type === "success" ? "border-green-700" : "border-[#D32F2F]"
            }`}
          >
            <span className={`material-symbols-outlined ${t.type === "success" ? "text-green-600" : "text-[#D32F2F]"}`}>
              {t.type === "success" ? "check_circle" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
