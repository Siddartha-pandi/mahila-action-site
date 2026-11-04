"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  FileVideo,
  FileText,
  Image as ImageIcon,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Search,
  AlertCircle,
  Play,
  Eye,
  Download,
  Folder,
  HardDrive,
  Grid,
  List,
  X,
  Upload,
  Sparkles,
  RefreshCcw,
  Square,
  CheckSquare,
} from "lucide-react";

export interface MediaItem {
  id: number;
  filename: string;
  mimeType: string;
  byteSize: number;
  driveFileId?: string;
  url: string;
  localUrl: string;
  thumbnailUrl?: string;
  mediaType: "image" | "video" | "pdf" | "document";
  metadata?: any;
  createdAt: string;
}

export function MediaAdmin() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "image" | "video" | "pdf">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // One-way Auto-sync is always enabled
  const [lastAutoSynced, setLastAutoSynced] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Modals state
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Upload modal & duplicate cleaner state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);

  // Google Drive status state
  const [driveStatus, setDriveStatus] = useState<{
    configured: boolean;
    connected: boolean;
    email?: string;
    folderId?: string;
    folderName?: string;
  }>({ configured: false, connected: false });

  // Copied URL feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchMedia = useCallback(
    async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedType !== "all") params.set("type", selectedType);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        params.set("limit", "100");
        params.set("_t", Date.now().toString());
        // One-way auto-sync is always active
        params.set("sync", "auto");

        const token = typeof window !== "undefined"
          ? (sessionStorage.getItem("admin_jwt") || localStorage.getItem("admin_jwt"))
          : null;
        const validJwt = token && token !== "session" && token.includes(".") ? token : null;
        const headers: Record<string, string> = validJwt ? { Authorization: `Bearer ${validJwt}` } : {};

        const res = await fetch(`/api/media?${params.toString()}`, {
          headers,
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load media items");
        const data = await res.json();
        if (data.ok) {
          setItems(data.items || []);
          setLastAutoSynced(
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load media library");
      } finally {
        setLoading(false);
      }
    },
    [selectedType, searchQuery]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<{
        ok?: boolean;
        configured?: boolean;
        connected?: boolean;
        email?: string;
        folderId?: string;
        folderName?: string;
      }>("/api/admin/google-drive/status");

      if (res.ok && res.data) {
        setDriveStatus(res.data as any);
      } else {
        const directRes = await fetch("/api/admin/google-drive/status", { cache: "no-store" });
        if (directRes.ok) {
          const data = await directRes.json();
          setDriveStatus(data);
        }
      }
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Real-time One-Way Auto-Sync: Runs in background every 45s & on tab window focus
  useEffect(() => {
    // 1. Periodic background sync every 45s
    const interval = setInterval(() => {
      fetchMedia();
    }, 45000);

    // 2. Auto-sync on window focus (e.g. when returning after deleting in Google Drive)
    const handleFocus = () => {
      fetchMedia();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchMedia]);

  // Handle single item deletion
  async function handleDeleteConfirm() {
    if (!deleteItem) return;
    const targetItem = deleteItem;
    try {
      setDeleting(true);
      const res = await api.del<{ ok?: boolean; error?: string }>(`/api/media/${targetItem.id}`);
      if (!res.ok && res.status !== 404) {
        throw new Error(res.error || "Failed to delete file");
      }

      toast.success(`Deleted "${targetItem.filename}" from Google Drive and database`);

      // Optimistically remove from state immediately
      setItems((prev) => prev.filter((item) => item.id !== targetItem.id));
      setSelectedIds((prev) => prev.filter((id) => id !== targetItem.id));
      setDeleteItem(null);

      fetchMedia();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    } finally {
      setDeleting(false);
    }
  }

  // Handle bulk deletion
  async function handleBulkDeleteConfirm() {
    if (selectedIds.length === 0) return;
    try {
      setDeletingBulk(true);
      const res = await api.del<{ ok?: boolean; deletedCount?: number; error?: string }>("/api/media", {
        ids: selectedIds,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to delete selected items");
      }

      toast.success(`Deleted ${res.data?.deletedCount || selectedIds.length} media item(s) successfully!`);

      const idsToRemove = new Set(selectedIds);
      setItems((prev) => prev.filter((item) => !idsToRemove.has(item.id)));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);

      fetchMedia();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected files");
    } finally {
      setDeletingBulk(false);
    }
  }

  // Handle manual sync with Google Drive
  async function handleSyncDrive() {
    setSyncingDrive(true);
    try {
      const res = await api.post<{
        ok: boolean;
        prunedCount: number;
        importedCount: number;
        message: string;
      }>("/api/media/sync");

      if (res.ok && res.data) {
        if (res.data.prunedCount > 0 || res.data.importedCount > 0) {
          toast.success(res.data.message);
        } else {
          toast.info(res.data.message || "All Google Drive items match the catalog.");
        }
        setLastAutoSynced(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        fetchMedia();
        fetchStatus();
      } else {
        toast.error(res.error || "Failed to sync with Google Drive.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync with Google Drive.");
    } finally {
      setSyncingDrive(false);
    }
  }

  // Selection toggle helpers
  const allCurrentIds = items.map((i) => i.id);
  const isAllSelected = allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allCurrentIds);
    }
  }

  function toggleSelectItem(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Handle URL copy
  function handleCopyUrl(item: MediaItem) {
    const urlToCopy = item.url.startsWith("http")
      ? item.url
      : `${window.location.origin}${item.localUrl}`;
    navigator.clipboard.writeText(urlToCopy);
    setCopiedId(item.id);
    toast.success("Public URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  }

  const [connectingDrive, setConnectingDrive] = useState(false);

  // Authenticate Google Drive via API with current admin bearer token
  async function handleConnectGoogleDrive() {
    try {
      setConnectingDrive(true);
      const res = await api.get<{ ok?: boolean; url?: string }>("/api/admin/google-drive/auth");
      if (res.ok && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.error || "Failed to start Google Drive authentication. Please ensure you are logged in as admin.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to Google Drive.");
    } finally {
      setConnectingDrive(false);
    }
  }

  // Handle direct file upload with custom title & duplicate detection
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }

      const token = typeof window !== "undefined"
        ? (sessionStorage.getItem("admin_jwt") || localStorage.getItem("admin_jwt"))
        : null;
      const validJwt = token && token !== "session" && token.includes(".") ? token : null;
      const headers: Record<string, string> = validJwt ? { Authorization: `Bearer ${validJwt}` } : {};

      const res = await fetch("/api/media", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.duplicate) {
        toast.info(data.message || `Duplicate prevented! Reused "${data.filename}".`);
      } else {
        toast.success(`Uploaded as "${data.filename}" (ID: ${data.id})`);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      fetchMedia();
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  }

  // Handle duplicate cleanup
  async function handleCleanDuplicates() {
    if (!confirm("Are you sure you want to clean up duplicate media records? Only unique items will be retained.")) return;
    setCleaningDuplicates(true);
    try {
      const res = await api.post<{ ok: boolean; removedCount: number; message: string }>("/api/media/deduplicate");
      if (res.ok && res.data) {
        toast.success(res.data.message || `Removed ${res.data.removedCount} duplicate items!`);
        fetchMedia();
        fetchStatus();
      } else {
        toast.error(res.error || "Failed to clean duplicates.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to clean duplicates.");
    } finally {
      setCleaningDuplicates(false);
    }
  }

  // Format bytes helper
  function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // Format date helper
  function formatDate(iso: string) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  // Counts by type
  const counts = {
    all: items.length,
    image: items.filter((i) => i.mediaType === "image").length,
    video: items.filter((i) => i.mediaType === "video").length,
    pdf: items.filter((i) => i.mediaType === "pdf" || i.mediaType === "document").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Inter',sans-serif]">
      {/* 1. Storage Status Banner with Auto-Sync Toggle */}
      <div className="bg-white rounded-2xl p-5 border border-[#a65a4a]/15 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-[#1e1e1e]">Google Drive Storage</h3>
              {driveStatus.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                  <AlertCircle className="w-3 h-3" /> Not Connected
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#1e1e1e]/60">Personal Gmail &bull; API v3 OAuth 2.0</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#1e1e1e]/70">
          {driveStatus.connected ? (
            <>
              {/* Always-on Auto-Sync Badge */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs select-none"
                title="One-way auto-sync is always active: Automatically detects and purges images deleted in Google Drive"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-Sync Active</span>
              </span>

              {lastAutoSynced && (
                <span className="text-[11px] text-[#1e1e1e]/50 hidden lg:inline" title="Last auto-synced with Google Drive">
                  Synced: {lastAutoSynced}
                </span>
              )}

              <span className="truncate max-w-[180px] hidden sm:inline" title={driveStatus.email}>
                <strong>{driveStatus.email || "Active"}</strong>
              </span>

              {driveStatus.folderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${driveStatus.folderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#a65a4a] hover:underline flex items-center gap-1 font-semibold"
                >
                  Open Folder <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </>
          ) : (
            <button
              onClick={handleConnectGoogleDrive}
              disabled={connectingDrive}
              className="text-[#a65a4a] hover:underline font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-60 bg-transparent border-0 p-0"
            >
              {connectingDrive ? "Connecting..." : "Connect Personal Google Drive"} <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter, Search & View Controls */}
      <div className="bg-white rounded-2xl p-4 border border-[#a65a4a]/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: "all", label: "All Media", count: counts.all },
              { id: "image", label: "Images", count: counts.image },
              { id: "video", label: "Videos", count: counts.video },
              { id: "pdf", label: "PDFs & Docs", count: counts.pdf },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedType === t.id
                  ? "bg-[#a65a4a] text-white shadow-xs"
                  : "bg-[#f4efe7]/60 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedType === t.id ? "bg-white/20 text-white" : "bg-[#1e1e1e]/10 text-[#1e1e1e]/60"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & layout switch & action buttons */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-[#1e1e1e]/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4efe7]/40 border border-[#a65a4a]/20 rounded-full pl-9 pr-4 py-1.5 text-[13px] text-[#1e1e1e] placeholder-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a]"
            />
          </div>

          <div className="flex items-center border border-[#a65a4a]/20 rounded-full p-0.5 bg-[#f4efe7]/40">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                viewMode === "grid" ? "bg-white text-[#a65a4a] shadow-xs" : "text-[#1e1e1e]/50 hover:text-[#a65a4a]"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                viewMode === "table" ? "bg-white text-[#a65a4a] shadow-xs" : "text-[#1e1e1e]/50 hover:text-[#a65a4a]"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sync with Google Drive button */}
          {/* <button
            onClick={handleSyncDrive}
            disabled={syncingDrive}
            className="p-2 rounded-full border border-sky-300 hover:bg-sky-50 text-sky-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Sync with Google Drive now (purges deleted files & imports new files)"
          >
            <RefreshCcw className={`w-4 h-4 ${syncingDrive ? "animate-spin" : ""}`} />
          </button> */}

          {/* Clean duplicates */}
          {/* <button
            onClick={handleCleanDuplicates}
            disabled={cleaningDuplicates}
            className="p-2 rounded-full border border-amber-300 hover:bg-amber-50 text-amber-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Clean Duplicate Images"
          >
            <Sparkles className={`w-4 h-4 ${cleaningDuplicates ? "animate-spin" : ""}`} />
          </button> */}

          {/* Refresh */}
          <button
            onClick={() => fetchMedia()}
            className="p-2 rounded-full border border-[#a65a4a]/20 hover:bg-[#a65a4a]/10 text-[#1e1e1e]/60 hover:text-[#a65a4a] transition-colors cursor-pointer"
            title="Refresh Library"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Upload */}
          {/* <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#a65a4a] text-white hover:bg-[#8b263e] transition-colors text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Media
          </button> */}
        </div>
      </div>

      {/* 3. Bulk Selection Floating / Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-[13px] shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-900 font-semibold">
            <CheckSquare className="w-4 h-4 text-rose-600" />
            <span>{selectedIds.length} media item{selectedIds.length === 1 ? "" : "s"} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1 rounded-full border border-rose-300 text-rose-800 hover:bg-rose-100 font-medium text-[12px] cursor-pointer"
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 rounded-full text-stone-600 hover:text-stone-900 font-medium text-[12px] cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[12px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* 4. Media Content Display */}
      {loading && items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-[#a65a4a]/15 text-center shadow-xs">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#a65a4a] mx-auto mb-3" />
          <p className="text-[13px] text-[#1e1e1e]/60">Loading media library from Google Drive &amp; PostgreSQL...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-[#a65a4a]/15 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-3">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e]">No Media Items Found</h3>
          <p className="text-[13px] text-[#1e1e1e]/60 mt-1">
            {searchQuery ? "No items match your search query." : "No media items currently stored."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const isCopied = copiedId === item.id;
            const isVideo = item.mediaType === "video";
            const isPdf = item.mediaType === "pdf" || item.mediaType === "document";
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col group relative overflow-hidden ${
                  isSelected ? "border-red-500 ring-2 ring-red-400 shadow-md" : "border-[#a65a4a]/15 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Selection Checkbox */}
                <div
                  className="absolute top-2 right-2 z-20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectItem(item.id);
                  }}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shadow-xs ${
                      isSelected
                        ? "bg-red-600 text-white"
                        : "bg-black/40 backdrop-blur-xs text-white hover:bg-black/70"
                    }`}
                    title={isSelected ? "Deselect" : "Select item"}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 opacity-80" />
                    )}
                  </div>
                </div>

                {/* Media Preview Box */}
                <div
                  className="aspect-square bg-[#f4efe7] relative overflow-hidden flex items-center justify-center cursor-pointer select-none"
                  onClick={() => setPreviewItem(item)}
                >
                  {isVideo ? (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white p-3 relative group-hover:scale-105 transition-transform duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 group-hover:bg-[#a65a4a] transition-colors">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Video</span>
                    </div>
                  ) : isPdf ? (
                    <div className="w-full h-full bg-rose-50 flex flex-col items-center justify-center text-rose-800 p-3 group-hover:scale-105 transition-transform duration-300">
                      <FileText className="w-12 h-12 text-rose-600 mb-1" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600">PDF Document</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl || item.url || item.localUrl}
                      alt={item.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const streamUrl = `${item.localUrl}?stream=true`;
                        if (item.localUrl && !target.src.includes("stream=true")) {
                          target.src = streamUrl;
                        }
                      }}
                    />
                  )}

                  {/* Public access badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 backdrop-blur-xs text-white flex items-center gap-1 pointer-events-none">
                    <Eye className="w-2.5 h-2.5" /> Public
                  </div>
                </div>

                {/* Details & Actions */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-[#1e1e1e] truncate" title={item.filename}>
                      {item.filename}
                    </p>
                    <p className="text-[11px] text-[#1e1e1e]/50 mt-0.5 flex items-center justify-between">
                      <span>{formatBytes(item.byteSize)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1e1e1e]/10 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleCopyUrl(item)}
                      className={`p-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        isCopied
                          ? "bg-emerald-100 text-emerald-800"
                          : "text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10"
                      }`}
                      title="Copy Public URL"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setPreviewItem(item)}
                      className="p-1.5 rounded-lg text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 transition-colors cursor-pointer"
                      title="Preview Media"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteItem(item)}
                      className="p-1.5 rounded-lg text-[#1e1e1e]/40 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-[#a65a4a]/15 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f4efe7]/80 text-[#1e1e1e]/70 border-b border-[#a65a4a]/15 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-stone-600 hover:text-stone-900"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Drive File ID</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a65a4a]/10">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isSelected ? "bg-red-50/60" : "hover:bg-[#fbf9f6]"
                      }`}
                    >
                      <td className="py-3 px-4 w-10">
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(item.id)}
                          className="cursor-pointer text-stone-600 hover:text-stone-900"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-red-600" />
                          ) : (
                            <Square className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#f4efe7] overflow-hidden shrink-0 flex items-center justify-center">
                          {item.mediaType === "video" ? (
                            <FileVideo className="w-5 h-5 text-purple-600" />
                          ) : item.mediaType === "pdf" ? (
                            <FileText className="w-5 h-5 text-rose-600" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnailUrl || item.url || item.localUrl}
                              alt={item.filename}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const streamUrl = `${item.localUrl}?stream=true`;
                                if (item.localUrl && !target.src.includes("stream=true")) {
                                  target.src = streamUrl;
                                }
                              }}
                            />
                          )}
                        </div>
                        <span className="font-medium text-[#1e1e1e] truncate max-w-xs">{item.filename}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] uppercase font-semibold bg-[#a65a4a]/10 text-[#a65a4a]">
                          {item.mediaType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[12px]">{formatBytes(item.byteSize)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#1e1e1e]/60">
                        {item.driveFileId ? (
                          <span className="truncate max-w-[120px] inline-block">{item.driveFileId}</span>
                        ) : (
                          <span className="text-[#1e1e1e]/40">Local DB</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#1e1e1e]/60">{formatDate(item.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCopyUrl(item)}
                            className="p-1.5 rounded-lg hover:bg-[#a65a4a]/10 text-[#1e1e1e]/60 hover:text-[#a65a4a] cursor-pointer"
                            title="Copy Public URL"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 rounded-lg hover:bg-[#a65a4a]/10 text-[#1e1e1e]/60 hover:text-[#a65a4a] cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(item)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[#1e1e1e]/40 hover:text-red-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* 5. Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#a65a4a]/20">
            {/* Modal Header */}
            <div className="bg-[#a65a4a] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 truncate pr-4">
                {previewItem.mediaType === "video" ? (
                  <FileVideo className="w-5 h-5 text-purple-200" />
                ) : previewItem.mediaType === "pdf" ? (
                  <FileText className="w-5 h-5 text-rose-200" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-blue-200" />
                )}
                <h3 className="font-semibold text-[15px] truncate">{previewItem.filename}</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Content Viewer */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#f4efe7]/50 min-h-[350px]">
              {previewItem.mediaType === "video" ? (
                <div className="w-full max-w-2xl bg-black rounded-xl overflow-hidden shadow-lg">
                  <video
                    src={previewItem.localUrl}
                    controls
                    playsInline
                    className="w-full max-h-[60vh]"
                  />
                </div>
              ) : previewItem.mediaType === "pdf" ? (
                <div className="w-full h-[65vh] rounded-xl overflow-hidden shadow-lg border border-[#a65a4a]/20 bg-white">
                  <iframe
                    src={previewItem.url || previewItem.localUrl}
                    className="w-full h-full"
                    title={previewItem.filename}
                  />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewItem.url || previewItem.localUrl}
                  alt={previewItem.filename}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const streamUrl = `${previewItem.localUrl}?stream=true`;
                    if (previewItem.localUrl && !target.src.includes("stream=true")) {
                      target.src = streamUrl;
                    }
                  }}
                />
              )}
            </div>

            {/* Modal Footer & Details */}
            <div className="p-4 bg-white border-t border-[#1e1e1e]/10 flex flex-wrap items-center justify-between gap-3 text-[13px]">
              <div className="flex items-center gap-4 text-[#1e1e1e]/60">
                <span>
                  Size: <strong>{formatBytes(previewItem.byteSize)}</strong>
                </span>
                <span>
                  Format: <strong>{previewItem.mimeType}</strong>
                </span>
                {previewItem.driveFileId && (
                  <span>
                    Drive ID: <code className="bg-[#f4efe7] px-1 py-0.5 rounded text-[11px]">{previewItem.driveFileId}</code>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyUrl(previewItem)}
                  className="px-4 py-2 rounded-full bg-[#f4efe7] text-[#a65a4a] hover:bg-[#a65a4a]/10 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Public URL
                </button>
                <a
                  href={`/api/media/${previewItem.id}?download=true`}
                  className="px-4 py-2 rounded-full bg-[#a65a4a] text-white hover:bg-[#8b263e] font-semibold flex items-center gap-1.5 transition-colors"
                  download={previewItem.filename}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Single Item Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-center text-[#1e1e1e]">
              Delete Media Item?
            </h3>
            <p className="text-[13px] text-[#1e1e1e]/60 text-center mt-2">
              Are you sure you want to permanently delete <strong>&quot;{deleteItem.filename}&quot;</strong>? This
              will remove the file from your Google Drive storage and PostgreSQL catalog.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full border border-[#1e1e1e]/20 text-[#1e1e1e]/70 font-semibold text-[13px] hover:bg-[#f4efe7] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-center text-[#1e1e1e]">
              Delete {selectedIds.length} Media Item{selectedIds.length === 1 ? "" : "s"}?
            </h3>
            <p className="text-[13px] text-[#1e1e1e]/60 text-center mt-2">
              Are you sure you want to permanently delete these <strong>{selectedIds.length}</strong> items?
              This will remove them from your Google Drive storage and PostgreSQL catalog.
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={deletingBulk}
                className="flex-1 py-2.5 rounded-full border border-[#1e1e1e]/20 text-[#1e1e1e]/70 font-semibold text-[13px] hover:bg-[#f4efe7] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={deletingBulk}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[13px] transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingBulk ? "Deleting..." : `Yes, Delete (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Upload Media Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#a65a4a]/20">
            <div className="p-5 bg-gradient-to-r from-[#a65a4a] to-[#8b263e] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-200" />
                <h3 className="font-semibold text-[16px]">Upload New Media</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#1e1e1e] mb-1.5">
                  Select File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadFile(f);
                    if (f && !uploadTitle) {
                      setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="w-full text-[13px] text-[#1e1e1e] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[12px] file:font-semibold file:bg-[#a65a4a]/10 file:text-[#a65a4a] hover:file:bg-[#a65a4a]/20 cursor-pointer"
                />
                <p className="text-[11px] text-[#1e1e1e]/50 mt-1">
                  Supported formats: Images (JPEG, PNG, WebP), Videos (MP4), PDFs.
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1e1e1e] mb-1.5">
                  Image Title / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Conference 2026"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-[#f4efe7]/40 border border-[#a65a4a]/20 rounded-xl px-3.5 py-2 text-[13px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a]"
                />
                <p className="text-[11px] text-[#1e1e1e]/50 mt-1">
                  Saved with title &amp; ID: <code className="bg-[#f4efe7] px-1 py-0.5 rounded text-[#a65a4a] font-mono font-medium">&lt;title&gt;-&lt;id&gt;.ext</code>
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-full border border-[#1e1e1e]/20 text-[#1e1e1e]/70 text-[13px] font-medium hover:bg-[#1e1e1e]/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile || !uploadFile}
                  className="px-5 py-2 rounded-full bg-[#a65a4a] text-white text-[13px] font-semibold hover:bg-[#8b263e] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {uploadingFile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Upload File
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
