import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPermission } from "@/lib/auth";
import { firstError, normalizePhone, validateEmail, validatePhone } from "@/lib/validation";
import { getDbSetting, setDbSetting } from "@/lib/siteSettings";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CONTACT_JSON_PATH = path.join(process.cwd(), "src", "data", "contact.json");

const DEFAULT_CONTACT_DATA = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@mahilaaction.org",
  emailNote: "We reply within 24 hours",
  phone: "+91 70955 48387",
  phoneNote: "Mon – Sat, 9 AM – 6 PM IST",
  address: "Visakhapatnam, Andhra Pradesh",
  addressNote: "India – 500 001",
  hours: "Mon – Fri",
  hoursNote: "9:00 AM – 5:30 PM IST",
};

async function readContactJson() {
  try {
    const dbData = await getDbSetting<any>("contact_info", null);
    if (dbData && typeof dbData === "object") {
      return { ...DEFAULT_CONTACT_DATA, ...dbData };
    }
  } catch {}

  try {
    const raw = await fs.readFile(CONTACT_JSON_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const data = { ...DEFAULT_CONTACT_DATA, ...parsed };
    setDbSetting("contact_info", data).catch(() => {});
    return data;
  } catch {
    return DEFAULT_CONTACT_DATA;
  }
}

export async function GET() {
  try {
    const data = await readContactJson();
    return NextResponse.json({
      ...data,
      emailNote: data.emailNote || data.email_note || "",
      email_note: data.emailNote || data.email_note || "",
      phoneNote: data.phoneNote || data.phone_note || "",
      phone_note: data.phoneNote || data.phone_note || "",
      addressNote: data.addressNote || data.address_note || "",
      address_note: data.addressNote || data.address_note || "",
      hoursNote: data.hoursNote || data.hours_note || "",
      hours_note: data.hoursNote || data.hours_note || "",
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("GET /api/cms/contact-info error:", err);
    return NextResponse.json(DEFAULT_CONTACT_DATA);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminPermission(req, "contact", "edit");
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const b = await req.json();
    const invalid = firstError(
      b.email ? validateEmail(b.email, "contact email", { required: false }) : null,
      b.phone ? validatePhone(b.phone, "contact phone number", { required: false }) : null
    );
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const updated = {
      email: b.email ?? "",
      emailNote: b.emailNote || b.email_note || "",
      phone: b.phone ? normalizePhone(b.phone) : "",
      phoneNote: b.phoneNote || b.phone_note || "",
      address: b.address ?? "",
      addressNote: b.addressNote || b.address_note || "",
      hours: b.hours ?? "",
      hoursNote: b.hoursNote || b.hours_note || "",
    };

    // 1. Save to PostgreSQL for serverless persistence
    await setDbSetting("contact_info", updated);

    // 2. Optional local file update
    try {
      await fs.mkdir(path.dirname(CONTACT_JSON_PATH), { recursive: true });
      await fs.writeFile(
        CONTACT_JSON_PATH,
        JSON.stringify(updated, null, 2),
        "utf-8"
      );
    } catch {}

    return NextResponse.json({
      ok: true,
      ...updated,
      email_note: updated.emailNote,
      phone_note: updated.phoneNote,
      address_note: updated.addressNote,
      hours_note: updated.hoursNote,
    });
  } catch (err: any) {
    console.error("PUT /api/cms/contact-info error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
