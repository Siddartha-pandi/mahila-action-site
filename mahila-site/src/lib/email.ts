import nodemailer from "nodemailer";

let transporter: any = null;
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

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured in environment variables, so password reset emails are not sent.\n" +
        "    Reset links will be printed here instead.\n"
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

export async function sendVolunteerConfirmationEmail(to: string, name: string, eventTitles: string[]) {
  const list = eventTitles.length ? eventTitles : ["(no events selected)"];
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured, so volunteer confirmation emails are printed to console.\n"
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

export async function sendReservationConfirmationEmail(to: string, name: string, eventTitle: string, isVolunteer: boolean) {
  const t = getTransporter();
  const roleLine = isVolunteer
    ? `you've been confirmed as a volunteer for`
    : `your spot has been confirmed for`;
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured, so reservation confirmation emails are printed to console.\n"
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

export async function sendVendorConfirmationEmail(to: string, contactName: string, businessName: string, eventTitle: string) {
  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured, so vendor confirmation emails are printed to console.\n"
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
