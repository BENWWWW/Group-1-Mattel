"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ReportData {
  status: "Approved" | "Rejected" | "Pending";
  supervisor: string;
  notes: string;
  techNotes: string;
  date: string;
  hash: string;
}

export default function ReportPreviewPage() {
  const router = useRouter();
  const [reportInfo, setReportInfo] = useState<ReportData>({
    status: "Approved",
    supervisor: "Karl Heinz-Berger",
    notes: "",
    techNotes: "",
    date: "25 OCT 2023",
    hash: "SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  });
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Trigger Toast Notification
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Pull signed/rejection state if stored from previous screen interaction
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStatus = localStorage.getItem("lastReviewStatus");
      const savedNotes = localStorage.getItem("lastReviewNotes") || "";
      const savedSupervisor = localStorage.getItem("lastReviewSupervisor") || "Karl Heinz-Berger";
      const savedTechNotes = localStorage.getItem("lastReviewTechNotes") || "";
      
      if (savedStatus) {
        // Generate dynamic hash simulation
        const randomHash = "SHA-256: " + Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join("");

        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }).toUpperCase();

        setReportInfo({
          status: savedStatus as "Approved" | "Rejected" | "Pending",
          supervisor: savedSupervisor,
          notes: savedNotes,
          techNotes: savedTechNotes,
          date: formattedDate,
          hash: randomHash,
        });
      }
    }
  }, []);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
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
        
        /* Print Styles */
        @media print {
          .no-print { 
            display: none !important; 
          }
          .print-only { 
            display: block !important; 
          }
          .sidebar-nav { 
            display: none !important; 
          }
          .content-area-main { 
            margin-left: 0 !important; 
            width: 100% !important; 
            padding: 0 !important; 
            height: auto !important;
            overflow: visible !important;
          }
          .paper-card { 
            border: 2px solid #1A1A1A !important; 
            box-shadow: none !important;
            margin: 0 auto !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Side Navigation Bar */}
      <aside className="no-print sidebar-nav fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
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
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
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
        {/* User Profile Widget */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={() => {
              triggerToast("CLOSING SUPERVISOR SESSION...", "info");
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

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-[#D32F2F] rounded-full overflow-hidden shrink-0">
              <img
                className="w-full h-full object-cover"
                alt="A professional headshot of E. Schmidt."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
              />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs truncate text-white uppercase">E. Schmidt</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Lead Auditor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="content-area-main pt-24 pb-12 ml-[220px] px-10 flex flex-col items-center h-screen overflow-y-auto bg-white scroll-container w-[calc(100%-220px)]">
        
        {/* The PDF Page Simulation Card */}
        <div className="paper-card bg-white border-2 border-[#1A1A1A] max-w-[850px] w-full min-h-[1100px] relative overflow-hidden flex flex-col mb-10 rounded-xl shadow-none shrink-0">
          
          {/* Top Band */}
          <div className="bg-[#D32F2F] text-white flex justify-between items-center px-8 py-6 border-b-2 border-[#1A1A1A]">
            <span className="font-headline-md text-xl font-extrabold uppercase tracking-widest">
              MAINTAIN.AI
            </span>
            <div className="text-right">
              <p className="text-[10px] font-label-sm opacity-90 uppercase font-bold tracking-wider">Report Document</p>
              <p className="font-headline-md text-lg font-bold tracking-tighter">REPORT ID: AI-294-XJ</p>
            </div>
          </div>

          <div className="p-12 space-y-10">
            
            {/* PM Information Section */}
            <section className="space-y-4">
              <h3 className="border-b-2 border-[#1A1A1A] pb-2 font-label-md text-xs font-black text-[#1A1A1A] uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">info</span>
                Preventative Maintenance Information
              </h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Asset Name / ID</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">Turbine Assembly Gen-IV (T-800)</p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Lead Technician</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">Marcus Vance (ID: 8829)</p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Date of Inspection</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">October 24, 2023</p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Maintenance Duration</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">04h 22m 15s</p>
                </div>
              </div>
            </section>

            {/* General Technician Notes Section */}
            {reportInfo.techNotes && (
              <section className="space-y-4">
                <h3 className="border-b-2 border-[#1A1A1A] pb-2 font-label-md text-xs font-black text-[#1A1A1A] uppercase mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">edit_note</span>
                  General Technician Notes
                </h3>
                <div className="border-2 border-[#1A1A1A] rounded-xl p-4 bg-gray-50 text-xs italic font-medium text-gray-700">
                  "{reportInfo.techNotes}"
                </div>
              </section>
            )}

            {/* Checklist Results Section */}
            <section className="space-y-4">
              <h3 className="border-b-2 border-[#1A1A1A] pb-2 font-label-md text-xs font-black text-[#1A1A1A] uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">fact_check</span>
                Detailed Checklist Results
              </h3>
              <div className="border-2 border-[#1A1A1A] overflow-hidden rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase border-r border-white/20">Requirement</th>
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase w-32 text-center border-r border-white/20">Status</th>
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase">Field Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A] text-xs font-bold uppercase">
                    <tr className="hover:bg-black/5 transition-colors">
                      <td className="px-4 py-4 border-r border-[#1A1A1A]">Hydraulic Pressure Calibration</td>
                      <td className="px-4 py-4 text-center border-r border-[#1A1A1A]">
                        <span className="inline-flex items-center gap-1 bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border-2 border-black">
                          <span className="material-symbols-outlined text-[10px]" style={{ fontWeight: 900 }}>check_circle</span> PASS
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs opacity-70 italic font-medium">Optimal operating range maintained.</td>
                    </tr>
                    <tr className="hover:bg-black/5 transition-colors">
                      <td className="px-4 py-4 border-r border-[#1A1A1A]">Lubrication Viscosity Test</td>
                      <td className="px-4 py-4 text-center border-r border-[#1A1A1A]">
                        <span className="inline-flex items-center gap-1 bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border-2 border-black">
                          <span className="material-symbols-outlined text-[10px]" style={{ fontWeight: 900 }}>check_circle</span> PASS
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs opacity-70 italic font-medium">Sample clean, no metallic debris found.</td>
                    </tr>
                    <tr className="hover:bg-black/5 transition-colors">
                      <td className="px-4 py-4 border-r border-[#1A1A1A]">Emergency Cut-off Verification</td>
                      <td className="px-4 py-4 text-center border-r border-[#1A1A1A]">
                        <span className="inline-flex items-center gap-1 bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border-2 border-black">
                          <span className="material-symbols-outlined text-[10px]" style={{ fontWeight: 900 }}>check_circle</span> PASS
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs opacity-70 italic font-medium">Response time &lt; 0.5s. All clear.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* AI Verification Section */}
            <section className="space-y-4">
              <h3 className="border-b-2 border-[#1A1A1A] pb-2 font-label-md text-xs font-black text-[#1A1A1A] uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">psychology</span>
                AI Verification Matrix
              </h3>
              <div className="grid grid-cols-5 gap-8">
                <div className="col-span-2 flex flex-col items-center justify-center p-6 bg-white border-2 border-[#1A1A1A] rounded-xl">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="64" cy="64" fill="transparent" r="58" stroke="#F5F5F5" strokeWidth="12"></circle>
                      <circle
                        cx="64"
                        cy="64"
                        fill="transparent"
                        r="58"
                        stroke="#D32F2F"
                        strokeDasharray="364.4"
                        strokeDashoffset="36.4"
                        strokeWidth="12"
                        strokeLinecap="round"
                      ></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-extrabold text-[#1A1A1A]">90%</span>
                      <span className="text-[9px] font-black uppercase text-[#1A1A1A] tracking-wider">SCORE</span>
                    </div>
                  </div>
                  <p className="mt-4 font-label-sm text-xs font-bold uppercase text-center opacity-60">Confidence Rating</p>
                </div>
                <div className="col-span-3 grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                  <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#1A1A1A] rounded-xl hover:border-[#D32F2F] transition-all">
                    <span className="material-symbols-outlined text-[#D32F2F]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      shield_with_heart
                    </span>
                    <span className="tracking-wide">Safety Seals</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#1A1A1A] rounded-xl hover:border-[#D32F2F] transition-all">
                    <span className="material-symbols-outlined text-[#D32F2F]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      qr_code_2
                    </span>
                    <span className="tracking-wide">Part Serial</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#1A1A1A] rounded-xl hover:border-[#D32F2F] transition-all">
                    <span className="material-symbols-outlined text-[#D32F2F]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      view_in_ar
                    </span>
                    <span className="tracking-wide">Work Zone</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#1A1A1A] rounded-xl hover:border-[#D32F2F] transition-all">
                    <span className="material-symbols-outlined text-[#D32F2F]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      sync
                    </span>
                    <span className="tracking-wide">PPE Sync</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Approval / Rejection Section */}
            <section className="relative pt-8 pb-12 border-t-2 border-[#1A1A1A] flex justify-between items-end">
              
              {/* Approved/Rejected Stamp Watermark */}
              <div
                className={`absolute right-20 top-2 p-4 text-center border-8 select-none tracking-widest font-black uppercase rounded-lg ${
                  reportInfo.status === "Rejected"
                    ? "border-red-600 text-red-600 rotate-[15deg] opacity-15"
                    : "border-green-600 text-green-600 -rotate-[15deg] opacity-15"
                }`}
                style={{ fontSize: "3.5rem" }}
              >
                {reportInfo.status === "Rejected" ? "REJECTED" : "APPROVED"}
              </div>

              <div className="space-y-6">
                <div className="flex flex-col">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Supervisor Name</p>
                  <p className="text-base font-extrabold border-b-2 border-[#1A1A1A] w-64 mt-2 py-1 uppercase">
                    {reportInfo.supervisor}
                  </p>
                </div>
                {reportInfo.notes && (
                  <div className="flex flex-col max-w-sm">
                    <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Supervisor Notes</p>
                    <p className="text-xs italic bg-black/5 p-3 rounded-lg border border-black mt-2 font-medium">
                      "{reportInfo.notes}"
                    </p>
                  </div>
                )}
                <div className="flex flex-col">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Digital Signature Hash</p>
                  <p className="font-mono text-[9px] opacity-60 mt-1 uppercase truncate w-80">
                    {reportInfo.hash}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Final Review Date</p>
                  <p className="text-base font-black mt-2 uppercase">{reportInfo.date}</p>
                </div>
                <div
                  className={`mt-4 inline-block transform -rotate-12 border-4 px-6 py-2 rounded-xl font-black text-xl uppercase tracking-tighter ${
                    reportInfo.status === "Rejected"
                      ? "border-black text-black bg-black/5"
                      : "border-[#D32F2F] text-[#D32F2F]"
                  }`}
                >
                  {reportInfo.status === "Rejected" ? "REJECTED" : "APPROVED"}
                </div>
              </div>
            </section>
          </div>

          <footer className="bg-gray-100 py-3 text-center border-t border-[#1A1A1A] mt-auto">
            <p className="text-[9px] font-label-sm uppercase tracking-widest text-[#1A1A1A] opacity-60 italic font-black">
              Generated by Maintain.AI Neural Diagnostic Engine v2.4.11
            </p>
          </footer>
        </div>

        {/* Download Button Wrapper */}
        <div className="no-print max-w-[850px] w-full shrink-0">
          <button
            onClick={handlePrint}
            className="w-full bg-[#D32F2F] text-white py-5 rounded-xl border-2 border-[#1A1A1A] font-headline-md text-base font-extrabold uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-4 cursor-pointer active:scale-[0.98] group"
          >
            <span className="material-symbols-outlined text-2xl group-hover:animate-bounce">download</span>
            ↓ Download PDF Report ↓
          </button>
          <p className="text-center mt-6 text-[#1A1A1A] text-[10px] uppercase font-bold tracking-wider opacity-70">
            Document verified with industrial grade blockchain timestamping.
          </p>
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              t.type === "success" ? "border-green-700" : t.type === "error" ? "border-primary" : "border-blue-700"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                t.type === "success" ? "text-green-600" : t.type === "error" ? "text-primary" : "text-blue-500"
              }`}
            >
              {t.type === "success" ? "check_circle" : t.type === "error" ? "cancel" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
