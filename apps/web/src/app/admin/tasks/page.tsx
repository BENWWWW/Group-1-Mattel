"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Assignment {
  id: string;
  asset: string;
  serialNumber?: string;
  vendor: string;
  supervisor: string;
  date: string;
  template: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "Assigned" | "Pending" | "Completed";
  icon: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const SERIAL_NUMBERS_MAP: Record<string, string[]> = {
  "HVAC Chiller Unit 02": ["SN-HVAC-9082-A", "SN-HVAC-3029-B", "SN-HVAC-5512-C"],
  "Power Transformer T-14": ["SN-XFMR-7023-A", "SN-XFMR-1049-B", "SN-XFMR-8834-C"],
  "Conveyor Assembly Line B": ["SN-CONV-4421-A", "SN-CONV-9088-B", "SN-CONV-3312-C"],
};

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "PM-2024-003",
    asset: "Fire Suppression Tank",
    serialNumber: "SN-FST-9082-X",
    vendor: "Precision Maintenance Co.",
    supervisor: "L. Mendez",
    date: "2024-05-18",
    template: "Heavy Machinery Lubrication Protocol",
    priority: "HIGH",
    status: "Assigned",
    icon: "water_drop",
  },
  {
    id: "PM-2024-002",
    asset: "Substation Panel 4",
    serialNumber: "SN-SUB-1049-Y",
    vendor: "Tech-Pneumatic Ltd.",
    supervisor: "T. Henderson",
    date: "2024-05-15",
    template: "Electrical Safety Inspection",
    priority: "LOW",
    status: "Pending",
    icon: "bolt",
  },
  {
    id: "PM-2024-001",
    asset: "Chiller System C-02",
    serialNumber: "SN-CHL-8834-Z",
    vendor: "Global Industrial Services",
    supervisor: "R. Walsh",
    date: "2024-05-12",
    template: "Standard Quarterly HVAC Audit v4.1",
    priority: "MEDIUM",
    status: "Assigned",
    icon: "ac_unit",
  },
];

export default function CreatePMAssignmentPage() {
  const router = useRouter();

  // State lists
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);

  // Form states
  const [selectedAsset, setSelectedAsset] = useState("HVAC Chiller Unit 02");
  const [selectedSerialNumber, setSelectedSerialNumber] = useState("SN-HVAC-9082-A");
  const [selectedVendor, setSelectedVendor] = useState("Global Industrial Services");
  const [selectedSupervisor, setSelectedSupervisor] = useState("David Harrison");
  const [scheduleDate, setScheduleDate] = useState("2024-05-24");
  const [checklistTemplate, setChecklistTemplate] = useState("Standard Quarterly HVAC Audit v4.1");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // Keep serial number synchronized with chosen asset
  useEffect(() => {
    const list = SERIAL_NUMBERS_MAP[selectedAsset] || [];
    if (list.length > 0) {
      const timer = setTimeout(() => {
        setSelectedSerialNumber(list[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedAsset]);

  // UI state
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Assignment | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Submit Handler
  const handleAssignPM = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduleDate) {
      triggerToast("Schedule Date is required.", "error");
      return;
    }

    // Determine icon based on asset name selection
    let icon = "assignment";
    if (selectedAsset.includes("Chiller") || selectedAsset.includes("HVAC")) {
      icon = "ac_unit";
    } else if (selectedAsset.includes("Transformer") || selectedAsset.includes("Panel")) {
      icon = "bolt";
    } else if (selectedAsset.includes("Conveyor") || selectedAsset.includes("Assembly")) {
      icon = "precision_manufacturing";
    }

    const newAssignment: Assignment = {
      id: `PM-2024-${Math.floor(100 + Math.random() * 900)}`,
      asset: selectedAsset,
      serialNumber: selectedSerialNumber,
      vendor: selectedVendor,
      supervisor: selectedSupervisor,
      date: scheduleDate,
      template: checklistTemplate,
      priority: priority,
      status: "Assigned",
      icon: icon,
    };

    // Add to list and keep it sorted in reverse chronological order
    setAssignments((prev) => {
      const updated = [newAssignment, ...prev];
      return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    triggerToast(`PM ASSIGNMENT FOR ${selectedAsset.toUpperCase()} CREATED SUCCESSFULLY.`, "success");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userRole");
    }
    triggerToast("CLOSING SECURE SESSION...", "info");
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md overflow-hidden relative">
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
        .btn-press:active {
          transform: scale(0.98);
        }
      `}</style>



      {/* Top Bar Component (TopNavBar) */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] border-b-2 border-[#1A1A1A] bg-white flex justify-between items-center h-20 px-10 z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-headline-md text-2xl text-[#1A1A1A] tracking-tight font-extrabold uppercase">CREATE PM ASSIGNMENT</h2>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)]">
        <div className="max-w-[1400px] mx-auto p-10">
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Left: Form Card */}
            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline-md text-2xl text-[#1A1A1A] font-extrabold uppercase">Assignment Details</h3>
                  <span className="font-label-sm text-xs bg-[#D32F2F] text-white px-4 py-1.5 rounded-full border-2 border-[#1A1A1A] font-bold">
                    NEW_ENTRY_2024
                  </span>
                </div>
                <form onSubmit={handleAssignPM} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Select Asset</label>
                      <div className="relative">
                        <select
                          value={selectedAsset}
                          onChange={(e) => setSelectedAsset(e.target.value)}
                          className="w-full h-14 pl-4 pr-10 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm uppercase cursor-pointer"
                        >
                          <option value="HVAC Chiller Unit 02">HVAC Chiller Unit 02</option>
                          <option value="Power Transformer T-14">Power Transformer T-14</option>
                          <option value="Conveyor Assembly Line B">Conveyor Assembly Line B</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Select Serial Number</label>
                      <div className="relative">
                        <select
                          value={selectedSerialNumber}
                          onChange={(e) => setSelectedSerialNumber(e.target.value)}
                          className="w-full h-14 pl-4 pr-10 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm uppercase cursor-pointer"
                        >
                          {(SERIAL_NUMBERS_MAP[selectedAsset] || []).map((sn) => (
                            <option key={sn} value={sn}>
                              {sn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Service Vendor</label>
                      <div className="relative">
                        <select
                          value={selectedVendor}
                          onChange={(e) => setSelectedVendor(e.target.value)}
                          className="w-full h-14 pl-4 pr-10 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm uppercase cursor-pointer"
                        >
                          <option value="Global Industrial Services">Global Industrial Services</option>
                          <option value="Tech-Pneumatic Ltd.">Tech-Pneumatic Ltd.</option>
                          <option value="Precision Maintenance Co.">Precision Maintenance Co.</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Assign Supervisor</label>
                      <div className="relative">
                        <select
                          value={selectedSupervisor}
                          onChange={(e) => setSelectedSupervisor(e.target.value)}
                          className="w-full h-14 pl-4 pr-10 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm uppercase cursor-pointer"
                        >
                          <option value="David Harrison">David Harrison</option>
                          <option value="Sarah Chen">Sarah Chen</option>
                          <option value="Marcus Aurelio">Marcus Aurelio</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Schedule Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="w-full h-14 px-4 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Checklist Template</label>
                      <div className="relative">
                        <select
                          value={checklistTemplate}
                          onChange={(e) => setChecklistTemplate(e.target.value)}
                          className="w-full h-14 pl-4 pr-10 bg-white border-2 border-[#1A1A1A] rounded-[20px] focus:outline-none focus:border-[#D32F2F] font-bold text-sm uppercase cursor-pointer"
                        >
                          <option value="Standard Quarterly HVAC Audit v4.1">Standard Quarterly HVAC Audit v4.1</option>
                          <option value="Electrical Safety Inspection">Electrical Safety Inspection</option>
                          <option value="Heavy Machinery Lubrication Protocol">Heavy Machinery Lubrication Protocol</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="font-label-md text-xs font-bold text-[#1A1A1A] uppercase block">Assignment Priority</label>
                    <div className="flex gap-4">
                      {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => {
                        const isActive = priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-3 px-6 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-xs uppercase transition-all btn-press ${
                              isActive
                                ? "bg-[#D32F2F] text-white ring-4 ring-[#D32F2F]/20"
                                : "bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/5 cursor-pointer"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-5 bg-[#D32F2F] text-white rounded-[20px] font-extrabold text-lg border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all btn-press uppercase cursor-pointer"
                    >
                      ASSIGN PM
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Recent List */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase">Recent Assignments</h3>
                <button
                  onClick={() => triggerToast("Listing all registered PM workflows...", "info")}
                  className="font-label-md text-xs text-[#D32F2F] font-bold border-b-2 border-[#D32F2F] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-all uppercase bg-transparent border-none cursor-pointer"
                >
                  VIEW ALL
                </button>
              </div>
              <div className="space-y-4">
                {assignments.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 hover:bg-[#1A1A1A]/5 transition-all group relative overflow-hidden"
                  >
                    <div
                      className={`absolute right-0 top-0 w-3 h-full ${
                        task.status === "Pending" ? "bg-[#1A1A1A]/20" : "bg-[#D32F2F]"
                      }`}
                    ></div>
                    <div className="flex justify-between items-start mb-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[12px] bg-[#1A1A1A] text-white flex items-center justify-center border-2 border-[#1A1A1A]">
                          <span className="material-symbols-outlined">{task.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1A1A1A] uppercase">{task.asset}</h4>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {task.serialNumber && (
                              <p className="text-[10px] text-[#D32F2F] font-bold uppercase">
                                {task.serialNumber}
                              </p>
                            )}
                            <p className="text-[10px] text-[#1A1A1A]/60 font-bold uppercase">
                              {new Date(task.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-[20px] text-[10px] font-extrabold border-2 border-[#1A1A1A] uppercase ${
                          task.status === "Pending"
                            ? "bg-white text-[#1A1A1A]"
                            : "bg-[#D32F2F] text-white"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[#1A1A1A]/10">
                      <span className="text-xs text-[#1A1A1A] font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">person</span> {task.supervisor}
                      </span>
                      <button
                        onClick={() => setSelectedTaskDetails(task)}
                        className="material-symbols-outlined text-[#1A1A1A] group-hover:translate-x-1 transition-transform cursor-pointer bg-transparent border-none p-1 hover:text-[#D32F2F]"
                      >
                        chevron_right
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual Asset Spotlight */}
              <div className="mt-8 border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden relative h-52 group">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale"
                  alt="Black and white photograph of industrial gears"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5MqQ8js8vG0bOZteSP-baLIXB6pUa22VpygjL6eKdkIATArPA3nJ1nBRqZuy3n8bVdo7NW0obBW0wdxUZpf3XKIAUzeDEAIje9Y18FFz4h6NvgBSQewFKwy4cRmxtycMrUl_-d-X07pzVnDWJwHHqj4iRemotLluBONX1OMk6IXeEKGGUX0QsExr3tu6hXSX6TmBwBz3dN785zdJenr2D0BXUIg3yL70eo8WWV24My_p4mRmOlJ8tte0w5xAAZGFgtKSGvpHiXr8j"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent opacity-85"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <p className="text-[10px] font-bold text-[#D32F2F] uppercase tracking-widest">CURRENT OPERATIONS</p>
                  <h5 className="font-headline-md text-xl leading-tight mt-1 font-bold">Cluster A Efficiency: 94.2%</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Task Details Interactive Popup Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedTaskDetails(null)}></div>
          <div className="relative bg-white border-4 border-[#1A1A1A] p-8 rounded-[20px] max-w-lg w-full z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6 border-b-2 border-[#1A1A1A] pb-4">
              <div>
                <span className="text-[10px] bg-[#D32F2F] text-white px-3 py-1 rounded-full border-2 border-[#1A1A1A] font-bold">
                  {selectedTaskDetails.id}
                </span>
                <h3 className="text-2xl font-extrabold uppercase mt-2 tracking-tight text-[#1A1A1A]">
                  {selectedTaskDetails.asset}
                </h3>
              </div>
              <button
                className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-full text-on-surface hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer shrink-0"
                onClick={() => setSelectedTaskDetails(null)}
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold uppercase text-[#1A1A1A]">
              {selectedTaskDetails.serialNumber && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="opacity-50">Serial Number</span>
                  <span className="text-[#D32F2F] font-bold">{selectedTaskDetails.serialNumber}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="opacity-50">Service Vendor</span>
                <span>{selectedTaskDetails.vendor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="opacity-50">Assigned Supervisor</span>
                <span>{selectedTaskDetails.supervisor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="opacity-50">Schedule Date</span>
                <span>
                  {new Date(selectedTaskDetails.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="opacity-50">Checklist Template</span>
                <span className="text-right max-w-[250px] lowercase first-letter:uppercase">{selectedTaskDetails.template}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="opacity-50">Priority</span>
                <span
                  className={`px-3 py-0.5 rounded-full border text-[10px] font-black ${
                    selectedTaskDetails.priority === "HIGH"
                      ? "bg-red-100 text-red-700 border-red-300"
                      : selectedTaskDetails.priority === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-green-100 text-green-700 border-green-300"
                  }`}
                >
                  {selectedTaskDetails.priority}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="opacity-50">Current Status</span>
                <span className="px-3 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                  {selectedTaskDetails.status}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-[#1A1A1A] flex gap-4">
              <button
                className="flex-1 py-3 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase rounded-[12px] hover:bg-black cursor-pointer text-center text-xs"
                onClick={() => setSelectedTaskDetails(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Popups */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded-[20px] px-8 py-4 font-bold uppercase tracking-wider border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs"
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
