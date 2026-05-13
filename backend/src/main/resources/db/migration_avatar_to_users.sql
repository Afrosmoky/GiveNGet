ALTER TABLE users
ADD COLUMN avatar_id BIGINT,
ADD CONSTRAINT FK_users_avatar
    FOREIGN KEY (avatar_id) REFERENCES images(id) ON DELETE SET NULL;

UPDATE users u
INNER JOIN regular_users_details rud ON u.id = rud.user_id
SET u.avatar_id = rud.profile_picture_id
WHERE rud.profile_picture_id IS NOT NULL;

ALTER TABLE regular_users_details
DROP FOREIGN KEY regular_users_details_ibfk_2;

ALTER TABLE regular_users_details
DROP COLUMN profile_picture_id;
