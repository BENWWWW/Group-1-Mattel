"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PMRecord {
  id: string;
  reportId?: string;
  name: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  status: "Nominal" | "Warning" | "Critical";
  date: string;
  supervisor: string;
  supervisor_avatar: string;
  accuracy: number;
  location: string;
  details: string;
  recommendation: string;
  audio_url: string;
  photos: string[];
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function VPMHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [records, setRecords] = useState<PMRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Selected Detail Drawer
  const [selectedRecord, setSelectedRecord] = useState<PMRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Toast Notification state
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Trigger Toast helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const loadPMRecords = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      // Profile details
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setCurrentUser(profile);

      // Query pm_reports where its pm_tasks' assigned_vendor_id is this user.id
      const { data: reportsData, error } = await supabase
        .from("pm_reports")
        .select(`
          id,
          findings,
          recommendations,
          photos_urls,
          ai_confidence_score,
          status,
          submitted_at,
          pm_tasks!inner (
            id,
            task_code,
            assigned_vendor_id,
            assigned_supervisor_id,
            assets (
              name,
              location,
              category
            ),
            profiles:assigned_supervisor_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq("pm_tasks.assigned_vendor_id", user.id);

      if (error) throw error;

      // Transform to PMRecord format
      const list: PMRecord[] = (reportsData || []).map((rep: any) => {
        // Map confidence score to a nominal status label
        const score = rep.ai_confidence_score || 95;
        let nominalStatus: "Nominal" | "Warning" | "Critical" = "Nominal";
        if (score < 60) nominalStatus = "Critical";
        else if (score < 80) nominalStatus = "Warning";

        const supervisorProfile: any = rep.pm_tasks?.profiles;

        return {
          id: rep.pm_tasks?.task_code || `TK-${rep.pm_tasks?.id.substring(0, 4).toUpperCase()}`,
          reportId: rep.id,
          name: rep.pm_tasks?.assets?.name || "PM Verification Run",
          category: rep.pm_tasks?.assets?.category || "Mechanical",
          status: nominalStatus,
          date: rep.submitted_at ? new Date(rep.submitted_at).toLocaleDateString() : "N/A",
          supervisor: supervisorProfile?.full_name || "Lead Supervisor",
          supervisor_avatar: supervisorProfile?.avatar_url || "https://ui-avatars.com/api/?name=Supervisor&background=000&color=fff",
          accuracy: score,
          location: rep.pm_tasks?.assets?.location || "Main Complex",
          details: rep.findings || "Routine maintenance complete. No defects detected.",
          recommendation: rep.recommendations || "Repeat cycle per schedule.",
          audio_url: "",
          photos: rep.photos_urls || []
        };
      });

      setRecords(list);

    } catch (e: any) {
      console.error(e);
      triggerToast("Failed to load PM history: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPMRecords();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered PM records
  const filteredRecords = records.filter((rec) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      rec.id.toLowerCase().includes(q) ||
      rec.name.toLowerCase().includes(q) ||
      rec.location.toLowerCase().includes(q) ||
      rec.supervisor.toLowerCase().includes(q);

    // Case-insensitive category match
    const matchesCategory =
      categoryFilter === "All Categories" ||
      rec.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus = statusFilter === "All Statuses" || rec.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Dynamic category options from actual records
  const uniqueCategories = Array.from(new Set(records.map((r) => r.category))).filter(Boolean).sort();

  // Helper reset functions
  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("All Categories");
    setStatusFilter("All Statuses");
  };

  const handleOpenDrawer = (rec: PMRecord) => {
    setSelectedRecord(rec);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleDownloadReport = () => {
    triggerToast("Telemetry report download started.", "info");
  };

  const avatarSrc = currentUser?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || "V")}&background=D32F2F&color=fff&size=200`;

  if (loading && records.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading PM History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none bg-white text-on-surface font-body-md overflow-hidden relative">
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

      {/* SideNavBar */}
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

          <button
            onClick={() => router.push("/vendor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => {}}
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

        {/* Profile widget */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
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
      <main className="ml-[220px] h-screen overflow-y-auto bg-white flex-1 flex flex-col relative w-[calc(100%-220px)]">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-20 px-10 border-b-2 border-[#1A1A1A] bg-white shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
              Preventive Maintenance History
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Field Calibration logs & Precision records
            </p>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-grow p-10 space-y-10 max-w-[1400px] w-full mx-auto">
          {/* Filters controls panel */}
          <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
            <div className="flex flex-wrap gap-4 flex-grow">
              <div className="flex-grow min-w-[250px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Search Records</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by System Name, Location, Reference..."
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm focus:border-[#D32F2F] outline-none"
                  />
                </div>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm outline-none cursor-pointer bg-white"
                >
                  <option value="All Categories">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="w-[180px]">
                <label className="block text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">Nominal Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm outline-none cursor-pointer bg-white"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Nominal">Nominal</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(searchQuery || categoryFilter !== "All Categories" || statusFilter !== "All Statuses") && (
                <div className="flex items-end pb-0">
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-4 py-3 border-2 border-[#1A1A1A] rounded-[20px] font-bold text-xs uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer bg-white text-[#1A1A1A]"
                  >
                    <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PM Records Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecords.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-[20px]">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
                <p className="font-extrabold uppercase text-gray-500 tracking-wider text-xs">No records matching filters in database</p>
              </div>
            ) : (
              filteredRecords.map((rec) => (
                <div key={rec.reportId || rec.id} className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 hover:border-[#D32F2F] transition-all flex flex-col justify-between gap-6">
                  <div className="flex justify-between items-start gap-4">
                    <span className="border-2 border-[#D32F2F] text-[#D32F2F] px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                      {rec.category}
                    </span>
                    <span className={`px-3 py-0.5 border-2 border-[#1A1A1A] rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
                      rec.status === "Nominal" ? "bg-green-600" : rec.status === "Warning" ? "bg-black" : "bg-[#D32F2F]"
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">{rec.id}</span>
                    <h4 className="font-headline-md text-lg font-extrabold text-black uppercase mt-1 leading-tight">{rec.name}</h4>
                    <p className="text-gray-500 font-bold text-xs mt-2 uppercase tracking-wide">
                      Location: <span className="text-black">{rec.location}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-1 font-semibold uppercase tracking-wide">
                      Auditor Accuracy: <span className="text-[#D32F2F] font-extrabold">{rec.accuracy}%</span>
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">calendar_today</span>
                      {rec.date}
                    </span>
                    <button
                      onClick={() => handleOpenDrawer(rec)}
                      className="px-5 py-2 border-2 border-black rounded-xl font-black text-xs uppercase bg-white text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                    >
                      View Logs
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Details Slide-out drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60]" onClick={handleCloseDrawer} />
      )}

      <aside
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l-2 border-[#1A1A1A] z-[70] transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedRecord && (
          <>
            {/* Drawer Header */}
            <div className="p-6 border-b-2 border-[#1A1A1A] flex justify-between items-center bg-[#1A1A1A] text-white shrink-0">
              <h2 className="text-sm uppercase font-black tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D32F2F]">analytics</span>
                PM Telemetry Detail: {selectedRecord.id}
              </h2>
              <button onClick={handleCloseDrawer} className="p-1 hover:bg-white/10 rounded cursor-pointer text-white border-none bg-transparent">
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-grow p-8 overflow-y-auto space-y-6 scroll-container text-left">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Main System Name</p>
                <h3 className="font-headline-md text-xl text-black font-extrabold uppercase mt-1">{selectedRecord.name}</h3>
              </div>

              {/* Status and Confidence */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-black/10 rounded-xl">
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Telemetry Status</p>
                  <span className={`mt-1 inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                    selectedRecord.status === "Nominal" ? "bg-green-600" : "bg-[#D32F2F]"
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Verification Accuracy</p>
                  <p className="font-extrabold text-sm text-[#D32F2F] mt-1">{selectedRecord.accuracy}% Accurate</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Discrepancies & Observations</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l-4 border-black p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedRecord.details}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Action Recommendations</p>
                <p className="text-xs font-semibold text-gray-700 mt-2 bg-gray-50 border-l-4 border-[#D32F2F] p-4 leading-relaxed whitespace-pre-wrap">
                  {selectedRecord.recommendation}
                </p>
              </div>

              {/* Audio transcribe summary */}
              {selectedRecord.audio_url && (
                <div className="bg-white border-2 border-[#1A1A1A] p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#D32F2F] text-3xl">mic</span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-black">Voice Transcribe Summary</h4>
                      <p className="text-[9px] font-semibold text-gray-500 uppercase">AI Audio Log Telemetry</p>
                    </div>
                  </div>
                  <button
                    onClick={() => triggerToast("Playing audio telemetry...", "info")}
                    className="px-4 py-2 border-2 border-black rounded-lg text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors cursor-pointer bg-white text-black"
                  >
                    Play Summary
                  </button>
                </div>
              )}

              {/* Photos Gallery */}
              {selectedRecord.photos && selectedRecord.photos.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Evidence Photos ({selectedRecord.photos.length})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecord.photos.map((photo, i) => (
                      <div key={i} className="aspect-video border-2 border-black rounded-xl overflow-hidden bg-gray-100">
                        <img src={photo} alt={`Inspection Photo ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisor Sign-off widget */}
              <div className="bg-gray-50 p-6 rounded-xl border border-black/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border border-black overflow-hidden bg-white shrink-0">
                  <img src={selectedRecord.supervisor_avatar} alt={selectedRecord.supervisor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-400">Lead Supervisor</p>
                  <p className="font-extrabold text-sm uppercase text-black">{selectedRecord.supervisor}</p>
                  <p className="text-[9px] font-bold text-green-600 uppercase mt-0.5">Signed off digitally</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-8 border-t-2 border-[#1A1A1A] bg-white grid grid-cols-2 gap-4 shrink-0">
              <button
                onClick={handleDownloadReport}
                className="w-full py-4 border-2 border-black text-black font-black uppercase text-xs rounded-lg hover:bg-black hover:text-white transition-all cursor-pointer bg-white"
              >
                Download Report
              </button>
              <button
                onClick={handleCloseDrawer}
                className="w-full py-4 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase text-xs rounded-lg hover:bg-black transition-all cursor-pointer border-none"
              >
                Close Logs
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Floating Toast Containers */}
      <div className="fixed top-10 right-10 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-[20px] border-2 border-black bg-white text-black animate-in fade-in slide-in-from-top-4 duration-300">
            <span className={`material-symbols-outlined ${
              t.type === "success" ? "text-green-600" : t.type === "error" ? "text-[#D32F2F]" : "text-blue-500"
            }`}>
              {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
            </span>
            <span className="font-label-md text-xs uppercase font-bold">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
