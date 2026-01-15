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

        console.log('🗑️  Cleaning up existing tables...');
        const tables = [
            'my_bookshop_Clients',
            'my_bookshop_Restaurants',
            'my_bookshop_Drivers',
            'my_bookshop_Users',
            'my_bookshop_Products'
        ];
        for (const table of tables) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        console.log('🛠️  Applying new schema...');
        await client.query(sql);

        console.log('⚙️  Configuring Auto-IDs (UUID)...');
        const alterTables = [
            'my_bookshop_users',
            'my_bookshop_clients',
            'my_bookshop_restaurants',
            'my_bookshop_drivers',
            'my_bookshop_products'
        ];

        for (const table of alterTables) {
            try {
                // Ensure ID is UUID and set default.
                // Note: The schema.sql creates them as VARCHAR(36) usually.
                // We cast to UUID and set default.
                // Using 'id' (lowercase) because Postgres unquoted identifiers are lowercase.
                await client.query(`ALTER TABLE ${table} ALTER COLUMN id TYPE UUID USING id::uuid`);
                await client.query(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
            } catch (e) {
                console.warn(`⚠️  Could not auto-configure ID for ${table}:`, e.message);
            }
        }

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
