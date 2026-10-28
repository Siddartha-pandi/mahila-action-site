"use client";

import { Calendar, MapPin, Globe, EyeOff } from "lucide-react";
import { isEventOpen, type EventItem } from "@/lib/data";
import { imgEvent } from "../constants/images";
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
    <div className={`relative w-full ${className} rounded-2xl overflow-hidden ${event.published === false ? "ring-3 ring-amber-400/80" : ""}`}>
      <img
        loading="lazy"
        decoding="async"
        src={event.image || imgEvent}
        alt={event.title}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/20 to-transparent" />

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

      <div className="absolute top-6 left-6 flex items-center justify-between gap-3 w-[calc(100%-48px)]">
        <span className={`${inter()} border border-[#f4efe7] text-[#f4efe7] text-[12px] font-semibold px-4 py-1.5 rounded-full`}>
          {categoryName || "Community Event"}
        </span>
        {open && !onTogglePublish ? (
          <span className={`${inter()} bg-[#ebc2c2] border-2 border-[#8f6969] text-[#dc0f0f] text-[10px] font-medium px-4 py-1 rounded-full flex items-center gap-1.5 whitespace-nowrap`}>
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-red-500 animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
            </span>
            {event.totalSeats ? `${event.totalSeats} Seats — Open` : "Open"}
          </span>
        ) : (
          <span className={`${inter()} bg-[#1e1e1e]/50 border-2 border-[#f4efe7]/30 text-[#f4efe7] text-[10px] font-semibold px-4 py-1 rounded-full whitespace-nowrap`}>
            Past Event
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <p className={`${inter()} text-[#f4efe7] text-[20px] font-semibold line-clamp-2`}>{event.title}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
          <span className={`${inter()} text-[#f4efe7] text-[14px] flex items-center gap-2`}>
            <Calendar size={16} /> {formatEventDate(event.eventDate)}
          </span>
          {event.location && (
            <span className={`${inter()} text-[#f4efe7] text-[14px] flex items-center gap-2`}>
              <MapPin size={16} /> {event.location}
            </span>
          )}
        </div>
        {onReserve && (
          <button
            onClick={() => onReserve(event)}
            className={`${inter()} text-[14px] font-semibold px-6 py-2.5 rounded-full mt-5 transition-colors cursor-pointer ${
              open
                ? "bg-[#f4efe7] text-[#a65a4a] hover:bg-white"
                : "border border-[#f4efe7]/60 text-[#f4efe7] hover:bg-[#f4efe7]/10"
            }`}
          >
            {open ? "Register for Event" : "Past Event"}
          </button>
        )}
      </div>
    </div>
  );
}
