import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminListEditor, ImageField, inputBase, labelBase } from "../adminWidgets";
import { EventItem, RegKind, Category, isEventOpen, newEvent, saveEvent, deleteEvent } from "../../lib/data";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { getSubmissions, loadSubmissions, SubmissionItem } from "../../lib/backend";
import { categoryOf } from "./SubmissionsAdmin";
import { Pagination } from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
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
  Globe,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
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

function EventDetailRegistrationsView({
  active,
  submissions,
  categories,
  exportEventCSV,
}: {
  active: EventItem;
  submissions: SubmissionItem[];
  categories: Category[];
  exportEventCSV: (ev: EventItem) => void;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");

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

  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredMembers, { initialPageSize: 10 });

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
                {paginatedItems.map((p) => (
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
            <div className="p-4 border-t border-[#a65a4a]/10 bg-[#faf7f3]/50">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EventsPaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#a65a4a]/15 shadow-sm">
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export function EventsOverviewTable({
  events,
  categories,
  submissions,
  canDelete,
  onSelectEvent,
  onEditEvent,
  onTogglePublish,
  onDeleteEvent,
}: {
  events: EventItem[];
  categories: Category[];
  submissions: SubmissionItem[];
  canDelete: boolean;
  onSelectEvent: (id: string) => void;
  onEditEvent: (id: string) => void;
  onTogglePublish: (ev: EventItem, publish: boolean) => void;
  onDeleteEvent: (id: string) => void;
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-row-menu]")) {
        setMenuOpenId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpenId]);

  return (
    <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
      <div className="overflow-x-auto min-h-[380px] pb-36">
        <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
          <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
            <tr>
              <th className="py-3 px-3">Event Details</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-2 text-center">Capacity</th>
              <th className="py-3 px-2 text-center">Attendees</th>
              <th className="py-3 px-2 text-center">Volunteers</th>
              <th className="py-3 px-2 text-center">Vendors</th>
              <th className="py-3 px-2 text-center">Total</th>
              <th className="py-3 px-3 min-w-[110px]">Occupancy</th>
              <th className="py-3 px-3 text-right min-w-[210px] whitespace-nowrap sticky right-0 bg-[#faf7f3] z-20 shadow-[-6px_0_12px_-3px_rgba(0,0,0,0.08)] border-l border-[#a65a4a]/15">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#a65a4a]/10">
            {events.map((ev, index) => {
              const stats = getEventStats(ev, submissions);
              const isOpen = isEventOpen(ev);
              const catName = categories.find((c) => String(c.id) === String(ev.categoryId) || c.name === ev.categoryId)?.name;

              return (
                <tr
                  key={ev.id}
                  onClick={() => onSelectEvent(ev.id)}
                  className={`hover:bg-[#a65a4a]/5 transition-colors cursor-pointer group relative ${
                    menuOpenId === ev.id ? "z-40" : "z-auto"
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      {ev.image ? (
                        <img src={ev.image} alt="" className="size-9 rounded-lg object-cover border border-[#a65a4a]/20 shrink-0" />
                      ) : (
                        <div className="size-9 rounded-lg bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center font-bold shrink-0">
                          <Calendar size={17} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-[#1e1e1e] group-hover:text-[#a65a4a] transition-colors">{ev.title}</p>
                          {ev.published === false && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              <EyeOff size={10} /> Draft
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#1e1e1e]/50 mt-0.5">
                          <span>{ev.eventDate || "Date TBD"}</span>
                          {ev.location && <span>• {ev.location}</span>}
                          {catName && <span className="px-1.5 py-0.2 rounded bg-[#a65a4a]/10 text-[#a65a4a] font-medium">{catName}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {stats.isFull ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
                        <AlertCircle size={12} /> Sold Out
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        <CheckCircle size={12} /> Open
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                        <Clock size={12} /> Closed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-semibold text-gray-900">
                    {stats.capacity > 0 ? stats.capacity : "Unlimited"}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-amber-700">{stats.attendeeSeats}</span>
                    <span className="text-[10px] text-gray-400 block">({stats.attendeeCount} bkg)</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {(() => {
                      const cap = Number(ev.maxVolunteers ?? 0);
                      const count = stats.volunteerCount;
                      const isCapped = cap > 0;
                      const isFull = isCapped && count >= cap;
                      return (
                        <div>
                          <span className={`font-bold ${isFull ? "text-rose-700" : "text-emerald-700"}`}>
                            {count}{isCapped ? `/${cap}` : ""}
                          </span>
                          {isFull && (
                            <span className="text-[9px] font-semibold bg-rose-100 text-rose-700 px-1 py-0.2 rounded-full block mt-0.5">Full</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-bold text-purple-700">{stats.vendorCount}</span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-[#a65a4a] text-[13px]">
                    {stats.totalMembers}
                  </td>
                  <td className="py-3 px-3">
                    {stats.capacity > 0 ? (
                      <div>
                        <div className="flex justify-between text-[10px] font-medium mb-1">
                          <span>{stats.percentUsed}%</span>
                          <span>{stats.attendeeSeats}/{stats.capacity}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
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
                      <span className="text-[11px] text-gray-400">Open</span>
                    )}
                  </td>
                  <td
                    className={`py-3 px-3 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-[#fbf7f4] shadow-[-6px_0_12px_-3px_rgba(0,0,0,0.08)] border-l border-[#a65a4a]/15 ${
                      menuOpenId === ev.id ? "z-40" : "z-10"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(ev.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-[#a65a4a]/30 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        View Members ({stats.totalMembers}) →
                      </button>

                      {/* 3-dots Overflow Menu Button */}
                      <div className="relative inline-block text-left shrink-0" data-row-menu>
                        <button
                          type="button"
                          onClick={() => setMenuOpenId(menuOpenId === ev.id ? null : ev.id)}
                          className={`size-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            menuOpenId === ev.id
                              ? "bg-[#a65a4a] text-white border-[#a65a4a] shadow-xs"
                              : "bg-white text-gray-700 border-gray-300 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 hover:border-[#a65a4a]/40 shadow-2xs"
                          }`}
                          title="More options (Edit, Publish/Unpublish, Delete)"
                          aria-label="More options"
                        >
                          <MoreVertical size={17} />
                        </button>

                        {/* 3-dots Dropdown Menu */}
                        {menuOpenId === ev.id && (
                          <div
                            className={`absolute right-0 w-56 rounded-xl bg-white border border-gray-200 shadow-xl py-1.5 z-50 text-left ${
                              index >= Math.max(0, events.length - 2) && events.length > 2
                                ? "bottom-full mb-1.5"
                                : "top-full mt-1.5"
                            }`}
                            style={{ minWidth: "220px" }}
                          >
                            <div className="px-3.5 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Options
                            </div>

                            {/* Edit Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onEditEvent(ev.id);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] transition-colors cursor-pointer"
                            >
                              <Edit3 size={15} className="text-[#a65a4a]" />
                              <span>Edit Event</span>
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            {/* Publish Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onTogglePublish(ev, true);
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                                ev.published !== false
                                  ? "bg-emerald-50 text-emerald-800 font-semibold"
                                  : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Globe size={15} className="text-emerald-600" />
                                <span>Publish Event</span>
                              </div>
                              {ev.published !== false && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Published
                                </span>
                              )}
                            </button>

                            {/* Unpublish Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onTogglePublish(ev, false);
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                                ev.published === false
                                  ? "bg-amber-50 text-amber-800 font-semibold"
                                  : "text-gray-700 hover:bg-amber-50 hover:text-amber-800"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <EyeOff size={15} className="text-amber-600" />
                                <span>Unpublish (Draft)</span>
                              </div>
                              {ev.published === false && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  Draft
                                </span>
                              )}
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            {/* View Members Option */}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onSelectEvent(ev.id);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                            >
                              <Users size={15} className="text-indigo-600" />
                              <span>View Members ({stats.totalMembers})</span>
                            </button>

                            {/* Delete Option */}
                            {canDelete && (
                              <>
                                <div className="my-1 border-t border-gray-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenId(null);
                                    onDeleteEvent(ev.id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={15} />
                                  <span>Move to Recycle Bin</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

  /**
   * Returns today's date as YYYY-MM-DD in the user's LOCAL timezone.
   * Using toISOString() would give the UTC date which can be one day behind
   * for timezones ahead of UTC (e.g. IST = UTC+5:30).
   */
  function localTodayStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

    const todayStr = localTodayStr(); // e.g. "2026-08-05" in local timezone

    // Validate: event date must not be in the past (compare YYYY-MM-DD strings directly
    // to avoid UTC conversion errors for timezones ahead of UTC like IST).
    if (active.eventDate && active.eventDate < todayStr) {
      return toast.error("Event date cannot be in the past. Please choose today or a future date.");
    }

    // Validate: registration window end dates must not be in the past
    for (const w of active.windows) {
      if (w.enabled && w.regEnd && w.regEnd < todayStr) {
        return toast.error(`Registration closing date for "${KIND_LABEL[w.kind]}" registrations cannot be in the past.`);
      }
    }

    const result = await saveEvent(active);
    if (result.ok) {
      const savedId = result.id || active.id;
      const updatedActive = { ...active, id: savedId };
      setActiveId(savedId);
      onChange(events.map((e) => (String(e.id) === String(active.id) ? updatedActive : e)));
      toast.success("Event saved successfully!");
    } else {
      toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
    }
  }

  async function handleSetPublish(targetEv: EventItem | undefined, publish: boolean) {
    if (!canEdit) return toast.error("Permission denied: EDIT rights required for Events.");
    const ev = targetEv || active;
    if (!ev) return;
    if ((ev.published !== false) === publish) return;

    const patched: EventItem = { ...ev, published: publish };

    const result = await saveEvent(patched);
    if (result.ok) {
      const savedId = result.id || ev.id;
      const updatedItem = { ...patched, id: savedId };
      if (active && String(active.id) === String(ev.id)) {
        setActiveId(savedId);
      }
      onChange(events.map((e) => (String(e.id) === String(ev.id) ? updatedItem : e)));
      if (publish) {
        toast.success(`"${ev.title}" is now Published and live on the website!`);
      } else {
        toast.success(`"${ev.title}" is now Unpublished (Draft) and hidden from the website.`);
      }
    } else {
      toast.error(result.error || "Failed to update event publication status.");
    }
  }

  async function handleTogglePublish(targetEv?: EventItem) {
    const ev = targetEv || active;
    if (!ev) return;
    return handleSetPublish(ev, ev.published === false);
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
      if (filterStatus === "published" && e.published === false) return false;
      if (filterStatus === "draft" && e.published !== false) return false;
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

  const {
    page: eventPage,
    pageSize: eventPageSize,
    totalPages: eventTotalPages,
    totalItems: eventTotalItems,
    paginatedItems: paginatedEvents,
    setPage: setEventPage,
    setPageSize: setEventPageSize,
  } = usePagination(filteredEvents, { initialPageSize: 10 });

  return (
    <div className="flex flex-col gap-6 w-full font-['Inter',sans-serif]">
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
            <>
              <div className="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200">
                <button
                  type="button"
                  onClick={() => handleSetPublish(active, true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    active.published !== false
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-white hover:text-black"
                  }`}
                  title="Make this event published and live on website"
                >
                  <Globe size={14} />
                  <span>Publish</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPublish(active, false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    active.published === false
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-white hover:text-black"
                  }`}
                  title="Make this event unpublished (draft) and hidden from website"
                >
                  <EyeOff size={14} />
                  <span>Unpublish</span>
                </button>
              </div>
              <button
                onClick={() => setViewMode("editor")}
                className="inline-flex items-center gap-1.5 border border-[#a65a4a]/30 text-[#a65a4a] hover:bg-[#a65a4a]/10 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Edit3 size={15} /> Edit Event Content
              </button>
            </>
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
        <EventDetailRegistrationsView
          active={active}
          submissions={submissions}
          categories={categories}
          exportEventCSV={exportEventCSV}
        />
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
                <option value="published">🌐 Published Only</option>
                <option value="draft">📝 Unpublished (Draft) Only</option>
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

          {/* Events Table (Separate Component) */}
          <EventsOverviewTable
            events={paginatedEvents}
            categories={categories}
            submissions={submissions}
            canDelete={canDelete}
            onSelectEvent={(id) => {
              setActiveId(id);
              setViewMode("event_detail");
            }}
            onEditEvent={(id) => {
              setActiveId(id);
              setViewMode("editor");
            }}
            onTogglePublish={handleSetPublish}
            onDeleteEvent={handleDelete}
          />

          {/* Events Pagination (Separate Component) */}
          <EventsPaginationBar
            currentPage={eventPage}
            totalPages={eventTotalPages}
            totalItems={eventTotalItems}
            pageSize={eventPageSize}
            onPageChange={setEventPage}
            onPageSizeChange={setEventPageSize}
          />
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
          itemSubLabel={(e) => `${e.published === false ? "📝 Draft • " : "🌐 Published • "}${isEventOpen(e) ? "Open" : "Closed"}`}
          addLabel="Add New Event"
          emptyLabel="No events yet."
        >
          {!active ? (
            <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add an event to edit it.</p>
          ) : (
            <div className="flex flex-col gap-5 max-w-[640px]">
              {/* Event Publication Status Card */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                active.published === false
                  ? "bg-amber-50/70 border-amber-200"
                  : "bg-emerald-50/70 border-emerald-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    active.published === false ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"
                  }`}>
                    {active.published === false ? <EyeOff size={18} /> : <Globe size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-[#1e1e1e]">
                        {active.published === false ? "Draft (Unpublished)" : "Published & Live"}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        active.published === false ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {active.published === false ? "Hidden" : "Public"}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#1e1e1e]/60 mt-0.5">
                      {active.published === false
                        ? "This event is currently hidden from the public website and portals."
                        : "This event is visible to all visitors on the website, homepage, and volunteer portal."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetPublish(active, true)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer shadow-xs ${
                      active.published !== false
                        ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                  >
                    <Globe size={14} />
                    <span>Publish Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPublish(active, false)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer shadow-xs ${
                      active.published === false
                        ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50 hover:text-amber-800"
                    }`}
                  >
                    <EyeOff size={14} />
                    <span>Unpublish Event</span>
                  </button>
                </div>
              </div>

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
                <select value={active.categoryId ? String(active.categoryId) : ""} onChange={(e) => update({ categoryId: e.target.value || null })} className={`${inputBase} cursor-pointer`}>
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Event Date</label>
                  <input
                    type="date"
                    value={active.eventDate}
                    min={localTodayStr()}
                    onChange={(e) => update({ eventDate: e.target.value })}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={labelBase}>Location</label>
                  <input value={active.location} onChange={(e) => update({ location: e.target.value })} className={inputBase} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelBase}>Total Seats (Attendees)</label>
                  <input type="number" min={0} value={active.totalSeats} onChange={(e) => update({ totalSeats: Number(e.target.value) })} className={inputBase} />
                </div>
                <div>
                  <label className={labelBase}>Max Volunteers <span className="text-[#1e1e1e]/40 normal-case font-normal">(0 = unlimited)</span></label>
                  <input
                    type="number"
                    min={0}
                    value={active.maxVolunteers ?? 0}
                    onChange={(e) => update({ maxVolunteers: Number(e.target.value) })}
                    className={inputBase}
                    placeholder="0 = no limit"
                  />
                </div>
              </div>
              {(active.maxVolunteers ?? 0) > 0 && (
                <p className="font-['Inter',sans-serif] text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mt-2">
                  Volunteer sign-ups will be capped at <strong>{active.maxVolunteers}</strong>. Once that limit is reached, new volunteer registrations for this event will be blocked.
                </p>
              )}

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
                            <input
                              type="date"
                              value={w.regStart}
                              min={localTodayStr()}
                              onChange={(e) => updateWindow(w.kind, { regStart: e.target.value })}
                              className={inputBase}
                            /></div>
                          <div>
                            <label className={labelBase}>Registration Closes</label>
                            <input
                              type="date"
                              value={w.regEnd}
                              min={localTodayStr()}
                              onChange={(e) => updateWindow(w.kind, { regEnd: e.target.value })}
                              className={inputBase}
                            />
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

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
                <div className="inline-flex items-center p-1 rounded-full bg-gray-100 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSetPublish(active, true)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                      active.published !== false
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-gray-600 hover:bg-white hover:text-black"
                    }`}
                  >
                    <Globe size={14} />
                    <span>Publish Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPublish(active, false)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                      active.published === false
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-gray-600 hover:bg-white hover:text-black"
                    }`}
                  >
                    <EyeOff size={14} />
                    <span>Unpublish Event</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </AdminListEditor>
      )}
    </div>
  );
}
