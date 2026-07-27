import { useState } from "react";
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
  MessageSquare,
} from "lucide-react";
import {
  getSubmissions,
  updateSubmissionStatus,
  deleteSubmission,
  SubmissionItem,
} from "../../lib/backend";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { toast } from "sonner";

export function SubmissionsAdmin() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => getSubmissions());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<SubmissionItem | null>(null);

  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "submissions", "edit");
  const canDelete = hasPermission(session, "submissions", "delete");

  function reload() {
    setSubmissions(getSubmissions());
  }

  function handleStatusChange(id: string, status: SubmissionItem["status"]) {
    if (!canEdit) {
      return toast.error("Permission denied: You lack EDIT rights for submissions.");
    }
    updateSubmissionStatus(id, status);
    toast.success(`Status updated to ${status}`);
    reload();
    if (selectedItem?.id === id) {
      setSelectedItem(prev => prev ? { ...prev, status } : null);
    }
  }

  function handleDelete(id: string) {
    if (!canDelete) {
      return toast.error("Permission denied: You lack DELETE rights for submissions.");
    }
    if (!confirm("Are you sure you want to delete this submission?")) return;
    deleteSubmission(id);
    toast.success("Submission deleted");
    reload();
    if (selectedItem?.id === id) setSelectedItem(null);
  }

  const list = Array.isArray(submissions) ? submissions : [];

  // Filter calculations
  const volunteerList = list.filter(i => i.type === "volunteer");
  const vendorList = list.filter(i => i.type === "vendor");
  const reservationList = list.filter(i => i.type === "reservation");
  const donationList = list.filter(i => i.type === "donation");
  const contactList = list.filter(i => i.type === "contact");

  const totalDonated = donationList.reduce((acc, curr) => acc + (Number(curr.data?.amount) || 0), 0);
  const totalSeats = reservationList.reduce((acc, curr) => acc + (Number(curr.data?.seats) || 1), 0);

  const filtered = list.filter(item => {
    if (!item || !item.id) return false;
    if (filterType !== "all" && item.type !== filterType) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
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

  function exportCSV() {
    if (!filtered.length) {
      toast.error("No submissions to export");
      return;
    }
    const headers = ["ID", "Type", "Status", "Date", "Name/Contact", "Email", "Phone", "Details"];
    const rows = filtered.map(item => [
      item.id,
      item.type,
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

  const getTypeIcon = (type: SubmissionItem["type"]) => {
    switch (type) {
      case "contact": return <MessageSquare className="size-4 text-blue-600" />;
      case "volunteer": return <Users className="size-4 text-emerald-600" />;
      case "reservation": return <Calendar className="size-4 text-amber-600" />;
      case "vendor": return <Briefcase className="size-4 text-purple-600" />;
      case "donation": return <DollarSign className="size-4 text-rose-600" />;
    }
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
    <div className="flex flex-col gap-6 max-w-[1100px] font-['Inter',sans-serif]">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        <div>
          <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">
            {filterType === "volunteer" && "🙋‍♀️ Volunteer Registrations & Applications"}
            {filterType === "vendor" && "🛍️ Vendor & Stall Applications"}
            {filterType === "reservation" && "🎟️ Event Attendees & Seat Bookings"}
            {filterType === "donation" && "💖 Donors & Campaign Contributions"}
            {filterType === "contact" && "✉️ Contact & General Inquiries"}
            {filterType === "all" && "Form Submissions & Applications"}
          </h3>
          <p className="text-[13px] text-[#1e1e1e]/60 mt-0.5">
            Total {filtered.length} record{filtered.length === 1 ? "" : "s"} ({filtered.filter(s => s.status === "New").length} pending review)
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="shrink-0 inline-flex items-center gap-2 bg-[#a65a4a] text-[#f4efe7] font-medium text-[13px] px-4 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
        >
          <Download size={15} /> Export {filterType.toUpperCase()} CSV
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterType("volunteer")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${filterType === "volunteer" ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30" : "bg-white border-gray-200 hover:border-emerald-300"}`}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Volunteers</span>
            <Users className="size-4" />
          </div>
          <p className="text-[22px] font-bold text-gray-900 mt-1">{volunteerList.length}</p>
          <p className="text-[11px] text-gray-500">{volunteerList.filter(v => v.status === "New").length} new signups</p>
        </div>

        <div
          onClick={() => setFilterType("vendor")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${filterType === "vendor" ? "bg-purple-50 border-purple-300 ring-2 ring-purple-400/30" : "bg-white border-gray-200 hover:border-purple-300"}`}
        >
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Vendors</span>
            <Briefcase className="size-4" />
          </div>
          <p className="text-[22px] font-bold text-gray-900 mt-1">{vendorList.length}</p>
          <p className="text-[11px] text-gray-500">Stall applicants</p>
        </div>

        <div
          onClick={() => setFilterType("reservation")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${filterType === "reservation" ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/30" : "bg-white border-gray-200 hover:border-amber-300"}`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Attendees</span>
            <Calendar className="size-4" />
          </div>
          <p className="text-[22px] font-bold text-gray-900 mt-1">{totalSeats}</p>
          <p className="text-[11px] text-gray-500">{reservationList.length} total bookings</p>
        </div>

        <div
          onClick={() => setFilterType("donation")}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${filterType === "donation" ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/30" : "bg-white border-gray-200 hover:border-rose-300"}`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Donors</span>
            <DollarSign className="size-4" />
          </div>
          <p className="text-[22px] font-bold text-[#a65a4a] mt-1">₹{totalDonated.toLocaleString()}</p>
          <p className="text-[11px] text-gray-500">{donationList.length} contributions</p>
        </div>
      </div>

      {/* Page Tab Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#a65a4a]/15 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "all" ? "bg-[#a65a4a] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            All Submissions ({list.length})
          </button>
          <button
            onClick={() => setFilterType("volunteer")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "volunteer" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
          >
            🙋‍♀️ Volunteers ({volunteerList.length})
          </button>
          <button
            onClick={() => setFilterType("vendor")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "vendor" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-800 hover:bg-purple-100"}`}
          >
            🛍️ Vendors ({vendorList.length})
          </button>
          <button
            onClick={() => setFilterType("reservation")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "reservation" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
          >
            🎟️ Event Attendees ({reservationList.length})
          </button>
          <button
            onClick={() => setFilterType("donation")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "donation" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"}`}
          >
            💖 Donors ({donationList.length})
          </button>
          <button
            onClick={() => setFilterType("contact")}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${filterType === "contact" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-800 hover:bg-blue-100"}`}
          >
            ✉️ Contact ({contactList.length})
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
                  {filtered.map(item => {
                    const isSel = selectedItem?.id === item.id;
                    const name = item.data.name || item.data.contact_name || "Anonymous";
                    const email = item.data.email || "No email";

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`hover:bg-[#a65a4a]/5 cursor-pointer transition-colors ${isSel ? "bg-[#a65a4a]/10" : ""}`}
                      >
                        <td className="py-3.5 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            <span className="capitalize font-semibold text-[#1e1e1e]">{item.type}</span>
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
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-[#1e1e1e]/40 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete submission"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Item Drawer */}
        {selectedItem && (
          <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm p-6 flex flex-col gap-4 font-['Inter',sans-serif]">
            <div className="flex items-center justify-between pb-3 border-b border-[#a65a4a]/15">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedItem.type)}
                <h4 className="font-['Fraunces',serif] text-[17px] font-semibold text-[#1e1e1e] capitalize">
                  {selectedItem.type} Details
                </h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[12px] text-[#1e1e1e]/40 hover:text-[#1e1e1e]"
              >
                Close ✕
              </button>
            </div>

            {/* Status Switcher */}
            <div>
              <label className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Change Status</label>
              <div className="flex gap-2">
                {(["New", "Contacted", "Completed"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedItem.id, st)}
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

            <button
              onClick={() => handleDelete(selectedItem.id)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-medium text-[13px] hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 size={14} /> Delete Submission
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
