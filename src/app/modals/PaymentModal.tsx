"use client";

import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { inter, fraunces } from "../components/shared/styleHelpers";
import { getDonationConfig, buildUpiPayUrl } from "@/lib/donationConfig";
import { saveDonation } from "@/lib/backend";
import { validateUtr } from "@/lib/utrValidation";

export function PaymentModal({
  amount,
  name,
  email,
  phone,
  panNumber,
  address,
  is80G,
  campaignName,
  donationType = "one-time",
  anonymous = false,
  onClose,
  onSuccess,
}: {
  amount: number;
  name: string;
  email: string;
  phone: string;
  panNumber?: string;
  address?: string;
  is80G?: boolean;
  campaignName: string;
  donationType?: "one-time" | "monthly";
  anonymous?: boolean;
  onClose: () => void;
  onSuccess: (result: {
    receiptNumber?: string;
    donationId?: string | number;
    transactionId?: string;
    paymentMethod: string;
  }) => void;
}) {
  const config = getDonationConfig();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [utrStatus, setUtrStatus] = useState<{
    status: "idle" | "checking" | "valid" | "duplicate" | "invalid";
    message?: string;
  }>({ status: "idle" });

  // Generate UPI URI
  const upiUrl = buildUpiPayUrl({
    vpa: config.upi.vpa,
    payeeName: config.upi.payeeName,
    amount,
    note: `Mahila Action - ${campaignName.slice(0, 30)}`,
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    upiUrl
  )}`;

  // Real-time UTR checker & duplicate verification
  useEffect(() => {
    const clean = utrNumber.trim();
    if (!clean) {
      setUtrStatus({ status: "idle" });
      return;
    }

    if (clean.length < 8) {
      setUtrStatus({
        status: "invalid",
        message: `Please enter all 12 digits (${clean.length}/12 entered)`,
      });
      return;
    }

    const formatErr = validateUtr(clean, true);
    if (formatErr) {
      setUtrStatus({ status: "invalid", message: formatErr });
      return;
    }

    // Debounced check against database to verify UTR availability
    const timer = setTimeout(async () => {
      setUtrStatus({ status: "checking", message: "Verifying UTR…" });
      try {
        const res = await fetch(`/api/donations/verify-utr?utr=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data.found) {
          setUtrStatus({
            status: "duplicate",
            message: `Already used for receipt ${data.donation?.receiptNumber || "earlier"}.`,
          });
        } else if (data.available) {
          setUtrStatus({
            status: "valid",
            message: "✓ UTR verified & available",
          });
        } else {
          setUtrStatus({
            status: "invalid",
            message: data.message || "Invalid UTR format",
          });
        }
      } catch {
        setUtrStatus({ status: "valid", message: "✓ UTR format verified" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [utrNumber]);

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2500);
    }
  }

  async function handleConfirmPayment() {
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      toast.error("Please enter the 12-digit UPI Reference / UTR Number from your payment app.");
      return;
    }

    const formatErr = validateUtr(cleanUtr, true);
    if (formatErr) {
      toast.error(formatErr);
      return;
    }

    if (utrStatus.status === "duplicate") {
      toast.error("This UTR has already been recorded. Duplicate submissions are not allowed.");
      return;
    }

    setConfirming(true);
    try {
      const txId = cleanUtr;
      const res = await saveDonation({
        amount,
        name: anonymous ? "" : name,
        email: anonymous ? "" : email,
        phone,
        anonymous: !!anonymous,
        donation_type: donationType,
        campaign_name: campaignName,
        pan_number: is80G && !anonymous ? panNumber : undefined,
        address: is80G && !anonymous ? address : undefined,
        payment_method: "upi",
        transaction_id: txId,
      });

      if (!res.ok) {
        toast.error(res.error || "Payment recording failed. Please try again.");
        setConfirming(false);
        return;
      }

      toast.success("Thank you! Your donation and receipt have been created.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_campaigns_changed"));
      }
      onSuccess({
        receiptNumber: res.receipt_number || `MA-REC-${new Date().getFullYear()}-${String(res.id || 1).padStart(4, "0")}`,
        donationId: res.id,
        transactionId: txId,
        paymentMethod: "UPI",
      });
    } catch (err: any) {
      console.error("Donation recording error:", err);
      toast.error("Failed to complete transaction recording.");
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-[94vw] sm:w-[95vw] max-w-[480px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#993925] px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between text-[#f4efe7]">
          <div>
            <p className={`${inter()} text-[11px] sm:text-[12px] uppercase tracking-wider opacity-80 font-medium flex items-center gap-1.5`}>
              <QrCode size={14} /> Scan &amp; Pay via UPI
            </p>
            <p
              className={`${fraunces()} text-[17px] sm:text-[20px] font-semibold tracking-tight`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              {config.ngo.shortName}
            </p>
          </div>
          <div className="text-right">
            <p className={`${inter()} text-[11px] sm:text-[12px] opacity-80`}>Amount</p>
            <p className={`${inter()} text-[20px] sm:text-[24px] font-bold text-white`}>
              ₹{amount.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 sm:ml-3 p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Summary Pill */}
          <div className="bg-[#f4efe7] border border-[#a65a4a]/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={18} className="text-[#587735] shrink-0" />
              <div>
                <p className={`${inter()} text-[13px] font-medium text-[#1e1e1e]`}>
                  {anonymous ? "Anonymous Supporter" : name || "Supporter"}
                </p>
                <p className={`${inter()} text-[11px] text-[#6e625d]`}>
                  {campaignName}
                </p>
              </div>
            </div>
            <div className="text-right hidden xs:block">
              <span className="text-[11px] font-semibold text-[#587735] bg-[#587735]/15 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <ShieldCheck size={12} /> Instant 80G
              </span>
            </div>
          </div>

          {/* UPI QR & ID Content */}
          <div className="flex flex-col items-center gap-3.5 sm:gap-4 text-center">
            <p className={`${inter()} text-[12px] sm:text-[13px] text-[#6e625d]`}>
              Scan using <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, <strong>BHIM</strong>, or any UPI app:
            </p>

            {/* Dynamic QR Code */}
            <div className="p-3 bg-white border-2 border-[#993925]/30 rounded-2xl shadow-sm">
              <img
                src={qrImageUrl}
                alt={`UPI QR Code for ₹${amount}`}
                className="size-[180px] sm:size-[220px] object-contain"
              />
            </div>

            {/* UPI ID copy box */}
            <div className="w-full bg-[#f8f5f1] border border-[#eaded6] rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#6e625d] font-semibold">
                  UPI ID (VPA)
                </p>
                <p className="text-[13px] sm:text-[14px] font-mono font-bold text-[#1e1e1e] truncate">
                  {config.upi.vpa}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(config.upi.vpa, "UPI ID")}
                className="shrink-0 px-3 py-1.5 bg-white border border-[#eaded6] rounded-lg text-[12px] font-semibold text-[#993925] hover:bg-[#993925] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copiedField === "UPI ID" ? <Check size={14} /> : <Copy size={14} />}
                {copiedField === "UPI ID" ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Mobile Pay Link */}
            <a
              href={upiUrl}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#993925] hover:underline sm:hidden"
            >
              Open directly in UPI App <ExternalLink size={14} />
            </a>

            {/* UTR Input & Live Checker */}
            <div className="w-full text-left space-y-1.5">
              <label className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] flex items-center justify-between`}>
                <span className="flex items-center gap-1.5">
                  UPI Reference / UTR Number <span className="text-[#993925]">*</span>
                </span>
                <span className="text-[11px] font-medium text-[#993925]">Required</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16))}
                  placeholder="Enter 12-digit UTR (e.g. 412356789012)"
                  maxLength={16}
                  className={`${inter()} w-full bg-[#f8f5f1] border ${
                    utrStatus.status === "valid"
                      ? "border-[#587735] focus:border-[#587735] bg-[#587735]/5"
                      : utrStatus.status === "duplicate" || utrStatus.status === "invalid"
                      ? "border-red-500 focus:border-red-500 bg-red-50/40"
                      : "border-[#eaded6] focus:border-[#993925]"
                  } rounded-xl px-4 py-2.5 text-[14px] font-mono text-[#1e1e1e] placeholder-[#a49690] focus:outline-none transition-colors pr-9`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  {utrStatus.status === "checking" && (
                    <Loader2 size={16} className="text-[#993925] animate-spin" />
                  )}
                  {utrStatus.status === "valid" && (
                    <CheckCircle2 size={16} className="text-[#587735]" />
                  )}
                  {(utrStatus.status === "duplicate" || utrStatus.status === "invalid") && (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
              </div>

              {/* Status Message */}
              {utrStatus.message && (
                <p
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    utrStatus.status === "valid"
                      ? "text-[#587735]"
                      : utrStatus.status === "duplicate" || utrStatus.status === "invalid"
                      ? "text-red-600"
                      : "text-[#6e625d]"
                  }`}
                >
                  {utrStatus.message}
                </p>
              )}

              <p className="text-[11px] text-[#6e625d]">
                12-digit reference number found in Google Pay, PhonePe, Paytm, or BHIM receipt details.
              </p>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={
                confirming ||
                !utrNumber.trim() ||
                utrStatus.status === "duplicate" ||
                utrStatus.status === "invalid" ||
                utrStatus.status === "checking"
              }
              className={`${inter()} w-full bg-[#993925] text-white text-[15px] sm:text-[16px] font-semibold py-3.5 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md`}
            >
              {confirming ? (
                <>
                  <svg className="animate-spin size-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Receipt…
                </>
              ) : (
                <>I have completed the payment <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#faf6f2] border-t border-[#eaded6] px-4 sm:px-6 py-2.5 sm:py-3 text-center">
          <p className={`${inter()} text-[11px] text-[#6e625d]`}>
            Mahila Action &bull; Registered Society Reg: {config.ngo.regNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
