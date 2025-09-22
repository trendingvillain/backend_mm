const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        // Expecting "Bearer <token>"
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token missing' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Attach user info to request object
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

module.exports = { authenticateUser };
