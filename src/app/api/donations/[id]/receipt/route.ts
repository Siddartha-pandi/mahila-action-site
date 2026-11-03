import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getDonationConfig, numberToWordsInINR } from "@/lib/donationConfig";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await queryDb("SELECT * FROM donations WHERE id = $1", [id]);
    if (res.rows.length === 0) {
      return new NextResponse("Donation record not found.", { status: 404 });
    }

    const donation = res.rows[0];
    const config = getDonationConfig();
    const isJson = req.nextUrl.searchParams.get("format") === "json";

    const formattedAmount = `₹${Number(donation.amount).toLocaleString("en-IN")}`;
    const amountInWords = numberToWordsInINR(Number(donation.amount));
    const receiptNum = donation.receipt_number || `MA-REC-${new Date(donation.created_at).getFullYear()}-${String(donation.id).padStart(4, "0")}`;
    const dateFormatted = new Date(donation.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (isJson) {
      return NextResponse.json({
        ok: true,
        receipt: {
          receiptNumber: receiptNum,
          date: dateFormatted,
          amount: Number(donation.amount),
          formattedAmount,
          amountInWords,
          donorName: donation.name || "Anonymous Supporter",
          donorEmail: donation.email || "N/A",
          donorPhone: donation.phone || "N/A",
          donorPan: donation.pan_number || "Not Provided",
          donorAddress: donation.address || "N/A",
          campaignName: donation.campaign_name || donation.event_name || "General Empowerment Fund",
          paymentMethod: (donation.payment_method || "UPI").toUpperCase(),
          transactionId: donation.transaction_id || "N/A",
          ngo: config.ngo,
        },
      });
    }

    // Render high-res printable 80G tax exemption receipt HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation Receipt - ${receiptNum}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e1e1e;
      background: #f7f3ee;
      margin: 0;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .receipt-card {
      width: 100%;
      max-width: 780px;
      background: #ffffff;
      border: 2px solid #a65a4a;
      border-radius: 12px;
      padding: 36px 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      position: relative;
    }
    .header {
      border-bottom: 2px solid #a65a4a;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ngo-title {
      font-size: 26px;
      font-weight: 700;
      color: #993925;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
    }
    .ngo-sub {
      font-size: 13px;
      color: #555;
      margin: 2px 0;
      line-height: 1.4;
    }
    .badge-80g {
      background: #f4efe7;
      border: 1px solid #a65a4a;
      border-radius: 8px;
      padding: 8px 14px;
      text-align: right;
    }
    .badge-80g .reg-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #993925;
    }
    .badge-80g .reg-val {
      font-size: 13px;
      font-weight: 600;
      color: #1e1e1e;
      font-family: monospace;
    }
    .title-bar {
      background: #993925;
      color: #f4efe7;
      text-align: center;
      padding: 10px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      background: #faf6f2;
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid #eaded6;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-item strong {
      color: #695d57;
      display: inline-block;
      width: 130px;
    }
    .donor-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .donor-table th, .donor-table td {
      border: 1px solid #eaded6;
      padding: 10px 14px;
      font-size: 13px;
      text-align: left;
    }
    .donor-table th {
      background: #f4efe7;
      color: #993925;
      font-weight: 600;
      width: 25%;
    }
    .donor-table td {
      background: #ffffff;
      color: #1e1e1e;
    }
    .amount-box {
      border: 2px dashed #a65a4a;
      background: #fdfaf7;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-words {
      font-size: 13px;
      color: #555;
    }
    .amount-num {
      font-size: 26px;
      font-weight: 800;
      color: #993925;
    }
    .exemption-clause {
      font-size: 11px;
      color: #666;
      line-height: 1.6;
      border-top: 1px solid #eaded6;
      padding-top: 16px;
      margin-bottom: 28px;
    }
    .sign-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 20px;
      padding-top: 10px;
    }
    .sign-box {
      text-align: center;
      width: 200px;
    }
    .sign-line {
      border-bottom: 1px solid #1e1e1e;
      height: 40px;
      margin-bottom: 6px;
    }
    .sign-title {
      font-size: 12px;
      color: #695d57;
      font-weight: 600;
    }
    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      background: #993925;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover { background: #802f1e; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .receipt-card { border: none; box-shadow: none; padding: 0; }
      .action-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="action-bar">
      <button onclick="window.print()" class="btn">🖨️ Print Receipt / Save PDF</button>
    </div>

    <div class="receipt-card">
      <div class="header">
        <div>
          <h1 class="ngo-title">${config.ngo.name}</h1>
          <p class="ngo-sub">Registration No: <strong>${config.ngo.regNumber}</strong></p>
          <p class="ngo-sub">${config.ngo.address}</p>
          <p class="ngo-sub">Email: ${config.ngo.email} | Phone: ${config.ngo.phone}</p>
        </div>
      </div>

      <div class="title-bar">Official Donation Receipt</div>

      <div class="meta-grid">
        <div class="meta-item"><strong>Receipt Number:</strong> <span style="font-family: monospace; font-weight: 700; color: #993925;">${receiptNum}</span></div>
        <div class="meta-item"><strong>Date of Issue:</strong> ${dateFormatted}</div>
        <div class="meta-item"><strong>Payment Mode:</strong> ${(donation.payment_method || "UPI").toUpperCase()}</div>
        <div class="meta-item"><strong>UTR / Reference ID:</strong> <span style="font-family: monospace;">${donation.transaction_id || (String(donation.payment_method).toLowerCase() === 'cash' ? 'Physical Cash' : 'Direct Transfer')}</span></div>
      </div>

      <table class="donor-table">
        <tr>
          <th>Donor Full Name</th>
          <td><strong>${donation.name || "Anonymous Supporter"}</strong></td>
        </tr>
        <tr>
          <th>Phone & Email</th>
          <td>${donation.phone || "N/A"} &bull; ${donation.email || "N/A"}</td>
        </tr>
        ${donation.pan_number ? `
        <tr>
          <th>PAN Number</th>
          <td style="font-family: monospace; font-weight: 700;">${donation.pan_number}</td>
        </tr>
        ` : ''}
        ${donation.address ? `
        <tr>
          <th>Address / Location</th>
          <td>${donation.address}</td>
        </tr>
        ` : ''}
        <tr>
          <th>Cause / Initiative</th>
          <td><strong>${donation.campaign_name || donation.event_name || "General Empowerment Initiative"}</strong></td>
        </tr>
        ${donation.notes ? `
        <tr>
          <th>Collection Remarks</th>
          <td><em>${donation.notes}</em></td>
        </tr>
        ` : ''}
      </table>

      <div class="amount-box">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #993925; margin-bottom: 2px;">Amount in Words:</div>
          <div class="amount-words"><strong>${amountInWords}</strong></div>
        </div>
        <div class="amount-num">${formattedAmount}</div>
      </div>

      <div class="exemption-clause">
        <strong>Acknowledgement & Record Notice:</strong><br>
        We gratefully acknowledge your contribution to <strong>${config.ngo.name}</strong>. This receipt is computer generated and officially recorded in the Mahila Action books of account.
      </div>

      <div class="sign-section">
        <div>
          <p style="font-size: 11px; color: #888; margin: 0;">Verified and recorded in Mahila Action books of account.</p>
          <p style="font-size: 11px; color: #888; margin: 2px 0 0 0;">Thank you for empowering grassroots women & communities.</p>
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-title">Authorized Signatory</div>
          <div style="font-size: 11px; color: #888;">${config.ngo.name}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    console.error("GET /api/donations/[id]/receipt error:", err);
    return new NextResponse("Internal server error generating receipt.", { status: 500 });
  }
}

