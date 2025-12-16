// middleware/auth.js
const User = require('../models/User'); 

// Middleware check login (protect)
exports.protect = async (req, res, next) => {
  // Kiểm tra session user tồn tại
  if (req.session && req.session.user) {
    try {
      // FIX QUAN TRỌNG: Dùng _id thay vì id
      // Mongoose object dùng _id, nhưng một số trường hợp serialize lại dùng id. 
      // Dùng (req.session.user._id || req.session.user.id) để bắt cả 2 trường hợp.
      const userId = req.session.user._id || req.session.user.id;

      const user = await User.findById(userId).select('-password'); 

      if (!user) {
        // User không tồn tại trong DB (có thể bị xóa), hủy session
        console.log("Session user ID not found in DB, logging out.");
        req.session.destroy();
        return res.redirect('/auth/login');
      }

      req.user = user; // Gán user mới nhất vào req
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      req.session.destroy(); // Có lỗi thì logout cho an toàn
      return res.redirect('/auth/login');
    }
  } else {
    // Chưa có session -> về trang login
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục!');
    res.redirect('/auth/login');
  }
};

// Middleware check admin role
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    req.flash('error', 'Bạn không có quyền truy cập trang quản trị!');
    res.redirect('/'); 
  }
};