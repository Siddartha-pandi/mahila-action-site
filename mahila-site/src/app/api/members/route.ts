import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

// Member accounts, for the admin Submissions panel. Password hashes and reset
// tokens are never selected — this endpoint only exposes contact details.
export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await queryDb(
      "SELECT id, name, email, phone, skills, status, created_at FROM volunteer_accounts ORDER BY created_at DESC"
    );
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("GET /api/members error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
