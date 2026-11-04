"use client";

import { useState } from "react";
import { Search, X, CheckCircle, ShieldCheck, Printer, AlertTriangle, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { inter, fraunces } from "../components/shared/styleHelpers";

export function TransactionCheckerModal({
  isOpen,
  onClose,
  initialUtr = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialUtr?: string;
}) {
  const [query, setQuery] = useState(initialUtr);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    message?: string;
    donation?: {
      id: string | number;
      receiptNumber: string;
      amount: number;
      campaignName: string;
      donorName: string;
      paymentMethod: string;
      transactionId?: string;
      status: string;
      createdAt: string;
      receiptUrl: string;
    };
  } | null>(null);

  if (!isOpen) return null;

  async function handleCheck(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      toast.error("Please enter a UTR Number or Receipt Number.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/donations/verify-utr?q=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (!res.ok && data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setResult({
        found: !!data.found,
        message: data.message,
        donation: data.donation,
      });

      if (data.found) {
        toast.success("Transaction verified successfully!");
      }
    } catch (err) {
      console.error("UTR verification error:", err);
      toast.error("Unable to check transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-[94vw] sm:w-[95vw] max-w-[500px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#993925] px-5 sm:px-6 py-4 flex items-center justify-between text-[#f4efe7]">
          <div>
            <p className={`${inter()} text-[11px] sm:text-[12px] uppercase tracking-wider opacity-85 font-semibold flex items-center gap-1.5`}>
              <ShieldCheck size={14} /> Official Verification
            </p>
            <h3
              className={`${fraunces()} text-[18px] sm:text-[21px] font-semibold tracking-tight`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Transaction &amp; UTR Checker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          <p className={`${inter()} text-[13px] text-[#6e625d] leading-relaxed`}>
            Verify your UPI payment or download your official 80G tax receipt by entering your <strong>12-digit UTR Number</strong> or <strong>Receipt ID</strong>.
          </p>

          {/* Search Form */}
          <form onSubmit={handleCheck} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. 412356789012 or MA-REC-2026-0001"
                className={`${inter()} w-full bg-[#f8f5f1] border-2 border-[#eaded6] focus:border-[#993925] rounded-xl px-4 py-3 text-[14px] font-mono text-[#1e1e1e] placeholder-[#a49690] focus:outline-none transition-colors`}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className={`${inter()} absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#993925] text-white text-[13px] font-semibold rounded-lg hover:bg-[#802f1e] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer`}
              >
                {loading ? "Checking…" : <><Search size={14} /> Verify</>}
              </button>
            </div>
            <p className="text-[11px] text-[#6e625d]">
              Found on Google Pay, PhonePe, Paytm, or BHIM transaction details.
            </p>
          </form>

          {/* Result: Found */}
          {result && result.found && result.donation && (
            <div className="bg-[#f4efe7] border-2 border-[#587735]/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#587735] bg-[#587735]/15 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle size={13} /> Verified &amp; Recorded
                </span>
                <span className="text-[11px] text-[#6e625d] font-mono">
                  {new Date(result.donation.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between items-center pb-1.5 border-b border-[#a65a4a]/15">
                  <span className="text-[#6e625d]">Receipt Number:</span>
                  <span className="font-mono font-bold text-[#993925]">{result.donation.receiptNumber}</span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-[#a65a4a]/15">
                  <span className="text-[#6e625d]">Amount:</span>
                  <span className="font-bold text-[#1e1e1e] text-[15px]">
                    ₹{result.donation.amount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-[#a65a4a]/15">
                  <span className="text-[#6e625d]">Campaign:</span>
                  <span className="font-medium text-[#1e1e1e] text-right truncate max-w-[200px]">
                    {result.donation.campaignName}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-[#a65a4a]/15">
                  <span className="text-[#6e625d]">Donor:</span>
                  <span className="font-medium text-[#1e1e1e]">{result.donation.donorName}</span>
                </div>

                {result.donation.transactionId && (
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#a65a4a]/15">
                    <span className="text-[#6e625d]">UTR / Ref:</span>
                    <span className="font-mono text-[#1e1e1e] truncate max-w-[180px]">
                      {result.donation.transactionId}
                    </span>
                  </div>
                )}
              </div>

              <a
                href={result.donation.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className={`${inter()} w-full bg-[#993925] text-white text-[14px] font-semibold py-2.5 rounded-xl hover:bg-[#802f1e] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow`}
              >
                <Printer size={16} /> View &amp; Print 80G Receipt <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Result: Not Found */}
          {result && !result.found && (
            <div className="bg-[#fff7ed] border border-[#f97316]/30 rounded-2xl p-4 text-[13px] space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-[#c2410c] font-semibold">
                <AlertTriangle size={16} /> No Record Found
              </div>
              <p className="text-[#7c2d12] text-[12px] leading-relaxed">
                {result.message || "We could not find a confirmed donation matching this UTR or Receipt number."}
              </p>
              <p className="text-[#6e625d] text-[11px] pt-1">
                Tip: After sending payment via UPI, be sure to complete the donation form by submitting your 12-digit UTR in the payment window.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#faf6f2] border-t border-[#eaded6] px-5 py-3 text-center">
          <p className={`${inter()} text-[11px] text-[#6e625d]`}>
            Mahila Action &bull; Instant 80G Tax Exemption Receipt Verification
          </p>
        </div>
      </div>
    </div>
  );
}
