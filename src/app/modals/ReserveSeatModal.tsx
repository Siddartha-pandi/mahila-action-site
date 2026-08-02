"use client";

import { useState } from "react";
import { X, Calendar, MapPin, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { saveReservation, saveVendor } from "@/lib/backend";
import { isWindowOpen, upcomingOrOpenEvents, type EventItem, type RegKind } from "@/lib/data";
import { isValidPhoneNumber } from "@/lib/validation";
import { useSiteData } from "../context/SiteDataContext";
import { DonationFormCard } from "../forms/DonationFormCard";
import { inter, fraunces } from "../components/shared/styleHelpers";

// ── Shared form styles ────────────────────────────────────────────────────
export const reserveInputClass = `w-full border-b-2 border-[#a65a4a] bg-transparent py-2.5 text-[15px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none font-['Inter',sans-serif]`;
export const reserveLabelClass = `font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider`;

// ── Volunteer tab of the Reserve Seat modal ────────────────────────────────
export function VolunteerReserveForm({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commitment, setCommitment] = useState<"event_only" | "ongoing">("event_only");
  const [seats, setSeats] = useState("1");
  const [companions, setCompanions] = useState<{ name: string; phone: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function handleSeatsChange(v: string) {
    setSeats(v);
    const n = Math.max(0, Number(v) - 1);
    setCompanions(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", phone: "" });
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateCompanion(i: number, patch: Partial<{ name: string; phone: string }>) {
    setCompanions(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid phone number (e.g. +91 98765 43210)");
    for (const c of companions) {
      if (!c.name.trim() || !isValidPhoneNumber(c.phone)) return toast.error("Please enter a valid name and phone number for each additional volunteer");
    }
    const res = await saveReservation({
      name, email, phone, seats: Number(seats), event_name: event.title,
      volunteer_commitment: commitment, companions,
    });
    if (!res.ok) return toast.error(res.error || "Something went wrong submitting your registration — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          Seat Reserved!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{name}</strong>! Your {seats} seat{Number(seats) > 1 ? "s have" : " has"} been reserved as {commitment === "ongoing" ? "an ongoing volunteer" : "a volunteer for this event only"}. </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>

      <div>
        <label className={reserveLabelClass}>Which category suits you well?</label>
        <div className="flex flex-col gap-2 mt-2">
          {([
            { val: "event_only" as const, label: "I want to volunteer for this event only" },
            { val: "ongoing" as const, label: "I can be a forever volunteer for future events too" },
          ]).map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setCommitment(opt.val)}
              className={`text-left px-4 py-3 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer font-['Inter',sans-serif] ${commitment === opt.val ? "bg-[#a65a4a]/10 border-[#a65a4a] text-[#a65a4a]" : "border-[#1e1e1e]/15 text-[#1e1e1e]/70 hover:border-[#a65a4a]/40"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={reserveLabelClass}>Number of Seats</label>
        <select value={seats} onChange={e => handleSeatsChange(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {["1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n} seat{Number(n) > 1 ? "s" : ""}</option>)}
        </select>
      </div>

      {companions.length > 0 && (
        <div className="bg-[#a65a4a]/8 border border-[#a65a4a]/25 rounded-xl p-4 flex flex-col gap-4">
          <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] leading-relaxed">
            You're registering {companions.length} additional volunteer{companions.length > 1 ? "s" : ""}. As the person registering, you'll be their <strong>guardian</strong> for this event — please provide their details below.
          </p>
          {companions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={reserveLabelClass}>Volunteer {i + 2} Name *</label>
                <input value={c.name} onChange={e => updateCompanion(i, { name: e.target.value })} placeholder="Full name" className={reserveInputClass} />
              </div>
              <div>
                <label className={reserveLabelClass}>Volunteer {i + 2} Phone *</label>
                <input value={c.phone} onChange={e => updateCompanion(i, { phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#a65a4a]/10 border border-[#a65a4a]/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <span className="relative flex size-2"><span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-red-500" /></span>
        <p className={`font-['Inter',sans-serif] text-[#a65a4a] text-[12px] font-semibold`}>{event.totalSeats} seats total — reserve yours now!</p>
      </div>
      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Confirm Reservation
      </button>
    </form>
  );
}

// ── Vendor tab of the Reserve Seat modal ─────────────────────────────────────
export function VendorReserveForm({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [offering, setOffering] = useState("");
  const [needsSpace, setNeedsSpace] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return toast.error("Please enter your business or organization name");
    if (!contactName.trim()) return toast.error("Please enter a contact person's name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid contact phone number (e.g. +91 98765 43210)");
    if (!offering.trim()) return toast.error("Please describe what you'd like to offer");
    const res = await saveVendor({
      business_name: businessName, contact_name: contactName, email, phone,
      offering, needs_space: needsSpace, event_name: event.title,
    });
    if (!res.ok) return toast.error(res.error || "Something went wrong submitting your application — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          Application Received!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{businessName}</strong>! Your application to partner with us for {event.title} has been received.
        </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className={reserveLabelClass}>Business / Organization Name *</label>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business or organization" className={reserveInputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Contact Person *</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>
      <div>
        <label className={reserveLabelClass}>What would you like to offer? *</label>
        <textarea value={offering} onChange={e => setOffering(e.target.value)} placeholder="e.g. a food stall, printing services, sound equipment, product samples, a service booth..." rows={3} className={`${reserveInputClass} resize-none`} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setNeedsSpace(!needsSpace)}
          className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors shrink-0 ${needsSpace ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"}`}
        >
          {needsSpace && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
        </div>
        <span className="font-['Inter',sans-serif] text-[14px] font-medium text-[#1e1e1e]">I'll need space / a stall at the event</span>
      </label>
      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Submit Vendor Application
      </button>
    </form>
  );
}

// ── Attend Event form ─────────────────────────────────────────────────────────
export function AttendEventForm({
  events,
  defaultEventId,
  onClose,
}: {
  events: EventItem[];
  defaultEventId?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState(defaultEventId ?? events[0]?.id ?? "");
  const [members, setMembers] = useState("1");
  const [companions, setCompanions] = useState<{ name: string; phone: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const selectedEvent = events.find(ev => ev.id === eventId) ?? null;

  function handleMembersChange(v: string) {
    setMembers(v);
    const n = Math.max(0, Number(v) - 1);
    setCompanions(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", phone: "" });
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateCompanion(i: number, patch: Partial<{ name: string; phone: string }>) {
    setCompanions(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid phone number (e.g. +91 98765 43210)");
    if (!eventId || !selectedEvent) return toast.error("Please select an event to attend");
    for (const c of companions) {
      if (!c.name.trim() || !isValidPhoneNumber(c.phone)) return toast.error("Please enter a valid name and phone number for each additional attendee");
    }
    const res = await saveReservation({
      name, email, phone, seats: Number(members),
      event_name: selectedEvent.title, companions,
    });
    if (!res.ok) return toast.error(res.error || "Something went wrong submitting your registration — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          You're All Set!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{name}</strong>! {members} attendee{Number(members) > 1 ? "s are" : " is"} confirmed for <strong className="text-[#a65a4a]">{selectedEvent?.title}</strong>.
        </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>
      <div>
        <label className={reserveLabelClass}>Select Event to Attend *</label>
        <select value={eventId} onChange={e => setEventId(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {events.length === 0 && <option value="">No events currently open</option>}
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title} · {new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {ev.location}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={reserveLabelClass}>No. of Members Attending</label>
        <select value={members} onChange={e => handleMembersChange(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {["1", "2", "3", "4", "5", "6"].map(n => <option key={n} value={n}>{n} member{Number(n) > 1 ? "s" : ""}</option>)}
        </select>
      </div>

      {companions.length > 0 && (
        <div className="bg-[#a65a4a]/8 border border-[#a65a4a]/25 rounded-xl p-4 flex flex-col gap-4">
          <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] leading-relaxed">
            Please share the name and phone number for each additional attendee joining you.
          </p>
          {companions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={reserveLabelClass}>Attendee {i + 2} Name *</label>
                <input value={c.name} onChange={e => updateCompanion(i, { name: e.target.value })} placeholder="Full name" className={reserveInputClass} />
              </div>
              <div>
                <label className={reserveLabelClass}>Attendee {i + 2} Phone *</label>
                <input value={c.phone} onChange={e => updateCompanion(i, { phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Confirm My Attendance
      </button>
    </form>
  );
}

// ── Standalone "Attend an Event" modal ────────────────────────────────────────
export function AttendEventModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Get Involved</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Attend an Event
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7">
          <AttendEventForm events={events} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// ── Standalone "Partner With Us" modal ────────────────────────────────────────
export function PartnerWithUsModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const selectedEvent = events.find(ev => ev.id === eventId) ?? events[0] ?? null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Get Involved</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Partner With Us
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7 flex flex-col gap-5">
          {events.length > 0 ? (
            <div>
              <label className={reserveLabelClass}>Which Event Would You Like to Support? *</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {ev.location}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="font-['Inter',sans-serif] text-[#1e1e1e]/60 text-[14px]">No events are currently open for partnerships — please check back soon.</p>
          )}
          {selectedEvent && <VendorReserveForm event={selectedEvent} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ── Closed Event Notice Modal ─────────────────────────────────────────────────
export function ClosedEventNoticeModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  const upcoming = upcomingOrOpenEvents(events);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] shadow-2xl overflow-hidden">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between">
          <div>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider">Registration Closed</p>
            <h3 className="font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              This event's registration has ended
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7">
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[14px] mb-5">
            Here's what's coming up next — with the date each one opens for registration.
          </p>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
            {upcoming.map(ev => (
              <div key={ev.id} className="border border-[#a65a4a]/20 rounded-xl p-4">
                <p className="font-['Inter',sans-serif] font-semibold text-[15px] text-[#1e1e1e]">{ev.title}</p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><Calendar size={11} /> {new Date(ev.eventDate).toLocaleDateString()}</span>
                  <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(ev.windows) ? ev.windows : []).filter(w => w.enabled).map(w => (
                    <span key={w.kind} className="font-['Inter',sans-serif] text-[11px] bg-[#a65a4a]/10 text-[#a65a4a] px-2.5 py-1 rounded-full">
                      {w.kind.charAt(0).toUpperCase() + w.kind.slice(1)} opens {new Date(w.regStart).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <p className="font-['Inter',sans-serif] text-[#1e1e1e]/50 text-[14px]">No upcoming events scheduled right now — check back soon!</p>
            )}
          </div>
          <button onClick={onClose} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-3.5 rounded-full mt-6 hover:bg-[#993925] transition-colors cursor-pointer">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reserve Seat Modal (main) ─────────────────────────────────────────────────
type ReserveUIKind = RegKind | "attendee";
const RESERVE_KIND_LABEL: Record<ReserveUIKind, string> = { volunteer: "Volunteer", vendor: "Vendor", donor: "Donor", attendee: "Attendee" };

export function ReserveSeatModal({
  event,
  onClose,
  initialKind,
  onKindChange,
}: {
  event: EventItem;
  onClose: () => void;
  initialKind?: ReserveUIKind;
  onKindChange?: (kind: ReserveUIKind) => void;
}) {
  const siteData = useSiteData();
  const openKinds = (Array.isArray(event.windows) ? event.windows : []).filter(w => isWindowOpen(w));
  const kinds: ReserveUIKind[] = [...openKinds.map(w => w.kind), "attendee"];
  const [kind, setKindState] = useState<ReserveUIKind>(
    initialKind && kinds.includes(initialKind) ? initialKind : kinds[0] ?? "attendee"
  );
  function setKind(k: ReserveUIKind) {
    setKindState(k);
    onKindChange?.(k);
  }
  const attendEvents = upcomingOrOpenEvents(siteData.events);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Community Event</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              {event.title}
            </h3>
            <div className={`font-['Inter',sans-serif] text-[#f4efe7]/80 text-[13px] flex gap-4 mt-2`}>
              <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(event.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.location}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>

        <div className="p-7">
          {kinds.length > 1 && (
            <div className="mb-5">
              <label className={reserveLabelClass}>Register As</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {kinds.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${kind === k ? "bg-[#a65a4a] text-white border-[#a65a4a]" : "border-[#a65a4a]/30 text-[#a65a4a]"}`}
                  >
                    {RESERVE_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "volunteer" && <VolunteerReserveForm event={event} onClose={onClose} />}
          {kind === "donor" && <DonationFormCard eventName={event.title} />}
          {kind === "vendor" && <VendorReserveForm event={event} onClose={onClose} />}
          {kind === "attendee" && (
            <AttendEventForm
              events={attendEvents.length ? attendEvents : [event]}
              defaultEventId={event.id}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
