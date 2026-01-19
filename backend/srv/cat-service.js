const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Users, Clients, Drivers, Restaurants } = this.entities;

    this.on('registerUser', async (req) => {
        const { userData } = req.data;
        const db = await cds.connect.to('postgres');
        const tx = db.transaction(req);

        try {
            console.log(`🚀 Intentando registrar usuario: ${userData.email} con rol: ${userData.role}`);

            // 1. Insertar en la tabla principal de Usuarios
            const userResult = await tx.run(INSERT.into(Users).entries({
                email: userData.email,
                password: userData.password,
                role: userData.role,
                name: userData.name,
                phone: userData.phone
            }));

            const userId = userResult.results[0].ID || userResult.req.data.ID;
            console.log(`✅ Usuario creado con ID: ${userId}`);

            // 2. Insertar en la tabla de perfil específica según el rol
            if (userData.role === 'cliente') {
                await tx.run(INSERT.into(Clients).entries({
                    userID_ID: userId,
                    defaultAddress: userData.address
                }));
            } else if (userData.role === 'local') {
                await tx.run(INSERT.into(Restaurants).entries({
                    userID_ID: userId,
                    cif: userData.cif,
                    address: userData.address
                }));
            } else if (userData.role === 'repartidor') {
                await tx.run(INSERT.into(Drivers).entries({
                    userID_ID: userId,
                    vehicleType: userData.vehicleType,
                    vehiclePlate: userData.vehiclePlate,
                    dni: userData.dni,
                    vehicleBrand: userData.vehicleBrand,
                    vehicleModel: userData.vehicleModel,
                    vehicleColor: userData.vehicleColor,
                    drivingLicense: userData.drivingLicense
                }));
            }

            console.log(`🎉 Perfil ${userData.role} creado correctamente.`);
            return { ID: userId };

        } catch (error) {
            console.error('❌ Error en el registro:', error.message);
            req.error(500, `Error en el registro: ${error.message}`);
        }
    });
});
