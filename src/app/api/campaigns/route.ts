import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const res = await queryDb(
      "SELECT id, name, tag, category, COALESCE(raised,0) AS raised, COALESCE(goal,0) AS goal, COALESCE(image,'') AS image FROM campaigns ORDER BY created_at DESC"
    );
    return NextResponse.json(res.rows || []);
  } catch (err: any) {
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body || !body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    // Validate fields: goal/raised must be non-negative numbers if provided
    if (body.goal !== undefined) {
      const g = Number(body.goal);
      if (!Number.isFinite(g) || g < 0) return NextResponse.json({ error: "goal must be a non-negative number" }, { status: 400 });
      body.goal = Math.floor(g);
    }
    if (body.raised !== undefined) {
      const r = Number(body.raised);
      if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: "raised must be a non-negative number" }, { status: 400 });
      body.raised = Math.floor(r);
    }

    const allowed = ["name", "tag", "raised", "goal", "image", "category"];
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const k of allowed) {
      if (body[k] !== undefined) {
        updates.push(`${k} = $${idx}`);
        params.push(body[k]);
        idx++;
      }
    }
    if (updates.length === 0) return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    params.push(body.id);
    const q = `UPDATE campaigns SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const res = await queryDb(q, params);
    return NextResponse.json({ ok: true, campaign: res.rows[0] });
  } catch (err: any) {
    console.error("PUT /api/campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body || !body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    // Validate goal/raised
    if (body.goal !== undefined) {
      const g = Number(body.goal);
      if (!Number.isFinite(g) || g < 0) return NextResponse.json({ error: "goal must be a non-negative number" }, { status: 400 });
      body.goal = Math.floor(g);
    }
    if (body.raised !== undefined) {
      const r = Number(body.raised);
      if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: "raised must be a non-negative number" }, { status: 400 });
      body.raised = Math.floor(r);
    }

    // Insert if not exists
    await queryDb(
      `INSERT INTO campaigns (id, name, tag, raised, goal, image, category) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [body.id, body.name || body.id, body.tag || 'General', Number(body.raised || 0), Number(body.goal || 0), body.image || '', body.category || '']
    );
    const res = await queryDb("SELECT * FROM campaigns WHERE id = $1", [body.id]);
    return NextResponse.json({ ok: true, campaign: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body || !body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    await queryDb("DELETE FROM campaigns WHERE id = $1", [body.id]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/campaigns error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
