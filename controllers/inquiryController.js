const pool = require('../config/db');

const createPublicInquiry = async (req, res, next) => {
    try {
        const { name, phone, message } = req.body;

        if (!name || !phone || !message) {
            return res.status(400).json({ message: 'Name, phone, and message are required' });
        }

        const result = await pool.query(
            `INSERT INTO inquiries (name, phone, message, status, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [name, phone, message, 'new']
        );

        res.status(201).json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        next(error);
    }
};


// Create a new inquiry
const createInquiry = async (req, res, next) => {
    try {
        const userId = req.user.id; // comes from JWT
        const { product_id, message } = req.body;

        if (!product_id || !message) {
            return res.status(400).json({ message: 'Product ID and message are required' });
        }

        // fetch name & phone from users table
        const userResult = await pool.query(
            'SELECT name, phone FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, phone } = userResult.rows[0];

        // insert inquiry
        const result = await pool.query(
            `INSERT INTO inquiries 
             (user_id, product_id, message, status, created_at, name, phone) 
             VALUES ($1, $2, $3, $4, NOW(), $5, $6) 
             RETURNING *`,
            [userId, product_id, message, 'new', name, phone]
        );

        res.status(201).json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        next(error);
    }
};


// Get inquiries submitted by the logged-in user
const getUserInquiries = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT i.id, i.product_id, p.name AS product_name, i.message, i.status, i.created_at
             FROM inquiries i
             JOIN products p ON i.product_id = p.id
             WHERE i.user_id = $1
             ORDER BY i.created_at DESC`,
            [userId]
        );

        res.json({ success: true, inquiries: result.rows });
    } catch (error) {
        next(error);
    }
};

// Get all inquiries for admin view
const getAllInquiries = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
          i.id, 
          i.user_id, 
          u.name AS user_name, 
          i.phone,
          i.product_id, 
          p.name AS product_name, 
          i.message, 
          i.status, 
          i.created_at
       FROM inquiries i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN products p ON i.product_id = p.id
       ORDER BY i.created_at DESC`
    );

    res.json({ success: true, inquiries: result.rows });
  } catch (error) {
    next(error);
  }
};



// Update the status of an inquiry (e.g., respond or close)
const updateInquiryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['new', 'responded', 'closed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const result = await pool.query(
            'UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inquiry not found' });
        }

        res.json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createInquiry,
    getUserInquiries,
    getAllInquiries,
    updateInquiryStatus,
    createPublicInquiry
};
