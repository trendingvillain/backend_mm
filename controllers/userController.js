const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/helpers');

// Register a new user
const registerUser = async (req, res, next) => {
    try {
        const { name, email, phone, password, role, business_name, gst_number, address } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required' });
        }

        // Check if email already exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, business_name, gst_number, address, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW()) RETURNING id, name, email, role, status`,
            [name, email, phone, hashedPassword, role, business_name || '', gst_number || '', address || '']
        );

        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Login user and return JWT token
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({ success: true, token });
    } catch (error) {
        next(error);
    }
};

// Get logged-in user's profile
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, name, email, phone, role, business_name, gst_number, address, status, created_at FROM users WHERE id = $1',
            [userId]
        );

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Update user's profile
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, phone, business_name, gst_number, address } = req.body;

        const result = await pool.query(
            `UPDATE users
             SET name = COALESCE($1, name),
                 phone = COALESCE($2, phone),
                 business_name = COALESCE($3, business_name),
                 gst_number = COALESCE($4, gst_number),
                 address = COALESCE($5, address)
             WHERE id = $6
             RETURNING id, name, email, phone, role, business_name, gst_number, address, status, created_at`,
            [name, phone, business_name, gst_number, address, userId]
        );

        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Add or update stock alert
const manageStockAlert = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Check if alert exists
        const existing = await pool.query(
            'SELECT * FROM stock_alerts WHERE user_id = $1 AND product_id = $2',
            [userId, product_id]
        );

        if (existing.rows.length > 0) {
            // Already exists
            return res.status(400).json({ message: 'Stock alert already set for this product' });
        }

        const result = await pool.query(
            'INSERT INTO stock_alerts (user_id, product_id, notified, created_at) VALUES ($1, $2, FALSE, NOW()) RETURNING *',
            [userId, product_id]
        );

        res.json({ success: true, alert: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    manageStockAlert
};
