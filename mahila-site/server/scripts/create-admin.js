// Usage: npm run create-admin -- admin@example.com "a-strong-password"
import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import db from "../src/db.js";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-admin -- "admin@example.com" "a-strong-password"');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();
const password_hash = bcrypt.hashSync(password, 12);

const existing = db.prepare("SELECT id FROM admin_users WHERE email = ?").get(normalizedEmail);
if (existing) {
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE email = ?").run(password_hash, normalizedEmail);
  console.log(`Updated password for existing admin: ${normalizedEmail}`);
} else {
  db.prepare("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)").run(
    nanoid(),
    normalizedEmail,
    password_hash
  );
  console.log(`Created admin user: ${normalizedEmail}`);
}
