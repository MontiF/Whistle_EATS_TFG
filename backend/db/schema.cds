namespace my.bookshop; // Reemplaza con el namespace de tu proyecto

/**
 * Entidad para representar los productos en la base de datos.
 */
entity Products {
  key ID          : UUID;
      name        : String(100);
      description : String;
      price       : Decimal(9, 2);
      stock       : Integer;
      imageUrl    : String;
      isAvailable : Boolean default true;
}

/**
 * Entidad de Usuarios para simular Login
 */
entity Users {
  key ID       : UUID;
      email    : String(100);
      password : String(100); // Texto plano solo para pruebas
      role     : String(20);  // 'cliente', 'repartidor', 'local'
      name     : String(100);
      
      // Relaciones 1 a 1 (Opcionales)
      // Si el rol es 'repartidor', tendrá datos en 'driver'
      driver   : Composition of one Drivers on driver.user = $self;
      // Si el rol es 'local', tendrá datos en 'place'
      place    : Composition of one Places on place.user = $self;
      // Si el rol es 'cliente', tendrá datos en 'client'
      client   : Composition of one Clients on client.user = $self;
}

entity Drivers {
  key ID : UUID;
  user : Association to Users;
  vehicleType : String(50); // 'Moto', 'Bici', 'Coche'
  vehiclePlate : String(7);
  isAvailable : Boolean default false;
}

entity Places {
  key ID : UUID;
  user : Association to Users;
  cif : String(20);
  address : String(200);
  openingHours : String(100);
  category : String(50); // 'Hamburguesas', 'Pizza', etc.
}

entity Clients {
    key ID : UUID;
    user : Association to Users;
    defaultAddress : String(200);
    phone : String(20);
}
