"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  asset: string;
  location: string;
  vendor: string;
  supervisor: string;
  date: string;
  aiScore: string;
  status: "Approved" | "Pending" | "Rejected";
  category: "Mechanical" | "Electrical" | "Safety";
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const REPORT_DATA: Record<number, Report[]> = {
  1: [
    { id: "REP-94021", asset: "Turbine Alpha-7", location: "Sector G4", vendor: "Apex Mech", supervisor: "Mark R.", date: "Oct 24, 2023", aiScore: "98%", status: "Approved", category: "Mechanical" },
    { id: "REP-94018", asset: "Conveyor B-Prime", location: "Sorting Line", vendor: "IndusCorp", supervisor: "Sarah L.", date: "Oct 23, 2023", aiScore: "82%", status: "Pending", category: "Mechanical" },
    { id: "REP-94015", asset: "HVAC Unit 04", location: "Roof West", vendor: "CoolPhase", supervisor: "Mark R.", date: "Oct 22, 2023", aiScore: "45%", status: "Rejected", category: "Mechanical" },
    { id: "REP-93998", asset: "Press 200T", location: "Main Floor", vendor: "Stark Mfr", supervisor: "Sarah L.", date: "Oct 21, 2023", aiScore: "94%", status: "Approved", category: "Mechanical" },
    { id: "REP-93995", asset: "Gen-Set 02", location: "Power Station", vendor: "VoltSystems", supervisor: "Mark R.", date: "Oct 20, 2023", aiScore: "91%", status: "Approved", category: "Electrical" },
    { id: "REP-93992", asset: "Robot Arm K3", location: "Assembly 1", vendor: "AutoBot", supervisor: "John K.", date: "Oct 19, 2023", aiScore: "89%", status: "Approved", category: "Mechanical" },
    { id: "REP-93988", asset: "Boiler B4", location: "Basement", vendor: "HeatTech", supervisor: "Sarah L.", date: "Oct 18, 2023", aiScore: "76%", status: "Pending", category: "Safety" },
    { id: "REP-93985", asset: "Pump P12", location: "Sector F2", vendor: "FlowMaster", supervisor: "Mark R.", date: "Oct 17, 2023", aiScore: "95%", status: "Approved", category: "Mechanical" },
    { id: "REP-93980", asset: "Lift L9", location: "Warehouse", vendor: "Upward", supervisor: "John K.", date: "Oct 16, 2023", aiScore: "38%", status: "Rejected", category: "Safety" },
    { id: "REP-93977", asset: "Chiller C1", location: "Roof East", vendor: "CoolPhase", supervisor: "Sarah L.", date: "Oct 15, 2023", aiScore: "88%", status: "Approved", category: "Mechanical" },
  ],
  2: [
    { id: "REP-93970", asset: "Solar Array 5", location: "North Field", vendor: "SunPower", supervisor: "Alan W.", date: "Oct 14, 2023", aiScore: "99%", status: "Approved", category: "Electrical" },
    { id: "REP-93965", asset: "Mixer Tank 3", location: "Chemical Plant", vendor: "MixIt", supervisor: "Elena S.", date: "Oct 13, 2023", aiScore: "72%", status: "Pending", category: "Mechanical" },
    { id: "REP-93960", asset: "Forklift F-22", location: "Loading Dock", vendor: "Toyota Ind", supervisor: "Alan W.", date: "Oct 12, 2023", aiScore: "85%", status: "Approved", category: "Safety" },
    { id: "REP-93955", asset: "Compressor X", location: "Workshop A", vendor: "AirForce", supervisor: "Elena S.", date: "Oct 11, 2023", aiScore: "55%", status: "Rejected", category: "Mechanical" },
    { id: "REP-93950", asset: "Welder W-9", location: "Fab Shop", vendor: "Lincoln", supervisor: "Alan W.", date: "Oct 10, 2023", aiScore: "93%", status: "Approved", category: "Safety" },
    { id: "REP-93945", asset: "Crane C-01", location: "Yard North", vendor: "HeavyLift", supervisor: "Elena S.", date: "Oct 09, 2023", aiScore: "81%", status: "Approved", category: "Safety" },
    { id: "REP-93940", asset: "Exhaust Fan 4", location: "Paint Booth", vendor: "VentsCo", supervisor: "Alan W.", date: "Oct 08, 2023", aiScore: "90%", status: "Approved", category: "Mechanical" },
    { id: "REP-93935", asset: "Oven O-12", location: "Heat Treat", vendor: "FireBox", supervisor: "Elena S.", date: "Oct 07, 2023", aiScore: "78%", status: "Pending", category: "Mechanical" },
    { id: "REP-93930", asset: "Drill Press 2", location: "Machine Shop", vendor: "Precision", supervisor: "Alan W.", date: "Oct 06, 2023", aiScore: "96%", status: "Approved", category: "Mechanical" },
    { id: "REP-93925", asset: "Conveyor A-2", location: "Packaging", vendor: "IndusCorp", supervisor: "Elena S.", date: "Oct 05, 2023", aiScore: "84%", status: "Approved", category: "Mechanical" },
  ],
  3: [
    { id: "REP-93920", asset: "CNC Mill 4", location: "Machine Shop", vendor: "Haas", supervisor: "Gary T.", date: "Oct 04, 2023", aiScore: "97%", status: "Approved", category: "Mechanical" },
    { id: "REP-93915", asset: "Packager P-3", location: "Packaging", vendor: "WrapIt", supervisor: "Maria G.", date: "Oct 03, 2023", aiScore: "79%", status: "Pending", category: "Mechanical" },
    { id: "REP-93910", asset: "Pump P-15", location: "Waste Water", vendor: "FlowMaster", supervisor: "Gary T.", date: "Oct 02, 2023", aiScore: "92%", status: "Approved", category: "Mechanical" },
    { id: "REP-93905", asset: "Transformer T1", location: "Substation", vendor: "GE Energy", supervisor: "Maria G.", date: "Oct 01, 2023", aiScore: "42%", status: "Rejected", category: "Electrical" },
    { id: "REP-93900", asset: "Lathe L-08", location: "Machine Shop", vendor: "Mazak", supervisor: "Gary T.", date: "Sep 30, 2023", aiScore: "94%", status: "Approved", category: "Mechanical" },
    { id: "REP-93895", asset: "Heater H-5", location: "Office Block", vendor: "HeatTech", supervisor: "Maria G.", date: "Sep 29, 2023", aiScore: "86%", status: "Approved", category: "Mechanical" },
    { id: "REP-93890", asset: "Gate G-12", location: "Main Entry", vendor: "SecuriCo", supervisor: "Gary T.", date: "Sep 28, 2023", aiScore: "98%", status: "Approved", category: "Safety" },
    { id: "REP-93885", asset: "Sensor S-44", location: "Line 4", vendor: "Logic", supervisor: "Maria G.", date: "Sep 27, 2023", aiScore: "83%", status: "Pending", category: "Electrical" },
    { id: "REP-93880", asset: "Motor M-03", location: "Pump Room", vendor: "Baldor", supervisor: "Gary T.", date: "Sep 26, 2023", aiScore: "91%", status: "Approved", category: "Electrical" },
    { id: "REP-93875", asset: "Blower B-1", location: "Dryer Unit", vendor: "AirForce", supervisor: "Maria G.", date: "Sep 25, 2023", aiScore: "87%", status: "Approved", category: "Mechanical" },
  ],
  4: [
    { id: "REP-93870", asset: "Crane C-02", location: "Yard South", vendor: "HeavyLift", supervisor: "Steve D.", date: "Sep 24, 2023", aiScore: "95%", status: "Approved", category: "Safety" },
    { id: "REP-93865", asset: "Press 100T", location: "Main Floor", vendor: "Stark Mfr", supervisor: "Julia V.", date: "Sep 23, 2023", aiScore: "75%", status: "Pending", category: "Mechanical" },
    { id: "REP-93860", asset: "Mill M-01", location: "Machine Shop", vendor: "Haas", supervisor: "Steve D.", date: "Sep 22, 2023", aiScore: "93%", status: "Approved", category: "Mechanical" },
    { id: "REP-93855", asset: "Valve V-09", location: "Steam Line", vendor: "Precision", supervisor: "Julia V.", date: "Sep 21, 2023", aiScore: "48%", status: "Rejected", category: "Mechanical" },
    { id: "REP-93850", asset: "Gage G-2", location: "QC Lab", vendor: "Starrett", supervisor: "Steve D.", date: "Sep 20, 2023", aiScore: "99%", status: "Approved", category: "Safety" },
    { id: "REP-93845", asset: "Filter F-5", location: "HVAC Unit 2", vendor: "CleanAir", supervisor: "Julia V.", date: "Sep 19, 2023", aiScore: "82%", status: "Approved", category: "Mechanical" },
    { id: "REP-93840", asset: "Controller C4", location: "Line 2", vendor: "Siemens", supervisor: "Steve D.", date: "Sep 18, 2023", aiScore: "90%", status: "Approved", category: "Electrical" },
    { id: "REP-93835", asset: "Belt B-08", location: "Packaging", vendor: "IndusCorp", supervisor: "Julia V.", date: "Sep 17, 2023", aiScore: "80%", status: "Pending", category: "Mechanical" },
    { id: "REP-93830", asset: "Scanner S1", location: "Entry A", vendor: "Keyence", supervisor: "Steve D.", date: "Sep 16, 2023", aiScore: "96%", status: "Approved", category: "Safety" },
    { id: "REP-93825", asset: "Tank T-04", location: "Storage B", vendor: "Vessels", supervisor: "Julia V.", date: "Sep 15, 2023", aiScore: "88%", status: "Approved", category: "Mechanical" },
  ],
};

export default function ReportsPage() {
  const router = useRouter();

  // Selected pagination & query states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("Any Status");
  const [dateRangeText, setDateRangeText] = useState("Oct 01 - Oct 31, 2023");
  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole") || "Admin";
    }
    return "Admin";
  });

  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Toast Helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Status Badge UI helper
  const getStatusBadge = (status: "Approved" | "Pending" | "Rejected") => {
    let bgColor = "bg-green-100";
    let textColor = "text-green-800";
    let dotColor = "bg-green-600";

    if (status === "Pending") {
      bgColor = "bg-amber-100";
      textColor = "text-amber-800";
      dotColor = "bg-amber-500";
    } else if (status === "Rejected") {
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      dotColor = "bg-red-600";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${bgColor} ${textColor} font-bold text-xs border-[1.5px] border-[#1A1A1A]`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
        {status}
      </span>
    );
  };

  // AI Score color helper
  const getScoreColor = (scoreStr: string) => {
    const score = parseInt(scoreStr);
    if (score >= 90) return "text-green-700 font-extrabold";
    if (score >= 70) return "text-amber-600 font-extrabold";
    return "text-[#D32F2F] font-extrabold";
  };

  // We combine the mock page groups into a single flat array
  const ALL_REPORTS: Report[] = React.useMemo(() => {
    return [
      ...(REPORT_DATA[1] || []),
      ...(REPORT_DATA[2] || []),
      ...(REPORT_DATA[3] || []),
      ...(REPORT_DATA[4] || []),
    ];
  }, []);

  const parseDate = (dateStr: string) => {
    return new Date(dateStr).getTime() || 0;
  };

  // Filter and sort the flat array of reports (descending by date)
  const filteredReports = React.useMemo(() => {
    return ALL_REPORTS.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supervisor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "All Categories" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "Any Status" || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      return parseDate(b.date) - parseDate(a.date);
    });
  }, [ALL_REPORTS, searchQuery, categoryFilter, statusFilter]);

  const PAGE_SIZE = 5;

  // We simulate 1,284 total items if no search/filter is active
  const totalVirtualReports = React.useMemo(() => {
    const isFiltered =
      searchQuery ||
      categoryFilter !== "All Categories" ||
      statusFilter !== "Any Status";
    return isFiltered ? filteredReports.length : 1284;
  }, [filteredReports, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(totalVirtualReports / PAGE_SIZE);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, statusFilter]);

  // Active reports for the current page
  const activeReports = React.useMemo(() => {
    if (filteredReports.length === 0) return [];
    
    // If the total virtual count matches the filtered dataset, slice normally
    if (totalVirtualReports <= filteredReports.length) {
      return filteredReports.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      );
    }

    // Otherwise, simulate wrap-around pagination:
    const result: Report[] = [];
    const startIndex = ((currentPage - 1) * PAGE_SIZE) % filteredReports.length;
    for (let i = 0; i < PAGE_SIZE; i++) {
      const index = (startIndex + i) % filteredReports.length;
      const baseItem = filteredReports[index];
      
      const virtualOffset = Math.floor(
        ((currentPage - 1) * PAGE_SIZE + i) / filteredReports.length
      );
      
      const numericId = parseInt(baseItem.id.split("-")[1]) || 94000;
      const simulatedId = `REP-${numericId - virtualOffset}`;
      
      result.push({
        ...baseItem,
        id: simulatedId,
      });
    }
    return result;
  }, [filteredReports, currentPage, totalVirtualReports]);

  // Simulated export notifications
  const handleExportCSV = () => {
    triggerToast("Generating CSV report export package...", "success");
  };

  const handleExportPDF = () => {
    triggerToast("Generating print-ready PDF audit sheet...", "success");
  };

  return (
    <div className="flex h-screen w-full bg-[#fff8f7] text-[#1A1A1A] font-body-md overflow-hidden">

      {/* Main Content Area */}
      <main className="ml-[220px] w-[calc(100%-220px)] h-screen flex flex-col overflow-hidden bg-[#fff8f7] relative">
        {/* TopNavBar */}
        <header className="h-20 px-10 flex justify-between items-center bg-[#fff8f7] border-b-2 border-[#1A1A1A] sticky top-0 z-40">
          <div>
            <h2 className="font-headline-md text-2xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
              Reports
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border-2 border-[#1A1A1A]">
              <span className="material-symbols-outlined text-[#D32F2F] text-xl">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Report ID..."
                className="bg-transparent border-none focus:ring-0 text-xs w-48 outline-none font-bold uppercase"
              />
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-1 overflow-y-auto scroll-container p-10 space-y-8 pb-28">
          {/* Summary Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between shadow-none">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Total Reports
                </span>
                <span className="material-symbols-outlined text-[#D32F2F]">description</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">1,284</p>
                <p className="text-xs text-green-700 font-extrabold mt-1">↑ 12% vs last month</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between shadow-none border-l-8 border-l-green-600">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Approved
                </span>
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">1,102</p>
                <p className="text-xs text-on-surface-variant font-extrabold opacity-60 mt-1">85.8% Accuracy</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between shadow-none border-l-8 border-l-amber-500">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Pending
                </span>
                <span className="material-symbols-outlined text-amber-500">hourglass_empty</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">156</p>
                <p className="text-xs text-on-surface-variant font-extrabold opacity-60 mt-1">Avg 2.4h turnaround</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between shadow-none border-l-8 border-l-[#D32F2F]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Rejected
                </span>
                <span className="material-symbols-outlined text-[#D32F2F]">cancel</span>
              </div>
              <div className="mt-4">
                <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">26</p>
                <p className="text-xs text-[#D32F2F] font-extrabold mt-1">Requires re-inspection</p>
              </div>
            </div>
          </div>

          {/* Controls Area */}
          <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
            <div className="flex flex-wrap gap-4 flex-grow lg:flex-nowrap">
              {/* Quick Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                  Quick Filter
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
                    filter_list
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Categories">All Categories</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Safety">Safety</option>
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                >
                  <option value="Any Status">Any Status</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex-1 min-w-[200px]">
                <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                  Date Range
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">
                    calendar_today
                  </span>
                  <input
                    type="text"
                    value={dateRangeText}
                    onChange={(e) => setDateRangeText(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none bg-white uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 shrink-0">
              <button
                onClick={handleExportCSV}
                className="px-6 py-3 rounded-full border-2 border-[#1A1A1A] bg-white text-solid-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="px-6 py-3 rounded-full border-2 border-[#1A1A1A] bg-[#D32F2F] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                Export PDF
              </button>
            </div>
          </div>

          {/* Reports Table */}
          <div className="border-2 border-[#1A1A1A] rounded-[20px] overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A1A1A] text-white uppercase text-xs tracking-wider">
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">ID</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Asset Name</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Location</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Vendor</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Supervisor</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Date</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10 text-center">AI Score</th>
                  <th className="px-6 py-4 font-extrabold border-r border-white/10">Status</th>
                  <th className="px-6 py-4 font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold uppercase">
                {activeReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-on-surface-variant/40 font-black">
                      No reports match the active filters.
                    </td>
                  </tr>
                ) : (
                  activeReports.map((report) => (
                    <tr key={report.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4 font-black border-r border-b border-[#1A1A1A]">{report.id}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{report.asset}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{report.location}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{report.vendor}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{report.supervisor}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{report.date}</td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A] text-center">
                        <span className={getScoreColor(report.aiScore)}>{report.aiScore}</span>
                      </td>
                      <td className="px-6 py-4 border-r border-b border-[#1A1A1A]">{getStatusBadge(report.status)}</td>
                      <td className="px-6 py-4 border-b border-[#1A1A1A]">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                localStorage.setItem("lastReviewStatus", report.status);
                                localStorage.setItem("lastReviewNotes", "Compliance evaluation record.");
                                localStorage.setItem("lastReviewSupervisor", report.supervisor);
                              }
                              router.push("/supervisor/tasks/report-preview");
                            }}
                            className="p-1.5 rounded-lg border border-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            onClick={() => triggerToast(`Downloading PDF document for ${report.id}...`, "success")}
                            className="p-1.5 rounded-lg border border-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white transition-all cursor-pointer flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <footer className="flex justify-between items-center bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] shadow-none">
            <p className="text-xs font-bold text-on-surface-variant uppercase opacity-60">
              Showing {activeReports.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, totalVirtualReports)} of {totalVirtualReports.toLocaleString()} reports
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#fff0ef] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-bold text-xs uppercase transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#D32F2F] text-white border-2 border-[#D32F2F]"
                        : "border-2 border-[#1A1A1A] hover:bg-[#fff0ef] text-solid-black"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {totalPages > 4 && (
                <>
                  <span className="px-2 font-bold text-sm text-on-surface-variant/40">...</span>
                  
                  <button
                    onClick={() => {
                      setCurrentPage(totalPages);
                      triggerToast(`Loaded simulated page ${totalPages} reports dataset`, "info");
                    }}
                    className={`w-10 h-10 rounded-lg font-bold text-xs uppercase transition-all cursor-pointer ${
                      currentPage === totalPages
                        ? "bg-[#D32F2F] text-white border-2 border-[#D32F2F]"
                        : "border-2 border-[#1A1A1A] hover:bg-[#fff0ef] text-solid-black"
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-[#fff0ef] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </footer>
        </div>

        {/* Toasts List Popup */}
        <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-[#1a1c1c] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border-2 border-[#D32F2F] animate-in fade-in slide-in-from-top-5 duration-300"
            >
              <span className="material-symbols-outlined text-sm text-[#D32F2F]">check_circle</span>
              <span className="font-bold text-xs uppercase tracking-wider">{toast.message}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
