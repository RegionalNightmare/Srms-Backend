require('dotenv').config();
const fs = require('fs');
const path = require('path');

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 26569),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
         ca: process.env.DB_SSL_CERT,
        rejectUnauthorized: true
  },
    },

     
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
};
