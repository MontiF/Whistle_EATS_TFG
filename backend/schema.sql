
CREATE TABLE my_bookshop_Products (
  ID VARCHAR(36) NOT NULL,
  name VARCHAR(100),
  description VARCHAR(255),
  price DECIMAL(9, 2),
  imageUrl VARCHAR(255),
  restaurantId_ID VARCHAR(36),
  type VARCHAR(255),
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Orders (
  ID VARCHAR(36) NOT NULL,
  clientId_ID VARCHAR(36),
  restaurantId_ID VARCHAR(36),
  driverId_ID VARCHAR(36),
  totalAmount DECIMAL(9, 2),
  status VARCHAR(255) DEFAULT 'pendiente_de_aceptacion',
  createdAt TIMESTAMP DEFAULT current_timestamp,
  codeVerificationLocal INTEGER,
  codeVerificationClient INTEGER,
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_OrderItems (
  ID VARCHAR(36) NOT NULL,
  orderId_ID VARCHAR(36),
  productId_ID VARCHAR(36),
  quantity INTEGER,
  unitPrice DECIMAL(9, 2),
  subtotal DECIMAL(9, 2),
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Users (
  ID VARCHAR(36) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(100),
  role VARCHAR(255),
  name VARCHAR(100),
  phone VARCHAR(12),
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Drivers (
  ID VARCHAR(36) NOT NULL,
  userID_ID VARCHAR(36),
  vehicleType VARCHAR(255),
  vehiclePlate VARCHAR(7),
  dni VARCHAR(20),
  vehicleBrand VARCHAR(50),
  vehicleModel VARCHAR(50),
  vehicleColor VARCHAR(30),
  drivingLicense VARCHAR(20),
  hired BOOLEAN DEFAULT FALSE,
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Restaurants (
  ID VARCHAR(36) NOT NULL,
  userID_ID VARCHAR(36),
  cif VARCHAR(20),
  address VARCHAR(200),
  hired BOOLEAN DEFAULT FALSE,
  stars INTEGER DEFAULT 0,
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Clients (
  ID VARCHAR(36) NOT NULL,
  userID_ID VARCHAR(36),
  defaultAddress VARCHAR(200),
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_PushSubscriptions (
  ID VARCHAR(36) NOT NULL,
  userId_ID VARCHAR(36),
  endpoint VARCHAR(255),
  p256dh VARCHAR(255),
  auth VARCHAR(255),
  PRIMARY KEY(ID)
);

CREATE VIEW CatalogService_Products AS SELECT
  Products_0.ID,
  Products_0.name,
  Products_0.description,
  Products_0.price,
  Products_0.imageUrl,
  Products_0.restaurantId_ID,
  Products_0.type
FROM my_bookshop_Products AS Products_0;

CREATE VIEW CatalogService_Users AS SELECT
  Users_0.ID,
  Users_0.email,
  Users_0.password,
  Users_0.role,
  Users_0.name,
  Users_0.phone
FROM my_bookshop_Users AS Users_0;

CREATE VIEW CatalogService_Drivers AS SELECT
  Drivers_0.ID,
  Drivers_0.userID_ID,
  Drivers_0.vehicleType,
  Drivers_0.vehiclePlate,
  Drivers_0.dni,
  Drivers_0.vehicleBrand,
  Drivers_0.vehicleModel,
  Drivers_0.vehicleColor,
  Drivers_0.drivingLicense,
  Drivers_0.hired
FROM my_bookshop_Drivers AS Drivers_0;

CREATE VIEW CatalogService_Restaurants AS SELECT
  Restaurants_0.ID,
  Restaurants_0.userID_ID,
  userID_1.name AS name,
  Restaurants_0.address,
  Restaurants_0.hired,
  Restaurants_0.stars,
  Restaurants_0.cif
FROM (my_bookshop_Restaurants AS Restaurants_0 LEFT JOIN my_bookshop_Users AS userID_1 ON Restaurants_0.userID_ID = userID_1.ID);

CREATE VIEW CatalogService_Clients AS SELECT
  Clients_0.ID,
  Clients_0.userID_ID,
  Clients_0.defaultAddress
FROM my_bookshop_Clients AS Clients_0;

CREATE VIEW CatalogService_Orders AS SELECT
  Orders_0.ID,
  Orders_0.clientId_ID,
  Orders_0.restaurantId_ID,
  Orders_0.driverId_ID,
  Orders_0.totalAmount,
  Orders_0.status,
  Orders_0.createdAt,
  Orders_0.codeVerificationLocal,
  Orders_0.codeVerificationClient
FROM my_bookshop_Orders AS Orders_0;

CREATE VIEW CatalogService_OrderItems AS SELECT
  OrderItems_0.ID,
  OrderItems_0.orderId_ID,
  OrderItems_0.productId_ID,
  OrderItems_0.quantity,
  OrderItems_0.unitPrice,
  OrderItems_0.subtotal
FROM my_bookshop_OrderItems AS OrderItems_0;

CREATE VIEW CatalogService_PushSubscriptions AS SELECT
  PushSubscriptions_0.ID,
  PushSubscriptions_0.userId_ID,
  PushSubscriptions_0.endpoint,
  PushSubscriptions_0.p256dh,
  PushSubscriptions_0.auth
FROM my_bookshop_PushSubscriptions AS PushSubscriptions_0;

