exports.seed = async function (knex) {
  await knex('menu').del();

  await knex('menu').insert([
    {
      name: 'Classic Pepperoni',
      category: 'main',
      description: 'A timeless favorite with extra pep.',
      price: 14.99,
      available: true,
      dietary_tags: null,
    },
    {
      name: 'Garlic Knots',
      category: 'starter',
      description: 'Warm, buttery, and dangerously snackable.',
      price: 6.99,
      available: true,
      dietary_tags: 'vegetarian',
    },
    {
      name: 'Chocolate Lava Cake',
      category: 'dessert',
      description: 'Rich cake with a molten center.',
      price: 7.5,
      available: true,
      dietary_tags: 'vegetarian',
    },
  ]);
};
