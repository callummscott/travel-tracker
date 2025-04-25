DROP TABLE IF EXISTS countries, visited_countries, users;

CREATE TABLE countries(
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(45) UNIQUE NOT NULL,
)

CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name VARCHAR(15) UNIQUE NOT NULL,
  color VARCHAR(15) NOT NULL
);

CREATE TABLE visited_countries(
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) REFERENCES countries(country_code),
  user_id INTEGER REFERENCES users(id),
  UNIQUE (country_code, user_id)
);

SELECT *
FROM visited_countries
JOIN users
ON users.id = user_id;