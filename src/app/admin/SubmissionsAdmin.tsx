import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  UserPlus,
  MessageSquare,
  RefreshCw,
  UserMinus,
} from "lucide-react";
import {
  getSubmissions,
  loadSubmissions,
  updateSubmissionStatus,
  updateSubmissionStatusRemote,
  deleteSubmissionRemote,
  LOCAL_ONLY_SUBMISSION_TYPES,
  SubmissionItem,
} from "../../lib/backend";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { addToTrash } from "../../lib/recycleBin";
import { Pagination } from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import { toast } from "sonner";

type SubmissionCategory = SubmissionItem["type"];

/**
 * Which bucket a submission belongs in, which is not always its stored `type`.
 *
 * The Volunteer tab of the Reserve Seat modal saves a *reservation* carrying a
 * `volunteer_commitment` — so without this, everyone who signed up to help was
 * counted as a plain seat booking and never appeared under Volunteers.
 *
 * Each submission still resolves to exactly one bucket, so the tab counts add
 * up to the total.
 */
export function categoryOf(item: SubmissionItem): SubmissionCategory {
  if (item.type === "perm_volunteer_request") return "perm_volunteer_request";
  if (item.type === "perm_volunteer_deactivate") return "perm_volunteer_deactivate";

  const commitment = String(item.data?.volunteer_commitment || "").trim().toLowerCase();

  // Vendor check
  if (item.type === "vendor" || commitment === "vendor") return "vendor";

  // Check for genuine volunteer commitment ("event_only", "ongoing", or explicit volunteer type with events/skills)
  const isVolunteerCommitment =
    commitment !== "" &&
    commitment !== "none" &&
    commitment !== "attendee" &&
    commitment !== "false" &&
    commitment !== "0";

  if (item.type === "volunteer" || (item.type === "reservation" && isVolunteerCommitment)) {
    if (item.type === "volunteer") {
      const events = item.data?.selected_events;
      const hasEvents = (Array.isArray(events) && events.length > 0) || Boolean(item.data?.event_name);
      const hasSkills = Boolean(item.data?.skills);
      if (!hasEvents && !hasSkills) return "member";
    }
    return "volunteer";
  }

  if (item.type === "reservation") return "reservation";
  if (item.type === "member") return "member";
  if (item.type === "donation") return "donation";
  if (item.type === "contact") return "contact";

  return item.type;
}

export function SubmissionsAdmin() {
  // Synchronous instant 0ms initial load from memory
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => getSubmissions());
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<SubmissionItem | null>(null);

  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "submissions", "edit");
  const canDelete = hasPermission(session, "submissions", "delete");

  const reload = useCallback(async (isSilent = true) => {
    if (!isSilent) setLoading(true);
    try {
      const remote = await loadSubmissions();
      if (remote && Array.isArray(remote)) {
        // Permanent-volunteer requests have no server table yet, so the remote
        // list doesn't contain them. Merging them back in stops every Refresh
        // from wiping those requests off the panel.
        const localOnly = getSubmissions().filter(s => LOCAL_ONLY_SUBMISSION_TYPES.includes(s.type));
        setSubmissions(
          [...remote, ...localOnly].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      }
      setOffline(false);
    } catch (err) {
      // Falling back to this browser's own record — say so, rather than
      // presenting a partial local list as the full picture.
      setSubmissions(getSubmissions());
      setOffline(true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load the real submissions straight away. Without this the panel sat on
    // whatever local storage held until the first interval tick a minute later,
    // or until someone pressed Refresh.
    reload(false);

    // Auto-refresh submissions from the server every 1 minute
    const interval = setInterval(() => {
      reload(true);
    }, 60000);

    // Re-read from the server rather than swapping in the local mirror first —
    // that swap briefly replaced the full list with just this browser's rows.
    function handleInstantSync() {
      reload(true);
    }

    // BroadcastChannel for instant <5ms cross-tab notifications
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("mahila_live_channel");
      channel.onmessage = () => handleInstantSync();
    }

    window.addEventListener("mahila_submissions_changed", handleInstantSync);
    window.addEventListener("storage", handleInstantSync);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener("mahila_submissions_changed", handleInstantSync);
      window.removeEventListener("storage", handleInstantSync);
    };
  }, [reload]);

  async function handleStatusChange(item: SubmissionItem, status: SubmissionItem["status"]) {
    if (!canEdit) {
      return toast.error("Permission denied: You lack EDIT rights for submissions.");
    }

    const res = await updateSubmissionStatusRemote(item, status);
    if (!res.ok) return toast.error(res.error || "Could not update the status — please try again.");

    setSubmissions(prev => prev.map(s => (s.id === item.id && s.type === item.type ? { ...s, status } : s)));
    if (selectedItem?.id === item.id && selectedItem?.type === item.type) {
      setSelectedItem(prev => (prev ? { ...prev, status } : null));
    }
    toast.success(`Status updated to ${status}`);
  }

  async function handleDelete(item: SubmissionItem) {
    if (!canDelete) {
      return toast.error("Permission denied: You lack DELETE rights for submissions.");
    }
    if (item.type === "member") {
      return toast.error("Member accounts can't be deleted here — that would remove their sign-in.");
    }
    if (!confirm("Are you sure you want to delete this submission? This removes it for everyone.")) return;

    const res = await deleteSubmissionRemote(item);
    if (!res.ok) return toast.error(res.error || "Could not delete the submission — please try again.");

<<<<<<< HEAD
    // The submission is genuinely gone now — best-effort file a recoverable
    // copy into Trash, but a failure here shouldn't make it look like the
    // delete itself failed (it didn't), just that Recycle Bin recovery won't
    // be available for this one item.
    try {
      addToTrash({
        id: String(item.id),
        type: "submission",
        title: item.data?.name || item.data?.contact_name || `Submission #${item.id}`,
        subtitle: `${CATEGORY_LABEL[categoryOf(item)] || item.type} • ${item.data?.email || "No email"}`,
        data: item,
      });
      toast.success("Submission moved to Recycle Bin");
    } catch {
      toast.success("Submission deleted (couldn't file a recoverable copy in the Recycle Bin).");
    }

    setSubmissions(prev => prev.filter(s => s.id !== item.id));
    if (selectedItem?.id === item.id) setSelectedItem(null);
=======
    setSubmissions(prev => prev.filter(s => !(s.id === item.id && s.type === item.type)));
    if (selectedItem?.id === item.id && selectedItem?.type === item.type) setSelectedItem(null);
    toast.success("Submission moved to Recycle Bin");
>>>>>>> 971f88b0dedb379489c4583cbf7be93dd7157245
  }

  const list = Array.isArray(submissions) ? submissions : [];

  // Filter calculations — bucketed by intent, not by raw stored type.
  const volunteerList = list.filter(i => categoryOf(i) === "volunteer");
  const memberList = list.filter(i => categoryOf(i) === "member");
  const vendorList = list.filter(i => categoryOf(i) === "vendor");
  const reservationList = list.filter(i => categoryOf(i) === "reservation");
  const donationList = list.filter(i => categoryOf(i) === "donation");
  const contactList = list.filter(i => categoryOf(i) === "contact");
  const permVolList = list.filter(i => categoryOf(i) === "perm_volunteer_request");
  const permDeactivateList = list.filter(i => categoryOf(i) === "perm_volunteer_deactivate");

  const totalDonated = donationList.reduce((acc, curr) => acc + (Number(curr.data?.amount) || 0), 0);
  const totalSeats = reservationList.reduce((acc, curr) => acc + (Number(curr.data?.seats) || 1), 0);

  const availableEventTitles = Array.from(
    new Set(
      list.flatMap(item => {
        const d = item.data || {};
        const evName = d.event_name || d.eventTitle;
        const selEvents = Array.isArray(d.selected_events) ? d.selected_events : [];
        return [evName, ...selEvents].filter(Boolean);
      })
    )
  ).sort();

  const filtered = list.filter(item => {
    if (!item || !item.id) return false;
    if (filterType !== "all" && categoryOf(item) !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterEvent !== "all") {
      const d = item.data || {};
      const evName = String(d.event_name || d.eventTitle || "").trim().toLowerCase();
      const selEvents: string[] = Array.isArray(d.selected_events)
        ? d.selected_events.map((s: any) => String(s).trim().toLowerCase())
        : [];
      const target = filterEvent.trim().toLowerCase();
      if (evName !== target && !selEvents.includes(target)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const d = item.data || {};
      const matchName = (d.name && String(d.name).toLowerCase().includes(q)) || (d.contact_name && String(d.contact_name).toLowerCase().includes(q));
      const matchEmail = d.email && String(d.email).toLowerCase().includes(q);
      const matchPhone = d.phone && String(d.phone).toLowerCase().includes(q);
      const matchSubject = (d.subject && String(d.subject).toLowerCase().includes(q)) || (d.offering && String(d.offering).toLowerCase().includes(q));
      const matchMessage = (d.message && String(d.message).toLowerCase().includes(q)) || (d.skills && String(d.skills).toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchSubject && !matchMessage) return false;
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
  } = usePagination(filtered, { initialPageSize: 10 });

  function exportCSV() {
    if (!filtered.length) {
      toast.error("No submissions to export");
      return;
    }
    const headers = ["ID", "Type", "Status", "Date", "Name/Contact", "Email", "Phone", "Details"];
    const rows = filtered.map(item => [
      item.id,
      categoryOf(item),
      item.status,
      new Date(item.createdAt).toLocaleString(),
      `"${(item.data.name || item.data.contact_name || "").replace(/"/g, '""')}"`,
      `"${(item.data.email || "").replace(/"/g, '""')}"`,
      `"${(item.data.phone || "").replace(/"/g, '""')}"`,
      `"${JSON.stringify(item.data).replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mahila_action_${filterType}_records_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  }

  const getTypeIcon = (type: SubmissionCategory) => {
    switch (type) {
      case "contact": return <MessageSquare className="size-4 text-blue-600" />;
      case "volunteer": return <Users className="size-4 text-emerald-600" />;
      case "member": return <UserPlus className="size-4 text-teal-600" />;
      case "reservation": return <Calendar className="size-4 text-amber-600" />;
      case "vendor": return <Briefcase className="size-4 text-purple-600" />;
      case "donation": return <DollarSign className="size-4 text-rose-600" />;
      case "perm_volunteer_request": return <UserCheck className="size-4 text-[#a65a4a]" />;
      case "perm_volunteer_deactivate": return <UserMinus className="size-4 text-rose-600" />;
    }
  };

  const CATEGORY_LABEL: Record<SubmissionCategory, string> = {
    volunteer: "Volunteer",
    member: "Member",
    reservation: "Reservation",
    vendor: "Vendor",
    donation: "Donation",
    contact: "Contact",
    perm_volunteer_request: "Perm. Volunteer",
    perm_volunteer_deactivate: "Deactivate Request",
  };

  const getStatusBadge = (status: SubmissionItem["status"]) => {
    switch (status) {
      case "New":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"><Clock size={12} /> New</span>;
      case "Contacted":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200"><UserCheck size={12} /> Contacted</span>;
      case "Completed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle size={12} /> Completed</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-['Inter',sans-serif]">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        <div>
          <h3 className="font-['Fraunces',serif] text-[18px] sm:text-[20px] font-semibold text-[#1e1e1e]">
            {filterType === "volunteer" && "🙋‍♀️ Volunteer Registrations & Applications"}
            {filterType === "member" && "🧡 Member Accounts"}
            {filterType === "vendor" && "🛍️ Vendor & Stall Applications"}
            {filterType === "reservation" && "🎟️ Event Attendees & Seat Bookings"}
            {filterType === "donation" && "💖 Donors & Campaign Contributions"}
            {filterType === "contact" && "✉️ Contact & General Inquiries"}
            {filterType === "perm_volunteer_request" && "⭐ Permanent Volunteer Requests"}
            {filterType === "perm_volunteer_deactivate" && "❌ Permanent Volunteer Deactivation Requests"}
            {filterType === "all" && "Form Submissions & Applications"}
          </h3>
          <p className="text-[13px] text-[#1e1e1e]/60 mt-0.5">
            {loading
              ? "Loading submissions…"
              : `Total ${filtered.length} record${filtered.length === 1 ? "" : "s"} (${filtered.filter(s => s.status === "New").length} pending review)`}
          </p>
          {offline && !loading && (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
              Couldn't reach the server — showing only what this browser recorded. These figures are incomplete.
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Submissions are shared now, so another admin's changes appear on refresh. */}
          <button
            onClick={() => reload(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[#a65a4a]/30 text-[#a65a4a] font-medium text-[13px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 bg-[#a65a4a] text-[#f4efe7] font-medium text-[13px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
          >
            <Download size={15} /> Export {filterType.toUpperCase()} CSV
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <div
          onClick={() => setFilterType("volunteer")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "volunteer" ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30" : "bg-white border-gray-200 hover:border-emerald-300"}`}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Volunteers</span>
            <Users className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{volunteerList.length}</p>
          <p className="text-[11px] text-gray-500 truncate">{volunteerList.filter(v => v.status === "New").length} new signups</p>
        </div>

        <div
          onClick={() => setFilterType("member")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "member" ? "bg-teal-50 border-teal-300 ring-2 ring-teal-400/30" : "bg-white border-gray-200 hover:border-teal-300"}`}
        >
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Members</span>
            <UserPlus className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{memberList.length}</p>
          <p className="text-[11px] text-gray-500 truncate">Account signups</p>
        </div>

        <div
          onClick={() => setFilterType("vendor")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "vendor" ? "bg-purple-50 border-purple-300 ring-2 ring-purple-400/30" : "bg-white border-gray-200 hover:border-purple-300"}`}
        >
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Vendors</span>
            <Briefcase className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{vendorList.length}</p>
          <p className="text-[11px] text-gray-500 truncate">Stall applicants</p>
        </div>

        <div
          onClick={() => setFilterType("reservation")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "reservation" ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/30" : "bg-white border-gray-200 hover:border-amber-300"}`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Attendees</span>
            <Calendar className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{totalSeats}</p>
          <p className="text-[11px] text-gray-500 truncate">{reservationList.length} total bookings</p>
        </div>

        <div
          onClick={() => setFilterType("donation")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "donation" ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/30" : "bg-white border-gray-200 hover:border-rose-300"}`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Donors</span>
            <DollarSign className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#a65a4a] mt-1">₹{totalDonated.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500 truncate">{donationList.length} contributions</p>
        </div>

        <div
          onClick={() => setFilterType("perm_volunteer_request")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "perm_volunteer_request" ? "bg-[#a65a4a]/10 border-[#a65a4a]/40 ring-2 ring-[#a65a4a]/20" : "bg-white border-gray-200 hover:border-[#a65a4a]/40"}`}
        >
          <div className="flex items-center justify-between text-[#a65a4a]">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Perm Vol</span>
            <UserCheck className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{permVolList.length}</p>
          <p className="text-[11px] text-gray-500 truncate">{permVolList.filter(v => v.status === "New").length} pending review</p>
        </div>

        <div
          onClick={() => setFilterType("perm_volunteer_deactivate")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${filterType === "perm_volunteer_deactivate" ? "bg-rose-50 border-rose-200 ring-2 ring-rose-400/20" : "bg-white border-gray-200 hover:border-rose-400/40"}`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider truncate">Deactivations</span>
            <UserMinus className="size-4 shrink-0" />
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-gray-900 mt-1">{permDeactivateList.length}</p>
          <p className="text-[11px] text-gray-500 truncate">{permDeactivateList.filter(v => v.status === "New").length} pending review</p>
        </div>
      </div>

      {/* Page Tab Selector Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#a65a4a]/15 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "all" ? "bg-[#a65a4a] text-white shadow-sm ring-2 ring-[#a65a4a]/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            All Submissions ({list.length})
          </button>
          <button
            onClick={() => setFilterType("volunteer")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "volunteer" ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            🙋‍♀️ Volunteers ({volunteerList.length})
          </button>
          <button
            onClick={() => setFilterType("member")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "member" ? "bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            🧡 Members ({memberList.length})
          </button>
          <button
            onClick={() => setFilterType("vendor")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "vendor" ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            🛍️ Vendors ({vendorList.length})
          </button>
          <button
            onClick={() => setFilterType("reservation")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "reservation" ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            🎟️ Event Attendees ({reservationList.length})
          </button>
          <button
            onClick={() => setFilterType("donation")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "donation" ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            💖 Donors ({donationList.length})
          </button>
          <button
            onClick={() => setFilterType("contact")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "contact" ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            ✉️ Contact ({contactList.length})
          </button>
          <button
            onClick={() => setFilterType("perm_volunteer_request")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "perm_volunteer_request" ? "bg-[#a65a4a] text-white shadow-sm ring-2 ring-[#a65a4a]/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            ⭐ Perm Volunteers ({permVolList.length})
            {permVolList.filter(v => v.status === "New").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                {permVolList.filter(v => v.status === "New").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterType("perm_volunteer_deactivate")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${filterType === "perm_volunteer_deactivate" ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            ❌ Deactivations ({permDeactivateList.length})
            {permDeactivateList.filter(v => v.status === "New").length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {permDeactivateList.filter(v => v.status === "New").length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[220px]">
            <Search className="absolute left-3 top-2.5 size-4 text-[#1e1e1e]/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#a65a4a]/25 rounded-lg focus:outline-none focus:border-[#a65a4a] bg-white"
            />
          </div>

          {availableEventTitles.length > 0 && (
            <select
              value={filterEvent}
              onChange={e => setFilterEvent(e.target.value)}
              className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium max-w-[180px] truncate"
            >
              <option value="all">All Events</option>
              {availableEventTitles.map(title => (
                <option key={title} value={title}>
                  🗓️ {title}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a]"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table & Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className={`bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden ${selectedItem ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {!filtered.length ? (
            <div className="p-12 text-center">
              <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/50">No submissions found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
                <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a65a4a]/10">
                  {paginatedItems.map(item => {
                    const isSel = selectedItem?.id === item.id && selectedItem?.type === item.type;
                    const name = item.data.name || item.data.contact_name || "Anonymous";
                    const email = item.data.email || "No email";

                    return (
                      <tr
                        key={`${item.type}_${item.id}`}
                        onClick={() => setSelectedItem(item)}
                        className={`hover:bg-[#a65a4a]/5 cursor-pointer transition-colors ${isSel ? "bg-[#a65a4a]/10" : ""}`}
                      >
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(categoryOf(item))}
                            <span className="font-semibold text-[#1e1e1e]">{CATEGORY_LABEL[categoryOf(item)]}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1e1e1e]">{name}</div>
                          <div className="text-[12px] text-[#1e1e1e]/50">{email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#1e1e1e]/60 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={categoryOf(item) === "member"}
                            className="p-1.5 text-[#1e1e1e]/40 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#1e1e1e]/40 disabled:cursor-not-allowed"
                            title={categoryOf(item) === "member" ? "Member accounts can't be deleted here" : "Delete submission"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

        {/* Selected Item Drawer */}
        {selectedItem && (
          <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm p-5 sm:p-6 flex flex-col gap-4 font-['Inter',sans-serif] lg:sticky lg:top-4 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-[#a65a4a]/15">
              <div className="flex items-center gap-2">
                {getTypeIcon(categoryOf(selectedItem))}
                <h4 className="font-['Fraunces',serif] text-[17px] font-semibold text-[#1e1e1e]">
                  {CATEGORY_LABEL[categoryOf(selectedItem)]} Details
                </h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[12px] text-[#1e1e1e]/40 hover:text-[#1e1e1e]"
              >
                Close ✕
              </button>
            </div>

            {/* Status Switcher — replaced with Accept/Reject for perm volunteer requests & deactivations */}
            {categoryOf(selectedItem) === "perm_volunteer_request" || categoryOf(selectedItem) === "perm_volunteer_deactivate" ? (
              <div>
                <label className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Decision</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedItem, "Completed")}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer border ${
                      selectedItem.status === "Completed"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    {categoryOf(selectedItem) === "perm_volunteer_deactivate" ? "✅ Approve Deactivation" : "✅ Accept"}
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedItem, "Contacted")}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer border ${
                      selectedItem.status === "Contacted"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                    }`}
                  >
                    {categoryOf(selectedItem) === "perm_volunteer_deactivate" ? "✕ Reject Deactivation" : "✕ Reject"}
                  </button>
                </div>
                {selectedItem.status === "New" && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
                    ⏳ Pending — no decision made yet.
                  </p>
                )}
                {selectedItem.data?.message && (
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block mb-1">Applicant's Note</span>
                    <div className="p-3 bg-gray-50 rounded-lg text-[13px] text-[#1e1e1e]/80 whitespace-pre-wrap border border-gray-200/60 leading-relaxed">
                      {selectedItem.data.message}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Change Status</label>
                <div className="flex gap-2">
                  {(["New", "Contacted", "Completed"] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedItem, st)}
                      className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer border ${
                        selectedItem.status === st
                          ? "bg-[#a65a4a] text-white border-[#a65a4a]"
                          : "bg-white text-[#1e1e1e]/70 border-[#a65a4a]/25 hover:border-[#a65a4a]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-[#faf7f3] p-4 rounded-xl flex flex-col gap-2 text-[13px]">
              <div className="flex items-center gap-2 text-[#1e1e1e]">
                <Mail size={14} className="text-[#a65a4a]" />
                <span className="font-medium">{selectedItem.data.email || "No email"}</span>
              </div>
              {selectedItem.data.phone && (
                <div className="flex items-center gap-2 text-[#1e1e1e]">
                  <Phone size={14} className="text-[#a65a4a]" />
                  <span>{selectedItem.data.phone}</span>
                </div>
              )}
              <div className="text-[11px] text-[#1e1e1e]/50 mt-1">
                Submitted on: {new Date(selectedItem.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Details Fields */}
            <div className="flex flex-col gap-3 text-[13px]">
              {selectedItem.data.subject && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Subject</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.subject}</p>
                </div>
              )}
              {selectedItem.data.message && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block mb-1">Message</span>
                  <div className="p-3 bg-gray-50 rounded-lg text-[#1e1e1e]/80 whitespace-pre-wrap border border-gray-200/60 leading-relaxed">
                    {selectedItem.data.message}
                  </div>
                </div>
              )}
              {selectedItem.data.skills && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block mb-1">Skills & Interests</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.skills}</p>
                </div>
              )}
              {selectedItem.data.amount && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Donation Amount</span>
                  <p className="text-[18px] font-bold text-rose-600">₹{selectedItem.data.amount.toLocaleString()}</p>
                </div>
              )}
              {selectedItem.data.event_name && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Event</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.event_name}</p>
                </div>
              )}
              {selectedItem.data.seats && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Seats Reserved</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.seats}</p>
                </div>
              )}
              {selectedItem.data.business_name && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Business Name</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.business_name}</p>
                </div>
              )}
              {selectedItem.data.offering && (
                <div>
                  <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase block">Offering</span>
                  <p className="text-[#1e1e1e] font-medium">{selectedItem.data.offering}</p>
                </div>
              )}
            </div>

            {categoryOf(selectedItem) !== "member" && (
              <button
                onClick={() => handleDelete(selectedItem)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-medium text-[13px] hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 size={14} /> Delete Submission
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
