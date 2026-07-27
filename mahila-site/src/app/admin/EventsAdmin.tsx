import { useState } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { EventItem, RegKind, Category, isEventOpen, newEvent, saveEvent, deleteEvent } from "../../lib/data";

const KIND_LABEL: Record<RegKind, string> = { volunteer: "Volunteer", vendor: "Vendor", donor: "Donor" };

export function EventsAdmin({ events, categories, onChange }: { events: EventItem[]; categories: Category[]; onChange: (next: EventItem[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null);
  const active = events.find((e) => e.id === activeId) ?? null;

  function update(patch: Partial<EventItem>) {
    if (!active) return;
    onChange(events.map((e) => (e.id === active.id ? { ...e, ...patch } : e)));
  }

  function updateWindow(kind: RegKind, patch: Partial<EventItem["windows"][number]>) {
    if (!active) return;
    update({ windows: active.windows.map((w) => (w.kind === kind ? { ...w, ...patch } : w)) });
  }

  async function handleAdd() {
    const ev = newEvent();
    const ok = await saveEvent(ev);
    if (!ok) { toast.error("Failed to create event — check the console for details."); return; }
    onChange([...events, ev]);
    setActiveId(ev.id);
  }

  async function handleDelete(id: string) {
    const ok = await deleteEvent(id);
    if (!ok) { toast.error("Failed to delete event — check the console for details."); return; }
    const next = events.filter((e) => e.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  async function handleSave() {
    if (!active) return;
    const ok = await saveEvent(active);
    if (ok) toast.success("Event saved and published!");
    else toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
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
        <div className="flex flex-col gap-5 max-w-[640px]">
          <div>
            <label className={labelBase}>Event Title</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Description</label>
            <textarea value={active.description} onChange={(e) => update({ description: e.target.value })} rows={3} className={`${inputBase} resize-y`} />
          </div>
          <ImageField label="Event Image" value={active.image} onChange={(v) => update({ image: v })} />
          <div>
            <label className={labelBase}>Category (shown as the badge on the event image)</label>
            <select value={active.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })} className={`${inputBase} cursor-pointer`}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>Event Date</label>
              <input type="date" value={active.eventDate} onChange={(e) => update({ eventDate: e.target.value })} className={inputBase} />
            </div>
            <div>
              <label className={labelBase}>Location</label>
              <input value={active.location} onChange={(e) => update({ location: e.target.value })} className={inputBase} />
            </div>
          </div>
          <div>
            <label className={labelBase}>Total Seats</label>
            <input type="number" min={0} value={active.totalSeats} onChange={(e) => update({ totalSeats: Number(e.target.value) })} className={inputBase} />
          </div>

          <div className="border-t border-[#a65a4a]/15 pt-5">
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

          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Event
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
