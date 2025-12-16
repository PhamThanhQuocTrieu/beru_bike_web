const User = require("../../models/User");
const bcrypt = require("bcryptjs");

// 1. Hiển thị trang cài đặt
exports.getSettings = (req, res) => {
  res.render("admin/settings", {
    title: "Cài đặt hệ thống",
    user: req.user,
    message: req.query.message, // Lấy message từ query string (đơn giản hóa flash)
    error: req.query.error
  });
};

// 2. Cập nhật thông tin cá nhân (Profile)
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user._id;

    const updates = { firstName, lastName, phone };

    // Nếu có upload ảnh mới (xử lý bởi Multer ở route)
    if (req.file) {
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await User.findByIdAndUpdate(userId, updates);
    
    // Cập nhật lại session
    req.session.user.firstName = firstName;
    req.session.user.lastName = lastName;
    if(req.file) req.session.user.avatar = updates.avatar;

    res.redirect("/admin/settings?message=Cập nhật hồ sơ thành công!");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings?error=Lỗi hệ thống");
  }
};

// 3. Đổi mật khẩu
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Kiểm tra mật khẩu cũ
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.redirect("/admin/settings?error=Mật khẩu hiện tại không đúng!");
    }

    // Kiểm tra xác nhận
    if (newPassword !== confirmPassword) {
      return res.redirect("/admin/settings?error=Mật khẩu xác nhận không khớp!");
    }

    if (newPassword.length < 6) {
        return res.redirect("/admin/settings?error=Mật khẩu phải trên 6 ký tự!");
    }

    // Cập nhật (Pre-save hook trong Model sẽ tự hash)
    user.password = newPassword;
    await user.save();

    res.redirect("/admin/settings?message=Đổi mật khẩu thành công!");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings?error=Lỗi hệ thống");
  }
};