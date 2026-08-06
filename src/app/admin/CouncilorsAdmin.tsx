import { useState } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { Councilor, newCouncilor, saveCouncilor, deleteCouncilor } from "../../lib/data";

export function CouncilorsAdmin({ councilors, onChange }: { councilors: Councilor[]; onChange: (next: Councilor[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(councilors[0]?.id ?? null);
  const active = councilors.find((c) => c.id === activeId) ?? null;

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
    await deleteCouncilor(id);
    const next = councilors.filter((c) => c.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success("Councilor profile deleted successfully.");
  }

  async function handleSave() {
    if (!active) return;
    await saveCouncilor(active);
    toast.success("Councilor profile saved!");
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
        <div className="flex flex-col gap-5 max-w-[560px]">
          <div>
            <label className={labelBase}>Full Name</label>
            <input value={active.name} onChange={(e) => update({ name: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Role / Title</label>
            <input value={active.role} onChange={(e) => update({ role: e.target.value })} className={inputBase} />
          </div>
          <ImageField label="Profile Photo" value={active.image} onChange={(v) => update({ image: v })} />
          <div>
            <label className={labelBase}>Bio / Story</label>
            <textarea value={active.bio} onChange={(e) => update({ bio: e.target.value })} rows={4} className={`${inputBase} resize-y`} />
          </div>
          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Profile
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
