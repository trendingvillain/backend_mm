const pool = require('../config/db');

// Create a new notification
const createNotification = async (req, res, next) => {
    try {
        const { user_id, message, type } = req.body;

        if (!user_id || !message || !type) {
            return res.status(400).json({ message: 'User ID, message, and type are required' });
        }

        const result = await pool.query(
            'INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [user_id, message, type, false]
        );

        res.status(201).json({ success: true, notification: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Get notifications for a user
const getUserNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        res.json({ success: true, notifications: result.rows });
    } catch (error) {
        next(error);
    }
};

// Mark a notification as read
const markNotificationRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ success: true, notification: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Delete a notification
const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM notifications WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createNotification,
    getUserNotifications,
    markNotificationRead,
    deleteNotification
};
