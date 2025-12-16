const express = require('express');
const router = express.Router();

// Import Controllers
const checkoutController = require('../controllers/checkoutController');
const vnpayController = require('../controllers/vnpayController'); // [MỚI] Import controller VNPay

// Middleware bảo vệ (cho phép cả guest có session)
const { guestProtect } = require('../middleware/guestAuth');

// ==========================================
// 1. GIỎ HÀNG & GIAO DIỆN CHECKOUT
// ==========================================

// [GET] /checkout/ - Hiển thị trang thanh toán
router.get('/', guestProtect, checkoutController.getCheckoutPage);

// [POST] /checkout/cart/add - Thêm sản phẩm vào giỏ
router.post('/cart/add', guestProtect, checkoutController.addToCart);

// [POST] /checkout/cart/update - Cập nhật số lượng hoặc xóa item
router.post('/cart/update', guestProtect, checkoutController.updateCart);

// ==========================================
// 2. XỬ LÝ ĐẶT HÀNG & THANH TOÁN
// ==========================================

// [POST] /checkout/orders/order - Xử lý đặt hàng (COD / VNPay)
// Route này khớp với lệnh fetch('/checkout/orders/order') trong file checkout.ejs
router.post('/orders/order', guestProtect, checkoutController.placeOrder);

// [GET] /checkout/vnpay_return - Xử lý kết quả trả về từ cổng thanh toán VNPay
router.get('/vnpay_return', vnpayController.vnpayReturn);

// ==========================================
// 3. QUẢN LÝ ĐƠN HÀNG (Order History, Detail...)
// ==========================================

// Chuyển tiếp các request khác liên quan đến đơn hàng sang file routes/orders.js
// Ví dụ: /checkout/orders/list, /checkout/orders/order-complete, /checkout/orders/detail/:id
router.use('/orders', require('./orders'));

module.exports = router;