"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Define Task interface matching the industrial requirements
interface Task {
  id: string;
  title: string;
  priority: "High" | "Normal";
  status: "Active" | "Pending" | "Completed";
  location: string;
  due: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE";
  techs: string[];
  time: string;
  icon: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: "TK-8021",
    title: "HVAC Filter Maintenance",
    priority: "High",
    status: "Active",
    location: "Main Terminal - Sector G4",
    due: "Oct 24, 2026 (14:00)",
    category: "HVAC",
    confidence: "HIGH CONFIDENCE",
    techs: ["JD", "AK"],
    time: "1 hour ago",
    icon: "air",
  },
  {
    id: "TK-7945",
    title: "Emergency Exit Light Testing",
    priority: "Normal",
    status: "Pending",
    location: "All Exit Points - Floor 1-3",
    due: "Oct 26, 2026 (09:00)",
    category: "Safety",
    confidence: "HIGH CONFIDENCE",
    techs: ["JD", "MC"],
    time: "2 hours ago",
    icon: "exit_to_app",
  },
  {
    id: "TK-7832",
    title: "Conveyor Belt Lubrication",
    priority: "High",
    status: "Active",
    location: "Mechanical Room B - Sublevel 1",
    due: "Oct 24, 2026 (16:30)",
    category: "Mechanical",
    confidence: "HIGH CONFIDENCE",
    techs: ["JD", "RC"],
    time: "3 hours ago",
    icon: "oil_barrel",
  },
  {
    id: "TK-7611",
    title: "Main Breaker Thermal Scan",
    priority: "Normal",
    status: "Completed",
    location: "Substation B - Assembly Area 2",
    due: "Oct 23, 2026 (11:00)",
    category: "Electrical",
    confidence: "LOW CONFIDENCE",
    techs: ["DM"],
    time: "Completed yesterday",
    icon: "bolt",
  },
  {
    id: "TK-7422",
    title: "Fire Damper Inspection",
    priority: "Normal",
    status: "Completed",
    location: "Sector 7G - Administrative Block",
    due: "Oct 22, 2026 (15:00)",
    category: "Safety",
    confidence: "HIGH CONFIDENCE",
    techs: ["JW"],
    time: "Completed 2 days ago",
    icon: "fire_extinguisher",
  },
];

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function VendorDashboardPage() {
  const router = useRouter();

  // Tasks state
  const [tasks] = useState<Task[]>(INITIAL_TASKS);

  // Notifications Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

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

  // Calculate dynamic stats
  const activeCount = tasks.filter((t) => t.status === "Active").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div
      className="flex h-screen w-full select-none bg-white text-[#1A1A1A] font-body-md overflow-hidden relative"
    >
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

      {/* Fixed Sidebar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-2">
          {/* Active Navigation: Dashboard (rounded-full) */}
          <button className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              dashboard
            </span>
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

          <button
            onClick={() => router.push("/vendor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assessment</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* User Footer Profile */}
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

      {/* Top NavBar (aligned with Admin Dashboard style) */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Vendor Dashboard
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            Field Operations & Task Execution
          </p>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => triggerToast("Vendor notifications: nominal. No new alerts.", "info")}
            className="relative p-2 hover:bg-[#D32F2F]/10 rounded-full transition-all cursor-pointer border-none bg-transparent flex items-center justify-center outline-none"
          >
            <span className="material-symbols-outlined text-[#1A1A1A]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D32F2F] rounded-full border border-white"></span>
          </button>
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkcXzppBB6fuF01AvoMkYO_AOqmpkcq3D2Vlss7eZ_ZAD8O3zoshCALMS0lGvJ0suvCu7yCme9VBwgGW0_5gWcKdEhZpezn9UL5gM3Q6sFoD1w1AtYSkaBEsK9LvfsRGytarIgnQDyvH4RSrhJ4Uk8QzCn2YYVKs1xbRHYlntioLqTlBA03RqqQrOvg3RDTFG_jhPxbfLxjGwtWXlawO997mjbvuWuGMta8W2b_9-wqNJlv8AsFrQwXO_F27qzdnPfDeWPGD1IuyKP"
              alt="User Profile"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="p-10 max-w-[1400px] mx-auto space-y-10">
          
          {/* Stats Overview Grid (Adapted from Admin Dashboard style) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Active Tasks", value: activeCount, icon: "assignment", delta: "Assigned to your shift" },
              { label: "Pending Review", value: pendingCount, icon: "schedule", delta: "Awaiting supervisor signoff" },
              { label: "Completed Tasks", value: completedCount, icon: "check_circle", delta: "Archived this week" },
              { label: "Compliance Score", value: "98%", icon: "verified", delta: "Nominal rating grade A" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <span className="material-symbols-outlined text-[#D32F2F]">{stat.icon}</span>
                </div>
                <div className="mt-4">
                  <p className="text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-bold mt-1">{stat.delta}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Access Panel (Adapted from Admin Dashboard style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Operator Tasks", desc: "View and execute active maintenance checklists", icon: "assignment", path: "/vendor/tasks" },
              { label: "Preventive Maintenance", desc: "Track scheduled preventative maintenance runs", icon: "settings_applications", path: "/vendor/pm" },
              { label: "Task Reports", desc: "Access completed inspection logs & downloads", icon: "assessment", path: "/vendor/reports" },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => router.push(card.path)}
                className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col gap-4 hover:border-[#D32F2F] transition-all text-left cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#D32F2F] text-4xl">{card.icon}</span>
                <div className="flex-grow">
                  <h3 className="font-extrabold text-base uppercase tracking-tight group-hover:text-[#D32F2F] transition-colors">{card.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                </div>
                <span className="material-symbols-outlined text-gray-300 group-hover:text-[#D32F2F] transition-colors self-end">arrow_forward</span>
              </button>
            ))}
          </div>

        </div>
      </main>

      {/* Floating Toast Notification Containers */}
      <div className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border-2 border-on-surface bg-white text-on-surface animate-in fade-in slide-in-from-top-4 duration-300"
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
