import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest, getUserSessionFromRequest, isSuperAdminActor, verifyAdminPermission } from "@/lib/auth";
import { getServerRoles, saveServerRoles } from "@/lib/rolesServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  const userSess = admin ? null : await getUserSessionFromRequest(req);
  if (!admin && !userSess) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const roles = await getServerRoles(true);
    return NextResponse.json({ ok: true, roles }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("GET /api/admin/roles error:", err);
    return NextResponse.json({ error: "Failed to load roles." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "roles", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isSuperAdminActor(auth.admin)) {
    return NextResponse.json({ error: "Only a Super Admin can modify the role permissions matrix." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rawRoles = Array.isArray(body) ? body : body?.roles;
    if (!Array.isArray(rawRoles)) {
      return NextResponse.json({ error: "Invalid payload: roles array is required." }, { status: 400 });
    }

    const saved = await saveServerRoles(rawRoles);
    console.info(
      "[AUDIT] Role permissions matrix updated:",
      JSON.stringify({
        actor: auth.admin?.email,
        roleIds: saved.map((r) => r.id),
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ ok: true, roles: saved });
  } catch (err: any) {
    console.error("PUT /api/admin/roles error:", err);
    return NextResponse.json({ error: "Failed to update roles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
