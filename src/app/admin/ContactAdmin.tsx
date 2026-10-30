"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { inputBase, labelBase } from "../adminWidgets";
import { ContactInfo, saveContactInfo } from "../../lib/data";

export function ContactAdmin({ contact, onChange }: { contact: ContactInfo; onChange: (next: ContactInfo) => void }) {
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{
    checked: boolean;
    ok?: boolean;
    message?: string;
    adminNotificationEmail?: string;
  }>({ checked: false });
  const [testRecipient, setTestRecipient] = useState("");

  function update(patch: Partial<ContactInfo>) {
    onChange({ ...contact, ...patch });
  }

  async function handleSave() {
    const ok = await saveContactInfo(contact);
    if (ok) toast.success("Contact info saved and published!");
    else toast.error("Save failed — changes were NOT stored. Check the console (F12) for details.");
  }

  async function checkSmtp() {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/admin/email-status");
      const data = await res.json();
      setSmtpStatus({
        checked: true,
        ok: data.ok,
        message: data.message,
        adminNotificationEmail: data.adminNotificationEmail,
      });
      if (data.ok) {
        toast.success("SMTP Connection Verified! Ready to send emails.");
      } else {
        toast.error(`SMTP Issue: ${data.message || "Failed to verify connection"}`);
      }
    } catch (err: any) {
      setSmtpStatus({
        checked: true,
        ok: false,
        message: err.message || "Network error checking email status.",
      });
      toast.error("Could not check SMTP status.");
    } finally {
      setTestingConnection(false);
    }
  }

  async function sendTest() {
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testRecipient || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Test email sent successfully!");
      } else {
        toast.error(`Email sending failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(`Error sending test email: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl font-['Inter',sans-serif]">
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

      <div>
        <button
          onClick={handleSave}
          className="bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
        >
          Save Contact Info
        </button>
      </div>

      {/* SMTP Email Services & Testing */}
      <div className="border border-[#a65a4a]/20 rounded-xl p-6 bg-[#faf6f2]">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-[#993925]" />
          <h3 className="font-['Inter',sans-serif] text-[16px] font-bold text-[#1e1e1e]">
            Email Delivery &amp; SMTP Diagnostics
          </h3>
        </div>
        <p className="text-[13px] text-[#706460] mb-4">
          Mahila Action automatically delivers notifications and receipts for contact messages, donations, event signups, volunteer applications, and password resets.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            type="button"
            onClick={checkSmtp}
            disabled={testingConnection}
            className="flex items-center gap-2 bg-white border border-[#a65a4a]/30 text-[#993925] text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#993925]/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Check SMTP Connection
          </button>

          {smtpStatus.checked && (
            <div className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg ${smtpStatus.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
              {smtpStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{smtpStatus.message}</span>
            </div>
          )}
        </div>

        <div className="border-t border-[#a65a4a]/15 pt-4">
          <p className="text-[13px] font-semibold text-[#1e1e1e] mb-2">Send a Live Test Email</p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="email"
              placeholder="recipient@example.com (defaults to admin)"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className={`${inputBase} flex-1`}
            />
            <button
              type="button"
              onClick={sendTest}
              disabled={sendingTest}
              className="flex items-center gap-2 bg-[#993925] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#802f1e] transition-colors cursor-pointer disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
            >
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
