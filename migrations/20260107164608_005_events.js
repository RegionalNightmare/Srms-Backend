exports.up = async function (knex) {
  await knex.schema.createTable('events', (t) => {
    t.increments('id').primary();

    t.integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    t.string('event_type', 80).notNullable();
    t.dateTime('event_datetime').notNullable();
    t.integer('number_of_guests').notNullable();

    t.enum('status', ['pending', 'approved', 'cancelled'])
      .notNullable()
      .defaultTo('pending');

    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('events');
};
