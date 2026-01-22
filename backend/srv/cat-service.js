const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Users, Clients, Drivers, Restaurants } = this.entities;

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
});
