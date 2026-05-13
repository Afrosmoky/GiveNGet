ALTER TABLE regular_users_details
ADD COLUMN date_of_birth DATE;

UPDATE regular_users_details
SET date_of_birth = DATE(CONCAT(YEAR(CURDATE()) - age, '-01-01'))
WHERE age IS NOT NULL;

ALTER TABLE regular_users_details
DROP COLUMN age;
