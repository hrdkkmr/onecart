CREATE DATABASE olist_ecommerce;
USE olist_ecommerce;

SET GLOBAL local_infile = 1;

CREATE TABLE customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    customer_unique_id VARCHAR(50),
    customer_zip_code_prefix INT,
    customer_city VARCHAR(100),
    customer_state VARCHAR(10)
);

CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50),
    order_status VARCHAR(20),
    order_purchase_timestamp DATETIME,
    order_approved_at DATETIME,
    order_delivered_carrier_date DATETIME,
    order_delivered_customer_date DATETIME,
    order_estimated_delivery_date DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
    order_id VARCHAR(50),
    order_item_id INT,
    product_id VARCHAR(50),
    seller_id VARCHAR(50),
    shipping_limit_date DATETIME,
    price DECIMAL(10,2),
    freight_value DECIMAL(10,2),
    PRIMARY KEY (order_id, order_item_id)
);

CREATE TABLE order_payments (
    order_id VARCHAR(50),
    payment_sequential INT,
    payment_type VARCHAR(20),
    payment_installments INT,
    payment_value DECIMAL(10,2)
);

CREATE TABLE order_reviews (
    review_id VARCHAR(50),
    order_id VARCHAR(50),
    review_score INT,
    review_comment_title TEXT,
    review_comment_message TEXT,
    review_creation_date DATETIME,
    review_answer_timestamp DATETIME
);

CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,
    product_category_name VARCHAR(100),
    product_name_length INT,
    product_description_length INT,
    product_photos_qty INT,
    product_weight_g INT,
    product_length_cm INT,
    product_height_cm INT,
    product_width_cm INT
);

CREATE TABLE sellers (
    seller_id VARCHAR(50) PRIMARY KEY,
    seller_zip_code_prefix INT,
    seller_city VARCHAR(100),
    seller_state VARCHAR(10)
);

CREATE TABLE geolocation (
    geolocation_zip_code_prefix INT,
    geolocation_lat FLOAT,
    geolocation_lng FLOAT,
    geolocation_city VARCHAR(100),
    geolocation_state VARCHAR(10)
);

CREATE TABLE category_translation (
    product_category_name VARCHAR(100),
    product_category_name_english VARCHAR(100)
);

SET FOREIGN_KEY_CHECKS = 0;

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_customers_dataset.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
customer_id,
customer_unique_id,
@zip,
customer_city,
customer_state
)
SET
customer_zip_code_prefix = NULLIF(@zip, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_sellers_dataset.csv'
INTO TABLE sellers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
seller_id,
@zip,
seller_city,
seller_state
)
SET
seller_zip_code_prefix = NULLIF(@zip, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/products_dataset.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
product_id,
product_category_name,
@name_len,
@desc_len,
@photos_qty,
@weight,
@length,
@height,
@width
)
SET
product_name_length = NULLIF(@name_len, ''),
product_description_length = NULLIF(@desc_len, ''),
product_photos_qty = NULLIF(@photos_qty, ''),
product_weight_g = NULLIF(@weight, ''),
product_length_cm = NULLIF(@length, ''),
product_height_cm = NULLIF(@height, ''),
product_width_cm = NULLIF(@width, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_orders_dataset.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
order_id,
customer_id,
order_status,
@purchase,
@approved,
@carrier,
@delivered,
@estimated
)
SET
order_purchase_timestamp = NULLIF(@purchase, ''),
order_approved_at = NULLIF(@approved, ''),
order_delivered_carrier_date = NULLIF(@carrier, ''),
order_delivered_customer_date = NULLIF(@delivered, ''),
order_estimated_delivery_date = NULLIF(@estimated, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_order_items_dataset.csv'
INTO TABLE order_items
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
order_id,
order_item_id,
product_id,
seller_id,
@ship_date,
@price,
@freight
)
SET
shipping_limit_date = NULLIF(@ship_date, ''),
price = NULLIF(@price, ''),
freight_value = NULLIF(@freight, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_order_payments_dataset.csv'
INTO TABLE order_payments
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
order_id,
payment_sequential,
payment_type,
@installments,
@value
)
SET
payment_installments = NULLIF(@installments, ''),
payment_value = NULLIF(@value, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_order_reviews_dataset.csv'
INTO TABLE order_reviews
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
review_id,
order_id,
@score,
review_comment_title,
review_comment_message,
@creation,
@answer
)
SET
review_score = NULLIF(@score, ''),
review_creation_date = NULLIF(REPLACE(@creation, '\r', ''), ''),
review_answer_timestamp = NULLIF(REPLACE(@answer, '\r', ''), '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/olist_geolocation_dataset.csv'
INTO TABLE geolocation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(
@zip,
@lat,
@lng,
geolocation_city,
geolocation_state
)
SET
geolocation_zip_code_prefix = NULLIF(@zip, ''),
geolocation_lat = NULLIF(@lat, ''),
geolocation_lng = NULLIF(@lng, '');

LOAD DATA LOCAL INFILE 'E:/Hardik/Programming/onecart/dataset/archive/product_category_name_translation.csv'
INTO TABLE category_translation
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

SET FOREIGN_KEY_CHECKS = 1;