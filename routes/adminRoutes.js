const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    loginAdmin,
    getAllUsers,
    getAllOrders,
    updateOrderStatus,
    createInvoice,
    getAllProducts,
    updateUserStatus,
    getOrderById
} = require('../controllers/adminController');

router.post('/login', loginAdmin);
// Apply authentication middleware to all routes
router.use(authenticateUser);

// Define routes
router.put('/users/:id/status',updateUserStatus);
router.get('/users', getAllUsers);
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/invoice', createInvoice);
router.get('/products', getAllProducts);

module.exports = router;
