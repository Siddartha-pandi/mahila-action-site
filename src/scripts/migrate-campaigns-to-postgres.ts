import fs from 'fs';
import path from 'path';
import { getPool } from '@/lib/db';

async function run() {
  const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'campaigns.json');
  let campaigns: any[] = [];
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    campaigns = JSON.parse(raw);
  } catch (err) {
    console.error('Could not read campaigns.json, aborting migration.');
    process.exit(1);
  }

  const pool = await getPool();
  try {
    for (const c of campaigns) {
      const id = c.id;
      const name = c.name || id;
      const tag = c.tag || null;
      const raised = Number(c.raised || 0);
      const goal = Number(c.goal || 0);
      await pool.query(
        `INSERT INTO campaigns (id, name, tag, raised, goal, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, tag = EXCLUDED.tag, raised = EXCLUDED.raised, goal = EXCLUDED.goal, updated_at = CURRENT_TIMESTAMP`,
        [id, name, tag, raised, goal]
      );
    }
    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

run();
