"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface QueueItem {
  id: string;
  icon: string;
  title: string;
  tech: string;
  location: string;
  time: string;
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE";
  status: "pending" | "approved" | "rejected";
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const INITIAL_QUEUE: QueueItem[] = [
  {
    id: "#TK-8021",
    icon: "air",
    title: "HVAC Filter Maintenance",
    tech: "Sarah Jenkins",
    location: "Unit B4",
    time: "1h ago",
    confidence: "HIGH CONFIDENCE",
    status: "pending",
  },
  {
    id: "#TK-7945",
    icon: "exit_to_app",
    title: "Emergency Exit Inspection",
    tech: "Robert Chen",
    location: "Facility Perimeter",
    time: "2h ago",
    confidence: "HIGH CONFIDENCE",
    status: "pending",
  },
  {
    id: "#TK-7832",
    icon: "oil_barrel",
    title: "Conveyor Belt Lubrication",
    tech: "Alex Rivera",
    location: "Line 04",
    time: "3h ago",
    confidence: "HIGH CONFIDENCE",
    status: "pending",
  },
];

const ADDITIONAL_QUEUE_ITEMS: QueueItem[] = [
  {
    id: "#TK-7611",
    icon: "bolt",
    title: "Main Breaker Thermal Scan",
    tech: "David Miller",
    location: "Substation B",
    time: "4h ago",
    confidence: "HIGH CONFIDENCE",
    status: "pending",
  },
  {
    id: "#TK-7590",
    icon: "plumbing",
    title: "Pressure Valve Calibration",
    tech: "Emma Watson",
    location: "Pump House 3",
    time: "6h ago",
    confidence: "MEDIUM CONFIDENCE",
    status: "pending",
  },
  {
    id: "#TK-7422",
    icon: "fire_extinguisher",
    title: "Fire Damper Inspection",
    tech: "John Doe",
    location: "Sector 7G",
    time: "8h ago",
    confidence: "HIGH CONFIDENCE",
    status: "pending",
  },
];

interface Vendor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  contactPerson: string;
  email: string;
  phone: string;
  status: "Active" | "On Hold";
  upcomingTasks: { id: string; title: string; asset: string; date: string }[];
  completedTasks: { id: string; title: string; asset: string; date: string; status: "Approved" | "Rejected" }[];
}

const VENDOR_DATABASE: Vendor[] = [
  {
    id: "vend-1",
    name: "Apex Electrics Ltd.",
    specialization: "Electrical Systems & Load Distribution",
    rating: 4.8,
    contactPerson: "Johnathan Shock",
    email: "j.shock@apexelectrics.com",
    phone: "+1 (555) 019-2834",
    status: "Active",
    upcomingTasks: [
      { id: "TK-7250", title: "Generator Load Testing", asset: "Backup Gen-Set 02", date: "2026-06-30" }
    ],
    completedTasks: [
      { id: "TK-7611", title: "Main Breaker Thermal Scan", asset: "Breaker Substation B", date: "2026-07-01", status: "Rejected" }
    ]
  },
  {
    id: "vend-2",
    name: "HVACPro Services",
    specialization: "Industrial Air Filtration & HVAC",
    rating: 4.5,
    contactPerson: "Sarah Airs",
    email: "s.airs@hvacpro.com",
    phone: "+1 (555) 021-9876",
    status: "Active",
    upcomingTasks: [
      { id: "TK-8021", title: "HVAC Filter Maintenance", asset: "Carrier WeatherMaker 50TC", date: "2026-07-01" }
    ],
    completedTasks: [
      { id: "TK-7301", title: "Cooling Tower Fan Check", asset: "Cooling Tower C", date: "2026-06-30", status: "Approved" }
    ]
  },
  {
    id: "vend-3",
    name: "SteelWork Solutions",
    specialization: "Heavy Mechanical & Hydraulic Pressing",
    rating: 4.9,
    contactPerson: "Marcus Weld",
    email: "m.weld@steelworks.com",
    phone: "+1 (555) 032-4455",
    status: "Active",
    upcomingTasks: [
      { id: "PM-8829-X", title: "Hydraulic Press A12 Review", asset: "Hydraulic Press A12", date: "2026-07-01" }
    ],
    completedTasks: [
      { id: "TK-7832", title: "Conveyor Belt Lubrication", asset: "Conveyor B-Prime", date: "2026-07-01", status: "Approved" }
    ]
  },
  {
    id: "vend-4",
    name: "SafeGuard Systems",
    specialization: "Safety Latch & Fire Damper Compliance",
    rating: 4.2,
    contactPerson: "Robert Safe",
    email: "r.safe@safeguard.com",
    phone: "+1 (555) 045-8899",
    status: "On Hold",
    upcomingTasks: [
      { id: "TK-7945", title: "Emergency Exit Inspection", asset: "Main Exit Gate Alpha", date: "2026-07-01" }
    ],
    completedTasks: [
      { id: "TK-7422", title: "Fire Damper Inspection", asset: "Fire Damper Sector 7G", date: "2026-07-01", status: "Approved" }
    ]
  }
];

export default function ReviewQueuePage() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Stats States
  const [pendingCount, setPendingCount] = useState(14);
  const [completedToday, setCompletedToday] = useState(28);

  // Active Queue State
  const [queue, setQueue] = useState<QueueItem[]>(INITIAL_QUEUE);

  // Urgent Item State
  const [urgentItem, setUrgentItem] = useState({
    id: "#TK-9042",
    title: "Main Turbine Bearing Overheat",
    tech: "Mike Thompson",
    time: "14 minutes ago",
    active: true,
  });

  // Dynamic stats calculation
  const approvedCount = completedToday;
  const rejectedCount = queue.filter(q => q.status === "rejected").length + 2;
  const totalTasksCount = pendingCount + approvedCount + rejectedCount;

  // Selected Vendor State
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Modal State for Review Detail
  const [reviewTarget, setReviewTarget] = useState<QueueItem | typeof urgentItem | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Load More Logs
  const handleLoadMore = () => {
    // Avoid duplicates
    const unadded = ADDITIONAL_QUEUE_ITEMS.filter(
      (item) => !queue.some((q) => q.id === item.id)
    );
    if (unadded.length === 0) {
      triggerToast("All historical logs loaded.", "info");
      return;
    }
    setQueue([...queue, ...unadded]);
    triggerToast("Loaded additional active queue items.", "success");
  };

  // Approve Item
  const handleApprove = (id: string, isUrgent: boolean = false) => {
    if (isUrgent) {
      setUrgentItem({ ...urgentItem, active: false });
      setPendingCount((prev) => Math.max(0, prev - 1));
      setCompletedToday((prev) => prev + 1);
      triggerToast("Urgent ticket #TK-9042 Approved.", "success");
      setReviewTarget(null);
      return;
    }

    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "approved" as const } : item))
    );
    setPendingCount((prev) => Math.max(0, prev - 1));
    setCompletedToday((prev) => prev + 1);
    triggerToast(`Approved report ${id}.`, "success");
    setReviewTarget(null);
  };

  // Reject Item
  const handleReject = (id: string, isUrgent: boolean = false) => {
    if (isUrgent) {
      setUrgentItem({ ...urgentItem, active: false });
      setPendingCount((prev) => Math.max(0, prev - 1));
      triggerToast("Urgent ticket #TK-9042 Rejected/Flagged.", "error");
      setReviewTarget(null);
      return;
    }

    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "rejected" as const } : item))
    );
    setPendingCount((prev) => Math.max(0, prev - 1));
    triggerToast(`Rejected report ${id}. Status flagged.`, "error");
    setReviewTarget(null);
  };

  // Filter queue by search query
  const filteredQueue = queue.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.tech.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* SideNavBar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] bg-[#1A1A1A] border-r-2 border-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          {/* Active Navigation: Dashboard */}
          <button
            onClick={() => {
              setSearchQuery("");
              triggerToast("Review Queue main dashboard reloaded.", "info");
            }}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              dashboard
            </span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/tasks")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">assignment</span>
            <span>Tasks</span>
          </button>

          <button
            onClick={() => router.push("/supervisor/reports")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">analytics</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* User Footer Profile */}
        <div className="px-4 mt-auto border-t border-white/10 pt-4 pb-2">
          <button
            onClick={() => {
              triggerToast("CLOSING SUPERVISOR SESSION...", "info");
              if (typeof window !== "undefined") {
                localStorage.removeItem("userRole");
                localStorage.removeItem("lastReviewStatus");
                localStorage.removeItem("lastReviewNotes");
                localStorage.removeItem("lastReviewSupervisor");
              }
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
                className="w-full h-full object-cover"
                alt="A professional headshot of E. Schmidt."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white uppercase">E. Schmidt</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Lead Auditor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-220px)] bg-white border-b-2 border-[#1A1A1A] h-20 px-10 flex justify-between items-center z-40">
        <div>
          <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
            Review Queue
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            Manage and approve maintenance logs
          </p>
        </div>

        <div className="flex-1 max-w-md mx-8 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by Tech, Title or ID..."
            className="w-full bg-white border-2 border-[#1A1A1A] rounded-full py-1.5 pl-10 pr-4 text-xs focus:outline-none focus:border-[#D32F2F] font-body-md"
          />
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => triggerToast("All systems reporting nominal.", "info")}
            className="relative p-2 hover:bg-[#D32F2F]/5 rounded-full transition-all border-none bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[#1A1A1A]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#D32F2F] rounded-full border border-white"></span>
          </button>
          <div className="w-10 h-10 rounded-full border-2 border-[#D32F2F] overflow-hidden shrink-0">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
              alt="User Profile"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
        <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-12">
          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Pending Reviews
              </p>
              <div className="text-[44px] font-extrabold text-[#D32F2F] leading-none">{pendingCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Avg Review Time
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">4.2m</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Completed Today
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">{completedToday}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Total Tasks
              </p>
              <div className="text-[44px] font-extrabold text-[#1A1A1A] leading-none">{totalTasksCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center border-l-4 border-l-green-600">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Approved Tasks
              </p>
              <div className="text-[44px] font-extrabold text-green-600 leading-none">{approvedCount}</div>
            </div>
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 flex flex-col justify-center items-center border-l-4 border-l-gray-500">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-bold text-center">
                Rejected Tasks
              </p>
              <div className="text-[44px] font-extrabold text-gray-800 leading-none">{rejectedCount}</div>
            </div>
          </div>

          {/* Urgent Items */}
          {urgentItem.active && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                  Urgent Items
                </h3>
                <span className="bg-[#D32F2F] text-white px-3 py-0.5 rounded-full font-bold text-[10px] border-2 border-[#1A1A1A] uppercase tracking-wider">
                  1 Priority
                </span>
              </div>

              <div className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-0 border-l-[12px] border-l-[#D32F2F] overflow-hidden flex flex-col lg:flex-row">
                <div className="lg:w-1/3 h-64 lg:h-auto overflow-hidden relative">
                  <img
                    className="w-full h-full object-cover"
                    alt="Close-up of industrial machinery."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQWUb5LOTZoIuovalKxmLsF41vRVQcq0LR84AMrPLbTsQWI6dZ7MkVseT_VhzvMUfmjv1hZqvhdSNHzFVyR4kcUxey6QGCXtMDrutqQV78pkcIX02ngIzNYTYGITrhczkR7o464SNP2A0Yzd6ZgLIOJYnf6Zob6DGmtvjx2_db_2o6VOOYrkNFp7-3RJUhPpSc5nrWHfK-KFwATiq6hh8JK4rai6NqJIWCAoT_oApd135arFmnIpLlch-uCzd5v4a2Gck4A7REIKqV"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-bold border-2 border-[#1A1A1A]">
                      LIVE FEED
                    </span>
                  </div>
                </div>

                <div className="lg:w-2/3 p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-[#D32F2F] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border-2 border-[#1A1A1A]">
                        URGENT ACTION
                      </span>
                      <span className="text-gray-500 font-bold text-xs">{urgentItem.id}</span>
                    </div>
                    <h4 className="font-headline-xl text-3xl font-extrabold mb-2 text-[#1A1A1A]">
                      {urgentItem.title}
                    </h4>
                    <div className="flex items-center gap-2 text-gray-500 mb-8 text-sm">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      <span>
                        Reported by: <strong className="text-[#1A1A1A]">{urgentItem.tech}</strong>
                      </span>
                      <span className="mx-2 opacity-30">•</span>
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      <span>{urgentItem.time}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => router.push("/supervisor/tasks")}
                      className="bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full px-8 py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-[#B71C1C] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      Review Now
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                    <button
                      onClick={() => triggerToast("Delegation list loaded.", "info")}
                      className="bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full px-8 py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      Assign
                      <span className="material-symbols-outlined text-sm">person_add</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Active Queue */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                Active Queue
              </h3>
              <button
                onClick={() => triggerToast("Refreshed full review queue.", "info")}
                className="text-[#D32F2F] font-bold hover:underline flex items-center gap-1 uppercase text-xs tracking-wider border-none bg-transparent cursor-pointer"
              >
                View All Queue
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.status === "pending") {
                      router.push("/supervisor/tasks");
                    }
                  }}
                  className={`bg-white border-2 border-[#1A1A1A] rounded-[20px] p-8 flex items-center justify-between hover:border-[#D32F2F] transition-all duration-200 cursor-pointer group relative ${
                    item.status !== "pending" ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 border-2 border-[#1A1A1A] rounded-xl overflow-hidden bg-[#D32F2F]/5 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#D32F2F] text-3xl">
                        {item.icon}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-[#D32F2F]/10 text-[#D32F2F] border-2 border-[#D32F2F] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                          {item.confidence}
                        </span>
                        <span className="text-gray-500 text-[10px] font-bold">{item.time}</span>
                      </div>
                      <h5 className="font-headline-md text-base font-extrabold mb-1 text-[#1A1A1A]">
                        {item.title}
                      </h5>
                      <p className="text-gray-500 text-xs">
                        Tech: <span className="text-[#1A1A1A] font-bold">{item.tech}</span> • {item.location}
                      </p>
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-full border-2 border-[#D32F2F] flex items-center justify-center shrink-0">
                    <span
                      className={`material-symbols-outlined text-3xl font-bold transition-all ${
                        item.status === "approved"
                          ? "text-green-600"
                          : item.status === "rejected"
                          ? "text-[#D32F2F]"
                          : "text-gray-300 group-hover:text-[#D32F2F]"
                      }`}
                      style={{
                        fontVariationSettings:
                          item.status !== "pending" ? "'FILL' 1" : undefined,
                      }}
                    >
                      {item.status === "approved"
                        ? "check_circle"
                        : item.status === "rejected"
                        ? "cancel"
                        : "check_circle"}
                    </span>
                  </div>
                </div>
              ))}

              {/* Load More Placeholder */}
              <div
                onClick={handleLoadMore}
                className="bg-white border-2 border-dashed border-[#1A1A1A]/20 rounded-[20px] p-8 flex items-center justify-center hover:border-[#D32F2F] transition-all duration-200 cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl mb-2 text-gray-400 group-hover:text-[#D32F2F] transition-colors">
                    add_circle
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#D32F2F] transition-colors">
                    Load More Logs
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Vendors Under Responsibility */}
          <section className="space-y-6 pt-6 border-t border-gray-100">
            <div>
              <h3 className="font-headline-lg text-lg font-extrabold text-[#1A1A1A] uppercase tracking-wide">
                Vendors Under Responsibility
              </h3>
              <p className="text-xs text-gray-500 font-medium">Select a vendor partner to view specialization details, upcoming runs, and compliance logs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {VENDOR_DATABASE.map((vendor) => (
                <div
                  key={vendor.id}
                  onClick={() => setSelectedVendorId(vendor.id)}
                  className="bg-white border-2 border-[#1A1A1A] rounded-[20px] p-6 hover:border-[#D32F2F] transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 relative group"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#1A1A1A] uppercase ${
                        vendor.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {vendor.status}
                      </span>
                      <span className="flex items-center text-amber-500 font-bold text-xs gap-0.5">
                        <span className="material-symbols-outlined text-xs">star</span>
                        {vendor.rating}
                      </span>
                    </div>
                    <h4 className="font-headline-lg text-base font-extrabold mt-4 text-[#1A1A1A] group-hover:text-[#D32F2F] transition-colors leading-tight">
                      {vendor.name}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold mt-1 line-clamp-1">
                      {vendor.specialization}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">
                      {vendor.upcomingTasks.length + vendor.completedTasks.length} Total runs
                    </span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Review Confirmation/Details Overlay Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setReviewTarget(null)}
          ></div>
          <div className="relative bg-white border-2 border-[#1A1A1A] w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-[#D32F2F] text-white px-3 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#1A1A1A]">
                  AUDIT REQUIREMENT
                </span>
                <h3 className="font-headline-lg text-xl font-extrabold mt-2 text-[#1A1A1A]">
                  {reviewTarget.title}
                </h3>
              </div>
              <button
                onClick={() => setReviewTarget(null)}
                className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-gray-50 border-2 border-[#1A1A1A] rounded-xl p-4 space-y-2 text-xs">
              <p>
                <strong>Ticket ID:</strong> {reviewTarget.id}
              </p>
              <p>
                <strong>Assigned Tech:</strong> {reviewTarget.tech}
              </p>
              <p>
                <strong>Timestamp:</strong> {reviewTarget.time}
              </p>
              <p>
                <strong>AI Calibration Score:</strong> 96% Confidence Level
              </p>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Verify telemetry checklist and machine heatmaps to authorize the supervisor signature. Approved files will immediately post to main repository logs.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  const isUrgent = reviewTarget.id === urgentItem.id;
                  handleApprove(reviewTarget.id, isUrgent);
                }}
                className="flex-1 bg-green-600 text-white border-2 border-[#1A1A1A] rounded-full py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-green-700 transition-all cursor-pointer active:scale-95"
              >
                Approve & Sign
              </button>
              <button
                onClick={() => {
                  const isUrgent = reviewTarget.id === urgentItem.id;
                  handleReject(reviewTarget.id, isUrgent);
                }}
                className="flex-1 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] rounded-full py-2.5 font-bold text-xs uppercase tracking-wider hover:bg-[#B71C1C] transition-all cursor-pointer active:scale-95"
              >
                Reject & Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Overlay Modal */}
      {selectedVendorId && (() => {
        const vendor = VENDOR_DATABASE.find(v => v.id === selectedVendorId);
        if (!vendor) return null;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedVendorId(null)}
            ></div>
            <div className="relative bg-white border-2 border-[#1A1A1A] w-full max-w-2xl p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border-2 border-[#1A1A1A] uppercase ${
                      vendor.status === "Active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {vendor.status}
                    </span>
                    <span className="flex items-center text-amber-500 font-bold text-xs gap-0.5">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {vendor.rating}
                    </span>
                  </div>
                  <h3 className="font-headline-lg text-2xl font-extrabold mt-2 text-[#1A1A1A]">
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-1">Vendor Audit Profile</p>
                </div>
                <button
                  onClick={() => setSelectedVendorId(null)}
                  className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Vendor Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border-2 border-[#1A1A1A] rounded-xl p-4 text-xs">
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Specialization</p>
                  <p className="font-extrabold text-[#1A1A1A]">{vendor.specialization}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Contact Person</p>
                  <p className="font-extrabold text-[#1A1A1A]">{vendor.contactPerson}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Email</p>
                  <p className="font-bold text-[#1A1A1A] truncate">{vendor.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-bold uppercase text-[9px]">Phone</p>
                  <p className="font-bold text-[#1A1A1A]">{vendor.phone}</p>
                </div>
              </div>

              {/* Tasks to Complete */}
              <div className="space-y-3">
                <h4 className="font-headline-lg text-xs font-black uppercase tracking-wider text-gray-500 border-b pb-2">
                  Tasks to Complete
                </h4>
                {vendor.upcomingTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold uppercase py-2">No pending workloads</p>
                ) : (
                  <div className="space-y-2">
                    {vendor.upcomingTasks.map((t) => (
                      <div key={t.id} className="border-2 border-[#1A1A1A] rounded-xl p-3 flex justify-between items-center bg-white">
                        <div>
                          <p className="font-black text-xs text-[#D32F2F]">{t.id}</p>
                          <p className="font-bold text-xs text-[#1A1A1A]">{t.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{t.asset}</p>
                        </div>
                        <span className="bg-amber-100 text-amber-700 border border-amber-600/20 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider">
                          In Review
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Tasks */}
              <div className="space-y-3">
                <h4 className="font-headline-lg text-xs font-black uppercase tracking-wider text-gray-500 border-b pb-2">
                  Completed Tasks
                </h4>
                {vendor.completedTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 font-bold uppercase py-2">No completed files recorded</p>
                ) : (
                  <div className="space-y-2">
                    {vendor.completedTasks.map((t) => (
                      <div key={t.id} className="border-2 border-[#1A1A1A] rounded-xl p-3 flex justify-between items-center bg-white opacity-85">
                        <div>
                          <p className="font-black text-xs text-gray-500">{t.id}</p>
                          <p className="font-bold text-xs text-gray-800">{t.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{t.asset}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          t.status === "Approved" 
                            ? "bg-green-100 text-green-700 border border-green-600/20" 
                            : "bg-red-100 text-red-700 border border-red-600/20"
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setSelectedVendorId(null)}
                  className="bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] rounded-full px-6 py-2 font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast notifications */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-4 bg-[#1A1A1A] text-white px-8 py-4 rounded-lg border-2 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 ${
              t.type === "success" ? "border-green-700" : t.type === "error" ? "border-primary" : "border-blue-700"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                t.type === "success"
                  ? "text-green-600"
                  : t.type === "error"
                  ? "text-primary"
                  : "text-blue-500"
              }`}
            >
              {t.type === "success" ? "check_circle" : t.type === "error" ? "cancel" : "info"}
            </span>
            <span className="font-black uppercase tracking-widest text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
