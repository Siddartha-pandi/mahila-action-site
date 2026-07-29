"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { TimelineEntry, newTimelineEntry, saveTimelineEntry, deleteTimelineEntry } from "../../lib/data";
import { getStoredContentTypes, isSystemDefaultField, FieldDefinition } from "../../lib/contentTypeRegistry";
import { moveToRecycleBin } from "../../lib/recycleBin";

export function TimelineAdmin({ timeline, onChange }: { timeline: TimelineEntry[]; onChange: (next: TimelineEntry[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(timeline[0]?.id ?? null);
  const active = timeline.find((t) => t.id === activeId) ?? null;

  // Load Content-Type Builder schema for Timeline
  const timelineModel = useMemo(() => {
    const models = getStoredContentTypes();
    return models.find((m) => m.uid === "api::timeline.timeline") || models[4];
  }, []);

  const userEditableFields = useMemo(() => {
    return (timelineModel?.fields || []).filter((f) => !isSystemDefaultField(f.name));
  }, [timelineModel]);

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

  function update(patch: Partial<TimelineEntry>) {
    if (!active) return;
    onChange(timeline.map((t) => (t.id === active.id ? { ...t, ...patch } : t)));
  }

  function handleAdd() {
    const t = newTimelineEntry(timeline.length);
    onChange([...timeline, t]);
    setActiveId(t.id);
  }

  async function handleDelete(id: string) {
    const target = timeline.find((t) => t.id === id);
    if (target) {
      moveToRecycleBin("timeline", `${target.year} — ${target.title}`, target);
    }
    await deleteTimelineEntry(id);
    const next = timeline.filter((t) => t.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success(`'${target?.title || "Milestone"}' moved to Recycle Bin.`);
  }

  async function handleSave() {
    if (!active) return;
    await saveTimelineEntry(active);
    toast.success("Timeline entry saved!");
  }

  function move(dir: -1 | 1) {
    if (!active) return;
    const sortedList = [...timeline].sort((a, b) => a.order - b.order);
    const idx = sortedList.findIndex((t) => t.id === active.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sortedList.length) return;
    const a = sortedList[idx], b = sortedList[swapIdx];
    const next = timeline.map((t) => {
      if (t.id === a.id) return { ...t, order: b.order };
      if (t.id === b.id) return { ...t, order: a.order };
      return t;
    });
    onChange(next);
    saveTimelineEntry(next.find((t) => t.id === a.id)!);
    saveTimelineEntry(next.find((t) => t.id === b.id)!);
  }

  const sorted = [...timeline].sort((a, b) => a.order - b.order);

  function renderFieldControl(f: FieldDefinition) {
    if (!active) return null;
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (key === "year") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Year / Date Label"}</label>
          <input value={active.year} onChange={(e) => update({ year: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "title") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Milestone Title"}</label>
          <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "image" || key === "photo") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <ImageField label={f.description || "Milestone Photo"} value={active.image} onChange={(v) => update({ image: v })} />
        </div>
      );
    }

    if (key === "description") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Description"}</label>
          <textarea value={active.description} onChange={(e) => update({ description: e.target.value })} rows={4} className={`${inputBase} resize-y`} />
        </div>
      );
    }

    if (key === "orderindex" || key === "order_index") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Sort Order</label>
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
      items={sorted}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={handleAdd}
      onDelete={handleDelete}
      itemLabel={(t) => `${t.year} — ${t.title}`}
      addLabel="Add New Milestone"
      emptyLabel="No timeline entries yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a milestone to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[640px]">
          <div className="flex gap-2 mb-1">
            <button onClick={() => move(-1)} className="text-[12px] font-['Inter',sans-serif] border border-[#a65a4a]/30 text-[#a65a4a] px-3 py-1.5 rounded-lg hover:bg-[#a65a4a]/5 cursor-pointer">↑ Move Earlier</button>
            <button onClick={() => move(1)} className="text-[12px] font-['Inter',sans-serif] border border-[#a65a4a]/30 text-[#a65a4a] px-3 py-1.5 rounded-lg hover:bg-[#a65a4a]/5 cursor-pointer">↓ Move Later</button>
          </div>

          {/* Dynamically render row groups configured in Content-Type Builder */}
          {rowGroups.map((group) => (
            <div key={group.rowId} className="flex flex-col sm:flex-row gap-4 w-full items-start">
              {group.fields.map((f) => renderFieldControl(f))}
            </div>
          ))}

          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Milestone
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
