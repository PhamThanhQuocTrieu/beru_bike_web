const express = require('express');
const router = express.Router();

// Import Controller đã viết ở bước trước
const productController = require('../controllers/productController');

// ==================================================
// ROUTE 1: API Lọc sản phẩm (AJAX gọi vào đây)
// URL: /products/filter
// ==================================================
// Lưu ý: Phải đặt route này LÊN TRƯỚC route /:id để tránh bị hiểu nhầm 'filter' là một ID
router.get('/filter', productController.filterProducts);

// ==================================================
// ROUTE 2: Render trang danh sách sản phẩm
// URL: /products
// ==================================================
router.get('/', productController.getProducts);

module.exports = router;