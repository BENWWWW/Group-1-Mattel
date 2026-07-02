"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PMRecord {
  id: string;
  assetName: string;
  status: "Approved" | "Rejected" | "Pending Review";
  date: string; // e.g. "October 2023" or "September 2023"
  score: number;
}

const ALL_MOCK_RECORDS: PMRecord[] = [
  // Page 1 (October 2023)
  { id: "#PM-88241", assetName: "Water Chiller Loop 2", status: "Pending Review", date: "October 2023", score: 85 },
  { id: "#PM-88219", assetName: "HVAC Chiller Unit A-1", status: "Approved", date: "October 2023", score: 92 },
  { id: "#PM-88104", assetName: "Main Power Generator", status: "Rejected", date: "October 2023", score: 48 },
  { id: "#PM-87942", assetName: "Conveyor Belt System B", status: "Approved", date: "September 2023", score: 98 },
  { id: "#PM-87551", assetName: "Pneumatic Press #4", status: "Approved", date: "September 2023", score: 89 },

  // Page 2
  { id: "#PM-88091", assetName: "Boiler Room Valve C", status: "Approved", date: "October 2023", score: 95 },
  { id: "#PM-88015", assetName: "Emergency Lighting Panel", status: "Approved", date: "October 2023", score: 100 },
  { id: "#PM-87420", assetName: "Fire Alarm Control Unit", status: "Approved", date: "September 2023", score: 91 },
  { id: "#PM-87309", assetName: "Hydraulic Pump Station 2", status: "Rejected", date: "September 2023", score: 35 },

  // Page 3 (August 2023)
  { id: "#PM-86923", assetName: "Water Cooling Tower 1", status: "Approved", date: "August 2023", score: 87 },
  { id: "#PM-86811", assetName: "Exhaust Fan EF-4", status: "Approved", date: "August 2023", score: 94 },
  { id: "#PM-86702", assetName: "Backup Battery System", status: "Approved", date: "August 2023", score: 100 },
  { id: "#PM-86599", assetName: "Compressor Line 3", status: "Rejected", date: "August 2023", score: 52 },

  // Page 4 (July 2023)
  { id: "#PM-85912", assetName: "Main Transformer Sub", status: "Approved", date: "July 2023", score: 97 },
  { id: "#PM-85804", assetName: "Elevator Shaft Motor #2", status: "Approved", date: "July 2023", score: 90 },
  { id: "#PM-85750", assetName: "Sump Pump Drainage Unit", status: "Approved", date: "July 2023", score: 88 },
  { id: "#PM-85610", assetName: "Dock Leveler Ramp #6", status: "Approved", date: "July 2023", score: 93 },
];

// Total count to simulate the larger dataset
const SIMULATED_TOTAL = 248;

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function PMHistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Trigger Toast Notification helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Filter records based on search query
  const filteredRecords = ALL_MOCK_RECORDS.filter((rec) => {
    const query = searchQuery.toLowerCase();
    return (
      rec.id.toLowerCase().includes(query) ||
      rec.assetName.toLowerCase().includes(query) ||
      rec.status.toLowerCase().includes(query) ||
      rec.date.toLowerCase().includes(query)
    );
  });

  // Items per page = 4
  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  // Get current page records
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  // Group records by Date (Month Year) to render section headings
  const groupedRecords: { [key: string]: PMRecord[] } = {};
  currentPageRecords.forEach((rec) => {
    if (!groupedRecords[rec.date]) {
      groupedRecords[rec.date] = [];
    }
    groupedRecords[rec.date].push(rec);
  });

  // Handle page change with fade animation
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 300);
  };



  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* CSS Animations style tag */}
      <style jsx global>{`
        .progress-ring__circle {
          transition: stroke-dashoffset 0.35s;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
        * {
          box-shadow: none !important;
        }
      `}</style>

      {/* Fixed Sidebar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] font-bold tracking-widest text-[#D32F2F] uppercase">
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
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          {/* Active State: PM */}
          <button
            onClick={() => {
              setSearchQuery("");
              setCurrentPage(1);
              triggerToast("PM History view reset.", "info");
            }}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              settings_applications
            </span>
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
              if (typeof window !== "undefined") {
                localStorage.removeItem("userRole");
              }
              router.push("/");
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

      {/* Top Navigation Bar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-40">
        <div className="flex-1 flex items-center gap-6">
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight whitespace-nowrap">
            PM History
          </h2>
          <div className="relative w-full max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border-2 border-[#1A1A1A] rounded-[20px] py-2 pl-12 pr-4 focus:ring-2 focus:ring-[#D32F2F] focus:border-[#D32F2F] focus:outline-none transition-all placeholder:text-[#1A1A1A]/40 font-body-md"
              placeholder="Search report ID, asset name, or status..."
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

      </header>

      {/* Main Content Canvas */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="min-h-[calc(100vh-80px)] py-8 px-10">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* Active Month Sections */}
            <div
              className={`space-y-12 transition-opacity duration-300 ${
                isTransitioning ? "opacity-50" : "opacity-100"
              }`}
            >
              {currentPageRecords.length === 0 ? (
                <div className="border-2 border-dashed border-[#1A1A1A]/20 rounded-[20px] p-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#1A1A1A]/30 mb-4">
                    search_off
                  </span>
                  <p className="font-extrabold text-[#1A1A1A]/80 uppercase">No matching reports found</p>
                  <p className="text-xs text-[#1A1A1A]/60 mt-1">
                    Try refining your search terms or clearing the search box.
                  </p>
                </div>
              ) : (
                Object.keys(groupedRecords).map((date) => (
                  <section key={date}>
                    <div className="flex items-center gap-4 mb-8">
                      <h3 className="font-headline-lg text-2xl font-extrabold text-[#1A1A1A]">{date}</h3>
                      <div className="flex-1 h-0.5 bg-[#1A1A1A]"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {groupedRecords[date].map((rec) => {
                        // Circumference for radius 40 is 251.2
                        const circumference = 251.2;
                        const strokeDashoffset = circumference - (circumference * rec.score) / 100;

                        return (
                          <div
                            key={rec.id}
                            className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex flex-col md:flex-row items-center gap-8 group hover:border-[#D32F2F] hover:-translate-y-1 transition-all duration-200"
                          >
                            <div className="flex-1 space-y-4 w-full">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1A1A1A]/60">{rec.id}</span>
                                <span
                                  className={`px-3 py-1 border-2 border-[#1A1A1A] rounded-full text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap ${
                                    rec.status === "Approved"
                                      ? "bg-white text-[#1A1A1A]"
                                      : rec.status === "Pending Review"
                                      ? "bg-[#1A1A1A] text-white"
                                      : "bg-[#D32F2F] text-white"
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              </div>
                              <h4 className="font-headline-md text-xl font-extrabold text-[#1A1A1A]">
                                {rec.assetName}
                              </h4>
                              {rec.status !== "Pending Review" && (
                                <div className="flex items-center gap-4 pt-2">
                                  <button
                                    onClick={() =>
                                      triggerToast(`Viewing telemetry details for ${rec.id}...`, "info")
                                    }
                                    className="inline-flex items-center gap-2 text-[#D32F2F] font-bold hover:underline border-none bg-transparent cursor-pointer p-0"
                                  >
                                    View Report
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Progress Ring */}
                            <div className="relative flex items-center justify-center w-32 h-32 flex-shrink-0">
                              <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle
                                  className="text-[#1A1A1A]/5"
                                  cx="50"
                                  cy="50"
                                  fill="transparent"
                                  r="40"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                ></circle>
                                <circle
                                  className="text-[#D32F2F] progress-ring__circle"
                                  cx="50"
                                  cy="50"
                                  fill="transparent"
                                  r="40"
                                  stroke="currentColor"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                  strokeWidth="8"
                                ></circle>
                              </svg>
                              <span className="absolute font-headline-md text-xl font-extrabold text-[#1A1A1A]">
                                {rec.score}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            {/* Footer / Pagination */}
            <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t-2 border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-[#1A1A1A] font-bold" id="record-count">
                Showing {filteredRecords.length > 0 ? startIndex + 1 : 0}-
                {Math.min(startIndex + itemsPerPage, filteredRecords.length)} of{" "}
                {searchQuery ? filteredRecords.length : SIMULATED_TOTAL} records
              </p>

              <div className="flex gap-2" id="pagination-container">
                {/* Prev Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-10 h-10 border-2 border-[#1A1A1A] rounded-[20px] flex items-center justify-center transition-all active:scale-95 ${
                    currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-[#D32F2F]/10 cursor-pointer"
                  }`}
                  id="prev-btn"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`page-num px-4 h-10 border-2 border-[#1A1A1A] rounded-[20px] font-bold active:scale-95 transition-all cursor-pointer ${
                      currentPage === page ? "bg-[#D32F2F] text-white" : "bg-white text-[#1A1A1A] hover:bg-[#D32F2F]/10"
                    }`}
                    data-page={page}
                  >
                    {page}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-10 h-10 border-2 border-[#1A1A1A] rounded-[20px] flex items-center justify-center transition-all active:scale-95 ${
                    currentPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-[#D32F2F]/10 cursor-pointer"
                  }`}
                  id="next-btn"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              t.type === "success" ? "border-green-700" : "border-[#D32F2F]"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                t.type === "success" ? "text-green-600" : "text-[#D32F2F]"
              }`}
            >
              {t.type === "success" ? "check_circle" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
