"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { saveDonation } from "@/lib/backend";
import { firstError, validateAmount, validateEmail, validateName, validatePhone } from "@/lib/validation";
import { CAMPAIGNS, formatLakh } from "../constants/campaigns";
import { inter, fraunces } from "../components/shared/styleHelpers";
import { PaymentModal } from "../modals/PaymentModal";
import { useProfileField } from "../hooks/useUserProfile";

export function DonationFormCard({
  eventName,
  initialCampaignId,
  initialName,
  initialEmail,
  initialPhone,
  onSaved,
}: {
  eventName?: string;
  initialCampaignId?: string;
  /** Prefilled when the donor is signed in, so they don't retype their details. */
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  /** Fires once the donation is recorded — lets a host page refresh its history. */
  onSaved?: () => void;
}) {
  const [customAmount, setCustomAmount] = useState("");
  // Prefilled from the signed-in donor's profile, and still fully editable.
  const [donorName, setDonorName] = useProfileField(initialName);
  const [donorEmail, setDonorEmail] = useProfileField(initialEmail);
  const [donorPhone, setDonorPhone] = useProfileField(initialPhone);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? CAMPAIGNS[0].id);
  const [anonymous, setAnonymous] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Keep the dropdown in sync if the person picks a different campaign card further down the page.
  useEffect(() => {
    if (initialCampaignId) setCampaignId(initialCampaignId);
  }, [initialCampaignId]);

  const selectedCampaign = CAMPAIGNS.find(c => c.id === campaignId) ?? CAMPAIGNS[0];
  const finalAmount = parseInt(customAmount, 10) || 0;

  function handleProceed() {
    // Checked here rather than after payment — the server rejects malformed
    // details, and a donation that fails to record once money has moved is the
    // worst place to find that out. Anonymous donors submit no name or email,
    // so those are only checked when the donor chose to be named.
    const invalid = firstError(
      validateAmount(finalAmount),
      validatePhone(donorPhone),
      !anonymous && donorName.trim() ? validateName(donorName) : null,
      !anonymous && donorEmail.trim() ? validateEmail(donorEmail) : null
    );
    if (invalid) return toast.error(invalid);
    setShowPayment(true);
  }

  async function handlePaymentSuccess() {
    setShowPayment(false);
    const res = await saveDonation({
      amount: finalAmount,
      name: anonymous ? "" : donorName,
      email: anonymous ? "" : donorEmail,
      phone: donorPhone,
      anonymous,
      event_name: eventName,
      campaign_name: selectedCampaign.name,
    });
    if (!res.ok) {
      toast.error(res.error || "Payment succeeded, but we couldn't record it — please contact us with your payment confirmation.");
    } else {
      onSaved?.();
    }
    setPaymentSuccess(true);
  }

  function handleSuccessClose() {
    setPaymentSuccess(false);
    setDonorName(initialName ?? "");
    setDonorEmail(initialEmail ?? "");
    setDonorPhone(initialPhone ?? "");
    setCustomAmount("");
  }

  if (paymentSuccess) {
    return (
      <div className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-7 flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h3 className={`${fraunces()} text-[#1e1e1e] text-[24px] font-semibold capitalize`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          Thank You!
        </h3>
        <p className={`${inter()} text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          {donorName ? `Dear ${donorName}, your` : "Your"} donation of{" "}
          <strong className="text-[#a65a4a]">₹{finalAmount.toLocaleString("en-IN")}</strong> has been received.
        </p>
        <button
          onClick={handleSuccessClose}
          className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}
        >
          Donate Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-7 flex flex-col gap-5">
        <h3
          className={`${fraunces()} text-[#1e1e1e] text-[24px] font-semibold capitalize`}
          style={{
            fontVariationSettings: '"SOFT" 0, "WONK" 1',
          }}
        >
          {eventName ? "Donate To This Event" : "Donate To This Campaign"}
        </h3>

        {/* Custom amount */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Custom Contribution:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="₹ Enter amount"
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
        </div>

        {/* Campaign selector */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Select Campaign:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] focus:outline-none cursor-pointer`}
            >
              {CAMPAIGNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatLakh(c.raised)} raised so far
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Name */}
        <div>
          <p className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}>Full Name:</p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your name"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <p className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}>Email Address:</p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Phone — always required */}
        <div>
          <p className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}>Phone Number: *</p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              type="tel"
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
          {anonymous && (
            <p className={`${inter()} text-[11px] text-[#1e1e1e]/45 mt-1`}>
              Kept private — used only for your donation receipt, never shown publicly.
            </p>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setShowDetails(!showDetails)}
              className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${showDetails ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"}`}
            >
              {showDetails && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
            </div>
            <span className={`${inter()} text-[15px] font-medium text-[#1e1e1e]`}>
              Show my details
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => {
                setAnonymous(!anonymous);
                if (!anonymous) {
                  setDonorName("");
                  setDonorEmail("");
                }
              }}
              className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${anonymous ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"}`}
            >
              {anonymous && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
            </div>
            <span className={`${inter()} text-[15px] font-medium text-[#1e1e1e]`}>
              Donate anonymously
            </span>
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleProceed}
          className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[20px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer flex items-center justify-center gap-2`}
        >
          Support for a Cause <ChevronRight size={20} />
        </button>

        <p className={`${inter()} text-center text-[12px] text-[#1e1e1e]/50`}>
          80G Tax exemption available · Secure payment
        </p>
      </div>
      {showPayment && (
        <PaymentModal
          amount={finalAmount}
          name={anonymous ? "" : donorName}
          email={anonymous ? "" : donorEmail}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
