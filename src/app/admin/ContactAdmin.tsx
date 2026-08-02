import { toast } from "sonner";
import { inputBase, labelBase } from "../adminWidgets";
import { ContactInfo, saveContactInfo } from "../../lib/data";

export function ContactAdmin({ contact, onChange }: { contact: ContactInfo; onChange: (next: ContactInfo) => void }) {
  function update(patch: Partial<ContactInfo>) {
    onChange({ ...contact, ...patch });
  }

  async function handleSave() {
    const ok = await saveContactInfo(contact);
    if (ok) toast.success("Contact info saved and published!");
    else toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
  }

  return (
    <div className="flex flex-col gap-8 max-w-[640px]">
      <div className="border border-[#a65a4a]/20 rounded-xl p-5">
        <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e] mb-3">Email Us</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelBase}>Email Address</label>
            <input value={contact.email} onChange={(e) => update({ email: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Note</label>
            <input value={contact.emailNote} onChange={(e) => update({ emailNote: e.target.value })} className={inputBase} />
          </div>
        </div>
      </div>

      <div className="border border-[#a65a4a]/20 rounded-xl p-5">
        <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e] mb-3">Call Us</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelBase}>Phone Number</label>
            <input value={contact.phone} onChange={(e) => update({ phone: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Note</label>
            <input value={contact.phoneNote} onChange={(e) => update({ phoneNote: e.target.value })} className={inputBase} />
          </div>
        </div>
      </div>

      <div className="border border-[#a65a4a]/20 rounded-xl p-5">
        <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e] mb-3">Visit Us</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelBase}>Address</label>
            <input value={contact.address} onChange={(e) => update({ address: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Note</label>
            <input value={contact.addressNote} onChange={(e) => update({ addressNote: e.target.value })} className={inputBase} />
          </div>
        </div>
      </div>

      <div className="border border-[#a65a4a]/20 rounded-xl p-5">
        <p className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e] mb-3">Office Hours</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelBase}>Days</label>
            <input value={contact.hours} onChange={(e) => update({ hours: e.target.value })} className={inputBase} />
          </div>
          <div>
            <label className={labelBase}>Hours</label>
            <input value={contact.hoursNote} onChange={(e) => update({ hoursNote: e.target.value })} className={inputBase} />
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer">
        Save Contact Info
      </button>
    </div>
  );
}
