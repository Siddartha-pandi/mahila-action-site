import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing order ID or payment ID." }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keySecret) {
      if (!razorpay_signature) {
        return NextResponse.json({ error: "Missing payment signature." }, { status: 400 });
      }

      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(generatedSignature),
          Buffer.from(razorpay_signature)
        );
      } catch {
        isValid = false;
      }

      if (!isValid) {
        return NextResponse.json({ error: "Invalid payment signature verification." }, { status: 400 });
      }

      return NextResponse.json({ ok: true, verified: true, paymentId: razorpay_payment_id });
    }

    // In production, reject unverified payments if gateway secret is missing
    if (process.env.NODE_ENV === "production") {
      console.error("CRITICAL: Payment verification failed because RAZORPAY_KEY_SECRET is not configured.");
      return NextResponse.json(
        { error: "Payment verification unavailable: gateway secret not configured." },
        { status: 500 }
      );
    }

    // In local development / demo test mode only
    return NextResponse.json({
      ok: true,
      verified: true,
      paymentId: razorpay_payment_id || `pay_sim_${Date.now()}`,
    });
  } catch (err: any) {
    console.error("POST /api/donations/razorpay/verify error:", err);
    return NextResponse.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
