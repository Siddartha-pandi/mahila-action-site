import { Router } from "express";
import { nanoid } from "nanoid";
import pool from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { sendVolunteerConfirmationEmail, sendReservationConfirmationEmail, sendVendorConfirmationEmail } from "../email.js";
import { isValidPhoneNumber } from "../utils/validation.js";

export const submissionsRouter = Router();

function makeResource(router, { path, table, requiredFields, mapIn, afterCreate }) {
  // Public: create
  router.post(`/${path}`, async (req, res) => {
    const body = req.body || {};
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return res.status(400).json({ error: `${field} is required.` });
      }
    }
    if (body.phone && !isValidPhoneNumber(String(body.phone))) {
      return res.status(400).json({ error: "Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)." });
    }
    try {
      const row = mapIn(body);
      const id = nanoid();
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(", ");

      await pool.query(
        `INSERT INTO ${table} (id, ${columns.join(", ")}) VALUES ($1, ${placeholders})`,
        [id, ...values]
      );
      res.status(201).json({ ok: true, id });

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
  router.get(`/${path}`, requireAdmin, async (_req, res, next) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  });

  // Admin: delete
  router.delete(`/${path}/:id`, requireAdmin, async (req, res, next) => {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
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