exports.up = async function (knex) {
  await knex.schema.createTable('menu', (t) => {
    t.increments('id').primary();
    t.string('name', 160).notNullable();
    t.string('category', 60).notNullable();
    t.text('description').nullable();
    t.decimal('price', 10, 2).notNullable();
    t.boolean('available').notNullable().defaultTo(true);
    t.string('dietary_tags', 120).nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('menu');
};
