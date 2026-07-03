"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Define item types for checklist
interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "Pass" | "AI Processing" | "Awaiting" | "Error";
  image?: string;
  evidenceTime?: string;
  errorMessage?: string;
  notes?: string;
}

interface Task {
  id: string;
  title: string;
  asset: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  status: "Active" | "Pending" | "Completed";
  priority: "High" | "Normal";
  due: string;
  date: string;
  location: string;
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE";
  time: string;
  techs: string[];
  checklist: ChecklistItem[];
  supervisor?: string;
  serialNumber?: string;
  techNotes?: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: "TK-8021",
    title: "HVAC Filter Maintenance",
    asset: "Carrier WeatherMaker 50TC",
    category: "HVAC",
    status: "Active",
    priority: "High",
    due: "Oct 24, 2026 (14:00)",
    date: "2026-10-24",
    location: "Main Terminal - Sector G4",
    confidence: "HIGH CONFIDENCE",
    time: "1 hour ago",
    techs: ["JD", "AK"],
    supervisor: "E. Schmidt",
    serialNumber: "SN-HVAC-9082-A",
    checklist: [
      {
        id: "item-1",
        title: "Visual Inspection",
        description: "Main unit casing and exterior structural integrity check.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        evidenceTime: "14:05 PM",
      },
      {
        id: "item-2",
        title: "Filter Condition",
        description: "AI evaluating particulate accumulation and airflow obstruction.",
        status: "AI Processing",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U",
      },
      {
        id: "item-3",
        title: "Belt Tension",
        description: "Measure and log drive belt tension and alignment status.",
        status: "Awaiting",
      },
      {
        id: "item-4",
        title: "Lubrication Points",
        description: "Inspect oil/grease ports for bearing friction and thermal wear.",
        status: "Error",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBqbvpTUTw5nVlHUGPIM_58IuVEriqPH2truMf98NhkI4CNG_mbt19uICYYWVmnNvgB1bKVC3kkf7pXU0PZgutmUg1iaYISbsOoOtOtZTAAL-PIDiUouKVEx6DQjewjujc6lt8rXp0_mDCmwOB1yaeCtAiyjcpVFcgxcdvcr6jd2vNIpiRnI4KgjZd2nYP7IHwx0cadSJNw_YGHt_Mlc6-M5QtwgXrkqUL3EoJPgRsQj_vgra_QgKoI_QIwkri2gjteYJCUIZl0Zmra",
        errorMessage: "AI Analysis Failed: Image clarity too low for verification.",
      },
      {
        id: "item-5",
        title: "Electrical Contacts Check",
        description: "Verify line voltage, phase load balancing and contact wear.",
        status: "Awaiting",
      },
    ],
  },
  {
    id: "TK-7945",
    title: "Emergency Exit Light Testing",
    asset: "Exit Signs Floor 1-3",
    category: "Safety",
    status: "Pending",
    priority: "Normal",
    due: "Oct 26, 2026 (09:00)",
    date: "2026-10-26",
    location: "All Exit Points - Floor 1-3",
    confidence: "HIGH CONFIDENCE",
    time: "2 hours ago",
    techs: ["JD", "MC"],
    supervisor: "E. Schmidt",
    serialNumber: "SN-FST-9082-X",
    checklist: [
      {
        id: "item-1",
        title: "Visual casing check",
        description: "Inspect sign shell for structural integrity and cracking.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        evidenceTime: "11:20 AM",
      },
      {
        id: "item-2",
        title: "Battery backup test",
        description: "Verify illumination continues on secondary reserve cell.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U",
        evidenceTime: "11:25 AM",
      },
    ],
  },
  {
    id: "TK-7832",
    title: "Conveyor Belt Lubrication",
    asset: "Conveyor B-Prime",
    category: "Mechanical",
    status: "Active",
    priority: "High",
    due: "Oct 24, 2026 (16:30)",
    date: "2026-10-24",
    location: "Mechanical Room B - Sublevel 1",
    confidence: "HIGH CONFIDENCE",
    time: "3 hours ago",
    techs: ["JD", "RC"],
    supervisor: "E. Schmidt",
    serialNumber: "SN-SUB-1049-Y",
    checklist: [
      {
        id: "item-1",
        title: "Grease levels",
        description: "Assess housing volume and fluid density.",
        status: "Awaiting",
      },
      {
        id: "item-2",
        title: "Pulley alignment",
        description: "Measure structural alignment parameters.",
        status: "Awaiting",
      },
    ],
  },
  {
    id: "TK-7611",
    title: "Main Breaker Thermal Scan",
    asset: "Breaker Substation B",
    category: "Electrical",
    status: "Completed",
    priority: "Normal",
    due: "Oct 23, 2026 (11:00)",
    date: "2026-10-23",
    location: "Substation B - Assembly Area 2",
    confidence: "LOW CONFIDENCE",
    time: "Completed yesterday",
    techs: ["DM"],
    supervisor: "E. Schmidt",
    serialNumber: "SN-CHL-8834-Z",
    checklist: [
      {
        id: "item-1",
        title: "Thermography scan",
        description: "Scan distribution contacts under steady operational load.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U",
        evidenceTime: "08:45 AM",
      },
    ],
  },
  {
    id: "TK-7422",
    title: "Fire Damper Inspection",
    asset: "Fire Damper Sector 7G",
    category: "Safety",
    status: "Completed",
    priority: "Normal",
    due: "Oct 22, 2026 (15:00)",
    date: "2026-10-22",
    location: "Sector 7G - Administrative Block",
    confidence: "HIGH CONFIDENCE",
    time: "Completed 2 days ago",
    techs: ["JW"],
    supervisor: "E. Schmidt",
    serialNumber: "SN-GEN-8834-A",
    checklist: [
      {
        id: "item-1",
        title: "Fusible link condition",
        description: "Check visual fatigue indicators on link mechanism.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        evidenceTime: "09:30 AM",
      },
    ],
  },
];

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function PMChecklistPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  // Simulated Time
  const [timeStr, setTimeStr] = useState("14:22 PM");

  // Notification Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // AI Chat Assistant Panel State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello Operator #702. I am your HVAC Assist Copilot. I can help resolve image recognition failures, provide specifications, or explain checklist tasks.",
    },
  ]);

  // Evidence Upload Modal State
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  // Run Logout simulation
  const handleLogout = () => {
    triggerToast("CLOSING VENDOR TERMINAL...", "info");
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
    setTimeout(() => {
      router.push("/");
    }, 1200);
  };

  // Load persisted tasks from localStorage after client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("vendor_tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    // Tick current time
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Simulating continuous AI analysis for the selected task's "AI Processing" items
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  useEffect(() => {
    if (!selectedTask) return;
    const processingItem = selectedTask.checklist.find((item) => item.status === "AI Processing");
    if (processingItem) {
      const timer = setTimeout(() => {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === selectedTask.id
              ? {
                  ...t,
                  checklist: t.checklist.map((item) =>
                    item.id === processingItem.id
                      ? {
                          ...item,
                          status: "Pass" as const,
                          evidenceTime: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        }
                      : item
                  ),
                }
              : t
          )
        );
        triggerToast(`${processingItem.title.toUpperCase()} PASSED AUTOMATED AI AUDIT.`, "success");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tasks, selectedTaskId]);



  // Compute progress for selected task
  const doneCount = selectedTask ? selectedTask.checklist.filter((item) => item.status === "Pass").length : 0;
  const totalCheckItems = selectedTask ? selectedTask.checklist.length : 0;
  const progressPercent = totalCheckItems > 0 ? Math.round((doneCount / totalCheckItems) * 100) : 0;

  // Submit PM Report action
  const handleSubmitReport = () => {
    if (!selectedTask) return;

    // Check if any checklist item with an image is missing notes
    const missingNotes = selectedTask.checklist.some((item) => item.image && !item.notes?.trim());
    if (missingNotes) {
      triggerToast("Checklist repair notes are required to explain findings!", "error");
      return;
    }

    triggerToast("COMPILING EVIDENCE & TELEMETRY. LAUNCHING AI AUDIT...", "info");
    
    // Set status to pending in local state
    const targetId = selectedTask.id;
    const updatedTasks = tasks.map((t) =>
      t.id === targetId ? { ...t, status: "Pending" as const, techNotes } : t
    );
    setTasks(updatedTasks);
    if (typeof window !== "undefined") {
      localStorage.setItem("vendor_tasks", JSON.stringify(updatedTasks));
    }

    setTimeout(() => {
      router.push("/vendor/tasks/verification");
    }, 1200);
  };

  // Triggering photo upload simulation
  const handleOpenUpload = (itemId: string) => {
    setUploadTargetId(itemId);
  };

  const handleSelectMockImage = (imageUrl: string) => {
    if (!uploadTargetId || !selectedTask) return;

    const itemId = uploadTargetId;
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              checklist: t.checklist.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status: "AI Processing" as const,
                      image: imageUrl,
                      errorMessage: undefined,
                    }
                  : item
              ),
            }
          : t
      )
    );

    triggerToast(`EVIDENCE REGISTERED. LAUNCHING NEURAL ANALYSIS...`, "info");
    setUploadTargetId(null);
  };

  // Handle AI Assist Questions
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    // Simple reactive AI responses based on keywords
    setTimeout(() => {
      let aiText =
        "Affirmative. Analysing request. Please capture sharp macro closeups of lubrication grease fittings or drive belt grooves to assist recognition.";

      const query = userText.toLowerCase();
      if (query.includes("lubrication") || query.includes("error") || query.includes("failed")) {
        aiText =
          "LUBRICATION FAILURE ADVISORY: Reflection from ambient metal can cause lens flare. Retake the photo directly overhead at a distance of 15cm from the bearing port. Ensure adequate grease presence is visible.";
      } else if (query.includes("belt") || query.includes("tension")) {
        aiText =
          "BELT TENSION VERIFICATION: Target drive belt deflection should be 1/64 inch per inch of span under 4.5 kg force. Submit photo showing tensioner contact alignment.";
      } else if (query.includes("model") || query.includes("spec")) {
        aiText =
          "Specifications: Nominal airflow 400 CFM per ton, requires 2-inch MERV 8 filters. Run current balancing: Phase A 14.2A, Phase B 14.1A, Phase C 14.5A.";
      } else if (query.includes("pressure")) {
        aiText =
          "Standard suction pressure for Carrier R-410A system on floor 4 should hover around 118-125 PSI with superheat target of 12°F.";
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: aiText }]);
    }, 1000);
  };

  // Filter tasks based on Search, Category, Status, and Date Range
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.asset.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "All Categories" || t.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All Statuses" || t.status === statusFilter;

    const matchesDate = (() => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    })();

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

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
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white border-r-2 border-[#1A1A1A]">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
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

      {/* Main Top Navigation Header */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
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
                  {selectedTask.id}
                </h2>
                <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[10px] font-bold text-white uppercase tracking-wider ${
                  selectedTask.status === "Completed" ? "bg-green-600" : selectedTask.status === "Pending" ? "bg-black" : "bg-[#D32F2F]"
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

      </header>

      {/* Main Content Layout */}
      {selectedTask ? (
        /* ================== TASK DETAIL CHECKLIST VIEW ================== */
        <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
          <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-300">
            
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
              </div>

              {/* Progress Component */}
              <div className="bg-white border-2 border-[#1A1A1A] p-6 rounded-[20px] min-w-[320px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-md text-xs font-bold uppercase">
                    PROGRESS {doneCount}/{totalCheckItems}
                  </span>
                  <span className="font-label-md text-xs text-[#D32F2F] font-bold uppercase">
                    {progressPercent}% COMPLETE
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
                    className={`bg-white border-2 rounded-[20px] p-6 flex gap-6 group hover:bg-gray-50 transition-all relative overflow-hidden ${
                      isError ? "border-[#D32F2F]" : "border-[#1A1A1A]"
                    }`}
                  >
                    {/* Left Column: Status Image / Input Slot */}
                    {item.image ? (
                      <div
                        className={`relative w-32 h-32 rounded-[20px] border-2 border-[#1A1A1A] overflow-hidden shrink-0 ${
                          isProcessing ? "blur-[2px]" : ""
                        } ${isError ? "grayscale opacity-40 border-[#D32F2F]" : ""}`}
                      >
                        <img className="w-full h-full object-cover" src={item.image} alt={item.title} />

                        {isPass && (
                          <div className="absolute inset-0 border-4 border-green-600 rounded-full m-2 pointer-events-none opacity-60"></div>
                        )}

                        {isProcessing && (
                          <div className="scanning-line absolute top-0 left-0 w-full h-1.5 z-10 bg-[#D32F2F]"></div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenUpload(item.id)}
                        className="w-32 h-32 rounded-[20px] border-2 border-dashed border-[#1A1A1A] bg-gray-50 flex flex-col items-center justify-center gap-2 shrink-0 hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer group border-none"
                      >
                        <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform text-gray-500">
                          add_a_photo
                        </span>
                        <span className="text-[10px] font-bold tracking-tight">REQUIRED</span>
                      </button>
                    )}

                    {/* Right Column: Title, Description & Action Buttons */}
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4
                            className={`font-headline-md text-md uppercase font-extrabold truncate ${
                              isError ? "text-[#D32F2F]" : "text-black"
                            }`}
                          >
                            {item.title}
                          </h4>

                          {isPass && (
                            <span className="bg-green-600 text-white px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0">
                              Pass
                            </span>
                          )}
                          {isError && (
                            <span className="bg-[#D32F2F] text-white px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0">
                              Error
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1 leading-normal font-semibold">
                          {item.errorMessage || item.description}
                        </p>

                        {item.image && !isProcessing && (
                          <div className="mt-3 flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                              Repair Notes (Required)
                            </label>
                            <textarea
                              value={item.notes || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTasks((prevTasks) =>
                                  prevTasks.map((t) =>
                                    t.id === selectedTask.id
                                      ? {
                                          ...t,
                                          checklist: t.checklist.map((c) =>
                                            c.id === item.id ? { ...c, notes: val } : c
                                          ),
                                        }
                                      : t
                                  )
                                );
                              }}
                              className="w-full h-16 border border-[#1A1A1A] rounded-lg p-2 text-xs focus:border-[#D32F2F] focus:ring-0 outline-none resize-none bg-white font-semibold text-black animate-in fade-in duration-200"
                              placeholder="Explain the repair results for this item..."
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom Status / Buttons */}
                      <div className="mt-4 shrink-0">
                        {isPass && (
                          <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Evidence Logged: {item.evidenceTime || "14:05 PM"}
                          </div>
                        )}

                        {isProcessing && (
                          <div className="flex items-center gap-3">
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-[#D32F2F] border-t-transparent rounded-full"></div>
                            <span className="text-[#D32F2F] font-bold text-xs uppercase italic tracking-wider animate-pulse">
                              AI Processing...
                            </span>
                          </div>
                        )}

                        {isAwaiting && (
                          <button
                            onClick={() => handleOpenUpload(item.id)}
                            className="w-fit border-2 border-black rounded-full px-4 py-1.5 font-bold text-[10px] uppercase hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center gap-2 cursor-pointer bg-transparent"
                          >
                            Capture Evidence
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                          </button>
                        )}

                        {isError && (
                          <button
                            onClick={() => handleOpenUpload(item.id)}
                            className="w-fit bg-[#D32F2F] text-white border-2 border-[#D32F2F] rounded-full px-4 py-1.5 font-bold text-[10px] uppercase hover:bg-black hover:border-black transition-all flex items-center gap-2 cursor-pointer border-none"
                          >
                            Retake Photo
                            <span className="material-symbols-outlined text-sm">refresh</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute top-4 right-4">
                        <span className="material-symbols-outlined text-[#D32F2F] text-lg animate-pulse">
                          cognition
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Notes & Submission Panel */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col gap-6">
              <div>
                <label className="block font-label-md text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mb-2">
                  Technician Notes
                </label>
                <textarea
                  value={techNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTechNotes(val);
                    setTasks((prevTasks) =>
                      prevTasks.map((t) =>
                        t.id === selectedTask.id ? { ...t, techNotes: val } : t
                      )
                    );
                  }}
                  className="w-full h-28 border-2 border-[#1A1A1A] rounded-[20px] p-4 font-body-md focus:border-[#D32F2F] outline-none resize-none placeholder-gray-400 font-semibold"
                  placeholder="Enter observations, specific measurements, or parts required for follow-up..."
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-600 text-xl font-bold">verified_user</span>
                  <p className="text-xs font-bold text-black uppercase tracking-wider">
                    Digital Signature: OPERATOR #702 [Shift A Verified]
                  </p>
                </div>

                <button
                  onClick={handleSubmitReport}
                  className="w-full sm:w-auto bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full px-10 py-4 font-bold text-sm hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-3 uppercase cursor-pointer border-none"
                >
                  Submit PM Report
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>
        </main>
      ) : (
        /* ================== TASKS QUEUE LIST VIEW ================== */
        <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
          <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-300">
            
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
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Safety">Safety</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Facilities">Facilities</option>
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

                {/* Clear Date Filters */}
                {(startDate || endDate) && (
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="px-5 py-3 rounded-[20px] border-2 border-[#D32F2F] text-[#D32F2F] font-bold text-xs uppercase tracking-widest hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer mb-[2px]"
                    >
                      Clear Dates
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
                          <span className="bg-[#1A1A1A]/5 text-gray-500 border border-gray-300 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            {task.confidence}
                          </span>
                        </div>
                        
                        {/* Status badge */}
                        <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
                          isCompleted ? "bg-green-600" : isPending ? "bg-black" : "bg-[#D32F2F]"
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      {/* Card Title & Info */}
                      <div>
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{task.id}</span>
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
                        
                        <button
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setTechNotes(task.techNotes || "");
                          }}
                          className={`px-5 py-2 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#D32F2F] text-white hover:bg-black hover:border-black"
                              : "bg-white text-black hover:bg-black/5"
                          }`}
                        >
                          {isCompleted ? "View Details" : isPending ? "Awaiting Audit" : "Open Checklist"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <footer className="flex justify-between items-center bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
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
                        className={`w-10 h-10 rounded-lg font-bold text-xs uppercase transition-all cursor-pointer ${
                          currentPage === page
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
                    onClick={() => setCurrentPage((prev) => prev + 1)}
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

      {/* Floating AI Assistant Panel */}
      <button
        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#D32F2F] text-white rounded-full border-2 border-[#1A1A1A] flex items-center justify-center hover:scale-110 transition-all z-50 cursor-pointer shadow-lg active:scale-95 border-none"
      >
        <span className="material-symbols-outlined text-3xl text-white">
          {isAssistantOpen ? "close" : "smart_toy"}
        </span>
      </button>

      {isAssistantOpen && (
        <aside className="fixed bottom-28 right-8 w-80 h-[450px] bg-white border-2 border-[#1A1A1A] rounded-[20px] shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <header className="bg-[#D32F2F] text-white px-5 py-4 border-b-2 border-[#1A1A1A] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">smart_toy</span>
              <span className="font-extrabold text-xs tracking-wider uppercase">PM AI ASSISTANT</span>
            </div>
            <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-black tracking-tight uppercase">
              V4.2 Online
            </span>
          </header>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 scroll-container bg-gray-50">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-[15px] p-3 text-xs leading-normal font-semibold ${
                  msg.sender === "user"
                    ? "bg-[#1A1A1A] text-white ml-auto rounded-tr-none"
                    : "bg-white text-black border border-[#1A1A1A]/10 mr-auto rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-black/10 bg-white flex gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask AI Copilot..."
              className="flex-1 border border-black/20 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#D32F2F] placeholder-gray-400 bg-white text-black"
            />
            <button
              type="submit"
              className="bg-[#D32F2F] text-white border border-[#1A1A1A] rounded-md px-3 flex items-center justify-center hover:bg-[#1A1A1A] transition-colors cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-sm text-white">send</span>
            </button>
          </form>
        </aside>
      )}

      {/* Mock Image Upload Modal Dialog */}
      {uploadTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setUploadTargetId(null)}></div>
          <div className="relative bg-white border-2 border-black p-8 rounded-[20px] max-w-md w-full m-4 z-10 flex flex-col gap-6 text-left">
            <header className="flex justify-between items-center pb-3 border-b border-black/10">
              <h3 className="font-headline-md text-sm uppercase font-extrabold">Select Audit Photo Evidence</h3>
              <button onClick={() => setUploadTargetId(null)} className="text-on-surface hover:text-[#D32F2F] border-none bg-transparent cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              Select one of the mock high-definition inspection photos below to simulate direct upload on the device:
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() =>
                  handleSelectMockImage(
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U"
                  )
                }
                className="border border-black/20 rounded-md overflow-hidden p-1 hover:border-[#D32F2F] transition-all flex flex-col gap-1 text-center bg-gray-50 hover:bg-gray-100 font-bold text-[10px] cursor-pointer"
              >
                <div className="h-20 w-full overflow-hidden rounded bg-gray-200">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U"
                    className="w-full h-full object-cover"
                    alt="Inspection 1"
                  />
                </div>
                <span>Inspect Air Mesh</span>
              </button>

              <button
                onClick={() =>
                  handleSelectMockImage(
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y"
                  )
                }
                className="border border-black/20 rounded-md overflow-hidden p-1 hover:border-[#D32F2F] transition-all flex flex-col gap-1 text-center bg-gray-50 hover:bg-gray-100 font-bold text-[10px] cursor-pointer"
              >
                <div className="h-20 w-full overflow-hidden rounded bg-gray-200">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y"
                    className="w-full h-full object-cover"
                    alt="Inspection 2"
                  />
                </div>
                <span>Inspect Drive Grille</span>
              </button>

              <button
                onClick={() =>
                  handleSelectMockImage(
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuBqbvpTUTw5nVlHUGPIM_58IuVEriqPH2truMf98NhkI4CNG_mbt19uICYYWVmnNvgB1bKVC3kkf7pXU0PZgutmUg1iaYISbsOoOtOtZTAAL-PIDiUouKVEx6DQjewjujc6lt8rXp0_mDCmwOB1yaeCtAiyjcpVFcgxcdvcr6jd2vNIpiRnI4KgjZd2nYP7IHwx0cadSJNw_YGHt_Mlc6-M5QtwgXrkqUL3EoJPgRsQj_vgra_QgKoI_QIwkri2gjteYJCUIZl0Zmra"
                  )
                }
                className="border border-black/20 rounded-md overflow-hidden p-1 hover:border-[#D32F2F] transition-all flex flex-col gap-1 text-center bg-gray-50 hover:bg-gray-100 font-bold text-[10px] cursor-pointer col-span-2"
              >
                <div className="h-20 w-full overflow-hidden rounded bg-gray-200">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqbvpTUTw5nVlHUGPIM_58IuVEriqPH2truMf98NhkI4CNG_mbt19uICYYWVmnNvgB1bKVC3kkf7pXU0PZgutmUg1iaYISbsOoOtOtZTAAL-PIDiUouKVEx6DQjewjujc6lt8rXp0_mDCmwOB1yaeCtAiyjcpVFcgxcdvcr6jd2vNIpiRnI4KgjZd2nYP7IHwx0cadSJNw_YGHt_Mlc6-M5QtwgXrkqUL3EoJPgRsQj_vgra_QgKoI_QIwkri2gjteYJCUIZl0Zmra"
                    className="w-full h-full object-cover"
                    alt="Inspection 3"
                  />
                </div>
                <span>Inspect Core Bearing & Fittings</span>
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
              className={`material-symbols-outlined ${
                toast.type === "success"
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
    </div>
  );
}
