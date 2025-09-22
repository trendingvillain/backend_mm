const pool = require('../config/db');

// Get all products
const getAllProducts = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json({ success: true, products: result.rows });
    } catch (error) {
        next(error);
    }
};

// Get product by ID
const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Add a new product (admin only)
const addProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      packaging,
      shelf_life,
      available_stock,
      restock_date,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    // multer stores files in req.files (array)
    const imageUrls = req.files
      ? req.files.map((file) => `/uploads/products/${file.filename}`)
      : [];

    const result = await pool.query(
      `INSERT INTO products 
        (name, description, packaging, shelf_life, available_stock, restock_date, image_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || "",
        packaging || "",
        shelf_life || null,
        available_stock || 0,
        restock_date || null,
        imageUrls,
      ]
    );

    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (error) {
    next(error);
  }
};


// Update product details (admin only)
const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, packaging, shelf_life, available_stock, restock_date, is_active } = req.body;

        const result = await pool.query(
            `UPDATE products
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 packaging = COALESCE($3, packaging),
                 shelf_life = COALESCE($4, shelf_life),
                 available_stock = COALESCE($5, available_stock),
                 restock_date = COALESCE($6, restock_date),
                 is_active = COALESCE($7, is_active)
             WHERE id = $8
             RETURNING *`,
            [name, description, packaging, shelf_life, available_stock, restock_date, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// Delete a product (admin only)
const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct
};
