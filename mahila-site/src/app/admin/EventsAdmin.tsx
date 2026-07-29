"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { EventItem, RegKind, Category, isEventOpen, newEvent, saveEvent, deleteEvent } from "../../lib/data";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { getStoredContentTypes, isSystemDefaultField, FieldDefinition } from "../../lib/contentTypeRegistry";
import { moveToRecycleBin } from "../../lib/recycleBin";

const KIND_LABEL: Record<RegKind, string> = { volunteer: "Volunteer", vendor: "Vendor", donor: "Donor" };

export function EventsAdmin({ events, categories, onChange }: { events: EventItem[]; categories: Category[]; onChange: (next: EventItem[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null);
  const active = events.find((e) => e.id === activeId) ?? null;

  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "events", "edit");
  const canDelete = hasPermission(session, "events", "delete");

  // Load Content-Type Builder schema for Events
  const eventModel = useMemo(() => {
    const models = getStoredContentTypes();
    return models.find((m) => m.uid === "api::event.event") || models[1];
  }, []);

  const userEditableFields = useMemo(() => {
    return (eventModel?.fields || []).filter((f) => !isSystemDefaultField(f.name));
  }, [eventModel]);

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

  function update(patch: Partial<EventItem>) {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required for Events.");
    if (!active) return;
    onChange(events.map((e) => (e.id === active.id ? { ...e, ...patch } : e)));
  }

  function updateWindow(kind: RegKind, patch: Partial<EventItem["windows"][number]>) {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required for Events.");
    if (!active) return;
    update({ windows: active.windows.map((w) => (w.kind === kind ? { ...w, ...patch } : w)) });
  }

  function handleAdd() {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required to create Events.");
    const ev = newEvent();
    onChange([...events, ev]);
    setActiveId(ev.id);
  }

  async function handleDelete(id: string) {
    if (!canDelete) return toast.error("Permission denied: DELETE rights required for Events.");
    const target = events.find((e) => e.id === id);
    if (target) {
      moveToRecycleBin("event", target.title, target);
    }
    await deleteEvent(id);
    const next = events.filter((e) => e.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success(`'${target?.title || "Event"}' moved to Recycle Bin.`);
  }

  async function handleSave() {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required to save Events.");
    if (!active) return;
    const ok = await saveEvent(active);
    if (ok) toast.success("Event saved and published!");
    else toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
  }

  function renderFieldControl(f: FieldDefinition) {
    if (!active) return null;
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (key === "title") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Event Title"}</label>
          <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "description") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Description"}</label>
          <textarea value={active.description} onChange={(e) => update({ description: e.target.value })} rows={3} className={`${inputBase} resize-y`} />
        </div>
      );
    }

    if (key === "image" || key === "coverimage") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <ImageField label={f.description || "Event Image"} value={active.image} onChange={(v) => update({ image: v })} />
        </div>
      );
    }

    if (key === "categoryid" || key === "category_id" || key === "category") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Category (shown as badge on event image)</label>
          <select value={active.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })} className={`${inputBase} cursor-pointer`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      );
    }

    if (key === "eventdate" || key === "event_date") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Event Date</label>
          <input type="date" value={active.eventDate} onChange={(e) => update({ eventDate: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "location") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Location</label>
          <input value={active.location} onChange={(e) => update({ location: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if (key === "totalseats" || key === "total_seats") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Total Seats</label>
          <input type="number" min={0} value={active.totalSeats} onChange={(e) => update({ totalSeats: Number(e.target.value) })} className={inputBase} />
        </div>
      );
    }

    if (key === "windows") {
      return (
        <div key={f.name} className="w-full border-t border-[#a65a4a]/15 pt-5">
          <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e] mb-3">
            Registration windows — each option can open/close independently
          </p>
          <div className="flex flex-col gap-4">
            {active.windows.map((w) => (
              <div key={w.kind} className="border border-[#a65a4a]/20 rounded-xl p-4">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={w.enabled} onChange={(e) => updateWindow(w.kind, { enabled: e.target.checked })} />
                  <span className="font-['Inter',sans-serif] text-[14px] font-semibold text-[#1e1e1e]">
                    Allow registering as {KIND_LABEL[w.kind]}
                  </span>
                </label>
                {w.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelBase}>Registration Opens</label>
                      <input type="date" value={w.regStart} onChange={(e) => updateWindow(w.kind, { regStart: e.target.value })} className={inputBase} />
                    </div>
                    <div>
                      <label className={labelBase}>Registration Closes</label>
                      <input type="date" value={w.regEnd} onChange={(e) => updateWindow(w.kind, { regEnd: e.target.value })} className={inputBase} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 mt-3 leading-relaxed">
            Once every enabled window's closing date has passed, the event automatically shows as <strong>Closed</strong> on
            the site, and "Reserve a Seat" instead shows visitors the next upcoming events and when their registration opens.
          </p>
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
      items={events}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={handleAdd}
      onDelete={handleDelete}
      itemLabel={(e) => e.title}
      itemSubLabel={(e) => (isEventOpen(e) ? "Open for registration" : "Closed")}
      addLabel="Add New Event"
      emptyLabel="No events yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add an event to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[720px]">
          {/* Dynamically render row groups configured in Content-Type Builder */}
          {rowGroups.map((group) => (
            <div key={group.rowId} className="flex flex-col sm:flex-row gap-4 w-full items-start">
              {group.fields.map((f) => renderFieldControl(f))}
            </div>
          ))}

          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Event
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
