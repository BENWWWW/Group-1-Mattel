"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import AssetLookupModal from "@/components/AssetLookupModal";
import { getMySignatures, saveSignature } from "@/lib/signatures";
import { type Reading, isNumeric, inRange, readingText, pickReading } from "@/lib/readings";
import { sectionOf } from "@/lib/sections";

interface ChecklistItem extends Reading {
  item_id: string;
  label: string;
  section?: string;
  checked: boolean;
  notes?: string;
  image?: string | null;
  video?: string | null;
  status?: string;
  type?: "optional" | "required";
  requireImage?: boolean;
  mediaType?: "photo" | "video" | "both";
  subtasks?: any[];
}

interface AuditLog {
  time: string;
  message: string;
}

interface Task {
  id: string;
  task_code: string;
  title: string;
  asset: string;
  category: string;
  tech: string;
  location: string;
  time: string;
  date: string;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  checklist: ChecklistItem[];
  auditLog: AuditLog[];
  supervisorNotes?: string;
  techNotes?: string;
  adminNotes?: string;
  serialNumber?: string;
  supervisor?: string;
  aiConfidenceScore?: number;
  photosUrls?: string[];
  reportId?: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function ReviewDetailPage() {
  const router = useRouter();
  const supabase = createClient();

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssetLookupOpen, setIsAssetLookupOpen] = useState(false);

  // Navigation & Review selection state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notes state
  const [notes, setNotes] = useState("");
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Signature States for Approval Modal
  const approveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [approveSigned, setApproveSigned] = useState(false);
  const [isApproveDrawing, setIsApproveDrawing] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");

  // Signature States for Rejection Modal
  const rejectCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rejectSigned, setRejectSigned] = useState(false);
  const [isRejectDrawing, setIsRejectDrawing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Stored digital signatures
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);

  // Trigger Toast Notification
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Load current user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // Load signatures
      try {
        const sigs = await getMySignatures();
        setSavedSignatures(sigs);
      } catch (sigErr) {
        console.error("Failed to load supervisor signatures:", sigErr);
      }

      // Fetch PM Tasks with reports, assets and user names
      const { data: tasksData, error: tasksError } = await supabase
        .from("pm_tasks")
        .select(`
          id,
          task_code,
          status,
          priority,
          due_date,
          scheduled_date,
          notes,
          created_at,
          assets (
            name,
            asset_code,
            category,
            location
          ),
          vendor:profiles!pm_tasks_assigned_vendor_id_fkey (
            full_name
          ),
          supervisor:profiles!pm_tasks_assigned_supervisor_id_fkey (
            full_name
          ),
          pm_templates (
            checklist_items
          ),
          pm_reports (
            id,
            checklist_results,
            findings,
            recommendations,
            photos_urls,
            ai_confidence_score,
            submitted_at,
            status,
            review_notes
          )
        `)
        .eq("assigned_supervisor_id", user.id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      const formattedTasks: Task[] = (tasksData || []).map((t: any) => {
        const sortedReports = t.pm_reports && Array.isArray(t.pm_reports)
          ? [...t.pm_reports].sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
          : [];
        const report = sortedReports.length > 0 ? sortedReports[0] : null;

        // Checklist results format check (prefer t.checklist updated by vendor)
        let checklistItems: ChecklistItem[] = [];
        const rawChecklist = (Array.isArray(t.checklist) && t.checklist.length > 0)
          ? t.checklist
          : (report && report.checklist_results
            ? (Array.isArray(report.checklist_results) ? report.checklist_results : (report.checklist_results.items || []))
            : (t.pm_templates && Array.isArray(t.pm_templates.checklist_items) ? t.pm_templates.checklist_items : []));

        checklistItems = rawChecklist.map((c: any) => ({
          item_id: c.item_id || c.id || "",
          label: c.label || c.title || c.text || c.task || "Checklist Task",
          section: c.section || undefined,
          checked: c.checked !== undefined ? c.checked : (c.status === "Pass"),
          notes: c.notes || "",
          image: c.image || null,
          video: c.video || null,
          status: c.status || (c.checked ? "Pass" : "Awaiting"),
          type: c.type && c.type !== "optional" ? "required" : "optional",
          requireImage: c.requireImage !== undefined ? c.requireImage : false,
          mediaType: c.mediaType || "photo",
          subtasks: Array.isArray(c.subtasks) ? c.subtasks : [],
          ...pickReading(c)
        }));

        // Audit Logs list
        const auditLog: AuditLog[] = [
          { time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), message: "Task initialized in scheduler." }
        ];
        if (t.scheduled_date) {
          auditLog.push({ time: t.scheduled_date, message: "Task scheduled date confirmed." });
        }
        if (report) {
          auditLog.push({
            time: new Date(report.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            message: `Report uploaded by ${t.vendor?.full_name || "vendor"}.`
          });
        }

        return {
          id: t.id,
          task_code: t.task_code,
          title: t.assets?.name || "PM Maintenance",
          asset: `${t.assets?.name || "Equipment"} (${t.assets?.asset_code || "—"})`,
          category: t.assets?.category || "Mechanical",
          tech: t.vendor?.full_name || "Unassigned",
          location: t.assets?.location || "Main Floor",
          time: new Date(t.created_at).toLocaleDateString(),
          date: t.due_date,
          status: t.status,
          priority: t.priority,
          checklist: checklistItems,
          auditLog: auditLog,
          supervisorNotes: report?.review_notes || "",
          techNotes: report?.findings || "",
          adminNotes: t.notes || "",
          serialNumber: t.assets?.asset_code || "",
          supervisor: t.supervisor?.full_name || "",
          aiConfidenceScore: report?.ai_confidence_score,
          photosUrls: report?.photos_urls || [],
          reportId: report?.id
        };
      });

      setTasks(formattedTasks);
    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load tasks: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get("taskId");
      if (urlTaskId && tasks.length > 0) {
        const match = tasks.some((t) => t.id === urlTaskId);
        if (match) {
          setSelectedTaskId(urlTaskId);
        }
      }
    }
  }, [tasks]);

  const handleLoadSavedSignature = (base64Data: string, type: "approve" | "reject") => {
    const canvas = type === "approve" ? approveCanvasRef.current : rejectCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (type === "approve") {
        setApproveSigned(true);
      } else {
        setRejectSigned(true);
      }
    };
    img.src = base64Data;
  };

  useEffect(() => {
    if (isApproveModalOpen && savedSignatures.length > 0) {
      const defaultSig = savedSignatures.find(s => s.is_default) || savedSignatures[0];
      if (defaultSig) {
        setTimeout(() => {
          handleLoadSavedSignature(defaultSig.signature_data, "approve");
        }, 100);
      }
    }
  }, [isApproveModalOpen, savedSignatures]);

  useEffect(() => {
    if (isRejectModalOpen && savedSignatures.length > 0) {
      const defaultSig = savedSignatures.find(s => s.is_default) || savedSignatures[0];
      if (defaultSig) {
        setTimeout(() => {
          handleLoadSavedSignature(defaultSig.signature_data, "reject");
        }, 100);
      }
    }
  }, [isRejectModalOpen, savedSignatures]);

  // Signature Draw Helper
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null, setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null, isDrawing: boolean, setSigned: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!isDrawing || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if ("touches" in e) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setSigned(true);
  };

  const stopDrawing = (setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>) => {
    setIsDrawing(false);
  };

  const clearSignature = (canvas: HTMLCanvasElement | null, setSigned: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  // Get active selected task data
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Approval Submission to Supabase
  const handleConfirmApproval = async () => {
    if (!approveSigned || !selectedTask) return;

    const finalSupervisorNotes = approveNotes || notes || "Approved under standard operating guidelines.";
    setLoading(true);

    try {
      // 1. Update Task status
      const { error: taskError } = await supabase
        .from("pm_tasks")
        .update({ status: "approved" })
        .eq("id", selectedTask.id);

      if (taskError) throw taskError;

      // 2. Update PM Report review details
      if (selectedTask.reportId) {
        let supervisorSig = "";
        if (approveCanvasRef.current && approveSigned) {
          supervisorSig = approveCanvasRef.current.toDataURL("image/png");

          // Auto-save signature if none exists
          if (savedSignatures.length === 0) {
            try {
              await saveSignature({
                label: `Active Signature (${new Date().toLocaleDateString()})`,
                signatureData: supervisorSig,
                isDefault: true
              });
              console.log("Automatically saved supervisor signature.");
            } catch (sigErr) {
              console.error("Failed to auto-save supervisor signature:", sigErr);
            }
          }
        }

        const { data: currentReport } = await supabase
          .from("pm_reports")
          .select("checklist_results")
          .eq("id", selectedTask.reportId)
          .single();

        let updatedChecklist: any = currentReport?.checklist_results || [];
        if (Array.isArray(updatedChecklist)) {
          updatedChecklist = {
            items: updatedChecklist,
            vendorSignature: "",
            vendorName: selectedTask.tech || "Vendor Partner",
            supervisorSignature: supervisorSig,
            supervisorName: currentUser?.full_name || "Lead Auditor"
          };
        } else {
          updatedChecklist = {
            ...updatedChecklist,
            supervisorSignature: supervisorSig,
            supervisorName: currentUser?.full_name || "Lead Auditor"
          };
        }

        const { error: reportError } = await supabase
          .from("pm_reports")
          .update({
            status: "approved",
            reviewed_by: currentUser?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: finalSupervisorNotes,
            checklist_results: updatedChecklist
          })
          .eq("id", selectedTask.reportId);

        if (reportError) throw reportError;
      }

      triggerToast(`PM Task ${selectedTask.task_code} successfully approved & signed.`, "success");
      setIsApproveModalOpen(false);
      clearSignature(approveCanvasRef.current, setApproveSigned);
      setNotes("");
      setApproveNotes("");
      setSelectedTaskId(null);
      await fetchTasks();
    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to approve task: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Rejection Submission to Supabase
  const handleConfirmRejection = async () => {
    if (!rejectSigned || !rejectReason.trim() || !selectedTask) {
      triggerToast("Rejection reason is required.", "error");
      return;
    }
    setLoading(true);

    try {
      // 1. Update Task status
      const { error: taskError } = await supabase
        .from("pm_tasks")
        .update({ status: "rejected" })
        .eq("id", selectedTask.id);

      if (taskError) throw taskError;

      // 2. Update PM Report review details
      if (selectedTask.reportId) {
        let supervisorSig = "";
        if (rejectCanvasRef.current && rejectSigned) {
          supervisorSig = rejectCanvasRef.current.toDataURL("image/png");

          // Auto-save signature if none exists
          if (savedSignatures.length === 0) {
            try {
              await saveSignature({
                label: `Active Signature (${new Date().toLocaleDateString()})`,
                signatureData: supervisorSig,
                isDefault: true
              });
              console.log("Automatically saved supervisor signature.");
            } catch (sigErr) {
              console.error("Failed to auto-save supervisor signature:", sigErr);
            }
          }
        }

        const { data: currentReport } = await supabase
          .from("pm_reports")
          .select("checklist_results")
          .eq("id", selectedTask.reportId)
          .single();

        let updatedChecklist: any = currentReport?.checklist_results || [];
        if (Array.isArray(updatedChecklist)) {
          updatedChecklist = {
            items: updatedChecklist,
            vendorSignature: "",
            vendorName: selectedTask.tech || "Vendor Partner",
            supervisorSignature: supervisorSig,
            supervisorName: currentUser?.full_name || "Lead Auditor"
          };
        } else {
          updatedChecklist = {
            ...updatedChecklist,
            supervisorSignature: supervisorSig,
            supervisorName: currentUser?.full_name || "Lead Auditor"
          };
        }

        const { error: reportError } = await supabase
          .from("pm_reports")
          .update({
            status: "rejected",
            reviewed_by: currentUser?.id,
            reviewed_at: new Date().toISOString(),
            review_notes: rejectReason,
            checklist_results: updatedChecklist
          })
          .eq("id", selectedTask.reportId);

        if (reportError) throw reportError;
      }

      triggerToast(`PM Task ${selectedTask.task_code} successfully rejected & returned to vendor.`, "error");
      setIsRejectModalOpen(false);
      clearSignature(rejectCanvasRef.current, setRejectSigned);
      setNotes("");
      setRejectReason("");
      setSelectedTaskId(null);
      await fetchTasks();
    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to reject task: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on Search, Category, Status, and Date Range
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.task_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.asset.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "All Categories" || t.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All Statuses" || t.status === statusFilter.toLowerCase();

    const matchesDate = (() => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // Calculate stats
  const belumDiReviewCount = tasks.filter(t => t.status === "submitted").length;
  const sudahDiReviewCount = tasks.filter(t => t.status === "approved" || t.status === "rejected").length;

  // Pagination bounds
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  // Sync pagination page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, startDate, endDate]);

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "S")}&background=D32F2F&color=fff&size=200`;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Loading Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-page text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* Scroll fix CSS */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #FFFFFF; }
        ::-webkit-scrollbar-thumb { background: #1A1A1A; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #D32F2F; }
        * { box-shadow: none !important; }
      `}</style>

      {/* Side Navigation Bar */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-semibold text-white leading-tight">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-medium uppercase tracking-[0.2em] mt-1">PM Verification</p>
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
            onClick={() => { setSelectedTaskId(null); }}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
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
            onClick={async () => {
              triggerToast("CLOSING SUPERVISOR SESSION...", "info");
              await supabase.auth.signOut();
              setTimeout(() => router.push("/"), 1000);
            }}
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-medium text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img className="w-full h-full object-cover" alt="Supervisor Portrait" src={avatarSrc} />
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-xs truncate text-white uppercase">{currentUser?.full_name || "Supervisor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium font-medium">{currentUser?.department || "Auditor"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Top Navigation Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] w-full lg:w-[calc(100%-220px)] border-b border-gray-200 bg-white flex justify-between items-center h-20 px-6 lg:px-10 z-40">
        <div className="flex items-center gap-4">
          {selectedTaskId !== null && (
            <button
              onClick={() => setSelectedTaskId(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 border-none bg-transparent cursor-pointer transition-all shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}

          {selectedTask ? (
            <div>
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight whitespace-nowrap">{selectedTask.task_code}</h2>
                <span className={`px-2 py-0.5 border border-gray-200 rounded-full text-[8px] sm:text-[10px] font-medium text-white uppercase tracking-wider ${selectedTask.status === "approved" ? "bg-green-600" : selectedTask.status === "rejected" ? "bg-black" : "bg-[#D32F2F]"
                  }`}>
                  {selectedTask.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-[9px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate max-w-[150px] sm:max-w-none">Reviewing: {selectedTask.asset}</p>
            </div>
          ) : (
            <div>
              <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">Tasks Review Portal</h2>
              <p className="text-[9px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide">Queue Review Supervisor</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAssetLookupOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-[20px] bg-white text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer text-[10px] font-semibold uppercase tracking-wider"
            title="Browse Asset Catalog"
          >
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            <span className="hidden sm:inline">Assets</span>
          </button>
          <NotificationBell />
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <img className="w-full h-full object-cover" src={avatarSrc} alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      {selectedTask ? (
        /* ================== DETAILED REVIEW VIEW ================== */
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto animate-in fade-in duration-300">
            <div className="grid grid-cols-12 gap-8">

              {/* Column 1: Checklist Results */}
              <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-md text-lg font-semibold border-l-[6px] border-[#D32F2F] pl-4 uppercase tracking-tighter text-[#1A1A1A]">
                    Checklist Results
                  </h3>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                    {selectedTask.checklist.filter(item => item.status === "Pass" || (item.type === "optional" && item.status === "Awaiting")).length} / {selectedTask.checklist.length} COMPLETED
                  </span>
                </div>

                {selectedTask.checklist.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl font-medium uppercase tracking-wider text-xs text-gray-400">
                    No checklist items in the report
                  </div>
                ) : (
                  selectedTask.checklist.map((item, idx) => (
                    <React.Fragment key={item.item_id || idx}>
                    {/* Section header wherever the section changes (items are stored grouped) */}
                    {(idx === 0 || sectionOf(item) !== sectionOf(selectedTask.checklist[idx - 1])) && (
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-black pb-2 border-b-2 border-[#1A1A1A] mt-2">{sectionOf(item)}</h4>
                    )}
                    <div className="bg-white rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">ITEM {idx + 1}</span>
                          <h4 className="font-headline-md text-base font-semibold text-black leading-tight">{item.label}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-[8px] font-semibold rounded uppercase tracking-wider border ${item.type === "required"
                                  ? "bg-black text-white border-gray-200"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}>
                              {item.type || "optional"}
                            </span>
                            <span className="text-[8px] font-semibold rounded uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5">
                              {item.requireImage ? "Photo Req." : "No Photo"}
                            </span>
                          </div>
                          {isNumeric(item) && (
                            <p className={`mt-2 text-sm font-semibold ${item.value != null && !inRange(item, item.value) ? "text-[#D32F2F]" : "text-black"}`}>
                              {item.value != null ? readingText(item) : "No reading recorded"}
                              {item.value != null && !inRange(item, item.value) && <span className="ml-2 text-[9px] uppercase tracking-wider">Out of spec</span>}
                            </p>
                          )}
                        </div>
                        {(() => {
                          const status = item.status || (item.checked ? "Pass" : "Awaiting");
                          let bgColor = "bg-gray-500";
                          let icon = "hourglass_empty";
                          if (status === "Pass") {
                            bgColor = "bg-green-600";
                            icon = "check";
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
                            <div className={`flex items-center gap-1 text-white px-3 py-1 border border-gray-200 rounded-full ${bgColor}`}>
                              <span className="material-symbols-outlined text-sm font-semibold" style={{ fontWeight: 900 }}>
                                {icon}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-widest">
                                {status}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {item.notes && (
                        <div className="bg-black/5 p-4 rounded-lg border border-gray-200 italic text-xs text-gray-700">
                          "{item.notes}"
                        </div>
                      )}

                      {/* Main Item Photo Evidence */}
                      {item.image && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">📷 Main Photo Evidence</span>
                          <div className="w-full h-56 border border-gray-200 rounded-lg overflow-hidden relative group">
                            <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" src={item.image} alt={`Evidence for ${item.label}`} />
                            <div className="absolute inset-0 bg-[#D32F2F]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setExpandedImage(item.image || null)} className="bg-white border border-gray-200 px-4 py-2 text-xs uppercase font-semibold cursor-pointer hover:bg-gray-100">
                                Expand
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Main Item Video Evidence */}
                      {item.video && (
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-[9px] font-semibold text-purple-700 uppercase tracking-wider">🎥 Main Video Evidence</span>
                          <div className="w-full h-56 border border-purple-900 rounded-lg overflow-hidden bg-black">
                            <video src={item.video} controls className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      {/* Subtasks Evidence Section */}
                      {item.subtasks && item.subtasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex flex-col gap-2">
                          <span className="text-[10px] font-semibold uppercase text-gray-700 tracking-wider">
                            Subtasks ({item.subtasks.filter((s: any) => s.completed || s.image || s.video).length} / {item.subtasks.length} Completed)
                          </span>
                          <div className="flex flex-col gap-2.5">
                            {item.subtasks.map((sub: any, subIdx: number) => (
                              <div key={sub.id || subIdx} className="bg-gray-50 border border-black/20 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-semibold text-black">{subIdx + 1}. {sub.text}</span>
                                  <span className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded border ${sub.completed ? "bg-green-100 text-green-800 border-green-300" : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
                                    {sub.completed ? "COMPLETED" : "PENDING"}
                                  </span>
                                </div>

                                {/* Subtask Media Evidence */}
                                {(sub.image || sub.video) && (
                                  <div className="flex flex-wrap gap-3 mt-1 pt-1">
                                    {sub.image && (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[8px] font-semibold text-gray-500 uppercase">📷 Photo</span>
                                        <div className="w-20 h-20 border border-gray-200 rounded-lg overflow-hidden">
                                          <img src={sub.image} alt={sub.text} className="w-full h-full object-cover cursor-pointer" onClick={() => setExpandedImage(sub.image)} />
                                        </div>
                                      </div>
                                    )}
                                    {sub.video && (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[8px] font-semibold text-purple-700 uppercase">🎥 Video</span>
                                        <div className="w-28 h-20 border border-purple-900 rounded-lg overflow-hidden bg-black">
                                          <video src={sub.video} controls className="w-full h-full object-cover" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    </React.Fragment>
                  ))
                )}
              </section>

              {/* Column 2: Actions */}
              <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-md text-lg font-semibold border-l-[6px] border-[#D32F2F] pl-4 uppercase tracking-tighter text-[#1A1A1A]">
                    Review Process
                  </h3>
                </div>

                <div className="bg-white rounded-xl p-6 flex flex-col gap-6 shadow-sm">
                  {selectedTask.adminNotes && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-black font-semibold uppercase">Admin Additional Notes</label>
                      <div className="rounded-xl p-4 font-body-md text-xs bg-black/5 text-gray-700 min-h-[60px] font-semibold whitespace-pre-wrap">
                        {selectedTask.adminNotes}
                      </div>
                    </div>
                  )}

                  {selectedTask.techNotes && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-black font-semibold uppercase">Vendor / Technician Notes</label>
                      <div className="rounded-xl p-4 font-body-md text-xs bg-gray-50 text-gray-700 min-h-[60px] font-semibold whitespace-pre-wrap">
                        {selectedTask.techNotes}
                      </div>
                    </div>
                  )}

                  {selectedTask.aiConfidenceScore !== undefined && (
                    <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-semibold uppercase text-amber-800">Checklist Items Passed</p>
                        <p className="text-xs text-gray-600 font-medium">Share of checklist items marked pass</p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-2xl text-amber-700">{selectedTask.aiConfidenceScore}%</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-black font-semibold uppercase">Supervisor Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl p-4 font-body-md text-xs min-h-[140px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                      placeholder={selectedTask.supervisorNotes || "Write verification notes here..."}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    {selectedTask.status === "submitted" && (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setIsRejectModalOpen(true)}
                          className="py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest bg-[#D32F2F] text-white hover:bg-black hover:border-gray-400 active:scale-95 transition-all cursor-pointer shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                          REJECT
                        </button>
                        <button
                          onClick={() => setIsApproveModalOpen(true)}
                          className="py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest bg-[#2E7D32] text-white hover:bg-black hover:border-gray-400 active:scale-95 transition-all cursor-pointer shadow-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        >
                          APPROVE
                        </button>
                      </div>
                    )}
                    {(selectedTask.status === "approved" || selectedTask.status === "rejected") && (
                      <button
                        onClick={() => window.open(`/supervisor/tasks/report-preview?taskId=${selectedTask.id}`, "_blank")}
                        className="py-4 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest bg-[#D32F2F] text-white hover:bg-black transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        OPEN / DOWNLOAD OFFICIAL PDF REPORT
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-semibold uppercase">System Audit Log</span>
                      <span className="material-symbols-outlined text-black text-base">receipt_long</span>
                    </div>
                    <ul className="space-y-4">
                      {selectedTask.auditLog.map((log, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#D32F2F] mt-1.5 flex-shrink-0" />
                          <p className="text-[11px] font-medium leading-relaxed">
                            <span className="font-semibold">{log.time}:</span> {log.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      ) : (
        /* ================== TASKS LIST VIEW ================== */
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-300">

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider">Reports Awaiting Review</span>
                  <span className="material-symbols-outlined text-gray-400">pending_actions</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-semibold text-gray-900 tracking-tighter">{belumDiReviewCount}</p>
                  <p className="text-xs text-red-600 font-medium uppercase mt-1">Requires supervisor verification</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider">Total Completed Evaluations</span>
                  <span className="material-symbols-outlined text-green-600">verified</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-semibold text-green-600 tracking-tighter">{sudahDiReviewCount}</p>
                  <p className="text-xs text-green-700 font-medium uppercase mt-1">Approved / rejected</p>
                </div>
              </div>
            </div>

            {/* Filter and Control Panel */}
            <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] shadow-sm">
              <div className="flex flex-wrap gap-4 flex-grow lg:flex-nowrap">

                {/* Search */}
                <div className="flex-1 min-w-[240px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Search Tasks</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Code, Asset, Vendor..."
                      className="w-full pl-10 pr-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none bg-white font-body-md"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    <option value="MECHANICAL">Mechanical</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="FACILITIES">Facilities</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Task Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Submitted">Submitted (Review)</option>
                    <option value="Pending">Pending</option>
                    <option value="In_Progress">In Progress</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Date Filter: Start Date */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>

                {/* Date Filter: End Date */}
                <div className="flex-1 min-w-[160px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>
              </div>
            </div>

            {/* Tasks Ledger Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {paginatedTasks.length === 0 ? (
                <div className="col-span-full py-16 text-center border border-dashed border-gray-300 rounded-[20px]">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
                  <p className="font-semibold uppercase text-gray-500 tracking-wider text-xs">No tasks match the filter</p>
                </div>
              ) : (
                paginatedTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-[20px] p-6 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-6 relative shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="border border-[#D32F2F] text-[#D32F2F] px-3 py-0.5 rounded-full text-[9px] font-semibold tracking-widest uppercase">
                          {task.category}
                        </span>
                        {task.priority && (
                          <span className="bg-[#1A1A1A]/5 text-gray-500 border border-gray-300 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider">
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <span className={`px-3 py-0.5 border border-gray-200 rounded-full text-[9px] font-semibold uppercase tracking-wider text-white ${task.status === "approved" ? "bg-green-600" : task.status === "rejected" ? "bg-black" : "bg-[#D32F2F]"
                        }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{task.task_code}</span>
                      <h4 className="font-headline-md text-xl font-semibold text-black leading-tight uppercase mt-1">{task.title}</h4>
                      <p className="text-gray-500 font-medium text-xs mt-2 uppercase tracking-wide">
                        Asset: <span className="text-black">{task.asset}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-1 font-semibold uppercase tracking-wide">
                        Vendor / Tech: <span className="text-black font-medium">{task.tech}</span> • {task.location}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                      <span className="text-[10px] text-gray-400 font-medium uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        Due: {task.date}
                      </span>
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`px-5 py-2 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer ${task.status === "submitted"
                            ? "bg-[#D32F2F] text-white hover:bg-black hover:border-gray-400"
                            : "bg-white text-black hover:bg-black/5"
                          }`}
                      >
                        {task.status === "submitted" ? "Audit Report" : "Task Details"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <footer className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[20px] shadow-none shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium text-xs uppercase transition-all cursor-pointer ${currentPage === page ? "bg-[#D32F2F] text-white border border-[#D32F2F]" : "border border-gray-200 hover:bg-gray-100 text-black"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </footer>
            )}

          </div>
        </main>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setExpandedImage(null)} />
          <div className="relative max-w-4xl max-h-[85vh] bg-white border border-gray-200 rounded-xl p-2 z-10 animate-in zoom-in-95 duration-200">
            <img className="max-w-full max-h-[80vh] rounded-lg object-contain" src={expandedImage} alt="Expanded Inspection Asset" />
            <button onClick={() => setExpandedImage(null)} className="absolute top-4 right-4 bg-white border border-gray-200 w-8 h-8 rounded-full flex items-center justify-center font-medium cursor-pointer hover:bg-gray-100">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {isApproveModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApproveModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                  verified
                </span>
              </div>
              <div>
                <h3 className="font-headline-lg text-xl font-semibold uppercase tracking-tighter">Approve PM Report?</h3>
                <p className="text-xs text-gray-500">The task will be verified and posted to the ledger log.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase text-black">Reviewer Notes (Optional)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="border border-black/10 rounded-xl p-3 font-body-md text-xs min-h-[80px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                placeholder="Add additional notes..."
              />
            </div>

            {/* Signature Area */}
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold uppercase text-black">Supervisor Signature</label>
                <button onClick={() => clearSignature(approveCanvasRef.current, setApproveSigned)} className="text-[9px] font-semibold uppercase text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent">
                  Clear Signature
                </button>
              </div>

              <div className="w-full h-32 bg-black/5 border border-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
                {!approveSigned && (
                  <span className="absolute text-gray-400 text-[10px] font-medium uppercase tracking-widest pointer-events-none">
                    Draw your signature here
                  </span>
                )}
                <canvas
                  ref={approveCanvasRef}
                  width={400}
                  height={128}
                  onMouseDown={(e) => startDrawing(e, approveCanvasRef.current, setIsApproveDrawing)}
                  onMouseMove={(e) => draw(e, approveCanvasRef.current, isApproveDrawing, setApproveSigned)}
                  onMouseUp={() => stopDrawing(setIsApproveDrawing)}
                  onMouseLeave={() => stopDrawing(setIsApproveDrawing)}
                  onTouchStart={(e) => startDrawing(e, approveCanvasRef.current, setIsApproveDrawing)}
                  onTouchMove={(e) => draw(e, approveCanvasRef.current, isApproveDrawing, setApproveSigned)}
                  onTouchEnd={() => stopDrawing(setIsApproveDrawing)}
                  className="w-full h-full cursor-crosshair relative z-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button onClick={() => setIsApproveModalOpen(false)} className="py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest bg-white text-black hover:bg-black/5 transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={!approveSigned}
                className={`py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest text-white transition-all cursor-pointer ${approveSigned ? "bg-[#D32F2F] hover:bg-black" : "bg-gray-300 opacity-50 cursor-not-allowed"
                  }`}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRejectModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-red-500/10 text-[#D32F2F] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                  warning
                </span>
              </div>
              <div>
                <h3 className="font-headline-lg text-xl font-semibold uppercase tracking-tighter">Reject PM Report?</h3>
                <p className="text-xs text-gray-500">Return the task to vendor for revision.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold uppercase text-black">Rejection Reason (Required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="border border-[#D32F2F] rounded-xl p-3 font-body-md text-xs min-h-[80px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                placeholder="Explain reason for rejection..."
                required
              />
            </div>

            {/* Signature Area */}
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold uppercase text-black">Supervisor Signature</label>
                <button onClick={() => clearSignature(rejectCanvasRef.current, setRejectSigned)} className="text-[9px] font-semibold uppercase text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent">
                  Clear Signature
                </button>
              </div>

              <div className="w-full h-32 bg-black/5 border border-gray-200 rounded-xl flex items-center justify-center relative overflow-hidden">
                {!rejectSigned && (
                  <span className="absolute text-gray-400 text-[10px] font-medium uppercase tracking-widest pointer-events-none">
                    Draw your signature here
                  </span>
                )}
                <canvas
                  ref={rejectCanvasRef}
                  width={400}
                  height={128}
                  onMouseDown={(e) => startDrawing(e, rejectCanvasRef.current, setIsRejectDrawing)}
                  onMouseMove={(e) => draw(e, rejectCanvasRef.current, isRejectDrawing, setRejectSigned)}
                  onMouseUp={() => stopDrawing(setIsRejectDrawing)}
                  onMouseLeave={() => stopDrawing(setIsRejectDrawing)}
                  onTouchStart={(e) => startDrawing(e, rejectCanvasRef.current, setIsRejectDrawing)}
                  onTouchMove={(e) => draw(e, rejectCanvasRef.current, isRejectDrawing, setRejectSigned)}
                  onTouchEnd={() => stopDrawing(setIsRejectDrawing)}
                  className="w-full h-full cursor-crosshair relative z-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button onClick={() => setIsRejectModalOpen(false)} className="py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest bg-white text-black hover:bg-black/5 transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectSigned || !rejectReason.trim()}
                className={`py-3 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest text-white transition-all cursor-pointer ${rejectSigned && rejectReason.trim() ? "bg-black hover:bg-[#D32F2F]" : "bg-gray-300 opacity-50 cursor-not-allowed"
                  }`}
              >
                Confirm Rejection
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
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${t.type === "success" ? "border-green-700" : t.type === "error" ? "border-[#D32F2F]" : "border-blue-700"
              }`}
          >
            <span className={`material-symbols-outlined ${t.type === "success" ? "text-green-600" : t.type === "error" ? "text-[#D32F2F]" : "text-blue-500"}`}>
              {t.type === "success" ? "check_circle" : t.type === "error" ? "cancel" : "info"}
            </span>
            <span className="font-semibold uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Asset Lookup Modal */}
      <AssetLookupModal isOpen={isAssetLookupOpen} onClose={() => setIsAssetLookupOpen(false)} />

    </div>
  );
}
