"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { inter, fraunces } from "../components/shared/styleHelpers";

const GPAY_QR_IMAGE = "https://placehold.co/320x320/f4efe7/1e1e1e?text=Google+Pay+QR";
const PHONEPE_QR_IMAGE = "https://placehold.co/320x320/f4efe7/1e1e1e?text=PhonePe+QR";

export function PaymentModal({
  amount,
  name,
  email,
  onClose,
  onSuccess,
}: {
  amount: number;
  name: string;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qrMethod, setQrMethod] = useState<"gpay" | "phonepe">("gpay");
  const [confirming, setConfirming] = useState(false);
  const [qrError, setQrError] = useState(false);

  if (!amount || amount <= 0) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-[92vw] max-w-[420px] p-7 text-center shadow-2xl">
          <p className={`${inter()} text-[#1e1e1e]/70 text-[14px] mb-5`}>
            Something went wrong setting up this payment — the amount wasn't recognized. Please close this and try again.
          </p>
          <button onClick={onClose} className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] font-semibold text-[15px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
            Close
          </button>
        </div>
      </div>
    );
  }

  function handleConfirmPaid() {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      onSuccess();
    }, 900);
  }

  const qrImage = qrMethod === "gpay" ? GPAY_QR_IMAGE : PHONEPE_QR_IMAGE;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[420px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#a65a4a] px-6 py-5 flex items-center justify-between">
          <div>
            <p className={`${inter()} text-[#f4efe7] text-[13px] opacity-80`}>Paying for</p>
            <p className={`${fraunces()} text-[#f4efe7] text-[20px] font-semibold`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Mahila Action
            </p>
          </div>
          <div className="text-right">
            <p className={`${inter()} text-[#f4efe7]/80 text-[13px]`}>Amount</p>
            <p className={`${inter()} text-[#f4efe7] text-[24px] font-bold`}>₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose} className="ml-4 text-[#f4efe7]/80 hover:text-[#f4efe7] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Donor info summary */}
          <div className="w-full bg-[#f4efe7] rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-[#587735] shrink-0" />
            <div>
              <p className={`${inter()} text-[#1e1e1e] text-[13px] font-medium`}>{name || "Anonymous Donor"}</p>
              <p className={`${inter()} text-[#1e1e1e]/60 text-[12px]`}>{email || "No email provided"}</p>
            </div>
          </div>

          {/* Google Pay / PhonePe toggle */}
          <div className="flex gap-2 w-full">
            {([
              { id: "gpay" as const, label: "Google Pay" },
              { id: "phonepe" as const, label: "PhonePe" },
            ]).map(m => (
              <button
                key={m.id}
                onClick={() => { setQrMethod(m.id); setQrError(false); }}
                className={`${inter()} flex-1 py-2.5 text-[13px] font-semibold rounded-lg border transition-colors cursor-pointer ${qrMethod === m.id ? "bg-[#a65a4a] text-[#f4efe7] border-[#a65a4a]" : "text-[#a65a4a] border-[#a65a4a]/40 hover:border-[#a65a4a]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* QR code */}
          {/* QR code */}
          <div className="border-2 border-[#a65a4a]/25 rounded-2xl p-4 bg-white flex items-center justify-center size-[260px]">
            {qrError ? (
              <p className={`${inter()} text-[#1e1e1e]/50 text-[13px] text-center px-4`}>
                QR code couldn't load. Please check your connection, or use the {qrMethod === "gpay" ? "PhonePe" : "Google Pay"} option instead.
              </p>
            ) : (
              <img
                src={qrImage}
                alt={`${qrMethod === "gpay" ? "Google Pay" : "PhonePe"} QR code`}
                className="size-full object-contain"
                onError={() => setQrError(true)}
              />
            )}
          </div>
          <p className={`${inter()} text-[#1e1e1e]/60 text-[13px] text-center`}>
            Scan this code with {qrMethod === "gpay" ? "Google Pay" : "PhonePe"} (or any UPI app) to pay <strong className="text-[#a65a4a]">₹{amount.toLocaleString("en-IN")}</strong>.
          </p>

          <button
            onClick={handleConfirmPaid}
            disabled={confirming}
            className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-3`}
          >
            {confirming ? (
              <>
                <svg className="animate-spin size-5 text-[#f4efe7]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Confirming…
              </>
            ) : "I've Completed the Payment"}
          </button>

          <p className={`${inter()} text-center text-[11px] text-[#1e1e1e]/40`}>
            🔒 Payments are made directly via UPI · Your details are safe
          </p>
        </div>
      </div>
    </div>
  );
}
