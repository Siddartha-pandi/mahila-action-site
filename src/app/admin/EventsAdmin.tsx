import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { EventItem, RegKind, Category, isEventOpen, newEvent, saveEvent, deleteEvent } from "../../lib/data";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { getSubmissions, loadSubmissions, SubmissionItem } from "../../lib/backend";
import { categoryOf } from "./SubmissionsAdmin";
import {
  Users,
  Calendar,
  Briefcase,
  UserCheck,
  Download,
  Search,
  BarChart2,
  Edit3,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowLeft,
} from "lucide-react";

const KIND_LABEL: Record<RegKind, string> = { volunteer: "Volunteer", vendor: "Vendor", donor: "Donor" };

function getEventStats(ev: EventItem, submissions: SubmissionItem[]) {
  const normTitle = ev.title.trim().toLowerCase();

  let attendeeSeats = 0;
  let attendeeCount = 0;
  let volunteerCount = 0;
  let vendorCount = 0;
  const registeredPeople: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "Attendee" | "Volunteer" | "Vendor";
    seats: number;
    date: string;
    status: string;
  }[] = [];

  for (const item of submissions) {
    if (!item || !item.data) continue;
    const d = item.data;
    const evName = String(d.event_name || d.eventTitle || "").trim().toLowerCase();
    const selEvents: string[] = Array.isArray(d.selected_events)
      ? d.selected_events.map((s: any) => String(s).trim().toLowerCase())
      : [];

    const matches = evName === normTitle || selEvents.includes(normTitle);
    if (!matches) continue;

    const cat = categoryOf(item);
    const seats = Number(d.seats) || 1;
    const name = d.name || d.contact_name || "Anonymous";
    const email = d.email || "No email";
    const phone = d.phone || "";

    if (cat === "reservation" || item.type === "reservation") {
      if (d.volunteer_commitment === "vendor" || cat === "vendor") {
        vendorCount += 1;
        registeredPeople.push({
          id: item.id,
          name,
          email,
          phone,
          role: "Vendor",
          seats: 1,
          date: item.createdAt,
          status: item.status,
        });
      } else if ((d.volunteer_commitment && d.volunteer_commitment !== "") || cat === "volunteer") {
        volunteerCount += 1;
        registeredPeople.push({
          id: item.id,
          name,
          email,
          phone,
          role: "Volunteer",
          seats: 1,
          date: item.createdAt,
          status: item.status,
        });
      } else {
        attendeeCount += 1;
        attendeeSeats += seats;
        registeredPeople.push({
          id: item.id,
          name,
          email,
          phone,
          role: "Attendee",
          seats,
          date: item.createdAt,
          status: item.status,
        });
      }
    } else if (cat === "volunteer" || item.type === "volunteer") {
      volunteerCount += 1;
      registeredPeople.push({
        id: item.id,
        name,
        email,
        phone,
        role: "Volunteer",
        seats: 1,
        date: item.createdAt,
        status: item.status,
      });
    } else if (cat === "vendor" || item.type === "vendor") {
      vendorCount += 1;
      registeredPeople.push({
        id: item.id,
        name,
        email,
        phone,
        role: "Vendor",
        seats: 1,
        date: item.createdAt,
        status: item.status,
      });
    }
  }

  const totalMembers = attendeeCount + volunteerCount + vendorCount;
  const capacity = Number(ev.totalSeats) || 0;
  const percentUsed = capacity > 0 ? Math.min(100, Math.round((attendeeSeats / capacity) * 100)) : 0;
  const isFull = capacity > 0 && attendeeSeats >= capacity;

  return {
    attendeeSeats,
    attendeeCount,
    volunteerCount,
    vendorCount,
    totalMembers,
    registeredPeople,
    capacity,
    percentUsed,
    isFull,
  };
}

export function EventsAdmin({
  events,
  categories,
  onChange,
}: {
  events: EventItem[];
  categories: Category[];
  onChange: (next: EventItem[]) => void;
}) {
  const [viewMode, setViewMode] = useState<"overview" | "event_detail" | "editor">("overview");
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterOccupancy, setFilterOccupancy] = useState<string>("all");

  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [memberSearch, setMemberSearch] = useState("");

  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => getSubmissions());

  const active = events.find((e) => e.id === activeId) ?? null;

  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "events", "edit");
  const canDelete = hasPermission(session, "events", "delete");

  useEffect(() => {
    let mounted = true;
    loadSubmissions()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setSubmissions(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
    setViewMode("editor");
  }

  async function handleDelete(id: string) {
    if (!canDelete) return toast.error("Permission denied: DELETE rights required for Events.");
    await deleteEvent(id);
    const next = events.filter((e) => String(e.id) !== String(id));
    onChange(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    toast.success("Event deleted successfully.");
  }

  async function handleSave() {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required to save Events.");
    if (!active) return;
    const ok = await saveEvent(active);
    if (ok) toast.success("Event saved and published!");
    else toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
  }

  function exportEventCSV(ev: EventItem) {
    const stats = getEventStats(ev, submissions);
    if (!stats.registeredPeople.length) {
      toast.error(`No registered members found for "${ev.title}"`);
      return;
    }

    const headers = ["Event Title", "Name", "Email", "Phone", "Role", "Seats Reserved", "Registration Date", "Status"];
    const rows = stats.registeredPeople.map((p) => [
      `"${ev.title.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.email.replace(/"/g, '""')}"`,
      `"${p.phone.replace(/"/g, '""')}"`,
      p.role,
      p.seats,
      new Date(p.date).toLocaleString(),
      p.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `event_registrations_${ev.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported registrations for ${ev.title}`);
  }

  // Summary Metrics Across All Events
  const allStats = events.map((e) => getEventStats(e, submissions));
  const totalBookedSeats = allStats.reduce((acc, s) => acc + s.attendeeSeats, 0);
  const totalCapacitySeats = allStats.reduce((acc, s) => acc + s.capacity, 0);
  const totalVolunteersCount = allStats.reduce((acc, s) => acc + s.volunteerCount, 0);
  const totalVendorsCount = allStats.reduce((acc, s) => acc + s.vendorCount, 0);
  const totalRegistrationsCount = allStats.reduce((acc, s) => acc + s.totalMembers, 0);

  const filteredEvents = events.filter((e) => {
    const stats = getEventStats(e, submissions);
    const isOpen = isEventOpen(e);

    if (filterCategory !== "all" && e.categoryId !== filterCategory) return false;

    if (filterStatus !== "all") {
      if (filterStatus === "open" && (!isOpen || stats.isFull)) return false;
      if (filterStatus === "closed" && (isOpen || stats.isFull)) return false;
      if (filterStatus === "sold_out" && !stats.isFull) return false;
    }

    if (filterOccupancy !== "all") {
      if (filterOccupancy === "has_registrations" && stats.totalMembers === 0) return false;
      if (filterOccupancy === "empty" && stats.totalMembers > 0) return false;
      if (filterOccupancy === "nearly_full" && stats.percentUsed < 75) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1150px] font-['Inter',sans-serif]">
      {/* Top Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        {viewMode === "event_detail" ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("overview")}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-[#a65a4a] text-gray-700 hover:text-white font-semibold text-[13px] px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to All Events
            </button>
            {active && (
              <span className="text-[14px] font-semibold text-[#1e1e1e] border-l border-gray-300 pl-3">
                🗓️ {active.title}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                viewMode === "overview"
                  ? "bg-[#a65a4a] text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <BarChart2 size={16} /> Registered Members Table
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                viewMode === "editor"
                  ? "bg-[#a65a4a] text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Edit3 size={16} /> Manage & Edit Events
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {viewMode === "event_detail" && active && (
            <button
              onClick={() => setViewMode("editor")}
              className="inline-flex items-center gap-1.5 border border-[#a65a4a]/30 text-[#a65a4a] hover:bg-[#a65a4a]/10 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 size={15} /> Edit Event Content
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 bg-[#a65a4a] text-white font-medium text-[13px] px-4 py-2 rounded-xl hover:bg-[#993925] transition-colors cursor-pointer shrink-0"
            >
              <Plus size={16} /> Add New Event
            </button>
          )}
        </div>
      </div>

      {viewMode === "event_detail" && active ? (
        /* Dedicated Single Event Registrations View with Back Button */
        (() => {
          const expStats = getEventStats(active, submissions);
          const isOpen = isEventOpen(active);
          const catName = categories.find((c) => c.id === active.categoryId)?.name;

          const filteredMembers = expStats.registeredPeople.filter((p) => {
            if (memberRoleFilter !== "all" && p.role.toLowerCase() !== memberRoleFilter.toLowerCase()) return false;
            if (memberStatusFilter !== "all" && p.status !== memberStatusFilter) return false;
            if (memberSearch.trim()) {
              const q = memberSearch.toLowerCase();
              return (
                p.name.toLowerCase().includes(q) ||
                p.email.toLowerCase().includes(q) ||
                p.phone.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div className="flex flex-col gap-6">
              {/* Event Details Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  {active.image ? (
                    <img src={active.image} alt="" className="size-16 rounded-xl object-cover border border-[#a65a4a]/20 shrink-0" />
                  ) : (
                    <div className="size-16 rounded-xl bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center font-bold shrink-0">
                      <Calendar size={24} />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">{active.title}</h3>
                      {expStats.isFull ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle size={12} /> Sold Out
                        </span>
                      ) : isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle size={12} /> Open for Registration
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          <Clock size={12} /> Closed
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#1e1e1e]/60 mt-1">
                      📅 {active.eventDate || "Date TBD"} {active.location && `• 📍 ${active.location}`} {catName && `• 🏷️ ${catName}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 md:border-l border-[#a65a4a]/15 pt-3 md:pt-0 md:pl-5 shrink-0">
                  <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Attendee Seats</span>
                    <span className="text-[18px] font-bold text-amber-900">{expStats.attendeeSeats}</span>
                    <span className="text-[10px] text-amber-700 block">({expStats.attendeeCount} bookings)</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Volunteers</span>
                    <span className="text-[18px] font-bold text-emerald-900">{expStats.volunteerCount}</span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Vendors</span>
                    <span className="text-[18px] font-bold text-purple-900">{expStats.vendorCount}</span>
                  </div>
                  <div className="bg-[#a65a4a]/10 border border-[#a65a4a]/30 px-4 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a65a4a] block">Total Registered</span>
                    <span className="text-[18px] font-bold text-[#a65a4a]">{expStats.totalMembers}</span>
                  </div>
                </div>
              </div>

              {/* Members Search, Filters & Export Header */}
              <div className="bg-white p-4 rounded-xl border border-[#a65a4a]/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-2.5 size-4 text-[#1e1e1e]/40" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members by name, email, or phone…"
                      className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#a65a4a]/25 rounded-lg focus:outline-none focus:border-[#a65a4a]"
                    />
                  </div>

                  <select
                    value={memberRoleFilter}
                    onChange={(e) => setMemberRoleFilter(e.target.value)}
                    className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
                  >
                    <option value="all">All Roles ({expStats.totalMembers})</option>
                    <option value="attendee">🎟️ Attendees ({expStats.attendeeCount})</option>
                    <option value="volunteer">🙋‍♀️ Volunteers ({expStats.volunteerCount})</option>
                    <option value="vendor">🛍️ Vendors ({expStats.vendorCount})</option>
                  </select>

                  <select
                    value={memberStatusFilter}
                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => exportEventCSV(active)}
                    className="inline-flex items-center gap-1.5 bg-[#a65a4a] text-white text-[12px] font-semibold px-4 py-2 rounded-xl hover:bg-[#993925] transition-colors cursor-pointer"
                  >
                    <Download size={15} /> Export Event Registrations CSV
                  </button>
                </div>
              </div>

              {/* Members Registration Table */}
              <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
                {!filteredMembers.length ? (
                  <div className="p-12 text-center">
                    <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/50">
                      No registered members found matching your search or filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
                      <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
                        <tr>
                          <th className="py-3.5 px-4">Member Name</th>
                          <th className="py-3.5 px-4">Contact Details</th>
                          <th className="py-3.5 px-4">Role</th>
                          <th className="py-3.5 px-4 text-center">Seats Reserved</th>
                          <th className="py-3.5 px-4">Registration Date</th>
                          <th className="py-3.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#a65a4a]/10">
                        {filteredMembers.map((p) => (
                          <tr key={p.id} className="hover:bg-[#a65a4a]/5 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-[#1e1e1e]">{p.name}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-medium text-[#1e1e1e]">{p.email}</p>
                              {p.phone && <p className="text-[12px] text-[#1e1e1e]/50">{p.phone}</p>}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                                  p.role === "Attendee"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : p.role === "Volunteer"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {p.role === "Attendee" && "🎟️"}
                                {p.role === "Volunteer" && "🙋‍♀️"}
                                {p.role === "Vendor" && "🛍️"}
                                {p.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-900">{p.seats}</td>
                            <td className="py-3.5 px-4 text-[#1e1e1e]/60 whitespace-nowrap">
                              {new Date(p.date).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                                  p.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : p.status === "Contacted"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : viewMode === "overview" ? (
        <div className="flex flex-col gap-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Seat Capacity</span>
                <Calendar size={18} />
              </div>
              <p className="text-[22px] font-bold text-gray-900">{totalCapacitySeats} seats</p>
              <p className="text-[12px] text-gray-500">{totalBookedSeats} seats booked ({totalCapacitySeats > 0 ? Math.round((totalBookedSeats / totalCapacitySeats) * 100) : 0}%)</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Registered Volunteers</span>
                <Users size={18} />
              </div>
              <p className="text-[22px] font-bold text-gray-900">{totalVolunteersCount}</p>
              <p className="text-[12px] text-gray-500">Helping across events</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Vendors & Stalls</span>
                <Briefcase size={18} />
              </div>
              <p className="text-[22px] font-bold text-gray-900">{totalVendorsCount}</p>
              <p className="text-[12px] text-gray-500">Stall applications</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-[#a65a4a] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Members Registered</span>
                <UserCheck size={18} />
              </div>
              <p className="text-[22px] font-bold text-[#a65a4a]">{totalRegistrationsCount}</p>
              <p className="text-[12px] text-gray-500">Across {events.length} active events</p>
            </div>
          </div>

          {/* Search & Filter Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#a65a4a]/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-2.5 size-4 text-[#1e1e1e]/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events…"
                  className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#a65a4a]/25 rounded-lg focus:outline-none focus:border-[#a65a4a]"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="open">🟢 Open for Registration</option>
                <option value="closed">⚪ Closed</option>
                <option value="sold_out">🔴 Sold Out</option>
              </select>

              {/* Occupancy Filter */}
              <select
                value={filterOccupancy}
                onChange={(e) => setFilterOccupancy(e.target.value)}
                className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
              >
                <option value="all">All Occupancies</option>
                <option value="has_registrations">👥 Has Registrations (&gt;0)</option>
                <option value="empty">📭 Empty (0 Registrations)</option>
                <option value="nearly_full">🔥 Nearly Full (&ge;75%)</option>
              </select>
            </div>

            <p className="text-[12px] text-gray-500 font-medium shrink-0">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          </div>

          {/* Events Members Registration Table */}
          <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
                <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
                  <tr>
                    <th className="py-3.5 px-4">Event Details</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Capacity</th>
                    <th className="py-3.5 px-4 text-center">Attendees (Seats)</th>
                    <th className="py-3.5 px-4 text-center">Volunteers</th>
                    <th className="py-3.5 px-4 text-center">Vendors</th>
                    <th className="py-3.5 px-4 text-center">Total Members</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Occupancy</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a65a4a]/10">
                  {filteredEvents.map((ev) => {
                    const stats = getEventStats(ev, submissions);
                    const isOpen = isEventOpen(ev);
                    const catName = categories.find((c) => c.id === ev.categoryId)?.name;

                    return (
                      <tr
                        key={ev.id}
                        onClick={() => {
                          setActiveId(ev.id);
                          setViewMode("event_detail");
                        }}
                        className="hover:bg-[#a65a4a]/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {ev.image ? (
                              <img src={ev.image} alt="" className="size-10 rounded-lg object-cover border border-[#a65a4a]/20 shrink-0" />
                            ) : (
                              <div className="size-10 rounded-lg bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center font-bold shrink-0">
                                <Calendar size={18} />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-[#1e1e1e] group-hover:text-[#a65a4a] transition-colors">{ev.title}</p>
                              <div className="flex items-center gap-2 text-[11px] text-[#1e1e1e]/50 mt-0.5">
                                <span>{ev.eventDate || "Date TBD"}</span>
                                {ev.location && <span>• {ev.location}</span>}
                                {catName && <span className="px-1.5 py-0.2 rounded bg-[#a65a4a]/10 text-[#a65a4a] font-medium">{catName}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {stats.isFull ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertCircle size={12} /> Sold Out
                            </span>
                          ) : isOpen ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle size={12} /> Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                              <Clock size={12} /> Closed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-900">
                          {stats.capacity > 0 ? stats.capacity : "Unlimited"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-amber-700">{stats.attendeeSeats}</span>
                          <span className="text-[11px] text-gray-400 block">({stats.attendeeCount} bookings)</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-emerald-700">{stats.volunteerCount}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-purple-700">{stats.vendorCount}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-[#a65a4a] text-[14px]">
                          {stats.totalMembers}
                        </td>
                        <td className="py-3.5 px-4">
                          {stats.capacity > 0 ? (
                            <div>
                              <div className="flex justify-between text-[11px] font-medium mb-1">
                                <span>{stats.percentUsed}%</span>
                                <span>{stats.attendeeSeats}/{stats.capacity}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    stats.percentUsed >= 100
                                      ? "bg-rose-600"
                                      : stats.percentUsed >= 75
                                      ? "bg-amber-500"
                                      : "bg-emerald-600"
                                  }`}
                                  style={{ width: `${stats.percentUsed}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400">Open capacity</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActiveId(ev.id);
                                setViewMode("editor");
                              }}
                              className="p-1.5 text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors"
                              title="Edit Event Content"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setActiveId(ev.id);
                                setViewMode("event_detail");
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[12px] font-semibold border border-[#a65a4a]/30 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white transition-all shadow-2xs cursor-pointer"
                            >
                              View Members ({stats.totalMembers}) →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Event Editor Mode */
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
              {/* Event Member Quick Stats Box */}
              {(() => {
                const activeStats = getEventStats(active, submissions);
                return (
                  <div className="bg-[#faf7f3] border border-[#a65a4a]/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[13px] text-[#1e1e1e]">Member Registration Summary</p>
                      <p className="text-[12px] text-[#1e1e1e]/60">
                        {activeStats.attendeeSeats} seats booked ({activeStats.attendeeCount} bookings) • {activeStats.volunteerCount} volunteers • {activeStats.vendorCount} vendors
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("event_detail");
                      }}
                      className="text-[#a65a4a] text-[12px] font-semibold hover:underline cursor-pointer"
                    >
                      View All {activeStats.totalMembers} Members →
                    </button>
                  </div>
                );
              })()}

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
      )}
    </div>
  );
}
