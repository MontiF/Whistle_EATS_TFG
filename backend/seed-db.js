const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Bypass SSL for some environments
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

const SEED_DATA = {
    users: [
        ['11111111-1111-1111-1111-111111111111', 'cliente@test.com', '1234', 'cliente', 'Juan Cliente'],
        ['22222222-2222-2222-2222-222222222222', 'repartidor@test.com', '1234', 'repartidor', 'Ana Repartidora'],
        ['33333333-3333-3333-3333-333333333333', 'local@test.com', '1234', 'local', 'Super Local'],
        ['44444444-4444-4444-4444-444444444444', 'cliente2@test.com', '1234', 'cliente', 'Pepe Cliente']
    ],
    clients: [
        ['cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Calle de Braulio Gutiérrez 19, Madrid']
    ],
    drivers: [
        ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Moto', '1234ABC', '12345678A', 'Yamaha', 'MT-07', 'Negro', 'A2']
    ],
    restaurants: [
        ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'B12345678', 'Calle de Gran Vía 32, Madrid']
    ],
    products: [
        ['10000000-0000-0000-0000-000000000001', 'Menu del dia', 'Menu completo con bebida', 12.50, 'https://placehold.co/600x400', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'menu'],
        ['10000000-0000-0000-0000-000000000002', 'Hamburguesa Especial', 'Con queso y bacon', 9.99, 'https://placehold.co/600x400', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'comida'],
        ['10000000-0000-0000-0000-000000000003', 'Coca Cola Zero', 'Lata 33cl', 2.50, 'https://placehold.co/600x400', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bebida'],
        ['10000000-0000-0000-0000-000000000004', 'Patatas Fritas', 'Racion grande', 3.50, 'https://placehold.co/600x400', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'complemento']
    ]
};

async function seed() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('✅ Connected to Supabase for seeding.');

        // Seeding Users
        console.log('🌱 Seeding Users...');
        for (const user of SEED_DATA.users) {
            await client.query(
                'INSERT INTO my_bookshop_Users (ID, email, password, role, name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (ID) DO NOTHING',
                user
            );
        }

        // Seeding Clients
        console.log('🌱 Seeding Clients...');
        for (const c of SEED_DATA.clients) {
            await client.query(
                'INSERT INTO my_bookshop_Clients (ID, userID_ID, defaultAddress) VALUES ($1, $2, $3) ON CONFLICT (ID) DO NOTHING',
                c
            );
        }

        // Seeding Drivers
        console.log('🌱 Seeding Drivers...');
        for (const d of SEED_DATA.drivers) {
            await client.query(
                'INSERT INTO my_bookshop_Drivers (ID, userID_ID, vehicleType, vehiclePlate, dni, vehicleBrand, vehicleModel, vehicleColor, drivingLicense, hired) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) ON CONFLICT (ID) DO NOTHING',
                d
            );
        }

        // Seeding Restaurants
        console.log('🌱 Seeding Restaurants...');
        for (const r of SEED_DATA.restaurants) {
            await client.query(
                'INSERT INTO my_bookshop_Restaurants (ID, userID_ID, cif, address, hired) VALUES ($1, $2, $3, $4, true) ON CONFLICT (ID) DO NOTHING',
                r
            );
        }

        // Seeding Products
        console.log('🌱 Seeding Products...');
        for (const p of SEED_DATA.products) {
            await client.query(
                'INSERT INTO my_bookshop_Products (ID, name, description, price, imageUrl, restaurantId_ID, type) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (ID) DO NOTHING',
                p
            );
        }

        console.log('🎉 Seeding completed successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
    } finally {
        await client.end();
    }
}

seed();
