"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ChecklistItem {
  item_id: string;
  label: string;
  checked: boolean;
  notes?: string;
  image?: string | null;
  status?: string;
  type?: "optional" | "required" | "urgent";
  requireImage?: boolean;
}

interface ReportInfo {
  status: "approved" | "rejected" | "submitted" | "pending";
  supervisorName: string;
  supervisorNotes: string;
  techNotes: string;
  adminNotes: string;
  date: string;
  taskCode: string;
  taskTitle: string;
  assetName: string;
  assetCode: string;
  location: string;
  category: string;
  techName: string;
  aiConfidence: number | null;
  checklist: ChecklistItem[];
  vendorSignature: string;
  supervisorSignature: string;
}

function ReportPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const reportId = searchParams.get("reportId");

  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportInfo, setReportInfo] = useState<ReportInfo | null>(null);

  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  // Override body overflow so this dedicated PDF preview page can scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Trigger Toast Notification
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const fetchReportDetails = async () => {
      try {
        setLoading(true);
        // Get user session
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setCurrentUser(profile);
        }

        let targetTaskId = taskId;
        let reportData: any = null;

        if (reportId) {
          // Fetch report first
          const { data: rData, error: rError } = await supabase
            .from("pm_reports")
            .select("*")
            .eq("id", reportId)
            .single();

          if (rError) throw rError;
          reportData = rData;
          targetTaskId = rData.task_id;
        }

        if (targetTaskId) {
          // Fetch task details
          const { data: taskData, error: taskError } = await supabase
            .from("pm_tasks")
            .select(`
              *,
              assets (*),
              vendor:profiles!assigned_vendor_id (*),
              supervisor:profiles!assigned_supervisor_id (*)
            `)
            .eq("id", targetTaskId)
            .single();

          if (taskError) throw taskError;

          if (!reportData) {
            // Try fetching report if we only had taskId (get the latest report)
            const { data: rData } = await supabase
              .from("pm_reports")
              .select("*")
              .eq("task_id", targetTaskId)
              .order("submitted_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            reportData = rData;
          }

          // Parse checklist results
          let checklistItems: ChecklistItem[] = [];
          let vendorSig = "";
          let vendorName = taskData.vendor?.full_name || "Vendor Partner";
          let superSig = "";
          let superName = taskData.supervisor?.full_name || "Lead Auditor";

          if (reportData && reportData.checklist_results) {
            const cr = reportData.checklist_results;
            if (Array.isArray(cr)) {
              checklistItems = cr.map((c: any) => ({
                item_id: c.item_id || c.id || "",
                label: c.label || c.title || c.text || c.task || "Checklist Task",
                checked: c.checked !== undefined ? c.checked : (c.status === "Pass"),
                notes: c.notes || "",
                image: c.image || null,
                status: c.status || (c.checked ? "Pass" : "Awaiting"),
                type: c.type || "optional",
                requireImage: c.requireImage !== undefined ? c.requireImage : false
              }));
              vendorSig = reportData.vendor_signature || reportData.vendorSignature || "";
              superSig = reportData.supervisor_signature || reportData.supervisorSignature || "";
            } else {
              const results = cr.items || [];
              checklistItems = results.map((c: any) => ({
                item_id: c.item_id || c.id || "",
                label: c.label || c.title || c.text || c.task || "Checklist Task",
                checked: c.checked !== undefined ? c.checked : (c.status === "Pass"),
                notes: c.notes || "",
                image: c.image || null,
                status: c.status || (c.checked ? "Pass" : "Awaiting"),
                type: c.type || "optional",
                requireImage: c.requireImage !== undefined ? c.requireImage : false
              }));
              vendorSig = cr.vendorSignature || cr.vendor_signature || reportData.vendor_signature || reportData.vendorSignature || "";
              vendorName = cr.vendorName || cr.vendor_name || vendorName;
              superSig = cr.supervisorSignature || cr.supervisor_signature || reportData.supervisor_signature || reportData.supervisorSignature || "";
              superName = cr.supervisorName || cr.supervisor_name || superName;
            }
          } else if (Array.isArray(taskData.checklist)) {
            checklistItems = taskData.checklist.map((c: any) => ({
              item_id: c.id || "",
              label: c.label || c.title || c.text || c.task || "Checklist Task",
              checked: c.status === "Pass" || c.checked === true,
              notes: c.notes || "",
              image: c.image || null,
              status: c.status || (c.checked ? "Pass" : "Awaiting"),
              type: c.type || "optional",
              requireImage: c.requireImage !== undefined ? c.requireImage : false
            }));
          }

          // Format Date
          const auditDate = reportData?.reviewed_at
            ? new Date(reportData.reviewed_at)
            : reportData?.submitted_at
              ? new Date(reportData.submitted_at)
              : new Date();

          const formattedDate = auditDate.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }).toUpperCase();

          setReportInfo({
            status: (reportData?.status || taskData.status || "pending") as any,
            supervisorName: superName,
            supervisorNotes: reportData?.review_notes || "No notes filed by reviewer.",
            techNotes: reportData?.findings || taskData.description || "",
            adminNotes: taskData.notes || "",
            date: formattedDate,
            taskCode: taskData.task_code,
            taskTitle: taskData.title,
            assetName: taskData.assets?.name || "Equipment Asset",
            assetCode: taskData.assets?.asset_code || "N/A",
            location: taskData.assets?.location || "N/A",
            category: taskData.assets?.category || "Industrial",
            techName: vendorName,
            aiConfidence: reportData?.ai_confidence_score ?? null,
            checklist: checklistItems,
            vendorSignature: vendorSig,
            supervisorSignature: superSig
          });
        }
      } catch (err: any) {
        console.error("Error loading report PDF details:", err);
        triggerToast("Failed to load PDF data: " + err.message, "error");
      } finally {
        setLoading(false);
      }
    };

    if (taskId || reportId) {
      fetchReportDetails();
    } else {
      setLoading(false);
    }
  }, [taskId, reportId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[#1A1A1A] font-bold uppercase tracking-widest gap-3">
        <span className="w-5 h-5 rounded-full border-4 border-t-transparent border-[#D32F2F] animate-spin inline-block"></span>
        Loading Report Document...
      </div>
    );
  }

  if (!reportInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm font-bold text-gray-500">
        Report not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-[#1A1A1A] font-body-md flex flex-col items-center">
      <style jsx global>{`
        /* Ensure the page can scroll naturally */
        html, body {
          height: auto !important;
          min-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
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
          .content-area-main { 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            padding: 0 !important; 
            height: auto !important;
            overflow: visible !important;
          }
          .paper-card { 
            border: 2px solid #1A1A1A !important; 
            box-shadow: none !important;
            margin: 0 auto !important;
            border-radius: 0 !important;
          }
          html, body {
            background-color: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Dynamic Action Bar (no-print) */}
      <header className="no-print sticky top-0 left-0 right-0 w-full bg-[#1A1A1A] text-white py-4 px-8 flex justify-between items-center z-50 shadow-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#D32F2F] text-2xl font-bold">picture_as_pdf</span>
          <div className="text-left">
            <h1 className="font-headline-md text-sm font-extrabold tracking-widest leading-none">MAINTAIN</h1>
            <p className="text-[9px] opacity-60 uppercase font-black tracking-wider mt-1">PM VERIFICATION</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrint}
            className="bg-[#D32F2F] text-white hover:bg-[#b71c1c] transition-colors font-bold px-5 py-2 border-2 border-black rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            className="bg-white/10 hover:bg-white/20 transition-colors text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer border border-white/20"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Close Page
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content-area-main w-full max-w-[850px] px-4 md:px-0 py-8 flex flex-col items-center relative">

        {/* The PDF Page Simulation Card */}
        <div className="paper-card bg-white border-2 border-[#1A1A1A] max-w-[850px] w-full min-h-[1100px] relative overflow-hidden flex flex-col mb-10 rounded-xl shadow-none shrink-0">

          {/* Top Band */}
          <div className="bg-[#D32F2F] text-white flex justify-between items-center px-8 py-6 border-b-2 border-[#1A1A1A]">
            <span className="font-headline-md text-xl font-extrabold uppercase tracking-widest">
              MAINTAIN
            </span>
            <div className="text-right">
              <p className="text-[10px] font-label-sm opacity-90 uppercase font-bold tracking-wider">Report Document</p>
              <p className="font-headline-md text-lg font-bold tracking-tighter">REPORT ID: {reportInfo.taskCode}</p>
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
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Asset Name & Code</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">
                    {reportInfo.assetName} ({reportInfo.assetCode})
                  </p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Lead Technician</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">{reportInfo.techName}</p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Date of Inspection</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">{reportInfo.date}</p>
                </div>
                <div className="border-l-4 border-[#D32F2F] pl-4">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Asset Location & Category</p>
                  <p className="text-base font-bold text-[#1A1A1A] uppercase">
                    {reportInfo.location} • {reportInfo.category}
                  </p>
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
                <div className="border-2 border-[#1A1A1A] rounded-xl p-4 bg-gray-50 text-xs italic font-medium text-gray-700 whitespace-pre-wrap">
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
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase border-r border-white/20">Requirement & Evidence</th>
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase w-32 text-center border-r border-white/20">Status</th>
                      <th className="px-4 py-3 font-label-md text-xs font-extrabold uppercase">Field Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A] text-xs font-bold uppercase">
                    {reportInfo.checklist.map((item, idx) => (
                      <tr key={item.item_id || idx} className="hover:bg-black/5 transition-colors">
                        <td className="px-4 py-4 border-r border-[#1A1A1A] max-w-[280px]">
                          <p>{item.label}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 normal-case font-bold">
                            <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider border ${item.type === "urgent"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : item.type === "required"
                                ? "bg-black text-white border-black"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}>
                              {item.type || "optional"}
                            </span>
                            <span className="text-[8px] font-black rounded uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5">
                              {item.requireImage ? "Photo Req." : "No Photo"}
                            </span>
                          </div>
                          {item.image && (
                            <div className="mt-3 w-32 h-20 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                              <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center border-r border-[#1A1A1A]">
                          {(() => {
                            const status = item.status || (item.checked ? "Pass" : "Awaiting");
                            let bgColor = "bg-gray-500";
                            let icon = "hourglass_empty";
                            if (status === "Pass") {
                              bgColor = "bg-green-600";
                              icon = "check_circle";
                            } else if (status === "AI Processing") {
                              bgColor = "bg-amber-500";
                              icon = "psychology";
                            } else if (status === "Error") {
                              bgColor = "bg-[#D32F2F]";
                              icon = "error";
                            } else if (status === "Awaiting") {
                              bgColor = "bg-gray-500";
                              icon = "hourglass_empty";
                            }
                            return (
                              <span className={`inline-flex items-center gap-1 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border-2 border-black ${bgColor}`}>
                                <span className="material-symbols-outlined text-[10px]" style={{ fontWeight: 900 }}>
                                  {icon}
                                </span>
                                {status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 text-xs opacity-70 italic font-medium leading-relaxed max-w-[200px] break-words">
                          {item.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Result Summary */}
            <section className="space-y-4">
              <h3 className="border-b-2 border-[#1A1A1A] pb-2 font-label-md text-xs font-black text-[#1A1A1A] uppercase mb-6">
                Result
              </h3>
              <p className="text-3xl font-extrabold text-[#1A1A1A]">
                {reportInfo.aiConfidence != null ? `${reportInfo.aiConfidence}%` : "—"}
                <span className="ml-2 text-xs font-bold uppercase text-gray-500">checklist items passed</span>
              </p>
            </section>

            {/* Approval / Rejection Section */}
            <section className="relative pt-8 pb-12 border-t-2 border-[#1A1A1A] flex flex-col gap-8">

              {/* Approved/Rejected/Pending Stamp Watermark */}
              <div
                className={`absolute right-20 top-2 p-4 text-center border-8 select-none tracking-widest font-black uppercase rounded-lg ${reportInfo.status === "rejected"
                  ? "border-red-600 text-red-600 rotate-[15deg] opacity-15"
                  : reportInfo.status === "approved"
                    ? "border-green-600 text-green-600 -rotate-[15deg] opacity-15"
                    : "border-amber-500 text-amber-500 rotate-[5deg] opacity-15"
                  }`}
                style={{ fontSize: "3.5rem" }}
              >
                {reportInfo.status === "rejected"
                  ? "REJECTED"
                  : reportInfo.status === "approved"
                    ? "APPROVED"
                    : "PENDING"}
              </div>

              <div className="space-y-6">
                {reportInfo.supervisorNotes && (
                  <div className="flex flex-col max-w-2xl">
                    <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold">Supervisor Review Notes</p>
                    <p className="text-xs italic bg-black/5 p-3 rounded-lg border border-black mt-2 font-medium">
                      "{reportInfo.supervisorNotes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Dynamic Double Signatures Section */}
              <div className="grid grid-cols-2 gap-12 mt-6">
                {/* Vendor Signature */}
                <div className="flex flex-col items-center text-center p-4 border-2 border-dashed border-[#1A1A1A]/20 rounded-xl bg-gray-50/50">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold mb-4">Vendor Signature</p>
                  <div className="h-20 flex items-center justify-center mb-2">
                    {reportInfo.vendorSignature?.startsWith("data:image") ? (
                      <img
                        src={reportInfo.vendorSignature}
                        alt="Vendor Signature"
                        className="max-h-16 max-w-[180px] object-contain"
                      />
                    ) : reportInfo.vendorSignature ? (
                      <span className="font-serif italic text-lg text-[#1D4ED8] tracking-widest border-b-2 border-double border-[#1D4ED8] px-4 py-1">
                        {reportInfo.vendorSignature.replace("digital:", "")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono opacity-40 uppercase">No signature capture</span>
                    )}
                  </div>
                  <p className="text-xs font-black uppercase text-[#1A1A1A] border-t border-[#1A1A1A] pt-1 w-48">
                    {reportInfo.techName}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Authorized Operator</p>
                </div>

                {/* Supervisor Signature */}
                <div className="flex flex-col items-center text-center p-4 border-2 border-dashed border-[#1A1A1A]/20 rounded-xl bg-gray-50/50">
                  <p className="text-[10px] font-label-sm uppercase opacity-60 font-bold mb-4">Supervisor Signature</p>
                  <div className="h-20 flex items-center justify-center mb-2">
                    {reportInfo.supervisorSignature?.startsWith("data:image") ? (
                      <img
                        src={reportInfo.supervisorSignature}
                        alt="Supervisor Signature"
                        className="max-h-16 max-w-[180px] object-contain"
                      />
                    ) : reportInfo.supervisorSignature ? (
                      <span className="font-serif italic text-lg text-[#1D4ED8] tracking-widest border-b-2 border-double border-[#1D4ED8] px-4 py-1">
                        {reportInfo.supervisorSignature.replace("digital:", "")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono opacity-40 uppercase">No signature capture</span>
                    )}
                  </div>
                  <p className="text-xs font-black uppercase text-[#1A1A1A] border-t border-[#1A1A1A] pt-1 w-48">
                    {reportInfo.supervisorName}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Lead Auditor / Inspector</p>
                </div>
              </div>
            </section>
          </div>

          <footer className="bg-gray-100 py-3 text-center border-t border-[#1A1A1A] mt-auto">
            <p className="text-[9px] font-label-sm uppercase tracking-widest text-[#1A1A1A] opacity-60 italic font-black">
              Generated by Maintain
            </p>
          </footer>
        </div>

        {/* Download Button Wrapper */}
        <div className="no-print max-w-[850px] w-full shrink-0">
          <button
            onClick={handlePrint}
            className="w-full bg-[#D32F2F] text-white py-5 rounded-xl border-2 border-[#1A1A1A] font-headline-md text-base font-extrabold uppercase tracking-widest hover:bg-black hover:text-white transition-all flex items-center justify-center gap-4 cursor-pointer active:scale-[0.98] group"
          >
            <span className="material-symbols-outlined text-2xl">download</span>
            ↓ Download PDF Report ↓
          </button>
          <p className="text-center mt-6 text-[#1A1A1A] text-[10px] uppercase font-bold tracking-wider opacity-70">
            Document verified by supervisor.
          </p>
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${t.type === "success" ? "border-green-700" : t.type === "error" ? "border-primary" : "border-blue-700"
              }`}
          >
            <span
              className={`material-symbols-outlined ${t.type === "success" ? "text-green-600" : t.type === "error" ? "text-primary" : "text-blue-500"
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

export default function ReportPreviewPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white text-[#1A1A1A] font-bold uppercase tracking-widest gap-3">
        <span className="w-5 h-5 rounded-full border-4 border-t-transparent border-[#D32F2F] animate-spin inline-block"></span>
        Loading Report Print System...
      </div>
    }>
      <ReportPreviewContent />
    </Suspense>
  );
}
