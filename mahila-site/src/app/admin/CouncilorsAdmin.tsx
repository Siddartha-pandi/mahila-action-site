"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { Councilor, newCouncilor, saveCouncilor, deleteCouncilor } from "../../lib/data";
import { getStoredContentTypes, isSystemDefaultField, FieldDefinition } from "../../lib/contentTypeRegistry";
import { moveToRecycleBin } from "../../lib/recycleBin";

export function CouncilorsAdmin({ councilors, onChange }: { councilors: Councilor[]; onChange: (next: Councilor[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(councilors[0]?.id ?? null);
  const active = councilors.find((c) => c.id === activeId) ?? null;

  // Load Content-Type Builder schema for Councilor
  const councilorModel = useMemo(() => {
    const models = getStoredContentTypes();
    return models.find((m) => m.uid === "api::councilor.councilor") || models[3];
  }, []);

  const userEditableFields = useMemo(() => {
    return (councilorModel?.fields || []).filter((f) => !isSystemDefaultField(f.name));
  }, [councilorModel]);

  const fieldsWithRowId = useMemo(() => {
    let currentMaxRow = 0;
    return userEditableFields.map((f) => {
      if (f.rowId === undefined || f.rowId === null) {
        currentMaxRow += 1;
        return { ...f, rowId: currentMaxRow };
      }
      currentMaxRow = Math.max(currentMaxRow, f.rowId);
      return f;
    });
  }, [userEditableFields]);

  const rowGroups = useMemo(() => {
    const map = new Map<number, FieldDefinition[]>();
    fieldsWithRowId.forEach((f) => {
      const rId = f.rowId || 1;
      if (!map.has(rId)) map.set(rId, []);
      map.get(rId)!.push(f);
    });
    return Array.from(map.entries()).map(([rowId, fields]) => ({ rowId, fields }));
  }, [fieldsWithRowId]);

  function update(patch: Partial<Councilor>) {
    if (!active) return;
    onChange(councilors.map((c) => (c.id === active.id ? { ...c, ...patch } : c)));
  }

  function handleAdd() {
    const c = newCouncilor(councilors.length);
    onChange([...councilors, c]);
    setActiveId(c.id);
  }

  async function handleDelete(id: string) {
    const target = councilors.find((c) => c.id === id);
    if (target) {
      moveToRecycleBin("councilor", target.name, target);
    }
    await deleteCouncilor(id);
    const next = councilors.filter((c) => c.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success(`'${target?.name || "Councilor"}' moved to Recycle Bin.`);
  }

  async function handleSave() {
    if (!active) return;
    await saveCouncilor(active);
    toast.success("Councilor profile saved!");
  }

  function renderFieldControl(f: FieldDefinition) {
    if (!active) return null;
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (key === "name") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Full Name"}</label>
          <input value={active.name} onChange={(e) => update({ name: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "role") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Role / Title"}</label>
          <input value={active.role} onChange={(e) => update({ role: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "image" || key === "photo") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <ImageField label={f.description || "Profile Photo"} value={active.image} onChange={(v) => update({ image: v })} />
        </div>
      );
    }

    if (key === "bio") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Bio / Story"}</label>
          <textarea value={active.bio} onChange={(e) => update({ bio: e.target.value })} rows={4} className={`${inputBase} resize-y`} />
        </div>
      );
    }

    if (key === "orderindex" || key === "order_index") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Sort Order Index</label>
          <input type="number" value={active.order} onChange={(e) => update({ order: Number(e.target.value) })} className={inputBase} />
        </div>
      );
    }

    return (
      <div key={f.name} className="flex-1 min-w-[180px]">
        <label className={labelBase}>{f.name}</label>
        <input placeholder={`Enter ${f.name}...`} className={inputBase} />
      </div>
    );
  }

  return (
    <AdminListEditor
      items={councilors}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={handleAdd}
      onDelete={handleDelete}
      itemLabel={(c) => c.name}
      itemSubLabel={(c) => c.role}
      addLabel="Add New Councilor"
      emptyLabel="No councilor profiles yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a profile to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[640px]">
          {/* Dynamically render row groups configured in Content-Type Builder */}
          {rowGroups.map((group) => (
            <div key={group.rowId} className="flex flex-col sm:flex-row gap-4 w-full items-start">
              {group.fields.map((f) => renderFieldControl(f))}
            </div>
          ))}

          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Profile
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
