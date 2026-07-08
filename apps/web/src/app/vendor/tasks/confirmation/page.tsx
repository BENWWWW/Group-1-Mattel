"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTaskId = searchParams.get("taskId");
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [taskData, setTaskData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [timestamp, setTimestamp] = useState("Oct 24, 2026 | 14:32:01");

  // Trigger Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadUserProfileAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setCurrentUser(profile);
      }

      if (urlTaskId) {
        // Fetch task details
        const { data: tData } = await supabase
          .from("pm_tasks")
          .select(`
            task_code,
            assets (name)
          `)
          .eq("id", urlTaskId)
          .single();
        setTaskData(tData);

        // Fetch latest submitted report details
        const { data: rData } = await supabase
          .from("pm_reports")
          .select("ai_confidence_score, submitted_at")
          .eq("task_id", urlTaskId)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setReportData(rData);

        if (rData?.submitted_at) {
          const auditDate = new Date(rData.submitted_at);
          const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "2-digit",
          };
          const dateStr = auditDate.toLocaleDateString("en-US", options);
          const timeStr = auditDate.toLocaleTimeString("en-US", { hour12: false });
          setTimestamp(`${dateStr} | ${timeStr}`);
        }
      }
    } catch (e) {
      console.error("Failed to load user profile: ", e);
    }
  };

  // Generate dynamic date/time on load
  useEffect(() => {
    loadUserProfileAndData();

    // Trigger Confetti Effect (Red / Black / White particles)
    const createParticle = () => {
      const particle = document.createElement("div");
      const size = Math.random() * 10 + 5;
      const colors = ["#D32F2F", "#1A1A1A", "#FFFFFF"];

      particle.style.position = "fixed";
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.border = "1px solid #1A1A1A";

      const icon = document.getElementById("success-icon");
      let left = window.innerWidth * 0.5 + 110;
      let top = window.innerHeight * 0.4;
      if (icon) {
        const rect = icon.getBoundingClientRect();
        left = rect.left + rect.width / 2;
        top = rect.top + rect.height / 2;
      }

      particle.style.left = `${left}px`;
      particle.style.top = `${top}px`;
      particle.style.zIndex = "60";
      particle.style.borderRadius = "2px";
      particle.style.pointerEvents = "none";

      document.body.appendChild(particle);

      const destinationX = (Math.random() - 0.5) * 800;
      const destinationY = (Math.random() - 0.5) * 600;
      const rotation = Math.random() * 720;

      const animation = particle.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${destinationX}px, ${destinationY}px) rotate(${rotation}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: Math.random() * 1000 + 1000,
          easing: "cubic-bezier(0, .9, .57, 1)",
          fill: "forwards",
        }
      );

      animation.onfinish = () => particle.remove();
    };

    // Pop particles sequential burst
    for (let i = 0; i < 60; i++) {
      setTimeout(createParticle, i * 12);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* CSS Animations style tag */}
      <style jsx global>{`
        @keyframes orbit-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .orbit-spin-class {
          animation: orbit-spin 10s linear infinite;
        }
        * {
          box-shadow: none !important;
        }
      `}</style>

      {/* SideNavBar */}
      <aside className="hidden lg:flex fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] font-bold tracking-widest text-white opacity-70 uppercase">
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

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 left-0 lg:left-[220px] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-6 lg:px-10 z-40">
        <div className="flex items-center gap-4">
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Task Completion
          </h2>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="lg:ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-full lg:w-[calc(100%-220px)] scroll-container pb-20 lg:pb-0">
        {/* Centering Wrapper */}
        <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center p-4 sm:p-12">
          {/* Success Confirmation Card */}
          <div className="relative z-10 w-full max-w-3xl bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 sm:p-12 flex flex-col items-center text-center">
            {/* Animated Success Icon Container */}
            <div className="mb-8 relative">
              <div id="success-icon" className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              {/* Decorative Orbit (Flat Industrial) */}
              <div className="absolute inset-0 -m-4 border-2 border-[#1A1A1A] rounded-full orbit-spin-class">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-primary rounded-full"></div>
              </div>
            </div>

            <h1 className="text-3xl text-[#1A1A1A] mb-2 uppercase font-extrabold tracking-tight">
              PM Report Submitted!
            </h1>
            <p className="text-sm font-medium text-[#1A1A1A]/80 max-w-lg mb-10 leading-relaxed">
              Your preventive maintenance assessment for the regional industrial cluster has been successfully processed by the AI Core.
            </p>

            {/* Submission Summary Card */}
            <div className="w-full bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 sm:p-8 mb-10 text-left grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div className="col-span-1 sm:col-span-2 pb-4 border-b-2 border-[#1A1A1A] flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-[#1A1A1A] font-bold">
                  System Analysis
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-white border-2 border-[#1A1A1A] rounded-full">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Status Verified
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#1A1A1A] opacity-60 mb-1 uppercase font-bold">
                  AI Precision Score
                </p>
                <p className="text-2xl font-extrabold text-primary">
                  {reportData?.ai_confidence_score !== undefined ? `${reportData.ai_confidence_score}/100` : "98/100"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#1A1A1A] opacity-60 mb-1 uppercase font-bold">
                  Asset Reference
                </p>
                <p className="text-sm font-bold text-[#1A1A1A]">
                  {taskData?.assets?.name || "HVAC Unit 4B"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#1A1A1A] opacity-60 mb-1 uppercase font-bold">
                  Process ID
                </p>
                <p className="text-sm font-bold text-[#1A1A1A]">
                  {taskData?.task_code || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#1A1A1A] opacity-60 mb-1 uppercase font-bold">
                  Timestamp
                </p>
                <p className="text-sm font-bold text-[#1A1A1A]">{timestamp}</p>
              </div>
            </div>

            {/* Action Cluster */}
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                onClick={() => {
                  if (urlTaskId) {
                    window.open(`/supervisor/tasks/report-preview?taskId=${urlTaskId}`, "_blank");
                  } else {
                    triggerToast("No task ID found for detailed report.", "error");
                  }
                }}
                className="flex-1 bg-primary text-white border-2 border-[#1A1A1A] rounded-full px-8 py-4 font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
              >
                View Detailed Report
              </button>
              <button
                onClick={() => router.push("/vendor")}
                className="flex-1 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full px-8 py-4 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Verification Metadata */}
            <div className="mt-8 pt-8 border-t-2 border-[#1A1A1A] w-full flex justify-center items-center gap-8 opacity-70">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">shield_with_heart</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">ISO 9001 Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  End-to-End Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              t.type === "success" ? "border-green-700" : "border-primary"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                t.type === "success" ? "text-green-600" : "text-primary"
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

export default function SubmissionConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#D32F2F]">sync</span>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
