"use client";

/**
 * NeonStorageGallery — Public-facing responsive gallery component
 * powered by Neon Object Storage (S3-compatible) + Neon PostgreSQL.
 *
 * Features:
 * - Responsive masonry/grid layout
 * - Fullscreen interactive lightbox modal with keyboard navigation (Esc, Arrows)
 * - Server-side pagination
 * - Live search filtering by title/filename
 * - Loading skeletons and graceful error states
 * - Share and copy URL
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Share2,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { fraunces, inter } from "@/app/components/shared/styleHelpers";

export interface GalleryImage {
  id: number;
  uuid: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  objectKey: string;
  bucket: string;
  visibility: "public" | "private";
  url: string;
  thumbnailUrl: string;
  mediaType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface NeonStorageGalleryProps {
  initialLimit?: number;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function NeonStorageGallery({
  initialLimit = 24,
  className = "",
  title = "Media Gallery",
  subtitle = "Moments and memories captured from our community initiatives",
}: NeonStorageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchImages = useCallback(async (pg: number, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        visibility: "public",
        page: String(pg),
        limit: String(initialLimit),
        ...(query.trim() ? { q: query.trim() } : {}),
      });

      const res = await fetch(`/api/storage/gallery?${params}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setImages(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(pg);
    } catch (err: any) {
      console.error("NeonStorageGallery fetch error:", err);
      setError(err?.message || "Failed to load gallery images");
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchImages(1, searchQuery);
  }, [fetchImages]);

  // Debounced search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchImages(1, val);
    }, 400);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + images.length) % images.length
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % images.length
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, images.length]);

  const activePhoto = lightboxIndex !== null ? images[lightboxIndex] : null;

  const handleShare = async (item: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.metadata?.title || item.filename,
          url: item.url,
        });
        toast.success("Shared successfully");
      } catch {}
    } else {
      navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      toast.success("Image link copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 ${className}`}>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#a65a4a]/10 text-[#a65a4a] mb-2">
            <Sparkles size={13} />
            <span>Neon S3 Object Storage</span>
          </div>
          <h2
            className={`${fraunces()} text-[#1c1917] text-3xl sm:text-4xl font-normal tracking-tight`}
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {title}
          </h2>
          <p className={`${inter()} text-[#78716c] text-sm sm:text-base mt-1 max-w-2xl`}>
            {subtitle}
          </p>
        </div>

        {/* Search bar & count */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#78716c]"
            />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`${inter()} w-full bg-white border border-[#e7e5e4] text-[#1c1917] placeholder-[#a8a29e] text-xs rounded-full pl-9 pr-8 py-2 focus:outline-none focus:border-[#a65a4a] shadow-xs transition-colors`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchImages(1, "");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#e7e5e4] text-[#78716c] whitespace-nowrap shadow-xs">
            {total} {total === 1 ? "Photo" : "Photos"}
          </div>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Unable to load gallery</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => fetchImages(page, searchQuery)}
            className="text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-2xl bg-[#e7e5e4] animate-pulse"
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        /* ── Empty State ── */
        <div className="py-20 text-center rounded-3xl bg-white border border-[#e7e5e4] shadow-xs">
          <div className="size-14 rounded-full bg-[#f4efe7] flex items-center justify-center mx-auto mb-3 text-[#a65a4a]">
            <Sparkles size={24} />
          </div>
          <h3 className={`${fraunces()} text-lg font-semibold text-[#1c1917]`}>
            No images found
          </h3>
          <p className={`${inter()} text-xs text-[#78716c] mt-1 max-w-sm mx-auto`}>
            {searchQuery
              ? "No photos match your search query. Try clearing the filter."
              : "No public photos have been uploaded yet. Check back soon!"}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                fetchImages(1, "");
              }}
              className="mt-4 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#a65a4a] text-white hover:bg-[#8f3c2c] transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        /* ── Photo Grid ── */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((item, idx) => {
              const displayTitle = item.metadata?.title || item.filename;
              return (
                <div
                  key={item.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="group relative rounded-2xl overflow-hidden bg-[#181615] aspect-[4/3] cursor-pointer border border-[#e7e5e4] hover:border-[#a65a4a] transition-all duration-300 shadow-xs hover:shadow-lg"
                >
                  <img
                    src={item.url}
                    alt={displayTitle}
                    loading={idx < 8 ? "eager" : "lazy"}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f4efe7'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23a8a29e' font-size='12'%3EPhoto%3C/text%3E%3C/svg%3E";
                    }}
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-none">
                    <span className="text-white text-sm font-semibold leading-snug line-clamp-1">
                      {displayTitle}
                    </span>
                    <div className="flex items-center gap-2 text-white/70 text-xs mt-1">
                      <Calendar size={11} className="text-[#a65a4a]" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[#e7e5e4] flex-wrap">
              <span className={`${inter()} text-xs text-[#78716c]`}>
                Showing {(page - 1) * initialLimit + 1}–
                {Math.min(page * initialLimit, total)} of {total} images
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchImages(page - 1, searchQuery)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-white border border-[#e7e5e4] text-[#1c1917] disabled:opacity-40 hover:bg-[#f4efe7] transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => fetchImages(pg, searchQuery)}
                      className={`size-8 rounded-lg text-xs font-semibold transition-colors ${
                        page === pg
                          ? "bg-[#a65a4a] text-white shadow-xs"
                          : "bg-white border border-[#e7e5e4] text-[#78716c] hover:bg-[#f4efe7]"
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}

                <button
                  onClick={() => fetchImages(page + 1, searchQuery)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-white border border-[#e7e5e4] text-[#1c1917] disabled:opacity-40 hover:bg-[#f4efe7] transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Fullscreen Lightbox ── */}
      {lightboxIndex !== null && activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-semibold truncate max-w-sm">
                {activePhoto.metadata?.title || activePhoto.filename}
              </span>
              <span className="text-white/40 text-xs">•</span>
              <span className="bg-white/10 text-white/80 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {lightboxIndex + 1} / {images.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleShare(activePhoto)}
                className="p-2 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                title="Share photo"
              >
                {copiedId === activePhoto.id ? (
                  <CheckCheck size={18} className="text-emerald-400" />
                ) : (
                  <Share2 size={18} />
                )}
              </button>

              <a
                href={activePhoto.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                title="Open original"
              >
                <Maximize2 size={18} />
              </a>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Main Stage */}
          <div
            className="flex-1 flex items-center justify-center px-4 sm:px-12 relative max-w-[1400px] mx-auto w-full select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex(
                    (i) => (i === null ? null : (i - 1 + images.length) % images.length)
                  )
                }
                className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-[#a65a4a] text-white transition-colors cursor-pointer shadow-lg"
                aria-label="Previous"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <img
              key={activePhoto.url}
              src={activePhoto.url}
              alt={activePhoto.metadata?.title || activePhoto.filename}
              className="max-h-[72vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length))
                }
                className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-[#a65a4a] text-white transition-colors cursor-pointer shadow-lg"
                aria-label="Next"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Bar */}
          <div
            className="px-6 py-4 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-1 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-white/50 text-xs">
              <span>{new Date(activePhoto.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{(activePhoto.byteSize / 1024).toFixed(1)} KB</span>
            </div>
            <p className="text-white/40 text-[11px] font-['Inter',sans-serif]">
              Use <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/80">←</kbd> and{" "}
              <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/80">→</kbd> to navigate,{" "}
              <kbd className="bg-white/10 px-1 py-0.5 rounded text-white/80">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

