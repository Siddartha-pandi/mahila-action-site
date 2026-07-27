import nodemailer from "nodemailer";

let transporter = null;
let warnedNoSmtp = false;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// Sends a password reset email if SMTP_* is configured in .env. If it isn't
// (e.g. local dev, or you haven't set up a mail provider yet), this just logs
// the reset link to the server console instead of failing — that's how you
// retrieve a reset link for testing without a real mailbox wired up.
export async function sendPasswordResetEmail(to, resetLink) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured in server/.env, so password reset emails are not actually sent.\n" +
        "    Reset links will be printed here instead — copy/paste them into your browser to test.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧  Password reset requested for ${to}\n    Reset link (valid 30 min): ${resetLink}\n`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Mahila Action volunteer password",
    text:
      `We received a request to reset your volunteer account password.\n\n` +
      `Open this link within 30 minutes to choose a new one:\n${resetLink}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>We received a request to reset your volunteer account password.</p>` +
      `<p><a href="${resetLink}">Click here to choose a new password</a> (link expires in 30 minutes).</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

// Sends a confirmation email listing the events a volunteer just signed up for.
// Same no-SMTP fallback as above — logs to the console instead of failing when
// SMTP_* isn't configured, so local dev/testing doesn't require a real mailbox.
export async function sendVolunteerConfirmationEmail(to, name, eventTitles) {
  const list = eventTitles.length ? eventTitles : ["(no events selected)"];
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured in server/.env, so volunteer confirmation emails are not actually sent.\n" +
        "    Details will be printed here instead.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧  Volunteer confirmation for ${name} <${to}>\n    Events: ${list.join(", ")}\n`);
    return;
  }

  const itemsText = list.map((t) => `  • ${t}`).join("\n");
  const itemsHtml = list.map((t) => `<li>${t}</li>`).join("");

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "You're registered! — Mahila Action volunteer events",
    text:
      `Hi ${name},\n\n` +
      `Thank you for registering to volunteer with us. You've signed up for:\n\n${itemsText}\n\n` +
      `We'll be in touch with more details closer to each event.\n\n— Mahila Action`,
    html:
      `<p>Hi ${name},</p>` +
      `<p>Thank you for registering to volunteer with us. You've signed up for:</p>` +
      `<ul>${itemsHtml}</ul>` +
      `<p>We'll be in touch with more details closer to each event.</p>` +
      `<p>— Mahila Action</p>`,
  });
}

// Sends a confirmation email for a single-event reservation made through the
// Reserve Seat modal — used by both the Volunteer tab and the Attendee tab,
// since they both save into the same "reservations" table. `isVolunteer`
// picks which wording to use.
export async function sendReservationConfirmationEmail(to, name, eventTitle, isVolunteer) {
  const t = getTransporter();
  const roleLine = isVolunteer
    ? `you've been confirmed as a volunteer for`
    : `your spot has been confirmed for`;
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured in server/.env, so reservation confirmation emails are not actually sent.\n" +
        "    Details will be printed here instead.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧  Reservation confirmation for ${name} <${to}>\n    Event: ${eventTitle}\n`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `You're confirmed! — ${eventTitle}`,
    text:
      `Hi ${name},\n\n` +
      `Thank you — ${roleLine} "${eventTitle}".\n\n` +
      `We'll be in touch with more details closer to the event.\n\n— Mahila Action`,
    html:
      `<p>Hi ${name},</p>` +
      `<p>Thank you — ${roleLine} <strong>${eventTitle}</strong>.</p>` +
      `<p>We'll be in touch with more details closer to the event.</p>` +
      `<p>— Mahila Action</p>`,
  });
}

// Sends a confirmation email to a vendor after they apply to take part in an
// event through the Reserve Seat modal's Vendor tab.
export async function sendVendorConfirmationEmail(to, contactName, businessName, eventTitle) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured in server/.env, so vendor confirmation emails are not actually sent.\n" +
        "    Details will be printed here instead.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧  Vendor confirmation for ${contactName} <${to}>\n    Business: ${businessName}\n    Event: ${eventTitle}\n`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Vendor application received — ${eventTitle}`,
    text:
      `Hi ${contactName},\n\n` +
      `Thank you — we've received ${businessName}'s application to take part in "${eventTitle}".\n\n` +
      `Our team will review it and reach out with next steps.\n\n— Mahila Action`,
    html:
      `<p>Hi ${contactName},</p>` +
      `<p>Thank you — we've received <strong>${businessName}</strong>'s application to take part in <strong>${eventTitle}</strong>.</p>` +
      `<p>Our team will review it and reach out with next steps.</p>` +
      `<p>— Mahila Action</p>`,
  });
}