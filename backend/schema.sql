
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
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Restaurants (
  ID VARCHAR(36) NOT NULL,
  userID_ID VARCHAR(36),
  cif VARCHAR(20),
  address VARCHAR(200),
  PRIMARY KEY(ID)
);

CREATE TABLE my_bookshop_Clients (
  ID VARCHAR(36) NOT NULL,
  userID_ID VARCHAR(36),
  defaultAddress VARCHAR(200),
  PRIMARY KEY(ID)
);

