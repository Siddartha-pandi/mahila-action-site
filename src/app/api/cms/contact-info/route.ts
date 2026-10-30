import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

const CONTACT_JSON_PATH = path.join(process.cwd(), "src", "data", "contact.json");

const DEFAULT_CONTACT_DATA = {
  email: "contact@mahilaction.org",
  emailNote: "We reply within 24 hours",
  phone: "+91 123454321",
  phoneNote: "Mon – Sat, 9 AM – 6 PM IST",
  address: "Visakapatnam, Andhra Pradesh",
  addressNote: "India – 500 001",
  hours: "Mon – Fri",
  hoursNote: "9:00 AM – 5:30 PM IST",
};

async function readContactJson() {
  try {
    const raw = await fs.readFile(CONTACT_JSON_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONTACT_DATA, ...parsed };
  } catch {
    try {
      await fs.mkdir(path.dirname(CONTACT_JSON_PATH), { recursive: true });
      await fs.writeFile(
        CONTACT_JSON_PATH,
        JSON.stringify(DEFAULT_CONTACT_DATA, null, 2),
        "utf-8"
      );
    } catch {
      // ignore
    }
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
    });
  } catch (err: any) {
    console.error("GET /api/cms/contact-info error:", err);
    return NextResponse.json(DEFAULT_CONTACT_DATA);
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const updated = {
      email: b.email ?? "",
      emailNote: b.emailNote || b.email_note || "",
      phone: b.phone ?? "",
      phoneNote: b.phoneNote || b.phone_note || "",
      address: b.address ?? "",
      addressNote: b.addressNote || b.address_note || "",
      hours: b.hours ?? "",
      hoursNote: b.hoursNote || b.hours_note || "",
    };

    await fs.mkdir(path.dirname(CONTACT_JSON_PATH), { recursive: true });
    await fs.writeFile(
      CONTACT_JSON_PATH,
      JSON.stringify(updated, null, 2),
      "utf-8"
    );

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
