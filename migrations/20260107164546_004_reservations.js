exports.up = async function (knex) {
  await knex.schema.createTable('reservations', (t) => {
    t.increments('id').primary();

    t.integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    t.dateTime('reservation_datetime').notNullable();
    t.integer('number_of_guests').notNullable();
    t.text('notes').nullable();

    t.enum('status', ['pending', 'approved', 'cancelled'])
      .notNullable()
      .defaultTo('pending');

    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('reservations');
};
