const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    createNotification,
    getUserNotifications,
    markNotificationRead,
    deleteNotification
} = require('../controllers/notificationController');

// All routes require authentication
router.use(authenticateUser);

// User routes
router.get('/', getUserNotifications);
router.put('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

// Admin route (optional, can be separated or protected by additional middleware)
router.post('/', createNotification);

module.exports = router;
