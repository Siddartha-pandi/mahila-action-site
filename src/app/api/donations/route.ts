import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sendDonationReceiptEmail, sendDonationAlertToAdmin } from "@/lib/email";
import {
  firstError,
  validateAmount,
  validateEmail,
  validateName,
  validatePhone,
  validatePanNumber,
  validateAddress,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isOffline =
      body.is_offline === true ||
      body.is_offline === 1 ||
      body.is_offline === "true" ||
      ["cash", "cheque", "demand_draft", "bank_transfer"].includes(
        String(body.payment_method || "").trim().toLowerCase()
      );

    const donationType = body.donation_type || (isOffline ? "one-time" : undefined);
    if (!donationType) {
      return NextResponse.json({ error: "donation_type is required." }, { status: 400 });
    }

    // Phone is required for online donations; optional for offline/cash records
    const phoneError = isOffline
      ? body.phone
        ? validatePhone(body.phone)
        : null
      : validatePhone(body.phone);

    const invalid = firstError(
      validateAmount(body.amount),
      phoneError,
      body.name ? validateName(body.name) : null,
      body.email ? validateEmail(body.email) : null,
      body.pan_number ? validatePanNumber(body.pan_number, false) : null,
      body.address ? validateAddress(body.address, false) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const cleanPan = body.pan_number ? String(body.pan_number).trim().toUpperCase() : null;
    const cleanAddress = body.address ? String(body.address).trim() : null;
    const cleanMethod = body.payment_method
      ? String(body.payment_method).trim().toLowerCase()
      : isOffline
      ? "cash"
      : "upi";
    const cleanTxId = body.transaction_id ? String(body.transaction_id).trim() : null;
    const cleanNotes = body.notes ? String(body.notes).trim() : null;
    const donationStatus = body.status ? String(body.status).trim() : isOffline ? "Completed" : "New";
    const customDate = body.created_at || body.date ? new Date(body.created_at || body.date) : new Date();

    // donations.id is SERIAL — let the sequence assign it.
    const insertRes = await queryDb(
      `INSERT INTO donations (
        amount, name, email, phone, donation_type, anonymous,
        event_name, campaign_name, pan_number, address,
        payment_method, transaction_id, notes, status, is_offline, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, created_at`,
      [
        Number(body.amount),
        body.name || null,
        body.email || null,
        body.phone || null,
        donationType === "monthly" ? "monthly" : "one-time",
        body.anonymous ? 1 : 0,
        body.event_name || null,
        body.campaign_name || null,
        cleanPan,
        cleanAddress,
        cleanMethod,
        cleanTxId,
        cleanNotes,
        donationStatus,
        isOffline,
        customDate,
      ]
    );

    const id = insertRes.rows[0]?.id;
    const currentYear = customDate.getFullYear();
    const receiptNumber = `MA-REC-${currentYear}-${String(id || 1).padStart(4, "0")}`;

    // Update receipt_number in DB
    await queryDb(`UPDATE donations SET receipt_number = $1 WHERE id = $2`, [receiptNumber, id]);

    // Anonymous donors are still receipted if they gave an email to send it to.
    if (body.email) {
      await queryDb(
        "UPDATE users SET kind = 'donor' WHERE LOWER(email) = LOWER($1)",
        [String(body.email).trim()]
      ).catch(() => {});

      sendDonationReceiptEmail(
        body.email,
        body.anonymous ? "" : body.name || "",
        Number(body.amount),
        body.campaign_name || body.event_name || undefined,
        body.donation_type === "monthly",
        {
          receiptNumber,
          panNumber: cleanPan || undefined,
          address: cleanAddress || undefined,
          paymentMethod: cleanMethod,
          transactionId: cleanTxId || undefined,
          donationId: id,
        }
      ).catch((err) => console.error("sendDonationReceiptEmail failed:", err));
    }

    sendDonationAlertToAdmin({
      name: body.name,
      email: body.email,
      phone: body.phone,
      amount: Number(body.amount),
      donationType: body.donation_type === "monthly" ? "monthly" : "one-time",
      campaign: body.campaign_name,
      eventName: body.event_name,
      anonymous: !!body.anonymous,
      receiptNumber,
      paymentMethod: cleanMethod,
      transactionId: cleanTxId || undefined,
      panNumber: cleanPan || undefined,
      address: cleanAddress || undefined,
    }).catch((err) => console.error("sendDonationAlertToAdmin failed:", err));

    return NextResponse.json({
      ok: true,
      id,
      receipt_number: receiptNumber,
      amount: Number(body.amount),
      name: body.name,
      email: body.email,
      payment_method: cleanMethod,
      transaction_id: cleanTxId,
      is_offline: isOffline,
      created_at: customDate.toISOString(),
      status: donationStatus,
    }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/donations error:", err);
    return NextResponse.json({ error: "Could not save submission." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb("SELECT * FROM donations ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/donations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
