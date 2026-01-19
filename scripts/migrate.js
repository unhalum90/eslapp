const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const connectionString = process.env.SUPABASE_CONNECT;
    if (!connectionString) {
        console.error('SUPABASE_CONNECT is not defined in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Required for Supabase/AWS RDS usually
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
