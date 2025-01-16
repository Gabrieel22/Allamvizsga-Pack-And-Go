#CREATE DATABASE PackAndGo;
#USE PackAndGo;



CREATE TABLE Users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash CHAR(64) NOT NULL,
    role bigint,
    created_at DATE
);

CREATE TABLE Locations (
    location_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    city CHAR(100) NOT NULL,
    country CHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

CREATE TABLE Hotels (
    hotel_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_location_id BIGINT,
    name CHAR(255) NOT NULL,
    price_per_night BIGINT,
    available_rooms BIGINT,
    FOREIGN KEY (hotel_location_id) REFERENCES Locations(location_id)
);

CREATE TABLE Routes (
    route_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    origin_id BIGINT,
    destination_id BIGINT,
    distance BIGINT,
    travel_time BIGINT,
    FOREIGN KEY (origin_id) REFERENCES Locations(location_id),
    FOREIGN KEY (destination_id) REFERENCES Locations(location_id)
);

CREATE TABLE Transportation (
    transport_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT,
    type CHAR(50),
    price BIGINT,
    operator_name CHAR(255),
    FOREIGN KEY (route_id) REFERENCES Routes(route_id)
);

CREATE TABLE Bookings (
    booking_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_user_id BIGINT,
    booking_hotel_id BIGINT,
    check_in_date DATE,
    check_out_date DATE,
    travel_date DATE,
    total_price BIGINT,
    FOREIGN KEY (booking_user_id) REFERENCES Users(user_id),
    FOREIGN KEY (booking_hotel_id) REFERENCES Hotels(hotel_id)
);
