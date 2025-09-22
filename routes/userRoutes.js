const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    manageStockAlert
} = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.use(authenticateUser);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/stock-alert', manageStockAlert);

module.exports = router;
