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
