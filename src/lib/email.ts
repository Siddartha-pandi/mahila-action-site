import nodemailer from "nodemailer";

let warnedNoSmtp = false;

function getSiteUrl(): string {
  const url =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function getAdminNotificationEmail(): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SUPERADMIN_EMAIL ||
    process.env.SMTP_USER ||
    "mahilaaction.vsk@gmail.com"
  );
}

export function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.SMTP_USER ||
    "mahilaaction.vsk@gmail.com"
  );
}

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let cachedTransporter: MailTransporter | null = null;
let lastTransporterKey = "";

export function getTransporter(): MailTransporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  // Google App passwords typically contain spaces (e.g. "rzpc gqmj shar ktck").
  // Removing whitespace ensures compatibility across SMTP servers.
  const cleanPass = SMTP_PASS.replace(/\s+/g, "");
  const currentKey = `${SMTP_HOST}:${SMTP_PORT}:${SMTP_USER}:${cleanPass}:${process.env.NODE_ENV}`;

  if (cachedTransporter && lastTransporterKey === currentKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER.trim(),
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  lastTransporterKey = currentKey;
  return cachedTransporter;
}

/** Names, subjects and campaign titles come from user input — never drop them into HTML raw. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Professional branded HTML email wrapper */
function renderEmailHtml(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  cta?: { text: string; url: string };
  footerNote?: string;
}): string {
  const siteUrl = getSiteUrl();
  const ctaBlock = opts.cta
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${esc(opts.cta.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #993925; color: #f4efe7; font-weight: 600; font-size: 15px; padding: 13px 28px; border-radius: 9999px; text-decoration: none; box-shadow: 0 2px 8px rgba(153, 57, 37, 0.25);">
          ${esc(opts.cta.text)}
        </a>
      </div>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(opts.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d2522; line-height: 1.6;">
  ${opts.preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">${esc(opts.preheader)}</div>` : ""}
  <div style="background-color: #f7f3ee; padding: 36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #eaded6; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
      <!-- Header -->
      <tr>
        <td style="background-color: #993925; padding: 28px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; color: #f4efe7; font-weight: 700; letter-spacing: 0.5px;">Mahila Action</h1>
          <p style="margin: 4px 0 0; font-size: 13px; color: #f4efe7; opacity: 0.88; font-weight: 400;">When Women Rise, Communities Thrive</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding: 32px 32px 24px; font-size: 15px; color: #2d2522;">
          ${opts.bodyHtml}
          ${ctaBlock}
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #f0e6de; font-size: 14px; color: #6e625d;">
            Warm regards,<br>
            <strong style="color: #993925;">The Mahila Action Team</strong>
          </div>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background-color: #faf6f2; border-top: 1px solid #f0e6de; padding: 24px 32px; text-align: center; font-size: 12px; color: #786c66; line-height: 1.6;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #2d2522;">Mahila Action</p>
          <p style="margin: 0 0 6px;">Visakhapatnam, Andhra Pradesh, India</p>
          <p style="margin: 0 0 8px;">
            <a href="${siteUrl}" style="color: #993925; text-decoration: none; font-weight: 500;">Visit Website</a> &bull;
            <a href="mailto:${esc(getSupportEmail())}" style="color: #993925; text-decoration: none; font-weight: 500;">${esc(getSupportEmail())}</a>
          </p>
          <p style="margin: 0; font-size: 11px; color: #a49690;">
            ${esc(opts.footerNote || "You received this email regarding your activity or account with Mahila Action.")}
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Single delivery path for every transactional email.
 * - Attempts to deliver via SMTP if credentials are configured.
 * - Falls back to a clear console printout if SMTP is unconfigured or encounters an error,
 *   so verification and password reset links are NEVER lost.
 */
async function deliver(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  consoleSummary: string;
}): Promise<{ ok: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const cleanTo = String(opts.to || "").trim();
  if (!cleanTo || !cleanTo.includes("@")) {
    return { ok: false, error: "Recipient address is missing or invalid" };
  }

  const t = getTransporter();

  if (!t) {
    if (!warnedNoSmtp) {
      console.warn(
        "\n⚠️  SMTP_* environment variables not set. Emails are being simulated in console output.\n"
      );
      warnedNoSmtp = true;
    }
    console.log(`\n📧 [SIMULATED EMAIL]\nTo: ${cleanTo}\nSubject: ${opts.subject}\n${opts.consoleSummary}\n`);
    return { ok: true, simulated: true };
  }

  try {
    const rawFrom = process.env.EMAIL_FROM?.trim();
    const fallbackUser = (process.env.SMTP_USER || "mahilaaction.vsk@gmail.com").trim();
    const fromAddress = rawFrom || `Mahila Action <${fallbackUser}>`;

    const info = await t.sendMail({
      from: fromAddress,
      to: cleanTo,
      subject: opts.subject,
      text: opts.text + "\n\n— Mahila Action\nVisakhapatnam, Andhra Pradesh, India",
      html: opts.html,
    });

    console.log(`\n✅ [EMAIL SENT] Message ID: ${info.messageId} | To: ${cleanTo} | Subject: "${opts.subject}"\n`);
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`\n❌ [EMAIL SEND ERROR] Failed to deliver to ${cleanTo}: ${err.message}`);
    // Print fallback summary so critical links (e.g. password reset) are accessible during debugging
    console.log(`\n📧 [FALLBACK CONSOLE SUMMARY FOR: ${cleanTo}]\nSubject: ${opts.subject}\n${opts.consoleSummary}\n`);
    return { ok: false, error: err.message };
  }
}

// ── Account Lifecycle Emails ────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const siteUrl = getSiteUrl();
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Welcome to the Mahila Action Community!</h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>Your volunteer account has been created successfully — welcome aboard.</p>
    <p>You can now sign in to reserve seats at upcoming community events, register as an event volunteer, and keep track of everything you've taken part in from your account page.</p>
    <p style="font-size: 13px; color: #706460; margin-top: 20px;">If you didn't create this account, please reply to this email to let us know.</p>
  `;

  return await deliver({
    to,
    subject: "Welcome to Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `Your volunteer account has been created — welcome aboard.\n\n` +
      `You can now sign in to reserve seats at community events, register as a volunteer, ` +
      `and keep track of everything you've taken part in from your account page.\n\n` +
      `If you didn't create this account, please reply to this email and let us know.`,
    html: renderEmailHtml({
      title: "Welcome to Mahila Action",
      bodyHtml,
      cta: { text: "Sign In to Your Account", url: `${siteUrl}/?modal=login` },
    }),
    consoleSummary: `Welcome email for ${name} <${to}>`,
  });
}

export async function sendMemberWelcomeEmail(to: string, name: string, role: string, tempPassword?: string) {
  const siteUrl = getSiteUrl();
  const credsBlock = tempPassword
    ? `
      <div style="background-color: #faf4f0; border: 1px solid #e8d7ce; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #993925;">Your Temporary Login Credentials:</p>
        <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> ${esc(to)}</p>
        <p style="margin: 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #ddd;">${esc(tempPassword)}</code></p>
      </div>
      <p style="font-size: 13px; color: #706460;">For security, please sign in and update your password immediately from your account settings.</p>
    `
    : `<p>You can sign in using your existing account credentials.</p>`;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">You've been added to the Mahila Action Team</h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>An administrator has invited you to join Mahila Action as <strong>${esc(role)}</strong>.</p>
    ${credsBlock}
  `;

  return await deliver({
    to,
    subject: "You've been added to Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `You've been added to Mahila Action as: ${role}.\n\n` +
      (tempPassword ? `Your temporary password is: ${tempPassword}\n\n` : "") +
      `Sign in at: ${siteUrl}/admin`,
    html: renderEmailHtml({
      title: "Team Invitation",
      bodyHtml,
      cta: { text: "Go to Portal", url: `${siteUrl}/admin` },
    }),
    consoleSummary: `Team member invite for ${name} <${to}> (Role: ${role})`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Reset Your Password</h2>
    <p>We received a request to reset your password for Mahila Action.</p>
    <p>Click the button below to choose a new password. This link is secure and will expire in <strong>30 minutes</strong>:</p>
  `;

  return await deliver({
    to,
    subject: "Reset your Mahila Action password",
    text:
      `We received a request to reset your volunteer account password.\n\n` +
      `Open this link within 30 minutes to choose a new one:\n${resetLink}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html: renderEmailHtml({
      title: "Password Reset Request",
      bodyHtml,
      cta: { text: "Reset Password", url: resetLink },
      footerNote: "If you did not request this password reset, please ignore this email.",
    }),
    consoleSummary: `Password reset requested for ${to}\n    Reset link (valid 30 min): ${resetLink}`,
  });
}

export async function sendPasswordChangedEmail(to: string) {
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Password Changed</h2>
    <p>Your Mahila Action account password has been changed successfully.</p>
    <p>If you made this change, no further action is required.</p>
    <p style="color: #c53030; font-weight: 500; margin-top: 20px;">
      If you did NOT make this change, please contact us immediately at <a href="mailto:${esc(getSupportEmail())}" style="color: #993925;">${esc(getSupportEmail())}</a> so we can secure your account.
    </p>
  `;

  return await deliver({
    to,
    subject: "Your Mahila Action password was changed",
    text:
      `Your volunteer account password was just changed.\n\n` +
      `If this was you, there's nothing more to do.\n\n` +
      `If it wasn't, please reply to this email immediately so we can secure your account.`,
    html: renderEmailHtml({
      title: "Password Changed",
      bodyHtml,
    }),
    consoleSummary: `Password changed notice for ${to}`,
  });
}

// ── Contact Submissions ─────────────────────────────────────────────────────

export async function sendContactAcknowledgementEmail(to: string, name: string, subject?: string) {
  const re = subject ? ` regarding "<strong>${esc(subject)}</strong>"` : "";
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Thank you for contacting us</h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>Thanks for getting in touch${re}. We've received your message and a member of our team will review it and reply within 24 hours.</p>
    <p>In the meantime, feel free to explore our ongoing community initiatives and stories on our website.</p>
  `;

  return await deliver({
    to,
    subject: "We've received your message — Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `Thanks for getting in touch${subject ? ` about "${subject}"` : ""}. We've received your message and someone from our team ` +
      `will reply within 24 hours.`,
    html: renderEmailHtml({
      title: "Message Received",
      bodyHtml,
    }),
    consoleSummary: `Contact acknowledgement for ${name} <${to}>${subject ? ` (${subject})` : ""}`,
  });
}

export async function sendContactAlertToAdmin(details: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}) {
  const adminEmail = getAdminNotificationEmail();
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">New Contact Message Received</h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 100px;">Name:</td><td>${esc(details.name)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${esc(details.phone || "Not provided")}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Subject:</td><td>${esc(details.subject || "General Enquiry")}</td></tr>
    </table>
    <div style="background-color: #faf5f1; border-left: 4px solid #993925; padding: 14px 18px; border-radius: 4px;">
      <p style="margin: 0 0 6px; font-weight: 600; font-size: 13px; color: #993925;">Message:</p>
      <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${esc(details.message)}</p>
    </div>
  `;

  return await deliver({
    to: adminEmail,
    subject: `New Contact Enquiry: ${details.name} — ${details.subject || "General"}`,
    text:
      `New contact form submission:\n\n` +
      `Name: ${details.name}\n` +
      `Email: ${details.email}\n` +
      `Phone: ${details.phone || "Not provided"}\n` +
      `Subject: ${details.subject || "General"}\n\n` +
      `Message:\n${details.message}`,
    html: renderEmailHtml({
      title: "New Contact Message",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Contact submission from ${details.name} <${details.email}>`,
  });
}

// ── Donations ───────────────────────────────────────────────────────────────

export async function sendDonationReceiptEmail(
  to: string,
  name: string,
  amount: number,
  campaignName?: string,
  isMonthly = false,
  receiptMeta?: {
    receiptNumber?: string;
    panNumber?: string;
    address?: string;
    paymentMethod?: string;
    transactionId?: string;
    donationId?: string | number;
  }
) {
  const greeting = name ? `Hi ${esc(name)},` : "Dear Supporter,";
  const formatted = `₹${Number(amount).toLocaleString("en-IN")}`;
  const towards = campaignName ? ` towards <strong>${esc(campaignName)}</strong>` : "";
  const cadence = isMonthly ? " monthly" : "";
  const siteUrl = getSiteUrl();

  const receiptNum = receiptMeta?.receiptNumber || `MA-REC-${new Date().getFullYear()}-0000`;
  const panDisplay = receiptMeta?.panNumber ? `<p style="margin: 0 0 4px;"><strong>Donor PAN:</strong> ${esc(receiptMeta.panNumber)}</p>` : "";
  const addressDisplay = receiptMeta?.address ? `<p style="margin: 0 0 4px;"><strong>Donor Address:</strong> ${esc(receiptMeta.address)}</p>` : "";
  const methodDisplay = receiptMeta?.paymentMethod ? `<p style="margin: 0 0 4px;"><strong>Payment Method:</strong> ${esc(receiptMeta.paymentMethod.toUpperCase())}</p>` : "";
  const txDisplay = receiptMeta?.transactionId ? `<p style="margin: 0 0 4px;"><strong>Transaction / UTR Ref:</strong> ${esc(receiptMeta.transactionId)}</p>` : "";

  const receiptUrl = receiptMeta?.donationId ? `${siteUrl}/api/donations/${receiptMeta.donationId}/receipt` : "";

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Thank you for your generous contribution!</h2>
    <p>${greeting}</p>
    <p>We gratefully acknowledge your contribution of <strong>${formatted}</strong>${cadence}${towards}.</p>
    
    <div style="background-color: #faf5f1; border: 1px solid #eaded6; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <div style="border-bottom: 1px dashed #d1c0b6; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between;">
        <span style="font-weight: 700; color: #993925; font-size: 15px;">Official Donation Receipt</span>
        <span style="font-size: 13px; color: #584a44; font-family: monospace;">#${esc(receiptNum)}</span>
      </div>
      
      <p style="margin: 0 0 4px;"><strong>Amount:</strong> <span style="font-size: 16px; color: #993925; font-weight: 700;">${formatted}</span></p>
      <p style="margin: 0 0 4px;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p style="margin: 0 0 4px;"><strong>Frequency:</strong> ${isMonthly ? "Monthly Recurring" : "One-Time"}</p>
      ${campaignName ? `<p style="margin: 0 0 4px;"><strong>Initiative:</strong> ${esc(campaignName)}</p>` : ""}
      ${methodDisplay}
      ${txDisplay}
      ${panDisplay}
      ${addressDisplay}
      
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e8ded7; font-size: 12px; color: #695d57; line-height: 1.5;">
        <p style="margin: 0;"><strong>Mahila Action Society</strong> &bull; Society Reg: 123/2000 &bull; Visakhapatnam, Andhra Pradesh</p>
      </div>
    </div>

    <p>Your contribution directly empowers grassroots women leaders, expands girl-child educational centers, and funds livelihood cooperatives across Andhra Pradesh and Telangana.</p>
  `;

  return await deliver({
    to,
    subject: `Donation Receipt (${receiptNum}) — Thank you for your support of ${formatted}`,
    text:
      `${name ? `Hi ${name},` : "Hello,"}\n\n` +
      `Thank you for your generous gift of ${formatted}${isMonthly ? " each month" : ""}${campaignName ? ` towards ${campaignName}` : ""}.\n\n` +
      `Receipt Number: ${receiptNum}\n` +
      (receiptMeta?.transactionId ? `Transaction / UTR: ${receiptMeta.transactionId}\n` : "") +
      `Date: ${new Date().toLocaleDateString("en-IN")}\n\n` +
      `Mahila Action Society (Reg: 123/2000)\n\n` +
      `Contributions like yours directly fund women's leadership training, education access, ` +
      `and livelihood programmes across Telangana and Andhra Pradesh.\n\n` +
      `Please keep this receipt for your records.`,
    html: renderEmailHtml({
      title: `Donation Receipt #${receiptNum}`,
      bodyHtml,
      cta: receiptUrl ? { text: "View / Print Official Donation Receipt", url: receiptUrl } : undefined,
    }),
    consoleSummary: `Donation receipt #${receiptNum} for ${name || "(anonymous)"} <${to}>\n    Amount: ${formatted}${campaignName ? ` (${campaignName})` : ""}`,
  });
}

export async function sendDonationAlertToAdmin(details: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  amount: number;
  donationType: string;
  campaign?: string | null;
  eventName?: string | null;
  anonymous: boolean;
  receiptNumber?: string;
  paymentMethod?: string;
  transactionId?: string;
  panNumber?: string;
  address?: string;
}) {
  const adminEmail = getAdminNotificationEmail();
  const formatted = `₹${Number(details.amount).toLocaleString("en-IN")}`;
  const phoneDisplay = details.phone ? esc(details.phone) : "Not provided";
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">New Donation Received: ${formatted}</h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 140px;">Receipt Number:</td><td><code style="background: #f0e6de; padding: 2px 6px; border-radius: 4px;">${esc(details.receiptNumber || "N/A")}</code></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Amount:</td><td><strong style="color: #993925; font-size: 16px;">${formatted}</strong></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Donor:</td><td>${details.anonymous ? "Anonymous" : esc(details.name || "Supporter")}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td>${details.email ? `<a href="mailto:${esc(details.email)}">${esc(details.email)}</a>` : "Not provided"}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${phoneDisplay}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Payment Mode:</td><td><span style="background: #eaf3e6; color: #2e6024; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 12px;">${esc((details.paymentMethod || "UPI").toUpperCase())}</span></td></tr>
      ${details.transactionId ? `<tr><td style="padding: 6px 0; font-weight: 600;">UTR / Ref ID:</td><td><strong>${esc(details.transactionId)}</strong></td></tr>` : ""}
      ${details.panNumber ? `<tr><td style="padding: 6px 0; font-weight: 600;">PAN:</td><td><strong>${esc(details.panNumber)}</strong></td></tr>` : ""}
      ${details.address ? `<tr><td style="padding: 6px 0; font-weight: 600;">Address:</td><td>${esc(details.address)}</td></tr>` : ""}
      <tr><td style="padding: 6px 0; font-weight: 600;">Type:</td><td>${details.donationType === "monthly" ? "Monthly" : "One-Time"}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Initiative:</td><td>${esc(details.campaign || details.eventName || "General Fund")}</td></tr>
    </table>
  `;

  return await deliver({
    to: adminEmail,
    subject: `New Donation Alert: ${formatted} from ${details.anonymous ? "Anonymous" : details.name || "Supporter"} (${details.paymentMethod?.toUpperCase() || "UPI"})`,
    text:
      `New donation received!\n\n` +
      `Receipt: ${details.receiptNumber || "N/A"}\n` +
      `Amount: ${formatted}\n` +
      `Donor: ${details.anonymous ? "Anonymous" : details.name || "Supporter"}\n` +
      `Email: ${details.email || "Not provided"}\n` +
      `Phone: ${details.phone || "Not provided"}\n` +
      `Payment Method: ${details.paymentMethod || "UPI"}\n` +
      (details.transactionId ? `UTR / Transaction Ref: ${details.transactionId}\n` : "") +
      (details.panNumber ? `PAN: ${details.panNumber}\n` : "") +
      `Type: ${details.donationType}\n` +
      `Campaign: ${details.campaign || details.eventName || "General Fund"}`,
    html: renderEmailHtml({
      title: "Donation Notification",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Donation of ${formatted} by ${details.name || "Anonymous"} (${details.receiptNumber || "N/A"})`,
  });
}

// ── Event Reservations & Volunteers ─────────────────────────────────────────

export async function sendReservationConfirmationEmail(
  to: string,
  name: string,
  eventTitle: string,
  isVolunteer: boolean,
  seats = 1
) {
  const roleLine = isVolunteer
    ? `you have been registered as a <strong>volunteer</strong> for`
    : `your reservation of <strong>${seats} seat${seats > 1 ? "s" : ""}</strong> is confirmed for`;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">You're Confirmed!</h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>Thank you — ${roleLine} <strong>"${esc(eventTitle)}"</strong>.</p>
    <p>We look forward to seeing you there. We will reach out with final timing and check-in details as the event approaches.</p>
  `;

  return await deliver({
    to,
    subject: `Confirmed: ${eventTitle} — Mahila Action`,
    text:
      `Hi ${name},\n\n` +
      `Thank you — your spot has been confirmed for "${eventTitle}".\n\n` +
      `We look forward to seeing you there!`,
    html: renderEmailHtml({
      title: "Event Confirmation",
      bodyHtml,
    }),
    consoleSummary: `Reservation confirmation for ${name} <${to}> | Event: ${eventTitle}`,
  });
}

export async function sendReservationAlertToAdmin(details: {
  eventName: string;
  name: string;
  email: string;
  phone: string;
  seats: number;
  isVolunteer: boolean;
  companions?: any;
}) {
  const adminEmail = getAdminNotificationEmail();
  let companionsList: any[] = [];
  if (Array.isArray(details.companions)) {
    companionsList = details.companions;
  } else if (typeof details.companions === "string" && details.companions.trim()) {
    try {
      const parsed = JSON.parse(details.companions);
      if (Array.isArray(parsed)) companionsList = parsed;
    } catch {}
  }
  const companionCount = companionsList.length;

  const companionRowHtml = companionCount > 0
    ? `<tr>
        <td style="padding: 6px 0; font-weight: 600; vertical-align: top;">Companions:</td>
        <td>
          <ul style="margin: 0; padding-left: 18px;">
            ${companionsList.map((c: any, i: number) => `<li>${esc(c.name || `Guest ${i + 1}`)}${c.phone ? ` (${esc(c.phone)})` : ""}</li>`).join("")}
          </ul>
        </td>
      </tr>`
    : "";

  const companionText = companionCount > 0
    ? `\nCompanions:\n` + companionsList.map((c: any, i: number) => ` - ${c.name || `Guest ${i + 1}`}${c.phone ? ` (${c.phone})` : ""}`).join("\n")
    : "";

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">New Event Registration</h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 120px;">Event:</td><td><strong>${esc(details.eventName)}</strong></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Type:</td><td>${details.isVolunteer ? "Volunteer" : "Attendee"}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Name:</td><td>${esc(details.name)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${esc(details.phone)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Seats:</td><td>${details.seats} ${companionCount > 0 ? `(${companionCount} companion${companionCount > 1 ? "s" : ""})` : ""}</td></tr>
      ${companionRowHtml}
    </table>
  `;

  return await deliver({
    to: adminEmail,
    subject: `New Event Signup: ${details.name} for ${details.eventName}`,
    text:
      `New event registration:\n\n` +
      `Event: ${details.eventName}\n` +
      `Role: ${details.isVolunteer ? "Volunteer" : "Attendee"}\n` +
      `Name: ${details.name}\n` +
      `Email: ${details.email}\n` +
      `Phone: ${details.phone}\n` +
      `Seats: ${details.seats}` +
      companionText,
    html: renderEmailHtml({
      title: "Event Registration Alert",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Event reservation by ${details.name} for ${details.eventName}`,
  });
}

export async function sendVolunteerConfirmationEmail(to: string, name: string, eventTitles: string[]) {
  const list = eventTitles.length ? eventTitles : ["(No specific events selected)"];
  const listHtml = `<ul>${list.map((t) => `<li style="margin-bottom: 6px;"><strong>${esc(t)}</strong></li>`).join("")}</ul>`;

  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Thank you for registering to volunteer!</h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>We are thrilled to have you join our volunteer team. You have registered for:</p>
    ${listHtml}
    <p>Our volunteer coordination team will contact you with orientation and schedule details ahead of the events.</p>
  `;

  return await deliver({
    to,
    subject: "Volunteer Registration Confirmed — Mahila Action",
    text:
      `Hi ${name},\n\n` +
      `Thank you for registering to volunteer with us! You signed up for:\n` +
      list.map((t) => `  • ${t}`).join("\n") +
      `\n\nWe will be in touch closer to the event dates.`,
    html: renderEmailHtml({
      title: "Volunteer Registration",
      bodyHtml,
    }),
    consoleSummary: `Volunteer confirmation for ${name} <${to}> (${list.join(", ")})`,
  });
}

export async function sendVolunteerAlertToAdmin(details: {
  name: string;
  email: string;
  phone: string;
  events: string[];
  skills?: string;
}) {
  const adminEmail = getAdminNotificationEmail();
  const list = details.events.length ? details.events : ["General / Unspecified"];
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">New Volunteer Signup</h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 100px;">Name:</td><td>${esc(details.name)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${esc(details.phone)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Skills:</td><td>${esc(details.skills || "None specified")}</td></tr>
    </table>
    <p style="margin: 16px 0 6px; font-weight: 600;">Selected Events:</p>
    <ul>${list.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
  `;

  return await deliver({
    to: adminEmail,
    subject: `New Volunteer Signup: ${details.name}`,
    text:
      `New volunteer signed up:\n\n` +
      `Name: ${details.name}\n` +
      `Email: ${details.email}\n` +
      `Phone: ${details.phone}\n` +
      `Skills: ${details.skills || "None"}\n` +
      `Events:\n` +
      list.map((e) => ` - ${e}`).join("\n"),
    html: renderEmailHtml({
      title: "New Volunteer Signup",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Volunteer signup from ${details.name} <${details.email}>`,
  });
}

// ── Vendors ─────────────────────────────────────────────────────────────────

export async function sendVendorConfirmationEmail(
  to: string,
  contactName: string,
  businessName: string,
  eventTitle: string
) {
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Vendor Application Received</h2>
    <p>Hi <strong>${esc(contactName)}</strong>,</p>
    <p>Thank you for submitting <strong>${esc(businessName)}</strong>'s vendor partner application for <strong>"${esc(eventTitle)}"</strong>.</p>
    <p>Our event committee will review your proposal and offerings. We will be in touch shortly regarding booth allocation and details.</p>
  `;

  return await deliver({
    to,
    subject: `Vendor Application Received: ${eventTitle} — Mahila Action`,
    text:
      `Hi ${contactName},\n\n` +
      `Thank you — we received ${businessName}'s vendor application for "${eventTitle}".\n` +
      `Our team will review it and follow up with next steps.`,
    html: renderEmailHtml({
      title: "Vendor Application",
      bodyHtml,
    }),
    consoleSummary: `Vendor confirmation for ${contactName} (${businessName}) | Event: ${eventTitle}`,
  });
}

export async function sendVendorAlertToAdmin(details: {
  eventName: string;
  contactName: string;
  businessName: string;
  email: string;
  phone: string;
  offering?: string;
  website?: string;
}) {
  const adminEmail = getAdminNotificationEmail();
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">New Vendor Application</h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 130px;">Event:</td><td><strong>${esc(details.eventName)}</strong></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Business:</td><td>${esc(details.businessName)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Contact:</td><td>${esc(details.contactName)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${esc(details.phone)}</td></tr>
      ${details.website ? `<tr><td style="padding: 6px 0; font-weight: 600;">Website:</td><td><a href="${esc(details.website)}">${esc(details.website)}</a></td></tr>` : ""}
    </table>
    ${
      details.offering
        ? `
      <div style="background-color: #faf5f1; border-left: 4px solid #993925; padding: 12px 16px; margin-top: 16px;">
        <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #993925;">Offering / Stall Details:</p>
        <p style="margin: 0; font-size: 14px;">${esc(details.offering)}</p>
      </div>`
        : ""
    }
  `;

  return await deliver({
    to: adminEmail,
    subject: `Vendor Application: ${details.businessName} for ${details.eventName}`,
    text:
      `New vendor application:\n\n` +
      `Event: ${details.eventName}\n` +
      `Business: ${details.businessName}\n` +
      `Contact: ${details.contactName}\n` +
      `Email: ${details.email}\n` +
      `Phone: ${details.phone}\n` +
      `Offering: ${details.offering || "N/A"}\n` +
      `Website: ${details.website || "N/A"}`,
    html: renderEmailHtml({
      title: "Vendor Application Alert",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Vendor application from ${details.businessName} (${details.contactName})`,
  });
}

// ── Permanent Volunteer Requests ───────────────────────────────────────────

export async function sendPermVolunteerAcknowledgementEmail(
  to: string,
  name: string,
  requestType: string
) {
  const isActivate = requestType !== "deactivate";
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">
      Permanent Volunteer ${isActivate ? "Application" : "Deactivation"} Received
    </h2>
    <p>Hi <strong>${esc(name)}</strong>,</p>
    <p>
      We have received your request regarding
      <strong>${isActivate ? "becoming a permanent community volunteer member" : "deactivating permanent volunteer membership"}</strong>.
    </p>
    <p>Our community coordinators will review your submission and reach out within 1-2 business days.</p>
  `;

  return await deliver({
    to,
    subject: `Permanent Volunteer ${isActivate ? "Application" : "Deactivation Request"} Received — Mahila Action`,
    text:
      `Hi ${name},\n\n` +
      `We have received your permanent volunteer ${isActivate ? "application" : "deactivation request"}.\n` +
      `Our coordinators will review it and get in touch with you shortly.`,
    html: renderEmailHtml({
      title: "Volunteer Membership Request",
      bodyHtml,
    }),
    consoleSummary: `Permanent volunteer acknowledgement for ${name} <${to}> (${requestType})`,
  });
}

export async function sendPermVolunteerAlertToAdmin(details: {
  name: string;
  email: string;
  phone?: string | null;
  requestType: string;
  message?: string | null;
}) {
  const adminEmail = getAdminNotificationEmail();
  const isActivate = details.requestType !== "deactivate";
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">
      Permanent Volunteer ${isActivate ? "Activation" : "Deactivation"} Request
    </h2>
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; font-weight: 600; width: 120px;">Type:</td><td><strong>${isActivate ? "Permanent Volunteer Application" : "Deactivation Request"}</strong></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Name:</td><td>${esc(details.name)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td><a href="mailto:${esc(details.email)}">${esc(details.email)}</a></td></tr>
      <tr><td style="padding: 6px 0; font-weight: 600;">Phone:</td><td>${esc(details.phone || "Not provided")}</td></tr>
    </table>
    ${
      details.message
        ? `
      <div style="background-color: #faf5f1; border-left: 4px solid #993925; padding: 12px 16px; margin-top: 16px;">
        <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #993925;">Applicant's Message:</p>
        <p style="margin: 0; font-size: 14px;">${esc(details.message)}</p>
      </div>`
        : ""
    }
  `;

  return await deliver({
    to: adminEmail,
    subject: `Permanent Volunteer Request: ${details.name} (${details.requestType})`,
    text:
      `Permanent volunteer request:\n\n` +
      `Type: ${details.requestType}\n` +
      `Name: ${details.name}\n` +
      `Email: ${details.email}\n` +
      `Phone: ${details.phone || "Not provided"}\n` +
      `Message: ${details.message || "None"}`,
    html: renderEmailHtml({
      title: "Permanent Volunteer Alert",
      bodyHtml,
    }),
    consoleSummary: `Admin alert: Permanent volunteer request from ${details.name} <${details.email}>`,
  });
}

// ── Diagnostics & Connection Verification ───────────────────────────────────

export async function verifySmtpConnection(): Promise<{
  ok: boolean;
  configured: boolean;
  message: string;
  host?: string;
  port?: number;
  user?: string;
  error?: string;
}> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return {
      ok: false,
      configured: false,
      message: "SMTP is not fully configured in environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).",
    };
  }

  const t = getTransporter();
  if (!t) {
    return {
      ok: false,
      configured: false,
      message: "Could not initialize nodemailer transporter.",
    };
  }

  try {
    await t.verify();
    return {
      ok: true,
      configured: true,
      message: "SMTP connection verified successfully. Ready to send emails.",
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      user: SMTP_USER,
    };
  } catch (err: any) {
    return {
      ok: false,
      configured: true,
      message: err.message || "Failed to verify SMTP credentials.",
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      user: SMTP_USER,
      error: err.message,
    };
  }
}

export async function sendTestEmail(toEmail: string) {
  const siteUrl = getSiteUrl();
  const bodyHtml = `
    <h2 style="margin: 0 0 16px; font-size: 20px; color: #993925;">Test Email from Mahila Action</h2>
    <p>This is a test email sent from the Mahila Action administrative system.</p>
    <p>If you are reading this, your email SMTP delivery configuration is working perfectly!</p>
    <div style="background-color: #faf5f1; border-left: 4px solid #993925; padding: 12px 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 13px; color: #5a4f4b;">Timestamp: ${new Date().toISOString()}</p>
    </div>
  `;

  return await deliver({
    to: toEmail,
    subject: "Test Email — Mahila Action SMTP Verification",
    text: `This is a test email from Mahila Action confirming that email delivery is working properly.\n\nTimestamp: ${new Date().toISOString()}`,
    html: renderEmailHtml({
      title: "SMTP Test Email",
      bodyHtml,
      cta: { text: "Open Website", url: siteUrl },
    }),
    consoleSummary: `Test email dispatched to ${toEmail}`,
  });
}
