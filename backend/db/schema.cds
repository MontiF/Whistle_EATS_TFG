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
      role     : String(20);  // 'cliente', 'repartidor', 'admin'
      name     : String(100);
}
