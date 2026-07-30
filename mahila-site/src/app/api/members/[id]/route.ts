import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

const ALLOWED_STATUSES = ["New", "Contacted", "Completed"];

// Review status only. There is deliberately no DELETE here: a member row is a
// real sign-in account, and removing one while tidying the submissions list
// would lock that person out of the site.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { status } = (await req.json()) || {};
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    }
    await queryDb("UPDATE users SET status = $1 WHERE id = $2 AND role = 'volunteer'", [status, params.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/members/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
