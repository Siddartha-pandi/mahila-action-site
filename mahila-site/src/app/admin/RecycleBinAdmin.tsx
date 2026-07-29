"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Trash2, RotateCcw, AlertTriangle, Search, Filter } from "lucide-react";
import {
  getRecycleBinItems,
  restoreFromRecycleBin,
  permanentlyDeleteFromRecycleBin,
  emptyRecycleBin,
  TrashItem,
  TrashType,
} from "@/lib/recycleBin";

export function RecycleBinAdmin({
  onRestoreItem,
}: {
  onRestoreItem: (item: TrashItem) => void;
}) {
  const [items, setItems] = useState<TrashItem[]>(() => getRecycleBinItems());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    function syncTrash() {
      setItems(getRecycleBinItems());
    }
    syncTrash();
    window.addEventListener("mahila_recycle_bin_changed", syncTrash);
    window.addEventListener("storage", syncTrash);
    return () => {
      window.removeEventListener("mahila_recycle_bin_changed", syncTrash);
      window.removeEventListener("storage", syncTrash);
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.typeLabel.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || item.originalType === typeFilter;
      return matchSearch && matchType;
    });
  }, [items, search, typeFilter]);

  function handleRestore(item: TrashItem) {
    const restored = restoreFromRecycleBin(item.id);
    if (restored) {
      onRestoreItem(restored);
      setItems(getRecycleBinItems());
      toast.success(`Restored '${item.title}' back to ${item.typeLabel}!`);
    }
  }

  function handlePermanentDelete(item: TrashItem) {
    if (!confirm(`Are you sure you want to permanently delete '${item.title}'? This action CANNOT be undone.`)) {
      return;
    }
    permanentlyDeleteFromRecycleBin(item.id);
    setItems(getRecycleBinItems());
    toast.success(`Permanently deleted '${item.title}'.`);
  }

  function handleEmptyBin() {
    if (items.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ALL ${items.length} items in the Recycle Bin? This action CANNOT be undone.`)) {
      return;
    }
    emptyRecycleBin();
    setItems([]);
    toast.success("Recycle Bin emptied successfully.");
  }

  return (
    <div className="bg-white rounded-2xl border border-[#a65a4a]/20 shadow-sm p-6 max-w-[900px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#a65a4a]/15">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <Trash2 size={18} />
            </div>
            <h3 className="font-['Fraunces',serif] text-[20px] font-bold text-[#1e1e1e]">Recycle Bin</h3>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#a65a4a]/10 text-[#a65a4a]">
              {items.length} {items.length === 1 ? "Item" : "Items"}
            </span>
          </div>
          <p className="font-['Inter',sans-serif] text-[12.5px] text-[#1e1e1e]/60 mt-1">
            Deleted events, stories, and content milestones are held here. You can restore them anytime or delete them permanently.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleEmptyBin}
            className="self-start sm:self-center bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 font-['Inter',sans-serif] text-[12.5px] font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Trash2 size={15} />
            <span>Empty Recycle Bin</span>
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-3 my-4">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trashed items..."
              className="w-full pl-9 pr-4 py-2 bg-[#faf8f5] border border-[#a65a4a]/20 rounded-xl text-[13px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={15} className="text-[#1e1e1e]/50 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto bg-[#faf8f5] border border-[#a65a4a]/20 rounded-xl px-3 py-2 text-[13px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] cursor-pointer"
            >
              <option value="all">All Content Types</option>
              <option value="event">Upcoming Events</option>
              <option value="story">Community Stories</option>
              <option value="category">Categories</option>
              <option value="councilor">Councilors</option>
              <option value="timeline">Timeline Milestones</option>
            </select>
          </div>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length > 0 ? (
        <div className="flex flex-col gap-2.5 mt-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#faf8f5] border border-[#a65a4a]/15 hover:border-[#a65a4a]/40 rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex flex-col gap-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#a65a4a]/12 text-[#a65a4a]">
                    {item.typeLabel}
                  </span>
                  <span className="text-[11px] font-['Inter',sans-serif] text-[#1e1e1e]/45">
                    Deleted: {new Date(item.deletedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <h4 className="font-['Inter',sans-serif] font-bold text-[15px] text-[#1e1e1e] mt-0.5">
                  {item.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleRestore(item)}
                  className="bg-[#a65a4a] text-[#f4efe7] hover:bg-[#993925] font-['Inter',sans-serif] text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Restore item back to active site content"
                >
                  <RotateCcw size={14} />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => handlePermanentDelete(item)}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-['Inter',sans-serif] text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                  title="Delete permanently"
                >
                  <Trash2 size={14} />
                  <span>Delete Forever</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center flex flex-col items-center justify-center">
          <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mb-3">
            <Trash2 size={32} />
          </div>
          <h4 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">
            {items.length === 0 ? "Recycle Bin is Empty" : "No Matching Trashed Items"}
          </h4>
          <p className="font-['Inter',sans-serif] text-[13.5px] text-[#1e1e1e]/55 max-w-sm mt-1">
            {items.length === 0
              ? "Items deleted from events, stories, councilors, or timeline will appear here so you can restore them whenever needed."
              : "No items found matching your current search filter."}
          </p>
        </div>
      )}
    </div>
  );
}
