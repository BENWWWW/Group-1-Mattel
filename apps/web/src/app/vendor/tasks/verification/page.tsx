"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FlaggedItem {
  id: string;
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
}

const INITIAL_FLAGGED_ITEMS: FlaggedItem[] = [
  {
    id: "flagged-1",
    title: "HVAC Filter Replacement",
    issueType: "Missing Photo",
    issueColor: "bg-[#D32F2F]",
    subColor: "text-[#D32F2F]",
    icon: "image_not_supported",
    confidence: 64,
    location: "East Wing, Roof Sector 4",
    assetId: "ID-8821",
    date: "Oct 24, 2023",
    explanation: "AI Vision could not detect a new filter in the uploaded evidence. The image appears to show the old unit or is too blurry for verification.",
    hasPhoto: false,
  },
  {
    id: "flagged-2",
    title: "Fire Alarm Testing",
    issueType: "Low Confidence (64%)",
    issueColor: "bg-[#1A1A1A]",
    subColor: "text-[#1A1A1A]",
    icon: "warning",
    confidence: 64,
    location: "Floor 2, Control Room B",
    assetId: "ID-4022",
    date: "Oct 24, 2023",
    explanation: "Thermal signature analysis indicates anomalous heat profile on wiring contacts. Evidence picture contrast is below baseline verification index.",
    hasPhoto: true,
  },
  {
    id: "flagged-3",
    title: "Elevator Shaft Lubrication",
    issueType: "Old Asset Data",
    issueColor: "border-2 border-[#1A1A1A]",
    subColor: "text-[#1A1A1A]",
    icon: "history",
    confidence: 78,
    location: "Main Shaft, Level 1-4",
    assetId: "ID-1109",
    date: "Oct 20, 2023",
    explanation: "Last logged physical measurement values match preceding maintenance period exactly. AI flags this as potentially duplicated entry evidence.",
    hasPhoto: true,
  },
];

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function AIVerificationScorePage() {
  const router = useRouter();

  // State for flagged items
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>(INITIAL_FLAGGED_ITEMS);

  // Stats State
  const [totalCount, setTotalCount] = useState(20);
  const [validCount, setValidCount] = useState(17);
  const [reviewCount, setReviewCount] = useState(3);
  const [confidence, setConfidence] = useState(90);

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

  // Open review drawer helper
  const handleOpenReview = (item: FlaggedItem) => {
    setSelectedItem(item);
    setVendorNote("");
    setIsPanelOpen(true);
  };

  // Close drawer
  const handleCloseReview = () => {
    setIsPanelOpen(false);
  };

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Run AI Verification Again
  const handleRunAI = () => {
    if (!selectedItem) return;
    setIsProcessingAI(true);

    setTimeout(() => {
      // Success processing simulation
      const itemToResolve = selectedItem;
      setIsProcessingAI(false);
      setIsPanelOpen(false);

      // Remove from flagged items list
      setFlaggedItems((prev) => prev.filter((item) => item.id !== itemToResolve.id));

      // Update statistics
      setValidCount((prev) => prev + 1);
      setReviewCount((prev) => Math.max(0, prev - 1));
      setConfidence((prev) => Math.min(100, prev + 3));

      // Trigger success toast
      triggerToast("Verification Successful. Neural index re-aligned.", "success");
    }, 1500);
  };

  // Handle final Submit report
  const handleSubmitReport = () => {
    setIsSubmitting(true);
    setSubmitText("Submitting PM Report...");

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setSubmitText("Report Submitted");
      triggerToast("PM Report submitted successfully.", "success");

      setTimeout(() => {
        router.push("/vendor/tasks/confirmation");
      }, 1200);
    }, 2000);
  };

  // Circular progress calculations (Radius = 110, strokeDasharray = 691)
  const offset = 691 - (691 * confidence) / 100;

  return (
    <div className="flex h-screen w-full select-none bg-white text-on-surface font-body-md overflow-hidden relative">
      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="font-label-sm text-[10px] text-white/60 tracking-wider uppercase font-bold">
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
            onClick={() => {
              triggerToast("CLOSING VENDOR TERMINAL...", "info");
              setTimeout(() => router.push("/"), 1000);
            }}
            className="w-full bg-white text-[#D32F2F] hover:bg-white/90 transition-colors py-2 px-4 flex items-center justify-center gap-2 rounded-full font-bold text-xs cursor-pointer border-none mb-4"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Logout</span>
          </button>

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[220px] h-screen flex flex-col relative w-[calc(100%-220px)] bg-white">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-20 px-10 border-b-2 border-[#1A1A1A] bg-white shrink-0 z-40">
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
        <div className="flex-grow overflow-y-auto p-10 bg-white scroll-container">
          <div className="grid grid-cols-12 gap-6 h-full items-start">
            {/* Left: Scores & Confidence Panel */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-[#1A1A1A] text-white p-10 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col items-center justify-center relative overflow-hidden min-h-[500px]">
                {/* High Contrast Background Pattern */}
                <div
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
                    backgroundSize: "10px 10px",
                  }}
                ></div>
                <h3 className="font-label-md text-xs uppercase tracking-[0.2em] mb-8 text-white/80 font-bold">
                  Aggregate Verification
                </h3>

                <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                  {/* Circular Progress SVG */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                    <circle
                      cx="128"
                      cy="128"
                      fill="transparent"
                      r="110"
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="24"
                    ></circle>
                    <circle
                      cx="128"
                      cy="128"
                      fill="transparent"
                      r="110"
                      stroke="#D32F2F"
                      strokeLinecap="square"
                      strokeWidth="24"
                      style={{
                        strokeDasharray: "691",
                        strokeDashoffset: offset,
                        transition: "stroke-dashoffset 1.5s cubic-bezier(0.65, 0, 0.35, 1)",
                      }}
                    ></circle>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[72px] leading-none text-white font-extrabold">
                      {confidence}%
                    </span>
                    <span className="font-bold text-[10px] text-white/80 mt-2 tracking-widest uppercase">
                      CONFIDENCE
                    </span>
                  </div>
                </div>

                <div className="bg-primary border-2 border-primary px-8 py-2 rounded-lg mb-12">
                  <span className="text-white font-black tracking-[0.2em] uppercase text-xs">
                    High Confidence
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 w-full gap-4 text-center">
                  <div className="border-r-2 border-white/20 px-4">
                    <p className="text-white/60 font-bold text-[10px] uppercase mb-1">Total</p>
                    <p className="text-2xl font-extrabold">{totalCount}</p>
                  </div>
                  <div className="border-r-2 border-white/20 px-4">
                    <p className="text-primary font-bold text-[10px] uppercase mb-1">Valid</p>
                    <p className="text-2xl font-extrabold text-primary">{validCount}</p>
                  </div>
                  <div className="px-4">
                    <p className="text-white font-bold text-[10px] uppercase mb-1">Review</p>
                    <p className="text-2xl font-extrabold text-white">{reviewCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Flagged Items */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
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
                      key={item.id}
                      className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary transition-all group duration-300"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 border-[#1A1A1A] shrink-0 ${
                            item.icon === "image_not_supported"
                              ? "bg-primary"
                              : item.icon === "warning"
                              ? "bg-[#1A1A1A]"
                              : "bg-white"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-2xl ${
                              item.icon === "image_not_supported"
                                ? "text-white"
                                : item.icon === "warning"
                                ? "text-primary"
                                : "text-[#1A1A1A]"
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
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                item.id === "flagged-1"
                                  ? "bg-primary"
                                  : item.id === "flagged-2"
                                  ? "bg-[#1A1A1A]"
                                  : "border-2 border-[#1A1A1A] bg-white"
                              }`}
                            ></span>
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
            </div>
          </div>
        </div>

        {/* Sticky Footer Action */}
        <footer className="p-8 bg-white border-t-2 border-[#1A1A1A] flex items-center justify-center shrink-0">
          <button
            onClick={handleSubmitReport}
            disabled={isSubmitting || isSubmitted}
            className={`w-full max-w-4xl h-16 text-white font-bold rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center gap-4 transition-all duration-300 uppercase tracking-[0.2em] active:scale-[0.98] cursor-pointer ${
              isSubmitted
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
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l-2 border-[#1A1A1A] z-[70] transition-transform duration-300 flex flex-col ${
          isPanelOpen ? "translate-x-0" : "translate-x-full"
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
                    <p className="text-xl font-black text-primary">{selectedItem.confidence}%</p>
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
                {selectedItem.hasPhoto ? (
                  <div className="aspect-video border-2 border-[#1A1A1A] rounded-xl overflow-hidden bg-gray-50 relative">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U"
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
                    onClick={() => {
                      setSelectedItem((prev) => (prev ? { ...prev, hasPhoto: true } : null));
                      triggerToast("Replacement photo uploaded successfully.", "success");
                    }}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-[#1A1A1A] font-black uppercase text-[10px] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">upload</span> Upload
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem((prev) => (prev ? { ...prev, hasPhoto: true } : null));
                      triggerToast("Mock device camera accessed. Evidence re-recorded.", "success");
                    }}
                    className="flex items-center justify-center gap-2 py-3 border-2 border-[#1A1A1A] font-black uppercase text-[10px] rounded-lg hover:bg-[#1A1A1A] hover:text-white transition-colors bg-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span> Retake
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
