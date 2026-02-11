const cds = require('@sap/cds');
const webpush = require('web-push');

// Configuración de las llaves VAPID para el envío de notificaciones
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL || 'admin@whistleeats.com'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

module.exports = cds.service.impl(async function () {
    const { Users, Clients, Drivers, Restaurants, PushSubscriptions } = this.entities;

    this.before('CREATE', 'PushSubscriptions', async (req) => {
        const { endpoint } = req.data;
        if (endpoint) {
            await DELETE.from(PushSubscriptions).where({ endpoint });
        }
    });

    this.on('registerUser', async (req) => {
        const { userData } = req.data;
        const db = await cds.connect.to('db');
        const tx = db.transaction(req);

        try {
            console.log(`🚀 Intentando registrar usuario: ${userData.email} con rol: ${userData.role}`);

            const userId = cds.utils.uuid();
            const profileId = cds.utils.uuid();

            // 1. Insertar en la tabla principal de Usuarios
            await tx.run(INSERT.into(Users).entries({
                ID: userId,
                email: userData.email,
                password: userData.password,
                role: userData.role,
                name: userData.name,
                phone: userData.phone
            }));

            console.log(`✅ Usuario creado con ID: ${userId}`);

            // 2. Insertar en la tabla de perfil específica según el rol
            if (userData.role === 'cliente') {
                await tx.run(INSERT.into(Clients).entries({
                    ID: profileId,
                    userID_ID: userId,
                    defaultAddress: userData.address
                }));
            } else if (userData.role === 'local') {
                await tx.run(INSERT.into(Restaurants).entries({
                    ID: profileId,
                    userID_ID: userId,
                    cif: userData.cif,
                    address: userData.address
                }));
            } else if (userData.role === 'repartidor') {
                await tx.run(INSERT.into(Drivers).entries({
                    ID: profileId,
                    userID_ID: userId,
                    vehicleType: userData.vehicleType,
                    vehiclePlate: userData.vehiclePlate || null,
                    dni: userData.dni,
                    vehicleBrand: userData.vehicleBrand || null,
                    vehicleModel: userData.vehicleModel || null,
                    vehicleColor: userData.vehicleColor || null,
                    drivingLicense: userData.drivingLicense || null
                }));
            }

            console.log(`🎉 Perfil ${userData.role} creado correctamente con ID: ${profileId}`);
            return { ID: userId };

        } catch (error) {
            console.error('❌ Error detallado en el registro:', error);
            req.error(500, `Error en el servidor: ${error.message}`);
        }
    });

    // --- FASE 4: DISPARADORES AUTOMÁTICOS ---

    // Cuando se crea un pedido, avisamos al restaurante
    this.after('CREATE', 'Orders', async (order) => {
        try {
            console.log('--- DISPARADOR PUSH: INICIO ---');
            console.log(`🔔 Nuevo pedido ${order.ID}. Restaurante: ${order.restaurantId_ID}`);

            // 1. Buscamos el ID de usuario del dueño del restaurante
            const restaurante = await SELECT.one.from(Restaurants).where({ ID: order.restaurantId_ID });
            if (!restaurante) {
                console.error('❌ No se encontró el restaurante para el pedido');
                return;
            }

            const ownerId = restaurante.userID_ID;
            console.log(`👤 Owner ID del restaurante: ${ownerId}`);

            // 2. Buscamos todas las suscripciones (dispositivos) de ese usuario
            const subscriptions = await SELECT.from(PushSubscriptions).where({ userId_ID: ownerId });

            console.log(`📱 Dispositivos encontrados para el owner: ${subscriptions.length}`);

            if (subscriptions.length === 0) {
                console.log('⚠️ El restaurante no tiene dispositivos registrados para notificaciones.');
                return;
            }

            // 3. Preparamos el contenido de la notificación
            const payload = JSON.stringify({
                notification: {
                    title: '¡Nuevo Pedido! 🍔',
                    body: `Has recibido un nuevo pedido por total de ${order.totalAmount}€`,
                    icon: '/favicon.ico', // Usamos una ruta más estándar o absoluta si es posible
                    vibrate: [100, 50, 100],
                    data: { url: '/restaurant/orders' }
                }
            });

            console.log('📦 Enviando payload:', payload);

            // 4. Enviamos la notificación a cada dispositivo registrado
            const promises = subscriptions.map(sub => {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };

                console.log(`➡️ Enviando a endpoint: ${sub.endpoint.substring(0, 30)}...`);

                return webpush.sendNotification(pushConfig, payload)
                    .then(() => console.log(`✅ Éxito enviando a ${sub.ID}`))
                    .catch(err => {
                        console.error('❌ Error enviando push a dispositivo:', sub.ID, err.statusCode || err.message);
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            console.log('🗑️ Token expirado, borrando suscripción...');
                            return DELETE.from(PushSubscriptions).where({ ID: sub.ID });
                        }
                    });
            });

            await Promise.all(promises);
            console.log('--- DISPARADOR PUSH: FIN ---');

        } catch (error) {
            console.error('❌ Error crítico en el disparador de notificaciones:', error);
        }
    });

    this.before('CREATE', 'Orders', async (req) => {
        console.log('📬 RECIBIDA PETICIÓN DE CREAR PEDIDO EN EL BACKEND');
        console.log('DATOS DEL PEDIDO:', JSON.stringify(req.data));
    });

    this.on('rateRestaurant', async (req) => {
        const { restaurantId, rating } = req.data;
        try {
            const restaurant = await SELECT.one.from(Restaurants).where({ ID: restaurantId });
            if (!restaurant) return req.error(404, 'Restaurante no encontrado');

            const currentStars = restaurant.stars || 0;
            const average = (currentStars + rating) / 2;
            const newStars = Math.round(average);

            await UPDATE(Restaurants).set({ stars: newStars }).where({ ID: restaurantId });
            return { success: true };
        } catch (error) {
            console.error('Error in rateRestaurant:', error);
            req.error(500, 'Error al calificar el restaurante');
        }
    });

    /**
     * Acción de prueba para notificaciones push
     */
    this.on('sendTestNotification', async (req) => {
        const { userId } = req.data;
        console.log(`--- TEST NOTIFICATION: Iniciando para usuario ${userId} ---`);

        try {
            // Buscamos suscripciones activas
            const subscriptions = await SELECT.from(PushSubscriptions).where({ userId_ID: userId });
            console.log(`Suscripciones encontradas: ${subscriptions.length}`);

            if (!subscriptions || subscriptions.length === 0) {
                console.warn('⚠️ No hay suscripciones para este usuario');
                return { success: false, count: 0 };
            }

            const notificationPayload = JSON.stringify({
                notification: {
                    title: '🔔 Test de Notificación',
                    body: '¡Esto es una prueba exitosa desde el backend!',
                    icon: '/assets/icons/icon-72x72.png',
                    vibrate: [100, 50, 100],
                    data: {
                        url: '/'
                    }
                }
            });

            const sendPromises = subscriptions.map(sub => {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };
                return webpush.sendNotification(pushConfig, notificationPayload);
            });

            await Promise.all(sendPromises);
            console.log('✅ Notificaciones de prueba enviadas');
            return { success: true, count: subscriptions.length };

        } catch (error) {
            console.error('❌ Error enviando test notification:', error);
            return { success: false, count: 0 };
        }
    });
});
