import { NextRequest, NextResponse } from "next/server";
import { firstError, validateAmount } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);

    const invalid = firstError(validateAmount(amount));
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // In paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    if (keyId && keySecret) {
      // Call official Razorpay orders API
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            campaign: body.campaign_name || "Mahila Action Donation",
            donor_name: body.donor_name || "Supporter",
          },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error("Razorpay order creation failed:", rzpData);
        return NextResponse.json({ error: rzpData.error?.description || "Gateway order failed" }, { status: 502 });
      }

      return NextResponse.json({
        ok: true,
        orderId: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId,
        isLive: true,
      });
    }

    // Fallback: Test / Demo mode when credentials have not yet been placed in .env
    const simulatedOrderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return NextResponse.json({
      ok: true,
      orderId: simulatedOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: keyId || "rzp_test_placeholder",
      isLive: false,
      message: "Razorpay demo mode (Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env for live gateway)",
    });
  } catch (err: any) {
    console.error("POST /api/donations/razorpay/create-order error:", err);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 500 });
  }
}

