using my.bookshop as db from '../db/schema';

/**
 * Servicio de catálogo para exponer las entidades de la base de datos.
 */
service CatalogService {
    entity Products as projection on db.Products;
    entity Users    as projection on db.Users;
    entity Drivers  as projection on db.Drivers;
    entity Places   as projection on db.Places;
    entity Clients  as projection on db.Clients;
}
