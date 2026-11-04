import { NextRequest, NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { verifyAdminPermission } from "@/lib/auth";
import { CAMPAIGNS, Campaign } from "@/app/constants/campaigns";
import fs from "fs/promises";
import path from "path";

const CAMPAIGNS_FILE = path.join(process.cwd(), "src", "data", "campaigns.json");

async function readCampaignsFile(): Promise<Campaign[]> {
  try {
    const raw = await fs.readFile(CAMPAIGNS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {}
  return CAMPAIGNS;
}

async function writeCampaignsFile(data: Campaign[]): Promise<void> {
  await fs.mkdir(path.dirname(CAMPAIGNS_FILE), { recursive: true });
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isRaw = req.nextUrl.searchParams.get("raw") === "true";
    const baseCampaigns = await readCampaignsFile();

    if (isRaw) {
      return NextResponse.json(baseCampaigns, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const res = await queryDb(
      `SELECT COALESCE(campaign_name, '') as campaign_name, SUM(amount) as total_raised
       FROM donations
       WHERE status != 'Rejected'
       GROUP BY campaign_name`
    );

    const donationTotals: Record<string, number> = {};
    let unassignedRaised = 0;
    if (res && Array.isArray(res.rows)) {
      for (const row of res.rows) {
        const rawName = String(row.campaign_name || "").trim().toLowerCase();
        const amt = Number(row.total_raised) || 0;
        if (rawName) {
          donationTotals[rawName] = (donationTotals[rawName] || 0) + amt;
        } else {
          unassignedRaised += amt;
        }
      }
    }

    const updatedCampaigns: Campaign[] = baseCampaigns.map((c, index) => {
      const cNameKey = c.name.trim().toLowerCase();
      const cIdKey = c.id.trim().toLowerCase();

      let extraRaised = index === 0 ? unassignedRaised : 0;
      for (const [key, total] of Object.entries(donationTotals)) {
        if (key.includes(cNameKey) || cNameKey.includes(key) || key === cIdKey) {
          extraRaised += total;
        }
      }

      return {
        ...c,
        raised: (Number(c.raised) || 0) + extraRaised,
        goal: Number(c.goal) || 100000,
      };
    });

    return NextResponse.json(updatedCampaigns, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: any) {
    console.error("GET /api/campaigns error:", err?.message || err);
    return NextResponse.json(CAMPAIGNS, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "donations", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload: expected an array of campaigns." }, { status: 400 });
    }

    const cleaned: Campaign[] = body.map((c: any, index: number) => {
      const id = String(c.id || `campaign-${index + 1}`).trim().toLowerCase().replace(/\s+/g, "-");
      const name = String(c.name || `Campaign ${index + 1}`).trim();
      const tag = String(c.tag || "General").trim();
      const goal = Math.max(1000, Number(c.goal) || 100000);
      const raised = Math.max(0, Number(c.raised) || 0);

      return {
        id,
        name,
        tag,
        goal,
        raised,
      };
    });

    await writeCampaignsFile(cleaned);

    return NextResponse.json({ ok: true, campaigns: cleaned });
  } catch (err: any) {
    console.error("POST /api/campaigns error:", err?.message || err);
    return NextResponse.json({ error: "Failed to update campaigns." }, { status: 500 });
  }
}
