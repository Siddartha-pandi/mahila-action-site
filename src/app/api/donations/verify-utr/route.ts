import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { validateUtr } from "@/lib/utrValidation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = String(searchParams.get("utr") || searchParams.get("q") || "").trim();

    if (!query) {
      return NextResponse.json(
        { ok: false, error: "Please enter a UTR or Receipt number." },
        { status: 400 }
      );
    }

    // Check database for existing donation with this UTR or receipt number
    const res = await queryDb(
      `SELECT id, amount, name, email, phone, donation_type, anonymous, campaign_name, status, payment_method, transaction_id, receipt_number, created_at
       FROM donations
       WHERE LOWER(transaction_id) = LOWER($1) OR LOWER(receipt_number) = LOWER($1)
       LIMIT 1`,
      [query]
    );

    if (res.rows.length > 0) {
      const d = res.rows[0];
      const maskedName = d.anonymous
        ? "Anonymous Supporter"
        : d.name
        ? String(d.name).replace(/\b(\w)\w+/g, "$1***")
        : "Supporter";

      const receiptNum =
        d.receipt_number ||
        `MA-REC-${new Date(d.created_at).getFullYear()}-${String(d.id).padStart(4, "0")}`;

      return NextResponse.json({
        ok: true,
        found: true,
        available: false,
        formatValid: true,
        message: "Transaction verified and officially recorded.",
        donation: {
          id: d.id,
          receiptNumber: receiptNum,
          amount: Number(d.amount),
          campaignName: d.campaign_name || "Community Empowerment",
          donorName: maskedName,
          paymentMethod: String(d.payment_method || "UPI").toUpperCase(),
          transactionId: d.transaction_id,
          status: d.status || "Completed",
          createdAt: d.created_at,
          receiptUrl: `/api/donations/${d.id}/receipt`,
        },
      });
    }

    // Not found in database — check if format is valid for a fresh payment
    const formatErr = validateUtr(query, true);

    if (formatErr) {
      return NextResponse.json({
        ok: true,
        found: false,
        available: false,
        formatValid: false,
        message: formatErr,
      });
    }

    return NextResponse.json({
      ok: true,
      found: false,
      available: true,
      formatValid: true,
      message: "Valid 12-digit UTR format. Ready for instant receipt generation.",
    });
  } catch (err: any) {
    console.error("GET /api/donations/verify-utr error:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to verify transaction at this time." },
      { status: 500 }
    );
  }
}

