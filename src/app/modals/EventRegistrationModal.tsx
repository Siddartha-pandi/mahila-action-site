"use client";

import { useMemo, useState } from "react";
import { X, Calendar, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  saveReservation, saveVendor, saveVolunteer,
  registrationKey, type RegistrationRole, type VolunteerAccountProfile,
} from "@/lib/backend";
import { isWindowOpen, type EventItem } from "@/lib/data";
import { firstError, validateEmail, validateName, validatePhone, validateSeats, validateText } from "@/lib/validation";
import { DonationFormCard } from "../forms/DonationFormCard";
import { reserveInputClass, reserveLabelClass } from "./ReserveSeatModal";
import { useProfileField } from "../hooks/useUserProfile";

// The four ways someone can take part in a single event. "attendee" has no
// registration window of its own — attending is always open while the event is.
const ROLES: { value: RegistrationRole; label: string; blurb: string }[] = [
  { value: "volunteer", label: "Volunteer", blurb: "I want to help organise and run this event." },
  { value: "vendor", label: "Vendor", blurb: "I want to keep a stall or offer a service at this event." },
  { value: "donor", label: "Donor", blurb: "I want to contribute funds towards this event." },
  { value: "attendee", label: "Attendee", blurb: "I only want to attend this event." },
];

const SKILL_OPTIONS = [
  "Teaching / Training",
  "Healthcare / Medical",
  "Event Management",
  "Communication / Outreach",
  "Technology / Digital",
  "Legal / Counselling",
  "Arts / Creative",
  "General Support",
];

/** Companion (extra person) rows, shared by the volunteer and attendee forms. */
function useCompanions() {
  const [count, setCount] = useState("1");
  const [companions, setCompanions] = useState<{ name: string; phone: string }[]>([]);

  function setCountAndRows(v: string) {
    setCount(v);
    const extra = Math.max(0, Number(v) - 1);
    setCompanions(prev => {
      const next = [...prev];
      while (next.length < extra) next.push({ name: "", phone: "" });
      while (next.length > extra) next.pop();
      return next;
    });
  }

  function update(i: number, patch: Partial<{ name: string; phone: string }>) {
    setCompanions(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return { count, companions, setCountAndRows, update };
}

function CompanionFields({
  companions,
  noun,
  note,
  onChange,
}: {
  companions: { name: string; phone: string }[];
  noun: string;
  note: string;
  onChange: (i: number, patch: Partial<{ name: string; phone: string }>) => void;
}) {
  if (companions.length === 0) return null;
  return (
    <div className="bg-[#a65a4a]/8 border border-[#a65a4a]/25 rounded-xl p-4 flex flex-col gap-4">
      <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] leading-relaxed">{note}</p>
      {companions.map((c, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={reserveLabelClass}>{noun} {i + 2} Name *</label>
            <input value={c.name} onChange={e => onChange(i, { name: e.target.value })} placeholder="Full name" className={reserveInputClass} />
          </div>
          <div>
            <label className={reserveLabelClass}>{noun} {i + 2} Phone *</label>
            <input value={c.phone} onChange={e => onChange(i, { phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventRegistrationModal({
  event,
  profile,
  registeredKeys,
  onClose,
  onRegistered,
}: {
  event: EventItem;
  profile: VolunteerAccountProfile;
  /** (role, event) pairs this person has already signed up for. */
  registeredKeys: Set<string>;
  onClose: () => void;
  onRegistered: (role: RegistrationRole) => void;
}) {
  // Shared contact details, prefilled from the signed-in account.
  const [name, setName] = useProfileField(profile.name);
  const [email, setEmail] = useProfileField(profile.email);
  const [phone, setPhone] = useProfileField(profile.phone);

  // Volunteer fields
  const [skills, setSkills] = useState(profile.skills ?? "");
  const [commitment, setCommitment] = useState<"event_only" | "ongoing">("event_only");
  const volunteerParty = useCompanions();

  // Attendee fields
  const attendeeParty = useCompanions();

  // Vendor fields
  const [businessName, setBusinessName] = useState("");
  const [offering, setOffering] = useState("");
  const [needsSpace, setNeedsSpace] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [doneRole, setDoneRole] = useState<RegistrationRole | null>(null);

  // A role is offered only while its registration window is open — the same
  // rule the public event modal uses. Attending stays open throughout.
  const openKinds = useMemo(() => {
    const windows = Array.isArray(event.windows) ? event.windows : [];
    return new Set(windows.filter(w => isWindowOpen(w)).map(w => w.kind as string));
  }, [event]);

  const roleState = useMemo(
    () =>
      ROLES.map(r => {
        const already = registeredKeys.has(registrationKey(r.value, event.title));
        // Donating twice isn't a duplicate, so donors are never locked out.
        const closed = r.value !== "attendee" && !openKinds.has(r.value);
        return { ...r, already: r.value === "donor" ? false : already, closed, disabled: closed || (r.value !== "donor" && already) };
      }),
    [registeredKeys, openKinds, event.title]
  );

  const firstAvailable = roleState.find(r => !r.disabled)?.value ?? null;
  const [role, setRole] = useState<RegistrationRole | null>(firstAvailable);
  const activeRole = roleState.find(r => r.value === role) ?? null;

  // Guard against being opened with a missing/stale event — e.g. a deep
  // link to an event that's since been deleted, or a caller passing
  // through an id that no longer resolves to a real event object. Placed
  // after every hook call above so React's hook order stays consistent.
  if (!event || !event.id || !event.title) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[420px] p-7 text-center shadow-2xl">
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[14px] mb-5">
            This event couldn't be found — it may have been removed, or the link may be out of date.
          </p>
          <button onClick={onClose} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    );
  }

  function fail(message: string): false {
    toast.error(message);
    return false;
  }

  async function handleVolunteerSubmit(): Promise<boolean> {
    if (!skills.trim()) return fail("Please choose the skill or interest you'd like to help with");
    const invalid = firstError(
      validateSeats(Number(volunteerParty.count)),
      ...volunteerParty.companions.flatMap((c, i) => [
        validateName(c.name, `name for additional volunteer ${i + 1}`),
        validatePhone(c.phone, `phone number for additional volunteer ${i + 1}`),
      ])
    );
    if (invalid) return fail(invalid);
    // The volunteer application itself carries the event; any extra people come
    // through as a seat reservation so their details aren't lost.
    const res = await saveVolunteer({
      name, email, phone, skills,
      volunteer_commitment: commitment,
      selected_events: [event.title],
    });
    if (!res.ok) return fail(res.error || "Something went wrong submitting your registration — please try again.");

    if (volunteerParty.companions.length > 0) {
      const seats = await saveReservation({
        name, email, phone,
        seats: Number(volunteerParty.count),
        event_name: event.title,
        volunteer_commitment: commitment,
        companions: volunteerParty.companions,
      });
      if (!seats.ok) toast.error(seats.error || "Your registration went through, but we couldn't record the additional volunteers.");
    }
    return true;
  }

  async function handleAttendeeSubmit(): Promise<boolean> {
    const invalid = firstError(
      validateSeats(Number(attendeeParty.count)),
      ...attendeeParty.companions.flatMap((c, i) => [
        validateName(c.name, `name for additional attendee ${i + 1}`),
        validatePhone(c.phone, `phone number for additional attendee ${i + 1}`),
      ])
    );
    if (invalid) return fail(invalid);
    const res = await saveReservation({
      name, email, phone,
      seats: Number(attendeeParty.count),
      event_name: event.title,
      companions: attendeeParty.companions,
    });
    if (!res.ok) return fail(res.error || "Something went wrong reserving your seat — please try again.");
    return true;
  }

  async function handleVendorSubmit(): Promise<boolean> {
    const invalid = firstError(
      validateText(businessName, "your business or organization name", { min: 2, max: 150 }),
      validateText(offering, "what you'd like to offer", { min: 3, max: 500 })
    );
    if (invalid) return fail(invalid);
    const res = await saveVendor({
      business_name: businessName,
      contact_name: name,
      email, phone, offering,
      needs_space: needsSpace,
      event_name: event.title,
    });
    if (!res.ok) return fail(res.error || "Something went wrong submitting your application — please try again.");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !role) return;

    const invalid = firstError(validateName(name), validateEmail(email), validatePhone(phone));
    if (invalid) { toast.error(invalid); return; }

    // Last line of defence in the browser; the API rejects repeats too.
    if (registeredKeys.has(registrationKey(role, event.title))) {
      toast.error(`You're already registered as ${role === "attendee" ? "an attendee" : `a ${role}`} for ${event.title}.`);
      return;
    }

    setSubmitting(true);
    try {
      const ok =
        role === "volunteer" ? await handleVolunteerSubmit()
        : role === "vendor" ? await handleVendorSubmit()
        : await handleAttendeeSubmit();
      if (!ok) return;
      setDoneRole(role);
      onRegistered(role);
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel: Record<RegistrationRole, string> = {
    volunteer: "Confirm Volunteer Registration",
    vendor: "Submit Vendor Application",
    donor: "",
    attendee: "Confirm My Attendance",
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[560px] max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider">Register for</p>
            <h3 className="font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              {event.title}
            </h3>
            <div className="font-['Inter',sans-serif] text-[#f4efe7]/80 text-[13px] flex flex-wrap gap-4 mt-2">
              {event.eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} /> {new Date(event.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              )}
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.location || "Online / TBD"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>

        <div className="p-7">
          {doneRole ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-[#587735]" />
              </div>
              <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[26px]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                You're Registered!
              </h4>
              <p className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed">
                Thank you, <strong className="text-[#a65a4a]">{name}</strong>! You're signed up as{" "}
                <strong className="text-[#a65a4a]">{doneRole === "attendee" ? "an attendee" : `a ${doneRole}`}</strong> for{" "}
                <strong className="text-[#a65a4a]">{event.title}</strong>. A confirmation email is on its way.
              </p>
              <button onClick={onClose} className="font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer">
                Done
              </button>
            </div>
          ) : !role ? (
            <div className="flex items-start gap-2.5 bg-[#993925]/8 border border-[#993925]/25 rounded-xl px-4 py-3">
              <AlertCircle size={17} className="text-[#993925] shrink-0 mt-0.5" />
              <p className="font-['Inter',sans-serif] text-[#993925] text-[13px] leading-relaxed">
                You're already registered for this event in every way that's currently open. Check "My Registered Events" to see your entries.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* ── Role picker ── */}
              <div>
                <label className={reserveLabelClass}>I want to join as *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as RegistrationRole)}
                  className={`${reserveInputClass} cursor-pointer`}
                >
                  {roleState.map(r => (
                    <option key={r.value} value={r.value} disabled={r.disabled}>
                      {r.label}
                      {r.already ? " — already registered" : r.closed ? " — registration closed" : ""}
                    </option>
                  ))}
                </select>
                {activeRole && (
                  <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 mt-2 leading-relaxed">{activeRole.blurb}</p>
                )}
              </div>

              {/* ── Donor is its own flow (payment first, then the receipt) ── */}
              {role === "donor" ? (
                <DonationFormCard
                  eventName={event.title}
                  initialName={profile.name}
                  initialEmail={profile.email}
                  initialPhone={profile.phone}
                  onSaved={() => onRegistered("donor")}
                />
              ) : (
                <>
                  {/* ── Shared contact details ── */}
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

                  {/* ── Volunteer ── */}
                  {role === "volunteer" && (
                    <>
                      <div>
                        <label className={reserveLabelClass}>How would you like to help? *</label>
                        <select value={skills} onChange={e => setSkills(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
                          <option value="">Select your skill or interest…</option>
                          {SKILL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
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
                        <label className={reserveLabelClass}>Volunteers Joining (including you)</label>
                        <select value={volunteerParty.count} onChange={e => volunteerParty.setCountAndRows(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
                          {["1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n} volunteer{Number(n) > 1 ? "s" : ""}</option>)}
                        </select>
                      </div>
                      <CompanionFields
                        companions={volunteerParty.companions}
                        noun="Volunteer"
                        note={`You're registering ${volunteerParty.companions.length} additional volunteer${volunteerParty.companions.length > 1 ? "s" : ""}. As the person registering, you'll be their guardian for this event — please provide their details below.`}
                        onChange={volunteerParty.update}
                      />
                    </>
                  )}

                  {/* ── Vendor ── */}
                  {role === "vendor" && (
                    <>
                      <div>
                        <label className={reserveLabelClass}>Business / Organization Name *</label>
                        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business or organization" className={reserveInputClass} />
                      </div>
                      <div>
                        <label className={reserveLabelClass}>What would you like to offer? *</label>
                        <textarea
                          value={offering}
                          onChange={e => setOffering(e.target.value)}
                          placeholder="e.g. a food stall, printing services, sound equipment, product samples, a service booth…"
                          rows={3}
                          className={`${reserveInputClass} resize-none`}
                        />
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
                    </>
                  )}

                  {/* ── Attendee ── */}
                  {role === "attendee" && (
                    <>
                      <div>
                        <label className={reserveLabelClass}>No. of Members Attending</label>
                        <select value={attendeeParty.count} onChange={e => attendeeParty.setCountAndRows(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
                          {["1", "2", "3", "4", "5", "6"].map(n => <option key={n} value={n}>{n} member{Number(n) > 1 ? "s" : ""}</option>)}
                        </select>
                      </div>
                      <CompanionFields
                        companions={attendeeParty.companions}
                        noun="Attendee"
                        note="Please share the name and phone number for each additional attendee joining you."
                        onChange={attendeeParty.update}
                      />
                      {event.totalSeats > 0 && (
                        <div className="bg-[#a65a4a]/10 border border-[#a65a4a]/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
                          <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                          </span>
                          <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] font-semibold">{event.totalSeats} seats total — reserve yours now!</p>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting…" : submitLabel[role]}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
