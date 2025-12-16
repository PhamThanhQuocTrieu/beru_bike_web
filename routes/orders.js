const express = require('express');
const router = express.Router();

// 1. Import Controllers
const checkoutController = require('../controllers/checkoutController'); // Xử lý đặt hàng
const paymentController = require('../controllers/paymentController');   // Xử lý trang hoàn tất
const orderController = require('../controllers/orderController');       // Quản lý đơn hàng (list, detail, cancel)

// 2. Import Middleware
const { guestProtect } = require('../middleware/guestAuth'); // Bảo vệ route cho khách/user
const { protect } = require('../middleware/auth');           // Bảo vệ route chỉ cho user đã login

// ==================================================================
// PHẦN 1: XỬ LÝ ĐẶT HÀNG & HOÀN TẤT
// (Các route này phục vụ luồng Checkout)
// ==================================================================

// [POST] /checkout/orders/order
// Xử lý đặt hàng (COD & VNPay) - Gọi sang checkoutController
router.post('/order', guestProtect, checkoutController.placeOrder);

// [GET] /checkout/orders/order-complete
// Trang hiển thị "Cảm ơn" sau khi đặt hàng thành công
router.get('/order-complete', guestProtect, paymentController.getOrderComplete);


// ==================================================================
// PHẦN 2: QUẢN LÝ LỊCH SỬ ĐƠN HÀNG (USER)
// (Các route này yêu cầu phải đăng nhập - dùng middleware 'protect')
// ==================================================================

// [GET] /checkout/orders/list
// Xem danh sách đơn hàng của tôi
router.get('/list', protect, orderController.getUserOrders);

// [GET] /checkout/orders/detail/:id
// Xem chi tiết một đơn hàng cụ thể
router.get('/detail/:id', protect, orderController.getOrderDetail);

// [POST] /checkout/orders/cancel/:id
// Gửi yêu cầu hủy đơn hàng
router.post('/cancel/:id', protect, orderController.cancelOrder);

module.exports = router;