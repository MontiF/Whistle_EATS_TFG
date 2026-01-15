namespace my.bookshop; // Reemplaza con el namespace de tu proyecto

/**
 * Entidad para representar los productos en la base de datos.
 */
type ProductType : String enum { menu; comida; bebida; complemento; }
entity Products {
  key ID          : UUID;
      name        : String(100);
      description : String;
      price       : Decimal(9, 2);
      imageUrl    : String;
      restaurantId       : Association to Restaurants; // Link to the restaurant
      type        : ProductType;
}

/**
 * Entidad de Usuarios
 */
type Role : String enum { cliente; repartidor; local; }

entity Users {
  key ID       : UUID;
      email    : String(100);
      password : String(100);
      role     : Role;
      name     : String(100);
      phone    : String(12);
      
      // Relaciones 1 a 1 (Opcionales)
      // Si el rol es 'repartidor', tendrá datos en 'driver'
      driver   : Association to Drivers on driver.userID = $self;
      // Si el rol es 'local', tendrá datos en 'place'
      restaurant    : Association to Restaurants on restaurant.userID = $self;
      // Si el rol es 'cliente', tendrá datos en 'client'
      client   : Association to Clients on client.userID = $self;
}

type VehicleType : String enum { Moto; Bici; Coche; }

entity Drivers {
  key ID : UUID;
  userID : Association to Users;
  vehicleType : VehicleType;
  vehiclePlate : String(7);
  dni : String(20);
  vehicleBrand : String(50);
  vehicleModel : String(50);
  vehicleColor : String(30);
  drivingLicense : String(20);
}

entity Restaurants {
  key ID : UUID;
  userID : Association to Users;
  cif : String(20);
  address : String(200);
  products : Composition of many Products on products.restaurantId = $self;
}

entity Clients {
    key ID : UUID;
    userID : Association to Users;
    defaultAddress : String(200);
}
