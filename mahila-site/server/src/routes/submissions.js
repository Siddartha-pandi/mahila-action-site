import { Router } from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { sendVolunteerConfirmationEmail, sendReservationConfirmationEmail, sendVendorConfirmationEmail } from "../email.js";

export const submissionsRouter = Router();

function makeResource(router, { path, table, requiredFields, mapIn, afterCreate }) {
  // Public: create
  router.post(`/${path}`, (req, res) => {
    const body = req.body || {};
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return res.status(400).json({ error: `${field} is required.` });
      }
    }
    try {
      const row = mapIn(body);
      const id = nanoid();
      const columns = Object.keys(row);
      const placeholders = columns.map(() => "?").join(", ");
      db.prepare(
        `INSERT INTO ${table} (id, ${columns.join(", ")}) VALUES (?, ${placeholders})`
      ).run(id, ...Object.values(row));
      res.status(201).json({ ok: true, id });
      // Fire-and-forget: respond to the client immediately, don't make them
      // wait on an email round-trip. Errors here are logged, not surfaced —
      // the submission itself already succeeded.
      if (afterCreate) {
        Promise.resolve(afterCreate(body)).catch((err) =>
          console.error(`POST /${path}: afterCreate hook failed:`, err)
        );
      }
    } catch (err) {
      console.error(`POST /${path} failed:`, err);
      res.status(500).json({ error: "Could not save submission." });
    }
  });

  // Admin: list
  router.get(`/${path}`, requireAdmin, (_req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
    res.json(rows);
  });

  // Admin: delete
  router.delete(`/${path}/:id`, requireAdmin, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });
}

makeResource(submissionsRouter, {
  path: "donations",
  table: "donations",
  requiredFields: ["amount", "phone", "donation_type"],
  mapIn: (b) => ({
    amount: Number(b.amount),
    name: b.name || null,
    email: b.email || null,
    phone: b.phone,
    donation_type: b.donation_type === "monthly" ? "monthly" : "one-time",
    anonymous: b.anonymous ? 1 : 0,
    event_name: b.event_name || null,
    campaign_name: b.campaign_name || null,
  }),
});

makeResource(submissionsRouter, {
  path: "reservations",
  table: "event_reservations",
  requiredFields: ["name", "email", "phone", "event_name"],
  mapIn: (b) => ({
    event_name: b.event_name,
    name: b.name,
    email: b.email,
    phone: b.phone,
    seats: Number(b.seats) || 1,
    volunteer_commitment: b.volunteer_commitment || null,
    companions: JSON.stringify(b.companions || []),
  }),
  afterCreate: (b) => sendReservationConfirmationEmail(b.email, b.name, b.event_name, !!b.volunteer_commitment),
});

makeResource(submissionsRouter, {
  path: "vendors",
  table: "vendor_registrations",
  requiredFields: ["business_name", "contact_name", "email", "phone", "offering", "event_name"],
  mapIn: (b) => ({
    event_name: b.event_name,
    business_name: b.business_name,
    contact_name: b.contact_name,
    email: b.email,
    phone: b.phone,
    offering: b.offering,
    needs_space: b.needs_space ? 1 : 0,
  }),
  afterCreate: (b) => sendVendorConfirmationEmail(b.email, b.contact_name, b.business_name, b.event_name),
});

makeResource(submissionsRouter, {
  path: "volunteers",
  table: "volunteer_registrations",
  requiredFields: ["name", "email", "phone"],
  mapIn: (b) => ({
    name: b.name,
    email: b.email,
    phone: b.phone,
    skills: b.skills || null,
    selected_events: JSON.stringify(b.selected_events || []),
  }),
  afterCreate: (b) => sendVolunteerConfirmationEmail(b.email, b.name, b.selected_events || []),
});

makeResource(submissionsRouter, {
  path: "contact",
  table: "contact_submissions",
  requiredFields: ["name", "email", "message"],
  mapIn: (b) => ({
    name: b.name,
    email: b.email,
    phone: b.phone || null,
    subject: b.subject || null,
    message: b.message,
  }),
});