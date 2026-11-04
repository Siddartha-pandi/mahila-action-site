"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  UserCheck,
  RefreshCw,
  Printer,
  Heart,
  DollarSign,
  TrendingUp,
  CreditCard,
  User,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  Filter,
  Edit3,
  Plus,
  ArrowUp,
  ArrowDown,
  Banknote,
  FileText,
} from "lucide-react";
import {
  getSubmissions,
  loadSubmissions,
  updateSubmissionStatusRemote,
  deleteSubmissionRemote,
  SubmissionItem,
} from "../../lib/backend";
import { api } from "../../lib/api";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";
import { addToTrash } from "../../lib/recycleBin";
import { Pagination } from "../components/ui/Pagination";
import { usePagination } from "../hooks/usePagination";
import { CAMPAIGNS, Campaign, formatLakh } from "../constants/campaigns";
import { firstError, validateEmail, validatePhone } from "@/lib/validation";
import { toast } from "sonner";

export function DonationsAdmin() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(() => getSubmissions());
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterDonorType, setFilterDonorType] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<SubmissionItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Campaigns State & Editor
  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, "donations", "edit");
  const canDelete = hasPermission(session, "donations", "delete");

  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaigns, setEditingCampaigns] = useState<Campaign[]>([]);
  const [savingCampaigns, setSavingCampaigns] = useState(false);

  // Offline Donations State
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    name: "",
    anonymous: false,
    email: "",
    phone: "",
    amount: "",
    campaign_name: "General Empowerment Support",
    payment_method: "cash",
    transaction_id: "",
    date: new Date().toISOString().slice(0, 10),
    pan_number: "",
    address: "",
    notes: "",
    status: "Completed",
  });

  const openOfflineModal = () => {
    setOfflineForm({
      name: "",
      anonymous: false,
      email: "",
      phone: "",
      amount: "",
      campaign_name: campaigns[0]?.name || "General Empowerment Support",
      payment_method: "cash",
      transaction_id: "",
      date: new Date().toISOString().slice(0, 10),
      pan_number: "",
      address: "",
      notes: "",
      status: "Completed",
    });
    setShowOfflineModal(true);
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCampaigns(data);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCampaigns();
    window.addEventListener("mahila_campaigns_changed", fetchCampaigns);
    return () => {
      window.removeEventListener("mahila_campaigns_changed", fetchCampaigns);
    };
  }, [fetchCampaigns]);

  const openCampaignManager = async () => {
    try {
      const res = await fetch("/api/campaigns?raw=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEditingCampaigns(data);
          setShowCampaignModal(true);
          return;
        }
      }
    } catch {}
    setEditingCampaigns(campaigns);
    setShowCampaignModal(true);
  };

  const handleUpdateEditingCampaign = (index: number, patch: Partial<Campaign>) => {
    setEditingCampaigns((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleAddNewCampaign = () => {
    const newId = `campaign-${Date.now().toString().slice(-6)}`;
    setEditingCampaigns((prev) => [
      ...prev,
      {
        id: newId,
        name: "New Initiative",
        tag: "Community",
        goal: 500000,
        raised: 0,
      },
    ]);
  };

  const handleRemoveCampaign = (index: number) => {
    if (editingCampaigns.length <= 1) {
      return toast.error("At least one campaign must be maintained.");
    }
    setEditingCampaigns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveCampaign = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= editingCampaigns.length) return;
    setEditingCampaigns((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(index, 1);
      arr.splice(target, 0, item);
      return arr;
    });
  };

  const handleSaveAllCampaigns = async () => {
    if (!canEdit) return toast.error("Permission denied to edit campaigns.");
    for (const c of editingCampaigns) {
      if (!c.name.trim()) return toast.error("Every campaign must have a title.");
      if (!c.goal || c.goal <= 0) return toast.error("Goal must be greater than zero.");
    }

    setSavingCampaigns(true);
    try {
      const res = await api.post<any>("/api/campaigns", editingCampaigns);
      if (res.ok) {
        toast.success("Campaigns updated successfully!");
        setShowCampaignModal(false);
        fetchCampaigns();
        window.dispatchEvent(new Event("mahila_campaigns_changed"));
      } else {
        toast.error(res.error || "Failed to save campaigns.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaigns.");
    } finally {
      setSavingCampaigns(false);
    }
  };

  const handleSaveOfflineDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return toast.error("Permission denied to record offline donations.");
    const amt = Number(offlineForm.amount);
    if (!amt || amt <= 0) {
      return toast.error("Please enter a valid donation amount (greater than ₹0).");
    }
    if (!offlineForm.anonymous && !offlineForm.name.trim()) {
      return toast.error("Please enter donor name or check Anonymous Supporter.");
    }

    const invalid = firstError(
      offlineForm.phone?.trim() ? validatePhone(offlineForm.phone, "phone number", { required: false }) : null,
      offlineForm.email?.trim() ? validateEmail(offlineForm.email, "donor email", { required: false }) : null
    );
    if (invalid) return toast.error(invalid);

    setSavingOffline(true);
    try {
      const res = await api.post<any>("/api/donations", {
        amount: amt,
        name: offlineForm.anonymous ? "Anonymous Donor" : offlineForm.name.trim(),
        anonymous: offlineForm.anonymous,
        email: offlineForm.email.trim() || undefined,
        phone: offlineForm.phone.trim() || undefined,
        pan_number: offlineForm.pan_number.trim() || undefined,
        address: offlineForm.address.trim() || undefined,
        donation_type: "one-time",
        campaign_name: offlineForm.campaign_name,
        payment_method: offlineForm.payment_method,
        transaction_id: offlineForm.transaction_id.trim() || undefined,
        notes: offlineForm.notes.trim() || undefined,
        status: offlineForm.status,
        created_at: offlineForm.date ? new Date(offlineForm.date).toISOString() : new Date().toISOString(),
        is_offline: true,
      });

      if (res.ok) {
        toast.success(
          `Offline donation of ₹${amt.toLocaleString("en-IN")} recorded! Receipt: ${
            res.data?.receipt_number || "Issued"
          }`
        );
        setShowOfflineModal(false);
        await reload(false);
        fetchCampaigns();
        window.dispatchEvent(new Event("mahila_submissions_changed"));
        window.dispatchEvent(new Event("mahila_campaigns_changed"));
      } else {
        toast.error(res.error || "Failed to record offline donation.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record offline donation.");
    } finally {
      setSavingOffline(false);
    }
  };

  const reload = useCallback(async (isSilent = true) => {
    if (!isSilent) setLoading(true);
    try {
      const remote = await loadSubmissions();
      if (remote && Array.isArray(remote)) {
        setSubmissions(remote);
        setOffline(false);
      }
    } catch {
      setSubmissions(getSubmissions());
      setOffline(true);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(false);
    const interval = setInterval(() => reload(true), 60000);

    function handleSync() {
      reload(true);
    }

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("mahila_live_channel");
      channel.onmessage = () => handleSync();
    }

    window.addEventListener("mahila_submissions_changed", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener("mahila_submissions_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [reload]);

  // Filter only donation items
  const allDonations = (Array.isArray(submissions) ? submissions : []).filter(
    (s) => s.type === "donation"
  );

  // High-level aggregates
  const totalAmount = allDonations.reduce((sum, d) => sum + (Number(d.data?.amount) || 0), 0);
  const totalCount = allDonations.length;
  const avgDonation = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  const isItemAnon = (d: SubmissionItem) =>
    d.data?.anonymous === true ||
    d.data?.anonymous === 1 ||
    d.data?.anonymous === "1" ||
    d.data?.anonymous === "true" ||
    !d.data?.name ||
    String(d.data?.name).trim().toLowerCase() === "anonymous";

  const isOfflineItem = (d: SubmissionItem) =>
    d.data?.is_offline === true ||
    d.data?.is_offline === 1 ||
    d.data?.is_offline === "true" ||
    ["cash", "cheque", "demand_draft", "bank_transfer"].includes(
      String(d.data?.payment_method || "").toLowerCase()
    );

  const anonCount = allDonations.filter(isItemAnon).length;
  const namedCount = totalCount - anonCount;
  const monthlyCount = allDonations.filter((d) => d.data?.donation_type === "monthly").length;
  const offlineDonations = allDonations.filter(isOfflineItem);
  const offlineAmount = offlineDonations.reduce((sum, d) => sum + (Number(d.data?.amount) || 0), 0);
  const offlineCount = offlineDonations.length;

  // Filtered dataset
  const filteredDonations = allDonations.filter((item) => {
    const isAnon = isItemAnon(item);
    if (filterDonorType === "named" && isAnon) return false;
    if (filterDonorType === "anonymous" && !isAnon) return false;

    if (filterMethod !== "all") {
      const m = String(item.data?.payment_method || "upi").toLowerCase();
      const isOff = isOfflineItem(item);
      if (filterMethod === "offline") {
        if (!isOff) return false;
      } else if (filterMethod === "cash") {
        if (m !== "cash") return false;
      } else if (filterMethod === "cheque") {
        if (!m.includes("cheque") && !m.includes("draft")) return false;
      } else if (filterMethod === "bank") {
        if (!m.includes("bank") && !m.includes("neft") && !m.includes("rtgs") && !m.includes("imps")) return false;
      } else if (filterMethod === "upi") {
        if (!m.includes("upi")) return false;
      } else if (filterMethod === "razorpay") {
        if (!m.includes("razorpay")) return false;
      } else if (!m.includes(filterMethod.toLowerCase())) {
        return false;
      }
    }

    if (filterCampaign !== "all") {
      const camp = String(item.data?.campaign_name || item.data?.event_name || "").toLowerCase();
      if (!camp.includes(filterCampaign.toLowerCase())) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const rNum = String(item.data?.receipt_number || "").toLowerCase();
      const name = String(item.data?.name || "").toLowerCase();
      const email = String(item.data?.email || "").toLowerCase();
      const phone = String(item.data?.phone || "").toLowerCase();
      const tx = String(item.data?.transaction_id || "").toLowerCase();
      const camp = String(item.data?.campaign_name || item.data?.event_name || "").toLowerCase();
      const notes = String(item.data?.notes || "").toLowerCase();
      const method = String(item.data?.payment_method || "").toLowerCase();
      if (
        !rNum.includes(q) &&
        !name.includes(q) &&
        !email.includes(q) &&
        !phone.includes(q) &&
        !tx.includes(q) &&
        !camp.includes(q) &&
        !notes.includes(q) &&
        !method.includes(q)
      ) {
        return false;
      }
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
  } = usePagination(filteredDonations, { initialPageSize: 10 });

  // Checkbox Selection Logic
  const isAllPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((d) => selectedIds.has(String(d.id)));
  const isSomePageSelected =
    paginatedItems.some((d) => selectedIds.has(String(d.id))) && !isAllPageSelected;

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((d) => next.delete(String(d.id)));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((d) => next.add(String(d.id)));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (item: SubmissionItem) => {
    if (!canDelete) return toast.error("Permission denied to delete donations.");
    if (!confirm(`Are you sure you want to move donation receipt #${item.data?.receipt_number || item.id} to the Recycle Bin?`)) {
      return;
    }
    addToTrash({
      id: String(item.id),
      type: "submission",
      title: `Donation: ₹${Number(item.data?.amount || 0).toLocaleString("en-IN")} (${item.data?.receipt_number || item.id})`,
      subtitle: `${item.data?.name || "Anonymous"} • ${item.data?.campaign_name || "General Fund"}`,
      data: item,
    });
    const res = await deleteSubmissionRemote(item);
    if (!res.ok) return toast.error("Could not delete donation record.");
    setSubmissions((prev) => prev.filter((s) => String(s.id) !== String(item.id)));
    if (String(selectedDonation?.id) === String(item.id)) setSelectedDonation(null);
    toast.success("Donation moved to Recycle Bin");
  };

  const handleBatchDelete = async () => {
    if (!canDelete) return toast.error("Permission denied to delete donations.");
    const targets = allDonations.filter((d) => selectedIds.has(String(d.id)));
    if (!targets.length) return;
    if (!confirm(`Are you sure you want to move ${targets.length} donation(s) to the Recycle Bin?`)) return;

    let count = 0;
    for (const item of targets) {
      addToTrash({
        id: String(item.id),
        type: "submission",
        title: `Donation: ₹${Number(item.data?.amount || 0).toLocaleString("en-IN")} (${item.data?.receipt_number || item.id})`,
        subtitle: `${item.data?.name || "Anonymous"} • ${item.data?.campaign_name || "General Fund"}`,
        data: item,
      });
      const res = await deleteSubmissionRemote(item);
      if (res.ok) count++;
    }
    const delSet = new Set(targets.map((t) => String(t.id)));
    setSubmissions((prev) => prev.filter((s) => !delSet.has(String(s.id))));
    toast.success(`Moved ${count} donation(s) to Recycle Bin`);
    setSelectedIds(new Set());
  };

  const exportCSV = (onlySelected = false) => {
    const dataToExport = onlySelected
      ? allDonations.filter((d) => selectedIds.has(String(d.id)))
      : filteredDonations;

    if (!dataToExport.length) return toast.error("No donations to export");

    const headers = [
      "Receipt Number",
      "Date",
      "Donor Name",
      "Amount (INR)",
      "Channel",
      "Donation Type",
      "Payment Method",
      "Transaction / Cheque Ref",
      "Email",
      "Phone",
      "Campaign / Cause",
      "Notes",
    ];
    const rows = dataToExport.map((item) => [
      `"${(item.data.receipt_number || `MA-REC-${new Date(item.createdAt).getFullYear()}-${item.id}`).replace(/"/g, '""')}"`,
      `"${new Date(item.createdAt).toLocaleString("en-IN")}"`,
      `"${(item.data.anonymous ? "Anonymous" : item.data.name || "").replace(/"/g, '""')}"`,
      Number(item.data.amount) || 0,
      `"${isOfflineItem(item) ? "Offline" : "Online"}"`,
      `"${(item.data.donation_type || "one-time").replace(/"/g, '""')}"`,
      `"${(item.data.payment_method || "UPI").toUpperCase().replace(/"/g, '""')}"`,
      `"${(item.data.transaction_id || "").replace(/"/g, '""')}"`,
      `"${(item.data.anonymous ? "" : item.data.email || "").replace(/"/g, '""')}"`,
      `"${(item.data.phone || "").replace(/"/g, '""')}"`,
      `"${(item.data.campaign_name || item.data.event_name || "General Support").replace(/"/g, '""')}"`,
      `"${(item.data.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mahila_action_donations_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} donation records to CSV`);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-['Inter',sans-serif]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Heart size={20} className="fill-rose-600/20" />
            </span>
            <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">
              Donations &amp; Campaign Contributions
            </h3>
          </div>
          <p className="text-[13px] text-[#1e1e1e]/60 mt-1">
            {loading ? "Refreshing donation records…" : `Total ${totalCount} records • ₹${totalAmount.toLocaleString("en-IN")} raised`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={openOfflineModal}
            className="inline-flex items-center gap-1.5 bg-[#a65a4a] text-white text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-[#993925] transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={15} /> Record Offline Donation
          </button>
          <button
            onClick={() => exportCSV(false)}
            className="inline-flex items-center gap-1.5 border border-[#a65a4a]/40 text-[#a65a4a] text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer shadow-2xs"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => reload(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 text-[13px] font-medium px-3.5 py-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Raised</span>
            <DollarSign size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-gray-500">{totalCount} total records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Offline Collections</span>
            <Banknote size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">
            ₹{offlineAmount.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-amber-700/80 font-medium">{offlineCount} offline receipts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Donation</span>
            <TrendingUp size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">
            ₹{avgDonation.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-gray-500">Per contribution</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Named Donors</span>
            <User size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">{namedCount}</p>
          <p className="text-[11px] text-gray-500">Registered supporters</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200/80 shadow-xs">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Anonymous</span>
            <UserCheck size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">{anonCount}</p>
          <p className="text-[11px] text-gray-500">Private donors</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200/80 shadow-xs">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
            <Heart size={16} />
          </div>
          <p className="font-['Fraunces',serif] text-[22px] font-bold text-gray-900 mt-1">{campaigns.length}</p>
          <p className="text-[11px] text-gray-500">Charitable causes</p>
        </div>
      </div>

      {/* Campaigns Live Progress Mini-Cards */}
      <div className="bg-white p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <p className="text-[12px] font-bold text-[#1e1e1e]/60 uppercase tracking-wider">
              Campaign Targets &amp; Funding Status
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Live progress aggregated from base campaign settings and recorded donations
            </p>
          </div>
          <button
            onClick={openCampaignManager}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-[#a65a4a] text-white hover:bg-[#993925] transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Edit3 size={13} /> Edit Campaigns
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {campaigns.map((c) => {
            const currentTotal = Number(c.raised) || 0;
            const pct = c.goal > 0 ? (currentTotal / c.goal) * 100 : 0;
            const pctDisplay = pct > 0 ? (pct < 1 ? pct.toFixed(1) : Math.round(pct)) : 0;

            return (
              <div key={c.id} className="bg-[#faf7f3] border border-[#a65a4a]/15 p-3.5 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#a65a4a] bg-[#a65a4a]/10 px-2 py-0.5 rounded-full">
                    {c.tag}
                  </span>
                  <h5 className="font-bold text-[13px] text-[#1e1e1e] mt-1.5 line-clamp-1" title={c.name}>{c.name}</h5>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                    <span className="text-gray-900 font-bold">₹{currentTotal.toLocaleString("en-IN")}</span>
                    <span className="text-gray-500">Goal: {formatLakh(c.goal)} ({pctDisplay}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#587735] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(pct, currentTotal > 0 ? 3 : 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#a65a4a]/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-[#1e1e1e]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt #, donor, phone, or UTR/TxID…"
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#a65a4a]/25 rounded-xl focus:outline-none focus:border-[#a65a4a] bg-white shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-3 py-2 text-[12px] border border-[#a65a4a]/25 rounded-xl bg-white text-gray-700 font-medium max-w-[190px] truncate shadow-2xs cursor-pointer"
          >
            <option value="all">🗓️ All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterDonorType}
            onChange={(e) => setFilterDonorType(e.target.value)}
            className="px-3 py-2 text-[12px] border border-[#a65a4a]/25 rounded-xl bg-white text-gray-700 font-medium shadow-2xs cursor-pointer"
          >
            <option value="all">💖 All Donors</option>
            <option value="named">👤 Named Donors ({namedCount})</option>
            <option value="anonymous">🕵️ Anonymous ({anonCount})</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 text-[12px] border border-[#a65a4a]/25 rounded-xl bg-white text-gray-700 font-medium shadow-2xs cursor-pointer"
          >
            <option value="all">💳 All Payment Modes</option>
            <option value="offline">📦 All Offline ({offlineCount})</option>
            <option value="cash">💵 Cash (Offline)</option>
            <option value="cheque">📝 Cheque / DD (Offline)</option>
            <option value="bank">🏦 Bank Transfer (NEFT/RTGS)</option>
            <option value="upi">📱 UPI / QR Code</option>
            <option value="razorpay">🌐 Razorpay Gateway</option>
          </select>

          <p className="text-[12px] text-gray-500 font-medium shrink-0 ml-1">
            Showing <strong className="text-gray-900">{filteredDonations.length}</strong> of {totalCount}
          </p>
        </div>
      </div>

      {/* Donations Data Table */}
      <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-[#fcf8f5] border-b border-[#a65a4a]/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[13px] animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="bg-[#a65a4a] text-white font-bold text-[11px] px-2.5 py-1 rounded-full">
                {selectedIds.size} Donations Selected
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportCSV(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#a65a4a] text-white hover:bg-[#993925] transition-colors cursor-pointer"
              >
                <Download size={13} /> Export Selected CSV
              </button>
              <button
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer border border-rose-300"
              >
                <Trash2 size={13} /> Move to Trash
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {!filteredDonations.length ? (
          <div className="p-12 text-center">
            <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Heart size={24} />
            </div>
            <h4 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e]">No Donations Found</h4>
            <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/50 mt-1 max-w-sm mx-auto">
              No donation records match the chosen search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
              <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded text-[#a65a4a] focus:ring-[#a65a4a] size-4 cursor-pointer accent-[#a65a4a] align-middle"
                      title={isAllPageSelected ? "Deselect page" : "Select entire page"}
                    />
                  </th>
                  <th className="py-3.5 px-4">Receipt Number</th>
                  <th className="py-3.5 px-4">Donor Details</th>
                  <th className="py-3.5 px-4">Campaign / Cause</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a65a4a]/10">
                {paginatedItems.map((item) => {
                  const isAnon = isItemAnon(item);
                  const isSelected = selectedIds.has(String(item.id));
                  const rNum =
                    item.data?.receipt_number ||
                    `MA-REC-${new Date(item.createdAt).getFullYear()}-${String(item.id).padStart(4, "0")}`;
                  const amount = Number(item.data?.amount) || 0;
                  const payMethod = (item.data?.payment_method || "UPI").toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelect(String(item.id))}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? "bg-amber-50/80 hover:bg-amber-100/60" : "hover:bg-[#a65a4a]/5"
                      }`}
                    >
                      <td className="py-3.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(String(item.id))}
                          className="rounded text-[#a65a4a] focus:ring-[#a65a4a] size-4 cursor-pointer accent-[#a65a4a] align-middle"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[#a65a4a]">
                        {rNum}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1e1e1e]">
                            {isAnon ? "Anonymous Donor 🕵️" : item.data?.name || "Donor"}
                          </span>
                          {isAnon && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              Anonymous
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-[#1e1e1e]/50 mt-0.5">
                          {isAnon ? "Details hidden" : item.data?.email || item.data?.phone || "No email"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#1e1e1e] max-w-[200px] truncate" title={item.data?.campaign_name || item.data?.event_name}>
                        {item.data?.campaign_name || item.data?.event_name || "General Empowerment Support"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-['Fraunces',serif] font-bold text-[16px] text-gray-900">
                          ₹{amount.toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-[12px] text-[#1e1e1e]">
                          {isOfflineItem(item) ? (
                            <Banknote size={13} className="text-amber-700 shrink-0" />
                          ) : (
                            <CreditCard size={13} className="text-[#a65a4a] shrink-0" />
                          )}
                          <span>{payMethod}</span>
                          {isOfflineItem(item) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Offline
                            </span>
                          )}
                        </div>
                        {item.data?.transaction_id && (
                          <div className="text-[11px] text-[#1e1e1e]/45 font-mono truncate max-w-[140px]" title={item.data.transaction_id}>
                            Ref: {item.data.transaction_id}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#1e1e1e]/60 whitespace-nowrap text-[12px]">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/donations/${item.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors inline-block"
                            title="Print / View Official Receipt"
                          >
                            <Printer size={15} />
                          </a>

                          <button
                            onClick={() => setSelectedDonation(item)}
                            className="p-1.5 text-gray-500 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors cursor-pointer"
                            title="View donation details"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleDelete(item)}
                            disabled={!canDelete}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move donation to Recycle Bin"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
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

      {/* Donation Detail Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#a65a4a] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#f4efe7]/70">
                  Donation Record
                </span>
                <h4 className="font-['Fraunces',serif] text-[20px] font-semibold">
                  {selectedDonation.data?.receipt_number || `Receipt #${selectedDonation.id}`}
                </h4>
              </div>
              <button
                onClick={() => setSelectedDonation(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-[13px] text-[#1e1e1e]">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <span className="text-gray-500">Contribution Amount</span>
                <span className="font-['Fraunces',serif] text-[24px] font-bold text-[#a65a4a]">
                  ₹{Number(selectedDonation.data?.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Donor Name</span>
                  <p className="font-semibold mt-0.5">
                    {isItemAnon(selectedDonation) ? "Anonymous Supporter" : selectedDonation.data?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Campaign</span>
                  <p className="font-semibold mt-0.5">{selectedDonation.data?.campaign_name || "General Fund"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Email</span>
                  <p className="font-mono text-[12px] mt-0.5">{selectedDonation.data?.email || "Not Provided"}</p>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Phone</span>
                  <p className="font-mono text-[12px] mt-0.5">{selectedDonation.data?.phone || "Not Provided"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Collection Channel</span>
                  <p className="font-semibold mt-0.5 flex items-center gap-1.5">
                    {isOfflineItem(selectedDonation) ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-900">Offline Collection</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-900">Online Gateway / UPI</span>
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Transaction / Ref</span>
                  <p className="font-mono text-[12px] mt-0.5 truncate">{selectedDonation.data?.transaction_id || "N/A"}</p>
                </div>
              </div>

              {selectedDonation.data?.pan_number && (
                <div className="pb-3 border-b border-gray-100">
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">PAN Number</span>
                  <p className="font-mono font-bold mt-0.5">{selectedDonation.data.pan_number}</p>
                </div>
              )}

              {selectedDonation.data?.address && (
                <div className="pb-3 border-b border-gray-100">
                  <span className="text-gray-500 block text-[11px] uppercase font-bold">Address / City</span>
                  <p className="text-[12px] text-gray-800 mt-0.5">{selectedDonation.data.address}</p>
                </div>
              )}

              {selectedDonation.data?.notes && (
                <div className="pb-3 border-b border-gray-100 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/50">
                  <span className="text-amber-800 block text-[11px] uppercase font-bold">Offline Remarks / Notes</span>
                  <p className="text-[12px] text-gray-800 mt-0.5 whitespace-pre-wrap">{selectedDonation.data.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-500 text-[12px]">
                  Date: {new Date(selectedDonation.createdAt).toLocaleString("en-IN")}
                </span>
                <span className="text-[12px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Recorded in Books
                </span>
              </div>
            </div>

            <div className="bg-[#faf7f3] p-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedDonation(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Close
              </button>
              <a
                href={`/api/donations/${selectedDonation.id}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold bg-[#a65a4a] text-white hover:bg-[#993925] transition-colors cursor-pointer"
              >
                <Printer size={14} /> Open Official Printable Receipt <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Manager Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#a65a4a]/20 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#faf7f3]">
              <div>
                <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#1e1e1e]">
                  Manage Causes & Charitable Campaigns
                </h3>
                <p className="text-[13px] text-gray-500 font-['Inter',sans-serif] mt-0.5">
                  Add, reorder, edit goals, and customize funding drives displayed across the site.
                </p>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable Campaign List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 font-['Inter',sans-serif]">
              {editingCampaigns.map((camp, idx) => {
                const canMoveEarlier = idx > 0;
                const canMoveLater = idx < editingCampaigns.length - 1;

                return (
                  <div
                    key={camp.id || idx}
                    className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-[#a65a4a]/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] text-[12px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[12px] font-medium text-gray-400 font-mono">
                          ID: {camp.id}
                        </span>
                      </div>

                      {/* Reorder & Delete Toolbar */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveCampaign(idx, -1)}
                          disabled={!canMoveEarlier}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2.5 py-1 rounded-lg transition-all ${
                            canMoveEarlier
                              ? "border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white cursor-pointer shadow-2xs"
                              : "border-gray-200 text-gray-400 bg-gray-50 opacity-40 cursor-not-allowed"
                          }`}
                          title={canMoveEarlier ? "Move this campaign earlier / higher" : "Already first"}
                        >
                          <ArrowUp size={12} />
                          <span>Move Earlier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCampaign(idx, 1)}
                          disabled={!canMoveLater}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2.5 py-1 rounded-lg transition-all ${
                            canMoveLater
                              ? "border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white cursor-pointer shadow-2xs"
                              : "border-gray-200 text-gray-400 bg-gray-50 opacity-40 cursor-not-allowed"
                          }`}
                          title={canMoveLater ? "Move this campaign later / lower" : "Already last"}
                        >
                          <ArrowDown size={12} />
                          <span>Move Later</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCampaign(idx)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                          title="Delete Campaign"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          Campaign Title
                        </label>
                        <input
                          type="text"
                          value={camp.name}
                          onChange={(e) => handleUpdateEditingCampaign(idx, { name: e.target.value })}
                          placeholder="e.g. Help Build Community Learning Centres"
                          className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          Category / Tag
                        </label>
                        <input
                          type="text"
                          value={camp.tag}
                          onChange={(e) => handleUpdateEditingCampaign(idx, { tag: e.target.value })}
                          placeholder="e.g. Education, Leadership, Health"
                          className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          Target Goal Amount (₹)
                        </label>
                        <input
                          type="number"
                          min={1000}
                          step={5000}
                          value={camp.goal}
                          onChange={(e) => handleUpdateEditingCampaign(idx, { goal: Number(e.target.value) || 0 })}
                          className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          Base Offline Raised (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={5000}
                          value={camp.raised}
                          onChange={(e) => handleUpdateEditingCampaign(idx, { raised: Number(e.target.value) || 0 })}
                          className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          Website donations will automatically sum on top of this base amount.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddNewCampaign}
                className="w-full py-2.5 border-2 border-dashed border-[#a65a4a]/30 hover:border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a]/5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Add Another Campaign
              </button>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#faf7f3] p-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAllCampaigns}
                disabled={savingCampaigns}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold bg-[#a65a4a] text-white hover:bg-[#993925] disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
              >
                {savingCampaigns ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Save All Campaigns
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Offline Donation Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#a65a4a]/20 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#faf7f3]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Banknote size={20} />
                </span>
                <div>
                  <h3 className="font-['Fraunces',serif] text-xl font-bold text-[#1e1e1e]">
                    Record Offline Donation
                  </h3>
                  <p className="text-[12px] text-gray-500 font-['Inter',sans-serif] mt-0.5">
                    Log cash, cheque, bank transfer, or event receipts into books of account.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveOfflineDonation} className="p-6 overflow-y-auto space-y-4 font-['Inter',sans-serif] text-[13px]">
              {/* Donor Identification */}
              <div className="bg-[#faf7f3] p-4 rounded-xl border border-[#a65a4a]/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#a65a4a]">
                    Donor Identification
                  </span>
                  <label className="flex items-center gap-2 text-[12px] text-gray-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offlineForm.anonymous}
                      onChange={(e) =>
                        setOfflineForm((prev) => ({
                          ...prev,
                          anonymous: e.target.checked,
                          name: e.target.checked ? "Anonymous Supporter" : "",
                        }))
                      }
                      className="rounded text-[#a65a4a] focus:ring-[#a65a4a] size-4 accent-[#a65a4a] cursor-pointer"
                    />
                    <span>Record as Anonymous Donor</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    Donor Full Name {!offlineForm.anonymous && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    disabled={offlineForm.anonymous}
                    value={offlineForm.name}
                    onChange={(e) => setOfflineForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={offlineForm.anonymous ? "Anonymous Supporter" : "e.g. Ramesh Sharma"}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a] disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={offlineForm.email}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. ramesh@example.com"
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Receives official digital receipt if provided
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={offlineForm.phone}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      PAN Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={offlineForm.pan_number}
                      onChange={(e) =>
                        setOfflineForm((prev) => ({ ...prev, pan_number: e.target.value.toUpperCase() }))
                      }
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2 text-[13px] font-mono uppercase rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Address / City <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={offlineForm.address}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g. Visakhapatnam, Andhra Pradesh"
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                    />
                  </div>
                </div>
              </div>

              {/* Contribution Specifics */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#a65a4a] block">
                  Contribution Specifics
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Contribution Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        min={1}
                        step={100}
                        required
                        value={offlineForm.amount}
                        onChange={(e) => setOfflineForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="5000"
                        className="w-full pl-7 pr-3 py-2 text-[14px] font-bold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Payment Channel / Mode <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={offlineForm.payment_method}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a] bg-white cursor-pointer"
                    >
                      <option value="cash">💵 Cash (Physical Handover)</option>
                      <option value="cheque">📝 Cheque / Demand Draft</option>
                      <option value="bank_transfer">🏦 Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="upi">📱 Direct UPI / QR Code</option>
                      <option value="other">📦 Other In-person Donation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Cheque / Ref No. / Transaction ID <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={offlineForm.transaction_id}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, transaction_id: e.target.value }))}
                      placeholder={
                        offlineForm.payment_method === "cheque"
                          ? "e.g. Cheque #492810 (SBI)"
                          : "e.g. UTR-202611029148"
                      }
                      className="w-full px-3 py-2 text-[13px] font-mono rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Received Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={offlineForm.date}
                      onChange={(e) => setOfflineForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a] bg-white cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    Target Campaign / Cause
                  </label>
                  <select
                    value={offlineForm.campaign_name}
                    onChange={(e) => setOfflineForm((prev) => ({ ...prev, campaign_name: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a] bg-white cursor-pointer"
                  >
                    <option value="General Empowerment Support">General Empowerment Support</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    Internal Notes / Event Remarks <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={offlineForm.notes}
                    onChange={(e) => setOfflineForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Collected during annual grassroots gathering; deposited into current a/c on Monday."
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/30 focus:border-[#a65a4a] resize-y"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowOfflineModal(false)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffline}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#a65a4a] text-white hover:bg-[#993925] disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                >
                  {savingOffline ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Recording Receipt...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Record & Issue Official Receipt
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

