"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "Pass" | "Fail" | string;
  image?: string;
  comment?: string;
}

interface POI {
  poi: string;
  name: string;
  confidence: number;
  status: "OPTIMAL" | "WARNING" | "CRITICAL";
  details: string;
}

interface AuditLog {
  time: string;
  message: string;
}

interface Task {
  id: string;
  title: string;
  asset: string;
  category: "Mechanical" | "Electrical" | "Safety" | "HVAC" | "Facilities";
  tech: string;
  location: string;
  time: string;
  date: string;
  status: "In Review" | "Approved" | "Rejected";
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE";
  checklist: ChecklistItem[];
  aiAnalysis: POI[];
  auditLog: AuditLog[];
  supervisorNotes?: string;
  techNotes?: string;
  serialNumber?: string;
  supervisor?: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const INITIAL_TASKS: Task[] = [
  {
    id: "PM-8829-X",
    title: "Hydraulic Press A12 Review",
    asset: "Hydraulic Press A12",
    category: "Mechanical",
    tech: "Marcus Aurelius",
    location: "Line 04",
    time: "2 hours ago",
    date: "2026-07-01",
    status: "In Review",
    confidence: "HIGH CONFIDENCE",
    techNotes: "Hydraulic cylinder seals inspected. Small weep on seal 2. Rest optimal.",
    checklist: [
      {
        id: "TASK 001",
        title: "Inspect seal integrity",
        description: "Verify hydraulic cylinder seal wear and pressure weeping.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4ehHv_Pmf7iEOQzmvh0q3tH4Wj-DPggjOL-OlHnZTAcFKQy7ov4AZZ2UIjP-XmVzIuKHyCd4U70_ioe9Ffu5uvdBRcE7lOiyo1EPdN1jZZ-KZ6RXigJtbzxY20nkMTdIt67fBpfVM2SU49Jkh9JxrYOrGXe_1DBKpOyJgbgC0hF5YZiFgOfqBG8JmFtlvNEe86rmTs9RzktFDdW7LGJ8fTHNe7_5AqW0F4TrPsOQTmSewEVSysBPqYfyLNtwWrxOvcNfMoWxWWwAX",
        comment: "Seal remains flexible. No weeping observed at high pressure."
      },
      {
        id: "TASK 002",
        title: "Verify fluid levels",
        description: "Check hydraulic fluid levels in secondary reservoir.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkBwmdcZiPXTHJpYv8toDyQD32U4n8tXNk3oEBv46NDs9DoImHFnnriQ720NLKOmAGXxdYi12gMRPyVniPP47CNVf-NuoIuXPHe8O7GecgETrKjyTg-H1f19aMm03sqdxHLQB6wWAOQUaMupBi47G_RDJID4RoQLyKkNi-SFd7a6yclYQffw-N04BE7D7uahOt5XP2H-nQ_ftuiU2MF4vr0DvBdb2T-qhwqND5-ZHUrIJC3KP8OO8efC5hBKEkBqE7d_ZsZcZnsVzf",
        comment: "Fluid level confirmed at sight-glass center line."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1A", name: "Bearing Housing", confidence: 98.2, status: "OPTIMAL", details: "THERMAL: 32°C" },
      { poi: "POI 2B", name: "Structural Corrosion", confidence: 64.5, status: "WARNING", details: "REGION: UPPER" }
    ],
    auditLog: [
      { time: "08:30", message: "Inspection initiated by Lead Inspector." },
      { time: "09:12", message: "Vision Core V4.2 processing complete." },
      { time: "09:15", message: "Pending final sign-off." }
    ]
  },
  {
    id: "TK-8021",
    title: "HVAC Filter Maintenance",
    asset: "Carrier WeatherMaker 50TC",
    category: "HVAC",
    tech: "Sarah Jenkins",
    location: "Unit B4",
    time: "1 hour ago",
    date: "2026-07-01",
    status: "In Review",
    confidence: "HIGH CONFIDENCE",
    techNotes: "Replaced intake filters and cleaned mesh. Fan belt tension is within limits.",
    checklist: [
      {
        id: "TASK 001",
        title: "Inspect air mesh cleanliness",
        description: "Inspect primary intake grilles and mesh filters for blockage.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5PUuGyQj5iS4K8OsIciVH7soDv1iZxtqoatUCeaCmEEKmdhA1x8m6nw1yuqlGdGaC5Xd-Pi7ruxFFEFOzDJVJvI6jxfhNEwxOGSYYK3aqTn7bUyWkASIk5CfpFsqtupp3qdntxCuEE23lVt4HpQDmVifRZ_F75McxZHaG7m2q474o047fSPROxEORil2stcLkoeNGCABR5wGRtbNqpZ-omsxPX5lnF_k7-26BkpXXV66DAYAi_HNPfpPywwFX6H2QGo1H3p6WAJ5U",
        comment: "Filter media replaced with new MERV 8 pleated filter."
      },
      {
        id: "TASK 002",
        title: "Verify condenser fan rotation",
        description: "Verify fan blades rotate freely and motor amp draw is in spec.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQWUb5LOTZoIuovalKxmLsF41vRVQcq0LR84AMrPLbTsQWI6dZ7MkVseT_VhzvMUfmjv1hZqvhdSNHzFVyR4kcUxey6QGCXtMDrutqQV78pkcIX02ngIzNYTYGITrhczkR7o464SNP2A0Yzd6ZgLIOJYnf6Zob6DGmtvjx2_db_2o6VOOYrkNFp7-3RJUhPpSc5nrWHfK-KFwATiq6hh8JK4rai6NqJIWCAoT_oApd135arFmnIpLlch-uCzd5v4a2Gck4A7REIKqV",
        comment: "Fan blades rotate freely, no noise or vibration."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Intake Plenum", confidence: 94.1, status: "OPTIMAL", details: "PRESSURE: 120 PSI" },
      { poi: "POI 2", name: "Fan Belt", confidence: 88.5, status: "OPTIMAL", details: "TENSION: NOMINAL" }
    ],
    auditLog: [
      { time: "10:15", message: "Maintenance checklist uploaded by Sarah." },
      { time: "10:20", message: "AI Vision system verification complete." },
      { time: "10:22", message: "Awaiting supervisor review." }
    ]
  },
  {
    id: "TK-7945",
    title: "Emergency Exit Inspection",
    asset: "Main Exit Gate Alpha",
    category: "Safety",
    tech: "Robert Chen",
    location: "Perimeter Sector 2",
    time: "2 hours ago",
    date: "2026-07-01",
    status: "In Review",
    confidence: "HIGH CONFIDENCE",
    techNotes: "Emergency exit push bar tested. Latches release under standard load.",
    checklist: [
      {
        id: "TASK 001",
        title: "Inspect door latch release",
        description: "Verify emergency panic bars open latch easily under low load.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        comment: "Panic bar tested. Releases door cleanly on first push."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Latch Mechanism", confidence: 99.1, status: "OPTIMAL", details: "TEMP: NOMINAL" }
    ],
    auditLog: [
      { time: "09:30", message: "Performed exit route verification." },
      { time: "09:40", message: "Automated sign-off ready." }
    ]
  },
  {
    id: "TK-7832",
    title: "Conveyor Belt Lubrication",
    asset: "Conveyor B-Prime",
    category: "Mechanical",
    tech: "Alex Rivera",
    location: "Line 04",
    time: "3 hours ago",
    date: "2026-07-01",
    status: "Approved",
    confidence: "HIGH CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Verify bearing friction",
        description: "Audit bearing grease condition and pulley alignment.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBqbvpTUTw5nVlHUGPIM_58IuVEriqPH2truMf98NhkI4CNG_mbt19uICYYWVmnNvgB1bKVC3kkf7pXU0PZgutmUg1iaYISbsOoOtOtZTAAL-PIDiUouKVEx6DQjewjujc6lt8rXp0_mDCmwOB1yaeCtAiyjcpVFcgxcdvcr6jd2vNIpiRnI4KgjZd2nYP7IHwx0cadSJNw_YGHt_Mlc6-M5QtwgXrkqUL3EoJPgRsQj_vgra_QgKoI_QIwkri2gjteYJCUIZl0Zmra",
        comment: "Grease applied to main drive pulley bearings. Running smoothly."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Main Sprocket", confidence: 85.0, status: "WARNING", details: "FRICTION: ELEVATED" }
    ],
    auditLog: [
      { time: "08:00", message: "Lubrication cycle completed by Alex." },
      { time: "08:30", message: "Approved and signed off by supervisor." }
    ]
  },
  {
    id: "TK-7611",
    title: "Main Breaker Thermal Scan",
    asset: "Breaker Substation B",
    category: "Electrical",
    tech: "David Miller",
    location: "Substation B",
    time: "4 hours ago",
    date: "2026-07-01",
    status: "Rejected",
    confidence: "LOW CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Thermal scanner image",
        description: "Conduct thermal imaging analysis of phase connections.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkBwmdcZiPXTHJpYv8toDyQD32U4n8tXNk3oEBv46NDs9DoImHFnnriQ720NLKOmAGXxdYi12gMRPyVniPP47CNVf-NuoIuXPHe8O7GecgETrKjyTg-H1f19aMm03sqdxHLQB6wWAOQUaMupBi47G_RDJID4RoQLyKkNi-SFd7a6yclYQffw-N04BE7D7uahOt5XP2H-nQ_ftuiU2MF4vr0DvBdb2T-qhwqND5-ZHUrIJC3KP8OO8efC5hBKEkBqE7d_ZsZcZnsVzf",
        comment: "Thermal scan reveals Phase C connector hot spot."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Phase C Connector", confidence: 42.0, status: "CRITICAL", details: "TEMP: 82°C" }
    ],
    auditLog: [
      { time: "07:15", message: "Thermal scan recorded by David." },
      { time: "07:30", message: "Rejected due to excessive hot spot temperature (82°C)." }
    ]
  },
  {
    id: "TK-7590",
    title: "Pressure Valve Calibration",
    asset: "Pump House 3 Valve",
    category: "Mechanical",
    tech: "Emma Watson",
    location: "Pump House 3",
    time: "6 hours ago",
    date: "2026-07-01",
    status: "In Review",
    confidence: "MEDIUM CONFIDENCE",
    techNotes: "Calibrated pressure valve set point to 150 PSI. No leakage observed at full load.",
    checklist: [
      {
        id: "TASK 001",
        title: "Check relief pressure",
        description: "Test calibration setpoint of safety release relief valves.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD4ehHv_Pmf7iEOQzmvh0q3tH4Wj-DPggjOL-OlHnZTAcFKQy7ov4AZZ2UIjP-XmVzIuKHyCd4U70_ioe9Ffu5uvdBRcE7lOiyo1EPdN1jZZ-KZ6RXigJtbzxY20nkMTdIt67fBpfVM2SU49Jkh9JxrYOrGXe_1DBKpOyJgbgC0hF5YZiFgOfqBG8JmFtlvNEe86rmTs9RzktFDdW7LGJ8fTHNe7_5AqW0F4TrPsOQTmSewEVSysBPqYfyLNtwWrxOvcNfMoWxWWwAX",
        comment: "Calibrated pressure valve set point to 150 PSI."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Diaphragm Seal", confidence: 89.2, status: "OPTIMAL", details: "PRESSURE: NOMINAL" }
    ],
    auditLog: [
      { time: "06:12", message: "Pressure reading calibrated by Emma." },
      { time: "06:30", message: "Awaiting supervisor audit confirmation." }
    ]
  },
  {
    id: "TK-7422",
    title: "Fire Damper Inspection",
    asset: "Fire Damper Sector 7G",
    category: "Safety",
    tech: "John Doe",
    location: "Sector 7G",
    time: "8 hours ago",
    date: "2026-07-01",
    status: "Approved",
    confidence: "HIGH CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Inspect fusible link",
        description: "Check fusible heat-release linkage for fatigue or damage.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        comment: "Fusible link intact, damper door fully functional."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Fusible Link", confidence: 98.7, status: "OPTIMAL", details: "INTEGRITY: 100%" }
    ],
    auditLog: [
      { time: "05:00", message: "Fusible link integrity confirmed by John." },
      { time: "05:30", message: "Audit approved by supervisor." }
    ]
  },
  {
    id: "TK-7301",
    title: "Cooling Tower Fan Check",
    asset: "Cooling Tower C",
    category: "Facilities",
    tech: "Robert Chen",
    location: "Roof West",
    time: "1 day ago",
    date: "2026-06-30",
    status: "Approved",
    confidence: "HIGH CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Fan motor scan",
        description: "Inspect tower fan assembly vibration and motor bearings.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQWUb5LOTZoIuovalKxmLsF41vRVQcq0LR84AMrPLbTsQWI6dZ7MkVseT_VhzvMUfmjv1hZqvhdSNHzFVyR4kcUxey6QGCXtMDrutqQV78pkcIX02ngIzNYTYGITrhczkR7o464SNP2A0Yzd6ZgLIOJYnf6Zob6DGmtvjx2_db_2o6VOOYrkNFp7-3RJUhPpSc5nrWHfK-KFwATiq6hh8JK4rai6NqJIWCAoT_oApd135arFmnIpLlch-uCzd5v4a2Gck4A7REIKqV",
        comment: "Lubricated bearings and tested fan rotation. Replaced shield."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Motor Bearing", confidence: 95.0, status: "OPTIMAL", details: "VIB: 0.1mm/s" }
    ],
    auditLog: [
      { time: "Yesterday", message: "Cooling tower vibration test performed." },
      { time: "Yesterday", message: "Approved and closed." }
    ]
  },
  {
    id: "TK-7250",
    title: "Generator Load Testing",
    asset: "Backup Gen-Set 02",
    category: "Electrical",
    tech: "David Miller",
    location: "Power Station",
    time: "1 day ago",
    date: "2026-06-30",
    status: "In Review",
    confidence: "MEDIUM CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Load bank operation",
        description: "Verify engine output frequency and governor control response.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkBwmdcZiPXTHJpYv8toDyQD32U4n8tXNk3oEBv46NDs9DoImHFnnriQ720NLKOmAGXxdYi12gMRPyVniPP47CNVf-NuoIuXPHe8O7GecgETrKjyTg-H1f19aMm03sqdxHLQB6wWAOQUaMupBi47G_RDJID4RoQLyKkNi-SFd7a6yclYQffw-N04BE7D7uahOt5XP2H-nQ_ftuiU2MF4vr0DvBdb2T-qhwqND5-ZHUrIJC3KP8OO8efC5hBKEkBqE7d_ZsZcZnsVzf",
        comment: "Steady 480V output confirmed under full load."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Exciters", confidence: 92.4, status: "OPTIMAL", details: "VOLTAGE: 480V" }
    ],
    auditLog: [
      { time: "Yesterday", message: "Load test performed at 100% capacity." },
      { time: "Yesterday", message: "Telemetry verified by automated agent." }
    ]
  },
  {
    id: "TK-7110",
    title: "Lighting System Audit",
    asset: "Factory Floor Lighting",
    category: "Facilities",
    tech: "Emma Watson",
    location: "Sector 7G",
    time: "2 days ago",
    date: "2026-06-29",
    status: "Approved",
    confidence: "HIGH CONFIDENCE",
    checklist: [
      {
        id: "TASK 001",
        title: "Lux meter audit",
        description: "Check industrial lighting output levels across main packing hall.",
        status: "Pass",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAX4GvgHbE6sHyxp1a6pBEHGlqiB3qbDj7HQ9fAQQgIpN-FXUXfzK-5aP8hhrPe1Kkqj1yk2J5s97U-QDn6E3TRIzT6NNO05RRzoMHu2bqEtWH8svew-mlHLs_trG8FHB5rYfbOrculRtZAM7aKd9sbt6YDkuJEXCTwWMzNcV1Bx_5UHoRyUnMIWdhehZGhZyjrZvpvxBcJ-WlTPdoDS7j_0wtK24YZKQViUaWOl_lwxV_8XpxKddnKm4kkMOSbMVDmjTmzzqp-at5y",
        comment: "Average 520 lux recorded. Nominal work space output."
      }
    ],
    aiAnalysis: [
      { poi: "POI 1", name: "Photo-sensors", confidence: 97.5, status: "OPTIMAL", details: "LUX: 520" }
    ],
    auditLog: [
      { time: "2 days ago", message: "Factory floor illumination mapping completed." },
      { time: "2 days ago", message: "Approved and recorded." }
    ]
  }
];

export default function ReviewDetailPage() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vendor_tasks");
      if (saved) {
        try {
          const vendorTasks = JSON.parse(saved);
          return INITIAL_TASKS.map((t) => {
            const vt = vendorTasks.find((v: any) => v.id === t.id);
            if (vt) {
              return {
                ...t,
                status: vt.status === "Pending" ? "In Review" : vt.status === "Completed" ? "Approved" : t.status,
                techNotes: vt.techNotes,
                serialNumber: vt.serialNumber || t.serialNumber,
                supervisor: vt.supervisor || t.supervisor,
                checklist: t.checklist.map((item, idx) => {
                  const vItem = vt.checklist.find((c: any) => c.title === item.title) || vt.checklist[idx];
                  if (vItem) {
                    return {
                      ...item,
                      image: vItem.image || item.image,
                      comment: vItem.notes || item.comment || "",
                      status: vItem.status === "Pass" ? "Pass" : item.status
                    };
                  }
                  return item;
                })
              };
            }
            return t;
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_TASKS;
  });
  
  // Navigation & Review selection state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notes state
  const [notes, setNotes] = useState("");
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Signature States for Approval Modal
  const approveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [approveSigned, setApproveSigned] = useState(false);
  const [isApproveDrawing, setIsApproveDrawing] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");

  // Signature States for Rejection Modal
  const rejectCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rejectSigned, setRejectSigned] = useState(false);
  const [isRejectDrawing, setIsRejectDrawing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Trigger Toast Notification
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Initialize Canvas Drawing context
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null, setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null, isDrawing: boolean, setSigned: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!isDrawing || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if ("touches" in e) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setSigned(true);
  };

  const stopDrawing = (setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>) => {
    setIsDrawing(false);
  };

  const clearSignature = (canvas: HTMLCanvasElement | null, setSigned: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
  };

  // Get active selected task data
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Approval Submission
  const handleConfirmApproval = () => {
    if (!approveSigned || !selectedTask) return;
    
    const finalSupervisorNotes = approveNotes || notes || "All checklist items pass operational criteria.";
    
    const updatedTasks = tasks.map(t => t.id === selectedTask.id ? {
      ...t,
      status: "Approved" as const,
      supervisorNotes: finalSupervisorNotes
    } : t);
    setTasks(updatedTasks);

    // Sync back to vendor_tasks localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vendor_tasks");
      if (saved) {
        try {
          const vendorTasks = JSON.parse(saved);
          const updatedVendor = vendorTasks.map((vt: any) => {
            if (vt.id === selectedTask.id) {
              return {
                ...vt,
                status: "Completed",
                supervisorNotes: finalSupervisorNotes
              };
            }
            return vt;
          });
          localStorage.setItem("vendor_tasks", JSON.stringify(updatedVendor));
        } catch (e) {
          console.error(e);
        }
      }
    }

    triggerToast(`PM Report for ${selectedTask.id} Approved and Signed Off successfully.`, "success");
    setIsApproveModalOpen(false);
    clearSignature(approveCanvasRef.current, setApproveSigned);
    
    // Clear temp notes and go back to list
    setNotes("");
    setApproveNotes("");
    setSelectedTaskId(null);
  };

  // Rejection Submission
  const handleConfirmRejection = () => {
    if (!rejectSigned || !rejectReason.trim() || !selectedTask) {
      triggerToast("Rejection notes are required.", "error");
      return;
    }

    const finalSupervisorNotes = rejectReason;

    const updatedTasks = tasks.map(t => t.id === selectedTask.id ? {
      ...t,
      status: "Rejected" as const,
      supervisorNotes: finalSupervisorNotes
    } : t);
    setTasks(updatedTasks);

    // Sync back to vendor_tasks localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vendor_tasks");
      if (saved) {
        try {
          const vendorTasks = JSON.parse(saved);
          const updatedVendor = vendorTasks.map((vt: any) => {
            if (vt.id === selectedTask.id) {
              return {
                ...vt,
                status: "Active",
                supervisorNotes: finalSupervisorNotes
              };
            }
            return vt;
          });
          localStorage.setItem("vendor_tasks", JSON.stringify(updatedVendor));
        } catch (e) {
          console.error(e);
        }
      }
    }

    triggerToast(`PM Report for ${selectedTask.id} Rejected & returned for revision.`, "error");
    setIsRejectModalOpen(false);
    clearSignature(rejectCanvasRef.current, setRejectSigned);
    
    // Clear temp notes and go back to list
    setNotes("");
    setRejectReason("");
    setSelectedTaskId(null);
  };

  // Filter tasks based on Search, Category, Status, and Date Range
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Calculate stats
  const belumDiReviewCount = tasks.filter(t => t.status === "In Review").length;
  const sudahDiReviewCount = tasks.filter(t => t.status === "Approved" || t.status === "Rejected").length;

  // Pagination bounds
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  // Sync pagination page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, startDate, endDate]);

  return (
    <div className="flex h-screen w-full bg-white text-[#1A1A1A] font-body-md select-none relative overflow-hidden">
      {/* Scroll fix CSS */}
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

      {/* Side Navigation Bar */}
      <aside className="fixed h-screen left-0 top-0 w-[220px] border-r-2 border-[#1A1A1A] bg-[#1A1A1A] flex flex-col py-4 z-50 text-white">
        <div className="px-6 mb-10">
          <h1 className="font-headline-md text-xl font-extrabold text-white leading-tight">MAINTAIN.AI</h1>
          <p className="text-[10px] text-white opacity-60 uppercase font-bold tracking-widest">
            Industrial Precision
          </p>
        </div>
        <nav className="flex-1 space-y-2 px-2">
          <button
            onClick={() => router.push("/supervisor/dashboard")}
            className="w-full px-4 py-3 flex items-center gap-4 text-white/70 hover:bg-white/10 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>

          {/* Active Navigation: Tasks */}
          <button
            onClick={() => {
              setSelectedTaskId(null);
            }}
            className="bg-[#D32F2F] text-white w-full px-4 py-3 flex items-center gap-4 text-left font-label-md text-sm uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
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

        {/* User Profile Widget */}
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

          <button
            onClick={() => router.push("/supervisor/profile")}
            className="flex items-center gap-3 text-left w-full hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
          >
            <div className="w-10 h-10 border-2 border-[#D32F2F] rounded-full overflow-hidden shrink-0">
              <img
                className="w-full h-full object-cover"
                alt="A professional headshot of E. Schmidt."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGr1GabPuRddQJ5DDQodY0mm-FpKyAbdxG-40JLrOgFIVBSFGynpIMBLwDZl3ySnWeIMNrOrjiXIbIFGz1xdBjkdSM6TJTzOnweEAerX2BuY5Gnc6S9r3E2opIoMcrvKjmgqz7_ZLen6z0ZE1ISc2pPHvuhNXbQdU6YU6UMVFrBmJ07-KuIkgdRCGnD_yjTNxuBwkEPqcILVegDcQXrdgo0akHbD4ZgQEP9zZZY9UXUwsoBkz5TKicnENq_E-K90u1320ZOULkSmaY"
              />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs truncate text-white uppercase">E. Schmidt</p>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Lead Auditor</p>
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
                  selectedTask.status === "Approved" ? "bg-green-600" : selectedTask.status === "Rejected" ? "bg-[#1A1A1A]" : "bg-[#D32F2F]"
                }`}>
                  {selectedTask.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Reviewing: {selectedTask.asset}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-headline-md text-xl text-[#1A1A1A] font-extrabold uppercase tracking-tight">
                Tasks Review Portal
              </h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Authorized Supervisor Queue
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Layout */}
      {selectedTask ? (
        /* ================== DETAILED REVIEW VIEW ================== */
        <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
          <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto animate-in fade-in duration-300">
            <div className="grid grid-cols-12 gap-8">
              
              {/* Column 1: Checklist Results */}
              <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-md text-lg font-extrabold border-l-[6px] border-[#D32F2F] pl-4 uppercase tracking-tighter text-[#1A1A1A]">
                    Checklist
                  </h3>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {selectedTask.checklist.filter(item => item.status === "Pass").length} / {selectedTask.checklist.length} DONE
                  </span>
                </div>

                {selectedTask.checklist.map((item, idx) => (
                  <div key={item.id} className="bg-white border-2 border-[#1A1A1A] rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.id || `TASK 00${idx + 1}`}</span>
                        <h4 className="font-headline-md text-base font-extrabold text-black leading-tight">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 text-white px-3 py-1 bg-green-600 border-2 border-[#1A1A1A] rounded-full">
                        <span className="material-symbols-outlined text-sm" style={{ fontWeight: 800 }}>
                          check
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{item.status}</span>
                      </div>
                    </div>
                    
                    {item.image && (
                      <div className="w-full h-44 border-2 border-[#1A1A1A] rounded-lg overflow-hidden relative group">
                        <img
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                          alt={item.title}
                          src={item.image}
                        />
                        <div className="absolute inset-0 bg-[#D32F2F]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => setExpandedImage(item.image || null)}
                            className="bg-white border-2 border-[#1A1A1A] px-4 py-2 text-xs uppercase font-extrabold cursor-pointer hover:bg-gray-100"
                          >
                            Expand
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-black/5 p-4 rounded-lg border-2 border-black italic text-xs text-gray-700">
                      "{item.comment}"
                    </div>
                  </div>
                ))}
              </section>

              {/* Column 2: Actions */}
              <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-headline-md text-lg font-extrabold border-l-[6px] border-[#D32F2F] pl-4 uppercase tracking-tighter text-[#1A1A1A]">
                    Review
                  </h3>
                </div>

                <div className="bg-white border-2 border-[#1A1A1A] rounded-xl p-6 flex flex-col gap-6">
                  {selectedTask.techNotes && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-black font-black uppercase">Technician Notes</label>
                      <div className="border-2 border-[#1A1A1A] rounded-xl p-4 font-body-md text-xs bg-gray-50 text-gray-700 min-h-[60px] font-semibold whitespace-pre-wrap">
                        {selectedTask.techNotes}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-black font-black uppercase">Supervisor Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="border-2 border-[#1A1A1A] rounded-xl p-4 font-body-md text-xs min-h-[140px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                      placeholder={selectedTask.supervisorNotes || "Enter final observations..."}
                    ></textarea>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.setItem("lastReviewTechNotes", selectedTask.techNotes || "");
                          localStorage.setItem("lastReviewStatus", selectedTask.status === "Approved" ? "Approved" : selectedTask.status === "Rejected" ? "Rejected" : "Pending");
                          localStorage.setItem("lastReviewNotes", notes || selectedTask.supervisorNotes || "");
                          localStorage.setItem("lastReviewSupervisor", selectedTask.supervisor || "E. Schmidt");
                        }
                        router.push("/supervisor/tasks/report-preview");
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white hover:bg-black hover:text-white transition-all text-black cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      GET PDF REPORT
                    </button>

                    {selectedTask.status === "In Review" && (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setIsRejectModalOpen(true)}
                          className="py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-[#D32F2F] transition-all cursor-pointer"
                        >
                          REJECT
                        </button>
                        <button
                          onClick={() => setIsApproveModalOpen(true)}
                          className="py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-[#D32F2F] text-white hover:bg-black transition-all cursor-pointer"
                        >
                          APPROVE
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-6 border-t-2 border-black">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase">System Audit Log</span>
                      <span className="material-symbols-outlined text-black text-base">receipt_long</span>
                    </div>
                    <ul className="space-y-4">
                      {selectedTask.auditLog.map((log, idx) => (
                        <li key={idx} className="flex items-start gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#D32F2F] mt-1.5 flex-shrink-0"></div>
                          <p className="text-[11px] font-medium leading-relaxed">
                            <span className="font-black">{log.time}:</span> {log.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      ) : (
        /* ================== TASKS LIST VIEW ================== */
        <main className="ml-[220px] pt-20 h-screen overflow-y-auto bg-white w-[calc(100%-220px)] scroll-container">
          <div className="min-h-[calc(100vh-80px)] py-10 px-10 max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-300">
            
            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-[#D32F2F]">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total Tasks Pending Review
                  </span>
                  <span className="material-symbols-outlined text-[#D32F2F]">pending_actions</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-extrabold text-[#D32F2F] tracking-tighter">{belumDiReviewCount}</p>
                  <p className="text-xs text-red-600 font-bold uppercase mt-1">Requires audit sign-off</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] flex flex-col justify-between border-l-8 border-l-green-600">
                <div className="flex justify-between items-start">
                  <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total Tasks Reviewed
                  </span>
                  <span className="material-symbols-outlined text-green-600">verified</span>
                </div>
                <div className="mt-4">
                  <p className="font-headline-xl text-5xl font-extrabold text-green-600 tracking-tighter">{sudahDiReviewCount}</p>
                  <p className="text-xs text-green-700 font-bold uppercase mt-1">Decision finalized</p>
                </div>
              </div>
            </div>

            {/* Filter and Control Panel */}
            <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A]">
              <div className="flex flex-wrap gap-4 flex-grow lg:flex-nowrap">
                
                {/* Search */}
                <div className="flex-1 min-w-[240px]">
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
                      placeholder="Search ID, Asset, Tech..."
                      className="w-full pl-10 pr-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none bg-white font-body-md"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Category Tasks
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
                <div className="flex-1 min-w-[200px]">
                  <label className="block font-label-sm text-xs font-bold mb-2 uppercase opacity-60 tracking-wider">
                    Status / Page
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-[20px] border-2 border-[#1A1A1A] font-bold text-sm text-[#1A1A1A] focus:ring-[#D32F2F] outline-none appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Date Filter: Start Date */}
                <div className="flex-1 min-w-[160px]">
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
                <div className="flex-1 min-w-[160px]">
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

            {/* Tasks Ledger Grid (Modern bento cards) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {paginatedTasks.length === 0 ? (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-300 rounded-[20px]">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">find_in_page</span>
                  <p className="font-extrabold uppercase text-gray-500 tracking-wider text-xs">No tasks match your filters</p>
                </div>
              ) : (
                paginatedTasks.map((task) => (
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
                        task.status === "Approved" ? "bg-green-600" : task.status === "Rejected" ? "bg-black" : "bg-[#D32F2F]"
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
                        Tech: <span className="text-black font-bold">{task.tech}</span> • {task.location}
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
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`px-5 py-2 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                          task.status === "In Review"
                            ? "bg-[#D32F2F] text-white hover:bg-black hover:border-black"
                            : "bg-white text-black hover:bg-black/5"
                        }`}
                      >
                        {task.status === "In Review" ? "Audit Report" : "Review details"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <footer className="flex justify-between items-center bg-white p-6 rounded-[20px] border-2 border-[#1A1A1A] shadow-none">
                <p className="text-xs font-bold text-gray-500 uppercase">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                            : "border-2 border-[#1A1A1A] hover:bg-gray-100 text-black"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg border-2 border-[#1A1A1A] flex items-center justify-center hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </footer>
            )}

          </div>
        </main>
      )}

      {/* Expanded Image Modal overlay */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setExpandedImage(null)}
          ></div>
          <div className="relative max-w-4xl max-h-[85vh] bg-white border-2 border-black rounded-xl p-2 z-10 animate-in zoom-in-95 duration-200">
            <img className="max-w-full max-h-[80vh] rounded-lg object-contain" src={expandedImage} alt="Expanded Inspection Asset" />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 bg-white border-2 border-black w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Approval Modal overlay */}
      {isApproveModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsApproveModalOpen(false)}
          ></div>
          <div className="relative bg-white border-2 border-[#1A1A1A] w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                  verified
                </span>
              </div>
              <div>
                <h3 className="font-headline-lg text-xl font-extrabold uppercase tracking-tighter">
                  Approve this PM Report?
                </h3>
                <p className="text-xs text-gray-500">The report will be signed off and archived.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/5 p-4 rounded-xl border-2 border-black/10">
                <p className="text-[9px] font-bold uppercase text-gray-400">Tech Status</p>
                <p className="font-extrabold text-xs text-green-600 uppercase">All Tasks Completed</p>
              </div>
              <div className="bg-black/5 p-4 rounded-xl border-2 border-black/10">
                <p className="text-[9px] font-bold uppercase text-gray-400">Asset Health</p>
                <p className="font-extrabold text-xs text-black uppercase">98/100</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-black">Reviewer Notes (Optional)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="border-2 border-black/10 rounded-xl p-3 font-body-md text-xs min-h-[80px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                placeholder="Add additional context if needed..."
              ></textarea>
            </div>

            {/* Signature Draw Area */}
            <div className="flex flex-col gap-4 border-t-2 border-black pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-black">Supervisor Signature</label>
                <button
                  onClick={() => clearSignature(approveCanvasRef.current, setApproveSigned)}
                  className="text-[9px] font-extrabold uppercase text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent"
                >
                  Clear Signature
                </button>
              </div>

              <div className="w-full h-32 bg-black/5 border-2 border-black rounded-xl flex items-center justify-center relative overflow-hidden">
                {!approveSigned && (
                  <span className="absolute text-gray-400 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
                    Draw your signature here
                  </span>
                )}
                <canvas
                  ref={approveCanvasRef}
                  width={400}
                  height={128}
                  onMouseDown={(e) => startDrawing(e, approveCanvasRef.current, setIsApproveDrawing)}
                  onMouseMove={(e) => draw(e, approveCanvasRef.current, isApproveDrawing, setApproveSigned)}
                  onMouseUp={() => stopDrawing(setIsApproveDrawing)}
                  onMouseLeave={() => stopDrawing(setIsApproveDrawing)}
                  onTouchStart={(e) => startDrawing(e, approveCanvasRef.current, setIsApproveDrawing)}
                  onTouchMove={(e) => draw(e, approveCanvasRef.current, isApproveDrawing, setApproveSigned)}
                  onTouchEnd={() => stopDrawing(setIsApproveDrawing)}
                  className="w-full h-full cursor-crosshair relative z-10"
                />
              </div>

              {!approveSigned && (
                <p className="text-[9px] text-[#D32F2F] font-bold uppercase">
                  Supervisor signature is required before approval.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white text-black hover:bg-black/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={!approveSigned}
                className={`py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all cursor-pointer ${
                  approveSigned ? "bg-[#D32F2F] hover:bg-black" : "bg-gray-300 opacity-50 cursor-not-allowed"
                }`}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal overlay */}
      {isRejectModalOpen && selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsRejectModalOpen(false)}
          ></div>
          <div className="relative bg-white border-2 border-[#1A1A1A] w-full max-w-lg p-8 rounded-[20px] space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 bg-red-500/10 text-[#D32F2F] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>
                  warning
                </span>
              </div>
              <div>
                <h3 className="font-headline-lg text-xl font-extrabold uppercase tracking-tighter">
                  Reject this PM Report?
                </h3>
                <p className="text-xs text-gray-500">Return the report for mandatory revision.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/5 p-4 rounded-xl border-2 border-black/10">
                <p className="text-[9px] font-bold uppercase text-gray-400">Status</p>
                <p className="font-extrabold text-xs text-[#D32F2F] uppercase">Requires Revision</p>
              </div>
              <div className="bg-black/5 p-4 rounded-xl border-2 border-black/10">
                <p className="text-[9px] font-bold uppercase text-gray-400">Reason Required</p>
                <p className="font-extrabold text-xs text-black uppercase">Yes</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-black">Reviewer Notes (Required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="border-2 border-[#D32F2F] rounded-xl p-3 font-body-md text-xs min-h-[80px] focus:ring-0 focus:border-[#D32F2F] transition-all resize-none bg-black/5"
                placeholder="Detail the reasons for rejection..."
                required
              ></textarea>
            </div>

            {/* Signature Draw Area */}
            <div className="flex flex-col gap-4 border-t-2 border-black pt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-black">Supervisor Signature</label>
                <button
                  onClick={() => clearSignature(rejectCanvasRef.current, setRejectSigned)}
                  className="text-[9px] font-extrabold uppercase text-[#D32F2F] hover:underline cursor-pointer border-none bg-transparent"
                >
                  Clear Signature
                </button>
              </div>

              <div className="w-full h-32 bg-black/5 border-2 border-black rounded-xl flex items-center justify-center relative overflow-hidden">
                {!rejectSigned && (
                  <span className="absolute text-gray-400 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
                    Draw your signature here
                  </span>
                )}
                <canvas
                  ref={rejectCanvasRef}
                  width={400}
                  height={128}
                  onMouseDown={(e) => startDrawing(e, rejectCanvasRef.current, setIsRejectDrawing)}
                  onMouseMove={(e) => draw(e, rejectCanvasRef.current, isRejectDrawing, setRejectSigned)}
                  onMouseUp={() => stopDrawing(setIsRejectDrawing)}
                  onMouseLeave={() => stopDrawing(setIsRejectDrawing)}
                  onTouchStart={(e) => startDrawing(e, rejectCanvasRef.current, setIsRejectDrawing)}
                  onTouchMove={(e) => draw(e, rejectCanvasRef.current, isRejectDrawing, setRejectSigned)}
                  onTouchEnd={() => stopDrawing(setIsRejectDrawing)}
                  className="w-full h-full cursor-crosshair relative z-10"
                />
              </div>

              {!rejectSigned && (
                <p className="text-[9px] text-[#D32F2F] font-bold uppercase">
                  Supervisor signature is required before rejection.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest bg-white text-black hover:bg-black/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectSigned || !rejectReason.trim()}
                className={`py-3 border-2 border-black rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all cursor-pointer ${
                  rejectSigned && rejectReason.trim() ? "bg-black hover:bg-[#D32F2F]" : "bg-gray-300 opacity-50 cursor-not-allowed"
                }`}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast notifications */}
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
                t.type === "success" ? "text-green-600" : t.type === "error" ? "text-primary" : "text-blue-500"
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
