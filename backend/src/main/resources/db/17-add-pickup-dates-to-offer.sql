ALTER TABLE offer ADD COLUMN pickup_date_from VARCHAR(5);
ALTER TABLE offer ADD COLUMN pickup_date_to VARCHAR(5);

update offer set pickup_date_from = '00:00', pickup_date_to = '23:59'
where pickup_date_from is null or pickup_date_to is null;