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

/** Names, subjects and campaign titles come from user input — never drop them into HTML raw. */
function esc(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SIGN_OFF_TEXT = "\n\n— Mahila Action";
const SIGN_OFF_HTML = "<p>— Mahila Action</p>";

/**
 * Single delivery path for every transactional email. When SMTP is not
 * configured the message is summarised to the console instead, so local
 * development still shows what would have been sent.
 */
async function deliver(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  consoleSummary: string;
}) {
  if (!opts.to) return;

  const t = getTransporter();
  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* is not configured, so transactional emails are printed here instead of being sent.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧  ${opts.consoleSummary}\n`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text + SIGN_OFF_TEXT,
    html: opts.html + SIGN_OFF_HTML,
  });
}

// ── Account lifecycle ───────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  await deliver({
    to,
    subject: "Welcome to Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `Your volunteer account has been created — welcome aboard.\n\n` +
      `You can now sign in to reserve seats at community events, register as a volunteer, ` +
      `and keep track of everything you've taken part in from your account page.\n\n` +
      `If you didn't create this account, please reply to this email and let us know.`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>Your volunteer account has been created — welcome aboard.</p>` +
      `<p>You can now sign in to reserve seats at community events, register as a volunteer, ` +
      `and keep track of everything you've taken part in from your account page.</p>` +
      `<p>If you didn't create this account, please reply to this email and let us know.</p>`,
    consoleSummary: `Welcome email for ${name} <${to}>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await deliver({
    to,
    subject: "Reset your Mahila Action volunteer password",
    text:
      `We received a request to reset your volunteer account password.\n\n` +
      `Open this link within 30 minutes to choose a new one:\n${resetLink}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>We received a request to reset your volunteer account password.</p>` +
      `<p><a href="${esc(resetLink)}">Click here to choose a new password</a> (link expires in 30 minutes).</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
    consoleSummary: `Password reset requested for ${to}\n    Reset link (valid 30 min): ${resetLink}`,
  });
}

export async function sendPasswordChangedEmail(to: string) {
  await deliver({
    to,
    subject: "Your Mahila Action password was changed",
    text:
      `Your volunteer account password was just changed.\n\n` +
      `If this was you, there's nothing more to do.\n\n` +
      `If it wasn't, please reply to this email immediately so we can secure your account.`,
    html:
      `<p>Your volunteer account password was just changed.</p>` +
      `<p>If this was you, there's nothing more to do.</p>` +
      `<p>If it wasn't, please reply to this email immediately so we can secure your account.</p>`,
    consoleSummary: `Password changed notice for ${to}`,
  });
}

// ── Participation ───────────────────────────────────────────────────────────

export async function sendVolunteerConfirmationEmail(to: string, name: string, eventTitles: string[]) {
  const list = eventTitles.length ? eventTitles : ["(no events selected)"];
  await deliver({
    to,
    subject: "You're registered! — Mahila Action volunteer events",
    text:
      `Hi ${name},\n\n` +
      `Thank you for registering to volunteer with us. You've signed up for:\n\n` +
      list.map((t) => `  • ${t}`).join("\n") +
      `\n\nWe'll be in touch with more details closer to each event.`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>Thank you for registering to volunteer with us. You've signed up for:</p>` +
      `<ul>${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` +
      `<p>We'll be in touch with more details closer to each event.</p>`,
    consoleSummary: `Volunteer confirmation for ${name} <${to}>\n    Events: ${list.join(", ")}`,
  });
}

export async function sendReservationConfirmationEmail(to: string, name: string, eventTitle: string, isVolunteer: boolean) {
  const roleLine = isVolunteer
    ? `you've been confirmed as a volunteer for`
    : `your spot has been confirmed for`;
  await deliver({
    to,
    subject: `You're confirmed! — ${eventTitle}`,
    text:
      `Hi ${name},\n\n` +
      `Thank you — ${roleLine} "${eventTitle}".\n\n` +
      `We'll be in touch with more details closer to the event.`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>Thank you — ${roleLine} <strong>${esc(eventTitle)}</strong>.</p>` +
      `<p>We'll be in touch with more details closer to the event.</p>`,
    consoleSummary: `Reservation confirmation for ${name} <${to}>\n    Event: ${eventTitle}`,
  });
}

export async function sendVendorConfirmationEmail(to: string, contactName: string, businessName: string, eventTitle: string) {
  await deliver({
    to,
    subject: `Vendor application received — ${eventTitle}`,
    text:
      `Hi ${contactName},\n\n` +
      `Thank you — we've received ${businessName}'s application to take part in "${eventTitle}".\n\n` +
      `Our team will review it and reach out with next steps.`,
    html:
      `<p>Hi ${esc(contactName)},</p>` +
      `<p>Thank you — we've received <strong>${esc(businessName)}</strong>'s application to take part in <strong>${esc(eventTitle)}</strong>.</p>` +
      `<p>Our team will review it and reach out with next steps.</p>`,
    consoleSummary: `Vendor confirmation for ${contactName} <${to}>\n    Business: ${businessName}\n    Event: ${eventTitle}`,
  });
}

// ── Giving & enquiries ──────────────────────────────────────────────────────

export async function sendDonationReceiptEmail(
  to: string,
  name: string,
  amount: number,
  campaignName?: string,
  isMonthly = false
) {
  const greeting = name ? `Hi ${name},` : "Hello,";
  const formatted = `₹${Number(amount).toLocaleString("en-IN")}`;
  const towards = campaignName ? ` towards ${campaignName}` : "";
  const cadence = isMonthly ? " each month" : "";

  await deliver({
    to,
    subject: "Thank you for your donation — Mahila Action",
    text:
      `${greeting}\n\n` +
      `Thank you for your gift of ${formatted}${cadence}${towards}.\n\n` +
      `Contributions like yours directly fund women's leadership training, education access, ` +
      `and livelihood programmes across Telangana.\n\n` +
      `Please keep this email for your records.`,
    html:
      `<p>${esc(greeting)}</p>` +
      `<p>Thank you for your gift of <strong>${formatted}</strong>${esc(cadence)}${esc(towards)}.</p>` +
      `<p>Contributions like yours directly fund women's leadership training, education access, ` +
      `and livelihood programmes across Telangana.</p>` +
      `<p>Please keep this email for your records.</p>`,
    consoleSummary: `Donation receipt for ${name || "(anonymous)"} <${to}>\n    Amount: ${formatted}${towards}`,
  });
}

export async function sendContactAcknowledgementEmail(to: string, name: string, subject?: string) {
  const re = subject ? ` about "${subject}"` : "";
  await deliver({
    to,
    subject: "We've received your message — Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `Thanks for getting in touch${re}. We've received your message and someone from our team ` +
      `will reply within 24 hours.`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>Thanks for getting in touch${esc(re)}. We've received your message and someone from our team ` +
      `will reply within 24 hours.</p>`,
    consoleSummary: `Contact acknowledgement for ${name} <${to}>${re}`,
  });
}
