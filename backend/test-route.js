const fs = require('fs');
const path = require('path');

// Leer la API Key del archivo .env manualmente para no obligar a instalar dotenv
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/ORS_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("❌ No se encontró ORS_API_KEY en el archivo .env");
    process.exit(1);
}

// Coordenadas de prueba (Madrid): [Longitud, Latitud]
// Nota: ORS usa [Long, Lat] no [Lat, Long]
const start = [-3.70379, 40.41678]; // Puerta del Sol
const end = [-3.68834, 40.42398];   // Retiro

async function getRoute() {
    console.log("🚀 Consultando ruta a OpenRouteService...");

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start.join(',')}&end=${end.join(',')}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            const route = data.features[0].properties.summary;
            console.log("✅ ¡Conexión exitosa!");
            console.log(`📏 Distancia: ${(route.distance / 1000).toFixed(2)} km`);
            console.log(`⏱️ Duración: ${(route.duration / 60).toFixed(2)} min`);
        } else {
            console.error("❌ Error de la API:", data);
        }
    } catch (error) {
        console.error("❌ Error al conectar:", error.message);
    }
}

getRoute();
