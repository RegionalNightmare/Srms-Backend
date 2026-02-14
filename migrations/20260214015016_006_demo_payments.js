exports.up = async function (knex) {
  await knex.schema.createTable("payments", (t) => {
    t.increments("id").primary();

    t.integer("order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    t.decimal("amount", 10, 2).notNullable();
    t.string("currency", 10).notNullable().defaultTo("USD");

    t.string("provider", 50).notNullable().defaultTo("DEMO_PAYMENTS");

    t.enum("status", [
      "created",
      "authorized",
      "succeeded",
      "failed",
      "refunded",
    ]).notNullable().defaultTo("created");

    t.string("transaction_ref", 120).notNullable();
    t.string("failure_reason", 255).nullable();

    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("payments");
};
