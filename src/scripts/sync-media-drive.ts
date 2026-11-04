import dotenv from "dotenv";
import { initDb } from "../lib/db";
import { isGoogleDriveConfigured } from "../lib/googleDrive";
import { syncGoogleDriveMedia } from "../lib/googleDriveSync";

dotenv.config();

async function main() {
  console.log("=======================================================");
  console.log("  Sync Media Library with Google Drive Storage");
  console.log("=======================================================\n");

  if (!isGoogleDriveConfigured()) {
    console.error("❌ Google Drive OAuth is not configured in .env.");
    process.exit(1);
  }

  await initDb();
  console.log("🔄 Running two-way synchronization with Google Drive...");

  const result = await syncGoogleDriveMedia({ force: true });
  if (!result.ok) {
    console.error("❌ Sync failed:", result.message);
    process.exit(1);
  }

  console.log(`✓ Active Google Drive files: ${result.activeDriveCount}`);
  console.log(`✓ Total catalog items: ${result.totalCatalogCount}`);
  console.log(`✓ Pruned deleted files: ${result.prunedCount}`);
  console.log(`✓ Imported new files: ${result.importedCount}`);
  console.log(`\n🎉 ${result.message}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during sync:", err);
  process.exit(1);
});
