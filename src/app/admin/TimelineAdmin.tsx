import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown } from "lucide-react";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import {
  TimelineEntry,
  newTimelineEntry,
  saveTimelineEntry,
  saveTimelineOrder,
  deleteTimelineEntry,
} from "../../lib/data";

export function TimelineAdmin({
  timeline,
  onChange,
}: {
  timeline: TimelineEntry[];
  onChange: (next: TimelineEntry[]) => void;
}) {
  const sorted = [...timeline].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const [activeId, setActiveId] = useState<string | null>(sorted[0]?.id ? String(sorted[0].id) : null);
  const active = timeline.find((t) => String(t.id) === String(activeId)) ?? sorted[0] ?? null;

  useEffect(() => {
    if (!activeId && sorted.length > 0) {
      setActiveId(String(sorted[0].id));
    }
  }, [sorted, activeId]);

  const activeIndex = active ? sorted.findIndex((t) => String(t.id) === String(active.id)) : -1;
  const canMoveEarlier = activeIndex > 0;
  const canMoveLater = activeIndex >= 0 && activeIndex < sorted.length - 1;

  function update(patch: Partial<TimelineEntry>) {
    if (!active) return;
    onChange(timeline.map((t) => (String(t.id) === String(active.id) ? { ...t, ...patch } : t)));
  }

  function handleAdd() {
    const t = newTimelineEntry(sorted.length);
    const next = [...timeline, t];
    onChange(next);
    setActiveId(t.id);
  }

  async function handleDelete(id: string) {
    await deleteTimelineEntry(id);
    const next = timeline.filter((t) => String(t.id) !== String(id));
    const reindexed = next
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((item, idx) => ({ ...item, order: idx }));
    onChange(reindexed);
    await saveTimelineOrder(reindexed);
    if (String(activeId) === String(id)) setActiveId(reindexed[0]?.id ?? null);
    toast.success("Timeline milestone deleted successfully.");
  }

  async function handleSave() {
    if (!active) return;
    await saveTimelineEntry(active);
    toast.success("Timeline entry saved!");
  }

  async function move(dir: -1 | 1) {
    if (!active) return;
    const currentList = [...sorted];
    const idx = currentList.findIndex((t) => String(t.id) === String(active.id));
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    // Reposition item in the list
    const [movedItem] = currentList.splice(idx, 1);
    currentList.splice(targetIdx, 0, movedItem);

    // Re-index every item strictly: 0, 1, 2, 3...
    const reindexed = currentList.map((item, i) => ({
      ...item,
      order: i,
    }));

    // Update UI state immediately
    onChange(reindexed);

    // Persist to backend and local storage
    await saveTimelineOrder(reindexed);

    toast.success(`"${movedItem.year || "Milestone"}" moved ${dir === -1 ? "earlier" : "later"}!`);
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
        <div className="flex flex-col gap-5 max-w-[560px]">
          {/* Move Earlier / Later Toolbar */}
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#a65a4a]/20 shadow-2xs">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={!canMoveEarlier}
              className={`inline-flex items-center gap-1.5 text-[12px] font-['Inter',sans-serif] font-medium border px-3 py-1.5 rounded-lg transition-all ${
                canMoveEarlier
                  ? "border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white cursor-pointer shadow-2xs"
                  : "border-gray-200 text-gray-400 bg-gray-50 opacity-40 cursor-not-allowed"
              }`}
              title={canMoveEarlier ? "Move this milestone earlier in history" : "Already the earliest milestone"}
            >
              <ArrowUp size={13} />
              <span>Move Earlier</span>
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={!canMoveLater}
              className={`inline-flex items-center gap-1.5 text-[12px] font-['Inter',sans-serif] font-medium border px-3 py-1.5 rounded-lg transition-all ${
                canMoveLater
                  ? "border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white cursor-pointer shadow-2xs"
                  : "border-gray-200 text-gray-400 bg-gray-50 opacity-40 cursor-not-allowed"
              }`}
              title={canMoveLater ? "Move this milestone later in history" : "Already the latest milestone"}
            >
              <ArrowDown size={13} />
              <span>Move Later</span>
            </button>
            <span className="text-[11px] text-[#1e1e1e]/45 font-medium ml-auto pr-1">
              Position {activeIndex + 1} of {sorted.length}
            </span>
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
