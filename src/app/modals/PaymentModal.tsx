"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Copy, Check, QrCode, Building, CreditCard, ExternalLink, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { inter, fraunces } from "../components/shared/styleHelpers";
import { getDonationConfig, buildUpiPayUrl } from "@/lib/donationConfig";
import { saveDonation } from "@/lib/backend";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

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
  const [activeTab, setActiveTab] = useState<"upi" | "bank" | "razorpay">("upi");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [rzpLoading, setRzpLoading] = useState(false);

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

  // Load Razorpay script dynamically if needed
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2500);
    }
  }

  async function handleConfirmDirectPayment(method: "upi" | "bank_transfer") {
    if (method === "bank_transfer" && !utrNumber.trim()) {
      return toast.error("Please enter your Bank UTR or Transaction Reference number.");
    }

    setConfirming(true);
    try {
      const txId = utrNumber.trim() || `UPI_${Date.now()}`;
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
        payment_method: method,
        transaction_id: txId,
      });

      if (!res.ok) {
        toast.error(res.error || "Payment recording failed. Please try again.");
        setConfirming(false);
        return;
      }

      toast.success("Thank you! Your donation and receipt have been created.");
      onSuccess({
        receiptNumber: res.receipt_number || `MA-REC-${new Date().getFullYear()}-${String(res.id || 1).padStart(4, "0")}`,
        donationId: res.id,
        transactionId: txId,
        paymentMethod: method.toUpperCase(),
      });
    } catch (err: any) {
      console.error("Donation recording error:", err);
      toast.error("Failed to complete transaction recording.");
      setConfirming(false);
    }
  }

  async function handleRazorpayCheckout() {
    setRzpLoading(true);
    try {
      // 1. Create order
      const orderRes = await fetch("/api/donations/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          campaign_name: campaignName,
          donor_name: name,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) {
        toast.error(orderData.error || "Unable to initiate payment gateway.");
        setRzpLoading(false);
        return;
      }

      // 2. If live Razorpay checkout SDK is present
      if (orderData.isLive && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: config.ngo.shortName,
          description: campaignName,
          order_id: orderData.orderId,
          prefill: {
            name: anonymous ? "" : name,
            email: anonymous ? "" : email,
            contact: phone,
          },
          theme: {
            color: "#993925",
          },
          handler: async (response: any) => {
            const txId = response.razorpay_payment_id;
            const saveRes = await saveDonation({
              amount,
              name: anonymous ? "" : name,
              email: anonymous ? "" : email,
              phone,
              anonymous: !!anonymous,
              donation_type: donationType,
              campaign_name: campaignName,
              pan_number: is80G && !anonymous ? panNumber : undefined,
              address: is80G && !anonymous ? address : undefined,
              payment_method: "razorpay",
              transaction_id: txId,
            });

            onSuccess({
              receiptNumber: saveRes.receipt_number,
              donationId: saveRes.id,
              transactionId: txId,
              paymentMethod: "RAZORPAY",
            });
          },
          modal: {
            ondismiss: () => {
              setRzpLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test / Demo simulated gateway
        toast.info("Demonstrating instant gateway verification…");
        setTimeout(async () => {
          const txId = `rzp_demo_${Date.now()}`;
          const saveRes = await saveDonation({
            amount,
            name: anonymous ? "" : name,
            email: anonymous ? "" : email,
            phone,
            anonymous: !!anonymous,
            donation_type: donationType,
            campaign_name: campaignName,
            pan_number: is80G && !anonymous ? panNumber : undefined,
            address: is80G && !anonymous ? address : undefined,
            payment_method: "razorpay_demo",
            transaction_id: txId,
          });

          setRzpLoading(false);
          toast.success("Gateway payment simulation completed!");
          onSuccess({
            receiptNumber: saveRes.receipt_number,
            donationId: saveRes.id,
            transactionId: txId,
            paymentMethod: "RAZORPAY",
          });
        }, 1200);
      }
    } catch (err: any) {
      console.error("Razorpay error:", err);
      toast.error("Could not complete gateway payment.");
      setRzpLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-[94vw] sm:w-[95vw] max-w-[500px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#993925] px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between text-[#f4efe7]">
          <div>
            <p className={`${inter()} text-[11px] sm:text-[12px] uppercase tracking-wider opacity-80 font-medium`}>
              Complete Donation
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#eaded6] bg-[#faf6f2] px-2.5 sm:px-4 pt-2.5 sm:pt-3 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("upi")}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 px-2 sm:px-3 text-[12px] sm:text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "upi"
                ? "border-[#993925] text-[#993925]"
                : "border-transparent text-[#6e625d] hover:text-[#1e1e1e]"
            }`}
          >
            <QrCode size={15} />
            UPI QR
          </button>

          <button
            onClick={() => setActiveTab("bank")}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 px-2 sm:px-3 text-[12px] sm:text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "bank"
                ? "border-[#993925] text-[#993925]"
                : "border-transparent text-[#6e625d] hover:text-[#1e1e1e]"
            }`}
          >
            <Building size={15} />
            Bank Transfer
          </button>

          <button
            onClick={() => setActiveTab("razorpay")}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 px-2 sm:px-3 text-[12px] sm:text-[14px] font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "razorpay"
                ? "border-[#993925] text-[#993925]"
                : "border-transparent text-[#6e625d] hover:text-[#1e1e1e]"
            }`}
          >
            <CreditCard size={15} />
            Cards / Online
          </button>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Summary Pill */}
          <div className="bg-[#f4efe7] border border-[#a65a4a]/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={18} className="text-[#587735] shrink-0" />
              <div>
                <p className={`${inter()} text-[13px] font-medium text-[#1e1e1e]`}>
                  {anonymous ? "Anonymous Supporter" : name || "Supporter"}
                </p>
                <p className={`${inter()} text-[11px] text-[#6e625d]`}>
                  {campaignName} &bull; {donationType === "monthly" ? "Monthly" : "One-Time"}
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1: UPI QR CODE */}
          {activeTab === "upi" && (
            <div className="flex flex-col items-center gap-3.5 sm:gap-4 text-center">
              <p className={`${inter()} text-[13px] text-[#6e625d]`}>
                Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, or any UPI app:
              </p>

              {/* Dynamic QR Code */}
              <div className="p-2.5 sm:p-3 bg-white border-2 border-[#993925]/30 rounded-2xl shadow-sm">
                <img
                  src={qrImageUrl}
                  alt={`UPI QR Code for ₹${amount}`}
                  className="size-[170px] sm:size-[220px] object-contain"
                />
              </div>

              {/* UPI ID copy box */}
              <div className="w-full bg-[#f8f5f1] border border-[#eaded6] rounded-xl p-3 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[11px] uppercase tracking-wider text-[#6e625d] font-semibold">
                    UPI ID (VPA)
                  </p>
                  <p className="text-[13px] font-mono font-bold text-[#1e1e1e]">
                    {config.upi.vpa}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(config.upi.vpa, "UPI ID")}
                  className="px-3 py-1.5 bg-white border border-[#eaded6] rounded-lg text-[12px] font-semibold text-[#993925] hover:bg-[#993925] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
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

              {/* UTR Input */}
              <div className="w-full text-left">
                <label className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] block mb-1`}>
                  UPI Reference / UTR Number (Optional, for instant verification):
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  placeholder="e.g. 412356789012"
                  className={`${inter()} w-full bg-[#f8f5f1] border border-[#eaded6] rounded-xl px-4 py-2.5 text-[14px] font-mono text-[#1e1e1e] placeholder-[#a49690] focus:outline-none focus:border-[#993925]`}
                />
                <p className="text-[11px] text-[#6e625d] mt-1">
                  12-digit number found in Google Pay, PhonePe, or Paytm receipt details.
                </p>
              </div>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={() => handleConfirmDirectPayment("upi")}
                disabled={confirming}
                className={`${inter()} w-full bg-[#993925] text-white text-[16px] font-semibold py-3.5 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-md`}
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
          )}

          {/* TAB 2: BANK TRANSFER (NEFT / RTGS / IMPS) */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <p className={`${inter()} text-[13px] text-[#6e625d]`}>
                Transfer directly via NEFT, RTGS, or IMPS from your net banking application:
              </p>

              <div className="bg-[#faf6f2] border border-[#eaded6] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#6e625d] font-semibold">Account Name</p>
                    <p className="text-[14px] font-bold text-[#1e1e1e]">{config.bank.accountName}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#6e625d] font-semibold">Account Number</p>
                    <p className="text-[15px] font-mono font-bold text-[#993925]">{config.bank.accountNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.bank.accountNumber, "Account Number")}
                    className="px-2.5 py-1 bg-white border border-[#eaded6] rounded text-[11px] font-semibold text-[#993925] hover:bg-[#993925] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedField === "Account Number" ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-[#eaded6]">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#6e625d] font-semibold">IFSC Code</p>
                    <p className="text-[14px] font-mono font-bold text-[#1e1e1e]">{config.bank.ifsc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.bank.ifsc, "IFSC Code")}
                    className="px-2.5 py-1 bg-white border border-[#eaded6] rounded text-[11px] font-semibold text-[#993925] hover:bg-[#993925] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedField === "IFSC Code" ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] text-[#6e625d]">
                  <div>
                    <span className="font-semibold text-[#1e1e1e]">Bank:</span> {config.bank.bankName}
                  </div>
                  <div>
                    <span className="font-semibold text-[#1e1e1e]">Type:</span> {config.bank.accountType}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-[#1e1e1e]">Branch:</span> {config.bank.branch}
                  </div>
                </div>
              </div>

              {/* UTR input */}
              <div>
                <label className={`${inter()} text-[12px] font-semibold text-[#1e1e1e] block mb-1`}>
                  Bank Reference / UTR Number: *
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.trim())}
                  placeholder="e.g. SBIN4261829104"
                  className={`${inter()} w-full bg-[#f8f5f1] border border-[#eaded6] rounded-xl px-4 py-2.5 text-[14px] font-mono text-[#1e1e1e] placeholder-[#a49690] focus:outline-none focus:border-[#993925]`}
                />
                <p className="text-[11px] text-[#6e625d] mt-1">
                  Enter your transaction reference number to receive your instant donation receipt.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmDirectPayment("bank_transfer")}
                disabled={confirming}
                className={`${inter()} w-full bg-[#993925] text-white text-[16px] font-semibold py-3.5 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-md`}
              >
                {confirming ? "Recording Bank Transfer…" : "Confirm Transfer & Get Receipt"}
              </button>
            </div>
          )}

          {/* TAB 3: CARDS & GATEWAY (RAZORPAY) */}
          {activeTab === "razorpay" && (
            <div className="space-y-4 text-center">
              <div className="p-6 bg-[#faf6f2] border border-[#eaded6] rounded-2xl flex flex-col items-center gap-3">
                <div className="size-14 bg-[#993925]/10 rounded-full flex items-center justify-center text-[#993925]">
                  <CreditCard size={28} />
                </div>
                <div>
                  <h4 className={`${inter()} text-[16px] font-bold text-[#1e1e1e]`}>
                    Cards, NetBanking & UPI
                  </h4>
                  <p className={`${inter()} text-[13px] text-[#6e625d] mt-1 max-w-[340px]`}>
                    Pay securely using Visa, MasterCard, RuPay, NetBanking across 50+ Indian banks, or international payment methods.
                  </p>
                </div>
                <div className="flex gap-2 text-[11px] font-semibold text-[#587735] bg-[#587735]/10 px-3 py-1 rounded-full">
                  <span>🔒 256-bit SSL Encrypted</span>
                  <span>&bull;</span>
                  <span>Instant Receipt</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRazorpayCheckout}
                disabled={rzpLoading}
                className={`${inter()} w-full bg-[#993925] text-white text-[16px] font-semibold py-4 rounded-full hover:bg-[#802f1e] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-md`}
              >
                {rzpLoading ? (
                  <>
                    <svg className="animate-spin size-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Opening Payment Gateway…
                  </>
                ) : (
                  <>Pay ₹{amount.toLocaleString("en-IN")} via Gateway <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#faf6f2] border-t border-[#eaded6] px-6 py-3 text-center">
          <p className={`${inter()} text-[11px] text-[#6e625d]`}>
            Mahila Action &bull; Registered Society Reg: {config.ngo.regNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
