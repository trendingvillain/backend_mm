const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginAdmin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Check if admin exists
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const admin = result.rows[0];

        // Compare plain-text password
        if (password !== admin.password) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Generate token
        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            success: true,
            token: token
        });

    } catch (error) {
        next(error);
    }
};
// Get all users
const getAllUsers = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json({ success: true, users: result.rows });
    } catch (error) {
        next(error);
    }
};

// Get all orders
const getAllOrders = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT o.id AS order_id, 
       o.user_id, 
       u.name AS user_name, 
       u.address AS user_address, 
       u.phone AS user_phone, 
       o.delivery_date, 
       o.status, 
       o.created_at,
       json_agg(
           json_build_object(
               'product_id', p.id,
               'product_name', p.name,
               'quantity', oi.quantity
           )
       ) AS items,
       i.invoice_number
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
LEFT JOIN invoices i ON o.id = i.order_id
GROUP BY o.id, u.name, u.address, u.phone, o.delivery_date, o.status, o.created_at, i.invoice_number
ORDER BY o.delivery_date DESC;

        `);

        res.json({ success: true, orders: result.rows });
    } catch (error) {
        next(error);
    }
};




const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, delivery_date } = req.body;

        const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Fetch the current order
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Define allowed transitions from current status
        const transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['completed', 'cancelled'],
            'cancelled': ['confirmed'],
            'completed': []
        };

        if (!transitions[order.status].includes(status)) {
            return res.status(400).json({ message: `Cannot change status from ${order.status} to ${status}` });
        }

        // Build update query dynamically based on presence of delivery_date
        let query = 'UPDATE orders SET status = $1, updated_at = NOW()';
        const params = [status];

        if (delivery_date) {
            query += ', delivery_date = $2';
            params.push(delivery_date);
        }

        query += ' WHERE id = $3 RETURNING *';
        params.push(id);

        const result = await pool.query(query, params);

        res.json({ success: true, message: 'Order updated successfully', order: result.rows[0] });

    } catch (error) {
        next(error);
    }
};


// Update invoice number
const createInvoice = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params; // order ID
        const { invoice_number, items, total } = req.body;

        if (!invoice_number || !items || !Array.isArray(items) || items.length === 0 || items.length > 10) {
            return res.status(400).json({ message: 'Invoice must have 1 to 10 items' });
        }

        if (!total || typeof total !== 'number') {
            return res.status(400).json({ message: 'Total is required and must be a number' });
        }

        await client.query('BEGIN');

        // Lock the order row for update
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Order not found' });
        }
        const order = orderResult.rows[0];

        if (order.status !== 'confirmed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Only confirmed orders can have an invoice created' });
        }

        // Insert the invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices (order_id, invoice_number, items, total)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, invoice_number, JSON.stringify(items), total]
        );

        // Update order status to completed
        await client.query(
            `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Invoice created and order marked as completed',
            invoice: invoiceResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

// View all products
const getAllProducts = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json({ success: true, products: result.rows });
    } catch (error) {
        next(error);
    }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params; // Extract order ID from request parameters

    // Fetch order details
    const orderResult = await pool.query(
      `SELECT o.id, o.user_id, u.name AS user_name, o.delivery_date, o.status, o.created_at
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`, 
      [id]
    );

    // Check if order was found
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Fetch order items
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`, 
      [id]
    );
    
    // Add order items to the order object
    order.items = itemsResult.rows;

    // If order status is 'completed', fetch invoice details
    if (order.status === 'completed') {
      const invoiceResult = await pool.query(
        `SELECT invoice_number, items, total, created_at
         FROM invoices
         WHERE order_id = $1`, 
        [id]
      );
      
      // Add invoice details to the order object
      if (invoiceResult.rows.length > 0) {
        order.invoice = invoiceResult.rows[0];
      } else {
        order.invoice = { message: 'Invoice details not found' };
      }
    } else {
      order.invoice = { message: 'Invoice will be created soon' };
    }

    // Send the order details back in the response
    res.json({ success: true, order });
  } catch (error) {
    next(error); // Handle any errors
  }
};


const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['approved', 'suspended'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be approved or rejected.' });
        }

        const result = await pool.query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, name, email, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    getAllOrders,
    updateOrderStatus,
    createInvoice,
    getAllProducts,
    loginAdmin,
    updateUserStatus,
    getOrderById
};
