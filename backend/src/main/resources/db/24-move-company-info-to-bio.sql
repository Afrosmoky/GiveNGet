ALTER TABLE users 
ADD COLUMN bio TEXT;

UPDATE users u
INNER JOIN business_users_details bud ON u.id = bud.user_id
SET u.bio = bud.company_info
WHERE bud.company_info IS NOT NULL;

ALTER TABLE business_users_details 
DROP COLUMN company_info;
