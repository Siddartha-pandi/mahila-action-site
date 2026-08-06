"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { marked } from "marked";
import { type BlogPost } from "@/lib/data";
import { fraunces, inter } from "../components/shared/styleHelpers";
import { Badge } from "../components/ui/Badge";

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
  const [galleryTop, setGalleryTop] = useState(0);
  const [coverError, setCoverError] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  function markImageBroken(src: string) {
    setBrokenImages(prev => new Set(prev).add(src));
  }
  const gallery = post.gallery ?? [];
  const n = gallery.length;
  const idxTop = n ? galleryTop % n : 0;
  const idxMid = n ? (galleryTop - 1 + n) % n : 0;
  const idxBot = n ? (galleryTop - 2 + n) % n : 0;

  const richHtml = toRichHtml(post.content || post.excerpt || "");

  return (
    <div className="fixed inset-0 z-[400] bg-[#f4efe7] overflow-y-auto">
      <div className="sticky top-0 bg-[#f4efe7] shadow-[0_2px_16px_rgba(0,0,0,0.06)] z-10 py-4 px-6">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-['Inter',sans-serif] text-[15px]">
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

      <div className="max-w-[1200px] mx-auto px-6 pb-20">
        {post.coverImage && !coverError && (
          <div className="mt-8 rounded-2xl overflow-hidden h-[200px] sm:h-[320px] md:h-[468px]">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={() => setCoverError(true)}
            />
          </div>
        )}

        <h1
          className={`${fraunces()} font-normal text-[#a65a4a] text-[24px] sm:text-[36px] md:text-[52px] leading-[1.25] mt-4 max-w-[900px]`}
          style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
        >
          {post.title}
        </h1>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {richHtml.trim() ? (
          <div
            className="blog-rich-content mt-8 max-w-[1152px]"
            dangerouslySetInnerHTML={{ __html: richHtml }}
          />
        ) : (
          <p className={`${inter()} mt-8 text-[#1e1e1e]/50 text-[15px]`}>
            No content has been added for this page yet.
          </p>
        )}

        {n > 0 && (
          <div className="mt-20">
            <h2
              className={`${fraunces()} font-normal text-[#a65a4a] text-[24px] sm:text-[36px] md:text-[52px] leading-[1.25]`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Gallery
            </h2>

            <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-8 mt-10">
              <button
                onClick={() => setGalleryTop((i) => (i - 1 + n) % n)}
                className="size-10 flex items-center justify-center rounded-full border border-[#1e1e1e]/20 hover:border-[#a65a4a] hover:text-[#a65a4a] transition-colors cursor-pointer shrink-0"
                aria-label="Previous gallery image"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>

              <div
                className="relative flex items-center justify-center"
                style={{ width: "min(610px,88vw)", height: "min(452px,65vw)" }}
              >
                {n > 2 && !brokenImages.has(gallery[idxBot]) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: "rotate(-6.09deg)" }}
                  >
                    <img
                      src={gallery[idxBot]}
                      alt=""
                      className="shadow-xl object-cover rounded-sm"
                      style={{ width: "min(572px,82vw)", height: "min(393px,57vw)" }}
                      onError={() => markImageBroken(gallery[idxBot])}
                    />
                  </div>
                )}
                {n > 1 && !brokenImages.has(gallery[idxMid]) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: "rotate(-3.13deg)" }}
                  >
                    <img
                      src={gallery[idxMid]}
                      alt=""
                      className="shadow-xl object-cover rounded-sm"
                      style={{ width: "min(572px,82vw)", height: "min(393px,57vw)" }}
                      onError={() => markImageBroken(gallery[idxMid])}
                    />
                  </div>
                )}
                {!brokenImages.has(gallery[idxTop]) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={gallery[idxTop]}
                      alt=""
                      className="shadow-2xl object-cover rounded-sm"
                      style={{ width: "min(572px,82vw)", height: "min(393px,57vw)" }}
                      onError={() => markImageBroken(gallery[idxTop])}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setGalleryTop((i) => (i + 1) % n)}
                className="size-10 flex items-center justify-center rounded-full border border-[#1e1e1e]/20 hover:border-[#a65a4a] hover:text-[#a65a4a] transition-colors cursor-pointer shrink-0"
                aria-label="Next gallery image"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryTop(i)}
                  className={`size-2 rounded-full transition-all cursor-pointer ${
                    i === idxTop ? "bg-[#a65a4a] w-5" : "bg-[#a65a4a]/30"
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>

            {onNavigate && (
              <div className="flex items-center justify-between mt-12 max-w-[610px] mx-auto">
                <button
                  onClick={() => onNavigate(-1)}
                  className={`${inter()} flex items-center gap-2 text-[#a65a4a] font-semibold text-[15px] hover:opacity-70 transition-opacity cursor-pointer`}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={() => onNavigate(1)}
                  className={`${inter()} flex items-center gap-2 text-[#a65a4a] font-semibold text-[15px] hover:opacity-70 transition-opacity cursor-pointer`}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
