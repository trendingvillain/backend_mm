const pool = require('../config/db');

// ✅ Create a new order with multiple products
const createOrder = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { delivery_date, products } = req.body;

        if (!delivery_date || !products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Delivery date and products are required' });
        }

        await client.query('BEGIN');

        // Insert into orders table
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, delivery_date, status, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING id, order_code, user_id, delivery_date, status, created_at, updated_at`,
            [userId, delivery_date, 'pending']
        );

        const order = orderResult.rows[0];

        // Insert each product into order_items
        for (const item of products) {
            const { product_id, quantity } = item;

            if (!product_id || !quantity) {
                throw new Error('Each product must have product_id and quantity');
            }

            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [order.id, product_id, quantity]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            order_id: order.id,            // internal ID
            order_code: order.order_code,  // public random code
            message: 'Order created successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

// ✅ Get all orders for logged-in user
const getUserOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const ordersResult = await pool.query(
            `SELECT id, order_code, delivery_date, status, created_at 
             FROM orders 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        const orders = ordersResult.rows;

        // Attach items for each order
        for (let order of orders) {
            const itemsResult = await pool.query(
                `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = $1`,
                [order.id]
            );
            order.items = itemsResult.rows;
        }

        res.json({ success: true, orders });
    } catch (error) {
        next(error);
    }
};

// ✅ Get orders for a specific user (admin use)
const getUserOrdersByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const userResult = await pool.query(
            'SELECT id, name, email, phone, address FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const ordersResult = await pool.query(
            `SELECT id, order_code, delivery_date, status, created_at 
             FROM orders 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        const orders = ordersResult.rows;

        for (let order of orders) {
            const itemsResult = await pool.query(
                `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity
                 FROM order_items oi
                 JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = $1`,
                [order.id]
            );
            order.items = itemsResult.rows;
        }

        res.json({
            success: true,
            user: userResult.rows[0],
            orders
        });
    } catch (error) {
        next(error);
    }
};

// ✅ Get order details by order_code
const getOrderByCode = async (req, res, next) => {
    try {
        const { code } = req.params;

        const orderResult = await pool.query(
            `SELECT o.id, o.order_code, o.user_id, u.name AS user_name, 
                    o.delivery_date, o.status, o.created_at
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.order_code = $1`,
            [code]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Fetch items
        const itemsResult = await pool.query(
            `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [order.id]
        );

        order.items = itemsResult.rows;

        // Fetch invoice if completed
        if (order.status === 'completed') {
            const invoiceResult = await pool.query(
                `SELECT invoice_number, items, total, created_at
                 FROM invoices
                 WHERE order_id = $1`,
                [order.id]
            );

            order.invoice = invoiceResult.rows.length > 0
                ? invoiceResult.rows[0]
                : { message: 'Invoice details not found' };
        } else {
            order.invoice = { message: 'Invoice will be created soon' };
        }

        res.json({ success: true, order });
    } catch (error) {
        next(error);
    }
};



// ✅ Cancel order (by order_code)
const cancelOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;

        const orderCheck = await pool.query(
            'SELECT * FROM orders WHERE order_code = $1 AND user_id = $2',
            [code, userId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }

        const result = await pool.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_code = $2 RETURNING *',
            ['cancelled', code]
        );

        res.json({ success: true, order: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getUserOrdersByUserId,
    getOrderByCode,
    cancelOrder
};
