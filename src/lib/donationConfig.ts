import donationConfigJson from "@/data/donation_config.json";

export interface DonationConfig {
  ngo: {
    name: string;
    shortName: string;
    regNumber: string;
    pan: string;
    "80g_urn": string;
    "12a_urn": string;
    address: string;
    email: string;
    phone: string;
    website: string;
  };
  upi: {
    vpa: string;
    payeeName: string;
    merchantCode?: string;
  };
  bank: {
    accountName: string;
    accountNumber: string;
    accountType: string;
    bankName: string;
    ifsc: string;
    branch: string;
  };
  razorpay: {
    enabled: boolean;
    keyId?: string;
  };
}

export function getDonationConfig(): DonationConfig {
  const config: DonationConfig = {
    ...donationConfigJson,
    razorpay: {
      ...donationConfigJson.razorpay,
      keyId: undefined,
    },
  };

  // Allow environment overrides if provided
  if (process.env.NEXT_PUBLIC_UPI_VPA) {
    config.upi.vpa = process.env.NEXT_PUBLIC_UPI_VPA;
  }
  if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    config.razorpay.keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  } else if (process.env.RAZORPAY_KEY_ID) {
    config.razorpay.keyId = process.env.RAZORPAY_KEY_ID;
  }

  return config;
}

/**
 * Generate UPI Intent URL and QR Code data string.
 * standard format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 */
export function buildUpiPayUrl(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  note?: string;
  transactionRef?: string;
}): string {
  const cleanVpa = params.vpa.trim();
  const cleanName = encodeURIComponent(params.payeeName.trim());
  const formattedAmount = params.amount.toFixed(2);
  const note = encodeURIComponent(params.note || "Donation to Mahila Action");

  let url = `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${note}`;
  if (params.transactionRef) {
    url += `&tr=${encodeURIComponent(params.transactionRef)}`;
  }
  return url;
}

/**
 * Number to words converter for Indian Rupee amounts on receipts
 */
export function numberToWordsInINR(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(num);
  if (n === 0) return "Zero Rupees Only";

  function convertPart(n: number): string {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const units = a[n % 10];
    return tens + (units ? " " + units : "");
  }

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertPart(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertPart(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertPart(thousand)} Thousand`);
  if (hundred > 0) parts.push(`${convertPart(hundred)} Hundred`);
  if (rest > 0) parts.push(convertPart(rest));

  return `Rupees ${parts.join(" ")} Only`;
}
