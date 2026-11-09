import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "trash", "view");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const res = await queryDb(
      "SELECT id, item_type, item_id, title, subtitle, data, deleted_by, deleted_at FROM recycle_bin ORDER BY deleted_at DESC"
    );

    const items = res.rows.map((row: any) => {
      let parsedData: any = {};
      try {
        parsedData = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      } catch {
        parsedData = {};
      }

      return {
        id: String(row.item_id || row.id),
        dbId: row.id,
        type: row.item_type,
        title: row.title || "Deleted Item",
        subtitle: row.subtitle || "",
        data: parsedData,
        deletedAt: row.deleted_at || new Date().toISOString(),
        deletedBy: row.deleted_by || "",
      };
    });

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/recycle-bin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "trash", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const b = await req.json();
    const itemId = String(b.id || b.original_id || b.itemId || "").trim();
    const itemType = String(b.type || "event").trim();
    const title = String(b.title || "Deleted item").trim();
    const subtitle = b.subtitle ? String(b.subtitle).trim() : null;
    const dataStr = typeof b.data === "string" ? b.data : JSON.stringify(b.data || {});
    const deletedBy = auth.admin?.email || b.deletedBy || "admin";

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const res = await queryDb(
      `INSERT INTO recycle_bin (item_type, item_id, title, subtitle, data, deleted_by, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (item_type, item_id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         data = EXCLUDED.data,
         deleted_by = EXCLUDED.deleted_by,
         deleted_at = NOW()
       RETURNING id`,
      [itemType, itemId, title, subtitle, dataStr, deletedBy]
    );

    return NextResponse.json({ ok: true, id: res.rows[0]?.id });
  } catch (err: any) {
    console.error("POST /api/admin/recycle-bin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "trash", "delete");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get("all") === "true";
    const itemId = searchParams.get("id");
    const itemType = searchParams.get("type");

    if (clearAll) {
      await queryDb("DELETE FROM recycle_bin");
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (!itemId) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    if (itemType) {
      await queryDb("DELETE FROM recycle_bin WHERE item_id = $1 AND item_type = $2", [itemId, itemType]);
    } else {
      await queryDb("DELETE FROM recycle_bin WHERE item_id = $1 OR id::text = $1", [itemId]);
    }

    return NextResponse.json({ ok: true, id: itemId });
  } catch (err: any) {
    console.error("DELETE /api/admin/recycle-bin error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

