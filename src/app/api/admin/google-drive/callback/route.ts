import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/googleDrive";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/google-drive/callback
 * Handles the OAuth redirect from Google, exchanges authorization code for refresh token,
 * automatically saves it to .env if in local development, and presents instructions for the admin.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new NextResponse(
      renderHtml("OAuth Authorization Failed", `Google reported an error: ${error}`, false),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      renderHtml("Missing Authorization Code", "No code parameter received from Google.", false),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return new NextResponse(
        renderHtml(
          "No Refresh Token Received",
          "Google did not return a refresh token because this account was previously authorized without prompt=consent. Go back and select 'Reconnect' with prompt=consent.",
          false
        ),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let autoSaved = false;
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        if (envContent.includes("GOOGLE_REFRESH_TOKEN=")) {
          envContent = envContent.replace(
            /GOOGLE_REFRESH_TOKEN=.*/,
            `GOOGLE_REFRESH_TOKEN=${refreshToken}`
          );
        } else {
          envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
        autoSaved = true;
      }
    } catch (saveErr) {
      console.warn("Could not auto-save refresh token to .env:", saveErr);
    }

    const html = renderHtml(
      "Google Drive Connected Successfully! 🎉",
      `
      <div style="text-align: left; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
        ${
          autoSaved
            ? `<div style="background: #e8f5e9; border: 1px solid #c8e6c9; color: #2e7d32; padding: 12px; border-radius: 6px; font-weight: 600; margin-bottom: 16px;">
                 ✅ Successfully updated <code>GOOGLE_REFRESH_TOKEN</code> in your <code>.env</code> file!
               </div>`
            : ""
        }
        <p style="margin: 0 0 10px; font-weight: bold; color: #1e1e1e;">Your Google Drive Refresh Token:</p>
        <div style="background: #f7f7f7; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; border: 1px dashed #bbb; font-size: 13px;">
          ${refreshToken}
        </div>
        <p style="margin: 15px 0 5px; font-size: 13px; color: #555;">
          ${
            autoSaved
              ? "For reference, your configuration has been saved as:"
              : "Copy this value and set it as <code>GOOGLE_REFRESH_TOKEN</code> in your <code>.env</code> file:"
          }
        </p>
        <pre style="background: #2b2b2b; color: #a9ff94; padding: 10px 14px; border-radius: 6px; font-size: 12px; overflow-x: auto;">GOOGLE_REFRESH_TOKEN=${refreshToken}</pre>
      </div>
      <p style="margin-top: 20px;">
        <a href="/admin?tab=media" style="display: inline-block; background: #a65a4a; color: #fff; padding: 10px 20px; border-radius: 20px; text-decoration: none; font-weight: bold;">
          ← Return to Admin Media Library
        </a>
      </p>
      `,
      true
    );

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return new NextResponse(
      renderHtml("Token Exchange Error", err.message || "Failed to exchange authorization code", false),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function renderHtml(title: string, bodyHtml: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Mahila Action</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f4efe7;
      color: #1e1e1e;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: white;
      max-width: 580px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      overflow: hidden;
      border: 1px solid rgba(166,90,74,0.15);
    }
    .header {
      background: ${success ? "#a65a4a" : "#b91c1c"};
      color: #f4efe7;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 28px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}
