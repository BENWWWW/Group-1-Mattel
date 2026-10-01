"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToasts } from "@/lib/useToasts";
import AssetLookupModal from "@/components/AssetLookupModal";
import { type Reading, isNumeric, inRange, limitsText, pickReading } from "@/lib/readings";
import { groupBySection } from "@/lib/sections";

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

interface ChecklistItem extends Reading {
  id: string;
  title: string;
  section?: string;
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
  rejectionReason?: string;
  createdAt?: string;
  assetType?: string;
  assetImage?: string; // admin reference photo of the asset
}

// requireImage is the source of truth for whether an item needs evidence; mediaType says which kind.
const itemMediaType = (c: { requireImage?: boolean; mediaType?: MediaType }): MediaType =>
  c.requireImage ? (c.mediaType && c.mediaType !== "none" ? c.mediaType : "photo") : "none";

export default function PMChecklistPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssetLookupOpen, setIsAssetLookupOpen] = useState(false);
  const [isAssetImageOpen, setIsAssetImageOpen] = useState(false);

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
  const { toasts, triggerToast } = useToasts(4000, "success");

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
            location,
            image_url
          ),
          pm_templates (
            checklist_items
          ),
          profiles:assigned_supervisor_id (
            id,
            full_name
          ),
          pm_reports (
            review_notes,
            submitted_at
          )
        `)
        .eq("assigned_vendor_id", user.id)
        .order("submitted_at", { referencedTable: "pm_reports", ascending: false });

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
        // Task's own saved checklist once started, else a fresh copy of the template's items.
        const fromTemplate = !(Array.isArray(t.checklist) && t.checklist.length > 0);
        const rawChecklist: any[] = fromTemplate ? (t.pm_templates?.checklist_items || []) : t.checklist;
        const checklistMapped: ChecklistItem[] = rawChecklist.map((c: any, index: number) => {
          const type = c.type && c.type !== "optional" ? "required" : "optional";
          return {
            id: c.id || `item-${index}`,
            title: c.title || c.text || c.task || "Checklist Task",
            section: c.section || undefined,
            description: c.description || (fromTemplate
              ? `Priority: ${type.toUpperCase()} | Evidence: ${c.requireImage ? "REQUIRED" : "NOT NEEDED"}`
              : "Operational integrity check."),
            status: c.status || "Awaiting",
            image: c.image || undefined,
            evidenceTime: c.evidenceTime || undefined,
            errorMessage: c.errorMessage || undefined,
            notes: c.notes || undefined,
            type,
            video: c.video || undefined,
            requireImage: !!c.requireImage,
            mediaType: itemMediaType(c),
            subtasks: Array.isArray(c.subtasks) ? c.subtasks : [],
            ...pickReading(c)
          };
        });

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
          // pm_reports is ordered newest first, so [0] is the report the supervisor just rejected
          rejectionReason: t.status === "rejected" ? t.pm_reports?.[0]?.review_notes || undefined : undefined,
          createdAt: t.created_at,
          assetType: t.assets?.type || t.assets?.name || "",
          assetImage: t.assets?.image_url || undefined
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

  // Measured value for "number" items. Without photo evidence, the reading itself decides Pass / Error.
  const handleSetReading = async (itemId: string, raw: string) => {
    if (!selectedTask || isLocked) return;
    const value = raw.trim() === "" || isNaN(Number(raw)) ? undefined : Number(raw);
    const updatedChecklist = selectedTask.checklist.map((item) => {
      if (item.id !== itemId) return item;
      if (item.requireImage) return { ...item, value };
      const status = value == null ? ("Awaiting" as const) : inRange(item, value) ? ("Pass" as const) : ("Error" as const);
      return {
        ...item,
        value,
        status,
        evidenceTime: status === "Awaiting" ? undefined : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        errorMessage: status === "Error" ? `Out of spec: ${value} ${item.unit || ""} (spec ${limitsText(item)})` : undefined,
      };
    });
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === selectedTask.id ? { ...t, checklist: updatedChecklist } : t))
    );
    await saveChecklistToDatabase(selectedTask.id, updatedChecklist);
  };

  // AI image quality check via SightEngine API for items in "AI Processing" status
  const checkImageQualityWithAI = async (imageUrl: string, taskId: string) => {
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, taskId }),
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
      const result = await checkImageQualityWithAI(processingItem.image!, selectedTask.id);

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

        // Wrong machine in photo — reject regardless of quality
        if (result.machineMatch && !result.machineMatch.match) {
          newStatus = "Error";
          errorMessage = `AI couldn't confirm the machine (${selectedTask.asset}): ${result.machineMatch.reason} Re-upload, or if this is the correct machine, explain in the notes and submit.`;
        }
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
      if (!item.requireImage) return false;
      if (item.mediaType === "both") return !item.image || !item.video;
      return item.mediaType === "video" ? !item.video : !item.image;
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

    // Reading items need their measured value
    const missingReadings = selectedTask.checklist.filter((item) => {
      if (item.type === "optional" && item.status === "Awaiting") {
        return false;
      }
      return isNumeric(item) && item.value == null;
    });
    if (missingReadings.length > 0) {
      triggerToast(`Cannot proceed! ${missingReadings.length} checklist items still need a measured value.`, "error");
      return;
    }

    // Check if any checklist item with an Error status or out-of-spec reading is missing repair notes
    const missingNotes = selectedTask.checklist.some((item) =>
      (item.status === "Error" || (isNumeric(item) && item.value != null && !inRange(item, item.value))) && !item.notes?.trim()
    );
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

  // Evidence kind the upload target accepts: subtask buttons carry it as a ":::photo"/":::video"
  // suffix, main items use their mediaType.
  const uploadTargetKind = (target: string | null): "photo" | "video" | "both" => {
    if (!target) return "both";
    const [itemId, , suffix] = target.split(":::");
    if (suffix === "photo" || suffix === "video") return suffix;
    const mediaType = selectedTask?.checklist.find((i) => i.id === itemId)?.mediaType;
    return mediaType === "video" || mediaType === "both" ? mediaType : "photo";
  };
  const uploadKind = uploadTargetKind(uploadTargetId);
  // Checklist item (and subtask) the open upload dialog is for, shown as "For: ..."
  const [uploadItemId, uploadSubId] = uploadTargetId?.split(":::") ?? [];
  const uploadItem = selectedTask?.checklist.find((i) => i.id === uploadItemId);
  const uploadSub = uploadItem?.subtasks?.find((s) => s.id === uploadSubId);

  // Real File Upload to Supabase Storage (Photo & Video)
  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetId && selectedTask) {
      try {
        const isVideoFile = file.type.startsWith("video") || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
        const mediaLabel = isVideoFile ? "video" : "photo";
        // accept= is only a picker hint, so enforce the required kind here.
        if (uploadKind !== "both" && (uploadKind === "video") !== isVideoFile) {
          triggerToast(`This item requires a ${uploadKind}. Please upload a ${uploadKind} file.`, "error");
          e.target.value = "";
          return;
        }
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
              // On "both" items a video must not override the photo's AI result.
              status: isVideoFile
                ? (item.mediaType === "both" && item.image ? item.status : ("Pass" as const))
                : ("AI Processing" as const),
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
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Loading Checklist Tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-page text-[#1A1A1A] font-body-md overflow-hidden relative">
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
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r border-gray-200">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-semibold text-white leading-tight">MAINTAIN.AI</h1>
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

      {/* Main Top Navigation Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] border-b border-gray-200 bg-white flex justify-between items-center h-20 px-6 lg:px-10 z-40">
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
                <h2 className="font-headline-md text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">
                  {selectedTask.task_code}
                </h2>
                <span className={`px-3 py-0.5 border border-gray-200 rounded-full text-[10px] font-medium text-white uppercase tracking-wider ${selectedTask.status === "Completed" ? "bg-green-600" : selectedTask.status === "Pending" ? "bg-black" : "bg-[#D32F2F]"
                  }`}>
                  {selectedTask.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Inspecting: {selectedTask.asset}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-headline-md text-xl text-[#1A1A1A] font-semibold uppercase tracking-tight">
                Operator Checklist Portal
              </h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Active Maintenance Task List
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssetLookupOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-[20px] bg-white text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer text-[10px] font-semibold uppercase tracking-wider"
            title="Browse Asset Catalog"
          >
            <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
            <span className="hidden sm:inline">Assets</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {selectedTask ? (
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-300">

            {/* Asset being worked on */}
            <section className="bg-white rounded-[20px] p-3 flex items-center gap-4 shadow-sm">
              <div className="w-24 h-20 shrink-0 overflow-hidden rounded-[12px] border border-black/10 bg-gray-50 flex items-center justify-center">
                {selectedTask.assetImage ? (
                  <button type="button" onClick={() => setIsAssetImageOpen(true)} title="View full image" className="w-full h-full cursor-pointer">
                    <img src={selectedTask.assetImage} className="w-full h-full object-cover hover:opacity-80 transition-opacity" alt={selectedTask.asset} />
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-3xl text-gray-300">precision_manufacturing</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-base uppercase text-[#1A1A1A] leading-tight truncate">{selectedTask.asset}</span>
                <span className="text-[10px] font-semibold uppercase text-gray-500">
                  {[selectedTask.serialNumber && `Machine ID: ${selectedTask.serialNumber}`, selectedTask.assetType !== selectedTask.asset && selectedTask.assetType, selectedTask.location].filter(Boolean).join(" · ")}
                </span>
              </div>
            </section>

            {/* Sub-header & Asset Info */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase">
                    {selectedTask.location}
                  </span>
                  <span className="text-gray-500 font-medium text-xs">Category: {selectedTask.category}</span>
                </div>
                <h3 className="font-headline-lg text-2xl text-[#1A1A1A] uppercase font-semibold">
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
                  className="mt-3 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-[#D32F2F] rounded-xl font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">forum</span>
                  <span>Ask Supervisor ({selectedTask.supervisor})</span>
                </button>
              </div>

              {/* Progress Component */}
              <div className="bg-white p-6 rounded-[20px] min-w-[320px] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-md text-xs font-medium uppercase">
                    ITEMS CHECKED {doneCount}/{totalCheckItems}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 border-gray-200 overflow-hidden">
                  <div
                    className="bg-[#D32F2F] h-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </section>

            {/* Supervisor Rejection Reason */}
            {selectedTask.rejectionReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-700">
                  <span className="material-symbols-outlined text-base">assignment_return</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Rejected by Supervisor</span>
                </div>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedTask.rejectionReason}
                </p>
              </div>
            )}

            {/* Admin Notes Section */}
            {selectedTask.adminNotes && (
              <div className="bg-black/5 rounded-[20px] p-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-black">
                  <span className="material-symbols-outlined text-base">sticky_note_2</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Admin Additional Notes</span>
                </div>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed whitespace-pre-wrap">
                  {selectedTask.adminNotes}
                </p>
              </div>
            )}

            {/* Checklist Items Grid, grouped by section (like the blocks on the paper PM card) */}
            <div className="space-y-8">
            {groupBySection(selectedTask.checklist).map(({ section, items }) => (
              <div key={section} className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-2 border-b-2 border-[#1A1A1A]">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-black">{section}</h3>
                  <span className="text-[10px] font-semibold uppercase text-gray-500 shrink-0">
                    {items.filter((i) => i.status === "Pass").length}/{items.length} done
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((item) => {
                const isPass = item.status === "Pass";
                const isProcessing = item.status === "AI Processing";
                const isAwaiting = item.status === "Awaiting";
                const isError = item.status === "Error";
                const outOfSpec = isNumeric(item) && item.value != null && !inRange(item, item.value);

                return (
                  <div
                    key={item.id}
                    className={`bg-white border border-gray-200 rounded-[24px] p-6 flex flex-col justify-between transition-all relative ${isError ? "bg-red-50/30" : ""
                      } ${isLocked ? "" : "hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-lg"
                      }`}
                  >
                    <div className="flex gap-6 items-start">
                      {/* Left Column: Image / Upload Placeholder */}
                      <div className="relative shrink-0">
                        {item.image ? (
                          <div className="relative w-28 h-28 rounded-[16px] border border-gray-200 overflow-hidden group">
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
                                  className="bg-white border border-gray-200 text-[#1A1A1A] font-semibold uppercase rounded-lg px-2 py-0.5 text-[8px] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer border-none w-20 text-center"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(item.id)}
                                  className="bg-[#D32F2F] border border-gray-200 text-white font-semibold uppercase rounded-lg px-2 py-0.5 text-[8px] hover:bg-black transition-all cursor-pointer border-none w-20 text-center"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ) : item.video ? (
                          <div className="relative w-28 h-28 rounded-[16px] border border-purple-900 overflow-hidden bg-black group">
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
                        ) : isNumeric(item) && !item.requireImage ? (
                          <div className="w-28 h-28 rounded-[16px] border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400">
                            <span className="material-symbols-outlined text-3xl">straighten</span>
                            <span className="text-[8px] font-semibold uppercase tracking-tight">Reading</span>
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
                                  className={`h-[52px] rounded-[16px] border border-gray-200 flex items-center justify-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider transition-colors ${active ? activeColor : "bg-white text-black hover:bg-gray-100"} ${isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
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
                            className={`w-28 h-28 rounded-[16px] border border-dashed border-gray-400 bg-gray-50 flex flex-col items-center justify-center gap-1.5 transition-colors p-2 text-center ${isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 hover:border-gray-400 cursor-pointer group"
                              }`}
                          >
                            <span className="material-symbols-outlined text-3xl text-gray-400 transition-transform group-hover:scale-110">
                              {item.mediaType === "video" ? "videocam" : "photo_camera"}
                            </span>
                            <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-tight leading-tight">
                              {item.mediaType === "video" ? "MACHINE VIDEO" : "FULL MACHINE PHOTO"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Right Column: Title, Description & Status */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-headline-md text-sm uppercase font-semibold text-black leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isLocked && (item.id.startsWith("item-") || item.type === "optional") && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMainTaskItem(item.id)}
                                className="text-[9px] font-semibold uppercase text-[#D32F2F] hover:bg-[#D32F2F]/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer border border-[#D32F2F]/30"
                                title="Remove task item from checklist"
                              >
                                <span className="material-symbols-outlined text-xs">delete</span>
                                <span>REMOVE</span>
                              </button>
                            )}
                            <span className={`px-2.5 py-0.5 border border-gray-200 rounded-full text-[9px] font-semibold uppercase tracking-wider text-white shrink-0 ${isPass ? "bg-green-600" : isProcessing ? "bg-yellow-600" : isError ? "bg-[#D32F2F]" : "bg-black"
                              }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed font-semibold">
                          {item.errorMessage || item.description}
                        </p>

                        {isNumeric(item) && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              key={`${item.id}-${item.value ?? ""}`}
                              type="number"
                              step="any"
                              inputMode="decimal"
                              defaultValue={item.value ?? ""}
                              disabled={isLocked}
                              onBlur={(e) => {
                                if (e.target.value !== String(item.value ?? "")) handleSetReading(item.id, e.target.value);
                              }}
                              placeholder="VALUE"
                              className={`w-28 h-9 px-3 rounded-lg border text-sm font-semibold outline-none ${outOfSpec ? "border-[#D32F2F] text-[#D32F2F] bg-red-50" : "border-gray-200 text-black bg-white focus:border-[#D32F2F]"} ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                            />
                            {item.unit && <span className="text-xs font-semibold text-gray-600">{item.unit}</span>}
                            {limitsText(item) && (
                              <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${outOfSpec ? "border-[#D32F2F] text-[#D32F2F]" : "border-gray-200 text-gray-500"}`}>
                                {outOfSpec ? "Out of spec" : "Spec"} {limitsText(item)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quick Action Button for awaiting */}
                        {isAwaiting && !isLocked && item.requireImage && (
                          <button
                            onClick={() => handleOpenUpload(item.id)}
                            className="w-fit border border-gray-200 rounded-full px-4 py-1.5 font-semibold text-[9px] uppercase hover:bg-black hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-white text-black shadow-sm mt-1"
                            title="Capture overall photo of the machine / component being inspected"
                          >
                            <span>CAPTURE FULL MACHINE</span>
                            <span className="material-symbols-outlined text-[13px]">{item.mediaType === "video" ? "videocam" : "photo_camera"}</span>
                          </button>
                        )}
                        {/* "both" items: prompt for whichever of photo/video is still missing */}
                        {item.mediaType === "both" && !isLocked && !isProcessing && (item.image || item.video) && !(item.image && item.video) && (
                          <button
                            onClick={() => handleOpenUpload(item.id)}
                            className="w-fit border border-gray-200 rounded-full px-4 py-1.5 font-semibold text-[9px] uppercase hover:bg-black hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-white text-black shadow-sm mt-1"
                          >
                            <span>{item.image ? "ADD VIDEO" : "ADD PHOTO"}</span>
                            <span className="material-symbols-outlined text-[13px]">{item.image ? "videocam" : "photo_camera"}</span>
                          </button>
                        )}
                        {/* Subtasks Checklist Section */}
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-[10px] font-semibold uppercase text-gray-600 tracking-wider flex items-center gap-1">
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
                                className="text-[10px] font-semibold uppercase text-[#D32F2F] hover:bg-[#D32F2F]/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                <span>ADD SUBTASK</span>
                              </button>
                            )}
                          </div>

                          {(!item.subtasks || item.subtasks.length === 0) ? (
                            <p className="text-[10px] text-gray-400 font-medium italic py-1">No subtasks. Click "+ ADD SUBTASK" to add specific sub-steps.</p>
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
                                        <span className={`text-xs font-semibold uppercase truncate transition-all ${sub.completed ? "line-through text-gray-400" : "text-black"}`}>
                                          {sub.text}
                                        </span>
                                      </label>

                                      {/* Clear Requirement Badge */}
                                      {reqType !== "none" && <span className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded tracking-wide border shrink-0 ${
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
                                            className={`text-[9px] font-semibold uppercase border rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                                              sub.image
                                                ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                                                : "bg-white text-black border-gray-200 hover:bg-black hover:text-white"
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
                                            className={`text-[9px] font-semibold uppercase border rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                                              sub.video
                                                ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                : "bg-white text-black border-gray-200 hover:bg-black hover:text-white"
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
                                            <span className="text-[8px] font-semibold text-gray-500 uppercase">📷 Photo Evidence</span>
                                            <div className="relative w-24 h-24 rounded-lg border border-gray-200 overflow-hidden group shrink-0">
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
                                            <span className="text-[8px] font-semibold text-purple-700 uppercase">🎥 Video Evidence</span>
                                            <div className="relative w-28 h-24 rounded-lg border border-purple-900 overflow-hidden group shrink-0 bg-black">
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
                        <label className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                          {isError || outOfSpec ? "Findings / Repair Notes (Required)" : "Notes / Observations (Optional)"} {isLocked && "(Locked)"}
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
                          className={`w-full h-14 border border-gray-200 rounded-lg p-2 text-xs focus:border-[#D32F2F] focus:ring-0 outline-none resize-none font-semibold text-black ${isLocked ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white"
                            }`}
                          placeholder={isLocked ? "No details provided" : "Provide details about the inspection result..."}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              </div>
            ))}
            </div>

            {/* Add Custom Task Item Button */}
            {!isLocked && (
              <button
                type="button"
                onClick={handleAddMainTaskItem}
                className="w-full py-4 border border-dashed border-gray-200 hover:bg-gray-100 rounded-[20px] bg-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-black my-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg text-gray-400">add_circle</span>
                <span>+ Add Extra Task Item To Checklist</span>
              </button>
            )}
            {/* Bottom Notes & Submission Panel */}
            <div className="bg-white rounded-[20px] p-8 flex flex-col gap-6 shadow-sm">
              {selectedTask.dbStatus === "submitted" ? (
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex flex-col items-center justify-center gap-4 text-center py-6 bg-yellow-50/50 rounded-xl border-dashed border-yellow-400 p-6">
                    <span className="material-symbols-outlined text-5xl text-yellow-600 animate-pulse">hourglass_empty</span>
                    <h4 className="font-headline-md text-lg font-semibold uppercase text-black">PM REPORT UNDER REVIEW</h4>
                    <p className="text-xs text-gray-500 font-medium max-w-md font-body-md">
                      This preventative maintenance report has been submitted and is currently awaiting review and approval from the Supervisor/Admin. Task details are locked for editing.
                    </p>
                  </div>
                  <div>
                    <label className="block font-label-md text-xs font-medium text-[#1A1A1A] uppercase tracking-wider mb-2">
                      Technician Notes (Locked)
                    </label>
                    <div className="w-full min-h-[80px] rounded-[20px] p-4 font-body-md bg-gray-50 text-gray-700 font-semibold text-xs whitespace-pre-wrap">
                      {techNotes || "No notes submitted."}
                    </div>
                  </div>
                </div>
              ) : selectedTask.status === "Completed" || selectedTask.dbStatus === "approved" || selectedTask.dbStatus === "completed" ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center py-6 w-full">
                  <span className="material-symbols-outlined text-5xl text-green-600">verified</span>
                  <h4 className="font-headline-md text-lg font-semibold uppercase text-black">PM REPORT COMPLETED & VERIFIED</h4>
                  <p className="text-xs text-gray-500 font-medium max-w-md font-body-md">This preventative maintenance report has been audited and approved by the Supervisor. You can download the official PDF report file.</p>
                  <button
                    onClick={() => window.open(`/supervisor/tasks/report-preview?taskId=${selectedTask.id}`, "_blank")}
                    className="bg-[#D32F2F] text-white border border-gray-200 rounded-xl px-8 py-4 font-semibold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    OPEN / DOWNLOAD OFFICIAL PDF REPORT
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-label-md text-xs font-medium text-[#1A1A1A] uppercase tracking-wider mb-2">
                      Technician Notes
                    </label>
                    <textarea
                      value={techNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTechNotes(val);
                      }}
                      className="w-full h-28 rounded-[20px] p-4 font-body-md focus:border-[#D32F2F] outline-none resize-none placeholder-gray-400 font-semibold"
                      placeholder="Enter observations, specific measurements, or parts required for follow-up..."
                    ></textarea>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={handleSubmitReport}
                      className="w-full sm:w-auto bg-[#D32F2F] text-white border border-gray-200 rounded-full px-10 py-4 font-medium text-sm hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-3 uppercase cursor-pointer border-none"
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
        <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-page w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
          <div className="min-h-[calc(100vh-80px)] py-6 px-4 lg:py-10 lg:px-10 max-w-[1400px] mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-300">

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Checklist Tasks
                  </span>
                  <span className="material-symbols-outlined text-gray-400">pending_actions</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-semibold text-gray-900 tracking-tighter">{activeTasksCount}</p>
                  <p className="text-xs text-red-600 font-medium uppercase mt-1">Checklist progress incomplete</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending Verification
                  </span>
                  <span className="material-symbols-outlined text-black">hourglass_empty</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-semibold text-black tracking-tighter">{pendingTasksCount}</p>
                  <p className="text-xs text-gray-700 font-medium uppercase mt-1">Awaiting Lead Auditor Review</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified / Completed Tasks
                  </span>
                  <span className="material-symbols-outlined text-green-600">verified</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-semibold text-green-600 tracking-tighter">{completedTasksCount}</p>
                  <p className="text-xs text-green-700 font-medium uppercase mt-1">Archived & signed off</p>
                </div>
              </div>
            </div>

            {/* Filter and Control Panel */}
            <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] shadow-sm">
              <div className="flex flex-wrap gap-4 flex-grow lg:flex-nowrap">

                {/* Search */}
                <div className="flex-grow min-w-[200px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">
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
                      className="w-full pl-10 pr-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none bg-white font-body-md"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">
                    Status / Page
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Date Filter: Start Date */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>

                {/* Date Filter: End Date */}
                <div className="flex-1 min-w-[140px]">
                  <label className="block font-label-sm text-xs font-medium mb-2 uppercase opacity-60 tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border border-gray-200 font-medium text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white cursor-pointer font-body-md"
                  />
                </div>

                {/* Reset Filters button */}
                {(searchQuery || categoryFilter !== "All Categories" || statusFilter !== "All Statuses" || startDate || endDate) && (
                  <div className="flex items-center">
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1 px-5 py-3 border border-gray-200 rounded-[20px] font-medium text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer bg-white text-[#1A1A1A] mb-[2px]"
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
                <div className="col-span-full py-16 text-center border border-dashed border-gray-300 rounded-[20px]">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
                  <p className="font-semibold uppercase text-gray-500 tracking-wider text-xs">No tasks match your filters</p>
                </div>
              ) : (
                paginatedTasks.map((task) => {

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-[20px] p-6 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-6 relative shadow-sm"
                    >
                      {/* Card Top Label Row */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="border border-[#D32F2F] text-[#D32F2F] px-3 py-0.5 rounded-full text-[9px] font-semibold tracking-widest uppercase">
                            {task.category}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span className={`px-3 py-0.5 border border-gray-200 rounded-full text-[9px] font-semibold uppercase tracking-wider text-white ${task.dbStatus === "approved" || task.dbStatus === "completed"
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
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{task.task_code}</span>
                        <h4 className="font-headline-md text-xl font-semibold text-black leading-tight uppercase mt-1">
                          {task.title}
                        </h4>
                        <p className="text-gray-500 font-medium text-xs mt-2 uppercase tracking-wide">
                          Asset: <span className="text-black">{task.asset}</span> {task.serialNumber && <>• Machine ID: <span className="text-black">{task.serialNumber}</span></>}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 font-semibold uppercase tracking-wide">
                          Location: <span className="text-black font-medium">{task.location}</span> • Techs: {task.techs.join(", ")}
                        </p>
                        {task.supervisor && (
                          <p className="text-[#D32F2F] text-xs mt-1 font-medium uppercase tracking-wide">
                            Supervisor: <span className="text-black font-semibold">{task.supervisor}</span>
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Row */}
                      <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                        <span className="text-[10px] text-gray-400 font-medium uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {task.time}
                        </span>

                        {task.dbStatus === "pending" ? (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="px-5 py-2 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer bg-[#2F80ED] text-white hover:bg-black hover:border-gray-400"
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
                            className={`px-5 py-2 border border-gray-200 rounded-xl font-semibold text-xs uppercase tracking-widest transition-all cursor-pointer ${task.dbStatus === "in_progress" || task.dbStatus === "rejected"
                              ? "bg-[#D32F2F] text-white hover:bg-black hover:border-gray-400"
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
              <footer className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[20px] shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium text-xs uppercase transition-all cursor-pointer ${currentPage === page
                          ? "bg-[#D32F2F] text-white border border-[#D32F2F]"
                          : "border border-gray-200 hover:bg-gray-100 text-black bg-transparent"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
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
        accept={{ photo: "image/*", video: "video/*", both: "image/*,video/*" }[uploadKind]}
        className="hidden"
      />

      {/* Upload Media Modal Dialog */}
      {uploadTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUploadTargetId(null)}></div>
          <div className="relative bg-white p-8 rounded-[24px] max-w-md w-full z-10 flex flex-col gap-6 text-left shadow-lg">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200">
              <h3 className="font-headline-md text-base uppercase font-semibold tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {{ photo: "photo_camera", video: "videocam", both: "perm_media" }[uploadKind]}
                </span>
                {{ photo: "Upload Evidence Photo", video: "Upload Evidence Video", both: "Upload Evidence Media" }[uploadKind]}
              </h3>
              <button
                onClick={() => setUploadTargetId(null)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-relaxed">
              {{
                photo: "Capture or choose photo proof of work. Please upload a real photo from your device (the reference photo below is only a guide):",
                video: "Capture or choose video proof of work (.mp4, .mov, .webm):",
                both: "This item needs both a photo and a video. Upload one now, then add the other (the reference photo below is only a guide):",
              }[uploadKind]}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* What to capture: the task's asset (admin reference photo) and the checklist item */}
              <div className="col-span-2 border border-gray-300 rounded-[16px] p-2 flex gap-3 bg-gray-50 relative group">
                <div className="w-28 h-24 shrink-0 overflow-hidden rounded-[10px] border border-black/10 select-none pointer-events-none bg-white flex items-center justify-center">
                  {selectedTask?.assetImage ? (
                    <img src={selectedTask.assetImage} className="w-full h-full object-cover" alt={selectedTask.asset} />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-gray-300">precision_manufacturing</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 text-left">
                  <span className="font-semibold text-[9px] uppercase tracking-wide text-gray-400">Capture this machine</span>
                  <span className="font-semibold text-xs uppercase text-black leading-tight">{selectedTask?.asset}</span>
                  {selectedTask?.serialNumber && (
                    <span className="text-[10px] font-semibold uppercase text-gray-500">Machine ID: {selectedTask.serialNumber}</span>
                  )}
                  {selectedTask?.location && (
                    <span className="text-[10px] font-medium uppercase text-gray-500">{selectedTask.location}</span>
                  )}
                  {uploadItem && (
                    <span className="text-[10px] font-semibold uppercase text-[#D32F2F] leading-tight mt-1">
                      For: {uploadItem.title}{uploadSub ? ` › ${uploadSub.text}` : ""}
                    </span>
                  )}
                </div>
                {selectedTask?.assetImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-[16px] pointer-events-none">
                    <span className="text-[10px] font-medium text-red-600 uppercase tracking-tight">Reference Only — upload your own photo</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="col-span-2 border border-gray-200 rounded-[12px] py-3.5 hover:bg-[#1A1A1A] hover:text-white transition-all font-semibold text-xs uppercase tracking-widest text-center cursor-pointer flex items-center justify-center gap-2 bg-white"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                {{ photo: "Upload Photo File", video: "Upload Video File", both: "Upload Photo / Video File" }[uploadKind]}
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
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border border-gray-200 bg-white text-black animate-in fade-in slide-in-from-top-4 duration-300"
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
            <span className="font-label-md text-xs uppercase font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Custom Professional Add Subtask Modal Dialog */}
      {addSubtaskModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}></div>
          <div className="relative bg-white p-8 rounded-[24px] max-w-md w-full z-10 flex flex-col gap-6 text-left shadow-lg">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-xl font-medium">add_circle</span>
                <h3 className="font-headline-md text-base uppercase font-semibold tracking-tight">Add New Subtask</h3>
              </div>
              <button
                onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleConfirmAddSubtask} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-2 opacity-70">Subtask Detail / Requirement *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={subtaskInputText}
                  onChange={(e) => setSubtaskInputText(e.target.value)}
                  placeholder="E.G. CHECK PRESSURE GAUGE CALIBRATION"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 font-medium uppercase text-xs outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-2 opacity-70">Evidence Requirement *</label>
                <select
                  value={subtaskMediaType}
                  onChange={(e) => setSubtaskMediaType(e.target.value as any)}
                  className="w-full h-12 px-3 rounded-xl border border-gray-200 font-medium uppercase text-xs outline-none bg-white cursor-pointer"
                >
                  <option value="none">☑ CHECKBOX ONLY</option>
                  <option value="photo">📷 PHOTO ONLY</option>
                  <option value="video">🎥 VIDEO ONLY</option>
                  <option value="both">📷+🎥 PHOTO & VIDEO REQUIRED</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddSubtaskModal({ isOpen: false, itemId: null })}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-xs uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-[#D32F2F] text-white font-semibold text-xs uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
                >
                  Add Subtask
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Image Pop-up */}
      {isAssetImageOpen && selectedTask?.assetImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAssetImageOpen(false)}></div>
          <div className="relative bg-white p-4 rounded-[24px] max-w-3xl w-full z-10 flex flex-col gap-3 shadow-lg">
            <header className="flex justify-between items-center gap-3">
              <h3 className="font-headline-md text-sm uppercase font-semibold tracking-tight truncate">
                {selectedTask.asset}{selectedTask.serialNumber ? ` · ${selectedTask.serialNumber}` : ""}
              </h3>
              <button
                onClick={() => setIsAssetImageOpen(false)}
                className="w-8 h-8 shrink-0 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>
            <img src={selectedTask.assetImage} className="w-full max-h-[75vh] object-contain rounded-[16px]" alt={selectedTask.asset} />
          </div>
        </div>
      )}

      {/* Custom Professional Add Extra Task Item Modal Dialog */}
      {addExtraItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddExtraItemModalOpen(false)}></div>
          <div className="relative bg-white p-8 rounded-[24px] max-w-lg w-full z-10 flex flex-col gap-6 text-left shadow-lg">
            <header className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-xl font-medium">post_add</span>
                <h3 className="font-headline-md text-base uppercase font-semibold tracking-tight">Add Extra Task Item</h3>
              </div>
              <button
                onClick={() => setAddExtraItemModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer bg-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </header>

            <form onSubmit={handleConfirmAddMainTaskItem} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1 opacity-70">Task Title / Inspection Area *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={extraItemTitleInput}
                  onChange={(e) => setExtraItemTitleInput(e.target.value)}
                  placeholder="E.G. AUXILIARY VALVE CHECK"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 font-medium uppercase text-xs outline-none focus:border-[#D32F2F]"
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1 opacity-70">Description / Instructions</label>
                <textarea
                  value={extraItemDescInput}
                  onChange={(e) => setExtraItemDescInput(e.target.value)}
                  placeholder="Additional inspection instructions..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-gray-200 font-medium text-xs outline-none focus:border-[#D32F2F] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider block mb-1 opacity-70">Priority / Type</label>
                  <select
                    value={extraItemTypeInput}
                    onChange={(e) => setExtraItemTypeInput(e.target.value as any)}
                    className="w-full h-12 px-3 rounded-xl border border-gray-200 font-medium uppercase text-xs outline-none bg-white cursor-pointer"
                  >
                    <option value="optional">OPTIONAL</option>
                    <option value="required">REQUIRED</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider block mb-1 opacity-70">Evidence Requirement</label>
                  <select
                    value={extraItemMediaTypeInput}
                    onChange={(e) => setExtraItemMediaTypeInput(e.target.value as any)}
                    className="w-full h-12 px-3 rounded-xl border border-gray-200 font-medium uppercase text-xs outline-none bg-white cursor-pointer"
                  >
                    <option value="none">CHECKBOX ONLY</option>
                    <option value="photo">PHOTO REQUIRED</option>
                    <option value="video">VIDEO REQUIRED</option>
                    <option value="both">PHOTO & VIDEO REQUIRED</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddExtraItemModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-xs uppercase tracking-wider hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-[#D32F2F] text-white font-semibold text-xs uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
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
