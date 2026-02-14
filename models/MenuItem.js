// models/menuModel.js
const pool = require("../config/db");

// Get menu items with optional filters
async function getMenuItems({ category, maxPrice } = {}) {
  let sql = "SELECT * FROM menu_items WHERE 1=1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (maxPrice) {
    sql += " AND price <= ?";
    params.push(Number(maxPrice));
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Get single menu item by ID
async function getMenuItemById(id) {
  const [rows] = await pool.execute("SELECT * FROM menu_items WHERE id = ?", [
    id,
  ]);
  return rows[0] || null;
}

// Create new menu item (admin)
async function createMenuItem({
  name,
  category,
  description,
  ingredients,
  price,
  available = 1,
  dietaryTags,
}) {
  const [result] = await pool.execute(
    `INSERT INTO menu_items
     (name, category, description, ingredients, price, available, dietary_tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      category,
      description || null,
      ingredients ? ingredients.join(",") : null,
      price,
      available,
      dietaryTags ? dietaryTags.join(",") : null,
    ]
  );
  return result.insertId;
}

// Update menu item (admin)
async function updateMenuItem(id, data) {
  const existing = await getMenuItemById(id);
  if (!existing) return null;

  const {
    name = existing.name,
    category = existing.category,
    description = existing.description,
    ingredients,
    price = existing.price,
    available = existing.available,
    dietaryTags,
  } = data;

  await pool.execute(
    `UPDATE menu_items
     SET name = ?, category = ?, description = ?, ingredients = ?, price = ?, available = ?, dietary_tags = ?
     WHERE id = ?`,
    [
      name,
      category,
      description,
      ingredients ? ingredients.join(",") : existing.ingredients,
      price,
      available,
      dietaryTags ? dietaryTags.join(",") : existing.dietary_tags,
      id,
    ]
  );

  return getMenuItemById(id);
}

// Delete menu item (admin)
async function deleteMenuItem(id) {
  await pool.execute("DELETE FROM menu_items WHERE id = ?", [id]);
}

module.exports = {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
