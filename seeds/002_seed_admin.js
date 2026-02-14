const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Check if admin already exists
  const existing = await knex('users')
    .where({ email: 'admin@srms.com' })
    .first();

  if (existing) {
    console.log('Admin user already exists, skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await knex('users').insert({
    name: 'System Admin',
    email: 'admin@srms.com',
    password_hash: passwordHash,
    role: 'admin',
  });

  console.log('Admin user created: admin@srms.com / Admin123!');
};
