const express = require('express');
const router = express.Router();

// Import Controllers
const homeController = require('../controllers/homeController');
const productController = require('../controllers/productController'); 
const productDetailController = require('../controllers/productDetailController'); 
const userController = require('../controllers/userController'); // [MỚI] Import userController để lấy hàm getProfile

// Import Middleware
const { protect } = require('../middleware/auth'); // [MỚI] Import middleware bảo vệ

// Middleware expose user (Giữ nguyên logic của bạn)
const exposeUser = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};

// ======================= ROUTES ======================= //

// 1. Trang chủ
router.get('/', exposeUser, homeController.getHome);

// 2. Trang danh sách sản phẩm
router.get('/products', exposeUser, productController.getProducts);

// 3. Trang chi tiết sản phẩm
router.get('/product-detail/:id', exposeUser, productDetailController.getProductDetail);

// 4. [QUAN TRỌNG] Trang thông tin cá nhân (Profile)
// Route này giúp link href="/profile" trong Header hoạt động
router.get('/profile', protect, userController.getProfile);

module.exports = router;