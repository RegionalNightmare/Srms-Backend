exports.up = async function (knex) {
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();

    t.integer('user_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    t.enum('type', ['pickup', 'delivery']).notNullable().defaultTo('pickup');

    t.decimal('total_price', 10, 2).notNullable().defaultTo(0);

    t.enum('status', ['pending', 'completed', 'cancelled'])
      .notNullable()
      .defaultTo('pending');

    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();

    t.integer('order_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE');

    t.integer('menu_item_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('menu')
      .onDelete('RESTRICT');

    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('price_each', 10, 2).notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
};
