import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n=======================================================");
  console.log("  Google Drive API v3 OAuth 2.0 Personal Setup Wizard  ");
  console.log("=======================================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  let clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId) {
    clientId = (await question("Enter your Google Client ID: ")).trim();
  } else {
    console.log(`Using existing GOOGLE_CLIENT_ID from .env: ${clientId.slice(0, 15)}...`);
  }

  if (!clientSecret) {
    clientSecret = (await question("Enter your Google Client Secret: ")).trim();
  } else {
    console.log(`Using existing GOOGLE_CLIENT_SECRET from .env: ********`);
  }

  if (!clientId || !clientSecret) {
    console.error("\n❌ Error: Client ID and Client Secret are required.");
    rl.close();
    process.exit(1);
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/admin/google-drive/callback";

  console.log(`\nUsing Redirect URI: \x1b[33m${redirectUri}\x1b[0m`);
  console.log("⚠️  Ensure this EXACT URI is in your Google Cloud Console:");
  console.log("    APIs & Services > Credentials > OAuth 2.0 Client ID > Authorized redirect URIs\n");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  console.log("1. Open this URL in your browser:\n");
  console.log(`\x1b[36m${authUrl}\x1b[0m\n`);
  const driveEmail = process.env.GOOGLE_DRIVE_EMAIL || "your Google Account";
  console.log(`2. Sign in with ${driveEmail} and grant Drive access.`);
  console.log("3. Google will redirect to your callback URL.");
  console.log("   (If your Next.js dev server is running on port 3000, it handles it automatically).");
  console.log("   If your browser displays 'can't be reached', simply copy the entire URL from the browser's address bar!\n");

  const rawInput = (await question("Paste the authorization code OR the full redirected URL here: ")).trim();

  let code = rawInput;
  if (rawInput.startsWith("http://") || rawInput.startsWith("https://")) {
    try {
      const parsed = new URL(rawInput);
      code = parsed.searchParams.get("code") || rawInput;
    } catch {
      code = rawInput;
    }
  }

  if (!code) {
    console.error("❌ No code provided. Exiting.");
    rl.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.warn("\n⚠️  No refresh token returned. Account was already consented. Try passing prompt=consent.");
    } else {
      console.log("\n✓ Authorization successful!");
      console.log("=======================================================");
      console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
      console.log("=======================================================");

      // Auto update .env
      try {
        const envPath = path.resolve(process.cwd(), ".env");
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, "utf-8");
          if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
            envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
          }
          fs.writeFileSync(envPath, envContent, "utf-8");
          console.log("✓ Successfully updated GOOGLE_REFRESH_TOKEN in .env!");
        }
      } catch (err: any) {
        console.warn("Could not write to .env automatically:", err.message);
      }
    }
  } catch (err: any) {
    console.error("\n❌ Failed to exchange code for tokens:", err.message || err);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
