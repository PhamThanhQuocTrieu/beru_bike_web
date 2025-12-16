const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const User = require('../models/User'); 

// Import Controllers
const userController = require('../controllers/userController');
const profileController = require('../controllers/profileController');

// Import Middleware
const { protect } = require('../middleware/auth');

// --------------------- MULTER CONFIG ---------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

// ------------------------- ROUTES -------------------------

// ======================= AUTHENTICATION ======================= //
// Vì server.js dùng app.use("/", ...), nên ở đây PHẢI THÊM /auth thủ công vào URL

// [GET] Trang đăng ký
router.get('/auth/signup', userController.getSignup);

// [POST] Xử lý đăng ký
router.post('/auth/signup', userController.signup);

// [GET] Trang đăng nhập
router.get('/auth/login', userController.getLogin);

// [POST] Xử lý đăng nhập
router.post('/auth/login', userController.login);

// [GET] Đăng xuất
router.get('/auth/logout', userController.logout);


// ======================= PROFILE & SETTINGS ======================= //

// [POST] Cập nhật thông tin (Form gửi về /auth/profile/update)
router.post(
  '/auth/profile/update', 
  protect, 
  upload.single('avatar'), 
  profileController.updateProfile
);

// [GET] Trang đổi mật khẩu (Link: /profile/change-password)
// Route này không cần /auth vì là trang xem nội dung
router.get('/profile/change-password', protect, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id || req.session.user.id);
    res.render('profile', {
      user: user,
      page: 'change-password', // Biến này báo cho view biết đang ở tab đổi pass
      title: 'Đổi mật khẩu',
      messages: {
        success: req.flash('success'),
        error: req.flash('error')
      }
    });
  } catch (error) {
    console.error(error);
    res.redirect('/profile');
  }
});

// [POST] Xử lý đổi mật khẩu (Form gửi về /auth/profile/change-password)
router.post(
  '/auth/profile/change-password', 
  protect, 
  profileController.changePassword
);


// ======================= OTHER FEATURES ======================= //
// Các tính năng đang phát triển

router.get('/settings', protect, (req, res) => {
  res.redirect('/profile/change-password');
});

router.get('/orders', protect, (req, res) => {
    // Redirect sang đúng route đơn hàng trong routes/orders.js
    res.redirect('/checkout/orders/list'); 
});

router.get('/notifications', protect, (req, res) => {
    res.render('error', { message: 'Tính năng Thông báo đang phát triển!', user: req.user });
});

router.get('/vouchers', protect, (req, res) => {
    res.render('error', { message: 'Tính năng Voucher đang phát triển!', user: req.user });
});

module.exports = router;