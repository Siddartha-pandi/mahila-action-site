import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Trash2,
  RotateCcw,
  Search,
  Calendar,
  MessageSquare,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  getTrashItems,
  restoreTrashItem,
  removeFromTrash,
  clearTrash,
  TrashItem,
} from "../../lib/recycleBin";
import { getCurrentAdminSession, hasPermission } from "../../lib/permissions";

export function RecycleBinAdmin() {
  const [items, setItems] = useState<TrashItem[]>(() => getTrashItems());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const session = getCurrentAdminSession();
  const canDelete = hasPermission(session, "trash" as any, "delete") ?? true;
  const canEdit = hasPermission(session, "trash" as any, "edit") ?? true;

  function reload() {
    setItems(getTrashItems());
  }

  useEffect(() => {
    reload();

    function handleSync() {
      reload();
    }

    window.addEventListener("mahila_trash_changed", handleSync);
    window.addEventListener("storage", handleSync);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("mahila_live_channel");
      channel.onmessage = (e) => {
        if (e.data?.type === "trash_changed") handleSync();
      };
    }

    return () => {
      window.removeEventListener("mahila_trash_changed", handleSync);
      window.removeEventListener("storage", handleSync);
      if (channel) channel.close();
    };
  }, []);

  function handleRestore(item: TrashItem) {
    const ok = restoreTrashItem(item);
    if (ok) {
      toast.success(`Restored "${item.title}" successfully!`);
      reload();
    } else {
      toast.error(`Could not restore "${item.title}".`);
    }
  }

  function handlePermanentDelete(item: TrashItem) {
    if (!confirm(`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    removeFromTrash(item.id, item.type);
    toast.success(`Permanently deleted "${item.title}".`);
    reload();
  }

  function handleEmptyTrash() {
    if (!items.length) {
      return toast.error("Recycle Bin is already empty.");
    }
    if (!confirm("Are you sure you want to EMPTY the Recycle Bin? All deleted items will be permanently erased!")) {
      return;
    }
    clearTrash();
    toast.success("Recycle Bin emptied successfully.");
    reload();
  }

  const eventsCount = items.filter((i) => i.type === "event").length;
  const submissionsCount = items.filter((i) => i.type === "submission").length;
  const contentCount = items.filter((i) => i.type !== "event" && i.type !== "submission").length;

  const filtered = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = (item.subtitle || "").toLowerCase().includes(q);
      if (!matchTitle && !matchSub) return false;
    }
    return true;
  });

  const getTypeIcon = (type: TrashItem["type"]) => {
    switch (type) {
      case "event":
        return <Calendar className="size-4 text-amber-600" />;
      case "submission":
        return <MessageSquare className="size-4 text-blue-600" />;
      case "blog":
        return <FileText className="size-4 text-emerald-600" />;
      case "councilor":
        return <Users className="size-4 text-purple-600" />;
      case "timeline":
        return <Clock className="size-4 text-[#a65a4a]" />;
      default:
        return <Trash2 className="size-4 text-gray-600" />;
    }
  };

  const TYPE_LABEL: Record<TrashItem["type"], string> = {
    event: "Event",
    submission: "Submission",
    blog: "Blog Post",
    councilor: "Councilor",
    timeline: "Timeline Milestone",
    story: "Story",
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1150px] font-['Inter',sans-serif]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#a65a4a]/15 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="size-5 text-[#a65a4a]" />
            <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">
              Recycle Bin (Trash)
            </h3>
          </div>
          <p className="text-[13px] text-[#1e1e1e]/60 mt-0.5">
            Deleted items are held here safely. You can restore them anytime or permanently erase them.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={reload}
            className="inline-flex items-center gap-2 border border-[#a65a4a]/30 text-[#a65a4a] font-medium text-[13px] px-4 py-2.5 rounded-xl hover:bg-[#a65a4a]/10 transition-colors cursor-pointer"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={handleEmptyTrash}
            disabled={!items.length}
            className="inline-flex items-center gap-2 bg-rose-600 text-white font-medium text-[13px] px-4 py-2.5 rounded-xl hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={15} /> Empty Recycle Bin
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Trash Items</span>
            <Trash2 size={18} />
          </div>
          <p className="text-[22px] font-bold text-gray-900">{items.length}</p>
          <p className="text-[12px] text-gray-500">Deleted items in bin</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Deleted Events</span>
            <Calendar size={18} />
          </div>
          <p className="text-[22px] font-bold text-gray-900">{eventsCount}</p>
          <p className="text-[12px] text-gray-500">Restorable events</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Deleted Submissions</span>
            <MessageSquare size={18} />
          </div>
          <p className="text-[22px] font-bold text-gray-900">{submissionsCount}</p>
          <p className="text-[12px] text-gray-500">Restorable forms</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Other Content</span>
            <FileText size={18} />
          </div>
          <p className="text-[22px] font-bold text-gray-900">{contentCount}</p>
          <p className="text-[12px] text-gray-500">Blogs, councilors, timeline</p>
        </div>
      </div>

      {/* Control Bar: Search & Type Filter */}
      <div className="bg-white p-4 rounded-xl border border-[#a65a4a]/15 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-[#1e1e1e]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recycle bin…"
              className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-[#a65a4a]/25 rounded-lg focus:outline-none focus:border-[#a65a4a]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-[12px] border border-[#a65a4a]/25 rounded-lg bg-white focus:outline-none focus:border-[#a65a4a] text-gray-700 font-medium"
          >
            <option value="all">All Item Types ({items.length})</option>
            <option value="event">🗓️ Events ({eventsCount})</option>
            <option value="submission">✉️ Submissions ({submissionsCount})</option>
            <option value="blog">📝 Blog Posts</option>
            <option value="councilor">👤 Councilors</option>
            <option value="timeline">⏳ Timeline Milestones</option>
          </select>
        </div>

        <p className="text-[12px] text-gray-500 font-medium shrink-0">
          Showing {filtered.length} of {items.length} items
        </p>
      </div>

      {/* Recycle Bin Table */}
      <div className="bg-white rounded-2xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
        {!filtered.length ? (
          <div className="p-12 text-center">
            <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} />
            </div>
            <h4 className="font-['Fraunces',serif] text-[16px] font-semibold text-[#1e1e1e]">
              Recycle Bin is Empty
            </h4>
            <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/50 mt-1 max-w-sm mx-auto">
              When you delete events, submissions, or site content, they will appear here so you can easily restore them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-['Inter',sans-serif] text-[13px]">
              <thead className="bg-[#faf7f3] border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider text-[#1e1e1e]/55">
                <tr>
                  <th className="py-3.5 px-4">Item Type</th>
                  <th className="py-3.5 px-4">Title / Name</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">Deleted Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a65a4a]/10">
                {filtered.map((item) => (
                  <tr key={`${item.type}_${item.id}`} className="hover:bg-[#a65a4a]/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="font-semibold text-[#1e1e1e]">
                          {TYPE_LABEL[item.type] || item.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#1e1e1e]">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-4 text-[#1e1e1e]/60 text-[12px]">
                      {item.subtitle || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-[#1e1e1e]/60 whitespace-nowrap text-[12px]">
                      {new Date(item.deletedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Restore back to live site"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item)}
                          className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-200 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Permanently erase"
                        >
                          <Trash2 size={14} /> Erase
                        </button>
                      </div>
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
}
