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

        console.log('🌱 Seeding records from CSVs...');

        const dataDir = path.join(__dirname, 'db', 'data');
        const csvFiles = [
            { file: 'my.bookshop.Users.csv', table: 'my_bookshop_Users' },
            { file: 'my.bookshop.Clients.csv', table: 'my_bookshop_Clients' },
            { file: 'my.bookshop.Restaurants.csv', table: 'my_bookshop_Restaurants' },
            { file: 'my.bookshop.Drivers.csv', table: 'my_bookshop_Drivers' },
            { file: 'my.bookshop.Products.csv', table: 'my_bookshop_Products' }
        ];

        for (const { file, table } of csvFiles) {
            const filePath = path.join(dataDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`   Importing ${file} into ${table}...`);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

                if (lines.length > 0) {
                    // Normalize headers: trim whitespace, remove quotes, and LOWERCASE to match Postgres unquoted columns
                    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(';').map(v => {
                            let val = v.trim();
                            // Remove surrounding quotes if present
                            if (val.startsWith('"') && val.endsWith('"')) {
                                val = val.slice(1, -1);
                            }
                            // Convert standard empty strings to null assuming strings
                            // Ideally, we'd check types, but for this seeder, we assume strings/numbers
                            return val === '' ? null : val;
                        });

                        // Basic validation to match header count
                        if (values.length === headers.length) {
                            const placeholders = headers.map((_, idx) => `$${idx + 1}`).join(', ');
                            const insertQuery = `INSERT INTO ${table} ("${headers.join('", "')}") VALUES (${placeholders})`;

                            try {
                                await client.query(insertQuery, values);
                            } catch (err) {
                                console.error(`Error inserting row ${i} into ${table}:`, err.message);
                            }
                        }
                    }
                }
            } else {
                console.warn(`   ⚠️  File ${file} not found. Skipping.`);
            }
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
