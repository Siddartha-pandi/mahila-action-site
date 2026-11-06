"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Columns3,
  LayoutGrid,
  Rows3,
  SlidersHorizontal,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Images,
  ExternalLink,
} from "lucide-react";
import { fraunces, inter } from "./shared/styleHelpers";

export interface GridGalleryProps {
  images: string[];
  title?: string;
  categoryLabel?: string;
  className?: string;
  onNavigatePost?: (dir: -1 | 1) => void;
}

export function GridGallery({
  images,
  title,
  categoryLabel = "Events Blog",
  className = "",
  onNavigatePost,
}: GridGalleryProps) {
  // View modes:
  // "masonry" (default: frames auto-adjust to exact image height & width, 100% complete image visible)
  // "justified" (dynamic aspect-ratio rows, frames match each image's shape perfectly)
  // "mosaic" (reference style: 1 large left, 2 stacked right, 4 bottom)
  // "carousel" (fullscreen slide)
  const [viewMode, setViewMode] = useState<"masonry" | "justified" | "mosaic" | "carousel">("masonry");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  const cleanImages = useMemo(() => {
    return (images || []).filter((img) => typeof img === "string" && img.trim().length > 0);
  }, [images]);

  const total = cleanImages.length;

  const handleImageLoad = (src: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const r = naturalWidth / naturalHeight;
      setRatios((prev) => (prev[src] === r ? prev : { ...prev, [src]: r }));
    }
  };

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev === null ? null : (prev - 1 + total) % total));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % total));
      }
    },
    [lightboxIndex, total]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (total === 0) return null;

  // Mosaic chunks of 7 (1 large left, 2 stacked right, 4 bottom)
  const mosaicChunks = useMemo(() => {
    const chunks: { topHero: number; topStack: number[]; bottomRow: number[] }[] = [];
    for (let i = 0; i < total; i += 7) {
      const topHero = i;
      const topStack: number[] = [];
      if (i + 1 < total) topStack.push(i + 1);
      if (i + 2 < total) topStack.push(i + 2);
      const bottomRow: number[] = [];
      for (let j = i + 3; j < Math.min(i + 7, total); j++) {
        bottomRow.push(j);
      }
      chunks.push({ topHero, topStack, bottomRow });
    }
    return chunks;
  }, [total]);

  return (
    <section className={`mt-12 sm:mt-16 pt-8 border-t border-[#a65a4a]/15 ${className}`}>
      {/* ── Gallery Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2
              className={`${fraunces()} font-normal text-[#a65a4a] text-[24px] sm:text-[32px] md:text-[38px] leading-tight`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Gallery
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] sm:text-[13px] font-semibold bg-[#a65a4a]/10 text-[#a65a4a] border border-[#a65a4a]/20 select-none">
              <Images size={14} className="shrink-0" />
              <span>
                {total} {total === 1 ? "Photo" : "Photos"}
              </span>
            </span>
          </div>
          <p className={`${inter()} text-[#1e1e1e]/65 text-[13px] sm:text-[14px] mt-1`}>
            Frames automatically adapt to each uploaded photo's original shape without cropping.
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center bg-[#a65a4a]/8 p-1 rounded-full border border-[#a65a4a]/15 text-[12px] font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("masonry")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${viewMode === "masonry"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "text-[#1e1e1e]/75 hover:text-[#a65a4a]"
              }`}
            title="Auto-Fitting Masonry: frames tightly wrap every image without cropping"
          >
            <Columns3 size={14} />
            <span className="hidden xs:inline">Auto Frames</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("justified")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${viewMode === "justified"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "text-[#1e1e1e]/75 hover:text-[#a65a4a]"
              }`}
            title="Justified Rows: frames match image proportions in aligned rows"
          >
            <Rows3 size={14} />
            <span className="hidden xs:inline">Justified</span>
          </button>
          {/* <button
            type="button"
            onClick={() => setViewMode("mosaic")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${viewMode === "mosaic"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "text-[#1e1e1e]/75 hover:text-[#a65a4a]"
              }`}
            title="Reference Mosaic Grid (1 large + 2 stacked + 4 row)"
          >
            <LayoutGrid size={14} />
            <span className="hidden xs:inline">Mosaic</span>
          </button> */}
          {/* <button
            type="button"
            onClick={() => setViewMode("carousel")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${viewMode === "carousel"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "text-[#1e1e1e]/75 hover:text-[#a65a4a]"
              }`}
            title="Slideshow View"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden xs:inline">Slideshow</span>
          </button> */}
          <button
            type="button"
            onClick={() => setLightboxIndex(viewMode === "carousel" ? carouselIndex : 0)}
            className="p-1 text-[#1e1e1e]/70 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-full transition-colors cursor-pointer"
            title="Fullscreen Lightbox"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Studio Slate Canvas Container (Matches Reference Screenshot Style) ── */}
      <div className="bg-[#525957] p-3 sm:p-5 md:p-6 rounded-[22px] sm:rounded-[28px] shadow-xl border border-black/10 w-full">
        {/* ── 1. MASONRY: FRAMES AUTO-ADJUST TO EXACT IMAGE PROPORTIONS ── */}
        {viewMode === "masonry" && (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-4 gap-3.5 sm:gap-4 md:gap-5 space-y-3.5 sm:space-y-4 md:space-y-5">
            {cleanImages.map((src, i) => (
              <div
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="break-inside-avoid relative rounded-[16px] sm:rounded-[20px] overflow-hidden bg-[#383e3c] shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-white/5"
              >
                {/* Complete image visible, frame perfectly hugs the image */}
                <img
                  src={src}
                  alt={`Gallery photo ${i + 1}`}
                  loading="lazy"
                  onLoad={(e) => handleImageLoad(src, e)}
                  className="w-full h-auto block rounded-[16px] sm:rounded-[20px] group-hover:scale-[1.02] transition-transform duration-300"
                />

                {/* Subtle hover overlay with zoom icon */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                    <ZoomIn size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 2. JUSTIFIED ROWS: FRAMES MATCH EACH IMAGE'S ASPECT RATIO ── */}
        {viewMode === "justified" && (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {cleanImages.map((src, i) => {
              const r = ratios[src] || 1.33;
              return (
                <div
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    flexGrow: r,
                    flexBasis: `${r * 350}px`,
                    aspectRatio: `${r}`,
                  }}
                  className="relative min-h-[200px] max-h-[480px] rounded-[16px] sm:rounded-[20px] overflow-hidden bg-[#383e3c] shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-white/5"
                >
                  <img
                    src={src}
                    alt={`Gallery photo ${i + 1}`}
                    loading="lazy"
                    onLoad={(e) => handleImageLoad(src, e)}
                    className="size-full object-cover rounded-[16px] sm:rounded-[20px] group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                      <ZoomIn size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 3. MOSAIC: 1 LARGE HERO LEFT + 2 STACKED RIGHT + 4 BOTTOM ROW ── */}
        {viewMode === "mosaic" && (
          <div className="space-y-3 sm:space-y-4">
            {mosaicChunks.map((chunk, chunkIdx) => (
              <div key={chunkIdx} className="space-y-3 sm:space-y-4">
                {/* ─ Top Section: Large Hero (Left) + 2 Stacked Cards (Right) ─ */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
                  {/* Left Hero Card */}
                  <div
                    onClick={() => setLightboxIndex(chunk.topHero)}
                    className="md:col-span-7 relative h-[280px] sm:h-[380px] md:h-[460px] lg:h-[540px] xl:h-[600px] rounded-[18px] sm:rounded-[22px] overflow-hidden bg-[#383e3c] shadow-sm hover:shadow-xl transition-all group cursor-pointer border border-white/5"
                  >
                    {/* Ambient subtle blur so wide/tall image fits 100% complete without empty black voids */}
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-125 pointer-events-none"
                      style={{ backgroundImage: `url(${cleanImages[chunk.topHero]})` }}
                    />
                    <img
                      src={cleanImages[chunk.topHero]}
                      alt="Hero gallery photo"
                      loading="lazy"
                      onLoad={(e) => handleImageLoad(cleanImages[chunk.topHero], e)}
                      className="relative z-10 size-full object-contain p-2.5 sm:p-4 group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 z-20 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                      <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg">
                        <ZoomIn size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Right Stacked Cards */}
                  {chunk.topStack.length > 0 && (
                    <div className="md:col-span-5 flex flex-col gap-3 sm:gap-4 h-[280px] sm:h-[380px] md:h-[460px] lg:h-[540px] xl:h-[600px]">
                      {chunk.topStack.map((idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxIndex(idx)}
                          className="flex-1 min-h-0 relative rounded-[18px] sm:rounded-[22px] overflow-hidden bg-[#383e3c] shadow-sm hover:shadow-xl transition-all group cursor-pointer border border-white/5"
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-125 pointer-events-none"
                            style={{ backgroundImage: `url(${cleanImages[idx]})` }}
                          />
                          <img
                            src={cleanImages[idx]}
                            alt={`Photo ${idx + 1}`}
                            loading="lazy"
                            onLoad={(e) => handleImageLoad(cleanImages[idx], e)}
                            className="relative z-10 size-full object-contain p-2 sm:p-3 group-hover:scale-[1.02] transition-transform duration-300"
                          />
                          <div className="absolute inset-0 z-20 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                            <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg">
                              <ZoomIn size={18} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─ Bottom Section: 4 Equal Cards in a Row ─ */}
                {chunk.bottomRow.length > 0 && (
                  <div
                    className={`grid gap-3 sm:gap-4 ${chunk.bottomRow.length === 1
                        ? "grid-cols-1"
                        : chunk.bottomRow.length === 2
                          ? "grid-cols-2"
                          : chunk.bottomRow.length === 3
                            ? "grid-cols-3"
                            : "grid-cols-2 sm:grid-cols-4"
                      }`}
                  >
                    {chunk.bottomRow.map((idx) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxIndex(idx)}
                        className="relative aspect-[4/5] sm:aspect-[3/4] rounded-[18px] sm:rounded-[22px] overflow-hidden bg-[#383e3c] shadow-sm hover:shadow-xl transition-all group cursor-pointer border border-white/5"
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-125 pointer-events-none"
                          style={{ backgroundImage: `url(${cleanImages[idx]})` }}
                        />
                        <img
                          src={cleanImages[idx]}
                          alt={`Photo ${idx + 1}`}
                          loading="lazy"
                          onLoad={(e) => handleImageLoad(cleanImages[idx], e)}
                          className="relative z-10 size-full object-contain p-2 sm:p-3 group-hover:scale-[1.02] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 z-20 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                          <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white shadow-lg">
                            <ZoomIn size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 4. CAROUSEL / SLIDESHOW VIEW ── */}
        {viewMode === "carousel" && (
          <div className="relative">
            <div className="relative aspect-[16/10] max-h-[500px] w-full rounded-[18px] overflow-hidden bg-[#383e3c] shadow-lg group">
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl opacity-35 scale-125 pointer-events-none"
                style={{ backgroundImage: `url(${cleanImages[carouselIndex]})` }}
              />

              <img
                src={cleanImages[carouselIndex]}
                alt={`Slide ${carouselIndex + 1}`}
                className="relative z-10 size-full object-contain p-4"
              />

              {/* Fullscreen button */}
              <button
                type="button"
                onClick={() => setLightboxIndex(carouselIndex)}
                className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/75 backdrop-blur-md text-white p-2.5 rounded-full transition-colors cursor-pointer shadow-md"
                title="Fullscreen View"
              >
                <Maximize2 size={18} />
              </button>

              {/* Previous slide */}
              <button
                type="button"
                onClick={() => setCarouselIndex((i) => (i - 1 + total) % total)}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-[#a65a4a] text-white p-3 rounded-full backdrop-blur-md transition-colors cursor-pointer shadow-md"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Next slide */}
              <button
                type="button"
                onClick={() => setCarouselIndex((i) => (i + 1) % total)}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-[#a65a4a] text-white p-3 rounded-full backdrop-blur-md transition-colors cursor-pointer shadow-md"
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-md text-white text-[12px] font-medium px-4 py-1.5 rounded-full shadow-md border border-white/10">
                {carouselIndex + 1} of {total}
              </div>
            </div>

            {/* Thumbnail navigation */}
            <div className="flex items-center justify-center gap-2 mt-3.5 overflow-x-auto py-1 no-scrollbar">
              {cleanImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCarouselIndex(i)}
                  className={`relative w-14 h-11 sm:w-16 sm:h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${i === carouselIndex
                      ? "border-white scale-105 shadow-md ring-2 ring-[#a65a4a]"
                      : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                >
                  <img src={src} alt={`Thumbnail ${i + 1}`} className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Event Blog Post Navigation (Previous / Next post) ── */}
      {onNavigatePost && (
        <div className="flex items-center justify-between mt-10 sm:mt-14 pt-8 border-t border-[#a65a4a]/20 max-w-[800px] mx-auto">
          <button
            type="button"
            onClick={() => onNavigatePost(-1)}
            className={`${inter()} inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full border border-[#a65a4a]/30 text-[#a65a4a] font-semibold text-[13px] sm:text-[14px] hover:bg-[#a65a4a] hover:text-white transition-all cursor-pointer shadow-xs`}
          >
            <ChevronLeft size={17} />
            <span>Previous Story</span>
          </button>

          <span className={`${inter()} text-[12px] sm:text-[13px] text-[#1e1e1e]/45 font-medium`}>
            {categoryLabel}
          </span>

          <button
            type="button"
            onClick={() => onNavigatePost(1)}
            className={`${inter()} inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full bg-[#a65a4a] text-white font-semibold text-[13px] sm:text-[14px] hover:bg-[#8f3c2c] transition-all cursor-pointer shadow-sm`}
          >
            <span>Next Story</span>
            <ChevronRight size={17} />
          </button>
        </div>
      )}

      {/* ── FULLSCREEN LIGHTBOX (100% Complete Image, Zero Cropping) ── */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-xs sm:text-sm font-medium">
                {title || categoryLabel}
              </span>
              <span className="text-white/40 text-xs">•</span>
              <span className="bg-white/15 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                {lightboxIndex + 1} / {total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={cleanImages[lightboxIndex]}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                title="Open original image full resolution"
              >
                <ExternalLink size={18} />
              </a>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close lightbox"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Main Stage (100% uncropped original) */}
          <div
            className="flex-1 flex items-center justify-center px-4 sm:px-12 relative max-w-[1400px] mx-auto w-full select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {total > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + total) % total))}
                className="absolute left-2 sm:left-4 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-[#a65a4a] text-white backdrop-blur-sm transition-colors cursor-pointer shadow-lg"
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div className="relative max-h-[78vh] max-w-full flex items-center justify-center">
              <img
                key={cleanImages[lightboxIndex]}
                src={cleanImages[lightboxIndex]}
                alt={`Photo ${lightboxIndex + 1}`}
                className="max-h-[78vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl select-none animate-in fade-in zoom-in-95 duration-200"
              />
            </div>

            {total > 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % total))}
                className="absolute right-2 sm:right-4 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-[#a65a4a] text-white backdrop-blur-sm transition-colors cursor-pointer shadow-lg"
                aria-label="Next photo"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Thumbnails */}
          <div
            className="px-4 py-3 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {total > 1 && (
              <div className="flex items-center gap-2 max-w-full overflow-x-auto py-1 px-2 no-scrollbar justify-center">
                {cleanImages.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-12 h-10 sm:w-14 sm:h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${idx === lightboxIndex
                        ? "border-white scale-110 shadow-lg ring-2 ring-[#a65a4a]"
                        : "border-transparent opacity-40 hover:opacity-90"
                      }`}
                  >
                    <img src={src} alt={`Thumbnail ${idx + 1}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-white/45 text-[11px] font-['Inter',sans-serif]">
              Use <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">←</kbd> and{" "}
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">→</kbd> to navigate,{" "}
              <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
