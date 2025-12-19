const express = require("express");
const router = express.Router();

// Import middleware auth (bảo vệ login và role admin)
const { protect, admin } = require("../middleware/auth");

// Import middleware upload
// Đảm bảo file này tồn tại và được cấu hình đúng (dùng cho settings avatar)
const upload = require("../middleware/upload"); 

// Import controllers
const dashboardController = require("../controllers/admin/dashboardController");
const productController = require("../controllers/admin/productController");
const reportController = require("../controllers/admin/reportController");
const orderController = require("../controllers/admin/orderController"); 
const userController = require("../controllers/admin/userController"); 
const settingsController = require("../controllers/admin/settingsController");

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
// Lưu ý: Upload ảnh sản phẩm đang được xử lý trực tiếp trong controller (multer)
router.get("/products", productController.getProducts);
router.get("/products/add", productController.getAddProduct);
router.post("/products/add", productController.postAddProduct); 
router.get("/products/edit/:id", productController.getEditProduct);
router.post("/products/edit/:id", productController.postEditProduct);
router.get("/products/delete/:id", productController.deleteProduct);

// ==========================================
// 3. ORDERS (QUẢN LÝ ĐƠN HÀNG)
// ==========================================
router.get("/orders", orderController.getOrders); // Xem danh sách
router.post("/orders/handle-cancel", orderController.handleCancelRequest); // Xử lý duyệt/từ chối hủy
router.post("/orders/update-status", orderController.updateStatus); // Cập nhật trạng thái (giao hàng/hoàn thành)
router.post('/orders/admin-cancel', orderController.adminCancelOrder); // Admin chủ động hủy/xóa đơn

// ==========================================
// 4. USERS (QUẢN LÝ NGƯỜI DÙNG)
// ==========================================
router.get("/users", userController.getUsers); // Xem danh sách
router.get("/users/add", userController.getAddUser); // Form thêm
router.post("/users/add", userController.postAddUser); // Xử lý thêm
router.get("/users/edit/:id", userController.getEditUser); // Form sửa
router.post("/users/edit/:id", userController.postEditUser); // Xử lý sửa
router.get("/users/delete/:id", userController.deleteUser); // Xóa user

// [MỚI] Route Khóa / Mở khóa tài khoản
router.get("/users/toggle-lock/:id", userController.toggleLockUser);

// ==========================================
// 5. SETTINGS (CÀI ĐẶT HỆ THỐNG)
// ==========================================
router.get("/settings", settingsController.getSettings); // Trang giao diện cài đặt

// Cập nhật hồ sơ (Có upload ảnh avatar admin)
router.post("/settings/profile", upload.single('avatar'), settingsController.updateProfile);

// Đổi mật khẩu
router.post("/settings/password", settingsController.updatePassword);

// ==========================================
// 6. REPORTS (BÁO CÁO)
// ==========================================
router.get("/reports", reportController.getReports);

module.exports = router;