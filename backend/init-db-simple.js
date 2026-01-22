const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Brute-force SSL bypass for cloud deployment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        env.split('\n').forEach(line => {
            const parts = line.split('=');
            const key = parts[0]?.trim();
            const value = parts.slice(1).join('=')?.trim().replace(/\r/g, '');
            if (key && value) {
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL not found in .env');
    process.exit(1);
}

// Ensure we have the latest SQL (Compiling WHOLE model to get views too)
try {
    console.log('📦 Compiling model to SQL...');
    const { execSync } = require('child_process');
    execSync('npx cds compile "*" --to sql --dialect postgres > schema.sql');
} catch (e) {
    console.error('❌ Failed to compile schema:', e.message);
}

const sqlPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('🔄 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected.');

        console.log('🗑️  Cleaning up existing tables and views...');
        
        // Drop all views first to avoid dependency issues
        await client.query(`
            DO $$ 
            DECLARE 
                r RECORD; 
            BEGIN 
                FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'my_bookshop_%' 
                LOOP 
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; 
                END LOOP; 
            END $$;
        `);
        
        // Alternative: drop all views explicitly
        await client.query(`
            DO $$ 
            DECLARE 
                r RECORD; 
            BEGIN 
                FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'my_bookshop_%' 
                LOOP 
                    EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE'; 
                END LOOP; 
            END $$;
        `);

        console.log('🛠️  Applying new schema with UUID configuration...');
        
        // Modify SQL to use UUID instead of VARCHAR(36) for ID columns
        const modifiedSql = sql.replace(/ID VARCHAR\(36\)/g, 'ID UUID DEFAULT gen_random_uuid()')
                               .replace(/(\w+)_ID VARCHAR\(36\)/g, '$1_ID UUID');
        
        await client.query(modifiedSql);

        console.log('✅ Schema and IDs configured properly.');
        console.log('💡 TIP: Run "node seed-db.js" if you want to populate the database with mock data.');

        console.log('🎉 Deployment successful! Database structure is ready. 🚀');
    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
