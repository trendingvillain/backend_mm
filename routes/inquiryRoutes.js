const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/authMiddleware');
const {
    createInquiry,
    getUserInquiries,
    getAllInquiries,
    updateInquiryStatus,
    createPublicInquiry
} = require('../controllers/inquiryController');


router.post('/public', createPublicInquiry);
// User must be authenticated
router.use(authenticateUser);

// User routes
router.post('/', createInquiry);
router.get('/my', getUserInquiries);

// Admin route - could add another middleware to restrict this
router.get('/all', getAllInquiries);
router.put('/:id/status', updateInquiryStatus);

module.exports = router;
