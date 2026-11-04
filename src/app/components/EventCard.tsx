"use client";

import { Calendar, MapPin, Globe, EyeOff } from "lucide-react";
import { isEventOpen, type EventItem } from "@/lib/data";
import { SafeImage } from "./SafeImage";
import { inter } from "./shared/styleHelpers";

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "Date to be announced";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// The event card shown on the homepage rail and in the /events grid.
export function EventCard({
  event,
  categoryName,
  onReserve,
  onTogglePublish,
  className = "h-[380px]",
}: {
  event: EventItem;
  categoryName?: string;
  /** Provide to render the reserve button inside the card (used on the Events page grid). */
  onReserve?: (event: EventItem) => void;
  /** Admin callback to toggle publication status directly from the card */
  onTogglePublish?: (event: EventItem, published: boolean) => void;
  className?: string;
}) {
  const open = isEventOpen(event);

  return (
    <div
      onClick={() => onReserve?.(event)}
      onKeyDown={(e) => {
        if (onReserve && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onReserve(event);
        }
      }}
      role={onReserve ? "button" : undefined}
      tabIndex={onReserve ? 0 : undefined}
      aria-label={`Register for ${event.title}`}
      className={`relative w-full ${className} rounded-2xl overflow-hidden group transition-all duration-300 ${
        onReserve ? "cursor-pointer hover:shadow-xl hover:ring-2 hover:ring-[#a65a4a]/40" : ""
      } ${event.published === false ? "ring-3 ring-amber-400/80" : ""}`}
    >
      <SafeImage
        src={event.image}
        alt={event.title}
        className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
        containerClassName="absolute inset-0 size-full flex flex-col items-center justify-center bg-[#2c1d19] text-[#f4efe7]/60 gap-2 select-none"
        errorText="Image not available"
        iconSize={40}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/20 to-transparent transition-opacity group-hover:opacity-90" />

      {/* Admin Publish / Unpublish Card Controls */}
      {onTogglePublish && (
        <div className="absolute top-4 right-4 z-20 flex items-center p-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/30 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePublish(event, true);
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              event.published !== false
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Publish event on website"
          >
            <Globe size={11} />
            <span>Publish</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePublish(event, false);
            }}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              event.published === false
                ? "bg-amber-600 text-white shadow-xs"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
            title="Unpublish event (hide from website)"
          >
            <EyeOff size={11} />
            <span>Unpublish</span>
          </button>
        </div>
      )}

      {/* Draft Watermark Badge */}
      {event.published === false && (
        <div className="absolute top-18 left-6 z-10 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
          <EyeOff size={12} />
          <span>Draft (Unpublished)</span>
        </div>
      )}

      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex items-center justify-between gap-2 w-[calc(100%-32px)] sm:w-[calc(100%-48px)] flex-wrap">
        <span className={`${inter()} border border-[#0000001e] text-[#464040ff] text-[11px] sm:text-[12px] font-semibold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full`}>
          {categoryName || "Community Event"}
        </span>
        {open && !onTogglePublish ? (
          (() => {
            const booked = Number(event.bookedSeats ?? 0);
            const total = Number(event.totalSeats ?? 0);
            const available = event.availableSeats !== undefined ? Number(event.availableSeats) : Math.max(0, total - booked);
            const isSoldOut = total > 0 && available <= 0;

            if (isSoldOut) {
              return (
                <span className={`${inter()} bg-rose-900/85 border-2 border-rose-400 text-rose-100 text-[10px] font-bold px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap shadow-xs`}>
                  Sold Out ({total}/{total})
                </span>
              );
            }

            return (
              <span
                title={total > 0 ? `${available} of ${total} seats available` : "Registration open"}
                className={`${inter()} bg-[#ebc2c2] border-2 border-[#8f6969] text-[#dc0f0f] text-[10px] font-medium px-3 sm:px-4 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap`}
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full rounded-full bg-red-500 animate-ping" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
                </span>
                {total > 0
                  ? `${available} Available ${available === 1 ? "Seat" : "Seats"} — Open`
                  : "Open"}
              </span>
            );
          })()
        ) : (
          <span className={`${inter()} bg-[#1e1e1e]/50 border-2 border-[#f4efe7]/30 text-[#f4efe7] text-[10px] font-semibold px-3 sm:px-4 py-1 rounded-full whitespace-nowrap`}>
            Past Event
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none">
        <p className={`${inter()} text-[#f4efe7] text-[18px] sm:text-[20px] font-semibold line-clamp-2 group-hover:text-white transition-colors`}>{event.title}</p>
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 mt-2 sm:mt-3">
          <span className={`${inter()} text-[#f4efe7]/90 text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2`}>
            <Calendar size={15} /> {formatEventDate(event.eventDate)}
          </span>
          {event.location && (
            <span className={`${inter()} text-[#f4efe7]/90 text-[13px] sm:text-[14px] flex items-center gap-1.5 sm:gap-2`}>
              <MapPin size={15} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
