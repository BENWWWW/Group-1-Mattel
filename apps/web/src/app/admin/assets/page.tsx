"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface MachineUnit {
  serialNumber: string;
  status: "Optimal" | "Due Soon" | "Overdue";
  interval: "Monthly" | "Quarterly" | "Bi-Annually" | "Annually";
}

interface Asset {
  id: string; // e.g. FAC-HVAC-001
  name: string;
  category: string;
  location: string;
  lastUpdate: string;
  units: MachineUnit[];
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const INITIAL_ASSETS: Asset[] = [
  {
    id: "FAC-HVAC-001",
    name: "Industrial HVAC Chiller",
    category: "MECHANICAL",
    location: "North Wing Plant, Level 2",
    lastUpdate: "12 OCT 2023",
    units: [
      { serialNumber: "SN-HVAC-9082-A", status: "Optimal", interval: "Quarterly" },
      { serialNumber: "SN-HVAC-3029-B", status: "Optimal", interval: "Quarterly" },
      { serialNumber: "SN-HVAC-5512-C", status: "Optimal", interval: "Monthly" },
    ],
  },
  {
    id: "PWR-TR-42",
    name: "Main Power Transformer",
    category: "ELECTRICAL",
    location: "External Substation Alpha",
    lastUpdate: "28 SEP 2023",
    units: [
      { serialNumber: "SN-XFMR-7023-A", status: "Due Soon", interval: "Bi-Annually" },
      { serialNumber: "SN-XFMR-1049-B", status: "Optimal", interval: "Bi-Annually" },
    ],
  },
  {
    id: "PUMP-HP-109",
    name: "High-Pressure Water Pump",
    category: "MECHANICAL",
    location: "Processing Unit 3, Basement",
    lastUpdate: "05 NOV 2023",
    units: [
      { serialNumber: "SN-PUMP-4421-A", status: "Optimal", interval: "Monthly" },
      { serialNumber: "SN-PUMP-9088-B", status: "Optimal", interval: "Monthly" },
    ],
  },
  {
    id: "CNC-U04-MFG",
    name: "CNC Lathe Unit 04",
    category: "MECHANICAL",
    location: "Fabrication Floor, Station D",
    lastUpdate: "15 AUG 2023",
    units: [
      { serialNumber: "SN-CNC-3312-A", status: "Overdue", interval: "Monthly" },
      { serialNumber: "SN-CNC-1122-B", status: "Optimal", interval: "Monthly" },
    ],
  },
  {
    id: "GEN-099",
    name: "Main Turbine Generator",
    category: "ELECTRICAL",
    location: "Power Plant, Level 1",
    lastUpdate: "10 NOV 2023",
    units: [
      { serialNumber: "SN-GEN-8834-A", status: "Optimal", interval: "Annually" },
    ],
  },
  {
    id: "PUMP-HP-112",
    name: "Hydraulic Press A-12",
    category: "HYDRAULIC",
    location: "Fabrication Floor, Station G",
    lastUpdate: "02 NOV 2023",
    units: [
      { serialNumber: "SN-HYD-5511-A", status: "Due Soon", interval: "Quarterly" },
    ],
  },
  {
    id: "TW-COOL-02",
    name: "Cooling Tower #2",
    category: "FACILITIES",
    location: "Roof Sector B",
    lastUpdate: "08 NOV 2023",
    units: [
      { serialNumber: "SN-TW-2024-B", status: "Optimal", interval: "Quarterly" },
    ],
  },
  {
    id: "CONV-B-45",
    name: "Conveyor Belt System B",
    category: "MECHANICAL",
    location: "Packaging Line 2",
    lastUpdate: "20 AUG 2023",
    units: [
      { serialNumber: "SN-CONV-9088-A", status: "Overdue", interval: "Monthly" },
    ],
  },
];

const generateToastId = () => {
  return `toast-${Math.floor(Math.random() * 1000000)}`;
};

const generateDuplicateSuffix = () => {
  return Math.floor(100 + Math.random() * 900);
};

function getAssetStatus(asset: Asset): "Optimal" | "Due Soon" | "Overdue" | "No Units" {
  if (!asset.units || asset.units.length === 0) return "No Units";
  if (asset.units.some((u) => u.status === "Overdue")) return "Overdue";
  if (asset.units.some((u) => u.status === "Due Soon")) return "Due Soon";
  return "Optimal";
}

export default function AssetManagementPage() {
  const router = useRouter();

  // Assets list state
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"RECENT" | "NAME" | "ID">("RECENT");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formId, setFormId] = useState("");
  const [formCategory, setFormCategory] = useState<string>("MECHANICAL");
  const [formLocation, setFormLocation] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  // Modals & Toasts
  const [selectedAssetForUnits, setSelectedAssetForUnits] = useState<Asset | null>(null);
  const [deleteTargetAsset, setDeleteTargetAsset] = useState<Asset | null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Machine unit form states
  const [newUnitSerial, setNewUnitSerial] = useState("");
  const [newUnitStatus, setNewUnitStatus] = useState<MachineUnit["status"]>("Optimal");
  const [newUnitInterval, setNewUnitInterval] = useState<MachineUnit["interval"]>("Quarterly");

  // Inline editing states for units
  const [editingUnitSerial, setEditingUnitSerial] = useState<string | null>(null);
  const [editingUnitStatus, setEditingUnitStatus] = useState<MachineUnit["status"]>("Optimal");
  const [editingUnitInterval, setEditingUnitInterval] = useState<MachineUnit["interval"]>("Quarterly");

  // Unit handlers
  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForUnits) return;
    const serial = newUnitSerial.trim().toUpperCase();
    if (!serial) {
      triggerToast("Serial number cannot be empty.", "error");
      return;
    }
    if (selectedAssetForUnits.units.some(u => u.serialNumber === serial)) {
      triggerToast("Unit with this serial number already exists in this asset.", "error");
      return;
    }
    const newUnit: MachineUnit = {
      serialNumber: serial,
      status: newUnitStatus,
      interval: newUnitInterval,
    };
    const updatedUnits = [...selectedAssetForUnits.units, newUnit];
    const updatedAsset = { ...selectedAssetForUnits, units: updatedUnits };

    setAssets(assets.map(a => a.id === selectedAssetForUnits.id ? updatedAsset : a));
    setSelectedAssetForUnits(updatedAsset);

    setNewUnitSerial("");
    setNewUnitStatus("Optimal");
    setNewUnitInterval("Quarterly");
    triggerToast(`Unit ${serial} added successfully.`, "success");
  };

  const handleDeleteUnit = (serial: string) => {
    if (!selectedAssetForUnits) return;
    const updatedUnits = selectedAssetForUnits.units.filter(u => u.serialNumber !== serial);
    const updatedAsset = { ...selectedAssetForUnits, units: updatedUnits };

    setAssets(assets.map(a => a.id === selectedAssetForUnits.id ? updatedAsset : a));
    setSelectedAssetForUnits(updatedAsset);
    triggerToast(`Unit ${serial} deleted.`, "success");
  };

  const handleSaveEditUnit = (serial: string) => {
    if (!selectedAssetForUnits) return;
    const updatedUnits = selectedAssetForUnits.units.map(u =>
      u.serialNumber === serial
        ? { ...u, status: editingUnitStatus, interval: editingUnitInterval }
        : u
    );
    const updatedAsset = { ...selectedAssetForUnits, units: updatedUnits };

    setAssets(assets.map(a => a.id === selectedAssetForUnits.id ? updatedAsset : a));
    setSelectedAssetForUnits(updatedAsset);
    setEditingUnitSerial(null);
    triggerToast(`Unit ${serial} updated.`, "success");
  };

  // Toast notifier helper
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = generateToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Open Drawer for Create
  const handleOpenAddDrawer = () => {
    setDrawerMode("add");
    setEditingAssetId(null);
    setFormName("");
    setFormId("");
    setFormCategory("MECHANICAL");
    setFormLocation("");
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setIsDrawerOpen(true);
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const shouldOpen = sessionStorage.getItem("autoOpenAddAsset");
      if (shouldOpen === "true") {
        sessionStorage.removeItem("autoOpenAddAsset");
        const timer = setTimeout(() => {
          handleOpenAddDrawer();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Open Drawer for Edit
  const handleOpenEditDrawer = (asset: Asset) => {
    setDrawerMode("edit");
    setEditingAssetId(asset.id);
    setFormName(asset.name);
    setFormId(asset.id);
    const predefined = ["MECHANICAL", "ELECTRICAL", "FACILITIES"];
    if (predefined.includes(asset.category.toUpperCase())) {
      setFormCategory(asset.category.toUpperCase());
      setIsCustomCategory(false);
      setCustomCategoryName("");
    } else {
      setFormCategory("CUSTOM");
      setIsCustomCategory(true);
      setCustomCategoryName(asset.category);
    }
    setFormLocation(asset.location);
    setIsDrawerOpen(true);
  };

  // Duplicate Asset
  const handleDuplicateAsset = (asset: Asset) => {
    const suffix = generateDuplicateSuffix();
    const duplicated: Asset = {
      ...asset,
      id: `${asset.id.split("-").slice(0, -1).join("-") || asset.id}-${suffix}`,
      name: `${asset.name} (COPY)`,
      lastUpdate: "JUST NOW",
      units: asset.units ? asset.units.map((u) => ({ ...u })) : [],
    };
    setAssets([...assets, duplicated]);
    triggerToast(`Asset "${asset.name}" duplicated.`, "success");
  };

  // Drawer Form Submit
  const handleDrawerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formId.trim() || !formLocation.trim()) {
      triggerToast("Please fill in all asset details.", "error");
      return;
    }

    const categoryToSave = isCustomCategory ? customCategoryName.trim().toUpperCase() : formCategory;
    if (!categoryToSave) {
      triggerToast("Please specify a custom category name.", "error");
      return;
    }

    const updatedId = formId.trim().toUpperCase();

    if (drawerMode === "add") {
      // Check ID conflict
      if (assets.some((a) => a.id === updatedId)) {
        triggerToast(`Asset with ID "${updatedId}" already exists.`, "error");
        return;
      }

      const newAsset: Asset = {
        id: updatedId,
        name: formName.trim(),
        category: categoryToSave,
        location: formLocation.trim(),
        lastUpdate: "JUST NOW",
        units: [],
      };

      setAssets([...assets, newAsset]);
      triggerToast(`Asset "${formName}" created successfully.`, "success");
    } else {
      // Edit mode
      setAssets(
        assets.map((a) =>
          a.id === editingAssetId
            ? {
                ...a,
                id: updatedId,
                name: formName.trim(),
                category: categoryToSave,
                location: formLocation.trim(),
                lastUpdate: "JUST NOW",
                units: a.units,
              }
            : a
        )
      );
      triggerToast(`Asset details updated.`, "success");
    }

    setIsDrawerOpen(false);
  };

  // Delete Action Confirmations
  const triggerDeleteConfirm = (asset: Asset) => {
    setDeleteTargetAsset(asset);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetAsset) {
      setAssets(assets.filter((a) => a.id !== deleteTargetAsset.id));
      triggerToast(`Asset "${deleteTargetAsset.name}" deleted.`, "success");
      setDeleteTargetAsset(null);
    }
  };

  // Filter & Sort Logic
  const predefinedOrder = ["MECHANICAL", "ELECTRICAL", "FACILITIES"];
  const categoriesList = Array.from(new Set(assets.map(a => a.category.toUpperCase()))).sort((a, b) => {
    const idxA = predefinedOrder.indexOf(a);
    const idxB = predefinedOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const filteredAssets = assets
    .filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "ALL" || a.category.toUpperCase() === categoryFilter.toUpperCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "NAME") return a.name.localeCompare(b.name);
      if (sortBy === "ID") return a.id.localeCompare(b.id);
      return 0; // Default order
    });

  return (
    <div className="flex h-screen w-full bg-[#FFFFFF] text-[#1A1A1A] font-body-md overflow-hidden">
 
      {/* Main Content Body */}
      <main className="ml-[220px] h-screen flex flex-col overflow-hidden bg-white flex-grow relative">
        {/* TopNavBar */}
        <header className="h-24 bg-white border-b-2 border-outline flex justify-between items-center px-10 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-2xl text-on-surface uppercase font-extrabold tracking-tight">
              Asset Management
            </h2>
            <p className="font-body-md text-sm text-on-surface/50 font-bold uppercase tracking-wide">
              Manage facilities and heavy machinery
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="SEARCH ASSETS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2.5 pr-8 border-2 border-[#1A1A1A] rounded-[12px] bg-white text-xs font-bold focus:outline-none uppercase"
              />
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface/40 text-[18px]">
                search
              </span>
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#f9f9f9] scroll-container pb-28">
          {/* Filters Area */}
          <section className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase text-on-surface opacity-40">Category:</span>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border-2 border-outline px-4 py-2 pr-10 rounded-[20px] bg-white text-sm font-bold appearance-none cursor-pointer focus:outline-none uppercase min-w-[200px]"
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm font-bold">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-on-surface opacity-40">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "RECENT" | "NAME" | "ID")}
                  className="border-2 border-outline px-4 py-2 pr-10 rounded-[20px] bg-white text-sm font-bold appearance-none cursor-pointer focus:outline-none uppercase"
                >
                  <option value="RECENT">RECENT ACTIVITY</option>
                  <option value="NAME">NAME</option>
                  <option value="ID">ASSET ID</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm font-bold">
                  expand_more
                </span>
              </div>
            </div>
          </section>

          {/* Bento Grid / Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {filteredAssets.length === 0 ? (
              <div className="lg:col-span-2 text-center py-20 text-on-surface/40 font-bold uppercase">
                No industrial assets registered matching filter.
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const status = getAssetStatus(asset);
                const isOverdue = status === "Overdue";
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAssetForUnits(asset)}
                    className={`heritage-card flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.01] ${
                      isOverdue
                        ? "bg-[#D32F2F] text-white border-black"
                        : "bg-white text-[#1A1A1A] border-black"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <span
                        className={`inline-block text-[10px] font-black px-3 py-1 rounded-[12px] border shrink-0 ${
                          isOverdue
                            ? "bg-white text-primary border-white"
                            : "bg-[#1A1A1A] text-white border-black"
                        }`}
                      >
                        {asset.id}
                      </span>
                      
                      {/* Control buttons with fixed sizes to prevent stretch */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDrawer(asset);
                          }}
                          className={`w-10 h-10 flex items-center justify-center border-2 rounded-[12px] transition-all cursor-pointer ${
                            isOverdue
                              ? "border-white text-white hover:bg-white hover:text-[#D32F2F]"
                              : "border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateAsset(asset);
                          }}
                          className={`w-10 h-10 flex items-center justify-center border-2 rounded-[12px] transition-all cursor-pointer ${
                            isOverdue
                              ? "border-white text-white hover:bg-white hover:text-[#D32F2F]"
                              : "border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDeleteConfirm(asset);
                          }}
                          className={`w-10 h-10 flex items-center justify-center border-2 rounded-[12px] transition-all cursor-pointer ${
                            isOverdue
                              ? "border-white text-white hover:bg-white hover:text-[#D32F2F]"
                              : "border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#D32F2F] hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mb-8">
                      <h3
                        className={`text-2xl font-extrabold mb-2 uppercase tracking-tight ${
                          isOverdue ? "text-white" : "text-[#1A1A1A]"
                        }`}
                      >
                        {asset.name}
                      </h3>
                      <div className="flex flex-col gap-2 mt-2">
                        <p
                          className={`text-sm font-bold flex items-center gap-2 ${
                            isOverdue ? "text-white/80" : "text-[#1A1A1A]/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">location_on</span>
                          {asset.location}
                        </p>
                        <p
                          className={`text-sm font-bold flex items-center gap-2 ${
                            isOverdue ? "text-white/80" : "text-[#1A1A1A]/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">layers</span>
                          {asset.units ? asset.units.length : 0} {asset.units?.length === 1 ? 'Unit' : 'Units'} Registered
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between mt-auto pt-6 border-t-2 ${
                        isOverdue ? "border-white" : "border-[#1A1A1A]"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest ${
                            isOverdue ? "text-white/60" : "text-[#1A1A1A]/40"
                          }`}
                        >
                          Last Update
                        </p>
                        <p className="text-sm font-extrabold">{asset.lastUpdate}</p>
                      </div>
                      
                      <div
                        className={`heritage-badge ${
                          isOverdue
                            ? "bg-white text-[#D32F2F] border-transparent"
                            : "bg-white text-[#1A1A1A]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-black ${
                              status === "Optimal"
                                ? "bg-green-600"
                                : status === "Due Soon"
                                ? "bg-orange-500"
                                : status === "Overdue"
                                ? "bg-[#D32F2F] animate-pulse"
                                : "bg-gray-400"
                            }`}
                          ></span>
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* System Health Analysis Bento Card */}
            <div className="heritage-card lg:col-span-2 bg-[#1A1A1A] text-white border-black flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-[#D32F2F] rounded-[12px]">
                    <span className="material-symbols-outlined text-3xl">analytics</span>
                  </div>
                  <h3 className="text-3xl font-extrabold uppercase tracking-tighter">
                    System Health Analysis
                  </h3>
                </div>
                <p className="text-lg font-bold opacity-70 mb-8 max-w-2xl leading-relaxed">
                  AI-driven predictive modeling indicates a 14% increase in overall facility
                  efficiency. Critical attention is required for the Fabrication Floor thermal
                  sensors.
                </p>
                <button 
                  onClick={() => triggerToast("Compiling full engineering report...", "info")}
                  className="px-10 py-4 bg-[#D32F2F] text-white rounded-[20px] font-black text-sm border-2 border-white hover:bg-white hover:text-[#D32F2F] transition-all uppercase tracking-widest cursor-pointer"
                >
                  VIEW DETAILED REPORT
                </button>
              </div>
              
              <div className="w-full md:w-72 aspect-square bg-white text-on-surface rounded-[20px] border-4 border-[#D32F2F] flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                <div className="text-[96px] font-black leading-none tracking-tighter">88</div>
                <div className="text-xs font-black uppercase tracking-widest opacity-40">
                  Health Index
                </div>
                {/* Decorative index indicator bars */}
                <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end px-4 pb-4 gap-1 opacity-20">
                  <div className="flex-1 bg-on-surface h-[40%]"></div>
                  <div className="flex-1 bg-on-surface h-[60%]"></div>
                  <div className="flex-1 bg-on-surface h-[50%]"></div>
                  <div className="flex-1 bg-on-surface h-[85%]"></div>
                  <div className="flex-1 bg-on-surface h-[75%]"></div>
                  <div className="flex-1 bg-[#D32F2F] h-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAB Button at bottom-right */}
        <button
          onClick={handleOpenAddDrawer}
          className="fab-button cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-center shrink-0"
        >
          <span className="material-symbols-outlined text-[36px] font-black">add</span>
        </button>

        {/* Slide-out Drawer Panel overlay */}
        {isDrawerOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex justify-end">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsDrawerOpen(false)}
            ></div>
            <div className="relative h-full w-full md:w-[450px] bg-white border-l-4 border-[#1A1A1A] flex flex-col z-10 animate-in slide-in-from-right duration-300">
              <div className="p-8 border-b-2 border-outline flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-extrabold uppercase tracking-tight">
                  {drawerMode === "edit" ? "Edit Asset" : "Add New Asset"}
                </h2>
                <button
                  className="p-2 hover:bg-surface-variant rounded-full cursor-pointer flex items-center justify-center"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleDrawerSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Asset Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Industrial HVAC Chiller"
                    className="w-full border-2 border-outline p-3 rounded-[12px] font-bold focus:ring-0 focus:border-[#D32F2F] bg-white text-[#1A1A1A]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Asset ID</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="e.g. FAC-HVAC-001"
                    disabled={drawerMode === "edit"}
                    className="w-full border-2 border-outline p-3 rounded-[12px] font-bold focus:ring-0 focus:border-[#D32F2F] disabled:opacity-50 disabled:bg-gray-100 bg-white text-[#1A1A1A]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Category</label>
                  <select
                    value={isCustomCategory ? "CUSTOM" : formCategory}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsCustomCategory(true);
                        setCustomCategoryName("");
                      } else {
                        setIsCustomCategory(false);
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="w-full border-2 border-outline p-3 rounded-[12px] font-bold focus:ring-0 focus:border-[#D32F2F] bg-white text-[#1A1A1A]"
                  >
                    <option value="MECHANICAL">Mechanical</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="FACILITIES">Facilities</option>
                    <option value="CUSTOM">Custom Category...</option>
                  </select>
                </div>

                {isCustomCategory && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-black uppercase opacity-40">Custom Category Name</label>
                    <input
                      type="text"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="e.g. CHEMICAL, LOGISTICS"
                      className="w-full border-2 border-outline p-3 rounded-[12px] font-bold focus:ring-0 focus:border-[#D32F2F] bg-white text-[#1A1A1A] uppercase"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase opacity-40">Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. North Wing Plant, Level 2"
                    className="w-full border-2 border-outline p-3 rounded-[12px] font-bold focus:ring-0 focus:border-[#D32F2F] bg-white text-[#1A1A1A]"
                  />
                </div>



                <div className="pt-4 shrink-0">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#D32F2F] text-white font-black uppercase tracking-widest rounded-[20px] border-2 border-[#1A1A1A] hover:bg-black transition-colors cursor-pointer"
                  >
                    {drawerMode === "edit" ? "Save Changes" : "Create Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Machine Units Management Modal */}
        {selectedAssetForUnits && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => {
                setSelectedAssetForUnits(null);
                setEditingUnitSerial(null);
              }}
            ></div>
            <div className="relative bg-white border-4 border-[#1A1A1A] rounded-[24px] max-w-4xl w-full max-h-[90vh] flex flex-col z-10 animate-in zoom-in-95 duration-200 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b-4 border-[#1A1A1A] bg-[#1A1A1A] text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#D32F2F] text-2xl font-black">
                      precision_manufacturing
                    </span>
                    Manage Machine Units: {selectedAssetForUnits.name}
                  </h3>
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider mt-1">
                    Location: {selectedAssetForUnits.location} | Category: {selectedAssetForUnits.category}
                  </p>
                </div>
                <button
                  className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer text-white flex items-center justify-center border-none bg-transparent"
                  onClick={() => {
                    setSelectedAssetForUnits(null);
                    setEditingUnitSerial(null);
                  }}
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#f9f9f9]">
                {/* Form to Add New Unit */}
                <div className="bg-white border-2 border-[#1A1A1A] p-5 rounded-[16px] shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#1A1A1A]/40 mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Register New Unit
                  </h4>
                  <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase opacity-60">Serial Number</label>
                      <input
                        type="text"
                        value={newUnitSerial}
                        onChange={(e) => setNewUnitSerial(e.target.value)}
                        placeholder="e.g. SN-HVAC-9082-A"
                        className="w-full border-2 border-outline p-2.5 rounded-[12px] font-bold bg-white text-xs text-[#1A1A1A] focus:outline-none uppercase"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase opacity-60">Interval</label>
                      <select
                        value={newUnitInterval}
                        onChange={(e) => setNewUnitInterval(e.target.value as MachineUnit["interval"])}
                        className="w-full border-2 border-outline p-2.5 rounded-[12px] font-bold bg-white text-xs text-[#1A1A1A] focus:outline-none uppercase"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Bi-Annually">Bi-Annually</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase opacity-60">Status</label>
                      <select
                        value={newUnitStatus}
                        onChange={(e) => setNewUnitStatus(e.target.value as MachineUnit["status"])}
                        className="w-full border-2 border-outline p-2.5 rounded-[12px] font-bold bg-white text-xs text-[#1A1A1A] focus:outline-none uppercase"
                      >
                        <option value="Optimal">Optimal</option>
                        <option value="Due Soon">Due Soon</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase rounded-[12px] hover:bg-black transition-colors cursor-pointer text-xs animate-pulse-slow"
                      >
                        Add Unit
                      </button>
                    </div>
                  </form>
                </div>

                {/* Units List */}
                <div className="bg-white border-2 border-[#1A1A1A] rounded-[16px] overflow-hidden shadow-sm">
                  <div className="p-4 border-b-2 border-outline bg-gray-50 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#1A1A1A]/40 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm font-bold">list_alt</span>
                      Registered Units ({selectedAssetForUnits.units?.length || 0})
                    </h4>
                  </div>
                  
                  {selectedAssetForUnits.units?.length === 0 ? (
                    <div className="text-center py-12 text-[#1A1A1A]/40 font-bold uppercase text-xs">
                      No specific units registered under this asset. Add one above.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs uppercase font-bold">
                        <thead>
                          <tr className="bg-gray-100/50 border-b border-gray-200 text-[#1A1A1A]/50">
                            <th className="p-4">Serial Number</th>
                            <th className="p-4">Interval</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedAssetForUnits.units.map((unit) => {
                            const isEditing = editingUnitSerial === unit.serialNumber;
                            return (
                              <tr key={unit.serialNumber} className="hover:bg-gray-50/50">
                                <td className="p-4 font-black text-[#1A1A1A]">{unit.serialNumber}</td>
                                <td className="p-4">
                                  {isEditing ? (
                                    <select
                                      value={editingUnitInterval}
                                      onChange={(e) => setEditingUnitInterval(e.target.value as MachineUnit["interval"])}
                                      className="border-2 border-outline p-1.5 rounded-[8px] font-bold bg-white text-[11px] focus:outline-none uppercase"
                                    >
                                      <option value="Monthly">Monthly</option>
                                      <option value="Quarterly">Quarterly</option>
                                      <option value="Bi-Annually">Bi-Annually</option>
                                      <option value="Annually">Annually</option>
                                    </select>
                                  ) : (
                                    <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                                      {unit.interval}
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  {isEditing ? (
                                    <select
                                      value={editingUnitStatus}
                                      onChange={(e) => setEditingUnitStatus(e.target.value as MachineUnit["status"])}
                                      className="border-2 border-outline p-1.5 rounded-[8px] font-bold bg-white text-[11px] focus:outline-none uppercase"
                                    >
                                      <option value="Optimal">Optimal</option>
                                      <option value="Due Soon">Due Soon</option>
                                      <option value="Overdue">Overdue</option>
                                    </select>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${
                                        unit.status === "Optimal"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : unit.status === "Due Soon"
                                          ? "bg-orange-50 text-orange-700 border-orange-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          unit.status === "Optimal"
                                            ? "bg-green-600"
                                            : unit.status === "Due Soon"
                                            ? "bg-orange-500"
                                            : "bg-[#D32F2F]"
                                        }`}
                                      ></span>
                                      {unit.status}
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  {isEditing ? (
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => handleSaveEditUnit(unit.serialNumber)}
                                        className="px-3 py-1 bg-green-600 text-white rounded-[8px] border border-green-700 font-bold hover:bg-green-700 cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingUnitSerial(null)}
                                        className="px-3 py-1 bg-white text-gray-700 rounded-[8px] border border-gray-300 font-bold hover:bg-gray-50 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingUnitSerial(unit.serialNumber);
                                          setEditingUnitStatus(unit.status);
                                          setEditingUnitInterval(unit.interval);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-600 cursor-pointer flex items-center justify-center border-none bg-transparent"
                                        title="Edit Unit"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUnit(unit.serialNumber)}
                                        className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-600 cursor-pointer flex items-center justify-center border-none bg-transparent"
                                        title="Delete Unit"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog Modal */}
        {deleteTargetAsset && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setDeleteTargetAsset(null)}
            ></div>
            <div className="relative bg-white border-4 border-[#1A1A1A] p-8 rounded-[20px] max-w-md w-full z-10">
              <h3 className="text-xl font-extrabold uppercase mb-4">Confirm Deletion</h3>
              <p className="font-bold opacity-70 mb-8">
                Are you sure you want to permanently delete the asset{" "}
                <span className="text-[#D32F2F]">{deleteTargetAsset.name}</span>?
              </p>
              <div className="flex gap-4">
                <button
                  className="flex-1 py-3 border-2 border-outline font-black uppercase rounded-[12px] hover:bg-surface-variant bg-white text-[#1A1A1A] cursor-pointer"
                  onClick={() => setDeleteTargetAsset(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3 bg-[#D32F2F] text-white border-2 border-[#1A1A1A] font-black uppercase rounded-[12px] hover:bg-black cursor-pointer"
                  onClick={handleConfirmDelete}
                >
                  Delete Asset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Toasts alerts popup */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded-[20px] px-8 py-4 font-bold uppercase tracking-wider border-2 border-[#D32F2F] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
            >
              {toast.message}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
