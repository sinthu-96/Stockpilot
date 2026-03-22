const db = require('../config/db');

// Record a sale
const recordSale = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { product_id, quantity } = req.body;

    const [productRows] = await connection.query('SELECT quantity, price FROM products WHERE id = ? FOR UPDATE', [product_id]);

    if (productRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const stock = productRows[0].quantity;
    const price = productRows[0].price;

    if (stock < quantity) {
      await connection.rollback();
      return res.status(400).json({ message: 'Not enough stock' });
    }

    const total = price * quantity;

    await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, product_id]);

    await connection.query('INSERT INTO sales (product_id, quantity_sold, total_price) VALUES (?, ?, ?)', [product_id, quantity, total]);

    await connection.commit();
    res.status(201).json({ message: 'Sale recorded successfully', total });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Get Sales History
const getSalesHistory = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        sales.id,
        products.name,
        sales.quantity_sold,
        sales.total_price,
        sales.created_at
      FROM sales
      JOIN products ON sales.product_id = products.id
      ORDER BY sales.created_at DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

// Get Dashboard Stats
const getDashboardStats = async (req, res, next) => {
  try {
    // Total Revenue
    const [revenueRows] = await db.query('SELECT SUM(total_price) as total_revenue FROM sales');
    const totalRevenue = revenueRows[0].total_revenue || 0;

    // Total Items Sold
    const [itemsRows] = await db.query('SELECT SUM(quantity_sold) as total_items FROM sales');
    const totalItems = itemsRows[0].total_items || 0;

    // Low stock count
    const [lowStockRows] = await db.query('SELECT COUNT(*) as low_stock_count FROM products WHERE quantity <= 5');
    const lowStockCount = lowStockRows[0].low_stock_count || 0;
    
    // Recent Sales
    const [recentSales] = await db.query(`
      SELECT sales.id, products.name, sales.total_price, sales.created_at
      FROM sales
      JOIN products ON sales.product_id = products.id
      ORDER BY sales.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalRevenue,
      totalItems,
      lowStockCount,
      recentSales
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordSale,
  getSalesHistory,
  getDashboardStats
};
