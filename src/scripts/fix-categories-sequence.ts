import { Client } from 'pg';

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('Please set DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected');

  await client.query("CREATE SEQUENCE IF NOT EXISTS cms_categories_id_seq");
  console.log('sequence ensured');

  await client.query("ALTER TABLE public.cms_categories ALTER COLUMN id SET DEFAULT nextval(pg_get_serial_sequence('cms_categories','id'))");
  console.log('set default');

  try {
    await client.query("ALTER SEQUENCE cms_categories_id_seq OWNED BY public.cms_categories.id");
    console.log('set owned');
  } catch (err: any) {
    console.warn('failed to set ownership:', err.message || err);
  }

  const maxRes = await client.query("SELECT COALESCE(MAX((id::bigint)) FILTER (WHERE id ~ '^\\d+$'), 0) AS max_id FROM public.cms_categories");
  const maxId = Number(maxRes.rows[0]?.max_id ?? 0);
  console.log('maxId', maxId);

  await client.query("SELECT setval(pg_get_serial_sequence('cms_categories','id'), $1, true)", [maxId]);
  console.log('setval done');

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
