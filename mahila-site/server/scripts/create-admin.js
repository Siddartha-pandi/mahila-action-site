// Usage: npm run create-admin -- admin@example.com "a-strong-password"
import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import pool, { initDb } from "../src/db.js";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-admin -- "admin@example.com" "a-strong-password"');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

async function run() {
  try {
    await initDb();
    const normalizedEmail = email.toLowerCase().trim();
    const password_hash = bcrypt.hashSync(password, 12);

    const existingRes = await pool.query("SELECT id FROM app_admin_users WHERE email = $1", [normalizedEmail]);
    if (existingRes.rows.length > 0) {
      await pool.query("UPDATE app_admin_users SET password_hash = $1 WHERE email = $2", [password_hash, normalizedEmail]);
      console.log(`Updated password for existing admin: ${normalizedEmail}`);
    } else {
      await pool.query("INSERT INTO app_admin_users (id, email, password_hash) VALUES ($1, $2, $3)", [
        nanoid(),
        normalizedEmail,
        password_hash,
      ]);
      console.log(`Created admin user: ${normalizedEmail}`);
    }
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    await pool.end();
  }
}

run();
