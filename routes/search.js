const express = require('express');
const router = express.Router();
const Product = require('../models/Product');  // Model của bạn

// /search?keyword=xe (xử lý search, render product.ejs với data filter)
router.get('/', async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 12;

    console.log('Search query:', keyword);  // Debug log

    if (!keyword.trim()) {
      // Không keyword: Redirect về /products nếu cần, hoặc hiển thị tất cả
      return res.redirect('/products');
    }

    // Query: Tìm name HOẶC brand chứa keyword (case-insensitive)
    const searchQuery = {
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } }
      ]
    };

    const products = await Product.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // Count total
    const total = await Product.countDocuments(searchQuery);

    const totalPages = Math.ceil(total / limit);

    res.render('product', {  // Render product.ejs với data search
      title: `Kết quả tìm kiếm cho: "${keyword}"`,
      keyword,  // Pass để View dùng cho h1 động
      currentPage: page,
      totalPages,
      total,
      products
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;