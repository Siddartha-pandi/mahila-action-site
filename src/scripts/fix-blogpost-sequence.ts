#!/usr/bin/env tsx
import { Client } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Export DATABASE_URL and re-run this script.');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database.');

    // Ensure table exists
    const tblRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_blog_posts'`
    );
    if (tblRes.rowCount === 0) {
      console.error('Table "cms_blog_posts" not found in the public schema. Aborting.');
      process.exit(3);
    }

    // Check current column default and data type for id
    const colRes = await client.query(
      `SELECT column_default, data_type FROM information_schema.columns WHERE table_name = 'cms_blog_posts' AND column_name = 'id'`
    );
    const columnDefault = colRes.rows[0]?.column_default ?? null;
    const idDataType = colRes.rows[0]?.data_type ?? null;
    console.log('Current column_default for cms_blog_posts.id:', columnDefault);
    console.log('cms_blog_posts.id data_type:', idDataType);

    // Ensure sequence exists
    // Typical sequence name: cms_blog_posts_id_seq
    const seqName = 'cms_blog_posts_id_seq';
    const seqRes = await client.query(`SELECT relname FROM pg_class WHERE relkind = 'S' AND relname = $1`, [seqName]);
    const seqExists = seqRes.rowCount > 0;

    if (!seqExists) {
      console.log(`Sequence ${seqName} does not exist. Creating it...`);
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`);
      console.log('Sequence created.');
    } else {
      console.log(`Sequence ${seqName} already exists.`);
    }

    // If column default is missing or not using nextval(...), set it
    if (!columnDefault || !/nextval\(/i.test(String(columnDefault))) {
      console.log('Setting column default to use sequence via nextval(pg_get_serial_sequence(...)).');
      // Use pg_get_serial_sequence in case the actual sequence name differs
      await client.query(
        `ALTER TABLE public.cms_blog_posts ALTER COLUMN id SET DEFAULT nextval(pg_get_serial_sequence('cms_blog_posts','id'))`
      );
      console.log('Column default set.');
    } else {
      console.log('Column default already uses a nextval() sequence — leaving as-is.');
    }

    // Ensure sequence is owned by the column
    try {
      await client.query(`ALTER SEQUENCE ${seqName} OWNED BY public.cms_blog_posts.id`);
      console.log(`Set ownership: ${seqName} -> cms_blog_posts.id`);
    } catch (err) {
      console.warn('Failed to set sequence ownership (may be already owned or sequence name different):', err.message || err);
    }

    // Synchronize sequence value to at least MAX(id)
    let maxId = 0;
    if (idDataType && /(smallint|integer|bigint|numeric|decimal)/i.test(idDataType)) {
      const maxRes = await client.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM public.cms_blog_posts`);
      maxId = Number(maxRes.rows[0]?.max_id ?? 0);
    } else {
      // id column is textual: compute max numeric id from purely-numeric ids
      const maxRes = await client.query(`SELECT COALESCE(MAX((id::bigint)) FILTER (WHERE id ~ '^\\d+$'), 0) AS max_id FROM public.cms_blog_posts`);
      maxId = Number(maxRes.rows[0]?.max_id ?? 0);
    }

    console.log('Current MAX(id) in cms_blog_posts:', maxId);

    // Use setval to move sequence to maxId (so next nextval yields maxId+1)
    await client.query(`SELECT setval(pg_get_serial_sequence('cms_blog_posts','id'), $1, true)`, [maxId]);
    console.log(`Sequence advanced to ${maxId} (next value will be ${maxId + 1}).`);

    console.log('Postgres cms_blog_posts id default/sequence verification & repair completed successfully.');
    await client.end();
    process.exit(0);
  } catch (err: any) {
    console.error('Error while repairing sequence/default:', err?.message || err);
    try { await client.end(); } catch {}
    process.exit(1);
  }
}

main();
