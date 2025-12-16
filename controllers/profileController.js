const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// [POST] /profile/update - Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    // 1. Kiểm tra session
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user._id || req.session.user.id;
    const { firstName, lastName, phone, dob, gender, address } = req.body;

    console.log("👉 [Update Profile] Request Body:", req.body);

    // 2. Validate dữ liệu cơ bản
    if (!firstName || !lastName) {
      req.flash('error', 'Họ và tên không được để trống!');
      return res.redirect('/profile'); 
    }

    // 3. Kiểm tra User tồn tại & Validate Phone Unique
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      req.session.destroy();
      return res.redirect('/auth/login');
    }

    // Nếu có số điện thoại, kiểm tra tính hợp lệ và trùng lặp
    if (phone && phone.trim() !== '') {
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(phone)) {
            req.flash('error', 'Số điện thoại không hợp lệ (phải là số VN 10-11 số)!');
            return res.redirect('/profile');
        }

        // Kiểm tra xem số này đã có ai dùng chưa (trừ chính user hiện tại)
        if (phone !== currentUser.phone) {
            const existingUser = await User.findOne({ 
                phone: phone, 
                _id: { $ne: userId } 
            });
            if (existingUser) {
                req.flash('error', 'Số điện thoại này đã được sử dụng bởi tài khoản khác!');
                return res.redirect('/profile');
            }
        }
    }

    // 4. Chuẩn bị dữ liệu update
    const updateData = { 
      firstName: firstName.trim(), 
      lastName: lastName.trim(),
      address: address ? address.trim() : ''
    };

    if (phone) updateData.phone = phone.trim();
    
    if (gender && ['male', 'female', 'other'].includes(gender)) {
      updateData.gender = gender;
    }

    // Xử lý ngày sinh
    if (dob && dob.trim() !== '') {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        req.flash('error', 'Ngày sinh không hợp lệ!');
        return res.redirect('/profile');
      }
      if (dobDate > new Date()) {
        req.flash('error', 'Ngày sinh không thể là tương lai!');
        return res.redirect('/profile');
      }
      updateData.dob = dobDate;
    }

    // 5. Xử lý Avatar (Upload ảnh mới & Xóa ảnh cũ)
    if (req.file) {
      // Logic xóa ảnh cũ để tiết kiệm dung lượng
      const oldAvatar = currentUser.avatar;
      // Chỉ xóa nếu ảnh cũ không phải ảnh mặc định và file tồn tại
      if (oldAvatar && !oldAvatar.includes('/image/icon/') && !oldAvatar.startsWith('http')) {
        const oldAvatarPath = path.join(__dirname, '..', 'public', oldAvatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
            console.log('🗑️ Đã xóa avatar cũ:', oldAvatarPath);
          } catch (err) {
            console.error('Lỗi xóa avatar cũ:', err);
          }
        }
      }
      
      // Lưu đường dẫn ảnh mới
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    // 6. Cập nhật vào Database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password'); // Trả về user mới, bỏ qua password

    // 7. Cập nhật lại Session để giao diện hiển thị ngay lập tức
    // Merge dữ liệu mới vào session cũ
    req.session.user = { ...req.session.user, ...updatedUser.toObject() };

    req.session.save((err) => {
      if (err) console.error("Session Save Error:", err);
      req.flash('success', 'Cập nhật thông tin thành công!');
      res.redirect('/profile');
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    req.flash('error', 'Cập nhật thất bại: ' + error.message);
    res.redirect('/profile');
  }
};

// [POST] /profile/change-password - Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/auth/login');
    
    const userId = req.session.user._id || req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 1. Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error', 'Vui lòng điền đầy đủ các trường mật khẩu!');
      return res.redirect('/profile/change-password');
    }

    if (newPassword.length < 8) {
      req.flash('error', 'Mật khẩu mới phải có ít nhất 8 ký tự!');
      return res.redirect('/profile/change-password');
    }

    if (newPassword !== confirmPassword) {
      req.flash('error', 'Mật khẩu xác nhận không khớp!');
      return res.redirect('/profile/change-password');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      req.flash('error', 'Mật khẩu yếu! Cần có chữ Hoa, thường, số và ký tự đặc biệt.');
      return res.redirect('/profile/change-password');
    }

    // 2. Tìm user và kiểm tra mật khẩu cũ
    const user = await User.findById(userId).select('+password');
    if (!user) { 
      req.session.destroy(); 
      return res.redirect('/auth/login'); 
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Mật khẩu hiện tại không đúng!');
      return res.redirect('/profile/change-password');
    }

    // 3. Lưu mật khẩu mới (Pre-save hook trong Model sẽ tự Hash)
    user.password = newPassword;
    await user.save();

    req.flash('success', 'Đổi mật khẩu thành công!');
    
    // Redirect về trang profile chính (hoặc trang change-password tùy logic UI)
    // Ở đây chuyển về /profile/change-password để user thấy thông báo ngay tại tab đó
    res.redirect('/profile/change-password'); 

  } catch (error) {
    console.error('Change Password Error:', error);
    req.flash('error', 'Lỗi hệ thống: ' + error.message);
    res.redirect('/profile/change-password');
  }
};