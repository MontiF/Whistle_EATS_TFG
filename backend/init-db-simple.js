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

// Ensure we have the latest SQL
try {
    const { execSync } = require('child_process');
    execSync('npx cds compile db/schema.cds --to sql --dialect postgres > schema.sql');
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
        console.log('🔄 Connecting to Supabase (Port 6543)...');
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

        console.log('🌱 Seeding initial records...');
        const users = [
            ['11111111-1111-1111-1111-111111111111', 'cliente@test.com', '1234', 'cliente', 'Juan Cliente'],
            ['22222222-2222-2222-2222-222222222222', 'repartidor@test.com', '1234', 'repartidor', 'Ana Repartidora'],
            ['33333333-3333-3333-3333-333333333333', 'admin@test.com', '1234', 'admin', 'Super Admin'],
            ['44444444-4444-4444-4444-444444444444', 'cliente2@test.com', '1234', 'cliente', 'Pepe Cliente'],
            ['55555555-5555-5555-5555-555555555555', 'sebas_prueba@test.com', '1234', 'cliente', 'Sebas Prueba']
        ];

        for (const user of users) {
            await client.query(
                'INSERT INTO my_bookshop_Users (ID, email, password, role, name) VALUES ($1, $2, $3, $4, $5)',
                user
            );
        }

        console.log('🎉 Deployment successful! Database is now fresh and updated. 🚀');
    } catch (err) {
        console.error('❌ Deployment failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
