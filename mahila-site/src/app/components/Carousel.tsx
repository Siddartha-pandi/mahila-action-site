"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Shared carousel used by the homepage event + story rails.
// Autoplays, and pauses whenever the visitor is hovering, focused inside it,
// has the tab in the background, or asks for reduced motion.
export function Carousel({
  slides,
  slideClassName = "basis-full",
  gap = 0,
  autoplayDelay = 5000,
  controls = "overlay",
  options,
  onSelect,
  ariaLabel,
}: {
  slides: ReactNode[];
  /** Tailwind basis utilities deciding how many slides are visible, e.g. "basis-full lg:basis-1/3". */
  slideClassName?: string;
  /** Space between slides, in px. */
  gap?: number;
  /** Milliseconds between auto-advances. Pass 0 to disable autoplay. */
  autoplayDelay?: number;
  /** "overlay" floats the arrows over the slides; "below" puts them either side of the dots. */
  controls?: "overlay" | "below";
  options?: EmblaOptionsType;
  onSelect?: (index: number) => void;
  ariaLabel?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", ...options });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const syncSelected = () => setSelected(emblaApi.selectedScrollSnap());
    const syncSnaps = () => {
      setSnaps(emblaApi.scrollSnapList());
      syncSelected();
    };
    syncSnaps();
    emblaApi.on("select", syncSelected).on("reInit", syncSnaps);
    return () => {
      emblaApi.off("select", syncSelected).off("reInit", syncSnaps);
    };
  }, [emblaApi]);

  useEffect(() => {
    onSelect?.(selected);
  }, [selected, onSelect]);

  useEffect(() => {
    if (!emblaApi || paused || autoplayDelay <= 0 || snaps.length <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) emblaApi.scrollNext();
    }, autoplayDelay);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, autoplayDelay, snaps.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const hasControls = snaps.length > 1;
  const arrowBase =
    "grid place-items-center size-10 rounded-full bg-[#f4efe7]/90 text-[#a65a4a] shadow-md hover:bg-white transition-colors cursor-pointer";

  const prevButton = (
    <button type="button" onClick={scrollPrev} aria-label="Previous slide" className={arrowBase}>
      <ChevronLeft size={20} />
    </button>
  );
  const nextButton = (
    <button type="button" onClick={scrollNext} aria-label="Next slide" className={arrowBase}>
      <ChevronRight size={20} />
    </button>
  );

  return (
    <div
      className="relative w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ marginLeft: gap ? -gap : undefined }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`min-w-0 shrink-0 grow-0 ${slideClassName}`}
              style={{ paddingLeft: gap || undefined }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {hasControls && controls === "overlay" && (
        <>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{prevButton}</div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">{nextButton}</div>
        </>
      )}

      {hasControls && (
        <div className="flex items-center justify-center gap-4 mt-5">
          {controls === "below" && prevButton}
          <div className="flex items-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === selected}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === selected ? "w-6 bg-[#a65a4a]" : "w-2 bg-[#a65a4a]/30 hover:bg-[#a65a4a]/60"
                }`}
              />
            ))}
          </div>
          {controls === "below" && nextButton}
        </div>
      )}
    </div>
  );
}
