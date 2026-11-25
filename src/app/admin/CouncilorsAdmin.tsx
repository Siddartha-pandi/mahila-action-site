import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { Councilor, newCouncilor, saveCouncilor, deleteCouncilor } from "../../lib/data";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { upsertEntityByIds, useSerializedEntityEditor } from "../hooks/useSerializedEntityEditor";

export function CouncilorsAdmin({
  councilors,
  onChange,
}: {
  councilors: Councilor[];
  onChange: (next: Councilor[] | ((prev: Councilor[]) => Councilor[])) => void;
}) {
  const {
    active,
    activeId,
    setActiveId,
    activeEditorKey,
    saving,
    setSaving,
    itemsRef,
    activeIdRef,
    clientKeyMapRef,
    resolveId,
    recordIdMigration,
    applyLocalUpdate,
    applyUpdater,
    enqueueTask,
  } = useSerializedEntityEditor<Councilor>(councilors, onChange);

  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "councilors", "edit");
  const canDelete = hasPermission(session, "councilors", "delete");

  function persistCouncilor(targetId: string, mode: "auto" | "explicit") {
    return enqueueTask(targetId, async ({ canonicalId, stableKey }) => {
      const matchIds = [targetId, canonicalId];
      const latest = itemsRef.current.find((c) => matchIds.includes(String(c.id)));
      if (!latest) return;

      if (!latest.name?.trim()) {
        if (mode === "explicit") toast.error("Councilor name cannot be empty.");
        return;
      }

      const payload: Councilor = { ...latest, id: canonicalId };
      if (mode === "explicit") setSaving(true);
      try {
        const res = await saveCouncilor(payload);
        if (res.ok) {
          const savedId = String(res.id || payload.id);
          recordIdMigration([targetId, canonicalId], savedId, stableKey);
          const mergeIds = [targetId, canonicalId, savedId];
          applyUpdater((prev) =>
            upsertEntityByIds(prev, mergeIds, (cur) => {
              const current = cur || payload;
              return {
                ...current,
                id: savedId,
                image:
                  current.image === payload.image
                    ? (res.councilor?.image ?? current.image)
                    : current.image,
              };
            })
          );
          if (mergeIds.includes(String(activeIdRef.current ?? ""))) {
            setActiveId(savedId);
          }
          if (mode === "explicit") toast.success("Councilor profile saved!");
        } else {
          toast.error(res.error || "Failed to save councilor profile.");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to save councilor profile.");
      } finally {
        if (mode === "explicit") setSaving(false);
      }
    });
  }

  async function update(patch: Partial<Councilor>, autoPersist = false) {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required for councilors.");
    if (!active) return;
    const rawId = String(active.id);
    const canonicalId = resolveId(rawId);
    applyLocalUpdate([rawId, canonicalId], patch);
    if (autoPersist && (patch.name !== undefined ? patch.name : active.name)?.trim()) {
      await persistCouncilor(canonicalId || rawId, "auto");
    }
  }

  function handleAdd() {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required to add a councilor.");
    const c = newCouncilor(itemsRef.current.length);
    clientKeyMapRef.current.set(c.id, c.id);
    applyUpdater((prev) => [...prev, c]);
    setActiveId(c.id);
  }

  async function handleDelete(id: string) {
    if (!canDelete) return toast.error("Permission denied: DELETE rights required for councilors.");
    const canonicalId = resolveId(id);
    const removeIds = new Set([String(id), canonicalId]);
    await deleteCouncilor(canonicalId);
    applyUpdater((prev) => prev.filter((c) => !removeIds.has(String(c.id))));
    if (removeIds.has(String(activeIdRef.current ?? ""))) {
      const remaining = itemsRef.current.filter((c) => !removeIds.has(String(c.id)));
      setActiveId(remaining[0]?.id ? String(remaining[0].id) : null);
    }
    toast.success("Councilor profile deleted successfully.");
  }

  async function handleSave() {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required for councilors.");
    if (!active) return;
    const rawId = String(active.id);
    await persistCouncilor(resolveId(rawId) || rawId, "explicit");
  }

  return (
    <AdminListEditor
      items={councilors}
      activeId={active?.id ? String(active.id) : activeId}
      onSelect={setActiveId}
      onAdd={canEdit ? handleAdd : undefined}
      onDelete={canDelete ? handleDelete : undefined}
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
          <ImageField
            key={`councilor-img-${activeEditorKey}`}
            label="Profile Photo"
            value={active.image}
            onChange={(v) => update({ image: v }, true)}
            title={active.name}
          />
          <div>
            <label className={labelBase}>Bio / Story</label>
            <textarea value={active.bio} onChange={(e) => update({ bio: e.target.value })} rows={4} className={`${inputBase} resize-y`} />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || saving}
            className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
