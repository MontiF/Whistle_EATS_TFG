const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
(async () => {
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in DB:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
})();
