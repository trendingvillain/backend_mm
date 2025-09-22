const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    createOrder,
    getUserOrders,
    getOrderByCode,
    cancelOrder,
    getUserOrdersByUserId
} = require('../controllers/orderController'); 

// All routes require authentication
router.use(authenticateUser);

// Define routes
router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:code',getOrderByCode);
router.put('/:code/cancel', cancelOrder);
router.get('/user/:userId', getUserOrdersByUserId);

module.exports = router;
