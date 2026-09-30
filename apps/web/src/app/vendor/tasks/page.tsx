"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AssetLookupModal from "@/components/AssetLookupModal";

interface Subtask {
  id: string;
  text: string;
  completed?: boolean;
  image?: string;
  video?: string;
  mediaType?: MediaType;
}

// "none" = plain checkbox, no photo/video evidence needed.
type MediaType = "none" | "photo" | "video" | "both";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "Pass" | "AI Processing" | "Awaiting" | "Error";
  image?: string;
  video?: string;
  evidenceTime?: string;
  errorMessage?: string;
  notes?: string;
  type?: "optional" | "required";
  requireImage?: boolean;
  mediaType?: MediaType;
  subtasks?: Subtask[];
  aiConfidence?: number;
  aiQualityLabel?: string;
}

interface Task {
  id: string; // database UUID
  task_code: string; // readable e.g., TK-8021
  title: string;
  asset: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  status: "Active" | "Pending" | "Completed";
  dbStatus: "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "completed";
  priority: "High" | "Normal";
  due: string;
  date: string;
  location: string;
  time: string;
  techs: string[];
  checklist: ChecklistItem[];
  supervisor?: string;
  assigned_supervisor_id?: string;
  serialNumber?: string;
  techNotes?: string;
  adminNotes?: string;
  createdAt?: string;
  assetType?: string;
}

// requireImage is the source of truth for whether an item needs evidence; mediaType says which kind.
const itemMediaType = (c: { requireImage?: boolean; mediaType?: MediaType }): MediaType =>
  c.requireImage ? (c.mediaType && c.mediaType !== "none" ? c.mediaType : "photo") : "none";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function PMChecklistPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssetLookupOpen, setIsAssetLookupOpen] = useState(false);

  // Search & Filter state variables
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Active checklist note
  const [techNotes, setTechNotes] = useState("");


  // Notification Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // File upload input ref for actual evidence file upload
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Evidence Upload Modal State
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  // Custom Professional Modal States (Replacing native browser prompts)
  const [addSubtaskModal, setAddSubtaskModal] = useState<{ isOpen: boolean; itemId: string | null }>({ isOpen: false, itemId: null });
  const [subtaskInputText, setSubtaskInputText] = useState("");
  const [subtaskMediaType, setSubtaskMediaType] = useState<MediaType>("none");

  const [addExtraItemModalOpen, setAddExtraItemModalOpen] = useState(false);
  const [extraItemTitleInput, setExtraItemTitleInput] = useState("");
  const [extraItemDescInput, setExtraItemDescInput] = useState("");
  const [extraItemMediaTypeInput, setExtraItemMediaTypeInput] = useState<MediaType>("none");
  const [extraItemTypeInput, setExtraItemTypeInput] = useState<"optional" | "required">("optional");

  const handleToggleSubtask = async (itemId: string, subtaskId: string) => {
    if (!selectedTask || isLocked) return;
    const updatedChecklist = selectedTask.checklist.map((c) => {
      if (c.id !== itemId) return c;
      const updatedSubtasks = (c.subtasks || []).map((sub) =>
        sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
      );
      return { ...c, subtasks: updatedSubtasks };
    });

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
  };

  const handleAddSubtaskToItem = async (itemId: string, text: string, mediaType: MediaType = "none") => {
    if (!selectedTask || isLocked || !text.trim()) return;
    const updatedChecklist = selectedTask.checklist.map((c) => {
      if (c.id !== itemId) return c;
      const currentSubs = c.subtasks || [];
      const newSub: Subtask = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: text.trim().toUpperCase(),
        completed: false,
        mediaType: mediaType,
      };
      return { ...c, subtasks: [...currentSubs, newSub] };
    });

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
  };

  const handleAddMainTaskItem = async () => {
    if (!selectedTask || isLocked) return;
    setAddExtraItemModalOpen(true);
    setExtraItemTitleInput("");
    setExtraItemDescInput("");
    setExtraItemMediaTypeInput("none");
    setExtraItemTypeInput("optional");
  };

  const handleRemoveMainTaskItem = async (itemId: string) => {
    if (!selectedTask || isLocked) return;
    const updatedChecklist = selectedTask.checklist.filter((item) => item.id !== itemId);
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    try {
      await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
      triggerToast("Task item removed from checklist.", "info");
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to remove task item: " + err.message, "error");
    }
  };

  const handleRemoveSubtaskEvidence = async (itemId: string, subtaskId: string, mediaKind: "photo" | "video" = "photo") => {
    if (!selectedTask || isLocked) return;
    const updatedChecklist = selectedTask.checklist.map((item) => {
      if (item.id !== itemId) return item;
      const updatedSubtasks = (item.subtasks || []).map((sub) => {
        if (sub.id !== subtaskId) return sub;
        const newSub = { ...sub };
        if (mediaKind === "photo") {
          newSub.image = undefined;
        } else {
          newSub.video = undefined;
        }
        newSub.completed = false;
        return newSub;
      });
      return { ...item, subtasks: updatedSubtasks };
    });

    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
    triggerToast("Subtask evidence removed.", "info");
  };

  const handleConfirmAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (addSubtaskModal.itemId && subtaskInputText.trim()) {
      handleAddSubtaskToItem(addSubtaskModal.itemId, subtaskInputText, subtaskMediaType);
      setAddSubtaskModal({ isOpen: false, itemId: null });
      setSubtaskInputText("");
    }
  };

  const handleConfirmAddMainTaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || isLocked || !extraItemTitleInput.trim()) return;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: extraItemTitleInput.trim().toUpperCase(),
      description: extraItemDescInput.trim() || "Vendor added custom task item.",
      status: "Awaiting",
      type: extraItemTypeInput,
      requireImage: extraItemMediaTypeInput !== "none",
      mediaType: extraItemMediaTypeInput,
      subtasks: []
    };

    const updatedChecklist = [...selectedTask.checklist, newItem];
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );

    try {
      await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
      triggerToast("New task item added to checklist!", "success");
      setAddExtraItemModalOpen(false);
      setExtraItemTitleInput("");
      setExtraItemDescInput("");
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to add task item: " + err.message, "error");
    }
  };

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadTasksData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Fetch Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);

      // Fetch Tasks assigned to this vendor
      const { data: tasksData, error } = await supabase
        .from("pm_tasks")
        .select(`
          *,
          assets (
            name,
            asset_code,
            type,
            category,
            location
          ),
          pm_templates (
            checklist_items
          ),
          profiles:assigned_supervisor_id (
            id,
            full_name
          )
        `)
        .eq("assigned_vendor_id", user.id);

      if (error) throw error;

      const mapped: Task[] = (tasksData || []).map((t: any) => {
        let statusStr: "Active" | "Pending" | "Completed" = "Active";
        if (t.status === "submitted") {
          statusStr = "Pending";
        } else if (t.status === "approved" || t.status === "completed") {
          statusStr = "Completed";
        } else if (t.status === "in_progress" || t.status === "rejected" || t.status === "pending") {
          statusStr = "Active";
        }

        const supervisorName = t.profiles?.full_name || "Lead Supervisor";

        // Handle checklist formatting from DB
        let checklistMapped: ChecklistItem[] = [];
        if (Array.isArray(t.checklist) && t.checklist.length > 0) {
          checklistMapped = t.checklist.map((c: any, index: number) => ({
            id: c.id || `item-${index}`,
            title: c.title || c.text || c.task || "Checklist Task",
            description: c.description || "Operational integrity check.",
            status: c.status || "Awaiting",
            image: c.image || undefined,
            evidenceTime: c.evidenceTime || undefined,
            errorMessage: c.errorMessage || undefined,
            notes: c.notes || undefined,
            type: c.type && c.type !== "optional" ? "required" : "optional",
            video: c.video || undefined,
            requireImage: !!c.requireImage,
            mediaType: itemMediaType(c),
            subtasks: Array.isArray(c.subtasks) ? c.subtasks : []
          }));
        } else if (t.pm_templates && Array.isArray(t.pm_templates.checklist_items) && t.pm_templates.checklist_items.length > 0) {
          checklistMapped = t.pm_templates.checklist_items.map((c: any, index: number) => ({
            id: c.id || `item-${index}`,
            title: c.text || c.title || c.task || "Checklist Task",
            description: c.description || `Priority: ${(c.type && c.type !== "optional" ? "required" : "optional").toUpperCase()} | Evidence: ${c.requireImage ? "REQUIRED" : "NOT NEEDED"}`,
            status: c.status || "Awaiting",
            image: c.image || undefined,
            evidenceTime: c.evidenceTime || undefined,
            errorMessage: c.errorMessage || undefined,
            notes: c.notes || undefined,
            type: c.type && c.type !== "optional" ? "required" : "optional",
            video: c.video || undefined,
            requireImage: !!c.requireImage,
            mediaType: itemMediaType(c),
            subtasks: Array.isArray(c.subtasks) ? c.subtasks : []
          }));
        } else {
          // Fallback checklist default items if database is empty
          checklistMapped = [
            { id: "item-1", title: "Visual Casing Integrity", description: "Inspect unit shell and structural mounts.", status: "Awaiting", type: "required", requireImage: true },
            { id: "item-2", title: "Internal Component Fit", description: "Confirm wiring layout, contacts, and internal wear indicators.", status: "Awaiting", type: "optional", requireImage: false }
          ];
        }

        return {
          id: t.id,
          task_code: t.task_code || `TK-${t.id.substring(0, 4).toUpperCase()}`,
          title: t.assets?.name || "PM Maintenance Checklist",
          asset: t.assets?.name || "Industrial Component",
          category: t.assets?.category || "Mechanical",
          status: statusStr,
          dbStatus: t.status,
          priority: t.priority === "high" ? "High" : "Normal",
          due: t.due_date ? new Date(t.due_date).toLocaleDateString() : "No Due Date",
          date: t.due_date ? t.due_date.substring(0, 10) : "",
          location: t.assets?.location || "Central Plant",
          time: new Date(t.created_at).toLocaleDateString(),
          techs: [profile?.full_name || "Vendor Tech"],
          supervisor: supervisorName,
          assigned_supervisor_id: t.profiles?.id || undefined,
          serialNumber: t.assets?.asset_code || undefined,
          checklist: checklistMapped,
          techNotes: t.description || "",
          adminNotes: t.notes || "",
          createdAt: t.created_at,
          assetType: t.assets?.type || t.assets?.name || ""
        };
      });

      // Sort tasks: Active/Progress/Rejected/Pending first, then Submitted, then Approved/Completed
      const statusPriority: Record<string, number> = {
        'in_progress': 1,
        'rejected': 1,
        'pending': 1,
        'submitted': 2,
        'approved': 3,
        'completed': 3
      };

      mapped.sort((a, b) => {
        const priorityA = statusPriority[a.dbStatus] || 99;
        const priorityB = statusPriority[b.dbStatus] || 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // Secondary sort by creation time (newest first)
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setTasks(mapped);
    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load tasks: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get("taskId");
      if (taskId) {
        setSelectedTaskId(taskId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const isLocked = selectedTask
    ? (selectedTask.dbStatus === "submitted" || selectedTask.dbStatus === "approved" || selectedTask.dbStatus === "completed" || selectedTask.status === "Completed")
    : false;

  // Save checklist helper to DB
  const saveChecklistToDatabase = async (taskId: string, updatedChecklist: ChecklistItem[]) => {
    try {
      const { error } = await supabase
        .from("pm_tasks")
        .update({ checklist: updatedChecklist })
        .eq("id", taskId);
      if (error) throw error;
    } catch (e: any) {
      console.error("Failed to save checklist progress to DB: ", e.message);
    }
  };
  // Start task helper to update DB status to in_progress
  const handleStartTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("pm_tasks")
        .update({ status: "in_progress" })
        .eq("id", taskId);
      if (error) throw error;

      triggerToast("Task started! Please fill out the checklist.", "success");
      await loadTasksData();
      setSelectedTaskId(taskId);
    } catch (e: any) {
      console.error("Failed to start task:", e.message);
      triggerToast("Failed to start task: " + e.message, "error");
    }
  };
  const handleRemovePhoto = async (itemId: string) => {
    if (!selectedTask || isLocked) return;

    try {
      const updatedChecklist = selectedTask.checklist.map((item) =>
        item.id === itemId
          ? {
            ...item,
            status: "Awaiting" as const,
            image: undefined,
            video: undefined,
            evidenceTime: undefined,
            errorMessage: undefined,
          }
          : item
      );

      // Optimistically update tasks state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t
        )
      );

      await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
      triggerToast("Evidence photo deleted and status reset to Awaiting.", "info");
    } catch (e: any) {
      console.error("Failed to delete photo:", e.message);
      triggerToast("Failed to delete photo: " + e.message, "error");
    }
  };

  // Pass / Fail for checklist items that need no evidence. Clicking the active result again resets it.
  const handleSetItemResult = async (itemId: string, result: "Pass" | "Error") => {
    if (!selectedTask || isLocked) return;
    const updatedChecklist = selectedTask.checklist.map((item) => {
      if (item.id !== itemId) return item;
      const status = item.status === result ? ("Awaiting" as const) : result;
      return {
        ...item,
        status,
        evidenceTime: status === "Awaiting" ? undefined : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        errorMessage: undefined,
      };
    });
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
  };

  // AI image quality check via SightEngine API for items in "AI Processing" status
  const checkImageQualityWithAI = async (imageUrl: string) => {
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Quality check API failed");
      }
      return await response.json();
    } catch (err: any) {
      console.error("AI quality check error:", err);
      return null;
    }
  };

  // Process items that enter "AI Processing" status — call SightEngine Quality API
  useEffect(() => {
    if (!selectedTask) return;
    const processingItem = selectedTask.checklist.find((item) => item.status === "AI Processing");
    if (!processingItem || !processingItem.image) return;

    let cancelled = false;

    const runQualityCheck = async () => {
      const result = await checkImageQualityWithAI(processingItem.image!);

      if (cancelled) return;

      let newStatus: "Pass" | "Error" = "Pass";
      let errorMessage: string | undefined;
      let confidence = 0;
      let qualityLabel = "";

      if (result) {
        confidence = result.confidence;
        qualityLabel = result.qualityLabel;

        if (confidence < 45) {
          // Poor quality — reject
          newStatus = "Error";
          errorMessage = `Image quality too low (${confidence}% — ${qualityLabel}). Please re-upload a clearer, well-lit photo.`;
        } else if (confidence < 60) {
          // Fair quality — pass with warning
          newStatus = "Pass";
          errorMessage = `Fair image quality (${confidence}%). Flagged for supervisor review.`;
        }
        // Good/Excellent quality (>=60%) — clean pass
      } else {
        // API call failed — set error
        newStatus = "Error";
        errorMessage = "AI quality check service unavailable. Please try again.";
      }

      const updatedChecklist = selectedTask.checklist.map((item) =>
        item.id === processingItem.id
          ? {
            ...item,
            status: newStatus,
            evidenceTime: newStatus === "Pass" ? new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : undefined,
            errorMessage: errorMessage,
            aiConfidence: confidence,
            aiQualityLabel: qualityLabel,
          }
          : item
      );

      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t
        )
      );

      await saveChecklistToDatabase(selectedTask.id, updatedChecklist);

      if (newStatus === "Pass") {
        triggerToast(
          `${processingItem.title.toUpperCase()} — QUALITY VERIFIED: ${qualityLabel.toUpperCase()} (${confidence}%)`,
          "success"
        );
      } else {
        triggerToast(
          errorMessage || "AI quality check failed.",
          "error"
        );
      }
    };

    runQualityCheck();

    return () => { cancelled = true; };
  }, [tasks, selectedTaskId]);

  // Compute progress for selected task (Optional tasks that are "Awaiting" are excluded from total count)
  const activeCheckItems = selectedTask
    ? selectedTask.checklist.filter((item) => !(item.type === "optional" && item.status === "Awaiting"))
    : [];
  const doneCount = activeCheckItems.filter((item) => item.status === "Pass").length;
  const totalCheckItems = activeCheckItems.length;
  const progressPercent = totalCheckItems > 0 ? Math.round((doneCount / totalCheckItems) * 100) : 0;

  // Submit PM Report action to Supabase
  const handleSubmitReport = async () => {
    if (!selectedTask || isLocked) return;

    // Check if required items are completed
    const incompleteTasks = selectedTask.checklist.filter((item) => {
      if (item.type === "optional" && item.status === "Awaiting") {
        return false;
      }
      return item.status === "Awaiting";
    });
    if (incompleteTasks.length > 0) {
      triggerToast(`Cannot proceed! There are ${incompleteTasks.length} required checklist items not yet checked.`, "error");
      return;
    }

    // Only items the admin flagged for evidence need a photo/video
    const missingImages = selectedTask.checklist.filter((item) => {
      if (item.type === "optional" && item.status === "Awaiting") {
        return false;
      }
      return item.requireImage && !item.image && !item.video;
    });
    if (missingImages.length > 0) {
      triggerToast(`Cannot proceed! Evidence photo/video has not been uploaded for ${missingImages.length} checklist items.`, "error");
      return;
    }

    // Subtasks of every checked item must be ticked (evidence subtasks tick themselves on upload)
    const openSubtasks = selectedTask.checklist.filter((item) => {
      if (item.type === "optional" && item.status === "Awaiting") {
        return false;
      }
      return (item.subtasks || []).some((sub) => !sub.completed);
    });
    if (openSubtasks.length > 0) {
      triggerToast(`Cannot proceed! ${openSubtasks.length} checklist items still have unchecked subtasks.`, "error");
      return;
    }

    // Check if any checklist item with an Error status is missing repair notes
    const missingNotes = selectedTask.checklist.some((item) => item.status === "Error" && !item.notes?.trim());
    if (missingNotes) {
      triggerToast("Checklist repair notes are required to explain findings for flagged/error items!", "error");
      return;
    }

    try {
      triggerToast("SAVING CHECKLIST DATA...", "info");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        triggerToast("Session expired, please login again.", "error");
        return;
      }

      // Update task checklist and notes directly
      const { error: taskError } = await supabase
        .from("pm_tasks")
        .update({
          checklist: selectedTask.checklist,
          description: techNotes || ""
        })
        .eq("id", selectedTask.id);

      if (taskError) throw taskError;

      triggerToast("Checklist progress saved. Proceeding to signature page...", "success");

      setTimeout(() => {
        router.push(`/vendor/tasks/verification?taskId=${selectedTask.id}`);
      }, 1200);

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to save progress: " + e.message, "error");
    }
  };

  // Upload Photo action
  const handleOpenUpload = (itemId: string) => {
    if (isLocked) return;
    setUploadTargetId(itemId);
  };

  const handleSelectMockImage = async (imageUrl: string) => {
    triggerToast("Example template images cannot be used as evidence! Please upload an actual photo.", "error");
  };

  // Real File Upload to Supabase Storage (Photo & Video)
  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetId && selectedTask) {
      try {
        const isVideoFile = file.type.startsWith("video") || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
        const mediaLabel = isVideoFile ? "video" : "photo";
        triggerToast(`Uploading evidence ${mediaLabel}...`, "info");
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        // Name evidence by SHA-256 of its bytes so the same file can never be uploaded twice.
        // ponytail: exact-byte match only; a re-saved/cropped copy gets a new hash. Use a perceptual hash if that matters.
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
        const filePath = `evidence/${hash}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("pm_evidence")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError && (uploadError as { statusCode?: string }).statusCode === "409") {
          triggerToast(`This ${mediaLabel} has already been uploaded as evidence. Please capture a new one.`, "error");
          return;
        }
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("pm_evidence").getPublicUrl(filePath);

        const itemIdStr = uploadTargetId;

        // Subtask evidence upload check
        if (itemIdStr.includes(":::")) {
          const parts = itemIdStr.split(":::");
          const parentItemId = parts[0];
          const subtaskId = parts[1];
          const mediaKind = parts[2] || (isVideoFile ? "video" : "photo");

          const updatedChecklist = selectedTask.checklist.map((item) => {
            if (item.id !== parentItemId) return item;
            const updatedSubtasks = (item.subtasks || []).map((sub) => {
              if (sub.id !== subtaskId) return sub;
              const req = sub.mediaType || item.mediaType || "photo";
              const newSub = { ...sub };
              if (mediaKind === "video" || isVideoFile) {
                newSub.video = publicUrl;
              } else {
                newSub.image = publicUrl;
              }

              if (req === "both") {
                newSub.completed = !!(newSub.image && newSub.video);
              } else if (req === "video") {
                newSub.completed = !!newSub.video;
              } else {
                newSub.completed = !!(newSub.image || newSub.video);
              }
              return newSub;
            });
            return { ...item, subtasks: updatedSubtasks };
          });

          setTasks((prevTasks) =>
            prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
          );

          await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
          triggerToast(`Subtask ${mediaLabel.toUpperCase()} evidence uploaded successfully!`, "success");
          setUploadTargetId(null);
          return;
        }

        const itemId = itemIdStr;
        const updatedChecklist = selectedTask.checklist.map((item) =>
          item.id === itemId
            ? {
              ...item,
              status: isVideoFile ? ("Pass" as const) : ("AI Processing" as const),
              image: isVideoFile ? item.image : publicUrl,
              video: isVideoFile ? publicUrl : item.video,
              errorMessage: undefined,
            }
            : item
        );

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t
          )
        );

        await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
        triggerToast(`Evidence ${mediaLabel} uploaded successfully.${isVideoFile ? "" : " AI processing..."}`, "success");
        setUploadTargetId(null);
      } catch (err: any) {
        console.error(err);
        triggerToast("Failed to upload evidence: " + err.message, "error");
      }
    }
  };



  const handleLogout = async () => {
    triggerToast("Logging out...", "info");
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  // Filter tasks based on Search, Category, Status, and Date Range
  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.task_code.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.asset.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "All Categories" ||
      t.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus =
      statusFilter === "All Statuses" || t.status === statusFilter;

    const matchesDate = (() => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // Dynamic categories from tasks
  const uniqueCategories = Array.from(new Set(tasks.map((t) => t.category))).filter(Boolean).sort();

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setStatusFilter("All Statuses");
    setStartDate("");
    setEndDate("");
  };

  // Calculate task-specific counters
  const activeTasksCount = tasks.filter((t) => t.status === "Active").length;
  const pendingTasksCount = tasks.filter((t) => t.status === "Pending").length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;

  // Pagination bounds
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  // Sync pagination page when filters change
  useEffect(() => {
    setTimeout(() => {
      setCurrentPage(1);
    }, 0);
  }, [searchQuery, categoryFilter, statusFilter, startDate, endDate]);

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Checklist Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
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

      {/* SideNavBar (matching vendor main/profile sidebar styles) */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
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

          {/* Active State Tasks (rounded-full) */}
          <button
            onClick={() => setSelectedTaskId(null)}
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

        {/* Profile Footer Widget */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={handleLogout}
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
              <p className="text-xs font-bold truncate text-white uppercase leading-none mb-1">{currentUser?.full_name || "Vendor"}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Vendor ID: #{currentUser?.id?.substring(0, 4).toUpperCase() || "N/A"}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Top Navigation Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-6 lg:px-10 z-40">
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
              <div className="flex items-center gap-3">
                <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                  {selectedTask.task_code}
                </h2>
                <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[10px] font-bold text-white uppercase tracking-wider ${selectedTask.status === "Completed" ? "bg-green-600" : selectedTask.status === "Pending" ? "bg-black" : "bg-[#D32F2F]"
                  }`}>
                  {selectedTask.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Inspecting: {selectedTask.asset}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                Operator Checklist Portal
              </h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Active Maintenance Task List
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssetLookupOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#1A1A1A] rounded-[20px] bg-white text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer text-[10px] font-black uppercase tracking-wider"
            title="Browse Asset Catalog"
          >
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            <span className="hidden sm:inline">Assets</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {selectedTask ? (
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-300">

            {/* Sub-header & Asset Info */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
                    {selectedTask.location}
                  </span>
                  <span className="text-gray-500 font-bold text-xs">Category: {selectedTask.category}</span>
                </div>
                <h3 className="font-headline-lg text-2xl text-[#1A1A1A] uppercase font-extrabold">
                  {selectedTask.title}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1 font-semibold">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Asset: {selectedTask.asset} | Due: {selectedTask.due}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const event = new CustomEvent("open-task-chat", {
                      detail: {
                        taskCode: selectedTask.task_code,
                        taskTitle: selectedTask.title,
                        taskId: selectedTask.id,
                        supervisorId: selectedTask.assigned_supervisor_id
                      }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="mt-3 px-4 py-2 border-2 border-black bg-white hover:bg-gray-50 text-[#D32F2F] rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">forum</span>
                  <span>Ask Supervisor ({selectedTask.supervisor})</span>
                </button>
              </div>

              {/* Progress Component */}
              <div className="bg-white border-2 border-[#1A1A1A] p-6 rounded-[20px] min-w-[320px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-md text-xs font-bold uppercase">
                    ITEMS CHECKED {doneCount}/{totalCheckItems}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 border-2 border-[#1A1A1A] overflow-hidden">
                  <div
                    className="bg-[#D32F2F] h-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </section>

            {/* Admin Notes Section */}
            {selectedTask.adminNotes && (
              <div className="bg-black/5 border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-black">
                  <span className="material-symbols-outlined text-base">sticky_note_2</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">Admin Additional Notes</span>
                </div>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedTask.adminNotes}
                </p>
              </div>
            )}

            {/* Checklist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedTask.checklist.map((item) => {
                const isPass = item.status === "Pass";
                const isProcessing = item.status === "AI Processing";
                const isAwaiting = item.status === "Awaiting";
                const isError = item.status === "Error";

                return (
                  <div
                    key={item.id}
                    className={`bg-white border-4 border-[#1A1A1A] rounded-[24px] p-6 flex flex-col justify-between transition-all relative ${isError ? "bg-red-50/30" : ""
                      } ${isLocked ? "" : "hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_#1A1A1A]"
                      }`}
                  >
                    <div className="flex gap-6 items-start">
                      {/* Left Column: Image / Upload Placeholder */}
                      <div className="relative shrink-0">
                        {item.image ? (
                          <div className="relative w-28 h-28 rounded-[16px] border-2 border-[#1A1A1A] overflow-hidden group">
                            <img
                              className={`w-full h-full object-cover ${isProcessing ? "blur-[2px]" : ""}`}
                              src={item.image}
                              alt={item.title}
                            />
                            {!isProcessing && !isLocked && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenUpload(item.id)}
                                  className="bg-white border-2 border-black text-[#1A1A1A] font-extrabold uppercase rounded-lg px-2 py-0.5 text-[8px] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer border-none w-20 text-center"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(item.id)}
                                  className="bg-[#D32F2F] border-2 border-black text-white font-extrabold uppercase rounded-lg px-2 py-0.5 text-[8px] hover:bg-black transition-all cursor-pointer border-none w-20 text-center"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ) : item.video ? (
                          <div className="relative w-28 h-28 rounded-[16px] border-2 border-purple-900 overflow-hidden bg-black group">
                            <video src={item.video} controls className="w-full h-full object-cover" />
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(item.id)}
                                className="absolute top-1 right-1 bg-[#D32F2F] text-white p-1 rounded-full hover:bg-black transition-all cursor-pointer opacity-90 group-hover:opacity-100 z-10 shadow-md"
                                title="Remove video"
                              >
                                <span className="material-symbols-outlined text-xs">close</span>
                              </button>
                            )}
                          </div>
                        ) : !item.requireImage ? (
                          <div className="w-28 flex flex-col gap-2">
                            {(["Pass", "Error"] as const).map((result) => {
                              const active = item.status === result;
                              const activeColor = result === "Pass" ? "bg-green-600 text-white" : "bg-[#D32F2F] text-white";
                              return (
                                <button
                                  key={result}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleSetItemResult(item.id, result)}
                                  className={`h-[52px] rounded-[16px] border-2 border-[#1A1A1A] flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider transition-colors ${active ? activeColor : "bg-white text-black hover:bg-gray-100"} ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                                  title={result === "Pass" ? "Mark item as OK" : "Flag item as failed (notes required)"}
                                >
                                  <span className="material-symbols-outlined text-base">{result === "Pass" ? "check_box" : "report"}</span>
                                  <span>{result === "Pass" ? "OK" : "Fail"}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <button
                            onClick={() => !isLocked && handleOpenUpload(item.id)}
                            disabled={isLocked}
                            className={`w-28 h-28 rounded-[16px] border-2 border-dashed border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-1.5 transition-colors p-2 text-center ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 hover:border-[#1A1A1A] cursor-pointer group"
                              }`}
                          >
                            <span className="material-symbols-outlined text-3xl text-gray-400 transition-transform group-hover:scale-110">
                              {item.mediaType === "video" ? "videocam" : "photo_camera"}
                            </span>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight leading-tight">
                              {item.mediaType === "video" ? "MACHINE VIDEO" : "FULL MACHINE PHOTO"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Right Column: Title, Description & Status */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-headline-md text-sm uppercase font-extrabold text-black leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isLocked && (item.id.startsWith("item-") || item.type === "optional") && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMainTaskItem(item.id)}
                                className="text-[9px] font-black uppercase text-[#D32F2F] hover:bg-[#D32F2F]/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer border border-[#D32F2F]/30"
                                title="Remove task item from checklist"
                              >
                                <span className="material-symbols-outlined text-xs">delete</span>
                                <span>REMOVE</span>
                              </button>
                            )}
                            <span className={`px-2.5 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider text-white shrink-0 ${isPass ? "bg-green-600" : isProcessing ? "bg-yellow-600" : isError ? "bg-[#D32F2F]" : "bg-black"
                              }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed font-semibold">
                          {item.errorMessage || item.description}
                        </p>

                        {/* Quick Action Button for awaiting */}
                        {isAwaiting && !isLocked && item.requireImage && (
                          <button
                            onClick={() => handleOpenUpload(item.id)}
                            className="w-fit border-2 border-black rounded-full px-4 py-1.5 font-black text-[9px] uppercase hover:bg-black hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-white text-black shadow-sm mt-1"
                            title="Capture overall photo of the machine / component being inspected"
                          >
                            <span>CAPTURE FULL MACHINE</span>
                            <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                          </button>
                        )}
                        {/* Subtasks Checklist Section */}
                        <div className="mt-3 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">account_tree</span>
                              Subtasks ({item.subtasks?.filter((s) => s.completed || s.image || s.video).length || 0}/{item.subtasks?.length || 0})
                            </span>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddSubtaskModal({ isOpen: true, itemId: item.id });
                                  setSubtaskInputText("");
                                  setSubtaskMediaType("none");
                                }}
                                className="text-[10px] font-black uppercase text-[#D32F2F] hover:bg-[#D32F2F]/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                <span>ADD SUBTASK</span>
                              </button>
                            )}
                          </div>

                          {(!item.subtasks || item.subtasks.length === 0) ? (
                            <p className="text-[10px] text-gray-400 font-bold italic py-1">No subtasks. Click "+ ADD SUBTASK" to add specific sub-steps.</p>
                          ) : (
                            <div className="space-y-3">
                              {item.subtasks.map((sub) => {
                                const reqType: MediaType = sub.mediaType || "none";

                                return (
                                  <div key={sub.id} className="p-3 bg-white border border-gray-200 rounded-lg flex flex-col gap-2 shadow-sm">
                                    {/* Subtask Header & Requirement Badge */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <label className="flex items-center gap-2 cursor-pointer group select-none flex-1 min-w-[140px]">
                                        <input
                                          type="checkbox"
                                          // Evidence subtasks are ticked by their upload, not by hand
                                          disabled={isLocked || reqType !== "none"}
                                          checked={!!sub.completed}
                                          onChange={() => handleToggleSubtask(item.id, sub.id)}
                                          className="w-4 h-4 accent-[#D32F2F] rounded cursor-pointer shrink-0"
                                        />
                                        <span className={`text-xs font-black uppercase truncate transition-all ${sub.completed ? "line-through text-gray-400" : "text-black"}`}>
                                          {sub.text}
                                        </span>
                                      </label>

                                      {/* Clear Requirement Badge */}
                                      {reqType !== "none" && <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wide border shrink-0 ${
                                        reqType === "photo"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : reqType === "video"
                                          ? "bg-purple-50 text-purple-700 border-purple-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}>
                                        {reqType === "photo" && "📷 PHOTO ONLY"}
                                        {reqType === "video" && "🎥 VIDEO ONLY"}
                                        {reqType === "both" && "📷+🎥 PHOTO & VIDEO REQUIRED"}
                                      </span>}
                                    </div>

                                    {/* Action Buttons based on requirement */}
                                    {!isLocked && reqType !== "none" && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {(reqType === "photo" || reqType === "both") && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenUpload(`${item.id}:::${sub.id}:::photo`)}
                                            className={`text-[9px] font-extrabold uppercase border rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                                              sub.image
                                                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                                : "bg-white text-black border-black hover:bg-black hover:text-white"
                                            }`}
                                            title="Upload photo evidence"
                                          >
                                            <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                                            <span>{sub.image ? "CHANGE PHOTO" : "UPLOAD PHOTO"}</span>
                                          </button>
                                        )}

                                        {(reqType === "video" || reqType === "both") && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenUpload(`${item.id}:::${sub.id}:::video`)}
                                            className={`text-[9px] font-extrabold uppercase border rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                                              sub.video
                                                ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                : "bg-white text-black border-black hover:bg-black hover:text-white"
                                            }`}
                                            title="Upload video evidence"
                                          >
                                            <span className="material-symbols-outlined text-[13px]">videocam</span>
                                            <span>{sub.video ? "CHANGE VIDEO" : "UPLOAD VIDEO"}</span>
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {/* Evidence Previews */}
                                    {(sub.image || sub.video) && (
                                      <div className="flex flex-wrap gap-3 mt-1 pt-2 border-t border-gray-100">
                                        {/* Photo Evidence Preview */}
                                        {sub.image && (
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-gray-500 uppercase">📷 Photo Evidence</span>
                                            <div className="relative w-24 h-24 rounded-lg border-2 border-black overflow-hidden group shrink-0">
                                              <img src={sub.image} alt={sub.text} className="w-full h-full object-cover" />
                                              {!isLocked && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveSubtaskEvidence(item.id, sub.id, "photo")}
                                                  className="absolute top-1 right-1 bg-[#D32F2F] text-white p-1 rounded-full hover:bg-black transition-all cursor-pointer opacity-90 group-hover:opacity-100 flex items-center justify-center shadow-md"
                                                  title="Remove photo evidence"
                                                >
                                                  <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Video Evidence Preview */}
                                        {sub.video && (
                                          <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-purple-700 uppercase">🎥 Video Evidence</span>
                                            <div className="relative w-28 h-24 rounded-lg border-2 border-purple-900 overflow-hidden group shrink-0 bg-black">
                                              <video src={sub.video} controls className="w-full h-full object-cover" />
                                              {!isLocked && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveSubtaskEvidence(item.id, sub.id, "video")}
                                                  className="absolute top-1 right-1 bg-[#D32F2F] text-white p-1 rounded-full hover:bg-black transition-all cursor-pointer opacity-90 group-hover:opacity-100 flex items-center justify-center z-10 shadow-md"
                                                  title="Remove video evidence"
                                                >
                                                  <span className="material-symbols-outlined text-xs">close</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lower part: Textarea for notes once the item has a result */}
                    {(item.image || item.video || !isAwaiting) && !isProcessing && (
                      <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-in fade-in duration-200">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider block mb-1">
                          {isError ? "Findings / Repair Notes (Required)" : "Notes / Observations (Optional)"} {isLocked && "(Locked)"}
                        </label>
                        <textarea
                          value={item.notes || ""}
                          disabled={isLocked}
                          onChange={(e) => {
                            if (isLocked) return;
                            const val = e.target.value;
                            const updatedChecklist = selectedTask.checklist.map((c) =>
                              c.id === item.id ? { ...c, notes: val } : c
                            );
                            setTasks((prevTasks) =>
                              prevTasks.map((t) =>
                                t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t
                              )
                            );
                            saveChecklistToDatabase(selectedTask.id, updatedChecklist);
                          }}
                          className={`w-full h-14 border border-[#1A1A1A] rounded-lg p-2 text-xs focus:border-[#D32F2F] focus:ring-0 outline-none resize-none font-semibold text-black ${isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                            }`}
                          placeholder={isLocked ? "No details provided" : "Provide details about the inspection result..."}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Custom Task Item Button */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleAddMainTaskItem}
                className="w-full py-4 border-2 border-dashed border-black hover:bg-gray-100 rounded-[20px] bg-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-black my-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg text-[#D32F2F]">add_circle</span>
                <span>+ Add Extra Task Item To Checklist</span>
              </button>
            )}
            {/* Bottom Notes & Submission Panel */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col gap-6">
              {selectedTask.dbStatus === "submitted" ? (
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex flex-col items-center justify-center gap-4 text-center py-6 bg-yellow-50/50 rounded-xl border-2 border-dashed border-yellow-400 p-6">
                    <span className="material-symbols-outlined text-5xl text-yellow-600 animate-pulse">hourglass_empty</span>
                    <h4 className="font-headline-md text-lg font-black uppercase text-black">PM REPORT UNDER REVIEW</h4>
                    <p className="text-xs text-gray-500 font-medium max-w-md font-body-md">
                      This preventative maintenance report has been submitted and is currently awaiting review and approval from the Supervisor/Admin. Task details are locked for editing.
                    </p>
                  </div>
                  <div>
                    <label className="block font-label-md text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
                      Technician Notes (Locked)
                    </label>
                    <div className="w-full min-h-[80px] border-2 border-[#1A1A1A] rounded-[20px] p-4 font-body-md bg-gray-50 text-gray-700 font-semibold text-xs whitespace-pre-wrap">
                      {techNotes || "No notes submitted."}
                    </div>
                  </div>
                </div>
              ) : selectedTask.status === "Completed" || selectedTask.dbStatus === "approved" || selectedTask.dbStatus === "completed" ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center py-6 w-full">
                  <span className="material-symbols-outlined text-5xl text-green-600">verified</span>
                  <h4 className="font-headline-md text-lg font-black uppercase text-black">PM REPORT COMPLETED & VERIFIED</h4>
                  <p className="text-xs text-gray-500 font-medium max-w-md font-body-md">This preventative maintenance report has been audited and approved by the Supervisor. You can download the official PDF report file.</p>
                  <button
                    onClick={() => window.open(`/supervisor/tasks/report-preview?taskId=${selectedTask.id}`, "_blank")}
                    className="bg-[#D32F2F] text-white border-2 border-black rounded-xl px-8 py-4 font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    OPEN / DOWNLOAD OFFICIAL PDF REPORT
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-label-md text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
                      Technician Notes
                    </label>
                    <textarea
                      value={techNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTechNotes(val);
                      }}
                      className="w-full h-28 border-2 border-[#1A1A1A] rounded-[20px] p-4 font-body-md focus:border-[#D32F2F] outline-none resize-none placeholder-gray-400 font-semibold"
                      placeholder="Enter observations, specific measurements, or parts required for follow-up..."
                    ></textarea>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">
                      Next: review flagged items and sign the report.
                    </p>

                    <button
                      onClick={handleSubmitReport}
                      className="w-full sm:w-auto bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full px-10 py-4 font-bold text-sm hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-3 uppercase cursor-pointer border-none"
                    >
                      Next Step
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </main>
      ) : (
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-300">

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-[#D32F2F]">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Active Checklist Tasks
                  </span>
                  <span className="material-symbols-outlined text-[#D32F2F]">pending_actions</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{activeTasksCount}</p>
                  <p className="text-xs text-red-600 font-bold uppercase mt-1">Checklist progress incomplete</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-black">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pending Verification
                  </span>
                  <span className="material-symbols-outlined text-black">hourglass_empty</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-extrabold text-black tracking-tighter">{pendingTasksCount}</p>
                  <p className="text-xs text-gray-700 font-bold uppercase mt-1">Awaiting Lead Auditor Review</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-green-600">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Verified / Completed Tasks
                  </span>
                  <span className="material-symbols-outlined text-green-600">verified</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-extrabold text-green-600 tracking-tighter">{completedTasksCount}</p>
                  <p className="text-xs text-green-700 font-bold uppercase mt-1">Archived & signed off</p>
                </div>
              </div>
            </div>

            {/* Filter and Control Panel */}
            <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
              <div className="flex flex-wrap gap-4 flex-grow lg:flex-nowrap">

                {/* Search */}
                <div className="flex-grow min-w-[200px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Search Tasks
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, Asset, Title..."
                      className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none bg-white font-body-md"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Status / Page
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Date Filter: Start Date */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>

                {/* Date Filter: End Date */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>

                {/* Reset Filters button */}
                {(searchQuery || categoryFilter !== "All Categories" || statusFilter !== "All Statuses" || startDate || endDate) && (
                  <div className="flex items-center">
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 px-5 py-3 border-2 border-[#1A1A1A] rounded-[20px] font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer bg-white text-[#1A1A1A] mb-[2px]"
                    >
                      <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                      Reset
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Tasks Bento Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {paginatedTasks.length === 0 ? (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-[20px]">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
                  <p className="font-extrabold uppercase text-gray-500 tracking-wider text-xs">No tasks match your filters</p>
                </div>
              ) : (
                paginatedTasks.map((task) => {
                  const isActive = task.status === "Active";
                  const isPending = task.status === "Pending";
                  const isCompleted = task.status === "Completed";

                  return (
                    <div
                      key={task.id}
                      className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 hover:border-[#D32F2F] transition-all duration-200 flex flex-col justify-between gap-6 relative"
                    >
                      {/* Card Top Label Row */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="border-2 border-[#D32F2F] text-[#D32F2F] px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                            {task.category}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider text-white ${task.dbStatus === "approved" || task.dbStatus === "completed"
                          ? "bg-green-600"
                          : task.dbStatus === "submitted"
                            ? "bg-[#D32F2F]"
                            : task.dbStatus === "rejected"
                              ? "bg-orange-600"
                              : task.dbStatus === "in_progress"
                                ? "bg-[#2F80ED]"
                                : "bg-[#1A1A1A]"
                          }`}>
                          {task.dbStatus === "pending"
                            ? "Awaiting Start"
                            : task.dbStatus === "in_progress"
                              ? "In Progress"
                              : task.dbStatus === "submitted"
                                ? "Submitted"
                                : task.dbStatus === "rejected"
                                  ? "Rejected"
                                  : "Completed"}
                        </span>
                      </div>

                      {/* Card Title & Info */}
                      <div>
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{task.task_code}</span>
                        <h4 className="font-headline-md text-xl font-extrabold text-black leading-tight uppercase mt-1">
                          {task.title}
                        </h4>
                        <p className="text-gray-500 font-bold text-xs mt-2 uppercase tracking-wide">
                          Asset: <span className="text-black">{task.asset}</span> {task.serialNumber && <>• Machine ID: <span className="text-black">{task.serialNumber}</span></>}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 font-semibold uppercase tracking-wide">
                          Location: <span className="text-black font-bold">{task.location}</span> • Techs: {task.techs.join(", ")}
                        </p>
                        {task.supervisor && (
                          <p className="text-[#D32F2F] text-xs mt-1 font-bold uppercase tracking-wide">
                            Supervisor: <span className="text-black font-extrabold">{task.supervisor}</span>
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Row */}
                      <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {task.time}
                        </span>

                        {task.dbStatus === "pending" ? (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="px-5 py-2 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer bg-[#2F80ED] text-white hover:bg-black hover:border-black"
                          >
                            Start Task
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (task.dbStatus === "approved" || task.dbStatus === "completed") {
                                window.open(`/supervisor/tasks/report-preview?taskId=${task.id}`, "_blank");
                              } else {
                                setSelectedTaskId(task.id);
                                setTechNotes(task.techNotes || "");
                              }
                            }}
                            className={`px-5 py-2 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${task.dbStatus === "in_progress" || task.dbStatus === "rejected"
                              ? "bg-[#D32F2F] text-white hover:bg-black hover:border-black"
                              : "bg-white text-black hover:bg-black/5"
                              }`}
                          >
                            {task.dbStatus === "submitted"
                              ? "Awaiting Audit"
                              : task.dbStatus === "approved" || task.dbStatus === "completed"
                                ? "View PDF"
                                : "Open Checklist"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <footer className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
                <p className="text-xs font-bold text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-bold text-xs uppercase transition-all cursor-pointer ${currentPage === page
                          ? "bg-[#D32F2F] text-white border-2 border-[#D32F2F]"
                          : "border-2 border-[#1A1A1A] hover:bg-gray-100 text-black bg-transparent"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </footer>
            )}

          </div>
        </main>
      )}



      {/* Hidden real file input trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRealFileUpload}
        accept={uploadTargetId?.includes(":::video") ? "video/*" : "image/*,video/*"}
        className="hidden"
      />

      {/* Upload Media Modal Dialog */}
      {uploadTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUploadTargetId(null)}></div>
          <div className="relative bg-white border-4 border-black p-8 rounded-[24px] max-w-md w-full z-10 flex flex-col gap-6 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
              <h3 className="font-headline-md text-base uppercase font-black tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {uploadTargetId.includes(":::video") ? "videocam" : "perm_media"}
                </span>
                {uploadTargetId.includes(":::video") ? "Upload Evidence Video" : "Upload Evidence Media"}
              </h3>
              <button
                onClick={() => setUploadTargetId(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide leading-relaxed">
              {uploadTargetId.includes(":::video")
                ? "Capture or choose video proof of work (.mp4, .mov, .webm):"
                : "Capture or choose proof of work. Please upload real photo or video from your device (template images are for reference only):"}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="border-2 border-gray-300 rounded-[16px] overflow-hidden p-2 flex flex-col gap-2 text-center bg-gray-50 opacity-60 cursor-not-allowed relative group"
              >
                <div className="h-20 w-full overflow-hidden rounded-[10px] border border-black/10 select-none pointer-events-none">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U"
                    className="w-full h-full object-cover"
                    alt="Inspection 1"
                  />
                </div>
                <span className="font-extrabold text-[9px] uppercase tracking-wide text-gray-400">Example: Air Mesh (Static)</span>
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Reference Only</span>
                </div>
              </div>

              <div
                className="border-2 border-gray-300 rounded-[16px] overflow-hidden p-2 flex flex-col gap-2 text-center bg-gray-50 opacity-60 cursor-not-allowed relative group"
              >
                <div className="h-20 w-full overflow-hidden rounded-[10px] border border-black/10 select-none pointer-events-none">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y"
                    className="w-full h-full object-cover"
                    alt="Inspection 2"
                  />
                </div>
                <span className="font-extrabold text-[9px] uppercase tracking-wide text-gray-400">Example: Grille (Static)</span>
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Reference Only</span>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="col-span-2 border-2 border-black rounded-[12px] py-3.5 hover:bg-[#1A1A1A] hover:text-white transition-all font-black text-xs uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 bg-white"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                {uploadTargetId.includes(":::video") ? "Upload Video File" : "Upload Photo / Video File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Containers */}
      <div className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border-2 border-[#1A1A1A] bg-white text-black animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <span
              className={`material-symbols-outlined ${toast.type === "success"
                ? "text-green-600"
                : toast.type === "error"
                  ? "text-[#D32F2F]"
                  : "text-blue-500"
                }`}
            >
              {toast.type === "success"
                ? "check_circle"
                : toast.type === "error"
                  ? "error"
                  : "info"}
            </span>
            <span className="font-label-md text-xs uppercase font-bold">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Custom Professional Add Subtask Modal Dialog */}
      {addSubtaskModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}></div>
          <div className="relative bg-white border-4 border-black p-8 rounded-[24px] max-w-md w-full z-10 flex flex-col gap-6 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D32F2F] text-xl font-bold">add_circle</span>
                <h3 className="font-headline-md text-base uppercase font-black tracking-tight">Add New Subtask</h3>
              </div>
              <button
                onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}
                className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleConfirmAddSubtask} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2 opacity-70">Subtask Detail / Requirement *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={subtaskInputText}
                  onChange={(e) => setSubtaskInputText(e.target.value)}
                  placeholder="E.G. CHECK PRESSURE GAUGE CALIBRATION"
                  className="w-full h-12 px-4 rounded-xl border-2 border-black font-bold uppercase text-xs outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2 opacity-70">Evidence Requirement *</label>
                <select
                  value={subtaskMediaType}
                  onChange={(e) => setSubtaskMediaType(e.target.value as any)}
                  className="w-full h-12 px-3 rounded-xl border-2 border-black font-bold uppercase text-xs outline-none bg-white cursor-pointer"
                >
                  <option value="none">☑ CHECKBOX ONLY</option>
                  <option value="photo">📷 PHOTO ONLY</option>
                  <option value="video">🎥 VIDEO ONLY</option>
                  <option value="both">📷+🎥 PHOTO & VIDEO REQUIRED</option>
                </select>
              </div>

              <div className="pt-4 border-t-2 border-black flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}
                  className="px-5 py-2.5 rounded-xl border-2 border-black bg-white font-black text-xs uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border-2 border-black bg-[#D32F2F] text-white font-black text-xs uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
                >
                  Add Subtask
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Professional Add Extra Task Item Modal Dialog */}
      {addExtraItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddExtraItemModalOpen(false)}></div>
          <div className="relative bg-white border-4 border-black p-8 rounded-[24px] max-w-lg w-full z-10 flex flex-col gap-6 text-left shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <header className="flex justify-between items-center pb-4 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D32F2F] text-xl font-bold">post_add</span>
                <h3 className="font-headline-md text-base uppercase font-black tracking-tight">Add Extra Task Item</h3>
              </div>
              <button
                onClick={() => setAddExtraItemModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleConfirmAddMainTaskItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-70">Task Title / Inspection Area *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={extraItemTitleInput}
                  onChange={(e) => setExtraItemTitleInput(e.target.value)}
                  placeholder="E.G. AUXILIARY VALVE CHECK"
                  className="w-full h-12 px-4 rounded-xl border-2 border-black font-bold uppercase text-xs outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-70">Description / Instructions</label>
                <textarea
                  value={extraItemDescInput}
                  onChange={(e) => setExtraItemDescInput(e.target.value)}
                  placeholder="Additional inspection instructions..."
                  rows={2}
                  className="w-full p-3 rounded-xl border-2 border-black font-bold text-xs outline-none focus:border-[#D32F2F] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-70">Priority / Type</label>
                  <select
                    value={extraItemTypeInput}
                    onChange={(e) => setExtraItemTypeInput(e.target.value as any)}
                    className="w-full h-12 px-3 rounded-xl border-2 border-black font-bold uppercase text-xs outline-none bg-white cursor-pointer"
                  >
                    <option value="optional">OPTIONAL</option>
                    <option value="required">REQUIRED</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-70">Evidence Requirement</label>
                  <select
                    value={extraItemMediaTypeInput}
                    onChange={(e) => setExtraItemMediaTypeInput(e.target.value as any)}
                    className="w-full h-12 px-3 rounded-xl border-2 border-black font-bold uppercase text-xs outline-none bg-white cursor-pointer"
                  >
                    <option value="none">CHECKBOX ONLY</option>
                    <option value="photo">PHOTO REQUIRED</option>
                    <option value="video">VIDEO REQUIRED</option>
                    <option value="both">PHOTO & VIDEO REQUIRED</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-black flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddExtraItemModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border-2 border-black bg-white font-black text-xs uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border-2 border-black bg-[#D32F2F] text-white font-black text-xs uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
                >
                  Add Task Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Lookup Modal */}
      <AssetLookupModal isOpen={isAssetLookupOpen} onClose={() => setIsAssetLookupOpen(false)} />
    </div>
  );
}
