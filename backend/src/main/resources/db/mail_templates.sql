CREATE TABLE mail_templates
(
    id integer PRIMARY KEY auto_increment,
    name varchar(50),
    template LONGTEXT,
    added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);