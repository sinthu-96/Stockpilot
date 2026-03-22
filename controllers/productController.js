const db = require('../config/db');

// Get all products
const getProducts = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Add a product
const addProduct = async (req, res, next) => {
  try {
    const { name, price, quantity } = req.body;
    const sql = 'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)';
    const [result] = await db.query(sql, [name, price, quantity]);
    res.status(201).json({ id: result.insertId, name, price, quantity });
  } catch (error) {
    next(error);
  }
};

// Update product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, quantity } = req.body;
    const sql = 'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?';
    const [result] = await db.query(sql, [name, price, quantity, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM products WHERE id = ?';
    const [result] = await db.query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get low stock products
const getLowStock = async (req, res, next) => {
  try {
    const threshold = req.query.threshold || 10;
    const sql = 'SELECT * FROM products WHERE quantity <= ?';
    const [rows] = await db.query(sql, [threshold]);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getLowStock
};
