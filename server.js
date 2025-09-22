require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const priceRoutes = require('./routes/priceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const galleryRoutes = require('./routes/galleryRoutes'); // <-- Add this line

// Import middleware
const errorMiddleware = require('./middlewares/errorMiddleware');

const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/gallery", express.static(path.join(__dirname, "uploads/gallery"))); // <-- Add this line

// Routes
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/prices', priceRoutes);
app.use('/orders', orderRoutes);
app.use('/inquiries', inquiryRoutes);
app.use('/notifications', notificationRoutes);
app.use('/gallery', galleryRoutes); // <-- Add this line

// Health Check
app.get('/', (req, res) => {
    res.send('Banana Export API is running...');
});

// Error Handling Middleware
app.use(errorMiddleware);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});