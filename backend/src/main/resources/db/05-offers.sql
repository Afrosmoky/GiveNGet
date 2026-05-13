
create table offer (
    id varchar(12) not null,
    name varchar(255) not null,
    description text,
    transaction_type ENUM('free', 'exchange', 'sale') NOT NULL,
    expiry_date date not null,
    price decimal(10, 2),
    currency varchar(3),
    latitude decimal(9, 6) not null,
    longitude decimal(9, 6) not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp on update current_timestamp,
    primary key (id)
);

create table offer_images (
    id bigint not null auto_increment,
    offer_id varchar(12) not null,
    image_id bigint,
    primary key (id),
    foreign key (offer_id) references offer(id) on delete cascade,
    foreign key (image_id) references images(id) on delete cascade
);

create table category (
    id int not null auto_increment,
    name varchar(255) not null,
    primary key (id)
);

create table subcategory
(
    id          int          not null auto_increment,
    name        varchar(255) not null,
    category_id int          not null,
    primary key (id),
    foreign key (category_id) references category (id) on delete cascade
);

insert into category (id, name) values
                                    (1, 'Dairy & Alternatives'),
                                    (2, 'Bread & Pastries'),
                                    (3, 'Fruits & Vegetables'),
                                    (4, 'Meat, Poultry & Fish'),
                                    (5, 'Pantry Staples & Processed Goods');

insert into subcategory (name, category_id) values
                                                ('Milk & Plant-Based Drinks', 1),
                                                ('Cheeses', 1),
                                                ('Yogurts & Dairy Desserts', 1),
                                                ('Bread', 2),
                                                ('Rolls & Baguettes', 2),
                                                ('Cakes & Cookies', 2),
                                                ('Fresh Fruits', 3),
                                                ('Fresh Vegetables', 3),
                                                ('Potatoes & Onions', 3),
                                                ('Red Meat', 4),
                                                ('Poultry', 4),
                                                ('Fish & Seafood', 4),
                                                ('Grains & Rice', 5),
                                                ('Pasta', 5),
                                                ('Canned & Jarred Goods', 5),
                                                ('Oils & Vinegars', 5);