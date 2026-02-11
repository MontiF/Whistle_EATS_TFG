using my.bookshop as db from '../db/schema';

/**
 * Servicio de catálogo para exponer las entidades de la base de datos.
 */
service CatalogService {
    entity Products as projection on db.Products;
    entity Users    as projection on db.Users;
    entity Drivers  as projection on db.Drivers;
    entity Restaurants as projection on db.Restaurants {
        key ID,
        userID,
        userID.name as name,
        address,
        products,
        hired,
        stars,
        cif
    };
    entity Clients  as projection on db.Clients;
    entity Orders   as projection on db.Orders;
    entity OrderItems as projection on db.OrderItems;
    entity PushSubscriptions as projection on db.PushSubscriptions;
    
    /**
     * Acción para registrar usuarios desde el backend, creando
     * automáticamente el perfil correspondiente (cliente, repartidor o local).
     */
    action registerUser(userData : {
        email: String;
        password: String;
        role: String;
        name: String;
        phone: String;
        // Campos opcionales según el rol
        address: String;
        cif: String;
        vehicleType: String;
        vehiclePlate: String;
        dni: String;
        vehicleBrand: String;
        vehicleModel: String;
        vehicleColor: String;
        drivingLicense: String;
    }) returns { ID: UUID };

    
    
    /**
     * Acción para calificar un restaurante.
     */
    action rateRestaurant(restaurantId: UUID, rating: Integer) returns { success: Boolean };

    /**
     * Acción de prueba para validar notificaciones
     */
    action sendTestNotification(userId: UUID) returns { success: Boolean; count: Integer };
}
