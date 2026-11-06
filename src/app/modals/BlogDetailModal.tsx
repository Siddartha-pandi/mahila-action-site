"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { marked } from "marked";
import { type BlogPost } from "@/lib/data";
import { fraunces, inter } from "../components/shared/styleHelpers";
import { Badge } from "../components/ui/Badge";
import { SafeImage } from "../components/SafeImage";
import { GridGallery } from "../components/GridGallery";

function isLikelyHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function toRichHtml(raw: string) {
  if (!raw) return "";
  if (isLikelyHtml(raw)) return raw;
  return marked.parse(raw) as string;
}

export function BlogDetailModal({
  post,
  categoryLabel,
  onClose,
  onNavigate,
}: {
  post: BlogPost;
  categoryLabel: string;
  onClose: () => void;
  /** Provide to enable Previous / Next paging between posts (used on the Events Blog page). */
  onNavigate?: (dir: -1 | 1) => void;
}) {
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const gallery = Array.isArray(post.gallery) ? post.gallery : [];
  const n = gallery.length;

  const richHtml = toRichHtml(post.content || post.excerpt || "");

  return (
    <div className="fixed inset-0 z-[400] bg-[#f4efe7] overflow-y-auto">
      <div className="sticky top-0 bg-[#f4efe7] shadow-[0_2px_16px_rgba(0,0,0,0.06)] z-10 py-3 sm:py-4 px-4 sm:px-8 md:px-12 xl:px-16">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-['Inter',sans-serif] text-[14px] sm:text-[15px]">
            <span className="text-[#a65a4a] font-medium">{categoryLabel}</span>
          </div>
          <button
            onClick={onClose}
            className="size-9 flex items-center justify-center rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer text-[#1e1e1e]"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-[1800px] w-full mx-auto px-4 sm:px-8 md:px-12 xl:px-16 pb-16 sm:pb-20">
        {post.coverImage && (
          <div className="mt-4 sm:mt-8 rounded-3xl overflow-hidden h-[240px] sm:h-[360px] md:h-[480px] lg:h-[580px] xl:h-[640px] relative bg-[#a65a4a]/10 shadow-md">
            <SafeImage
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
              containerClassName="size-full flex flex-col items-center justify-center bg-[#a65a4a]/10 text-[#a65a4a]/70 gap-2 select-none"
              errorText="Image not available"
              iconSize={48}
            />
          </div>
        )}

        <h1
          className={`${fraunces()} font-normal text-[#a65a4a] text-[24px] sm:text-[38px] md:text-[54px] lg:text-[60px] leading-[1.2] mt-6 sm:mt-8 max-w-[1200px]`}
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          {post.title}
        </h1>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3.5 sm:mt-4">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div
          className="blog-rich-content mt-6 sm:mt-8 max-w-[1400px]"
          dangerouslySetInnerHTML={{ __html: richHtml }}
        />

        {n > 0 ? (
          <GridGallery
            images={gallery}
            title={post.title}
            categoryLabel={categoryLabel}
            onNavigatePost={onNavigate}
          />
        ) : (
          onNavigate && (
            <div className="flex items-center justify-between mt-12 sm:mt-16 pt-8 border-t border-[#a65a4a]/20 max-w-[800px] mx-auto">
              <button
                type="button"
                onClick={() => onNavigate(-1)}
                className={`${inter()} inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full border border-[#a65a4a]/30 text-[#a65a4a] font-semibold text-[13px] sm:text-[14px] hover:bg-[#a65a4a] hover:text-white transition-all cursor-pointer`}
              >
                <ChevronLeft size={17} />
                <span>Previous Story</span>
              </button>
              <span className={`${inter()} text-[12px] sm:text-[13px] text-[#1e1e1e]/45 font-medium`}>
                {categoryLabel}
              </span>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                className={`${inter()} inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full bg-[#a65a4a] text-white font-semibold text-[13px] sm:text-[14px] hover:bg-[#8f3c2c] transition-all cursor-pointer shadow-sm`}
              >
                <span>Next Story</span>
                <ChevronRight size={17} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
