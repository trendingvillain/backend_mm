const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    getPricesByProduct,
    addPrice,
    updatePrice,
    deletePrice
} = require('../controllers/priceController');

// Public route
router.get('/:product_id', getPricesByProduct);

// Protected routes (admin only)
router.use(authenticateUser);
// Add middleware here to check if user is admin if required
router.post('/', addPrice);
router.put('/:id', updatePrice);
router.delete('/:id', deletePrice);

module.exports = router;
