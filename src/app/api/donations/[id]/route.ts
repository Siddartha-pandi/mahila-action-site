import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    await queryDb("DELETE FROM donations WHERE id = $1", [params.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/donations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { status } = (await req.json()) || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    }
    await queryDb("UPDATE donations SET status = $1 WHERE id = $2", [status, params.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/donations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
