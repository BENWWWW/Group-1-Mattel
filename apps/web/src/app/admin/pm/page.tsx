"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TaskItem {
  id: string;
  text: string;
  type: "optional" | "required" | "urgent";
  requireImage?: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  status: "ACTIVE" | "DRAFTING";
  tasks: TaskItem[];
  updatedTime: string;
  serialNumber?: string;
}

interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const TASK_OPTIONS = [
  "Check refrigerant levels & pressure",
  "Inspect electrical connections",
  "Clean condenser and evaporator coils",
  "Replace air filters",
  "Test emergency shutoff",
  "Calibrate thermostats",
  "Check fuel tank levels",
  "Inspect piping for corrosion",
];

const MOCK_SERIAL_NUMBERS = [
  "SN-HVAC-9082-A",
  "SN-HVAC-3029-B",
  "SN-HVAC-5512-C",
  "SN-XFMR-7023-A",
  "SN-XFMR-1049-B",
  "SN-XFMR-8834-C",
  "SN-CONV-4421-A",
  "SN-CONV-9088-B",
  "SN-CONV-3312-C",
  "SN-FST-9082-X",
  "SN-SUB-1049-Y",
  "SN-CHL-8834-Z",
  "SN-PUMP-4421-A",
  "SN-PUMP-9088-B",
  "SN-CNC-3312-A",
  "SN-CNC-1122-B",
  "SN-GEN-8834-A",
  "SN-HYD-5511-A",
  "SN-TW-2024-B",
];

const INITIAL_TEMPLATES: Template[] = [
  {
    id: "temp-1",
    name: "QUARTERLY AC SERVICE",
    category: "HVAC SYSTEMS",
    status: "DRAFTING",
    updatedTime: "2 DAYS AGO",
    tasks: [
      { id: "t-1", text: "Check refrigerant levels & pressure", type: "urgent", requireImage: true },
      { id: "t-2", text: "Inspect electrical connections", type: "required", requireImage: false },
      { id: "t-3", text: "Clean condenser and evaporator coils", type: "optional", requireImage: true },
      { id: "t-4", text: "Replace air filters", type: "urgent", requireImage: true },
    ],
    serialNumber: "SN-HVAC-9082-A",
  },
  {
    id: "temp-2",
    name: "GENERATOR HEALTH CHECK",
    category: "ELECTRICAL",
    status: "ACTIVE",
    updatedTime: "1 WEEK AGO",
    tasks: [
      { id: "t-5", text: "Check fuel tank levels", type: "urgent", requireImage: true },
      { id: "t-6", text: "Inspect piping for corrosion", type: "optional", requireImage: true },
      { id: "t-7", text: "Test emergency shutoff", type: "required", requireImage: false },
    ],
    serialNumber: "SN-XFMR-7023-A",
  },
  {
    id: "temp-3",
    name: "STANDARD HVAC FILTER MAINTENANCE",
    category: "HVAC SYSTEMS",
    status: "ACTIVE",
    updatedTime: "JUST NOW",
    tasks: [
      { id: "t-8", text: "VISUAL INSPECTION", type: "required", requireImage: true },
      { id: "t-9", text: "FILTER CONDITION", type: "urgent", requireImage: true },
      { id: "t-10", text: "BELT TENSION", type: "optional", requireImage: false },
      { id: "t-11", text: "LUBRICATION POINTS", type: "required", requireImage: true },
      { id: "t-12", text: "ELECTRICAL CONTACTS CHECK", type: "required", requireImage: false },
    ],
    serialNumber: "ALL",
  },
];

export default function PMTemplatesPage() {
  const router = useRouter();

  // Templates library state
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([
    "HVAC SYSTEMS",
    "ELECTRICAL",
    "PLUMBING",
    "FIRE & SAFETY",
    "MECHANICAL",
    "ELEVATORS & LIFTS",
    "POWER GENERATION",
    "BUILDING ENVELOPE",
    "LIGHTING",
  ]);

  // Mode: "create" | "edit"
  const [currentMode, setCurrentMode] = useState<"create" | "edit">("create");

  // Form states for the Action Panel
  const [formName, setFormName] = useState("STANDARD HVAC FILTER MAINTENANCE");
  const [formCategory, setFormCategory] = useState("HVAC SYSTEMS");
  const [formTasks, setFormTasks] = useState<TaskItem[]>([
    { id: "t-init-1", text: "VISUAL INSPECTION", type: "required", requireImage: true },
    { id: "t-init-2", text: "FILTER CONDITION", type: "urgent", requireImage: true },
    { id: "t-init-3", text: "BELT TENSION", type: "optional", requireImage: false },
    { id: "t-init-4", text: "LUBRICATION POINTS", type: "required", requireImage: true },
    { id: "t-init-5", text: "ELECTRICAL CONTACTS CHECK", type: "required", requireImage: false },
  ]);
  const [formSerialNumber, setFormSerialNumber] = useState("ALL");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Custom confirmation modal state
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState<Template | null>(null);

  // Toast Notification states
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Profile menu overlay
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Helper: Trigger Toast
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Switch to Create Mode
  const switchToCreateMode = () => {
    setCurrentMode("create");
    setSelectedTemplateId(null);
    setFormName("STANDARD HVAC FILTER MAINTENANCE");
    setFormCategory("HVAC SYSTEMS");
    setFormSerialNumber("ALL");
    setFormTasks([
      { id: "t-init-1", text: "VISUAL INSPECTION", type: "required", requireImage: true },
      { id: "t-init-2", text: "FILTER CONDITION", type: "urgent", requireImage: true },
      { id: "t-init-3", text: "BELT TENSION", type: "optional", requireImage: false },
      { id: "t-init-4", text: "LUBRICATION POINTS", type: "required", requireImage: true },
      { id: "t-init-5", text: "ELECTRICAL CONTACTS CHECK", type: "required", requireImage: false },
    ]);
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const shouldOpen = sessionStorage.getItem("autoOpenAddTemplate");
      if (shouldOpen === "true") {
        sessionStorage.removeItem("autoOpenAddTemplate");
        const timer = setTimeout(() => {
          switchToCreateMode();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Switch to Edit Mode on card click
  const handleCardClick = (template: Template) => {
    setCurrentMode("edit");
    setSelectedTemplateId(template.id);
    setFormName(template.name);
    setFormCategory(template.category);
    setFormSerialNumber(template.serialNumber || "ALL");
    setFormTasks(template.tasks);
  };

  // Add Task to form state
  const handleAddTask = () => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: "",
      type: "optional",
      requireImage: false,
    };
    setFormTasks([...formTasks, newTask]);
    triggerToast("Empty task row added.", "info");
  };

  // Toggle image upload requirement
  const handleToggleRequireImage = (id: string) => {
    setFormTasks(
      formTasks.map((t) => (t.id === id ? { ...t, requireImage: !t.requireImage } : t))
    );
    triggerToast("Image evidence requirement toggled.", "info");
  };

  // Update task text input
  const handleTaskTextChange = (id: string, text: string) => {
    setFormTasks(
      formTasks.map((t) => (t.id === id ? { ...t, text: text.toUpperCase() } : t))
    );
  };

  // Change task type (optional, required, urgent)
  const handleTaskTypeChange = (id: string, type: "optional" | "required" | "urgent") => {
    setFormTasks(
      formTasks.map((t) => (t.id === id ? { ...t, type } : t))
    );
  };

  // Delete task from form state
  const handleRemoveTask = (id: string) => {
    setFormTasks(formTasks.filter((t) => t.id !== id));
    triggerToast("Task row removed.", "info");
  };

  // Action Panel Submission
  const handleActionSubmit = () => {
    if (!formName.trim() || !formCategory) {
      triggerToast("Please complete template name & category fields.", "error");
      return;
    }

    setIsSubmitLoading(true);

    setTimeout(() => {
      setIsSubmitLoading(false);
      const uppercaseName = formName.trim().toUpperCase();

      if (currentMode === "create") {
        const newTemplate: Template = {
          id: `temp-${Date.now()}`,
          name: uppercaseName,
          category: formCategory,
          status: "DRAFTING",
          updatedTime: "JUST NOW",
          tasks: formTasks,
          serialNumber: formSerialNumber,
        };
        setTemplates([...templates, newTemplate]);
        triggerToast("Template Created Successfully", "success");
        switchToCreateMode();
      } else {
        // Edit mode
        setTemplates(
          templates.map((temp) =>
            temp.id === selectedTemplateId
              ? {
                  ...temp,
                  name: uppercaseName,
                  category: formCategory,
                  tasks: formTasks,
                  updatedTime: "JUST NOW",
                  serialNumber: formSerialNumber,
                }
              : temp
          )
        );
        triggerToast("Template Saved Successfully", "success");
      }
    }, 1000);
  };

  // Duplicate Template
  const handleDuplicateTemplate = (template: Template) => {
    const duplicated: Template = {
      id: `temp-${Date.now()}`,
      name: `${template.name} COPY`,
      category: template.category,
      status: "DRAFTING",
      updatedTime: "JUST NOW",
      tasks: template.tasks.map((t) => ({ ...t, id: `task-${Date.now()}-${Math.random()}` })),
      serialNumber: template.serialNumber || "ALL",
    };
    setTemplates([...templates, duplicated]);
    triggerToast(`Duplicating ${template.name}...`, "success");
  };

  // Delete Confirm Modal operations
  const triggerDeleteConfirm = (template: Template) => {
    setDeleteTargetTemplate(template);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetTemplate) {
      setTemplates(templates.filter((temp) => temp.id !== deleteTargetTemplate.id));
      triggerToast("Template Deleted", "success");
      if (selectedTemplateId === deleteTargetTemplate.id) {
        switchToCreateMode();
      }
      setDeleteTargetTemplate(null);
    }
  };

  // Drag and Drop functions
  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;

    const dragIndex = formTasks.findIndex((t) => t.id === draggedTaskId);
    const dropIndex = formTasks.findIndex((t) => t.id === targetId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const updatedTasks = [...formTasks];
    const [draggedItem] = updatedTasks.splice(dragIndex, 1);
    updatedTasks.splice(dropIndex, 0, draggedItem);

    setFormTasks(updatedTasks);
    setDraggedTaskId(null);
  };

  // Filter templates based on queries
  const filteredTemplates = templates.filter((temp) => {
    const matchesSearch = temp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || temp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen w-full bg-[#f9f9f9] text-on-surface font-body-md overflow-hidden">

      {/* Main Content Area */}
      <main className="ml-[220px] w-[calc(100%-220px)] h-screen flex flex-col overflow-hidden bg-[#f9f9f9] flex-grow">
        {/* TopNavBar */}
        <header className="h-24 bg-white border-b-2 border-outline flex justify-between items-center px-10 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-2xl text-on-surface uppercase font-extrabold tracking-tight">
              Checklist Templates
            </h2>
            <p className="font-body-md text-sm text-on-surface/50 font-bold uppercase tracking-wide">
              Standardized operational protocols
            </p>
          </div>
          <div className="flex items-center gap-stack-md">
            <button
              className="pill-button-sharp bg-[#D32F2F] text-white border-black hover:opacity-90 cursor-pointer"
              onClick={switchToCreateMode}
            >
              <span className="material-symbols-outlined">add</span>
              <span>New Template</span>
            </button>
          </div>
        </header>

        {/* Content Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Template Library */}
          <section className="w-[450px] border-r-2 border-outline p-8 flex flex-col bg-white overflow-hidden shrink-0">
            <div className="flex flex-col gap-4 mb-8 shrink-0">
              <h3 className="font-headline-md text-xl uppercase font-extrabold tracking-tight">
                Template Library
              </h3>
              <div className="flex gap-2.5">
                {/* Category Filter Select */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 p-2 border-2 border-outline rounded bg-white text-xs font-bold text-on-surface outline-none cursor-pointer uppercase min-w-0"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                
                {/* Search Bar Input */}
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="SEARCH TEMPLATE..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 pr-8 border-2 border-outline rounded bg-white text-xs font-bold text-on-surface focus:outline-none uppercase"
                  />
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface/40 text-[16px] pointer-events-none">
                    search
                  </span>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scroll-container">
              {filteredTemplates.length === 0 ? (
                <p className="text-center text-on-surface/40 py-10 font-bold uppercase text-xs">
                  No templates match search.
                </p>
              ) : (
                filteredTemplates.map((temp) => {
                  const isActive = selectedTemplateId === temp.id;
                  return (
                    <div
                      key={temp.id}
                      onClick={() => handleCardClick(temp)}
                      className={`industrial-card group cursor-pointer border-black rounded-xl ${
                        isActive ? "active" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="status-badge-sharp bg-white text-on-surface">
                              {temp.category}
                            </span>
                            {temp.serialNumber && temp.serialNumber !== "ALL" && (
                              <span className="status-badge-sharp bg-[#D32F2F] text-white border-[#D32F2F]">
                                {temp.serialNumber}
                              </span>
                            )}
                          </div>
                          <h4 className="font-headline-md text-lg font-extrabold leading-tight">
                            {temp.name}
                          </h4>
                          <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">
                            {temp.tasks.length} TASKS • {temp.serialNumber && temp.serialNumber !== "ALL" ? `${temp.serialNumber} • ` : ""}UPDATED {temp.updatedTime}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1 hover:bg-surface-container rounded cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(temp);
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            className="p-1 hover:bg-surface-container rounded cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(temp);
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">content_copy</span>
                          </button>
                          <button
                            className="p-1 hover:bg-error/10 text-error rounded cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerDeleteConfirm(temp);
                            }}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Dynamic Action Panel */}
          <section className="flex-1 p-10 bg-white/50 overflow-y-auto scroll-container">
            <div className="industrial-card max-w-4xl mx-auto min-h-[700px] flex flex-col bg-white border-black rounded-xl fade-in">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <h3 className="font-headline-lg text-3xl uppercase font-extrabold tracking-tighter">
                    {currentMode === "create" ? "CREATE NEW TEMPLATE" : "EDIT TEMPLATE"}
                  </h3>
                  <span className={`status-badge-sharp text-white border-none ${
                    currentMode === "create" ? "bg-[#D32F2F]" : "bg-[#1a1c1c]"
                  }`}>
                    {currentMode === "create" ? "NEW PROTOCOL" : "ACTIVE"}
                  </span>
                </div>
              </div>

              {/* Input Fields Area */}
              <div className="space-y-6 mb-10">
                <div className="space-y-3">
                  <label className="font-label-md text-xs font-bold uppercase tracking-widest block text-on-surface/60">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ENTER TEMPLATE NAME"
                    className="w-full h-14 px-4 rounded border-2 border-outline focus:border-[#af101a] focus:ring-0 font-body-md bg-white uppercase font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-stack-md">
                  <div className="space-y-3">
                    <label className="font-label-md text-xs font-bold uppercase tracking-widest block text-on-surface/60">
                      Asset Category
                    </label>
                    <div className="relative">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full h-14 px-4 rounded border-2 border-outline bg-white focus:border-[#af101a] font-body-md appearance-none uppercase font-bold outline-none cursor-pointer pr-10"
                      >
                        <option disabled value="">
                          SELECT CATEGORY
                        </option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="font-label-md text-xs font-bold uppercase tracking-widest block text-on-surface/60">
                      Machine Serial Number
                    </label>
                    <div className="relative">
                      <select
                        value={formSerialNumber}
                        onChange={(e) => setFormSerialNumber(e.target.value)}
                        className="w-full h-14 px-4 rounded border-2 border-outline bg-white focus:border-[#af101a] font-body-md appearance-none uppercase font-bold outline-none cursor-pointer pr-10"
                      >
                        <option value="ALL">ALL SERIALS (GENERAL TEMPLATE)</option>
                        {MOCK_SERIAL_NUMBERS.map((sn) => (
                          <option key={sn} value={sn}>
                            {sn}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-6">
                  <label className="font-label-md text-xs font-bold uppercase tracking-widest">
                    Tasks ({formTasks.length})
                  </label>
                  <button
                    className="pill-button-sharp bg-white text-on-surface hover:bg-surface-container transition-all text-xs py-2 px-4 cursor-pointer"
                    onClick={handleAddTask}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Add Task</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(task.id)}
                      className={`task-row flex flex-col md:flex-row md:items-center gap-4 p-5 border-2 border-outline rounded bg-white group cursor-move slide-down ${
                        draggedTaskId === task.id ? "dragging" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-grow min-w-0">
                        <span className="material-symbols-outlined text-on-surface/20 shrink-0 select-none">
                          drag_indicator
                        </span>
                        <input
                          type="text"
                          value={task.text}
                          onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
                          placeholder="ENTER TASK DESCRIPTION"
                          className="font-body-md flex-1 uppercase font-bold text-sm tracking-tight border-none p-0 focus:ring-0 bg-transparent outline-none border-b border-dashed border-outline/30 hover:border-primary focus:border-primary"
                        />
                      </div>
                      
                      <div className="flex items-center gap-6 shrink-0 mt-2 md:mt-0">
                        {/* Segmented Type Selection */}
                        <div className="flex items-center gap-1 border-2 border-outline rounded p-0.5 bg-gray-50">
                          <button
                            type="button"
                            onClick={() => handleTaskTypeChange(task.id, "optional")}
                            className={`px-3 py-1.5 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                              task.type === "optional"
                                ? "bg-white border border-outline text-on-surface"
                                : "text-on-surface/40 hover:text-on-surface"
                            }`}
                          >
                            Optional
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTaskTypeChange(task.id, "required")}
                            className={`px-3 py-1.5 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                              task.type === "required"
                                ? "bg-[#1A1A1A] text-white"
                                : "text-on-surface/40 hover:text-on-surface"
                            }`}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTaskTypeChange(task.id, "urgent")}
                            className={`px-3 py-1.5 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                              task.type === "urgent"
                                ? "bg-[#D32F2F] text-white"
                                : "text-on-surface/40 hover:text-[#D32F2F]"
                            }`}
                          >
                            Urgent
                          </button>
                        </div>

                        {/* Photo Evidence Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequireImage(task.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                            task.requireImage
                              ? "bg-[#D32F2F] text-white border-[#D32F2F] hover:bg-[#D32F2F]/90"
                              : "bg-white text-on-surface/40 border-outline hover:text-on-surface hover:border-black"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                          <span>{task.requireImage ? "Photo Req." : "No Photo"}</span>
                        </button>

                        {/* Remove button */}
                        <button
                          type="button"
                          className="p-1 opacity-50 group-hover:opacity-100 hover:text-error transition-all cursor-pointer"
                          onClick={() => handleRemoveTask(task.id)}
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-12 pt-8 border-t-2 border-outline flex justify-end gap-stack-md shrink-0">
                <button
                  className="pill-button-sharp bg-white text-on-surface hover:bg-surface-container cursor-pointer"
                  onClick={switchToCreateMode}
                >
                  Cancel
                </button>
                <button
                  className="pill-button-sharp bg-[#D32F2F] text-white hover:opacity-90 border-none px-12 cursor-pointer flex items-center gap-2"
                  onClick={handleActionSubmit}
                  disabled={isSubmitLoading}
                >
                  {isSubmitLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                      <span>PROCESSING...</span>
                    </>
                  ) : currentMode === "create" ? (
                    "CREATE TEMPLATE"
                  ) : (
                    "SAVE TEMPLATE"
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal Overlay */}
      {deleteTargetTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTargetTemplate(null)}
          ></div>
          <div className="relative bg-white border-4 border-outline p-10 rounded max-w-md w-full m-4 shadow-2xl z-10">
            <h3 className="font-headline-lg text-2xl uppercase font-extrabold mb-4">
              Confirm Deletion
            </h3>
            <p className="font-body-md text-on-surface/60 mb-8 font-bold">
              Are you sure you want to permanently remove{" "}
              <span className="text-on-surface">{deleteTargetTemplate.name}</span>? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="pill-button-sharp bg-white cursor-pointer"
                onClick={() => setDeleteTargetTemplate(null)}
              >
                Keep It
              </button>
              <button
                className="pill-button-sharp bg-[#af101a] text-white border-none cursor-pointer"
                onClick={handleConfirmDelete}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Popups */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded px-6 py-4 font-bold uppercase tracking-wider border-2 border-[#af101a] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
