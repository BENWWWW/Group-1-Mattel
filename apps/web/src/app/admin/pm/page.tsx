"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface TaskItem { id: string; text: string; type: "optional"|"required"|"urgent"; requireImage?: boolean; }
interface Template {
  id: string;
  title: string;
  category: string;
  description?: string;
  asset_type?: string;
  frequency?: string;
  is_active: boolean;
  checklist_items: TaskItem[];
  updated_at: string;
}
interface ToastType { id: string; message: string; type: "success"|"error"|"info"; }

export default function PMTemplatesPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string|null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentMode, setCurrentMode] = useState<"create"|"edit">("create");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("HVAC SYSTEMS");
  const [formDescription, setFormDescription] = useState("");
  const [formTasks, setFormTasks] = useState<TaskItem[]>([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [deleteTargetTemplate, setDeleteTargetTemplate] = useState<Template|null>(null);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string|null>(null);

  const [categories, setCategories] = useState<string[]>(["HVAC SYSTEMS","ELECTRICAL","PLUMBING","FIRE & SAFETY","MECHANICAL","ELEVATORS & LIFTS","POWER GENERATION","BUILDING ENVELOPE"]);

  const triggerToast = useCallback((message: string, type: "success"|"error"|"info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("assets").select("category");
      if (!error && data) {
        const unique = Array.from(new Set(data.map((item: any) => item.category)))
          .filter(Boolean)
          .map((cat: any) => cat.toUpperCase())
          .sort();
        if (unique.length > 0) {
          setCategories(unique);
          setFormCategory(unique[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load asset categories:", err);
    }
  }, [supabase]);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("pm_templates").select("id,title,category,description,asset_type,frequency,is_active,checklist_items,updated_at").order("updated_at",{ascending:false});
      if (error) throw error;
      setTemplates((data||[]).map((t:any)=>({...t,checklist_items:t.checklist_items||[]})));
    } catch { triggerToast("Failed to load templates.","error"); }
    finally { setIsLoading(false); }
  }, [supabase, triggerToast]);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [fetchTemplates, fetchCategories]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const should = sessionStorage.getItem("autoOpenAddTemplate");
      if (should === "true") { sessionStorage.removeItem("autoOpenAddTemplate"); switchToCreateMode(); }
    }
  }, []);

  const switchToCreateMode = () => {
    setCurrentMode("create"); setSelectedTemplateId(null);
    setFormName(""); setFormCategory(categories[0] || "HVAC SYSTEMS"); setFormDescription(""); setFormTasks([]);
  };

  const handleCardClick = (template: Template) => {
    setCurrentMode("edit"); setSelectedTemplateId(template.id);
    setFormName(template.title); setFormCategory(template.category);
    setFormDescription(template.description || "");
    const sanitizedTasks = (template.checklist_items || []).map((t: any) => ({
      ...t,
      requireImage: t.type === "optional" ? false : true
    }));
    setFormTasks(sanitizedTasks);
  };

  const handleAddTask = () => {
    const newTask: TaskItem = { id: `task-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, text: "", type: "optional", requireImage: false };
    setFormTasks([...formTasks, newTask]);
  };

  const handleTaskTextChange = (id: string, text: string) => setFormTasks(formTasks.map(t=>t.id===id?{...t,text:text.toUpperCase()}:t));
  const handleTaskTypeChange = (id: string, type: "optional"|"required"|"urgent") => setFormTasks(formTasks.map(t=>t.id===id?{...t,type,requireImage:type==="optional"?false:true}:t));
  const handleToggleRequireImage = (id: string) => {}; // no-op since it is locked by task type
  const handleRemoveTask = (id: string) => setFormTasks(formTasks.filter(t=>t.id!==id));

  const handleActionSubmit = async () => {
    if (!formName.trim() || !formCategory) { triggerToast("Fill in template name & category.","error"); return; }
    setIsSubmitLoading(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) { triggerToast("Not authenticated.","error"); return; }

      if (currentMode === "create") {
        const { error } = await supabase.from("pm_templates").insert({
          title: formName.trim().toUpperCase(),
          category: formCategory,
          description: formDescription.trim(),
          asset_type: "General",
          frequency: "monthly",
          is_active: true,
          checklist_items: formTasks,
          created_by: user.id
        });
        if (error) throw error;
        triggerToast("Template Created Successfully","success");
        switchToCreateMode();
      } else {
        const { error } = await supabase.from("pm_templates").update({
          title: formName.trim().toUpperCase(),
          category: formCategory,
          description: formDescription.trim(),
          asset_type: "General",
          frequency: "monthly",
          checklist_items: formTasks
        }).eq("id", selectedTemplateId!);
        if (error) throw error;
        triggerToast("Template Saved Successfully","success");
      }
      fetchTemplates();
    } catch(err:any) { triggerToast(err.message||"Failed.","error"); }
    finally { setIsSubmitLoading(false); }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const { data:{user} } = await supabase.auth.getUser();
      const { error } = await supabase.from("pm_templates").insert({
        title: `${template.title} COPY`,
        category: template.category,
        description: template.description || "",
        asset_type: template.asset_type || "General",
        frequency: template.frequency || "monthly",
        is_active: false,
        checklist_items: template.checklist_items,
        created_by: user?.id
      });
      if (error) throw error;
      triggerToast(`Duplicated "${template.title}".`,"success");
      fetchTemplates();
    } catch(err:any) { triggerToast(err.message||"Failed.","error"); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetTemplate) return;
    try {
      // Step 1: Detach all pm_tasks referencing this template (set template_id = NULL)
      // This avoids the foreign key constraint violation before deletion.
      const { error: detachError } = await supabase
        .from("pm_tasks")
        .update({ template_id: null })
        .eq("template_id", deleteTargetTemplate.id);
      if (detachError) throw detachError;

      // Step 2: Now safely delete the template
      const { error } = await supabase.from("pm_templates").delete().eq("id", deleteTargetTemplate.id);
      if (error) throw error;

      triggerToast("Template Deleted", "success");
      if (selectedTemplateId === deleteTargetTemplate.id) switchToCreateMode();
      setDeleteTargetTemplate(null);
      fetchTemplates();
    } catch(err:any) { triggerToast(err.message || "Failed.", "error"); }
  };

  const handleDragStart = (id: string) => setDraggedTaskId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedTaskId || draggedTaskId === targetId) return;
    const di = formTasks.findIndex(t=>t.id===draggedTaskId), ti = formTasks.findIndex(t=>t.id===targetId);
    if (di===-1||ti===-1) return;
    const updated = [...formTasks];
    const [item] = updated.splice(di, 1);
    updated.splice(ti, 0, item);
    setFormTasks(updated);
    setDraggedTaskId(null);
  };

  const filteredTemplates = templates.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (categoryFilter === "ALL" || t.category === categoryFilter)
  );

  return (
    <div className="flex h-screen w-full bg-[#f9f9f9] text-[#1A1A1A] font-body-md overflow-hidden">
      <main className="lg:ml-[220px] w-full lg:w-[calc(100%-220px)] h-screen flex flex-col overflow-hidden bg-[#f9f9f9] flex-grow pb-24 lg:pb-0">
        <header className="min-h-24 bg-white border-b-2 border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 lg:px-10 gap-4 shrink-0 z-40">
          <div>
            <h2 className="font-headline-md text-sm sm:text-base md:text-xl text-[#1A1A1A] uppercase font-extrabold tracking-tight">Checklist Templates</h2>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wide">Standardized operational protocols</p>
          </div>
          <button className="pill-button-sharp bg-[#D32F2F] text-white border-black hover:opacity-90 cursor-pointer shrink-0" onClick={switchToCreateMode}>
            <span className="material-symbols-outlined">add</span><span>New Template</span>
          </button>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left: Template Library */}
          <section className="w-full lg:w-[450px] border-b-2 lg:border-b-0 lg:border-r-2 border-gray-200 p-4 lg:p-8 flex flex-col bg-white h-[350px] lg:h-auto overflow-hidden shrink-0">
            <div className="flex flex-col gap-4 mb-4 lg:mb-8 shrink-0">
              <h3 className="font-headline-md text-base lg:text-xl uppercase font-extrabold tracking-tight">Template Library</h3>
              <div className="flex gap-2.5">
                <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="flex-1 p-2 border-2 border-gray-200 rounded bg-white text-xs font-bold outline-none cursor-pointer uppercase min-w-0">
                  <option value="ALL">ALL CATEGORIES</option>
                  {categories.map(cat=><option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="relative flex-1 min-w-0">
                  <input type="text" placeholder="SEARCH TEMPLATE..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                    className="w-full p-2 pr-8 border-2 border-gray-200 rounded bg-white text-xs font-bold focus:outline-none uppercase"/>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 text-[16px] pointer-events-none">search</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {isLoading ? (
                Array.from({length:3}).map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>)
              ) : filteredTemplates.length === 0 ? (
                <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">No templates. Create one!</p>
              ) : filteredTemplates.map(temp => {
                const isActive = selectedTemplateId === temp.id;
                return (
                  <div key={temp.id} onClick={()=>handleCardClick(temp)} className={`industrial-card group cursor-pointer border-black rounded-xl ${isActive?"active":""}`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="status-badge-sharp bg-white text-[#1A1A1A]">{temp.category}</span>
                          <span className={`status-badge-sharp text-white border-0 ${temp.is_active?"bg-green-600":"bg-gray-400"}`}>{temp.is_active?"ACTIVE":"DRAFT"}</span>
                        </div>
                        <h4 className="font-headline-md text-sm lg:text-lg font-extrabold leading-tight">{temp.title}</h4>
                        {temp.description && (
                          <p className="text-[11px] font-bold text-gray-500 line-clamp-2 uppercase leading-normal">
                            {temp.description}
                          </p>
                        )}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {(temp.checklist_items||[]).length} TASKS
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-gray-100 rounded cursor-pointer" onClick={e=>{e.stopPropagation();handleDuplicateTemplate(temp);}}>
                          <span className="material-symbols-outlined text-xl">content_copy</span>
                        </button>
                        <button className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer" onClick={e=>{e.stopPropagation();setDeleteTargetTemplate(temp);}}>
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right: Action Panel */}
          <section className="flex-1 p-4 lg:p-10 bg-white/50 overflow-y-auto">
            <div className="industrial-card max-w-4xl mx-auto min-h-[500px] lg:min-h-[700px] flex flex-col bg-white border-black rounded-xl">
              <div className="flex justify-between items-center mb-6 lg:mb-10">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-headline-lg text-lg lg:text-3xl uppercase font-extrabold tracking-tighter">{currentMode==="create"?"CREATE NEW TEMPLATE":"EDIT TEMPLATE"}</h3>
                  <span className={`status-badge-sharp text-white border-none ${currentMode==="create"?"bg-[#D32F2F]":"bg-[#1a1c1c]"}`}>{currentMode==="create"?"NEW PROTOCOL":"EDITING"}</span>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest block opacity-60">Template Name</label>
                  <input type="text" value={formName} onChange={e=>setFormName(e.target.value)} placeholder="ENTER TEMPLATE NAME"
                    className="w-full h-14 px-4 rounded border-2 border-gray-200 focus:border-[#D32F2F] font-bold bg-white uppercase outline-none"/>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest block opacity-60">Description</label>
                  <textarea value={formDescription} onChange={e=>setFormDescription(e.target.value)} placeholder="ENTER TEMPLATE DESCRIPTION / MAINTENANCE PROTOCOL DETAILS" rows={2}
                    className="w-full p-4 rounded border-2 border-gray-200 focus:border-[#D32F2F] font-bold bg-white uppercase outline-none resize-none text-sm"/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest block opacity-60">Asset Category</label>
                    <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full h-14 px-4 rounded border-2 border-gray-200 bg-white focus:border-[#D32F2F] font-bold uppercase outline-none cursor-pointer">
                      {categories.map(cat=><option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest block opacity-60">Tasks Count</label>
                    <div className="w-full h-14 rounded border-2 border-gray-100 bg-gray-50 flex items-center justify-center font-black text-3xl text-[#D32F2F]">{formTasks.length}</div>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-xs font-bold uppercase tracking-widest">Tasks ({formTasks.length})</label>
                  <button className="pill-button-sharp bg-white text-on-surface hover:bg-gray-100 transition-all text-xs py-2 px-4 cursor-pointer" onClick={handleAddTask}>
                    <span className="material-symbols-outlined text-[18px]">add</span><span>Add Task</span>
                  </button>
                </div>
                {formTasks.length === 0 && (
                  <div className="text-center py-10 text-gray-400 font-bold uppercase text-xs border-2 border-dashed border-gray-200 rounded-xl">
                    <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">playlist_add</span>
                    Add tasks using the button above
                  </div>
                )}
                <div className="space-y-3">
                  {formTasks.map(task=>(
                    <div key={task.id} draggable onDragStart={()=>handleDragStart(task.id)} onDragOver={handleDragOver} onDrop={()=>handleDrop(task.id)}
                      className={`task-row flex flex-col gap-4 p-5 border-2 border-gray-200 rounded bg-white group cursor-move ${draggedTaskId===task.id?"opacity-50":""}`}>
                      <div className="flex items-start gap-4 w-full">
                        <span className="material-symbols-outlined text-gray-200 shrink-0 select-none pt-1">drag_indicator</span>
                        <textarea value={task.text} onChange={e=>handleTaskTextChange(task.id,e.target.value)} placeholder="ENTER TASK DESCRIPTION" rows={2}
                          className="w-full uppercase font-bold text-sm border-none p-0 focus:ring-0 bg-transparent outline-none border-b border-dashed border-gray-200 resize-none" />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 border-2 border-gray-200 rounded p-0.5 bg-gray-50">
                          {(["optional","required","urgent"] as const).map(type=>(
                            <button key={type} type="button" onClick={()=>handleTaskTypeChange(task.id,type)} className={`px-3 py-1.5 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${task.type===type?(type==="urgent"?"bg-[#D32F2F] text-white":type==="required"?"bg-[#1A1A1A] text-white":"bg-white border border-gray-200 text-gray-700"):"text-gray-300 hover:text-gray-600"}`}>{type}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            disabled={true}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded font-black text-[9px] uppercase tracking-wider transition-all cursor-not-allowed ${
                              task.type === "optional"
                                ? "bg-gray-100 text-gray-400 border-gray-200"
                                : "bg-[#D32F2F] text-white border-[#D32F2F]"
                            }`}
                            title={task.type === "optional" ? "Optional tasks do not require a photo" : "Required/Urgent tasks require a photo"}
                          >
                            <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                            <span>{task.type === "optional" ? "No Photo" : "Photo Req."}</span>
                          </button>
                          <button type="button" className="p-1 opacity-50 group-hover:opacity-100 hover:text-red-500 transition-all cursor-pointer" onClick={()=>handleRemoveTask(task.id)}>
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t-2 border-gray-200 flex justify-end gap-4 shrink-0">
                <button className="pill-button-sharp bg-white text-on-surface hover:bg-gray-100 cursor-pointer" onClick={switchToCreateMode}>Cancel</button>
                <button className="pill-button-sharp bg-[#D32F2F] text-white hover:opacity-90 border-none px-12 cursor-pointer flex items-center gap-2" onClick={handleActionSubmit} disabled={isSubmitLoading}>
                  {isSubmitLoading?<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span><span>PROCESSING...</span></>:(currentMode==="create"?"CREATE TEMPLATE":"SAVE TEMPLATE")}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirm Modal */}
      {deleteTargetTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setDeleteTargetTemplate(null)}/>
          <div className="relative bg-white border-4 border-gray-200 p-10 rounded max-w-md w-full m-4 shadow-2xl z-10">
            <h3 className="font-headline-lg text-2xl uppercase font-extrabold mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-8 font-bold">Permanently remove <span className="text-[#1A1A1A]">{deleteTargetTemplate.title}</span>? This cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button className="pill-button-sharp bg-white cursor-pointer" onClick={()=>setDeleteTargetTemplate(null)}>Keep It</button>
              <button className="pill-button-sharp bg-[#af101a] text-white border-none cursor-pointer" onClick={handleConfirmDelete}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast=>(
          <div key={toast.id} className="pointer-events-auto bg-[#1a1c1c] text-white text-center rounded px-6 py-4 font-bold uppercase tracking-wider border-2 border-[#af101a] shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
