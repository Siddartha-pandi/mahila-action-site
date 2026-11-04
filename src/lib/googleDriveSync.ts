import { queryDb } from "./db";
import {
  isGoogleDriveConfigured,
  getDriveClient,
  getOrCreateMediaFolder,
} from "./googleDrive";

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 10000; // 10 seconds throttle cooldown

export interface SyncResult {
  ok: boolean;
  prunedCount: number;
  importedCount: number;
  activeDriveCount: number;
  totalCatalogCount: number;
  throttled?: boolean;
  message: string;
}

/**
 * One-way Auto-Sync:
 * Automatically checks Google Drive for any media files that have been deleted or moved to trash,
 * and immediately cleans up the corresponding records in the PostgreSQL media catalog.
 */
export async function syncGoogleDriveMedia(options?: { force?: boolean }): Promise<SyncResult> {
  const now = Date.now();
  if (!options?.force && now - lastSyncTime < SYNC_THROTTLE_MS) {
    return {
      ok: true,
      prunedCount: 0,
      importedCount: 0,
      activeDriveCount: 0,
      totalCatalogCount: 0,
      throttled: true,
      message: "Sync skipped (throttled).",
    };
  }

  if (!isGoogleDriveConfigured()) {
    return {
      ok: false,
      prunedCount: 0,
      importedCount: 0,
      activeDriveCount: 0,
      totalCatalogCount: 0,
      message: "Google Drive OAuth is not configured in environment variables.",
    };
  }

  const drive = getDriveClient();
  const folderId = await getOrCreateMediaFolder();

  // 1. Scan active file IDs in Google Drive media folder
  const activeDriveIds = new Set<string>();
  let pageToken: string | undefined = undefined;

  try {
    do {
      const listRes: any = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, mimeType)",
        pageSize: 1000,
        pageToken,
      });

      if (listRes.data.files) {
        for (const f of listRes.data.files) {
          if (f.id && f.mimeType !== "application/vnd.google-apps.folder") {
            activeDriveIds.add(f.id);
          }
        }
      }
      pageToken = listRes.data.nextPageToken || undefined;
    } while (pageToken);
  } catch (listErr: any) {
    console.error("syncGoogleDriveMedia list error:", listErr);
    return {
      ok: false,
      prunedCount: 0,
      importedCount: 0,
      activeDriveCount: 0,
      totalCatalogCount: 0,
      message: "Failed to read Google Drive folder: " + (listErr.message || String(listErr)),
    };
  }

  // 2. Fetch existing database records pointing to Google Drive
  const dbRes = await queryDb(
    "SELECT id, filename, drive_file_id FROM media WHERE drive_file_id IS NOT NULL AND drive_file_id != ''"
  );

  const missingDbIds: number[] = [];

  for (const row of dbRes.rows) {
    if (!row.drive_file_id) continue;

    // If item not found in current active folder, check if it was deleted or moved to trash
    if (!activeDriveIds.has(row.drive_file_id)) {
      try {
        const fileCheck = await drive.files.get({
          fileId: row.drive_file_id,
          fields: "id, trashed",
        });
        if (fileCheck.data.trashed) {
          missingDbIds.push(row.id);
        }
      } catch (getErr: any) {
        if (getErr.code === 404 || getErr?.status === 404) {
          missingDbIds.push(row.id);
        }
      }
    }
  }

  // 3. Prune deleted records from PostgreSQL (One-way sync: Drive deletion -> Catalog deletion)
  if (missingDbIds.length > 0) {
    await queryDb("DELETE FROM media WHERE id = ANY($1::int[])", [missingDbIds]);
  }

  lastSyncTime = Date.now();

  const totalCatalog = dbRes.rows.length - missingDbIds.length;
  const summary = missingDbIds.length > 0
    ? `One-way auto-sync: Removed ${missingDbIds.length} deleted image(s) from catalog.`
    : `Catalog is in sync with Google Drive (${totalCatalog} items).`;

  return {
    ok: true,
    prunedCount: missingDbIds.length,
    importedCount: 0,
    activeDriveCount: activeDriveIds.size,
    totalCatalogCount: totalCatalog,
    message: summary,
  };
}
