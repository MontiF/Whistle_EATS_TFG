const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

console.log("--- DEBUG CONNECTION SCRIPT ---");

// 1. Read .env
const envPath = path.resolve(__dirname, '.env');
console.log(`Reading .env from: ${envPath}`);
let dbUrl = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
    lines.forEach(line => {
        if (line.startsWith('DATABASE_URL=')) {
            dbUrl = line.split('=', 2)[1];
            // Handle potential quotes
            if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
                dbUrl = dbUrl.slice(1, -1);
            }
            if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
                dbUrl = dbUrl.slice(1, -1);
            }
        }
    });
} catch (e) {
    console.error("Failed to read .env:", e.message);
}

if (!dbUrl) {
    console.error("ERROR: DATABASE_URL not found in .env");
    // Hardcode fallback for testing if env read fails
    // dbUrl = "postgresql://postgres.mmkigywgdogthcyshrna:RobertoSebasMiguel@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";
} else {
    console.log(`Found DATABASE_URL (length: ${dbUrl.length})`);
    // Print masked URL
    console.log(`URL: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
}

// 2. Validate URL structure
try {
    const url = new URL(dbUrl);
    console.log(`Parsed URL:`);
    console.log(`  Host: ${url.hostname}`);
    console.log(`  Port: ${url.port}`);
    console.log(`  Database: ${url.pathname.substring(1)}`);
} catch (e) {
    console.error("ERROR: Invalid URL format:", e.message);
}

// 3. Attempt Connection
console.log("\nAttempting connection with 'pg' client...");
const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL, usually defaults to true in connection string but pg needs explicit
    connectionTimeoutMillis: 5000
});

(async () => {
    try {
        await client.connect();
        console.log("SUCCESS: Connected to database!");
        const res = await client.query('SELECT NOW() as now');
        console.log("Server Time:", res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error("\nCONNECTION FAILED:");
        console.error("  Message:", err.message);
        console.error("  Code:", err.code);
        if (err.message.includes("timeout")) {
            console.error("\nPossible Causes:");
            console.error("  1. Supabase project is PAUSED (check dashboard).");
            console.error("  2. Firewall/Network blocking outgoing port 6543/5432.");
            console.error("  3. VPN interference.");
        }
        process.exit(1);
    }
})();
