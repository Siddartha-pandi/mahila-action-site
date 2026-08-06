"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  getStoredContentTypes,
  saveStoredContentTypes,
  addFieldToContentType,
  deleteFieldFromContentType,
  createCustomContentType,
  deleteCustomContentType,
  updateContentType,
  updateFieldInContentType,
  reorderFieldsInContentType,
  setFieldColSpan,
  saveAllFieldsForContentType,
  ContentTypeModel,
  FieldDefinition,
  FieldType,
  ColSpanType,
} from "../../lib/contentTypeRegistry";
import { toast } from "sonner";
import { Plus, Save, Search, X } from "lucide-react";


const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
  { type: "string", label: "Text (Short)", icon: "🔤", desc: "Short titles, names, emails, URLs, or small text strings" },
  { type: "text", label: "Text (Long)", icon: "📝", desc: "Multi-line text excerpts, descriptions, or comments" },
  { type: "richtext", label: "Rich Text / Markdown", icon: "📑", desc: "Formatted body text with headers, lists, links, and bold text" },
  { type: "number", label: "Number", icon: "🔢", desc: "Integers, quantities, seat limits, or order indexes" },
  { type: "boolean", label: "Boolean", icon: "☑️", desc: "True or False switches (e.g., published, active, anonymous)" },
  { type: "datetime", label: "Date & Time", icon: "📅", desc: "Timestamps, event start dates, or registration deadlines" },
  { type: "media", label: "Media (Image / Asset)", icon: "🖼️", desc: "Image URLs, photo banners, cover images, or PDF file links" },
  { type: "json", label: "JSON / Array", icon: "📦", desc: "Structured JSON objects, tag lists, or gallery arrays" },
  { type: "relation", label: "Relation", icon: "🔗", desc: "Foreign key relationship linking to another Content Type" },
  { type: "enum", label: "Enumeration (Dropdown)", icon: "📋", desc: "Fixed list of allowed string option values" },
];

export function ContentTypeBuilderAdmin() {
  const [models, setModels] = useState<ContentTypeModel[]>(() => getStoredContentTypes());
  const [selectedUid, setSelectedUid] = useState<string>("api::blog-post.blog-post");
  const [activeTab, setActiveTab] = useState<"canvas" | "fields" | "preview" | "api">("canvas");

  // Drag & Drop State (field canvas)
  const [draggedFieldName, setDraggedFieldName] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<number | null>(null);
  const [dragOverNewRow, setDragOverNewRow] = useState(false);

  // Row-level drag state
  const [draggedRowId, setDraggedRowId] = useState<number | null>(null);
  const [dragOverRowHandle, setDragOverRowHandle] = useState<number | null>(null);

  // Legacy index-based state (used by fields table reorder)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modals
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [editingFieldName, setEditingFieldName] = useState<string | null>(null);
  const [showNewModelModal, setShowNewModelModal] = useState(false);
  const [showEditModelModal, setShowEditModelModal] = useState(false);

  // Edit Model Form state
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editModelDesc, setEditModelDesc] = useState("");

  // Add/Edit Field Form state
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("string");
  const [fieldDesc, setFieldDesc] = useState("");
  const [fieldReq, setFieldReq] = useState(false);
  const [fieldUnique, setFieldUnique] = useState(false);
  const [fieldDefault, setFieldDefault] = useState("");
  const [fieldEnumOptions, setFieldEnumOptions] = useState("");
  const [fieldGridWidth, setFieldGridWidth] = useState<"full" | "half">("full");

  // New Model Form state
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newKind, setNewKind] = useState<"collectionType" | "singleType">("collectionType");
  const [newDesc, setNewDesc] = useState("");

  const currentModel = useMemo(() => {
    return models.find(m => m.uid === selectedUid) || models[0];
  }, [models, selectedUid]);

  // Normalize row IDs for fields
  const fieldsWithRowId = useMemo(() => {
    let currentMaxRow = 0;
    return currentModel.fields.map((f, idx) => {
      if (f.rowId === undefined || f.rowId === null) {
        currentMaxRow += 1;
        return { ...f, rowId: currentMaxRow };
      }
      currentMaxRow = Math.max(currentMaxRow, f.rowId);
      return f;
    });
  }, [currentModel.fields]);

  // Group fields by rowId into ordered rows
  const rowGroups = useMemo(() => {
    const map = new Map<number, FieldDefinition[]>();
    fieldsWithRowId.forEach((f) => {
      const rId = f.rowId || 1;
      if (!map.has(rId)) map.set(rId, []);
      map.get(rId)!.push(f);
    });
    return Array.from(map.entries()).map(([rowId, fields]) => ({ rowId, fields }));
  }, [fieldsWithRowId]);

  // Sync content types across tabs/components in real time
  useEffect(() => {
    function handleUpdate(e: any) {
      if (e?.detail) setModels(e.detail);
      else setModels(getStoredContentTypes());
    }
    window.addEventListener("mahila_content_types_updated", handleUpdate);
    return () => window.removeEventListener("mahila_content_types_updated", handleUpdate);
  }, []);

  function handleSaveAll() {
    try {
      const updated = saveAllFieldsForContentType(currentModel.uid, fieldsWithRowId);
      saveStoredContentTypes(updated);
      setModels(updated);
      toast.success(`Saved layout & schema for '${currentModel.displayName}'. Automatically reflected across output pages!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save layout");
    }
  }

  function handleSelectModel(uid: string) {
    setSelectedUid(uid);
  }

  function handleOpenAddField() {
    setEditingFieldName(null);
    setFieldName("");
    setFieldType("string");
    setFieldDesc("");
    setFieldReq(false);
    setFieldUnique(false);
    setFieldDefault("");
    setFieldEnumOptions("");
    setShowAddFieldModal(true);
  }

  function handleOpenEditField(field: FieldDefinition) {
    setEditingFieldName(field.name);
    setFieldName(field.name);
    setFieldType(field.type);
    setFieldDesc(field.description || "");
    setFieldReq(Boolean(field.required));
    setFieldUnique(Boolean(field.unique));
    setFieldDefault(field.defaultValue !== undefined ? String(field.defaultValue) : "");
    setFieldEnumOptions(field.enumOptions ? field.enumOptions.join(", ") : "");
    setShowAddFieldModal(true);
  }

  function handleMoveFieldToRow(fieldName: string, targetRowId: number) {
    try {
      const updatedFields = currentModel.fields.map(f => {
        if (f.name === fieldName) {
          return { ...f, rowId: targetRowId };
        }
        return f;
      });
      const updatedModels = saveAllFieldsForContentType(currentModel.uid, updatedFields);
      setModels(updatedModels);
      toast.success(`Moved '${fieldName}' into Row ${targetRowId} (Auto-fitted).`);
    } catch (err: any) {
      alert(err?.message || "Failed to move field");
    }
  }

  function handleSeparateToNewRow(fieldName: string) {
    try {
      const maxRow = Math.max(0, ...fieldsWithRowId.map(f => f.rowId || 0));
      const newRowId = maxRow + 1;
      const updatedFields = currentModel.fields.map(f => {
        if (f.name === fieldName) {
          return { ...f, rowId: newRowId };
        }
        return f;
      });
      const updatedModels = saveAllFieldsForContentType(currentModel.uid, updatedFields);
      setModels(updatedModels);
      toast.success(`Placed '${fieldName}' into a new Row (Full Width).`);
    } catch (err: any) {
      alert(err?.message || "Failed to place in new row");
    }
  }

  function handleReorderField(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentModel.fields.length) return;
    try {
      const updated = reorderFieldsInContentType(currentModel.uid, index, targetIdx);
      setModels(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to reorder field");
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    try {
      const updatedFields = [...currentModel.fields];
      const [moved] = updatedFields.splice(draggedIndex, 1);
      updatedFields.splice(targetIndex, 0, moved);
      const updatedModels = saveAllFieldsForContentType(currentModel.uid, updatedFields);
      setModels(updatedModels);
      toast.success(`Reordered '${moved.name}' to row position ${targetIndex + 1}.`);
    } catch (err: any) {
      alert(err?.message || "Reorder failed");
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }

  // ── Canvas Drag & Drop (field → row, row reorder) ──────────────────

  function handleCanvasFieldDragStart(e: React.DragEvent, fieldName: string) {
    setDraggedFieldName(fieldName);
    setDraggedRowId(null);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleCanvasRowDragStart(e: React.DragEvent, rowId: number) {
    setDraggedRowId(rowId);
    setDraggedFieldName(null);
    e.dataTransfer.effectAllowed = "move";
  }

  function clearCanvasDragState() {
    setDraggedFieldName(null);
    setDraggedRowId(null);
    setDragOverRowId(null);
    setDragOverNewRow(false);
    setDragOverRowHandle(null);
  }

  function handleCanvasRowDrop(e: React.DragEvent, targetRowId: number) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedFieldName) {
      // Move field into this row
      const sourceField = fieldsWithRowId.find(f => f.name === draggedFieldName);
      if (sourceField && sourceField.rowId !== targetRowId) {
        handleMoveFieldToRow(draggedFieldName, targetRowId);
      }
    } else if (draggedRowId !== null && draggedRowId !== targetRowId) {
      // Reorder rows: swap all fields in draggedRowId to appear before/after targetRowId
      try {
        const draggedGroup = rowGroups.find(g => g.rowId === draggedRowId);
        const targetGroup = rowGroups.find(g => g.rowId === targetRowId);
        if (!draggedGroup || !targetGroup) return;

        // Re-assign rowIds so that dragged row takes target's position
        const allFields = [...fieldsWithRowId];
        // Build new rowId ordering: swap the two rowIds
        const updatedFields = allFields.map(f => {
          if (f.rowId === draggedRowId) return { ...f, rowId: targetRowId };
          if (f.rowId === targetRowId) return { ...f, rowId: draggedRowId };
          return f;
        });
        const updated = saveAllFieldsForContentType(currentModel.uid, updatedFields);
        setModels(updated);
        toast.success(`Swapped rows ${draggedRowId} ↔ ${targetRowId}.`);
      } catch (err: any) {
        alert(err?.message || "Row reorder failed");
      }
    }
    clearCanvasDragState();
  }

  function handleCanvasNewRowDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggedFieldName) {
      handleSeparateToNewRow(draggedFieldName);
    }
    clearCanvasDragState();
  }

  function handleSetColSpan(fName: string, span: ColSpanType) {
    try {
      const updated = setFieldColSpan(currentModel.uid, fName, span);
      setModels(updated);
      toast.success(`Set layout width for '${fName}' to ${span === 12 ? "100% Full Row" : span === 6 ? "50% Half Column" : span === 4 ? "33% One-Third" : "25% Quarter"}.`);
    } catch (err: any) {
      alert(err?.message || "Failed to update column width");
    }
  }

  function handleToggleGridWidth(fName: string) {
    const field = currentModel.fields.find(f => f.name === fName);
    if (!field) return;
    const nextSpan: ColSpanType = (field.colSpan || (field.gridWidth === "half" ? 6 : 12)) === 12 ? 6 : 12;
    handleSetColSpan(fName, nextSpan);
  }

  function handleOpenEditModel() {
    setEditDisplayName(currentModel.displayName);
    setEditModelDesc(currentModel.description || "");
    setShowEditModelModal(true);
  }

  function handleEditModelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editDisplayName.trim()) return alert("Display name is required");
    try {
      const updated = updateContentType(currentModel.uid, {
        displayName: editDisplayName.trim(),
        description: editModelDesc.trim(),
      });
      setModels(updated);
      setShowEditModelModal(false);
      toast.success("Content type details updated successfully.");
    } catch (err: any) {
      alert(err?.message || "Failed to update content type");
    }
  }

  function handleAddFieldSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldName.trim()) return alert("Field name is required");
    const sanitizedName = fieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    try {
      const enumOpts = fieldType === "enum" ? fieldEnumOptions.split(",").map(s => s.trim()).filter(Boolean) : undefined;
      const fieldDef: FieldDefinition = {
        name: sanitizedName,
        type: fieldType,
        description: fieldDesc.trim() || undefined,
        required: fieldReq,
        unique: fieldUnique,
        defaultValue: fieldDefault.trim() || undefined,
        enumOptions: enumOpts,
        gridWidth: fieldGridWidth,
      };

      let updated: ContentTypeModel[];
      if (editingFieldName) {
        updated = updateFieldInContentType(currentModel.uid, editingFieldName, fieldDef);
        toast.success(`Field '${sanitizedName}' updated.`);
      } else {
        updated = addFieldToContentType(currentModel.uid, fieldDef);
        toast.success(`Field '${sanitizedName}' added.`);
      }

      setModels(updated);
      setShowAddFieldModal(false);
      setEditingFieldName(null);
      setFieldName("");
      setFieldDesc("");
      setFieldReq(false);
      setFieldUnique(false);
      setFieldDefault("");
      setFieldEnumOptions("");
    } catch (err: any) {
      alert(err?.message || "Failed to save field");
    }
  }

  function handleDeleteField(fName: string) {
    if (!confirm(`Are you sure you want to delete field '${fName}' from ${currentModel.displayName}?`)) return;
    try {
      const updated = deleteFieldFromContentType(currentModel.uid, fName);
      setModels(updated);
    } catch (err: any) {
      alert(err?.message || "Failed to delete field");
    }
  }

  function handleCreateNewModel(e: React.FormEvent) {
    e.preventDefault();
    if (!newDisplayName.trim()) return alert("Display name is required");
    try {
      const updated = createCustomContentType({
        displayName: newDisplayName.trim(),
        kind: newKind,
        description: newDesc.trim(),
      });
      setModels(updated);
      const slug = newDisplayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setSelectedUid(`api::${slug}.${slug}`);
      setShowNewModelModal(false);
      setNewDisplayName("");
      setNewDesc("");
    } catch (err: any) {
      alert(err?.message || "Failed to create content type");
    }
  }

  function handleDeleteModel(uid: string) {
    const target = models.find(m => m.uid === uid);
    if (!target) return;
    if (!target.isCustom) {
      return alert("System built-in content types cannot be deleted.");
    }
    if (!confirm(`Are you sure you want to delete custom content type '${target.displayName}' (${target.uid})? This action cannot be undone.`)) {
      return;
    }

    try {
      const updated = deleteCustomContentType(uid);
      setModels(updated);
      if (selectedUid === uid) {
        setSelectedUid(updated[0]?.uid || "api::blog-post.blog-post");
      }
      toast.success(`Content type '${target.displayName}' deleted successfully.`);
    } catch (err: any) {
      alert(err?.message || "Failed to delete content type");
    }
  }

  const [modelSearch, setModelSearch] = useState("");

  const filteredModels = models.filter((m) => {
    if (!modelSearch.trim()) return true;
    const q = modelSearch.toLowerCase();
    return m.displayName.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
  });

  const collectionTypes = filteredModels.filter(m => m.kind === "collectionType");
  const singleTypes = filteredModels.filter(m => m.kind === "singleType");

  return (
    <div className="bg-white rounded-2xl border border-[#a65a4a]/20 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[620px]">
      {/* Sidebar Directory */}
      <div className="w-full md:w-[240px] bg-[#faf8f5] border-r border-[#a65a4a]/15 p-3.5 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#a65a4a]/15">
            <div>
              <h3 className="font-['Fraunces',serif] text-[15px] font-semibold text-[#1e1e1e]">Content-Type Builder</h3>
              <p className="font-['Inter',sans-serif] text-[10px] text-[#1e1e1e]/55">Content Models</p>
            </div>
            <button
              onClick={() => setShowNewModelModal(true)}
              className="bg-[#a65a4a] text-[#f4efe7] text-[11px] font-semibold px-2.5 py-1 rounded-full hover:bg-[#993925] transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
              title="Create new collection or single type"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" /> Create
            </button>
          </div>

          {/* Model Search Input */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40 pointer-events-none" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search content types…"
              className="w-full bg-white border border-[#a65a4a]/25 rounded-lg pl-7 pr-6 py-1 text-[11.5px] text-[#1e1e1e] placeholder-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif]"
            />
            {modelSearch && (
              <button
                type="button"
                onClick={() => setModelSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#1e1e1e]/40 hover:text-[#a65a4a] cursor-pointer"
                title="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Collection Types */}
          <div className="mb-4">
            <p className="font-['Inter',sans-serif] text-[9.5px] font-bold uppercase tracking-wider text-[#1e1e1e]/45 mb-1.5 px-1.5">
              Collection Types ({collectionTypes.length})
            </p>
            <div className="flex flex-col gap-0.5">
              {collectionTypes.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => handleSelectModel(m.uid)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-['Inter',sans-serif] text-[11.5px] transition-all cursor-pointer flex items-center justify-between ${
                    selectedUid === m.uid
                      ? "bg-[#a65a4a] text-[#f4efe7] font-semibold shadow-xs"
                      : "text-[#1e1e1e]/80 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{m.displayName}</span>
                  {m.isCustom && (
                    <span className="text-[8.5px] uppercase px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold shrink-0">
                      Custom
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Single Types */}
          <div>
            <p className="font-['Inter',sans-serif] text-[9.5px] font-bold uppercase tracking-wider text-[#1e1e1e]/45 mb-1.5 px-1.5">
              Single Types ({singleTypes.length})
            </p>
            <div className="flex flex-col gap-0.5">
              {singleTypes.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => handleSelectModel(m.uid)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-['Inter',sans-serif] text-[11.5px] transition-all cursor-pointer flex items-center justify-between ${
                    selectedUid === m.uid
                      ? "bg-[#a65a4a] text-[#f4efe7] font-semibold shadow-xs"
                      : "text-[#1e1e1e]/80 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{m.displayName}</span>
                  <span className="text-[8.5px] uppercase px-1 py-0.2 rounded bg-[#1e1e1e]/10 text-[#1e1e1e]/60 font-bold shrink-0">
                    Single
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>



      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
        <div>
          {/* Content Type Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#a65a4a]/15">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-['Fraunces',serif] text-[18px] font-bold text-[#1e1e1e]">
                  {currentModel.displayName}
                </h2>
              </div>

              <p className="font-['Inter',sans-serif] text-[11.5px] text-[#1e1e1e]/65 mt-0.5">
                {currentModel.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAll}
                className="bg-emerald-600 text-white text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                title="Save current layout and field schema across output pages"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
              <button
                onClick={handleOpenEditModel}
                className="bg-[#faf8f5] border border-[#a65a4a]/30 text-[#1e1e1e] hover:bg-[#a65a4a]/10 text-[11.5px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title="Edit content type display title and description"
              >
                <span>✏️ Edit Details</span>
              </button>
              {currentModel.isCustom && (
                <button
                  onClick={() => handleDeleteModel(currentModel.uid)}
                  className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-[11.5px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                  title="Delete this custom content type"
                >
                  <span>🗑️ Delete</span>
                </button>
              )}
              <button
                onClick={handleOpenAddField}
                className="bg-[#a65a4a] text-[#f4efe7] text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Another Field
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 sm:gap-4 mb-4 border-b border-[#a65a4a]/15 overflow-x-auto pb-0">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`pb-2 font-['Inter',sans-serif] text-[12.5px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "canvas" ? "border-[#a65a4a] text-[#a65a4a]" : "border-transparent text-[#1e1e1e]/50 hover:text-[#1e1e1e]"
              }`}
            >
              <span>🎨 Drag & Drop Builder</span>
            </button>


            <button
              onClick={() => setActiveTab("preview")}
              className={`pb-2 font-['Inter',sans-serif] text-[12.5px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "preview" ? "border-[#a65a4a] text-[#a65a4a]" : "border-transparent text-[#1e1e1e]/50 hover:text-[#1e1e1e]"
              }`}
            >
              <span>👁️ Live Form Preview</span>
            </button>

          </div>


          {/* TAB 0: Drag & Drop Canvas */}
          {activeTab === "canvas" && (
            <div className="flex flex-col lg:flex-row gap-4 font-['Inter',sans-serif]">
              {/* Left Widget Palette */}
              <div className="w-full lg:w-[200px] bg-[#faf8f5] border border-[#a65a4a]/15 rounded-xl p-3 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-['Fraunces',serif] text-[13.5px] font-semibold text-[#1e1e1e]">
                    Field Palette
                  </h4>
                  <span className="text-[9.5px] font-bold text-[#a65a4a] bg-[#a65a4a]/10 px-1.5 py-0.2 rounded">
                    10 Types
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => {
                        setEditingFieldName(null);
                        setFieldName(`new_${t.type}_field`);
                        setFieldType(t.type);
                        setFieldDesc(t.desc);
                        setFieldReq(false);
                        setFieldUnique(false);
                        setFieldDefault("");
                        setFieldEnumOptions(t.type === "enum" ? "option1, option2, option3" : "");
                        setShowAddFieldModal(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 bg-white border border-[#a65a4a]/15 rounded-lg hover:border-[#a65a4a] hover:bg-[#a65a4a]/5 transition-colors cursor-pointer text-[11.5px] flex items-center justify-between shadow-2xs group"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13px]">{t.icon}</span>
                        <span className="font-medium text-[#1e1e1e] group-hover:text-[#a65a4a]">{t.label}</span>
                      </span>
                      <div
                        className="w-5 h-5 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] group-hover:bg-[#a65a4a] group-hover:text-white flex items-center justify-center transition-colors shrink-0"
                        title="Add field"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>

                    </button>
                  ))}
                </div>
              </div>

              {/* Right Drag & Drop Form Canvas */}
              <div className="flex-1 w-full bg-[#faf8f5] border border-[#a65a4a]/15 rounded-xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#a65a4a]/15">
                  <h4 className="font-['Fraunces',serif] text-[15px] font-semibold text-[#1e1e1e]">
                    Form Layout Canvas
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAll}
                      className="bg-emerald-600 text-white text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      title="Save layout arrangement"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Layout
                    </button>
                    <button
                      onClick={handleOpenAddField}
                      className="bg-[#a65a4a] text-[#f4efe7] text-[11.5px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <span>+ Add Field</span>
                    </button>
                  </div>
                </div>

                {/* Hint bar */}
                <div className="mb-3 flex items-center gap-1.5 text-[10.5px] text-[#1e1e1e]/45 font-['Inter',sans-serif]">
                  <span>⠿</span>
                  <span>Drag field cards to move between rows · Drag row handles to reorder rows · Drop on "new row" zone to split</span>
                </div>

                {/* Row Drop Zone Containers */}
                <div
                  className="flex flex-col gap-2.5 min-h-[350px]"
                  onDragEnd={clearCanvasDragState}
                >
                  {rowGroups.map((group, rIdx) => {
                    const isRowDragging = draggedRowId === group.rowId;
                    const isRowDragOver = dragOverRowId === group.rowId && draggedFieldName !== null;
                    const isRowSwapTarget = dragOverRowHandle === group.rowId && draggedRowId !== null && draggedRowId !== group.rowId;
                    return (
                      <div
                        key={group.rowId}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedFieldName !== null) setDragOverRowId(group.rowId);
                          if (draggedRowId !== null && draggedRowId !== group.rowId) setDragOverRowHandle(group.rowId);
                        }}
                        onDragLeave={() => { setDragOverRowId(null); setDragOverRowHandle(null); }}
                        onDrop={(e) => handleCanvasRowDrop(e, group.rowId)}
                        style={{ transition: "all 0.18s ease" }}
                        className={[
                          "flex items-center gap-2 w-full group/row rounded-xl px-1 py-0.5",
                          isRowDragging ? "opacity-40 scale-[0.98]" : "",
                          isRowDragOver ? "ring-2 ring-blue-400 bg-blue-50/60" : isRowSwapTarget ? "ring-2 ring-amber-400 bg-amber-50/50" : "",
                        ].join(" ")}
                      >
                        {/* Row Drag Handle */}
                        <div
                          draggable={true}
                          onDragStart={(e) => handleCanvasRowDragStart(e, group.rowId)}
                          className="text-[#1e1e1e]/30 hover:text-[#a65a4a] font-bold text-[16px] px-0.5 cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none"
                          title={`Drag to reorder Row #${rIdx + 1}`}
                        >⠿</div>
                        <span className="text-[9px] font-bold text-[#1e1e1e]/30 shrink-0 w-4 text-center select-none">{rIdx + 1}</span>
                        {/* Field Cards */}
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2 w-full">
                          {group.fields.map((f) => {
                            const icon = FIELD_TYPES.find(t => t.type === f.type)?.icon || "𝌀";
                            const isThisFieldDragging = draggedFieldName === f.name;
                            return (
                              <div
                                key={f.name}
                                draggable={true}
                                onDragStart={(e) => handleCanvasFieldDragStart(e, f.name)}
                                onDragEnd={clearCanvasDragState}
                                style={{ transition: "opacity 0.15s, box-shadow 0.15s" }}
                                className={["flex-1 w-full sm:w-auto min-w-[150px] bg-white border rounded-xl px-3 py-2 shadow-2xs transition-all cursor-move flex items-center justify-between group/card", isThisFieldDragging ? "opacity-40 border-[#a65a4a] shadow-inner" : "border-[#a65a4a]/20 hover:border-[#a65a4a]/50 hover:shadow-sm"].join(" ")}
                              >
                                <div className="flex items-center gap-2 truncate pr-1.5">
                                  <span className="text-[#1e1e1e]/25 text-[11px] select-none">⠿</span>
                                  <span className="text-[13px] text-[#1e1e1e]/70">{icon}</span>
                                  <span className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#1e1e1e] truncate">{f.name}</span>
                                  {f.required && <span className="text-[8.5px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded-full shrink-0">Req</span>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0 text-[#1e1e1e]/60">
                                  {group.fields.length > 1 && (
                                    <button onClick={() => handleSeparateToNewRow(f.name)} className="p-0.5 hover:text-[#a65a4a] rounded text-[11px] cursor-pointer transition-colors" title="Separate to New Row">↩</button>
                                  )}
                                  <button onClick={() => handleOpenEditField(f)} className="p-0.5 hover:text-[#a65a4a] rounded text-[11.5px] cursor-pointer transition-colors" title="Edit Field">✏️</button>
                                  {!["id"].includes(f.name.toLowerCase()) && (
                                    <button onClick={() => handleDeleteField(f.name)} className="p-0.5 hover:text-red-600 rounded text-[11.5px] cursor-pointer transition-colors" title="Delete Field">🗑️</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {(isRowDragOver || isRowSwapTarget) && (
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isRowDragOver ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"}`}>
                            {isRowDragOver ? "↓ Drop here" : "⇄ Swap"}
                          </span>
                        )}
                        <button
                          onClick={() => { setEditingFieldName(null); setFieldName(""); setFieldType("string"); setFieldDesc(""); setFieldReq(false); setFieldUnique(false); setFieldDefault(""); setFieldEnumOptions(""); setShowAddFieldModal(true); }}
                          className="w-7 h-7 rounded-full bg-white border border-[#a65a4a]/20 hover:border-[#a65a4a] text-[#1e1e1e] hover:text-[#a65a4a] hover:bg-[#faf8f5] flex items-center justify-center font-bold text-[14px] transition-all cursor-pointer shadow-2xs shrink-0"
                          title="Add field into this row"
                        >+</button>
                      </div>
                    );
                  })}
                  {/* Drop to New Row */}
                  {draggedFieldName !== null && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOverNewRow(true); }}
                      onDragLeave={() => setDragOverNewRow(false)}
                      onDrop={handleCanvasNewRowDrop}
                      style={{ transition: "all 0.18s ease" }}
                      className={["w-full rounded-xl border-2 border-dashed flex items-center justify-center py-3 text-[12px] font-semibold cursor-pointer select-none", dragOverNewRow ? "border-[#a65a4a] bg-[#a65a4a]/10 text-[#a65a4a]" : "border-[#a65a4a]/30 text-[#1e1e1e]/35"].join(" ")}
                    >
                      {dragOverNewRow ? "⬇ Release to create new row" : "+ Drop here to create a new row"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* TAB 2: Live Form Preview */}
          {activeTab === "preview" && (
            <div className="bg-[#faf8f5] border border-[#a65a4a]/15 rounded-2xl p-6 font-['Inter',sans-serif]">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#a65a4a]/15">
                <div>
                  <h4 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e] flex items-center gap-2">
                    <span>👁️ Live CMS Entry Form Preview</span>
                  </h4>
                  <p className="text-[12px] text-[#1e1e1e]/60 mt-0.5">
                    Interactive simulation of the editor form UI for <code className="text-[#a65a4a] font-bold">{currentModel.displayName}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-3 py-1 bg-[#a65a4a]/10 text-[#a65a4a] font-bold rounded-full">
                    {currentModel.fields.length} Inputs Active
                  </span>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); toast.success("Form preview submitted cleanly!"); }} className="flex flex-col gap-5 bg-white p-6 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
                {rowGroups.map((group) => (
                  <div key={group.rowId} className="flex flex-col sm:flex-row gap-4 w-full">
                    {group.fields.map((f) => (
                      <div key={f.name} className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                        <label className="text-[12px] font-bold text-[#1e1e1e] flex items-center justify-between">
                          <span>
                            {f.name} {f.required && <span className="text-red-600">*</span>}
                          </span>
                          <span className="text-[10px] font-mono font-normal text-[#1e1e1e]/45 uppercase">
                            {f.type} {group.fields.length > 1 ? `(Auto-Fit ${group.fields.length} Cols)` : "(Full Row)"}
                          </span>
                        </label>

                        {f.type === "text" || f.type === "richtext" ? (
                          <textarea
                            rows={3}
                            placeholder={f.description || `Enter ${f.name}...`}
                            defaultValue={f.defaultValue !== undefined ? String(f.defaultValue) : ""}
                            className="w-full border border-[#a65a4a]/25 rounded-xl p-3 text-[13px] focus:outline-none focus:border-[#a65a4a] bg-[#faf8f5]/50"
                          />
                        ) : f.type === "enum" ? (
                          <select className="w-full border border-[#a65a4a]/25 rounded-xl p-2.5 text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white">
                            <option value="">-- Select {f.name} --</option>
                            {f.enumOptions?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : f.type === "boolean" ? (
                          <div className="flex items-center gap-3 pt-1">
                            <input type="checkbox" defaultChecked={Boolean(f.defaultValue)} className="w-5 h-5 accent-[#a65a4a] cursor-pointer" />
                            <span className="text-[13px] text-[#1e1e1e]/75">{f.description || `Enable ${f.name}`}</span>
                          </div>
                        ) : f.type === "datetime" ? (
                          <input
                            type="datetime-local"
                            className="w-full border border-[#a65a4a]/25 rounded-xl p-2.5 text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white"
                          />
                        ) : f.type === "media" ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="https://example.com/image.jpg"
                              className="w-full border border-[#a65a4a]/25 rounded-xl p-2.5 text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white font-mono"
                            />
                            <p className="text-[10px] text-[#1e1e1e]/50">Image / Asset URL preview</p>
                          </div>
                        ) : (
                          <input
                            type={f.type === "number" ? "number" : "text"}
                            placeholder={f.description || `Enter ${f.name}...`}
                            defaultValue={f.defaultValue !== undefined ? String(f.defaultValue) : ""}
                            className="w-full border border-[#a65a4a]/25 rounded-xl p-2.5 text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white"
                          />
                        )}

                        {f.description && f.type !== "boolean" && (
                          <p className="text-[11px] text-[#1e1e1e]/50 italic">{f.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                <div className="w-full flex justify-end gap-3 pt-4 border-t border-[#a65a4a]/15 mt-2">
                  <button
                    type="button"
                    onClick={() => toast.info("Resetting preview inputs")}
                    className="px-4 py-2 border border-[#a65a4a]/30 text-[#1e1e1e]/70 rounded-full text-[13px] font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#a65a4a] text-[#f4efe7] rounded-full text-[13px] font-semibold hover:bg-[#993925] cursor-pointer shadow-sm"
                  >
                    Test Save Entry
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>


        {/* Database info banner */}
        <div className="mt-8 pt-4 border-t border-[#a65a4a]/15 flex items-center justify-between text-[12px] font-['Inter',sans-serif] text-[#1e1e1e]/55">
          <span>Table Name: <code className="bg-[#1e1e1e]/5 px-1.5 py-0.5 rounded font-mono font-semibold text-[#1e1e1e]">{currentModel.tableName}</code></span>
          <span>Database Engine: PostgreSQL</span>
        </div>

      </div>

      {/* MODAL 1: Add Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#a65a4a]/20 max-h-[90vh] overflow-y-auto">
            <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e] mb-1">
              Add Field to {currentModel.displayName}
            </h3>
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 mb-5">
              Select field type, name, and validation requirements.
            </p>

            <form onSubmit={handleAddFieldSubmit} className="flex flex-col gap-4 font-['Inter',sans-serif]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Field Name (API Key)</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={e => setFieldName(e.target.value)}
                  placeholder="e.g. author_name, cover_url, rating"
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Field Type</label>
                <select
                  value={fieldType}
                  onChange={e => setFieldType(e.target.value as FieldType)}
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a] bg-white"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#1e1e1e]/50 mt-1 italic">
                  {FIELD_TYPES.find(t => t.type === fieldType)?.desc}
                </p>
              </div>

              {fieldType === "enum" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Enum Options (Comma Separated)</label>
                  <input
                    type="text"
                    value={fieldEnumOptions}
                    onChange={e => setFieldEnumOptions(e.target.value)}
                    placeholder="draft, published, archived"
                    className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Description / Help Text</label>
                <input
                  type="text"
                  value={fieldDesc}
                  onChange={e => setFieldDesc(e.target.value)}
                  placeholder="Short explanation for CMS editors"
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                />
              </div>

              <div className="flex items-center gap-6 py-1">
                <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                  <input type="checkbox" checked={fieldReq} onChange={e => setFieldReq(e.target.checked)} className="rounded accent-[#a65a4a]" />
                  <span>Required field</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                  <input type="checkbox" checked={fieldUnique} onChange={e => setFieldUnique(e.target.checked)} className="rounded accent-[#a65a4a]" />
                  <span>Unique value</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Default Value (Optional)</label>
                <input
                  type="text"
                  value={fieldDefault}
                  onChange={e => setFieldDefault(e.target.value)}
                  placeholder="e.g. Draft or 0"
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[#a65a4a]/15">
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="px-5 py-2.5 text-[13px] text-[#1e1e1e]/60 hover:text-[#1e1e1e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#a65a4a] text-[#f4efe7] font-semibold text-[13px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-sm"
                >
                  Save Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New Model Modal */}
      {showNewModelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#a65a4a]/20">
            <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e] mb-1">
              Create New Content Type
            </h3>
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 mb-5">
              Define a new Collection Type or Single Type API model.
            </p>

            <form onSubmit={handleCreateNewModel} className="flex flex-col gap-4 font-['Inter',sans-serif]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Press Release, Partner Logo, Testimonial"
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Model Kind</label>
                <select
                  value={newKind}
                  onChange={e => setNewKind(e.target.value as any)}
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a] bg-white"
                >
                  <option value="collectionType">Collection Type (Multiple Entries, e.g. Posts, Events)</option>
                  <option value="singleType">Single Type (One Instance, e.g. Contact Info, Settings)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Summary of what this content model holds"
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[#a65a4a]/15">
                <button
                  type="button"
                  onClick={() => setShowNewModelModal(false)}
                  className="px-5 py-2.5 text-[13px] text-[#1e1e1e]/60 hover:text-[#1e1e1e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#a65a4a] text-[#f4efe7] font-semibold text-[13px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-sm"
                >
                  Create Content Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Content Type Modal */}
      {showEditModelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#a65a4a]/20">
            <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e] mb-1">
              Edit Content Type Details
            </h3>
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 mb-5">
              Update display title and description for <code className="text-[#a65a4a]">{currentModel.uid}</code>.
            </p>

            <form onSubmit={handleEditModelSubmit} className="flex flex-col gap-4 font-['Inter',sans-serif]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1e1e1e]/60 mb-1">Description</label>
                <textarea
                  value={editModelDesc}
                  onChange={e => setEditModelDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-[#a65a4a]/30 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#a65a4a]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[#a65a4a]/15">
                <button
                  type="button"
                  onClick={() => setShowEditModelModal(false)}
                  className="px-5 py-2.5 text-[13px] text-[#1e1e1e]/60 hover:text-[#1e1e1e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#a65a4a] text-[#f4efe7] font-semibold text-[13px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
