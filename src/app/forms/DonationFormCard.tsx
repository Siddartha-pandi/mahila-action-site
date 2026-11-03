"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, ChevronRight, FileText, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  firstError,
  validateAmount,
  validateEmail,
  validateName,
  validatePhone,
  validatePanNumber,
  validateAddress,
} from "@/lib/validation";
import { CAMPAIGNS, Campaign, formatLakh } from "../constants/campaigns";
import { inter, fraunces } from "../components/shared/styleHelpers";
import { PaymentModal } from "../modals/PaymentModal";
import { useProfileField } from "../hooks/useUserProfile";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export function DonationFormCard({
  eventName,
  initialCampaignId,
  initialName,
  initialEmail,
  initialPhone,
  campaigns = CAMPAIGNS,
  onCampaignChange,
  onDonationSuccess,
  onSaved,
}: {
  eventName?: string;
  initialCampaignId?: string;
  /** Prefilled when the donor is signed in, so they don't retype their details. */
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  /** Dynamic campaign list with live raised amounts. */
  campaigns?: Campaign[];
  /** Notifies parent when the donor switches campaign in the dropdown. */
  onCampaignChange?: (campaignId: string) => void;
  /** Notifies parent immediately upon successful donation with amount and campaign. */
  onDonationSuccess?: (info: { campaignId: string; amount: number; campaignName?: string }) => void;
  /** Fires once the donation is recorded — lets a host page refresh its history. */
  onSaved?: () => void;
}) {
  const [customAmount, setCustomAmount] = useState<string>("1000");
  const donationType = "one-time";
  const customInputRef = useRef<HTMLInputElement>(null);
  // Prefilled from the signed-in donor's profile, and still fully editable.
  const [donorName, setDonorName] = useProfileField(initialName);
  const [donorEmail, setDonorEmail] = useProfileField(initialEmail);
  const [donorPhone, setDonorPhone] = useProfileField(initialPhone);
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? campaigns[0]?.id ?? CAMPAIGNS[0].id);
  const [anonymous, setAnonymous] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Success state metadata
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    receiptNumber?: string;
    donationId?: string | number;
    transactionId?: string;
    paymentMethod?: string;
  }>({});

  // Keep the dropdown in sync if the person picks a different campaign card further down the page.
  useEffect(() => {
    if (initialCampaignId) setCampaignId(initialCampaignId);
  }, [initialCampaignId]);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0] ?? CAMPAIGNS[0];
  const finalAmount = parseInt(customAmount, 10) || 0;

  function handleSelectPreset(preset: number) {
    setCustomAmount(String(preset));
  }

  function handleProceed() {
    const invalid = firstError(
      validateAmount(finalAmount),
      validatePhone(donorPhone),
      validateName(donorName, "full name", { required: !anonymous }),
      validateEmail(donorEmail, "email address", { required: !anonymous })
    );

    if (invalid) return toast.error(invalid);
    setShowPayment(true);
  }

  function handlePaymentSuccess(result: {
    receiptNumber?: string;
    donationId?: string | number;
    transactionId?: string;
    paymentMethod: string;
  }) {
    setShowPayment(false);
    setSuccessData(result);
    setPaymentSuccess(true);
    onDonationSuccess?.({
      campaignId,
      amount: finalAmount,
      campaignName: selectedCampaign.name,
    });
    onSaved?.();
  }

  function handleSuccessClose() {
    setPaymentSuccess(false);
    setSuccessData({});
    setDonorName(initialName ?? "");
    setDonorEmail(initialEmail ?? "");
    setDonorPhone(initialPhone ?? "");
    setCustomAmount("1000");
  }

  function handleOpenReceipt() {
    if (successData.donationId) {
      window.open(`/api/donations/${successData.donationId}/receipt`, "_blank");
    } else {
      window.print();
    }
  }

  if (paymentSuccess) {
    return (
      <div className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col items-center text-center gap-4 sm:gap-5 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center text-[#587735] shadow-inner">
          <CheckCircle size={36} strokeWidth={2.5} />
        </div>

        <div>
          <span className="text-[12px] uppercase font-bold tracking-widest text-[#587735] bg-[#587735]/10 px-3 py-1 rounded-full border border-[#587735]/20">
            Payment Confirmed
          </span>
          <h3
            className={`${fraunces()} text-[#1e1e1e] text-[22px] sm:text-[26px] font-semibold capitalize mt-2`}
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Thank You for Your Generosity!
          </h3>
          <p className={`${inter()} text-[#1e1e1e]/75 text-[14px] mt-1`}>
            {donorName && !anonymous ? `Dear ${donorName}, your` : "Your"} contribution of{" "}
            <strong className="text-[#a65a4a] text-[16px]">₹{finalAmount.toLocaleString("en-IN")}</strong> has been received by Mahila Action.
          </p>
        </div>

        {/* Receipt Details Card */}
        <div className="w-full bg-white border border-[#a65a4a]/25 rounded-2xl p-4 text-left space-y-2 text-[13px]">
          <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
            <span className="text-[#6e625d] font-medium">Receipt Number:</span>
            <span className="font-mono font-bold text-[#993925]">
              {successData.receiptNumber || `MA-REC-${new Date().getFullYear()}-0001`}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
            <span className="text-[#6e625d] font-medium">Cause / Campaign:</span>
            <span className="font-semibold text-[#1e1e1e] text-right truncate max-w-[200px]">
              {selectedCampaign.name}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
            <span className="text-[#6e625d] font-medium">Payment Mode:</span>
            <span className="font-medium text-[#1e1e1e]">
              {successData.paymentMethod || "UPI"}
            </span>
          </div>

          {successData.transactionId && (
            <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
              <span className="text-[#6e625d] font-medium">Transaction / UTR:</span>
              <span className="font-mono text-[#1e1e1e] truncate max-w-[180px] break-all">
                {successData.transactionId}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={handleOpenReceipt}
            className={`${inter()} w-full bg-[#993925] text-[#f4efe7] text-[15px] font-semibold py-3.5 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md`}
          >
            <Printer size={18} />
            Print / Download Receipt
          </button>

          <button
            type="button"
            onClick={handleSuccessClose}
            className={`${inter()} w-full bg-white border border-[#a65a4a]/40 text-[#a65a4a] text-[15px] font-semibold py-3 rounded-full hover:bg-[#f4efe7] transition-colors cursor-pointer`}
          >
            Donate Again
          </button>
        </div>

        {donorEmail && !anonymous && (
          <p className={`${inter()} text-[11px] text-[#1e1e1e]/60 flex items-center gap-1`}>
            <FileText size={12} />
            An official receipt has also been sent to <strong>{donorEmail}</strong>.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 shadow-lg">
        <div>
          <h3
            className={`${fraunces()} text-[#1e1e1e] text-[22px] sm:text-[24px] font-semibold capitalize`}
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {eventName ? "Donate To This Event" : "Make a Contribution"}
          </h3>
          <p className={`${inter()} text-[13px] text-[#6e625d] mt-1`}>
            100% of your gift directly supports grassroot programs.
          </p>
        </div>

        {/* Preset Contribution Chips */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-2`}>
            Select Amount:
          </p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                if (PRESET_AMOUNTS.includes(finalAmount)) setCustomAmount("");
                customInputRef.current?.focus();
              }}
              className={`${inter()} py-2 px-1 text-[12px] sm:text-[13px] font-semibold rounded-xl border transition-all cursor-pointer text-center ${
                !PRESET_AMOUNTS.includes(finalAmount)
                  ? "bg-[#993925] text-white border-[#993925] shadow-sm"
                  : "bg-white/80 border-[#a65a4a]/30 text-[#6e625d] hover:border-[#993925]"
              }`}
            >
              Custom
            </button>
            {PRESET_AMOUNTS.map((amt) => {
              const active = finalAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSelectPreset(amt)}
                  className={`${inter()} py-2 px-1 text-[12px] sm:text-[14px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    active
                      ? "bg-[#993925] text-white border-[#993925] shadow-sm"
                      : "bg-white/80 border-[#a65a4a]/30 text-[#1e1e1e] hover:border-[#993925]"
                  }`}
                >
                  ₹{amt.toLocaleString("en-IN")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom amount input */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-1`}>
            Contribution Amount (₹):
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2 flex items-center gap-2">
            <span className="text-[#a65a4a] font-bold text-[18px]">₹</span>
            <input
              ref={customInputRef}
              type="text"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter amount in Rupees"
              className={`${inter()} w-full bg-transparent text-[17px] font-semibold text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
        </div>

        {/* Campaign selector */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-1`}>
            Direct Support Towards:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <select
              value={campaignId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                onCampaignChange?.(e.target.value);
              }}
              className={`${inter()} w-full bg-transparent text-[14px] text-[#1e1e1e] font-medium focus:outline-none cursor-pointer`}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatLakh(c.raised)} raised)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Name */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-1`}>
            Full Name: {!anonymous && <span className="text-[#a65a4a]">*</span>}
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your full legal name"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[14px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-1`}>
            Email Address: {!anonymous && <span className="text-[#a65a4a]">*</span>}
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="For tax receipt & acknowledgement"
              type="email"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[14px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Phone — always required */}
        <div>
          <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] uppercase tracking-wider mb-1`}>
            Phone Number: <span className="text-[#a65a4a]">*</span>
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="+91 98765 43210"
              type="tel"
              className={`${inter()} w-full bg-transparent text-[14px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
        </div>

        {/* Anonymous Toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="size-4 accent-[#993925] cursor-pointer"
          />
          <span className={`${inter()} text-[13px] font-medium text-[#1e1e1e]`}>
            Donate anonymously (hide my identity publicly)
          </span>
        </label>

        {/* CTA */}
        <button
          type="button"
          onClick={handleProceed}
          className={`${inter()} w-full bg-[#993925] text-[#f4efe7] text-[16px] sm:text-[18px] font-semibold py-3.5 sm:py-4 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg mt-1`}
        >
          Proceed to Donate <ChevronRight size={20} />
        </button>

        <p className={`${inter()} text-center text-[12px] text-[#1e1e1e]/60`}>
          🔒 Secure UPI &amp; QR Payment &bull; Instant Confirmation
        </p>
      </div>

      {showPayment && (
        <PaymentModal
          amount={finalAmount}
          name={anonymous ? "" : donorName}
          email={anonymous ? "" : donorEmail}
          phone={donorPhone}
          campaignName={selectedCampaign.name}
          donationType={donationType}
          anonymous={anonymous}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
