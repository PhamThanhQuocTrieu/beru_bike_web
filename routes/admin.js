// routes/admin.js
const express = require("express");
const router = express.Router();

// Import middleware auth (bảo vệ login và role admin)
const { protect, admin } = require("../middleware/auth");

// Import middleware upload (Cần tạo file middleware/upload.js hoặc cấu hình multer)
// Lưu ý: Nếu bạn chưa tách file upload, hãy đảm bảo file này tồn tại
const upload = require("../middleware/upload"); 

// Import controllers
const dashboardController = require("../controllers/admin/dashboardController");
const productController = require("../controllers/admin/productController");
const reportController = require("../controllers/admin/reportController");
const orderController = require("../controllers/admin/orderController"); 
const userController = require("../controllers/admin/userController"); 
const settingsController = require("../controllers/admin/settingsController"); // [MỚI] Controller cài đặt

// Apply middleware bảo vệ toàn bộ routes admin (Yêu cầu đăng nhập & quyền Admin)
router.use(protect, admin);

// ==========================================
// 1. DASHBOARD
// ==========================================
router.get("/", dashboardController.getDashboard); // Redirect root về dashboard
router.get("/dashboard", dashboardController.getDashboard);

// ==========================================
// 2. PRODUCTS (QUẢN LÝ SẢN PHẨM)
// ==========================================
router.get("/products", productController.getProducts);
router.get("/products/add", productController.getAddProduct);
router.post("/products/add", productController.postAddProduct); // Lưu ý: Cần thêm upload.single/array nếu form có ảnh
router.get("/products/edit/:id", productController.getEditProduct);
router.post("/products/edit/:id", productController.postEditProduct);
router.get("/products/delete/:id", productController.deleteProduct);

// ==========================================
// 3. ORDERS (QUẢN LÝ ĐƠN HÀNG)
// ==========================================
router.get("/orders", orderController.getOrders); // Xem danh sách
router.post("/orders/handle-cancel", orderController.handleCancelRequest); // Xử lý duyệt/từ chối hủy
router.post("/orders/update-status", orderController.updateStatus); // Cập nhật trạng thái (giao hàng/hoàn thành)
// Route Admin chủ động hủy đơn
router.post('/orders/admin-cancel', orderController.adminCancelOrder);

// ==========================================
// 4. USERS (QUẢN LÝ NGƯỜI DÙNG)
// ==========================================
router.get("/users", userController.getUsers); // Xem danh sách
router.get("/users/add", userController.getAddUser); // Form thêm
router.post("/users/add", userController.postAddUser); // Xử lý thêm
router.get("/users/edit/:id", userController.getEditUser); // Form sửa
router.post("/users/edit/:id", userController.postEditUser); // Xử lý sửa
router.get("/users/delete/:id", userController.deleteUser); // Xóa user

// ==========================================
// 5. SETTINGS (CÀI ĐẶT HỆ THỐNG) - [MỚI]
// ==========================================
router.get("/settings", settingsController.getSettings); // Trang giao diện cài đặt

// Cập nhật hồ sơ (Có upload ảnh avatar)
router.post("/settings/profile", upload.single('avatar'), settingsController.updateProfile);

// Đổi mật khẩu
router.post("/settings/password", settingsController.updatePassword);

// ==========================================
// 6. REPORTS (BÁO CÁO)
// ==========================================
router.get("/reports", reportController.getReports);

module.exports = router;