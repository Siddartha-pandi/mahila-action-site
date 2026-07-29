import { useState } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { TimelineEntry, newTimelineEntry, saveTimelineEntry, deleteTimelineEntry } from "../../lib/data";

export function TimelineAdmin({ timeline, onChange }: { timeline: TimelineEntry[]; onChange: (next: TimelineEntry[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(timeline[0]?.id ?? null);
  const active = timeline.find((t) => t.id === activeId) ?? null;

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
    await deleteTimelineEntry(id);
    const next = timeline.filter((t) => t.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success("Timeline milestone deleted successfully.");
  }

  async function handleSave() {
    if (!active) return;
    await saveTimelineEntry(active);
    toast.success("Timeline entry saved!");
  }

  function move(dir: -1 | 1) {
    if (!active) return;
    const sorted = [...timeline].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((t) => t.id === active.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
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
        <div className="flex flex-col gap-5 max-w-[560px]">
          <div className="flex gap-2">
            <button onClick={() => move(-1)} className="text-[12px] font-['Inter',sans-serif] border border-[#a65a4a]/30 text-[#a65a4a] px-3 py-1.5 rounded-lg hover:bg-[#a65a4a]/5 cursor-pointer">↑ Move Earlier</button>
            <button onClick={() => move(1)} className="text-[12px] font-['Inter',sans-serif] border border-[#a65a4a]/30 text-[#a65a4a] px-3 py-1.5 rounded-lg hover:bg-[#a65a4a]/5 cursor-pointer">↓ Move Later</button>
          </div>
          <div>
            <label className={labelBase}>Year / Date Label</label>
            <input value={active.year} onChange={(e) => update({ year: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Milestone Title</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
          </div>
          <ImageField label="Milestone Photo" value={active.image} onChange={(v) => update({ image: v })} />
          <div>
            <label className={labelBase}>Description</label>
            <textarea value={active.description} onChange={(e) => update({ description: e.target.value })} rows={4} className={`${inputBase} resize-y`} />
          </div>
          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Milestone
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
