require('dotenv').config();

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 26569),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

     ssl: {
    ca: fs.readFileSync(process.env.DB_CA_PATH), 
  },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
};
