// src/routes/galleryRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const router = express.Router();

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/gallery');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// --- API Endpoints ---

// Upload Image
router.post('/upload', upload.single('galleryImage'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const imageUrl = `/uploads/gallery/${req.file.filename}`;

        const result = await pool.query(
            `INSERT INTO gallery_images (image_url)
             VALUES ($1)
             RETURNING id, image_url, uploaded_at`,
            [imageUrl]
        );

        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully!',
            image: result.rows[0]
        });
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Failed to delete uploaded file:', err);
            });
        }
        next(error);
    }
});

// Get All Images
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, image_url, uploaded_at
             FROM gallery_images
             ORDER BY uploaded_at DESC`
        );
        res.status(200).json({ success: true, images: result.rows });
    } catch (error) {
        next(error);
    }
});

// Delete Image
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const findImageResult = await pool.query(
            'SELECT image_url FROM gallery_images WHERE id = $1',
            [id]
        );

        if (findImageResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found.' });
        }

        const imageUrl = findImageResult.rows[0].image_url;

        await pool.query('DELETE FROM gallery_images WHERE id = $1', [id]);

        // Ensure proper path for deletion
        const imagePath = path.join(__dirname, '..', imageUrl.replace(/^\//, ''));
        fs.unlink(imagePath, (err) => {
            if (err) console.error('Failed to delete physical image file:', err);
        });

        res.status(200).json({ success: true, message: 'Image deleted successfully.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
