const pool = require('../config/db');

// Get all prices for a specific product
const getPricesByProduct = async (req, res, next) => {
    try {
        const { product_id } = req.params;

        const result = await pool.query(
            'SELECT id, price, date, created_at FROM prices WHERE product_id = $1 ORDER BY date DESC',
            [product_id]
        );

        res.json({ success: true, prices: result.rows });
    } catch (error) {
        next(error);
    }
};

// Add a new price entry for a product (admin only)
const addPrice = async (req, res, next) => {
    try {
        const { product_id, price, date } = req.body;

        if (!product_id || !price || !date) {
            return res.status(400).json({ message: 'Product ID, price, and date are required' });
        }

        // Check if price for this product and date already exists
        const existing = await pool.query(
            'SELECT * FROM prices WHERE product_id = $1 AND date = $2',
            [product_id, date]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Price for this product and date already exists' });
        }

        const result = await pool.query(
            'INSERT INTO prices (product_id, price, date, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
            [product_id, price, date]
        );

        res.status(201).json({ success: true, price: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Update an existing price entry (admin only)
const updatePrice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        if (!price) {
            return res.status(400).json({ message: 'Price is required' });
        }

        const result = await pool.query(
            'UPDATE prices SET price = $1 WHERE id = $2 RETURNING *',
            [price, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Price entry not found' });
        }

        res.json({ success: true, price: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Delete a price entry (admin only)
const deletePrice = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM prices WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Price entry not found' });
        }

        res.json({ success: true, message: 'Price deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPricesByProduct,
    addPrice,
    updatePrice,
    deletePrice
};
