require('dotenv').config();

const dbConnection = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: process.env.DB_SSL_CERT,
    rejectUnauthorized: true
  }
};

module.exports = {
  development: {
    client: 'mysql2',
    connection: dbConnection,
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
  production: {
    client: 'mysql2',
    connection: dbConnection,
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  }
};
