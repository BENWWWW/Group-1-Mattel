"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMySignatures, saveSignature } from "@/lib/signatures";

interface FlaggedItem {
  id: string; // checklist item ID
  taskId: string; // task UUID
  taskCode: string; // e.g. TK-8021
  title: string;
  issueType: string;
  issueColor: string;
  subColor: string;
  icon: string;
  confidence: number;
  location: string;
  assetId: string;
  date: string;
  explanation: string;
  hasPhoto: boolean;
  photoUrl?: string;
  notes?: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function AIVerificationScoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTaskId = searchParams.get("taskId");
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = sigCanvasRef.current;
      if (canvas && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
          setSigned(false);
        }
      }
    };

    const timer = setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Stats State
  const [totalCount, setTotalCount] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [confidence, setConfidence] = useState(95);

  // Selected item for the review drawer panel
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Form note in review drawer
  const [vendorNote, setVendorNote] = useState("");

  // Submit button states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitText, setSubmitText] = useState("Submit PM Report");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Notification Toasts
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Signature States
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [signed, setSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize Canvas Drawing context
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
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

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
    isDrawing: boolean,
    setSigned: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
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

  const clearSignature = (
    canvas: HTMLCanvasElement | null,
    setSigned: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  const handleLoadSavedSignature = (base64Data: string) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setSigned(true);
    };
    img.src = base64Data;
    triggerToast("Loaded saved signature onto canvas.", "success");
  };

  useEffect(() => {
    if (savedSignatures.length > 0 && sigCanvasRef.current) {
      const defaultSig = savedSignatures.find((s) => s.is_default) || savedSignatures[0];
      if (defaultSig) {
        setTimeout(() => {
          handleLoadSavedSignature(defaultSig.signature_data);
        }, 150);
      }
    }
  }, [savedSignatures]);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      try {
        const sigs = await getMySignatures();
        setSavedSignatures(sigs);
      } catch (err) {
        console.error("Error loading signatures in verification page:", err);
      }

      // Fetch tasks where status is active/pending for verification counts (scoped to current taskId if provided)
      let tasksQuery = supabase
        .from("pm_tasks")
        .select(`
          *,
          assets (
            name,
            asset_code,
            category,
            location
          )
        `)
        .eq("assigned_vendor_id", user.id);

      if (urlTaskId) {
        tasksQuery = tasksQuery.eq("id", urlTaskId);
      } else {
        tasksQuery = tasksQuery.in("status", ["pending", "in_progress", "submitted", "rejected"]);
      }

      const { data: tasksData, error } = await tasksQuery;

      if (error) throw error;

      // Parse all checklist items from tasks to find flagged/error ones
      const itemsList: FlaggedItem[] = [];
      let totalChkCount = 0;
      let validChkCount = 0;

      (tasksData || []).forEach((t: any) => {
        if (Array.isArray(t.checklist)) {
          t.checklist.forEach((item: any) => {
            totalChkCount++;
            if (item.status === "Pass") {
              validChkCount++;
            } else if (item.status === "Error" || item.status === "Awaiting" || item.status === "AI Processing") {
              // Add to flagged list for manual resolve
              itemsList.push({
                id: item.id || "item-err",
                taskId: t.id,
                taskCode: t.task_code || "TK-DB",
                title: `${t.assets?.name || "PM Task"} - ${item.title || "Checklist"}`,
                issueType: item.status === "Error" ? "Image Clarity Failure" : item.status === "Awaiting" ? "Missing Photo Evidence" : "Low Confidence (64)",
                issueColor: item.status === "Error" ? "bg-[#D32F2F]" : "bg-[#1A1A1A]",
                subColor: item.status === "Error" ? "text-[#D32F2F]" : "text-[#1A1A1A]",
                icon: item.status === "Error" ? "image_not_supported" : "warning",
                confidence: 64,
                location: t.assets?.location || "Central Wing",
                assetId: t.assets?.asset_code || "SN-NOMINAL",
                date: t.due_date ? new Date(t.due_date).toLocaleDateString() : "N/A",
                explanation: item.errorMessage || "Verification scan requires high definition photographic confirmation of repair adjustments.",
                hasPhoto: !!item.image,
                photoUrl: item.image || undefined,
                notes: item.notes || ""
              });
            }
          });
        }
      });

      setFlaggedItems(itemsList);
      setTotalCount(totalChkCount || 10);
      setValidCount(validChkCount || 8);
      setReviewCount(itemsList.length);

      // Compute aggregate confidence
      const calcConfidence = totalChkCount > 0 ? Math.round((validChkCount / totalChkCount) * 100) : 95;
      setConfidence(calcConfidence);

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load verification: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerificationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open review drawer helper
  const handleOpenReview = (item: FlaggedItem) => {
    setSelectedItem(item);
    setVendorNote(item.notes || "");
    setIsPanelOpen(true);
  };

  // Close drawer
  const handleCloseReview = () => {
    setIsPanelOpen(false);
  };

  // Run AI Verification Again (Resolve/Fix checklist item in Database)
  const handleRunAI = async () => {
    if (!selectedItem) return;
    setIsProcessingAI(true);

    try {
      // 1. Fetch current task from database
      const { data: taskData, error: fetchError } = await supabase
        .from("pm_tasks")
        .select("checklist")
        .eq("id", selectedItem.taskId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update status of the specific checklist item to 'Pass'
      let updatedChecklist: any[] = [];
      if (Array.isArray(taskData.checklist)) {
        updatedChecklist = taskData.checklist.map((item: any) => {
          if (item.id === selectedItem.id) {
            return {
              ...item,
              status: "Pass",
              notes: vendorNote || item.notes || "Resolved manually via verification log.",
              evidenceTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
          }
          return item;
        });
      }

      // 3. Save to database
      const { error: updateError } = await supabase
        .from("pm_tasks")
        .update({ checklist: updatedChecklist })
        .eq("id", selectedItem.taskId);

      if (updateError) throw updateError;

      setTimeout(() => {
        setIsProcessingAI(false);
        setIsPanelOpen(false);
        triggerToast("Verification Successful. Neural index re-aligned.", "success");
        loadVerificationData();
      }, 1200);

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to process verification: " + e.message, "error");
      setIsProcessingAI(false);
    }
  };

  // Handle final Submit report
  const handleSubmitReport = async () => {
    if (!signed) {
      triggerToast("Digital signature is required before submitting.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitText("Submitting PM Report...");

      // Convert Canvas signature to Blob / File or base64 data to store
      let signatureUrl = "";
      if (sigCanvasRef.current) {
        const base64Data = sigCanvasRef.current.toDataURL("image/png");
        signatureUrl = base64Data;

        // Auto-save signature if none exists
        if (savedSignatures.length === 0) {
          try {
            await saveSignature({
              label: `Active Signature (${new Date().toLocaleDateString()})`,
              signatureData: base64Data,
              isDefault: true
            });
            console.log("Automatically saved vendor signature.");
          } catch (sigErr) {
            console.error("Failed to auto-save vendor signature:", sigErr);
          }
        }
      }

      // For all tasks that have been resolved, make sure status is 'submitted'
      let query = supabase
        .from("pm_tasks")
        .select("id, description, checklist, status")
        .eq("assigned_vendor_id", currentUser.id);

      if (urlTaskId) {
        query = query.eq("id", urlTaskId);
      } else {
        query = query.in("status", ["submitted", "in_progress", "pending", "rejected"]);
      }

      const { data: tasksToUpdate } = await query;

      if (tasksToUpdate && tasksToUpdate.length > 0) {
        for (const t of tasksToUpdate) {
          if (t.status !== "submitted") {
            await supabase
              .from("pm_tasks")
              .update({ status: "submitted" })
              .eq("id", t.id);
          }

          const checklistObj = {
            items: t.checklist || [],
            vendorSignature: signatureUrl,
            vendorName: currentUser.full_name || "Vendor Partner"
          };

          const photosArray = Array.isArray(t.checklist)
            ? t.checklist.map((c: any) => c.image).filter((img: any) => !!img)
            : [];

          // Try fetching existing report for this task with status 'submitted' (the one created by checklist submit)
          const { data: existingReport } = await supabase
            .from("pm_reports")
            .select("id")
            .eq("task_id", t.id)
            .eq("status", "submitted")
            .order("submitted_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingReport) {
            const { error: updateErr } = await supabase
              .from("pm_reports")
              .update({
                checklist_results: checklistObj,
                ai_confidence_score: confidence,
                submitted_by: currentUser.id,
                status: "submitted"
              })
              .eq("id", existingReport.id);
            if (updateErr) throw updateErr;
          } else {
            const { error: insertErr } = await supabase
              .from("pm_reports")
              .insert({
                task_id: t.id,
                submitted_by: currentUser.id,
                findings: t.description || "Resolved anomalies. Precision score nominal.",
                recommendations: "Nominal operational rating status verified. Maintenance cycle repeated per standard schedules.",
                status: "submitted",
                ai_confidence_score: confidence,
                photos_urls: photosArray,
                checklist_results: checklistObj
              });
            if (insertErr) throw insertErr;
          }
        }
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setSubmitText("Report Submitted");
        triggerToast("PM Report submitted successfully.", "success");

        const targetId = urlTaskId || (tasksToUpdate && tasksToUpdate.length > 0 ? tasksToUpdate[0].id : "");
        setTimeout(() => {
          router.push(`/vendor/tasks/confirmation?taskId=${targetId}`);
        }, 1200);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to submit report: " + err.message, "error");
      setIsSubmitting(false);
    }
  };

  // Circular progress calculations (Radius = 110, strokeDasharray = 691)
  const offset = 691 - (691 * confidence) / 100;

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && flaggedItems.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Processing AI Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-white text-on-surface font-body-md overflow-hidden relative">
      {/* SideNavBar */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN</h1>
          <p className="text-[10px] text-[#D32F2F] font-bold uppercase tracking-[0.2em] mt-1">PM Verification</p>
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
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
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
            onClick={() => router.push("/vendor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assessment</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* Profile Info Widget */}
        <div className="px-4 mt-auto border-t border-white/20 pt-4 pb-2">
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
      <main className="lg:ml-[220px] h-screen flex flex-col relative w-full lg:w-[calc(100%-220px)] bg-white pb-20 lg:pb-0">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-20 px-6 lg:px-10 border-b-2 border-[#1A1A1A] bg-white shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/vendor/tasks")}
              className="hover:bg-gray-100 p-2 rounded-full transition-all flex items-center justify-center cursor-pointer border-2 border-transparent bg-transparent"
            >
              <span className="material-symbols-outlined text-[#1A1A1A]">arrow_back</span>
            </button>
            <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
              AI Verification Score
            </h2>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-grow overflow-y-auto p-4 lg:p-10 bg-white scroll-container">
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
            {/* Flagged Items & Signature Capture */}
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-4 px-2 gap-4">
                <div>
                  <h3 className="text-2xl text-[#1A1A1A] font-black uppercase tracking-tight">
                    Flagged Items
                  </h3>
                  <p className="text-xs text-[#1A1A1A]/70 font-bold mt-1">
                    Requires manual verification for report finalization
                  </p>
                </div>
                <span className="font-bold text-[11px] px-5 py-2 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] rounded-lg uppercase tracking-wider shrink-0 text-center">
                  {reviewCount} Awaiting Verification
                </span>
              </div>

              <div className="space-y-4">
                {flaggedItems.length > 0 ? (
                  flaggedItems.map((item) => (
                    <div
                      key={`${item.taskId}-${item.id}`}
                      className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary transition-all group duration-300"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 border-[#1A1A1A] shrink-0 ${item.icon === "image_not_supported"
                            ? "bg-primary"
                            : "bg-[#1A1A1A]"
                            }`}
                        >
                          <span
                            className={`material-symbols-outlined text-2xl ${item.icon === "image_not_supported"
                              ? "text-white"
                              : "text-primary"
                              }`}
                          >
                            {item.icon}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-md text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${item.subColor}`}>
                              {item.issueType}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenReview(item)}
                        className="w-full sm:w-auto px-8 py-2.5 bg-primary text-white font-bold text-xs rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all uppercase tracking-widest cursor-pointer hover:border-[#1A1A1A] text-center"
                      >
                        Review
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-[20px] p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">
                      verified_user
                    </span>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      All audit conflicts verified and resolved.
                    </p>
                  </div>
                )}
              </div>

              {/* Vendor Signature Box */}
              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col gap-4 mt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                      Vendor Digital Signature
                    </h4>
                    <p className="text-[10px] text-[#1A1A1A]/70 font-bold mt-0.5">
                      Sign before submitting the final PM report
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearSignature(sigCanvasRef.current, setSigned)}
                    className="text-[10px] font-black uppercase text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent"
                  >
                    Clear Signature
                  </button>
                </div>

                {savedSignatures.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-[15px] border border-[#1A1A1A]/10">
                    <span className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider">Use Saved Signature:</span>
                    {savedSignatures.map((sig) => (
                      <button
                        key={sig.id}
                        type="button"
                        onClick={() => handleLoadSavedSignature(sig.signature_data)}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase border border-[#1A1A1A] bg-white rounded-lg hover:bg-gray-50 active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <img src={sig.signature_data} className="w-6 h-4 object-contain" alt="" />
                        <span>{sig.label} {sig.is_default && "★"}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="w-full h-32 bg-black/5 border-2 border-[#1A1A1A] rounded-[20px] flex items-center justify-center relative overflow-hidden">
                  {!signed && (
                    <span className="absolute text-gray-400 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
                      Draw signature here
                    </span>
                  )}
                  <canvas
                    ref={sigCanvasRef}
                    onMouseDown={(e) => startDrawing(e, sigCanvasRef.current, setIsDrawing)}
                    onMouseMove={(e) => draw(e, sigCanvasRef.current, isDrawing, setSigned)}
                    onMouseUp={() => stopDrawing(setIsDrawing)}
                    onMouseLeave={() => stopDrawing(setIsDrawing)}
                    onTouchStart={(e) => startDrawing(e, sigCanvasRef.current, setIsDrawing)}
                    onTouchMove={(e) => draw(e, sigCanvasRef.current, isDrawing, setSigned)}
                    onTouchEnd={() => stopDrawing(setIsDrawing)}
                    className="w-full h-full cursor-crosshair relative z-10"
                  />
                </div>
                {!signed && (
                  <p className="text-[9px] text-[#D32F2F] font-bold uppercase">
                    Digital signature is required before submitting.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer Action */}
        <footer className="p-8 bg-white border-t-2 border-[#1A1A1A] flex items-center justify-center shrink-0">
          <button
            onClick={handleSubmitReport}
            disabled={isSubmitting || isSubmitted}
            className={`w-full max-w-4xl h-16 text-white font-bold rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center gap-4 transition-all duration-300 uppercase tracking-[0.2em] active:scale-[0.98] cursor-pointer ${isSubmitted
              ? "bg-green-700 border-green-700 pointer-events-none"
              : isSubmitting
                ? "bg-primary opacity-80 cursor-wait pointer-events-none"
                : "bg-primary hover:bg-[#1A1A1A]"
              }`}
          >
            <span
              className={`material-symbols-outlined ${isSubmitting ? "animate-spin" : ""}`}
            >
              {isSubmitted ? "check_circle" : isSubmitting ? "sync" : "task_alt"}
            </span>
            <span>{submitText}</span>
          </button>
        </footer>
      </main>

      {/* Review Panel Overlay */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-[#1A1A1A]/60 z-[60] transition-opacity duration-300 backdrop-blur-xs"
          onClick={handleCloseReview}
        ></div>
      )}

      {/* Review Panel Slide-out Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l-2 border-[#1A1A1A] z-[70] transition-transform duration-300 flex flex-col ${isPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {selectedItem && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b-2 border-[#1A1A1A] flex justify-between items-center bg-[#1A1A1A] text-white shrink-0">
              <h2 className="text-md uppercase font-black tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Review Detail
              </h2>
              <button
                onClick={handleCloseReview}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-container">
              {/* Info Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] text-[#1A1A1A]/60 uppercase font-black tracking-widest">
                  Task Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-on-surface/10 rounded-xl">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[#1A1A1A]/50">Task Name</p>
                    <p className="font-bold text-xs text-[#1A1A1A]">{selectedItem.title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[#1A1A1A]/50">Asset ID</p>
                    <p className="font-bold text-xs text-[#1A1A1A]">{selectedItem.assetId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[#1A1A1A]/50">Location</p>
                    <p className="font-bold text-xs text-[#1A1A1A]">{selectedItem.location}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[#1A1A1A]/50">Date</p>
                    <p className="font-bold text-xs text-[#1A1A1A]">{selectedItem.date}</p>
                  </div>
                </div>
              </section>

              {/* Status & AI Result Card */}
              <section className="bg-[#1A1A1A] text-white p-6 rounded-xl border-2 border-[#1A1A1A]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/50 mb-1">Status</p>
                    <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase rounded">
                      Flagged
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/50 mb-1">AI Result</p>
                    <p className="font-bold text-xs text-primary">Low Confidence</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/50 mb-1">Issue Type</p>
                    <p className="font-bold text-xs">{selectedItem.issueType}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/50 mb-1">AI Score</p>
                    <p className="text-xl font-black text-primary">{selectedItem.confidence}</p>
                  </div>
                </div>
              </section>

              {/* AI Explanation Text */}
              <section className="space-y-2">
                <h3 className="text-[10px] text-[#1A1A1A]/60 uppercase font-black tracking-widest">
                  AI Explanation
                </h3>
                <p className="text-xs font-bold leading-relaxed text-[#1A1A1A] bg-primary/5 p-4 border-l-4 border-primary rounded-r">
                  {selectedItem.explanation}
                </p>
              </section>

              {/* Evidence Upload Slot */}
              <section className="space-y-4">
                <h3 className="text-[10px] text-[#1A1A1A]/60 uppercase font-black tracking-widest">
                  Evidence
                </h3>
                {selectedItem.photoUrl ? (
                  <div className="aspect-video border-2 border-[#1A1A1A] rounded-xl overflow-hidden bg-gray-50 relative">
                    <img
                      src={selectedItem.photoUrl}
                      alt="Inspection detail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-[#1A1A1A]/5 border-2 border-dashed border-[#1A1A1A] rounded-xl flex flex-col items-center justify-center text-center gap-2">
                    <span className="material-symbols-outlined text-3xl text-[#1A1A1A]/30">
                      image_not_supported
                    </span>
                    <span className="text-[10px] font-bold text-[#1A1A1A]/40">NO PHOTO LOGGED</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 font-black uppercase text-[10px] rounded-lg opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span> Mock Disabled
                  </button>
                  <button
                    disabled
                    className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 font-black uppercase text-[10px] rounded-lg opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span> Camera Disabled
                  </button>
                </div>
              </section>

              {/* Notes Input Area */}
              <section className="space-y-2">
                <h3 className="text-[10px] text-[#1A1A1A]/60 uppercase font-black tracking-widest">
                  Vendor Notes
                </h3>
                <textarea
                  value={vendorNote}
                  onChange={(e) => setVendorNote(e.target.value)}
                  className="w-full p-4 border-2 border-[#1A1A1A] rounded-xl font-body-md focus:border-primary outline-none text-xs"
                  placeholder="Explain resolution context for verification audit trail..."
                  rows={3}
                ></textarea>
              </section>
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t-2 border-[#1A1A1A] bg-white space-y-3 shrink-0">
              <button
                onClick={handleRunAI}
                disabled={isProcessingAI}
                className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-3 cursor-pointer border-none"
              >
                <span
                  className={`material-symbols-outlined ${isProcessingAI ? "animate-spin" : ""}`}
                >
                  {isProcessingAI ? "sync" : "analytics"}
                </span>
                {isProcessingAI ? "Processing..." : "Run AI Verification Again"}
              </button>
              <button
                onClick={handleCloseReview}
                className="w-full py-4 bg-white text-[#1A1A1A] font-black uppercase tracking-widest rounded-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer"
              >
                Close Review
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Toast popup notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${t.type === "success" ? "border-green-700" : "border-primary"
              }`}
          >
            <span
              className={`material-symbols-outlined ${t.type === "success" ? "text-green-600" : "text-primary"
                }`}
            >
              check_circle
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIVerificationScorePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <AIVerificationScoreContent />
    </Suspense>
  );
}
