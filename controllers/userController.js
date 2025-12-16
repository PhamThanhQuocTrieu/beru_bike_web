const User = require('../models/User');
const Cart = require('../models/Cart');

// GET Signup page
exports.getSignup = (req, res) => {
  res.render("signup", { 
    title: "Đăng ký tài khoản",
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    }
  });
};

// GET Login page
exports.getLogin = (req, res) => {
  res.render("login", { 
    title: "Đăng nhập tài khoản",
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    }
  });
};

// POST Signup
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body || {};

    // Trim input
    const trimmedFirstName = firstName ? firstName.trim() : '';
    const trimmedLastName = lastName ? lastName.trim() : '';
    const trimmedEmail = email ? email.trim() : '';
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedPassword = password ? password.trim() : '';
    const trimmedConfirmPassword = confirmPassword ? confirmPassword.trim() : '';

    // Validation cơ bản
    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone || !trimmedPassword || !trimmedConfirmPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin!' });
    }
    if (trimmedPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu phải ít nhất 8 ký tự!' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(trimmedPassword)) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa/thường, số và ký tự đặc biệt!' });
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp!' });
    }
    if (!/^\d{10,11}$/.test(trimmedPhone)) {
      return res.status(400).json({ message: 'Số điện thoại phải là 10-11 chữ số!' });
    }

    // Kiểm tra trùng lặp
    const existingUser = await User.findOne({ $or: [{ email: trimmedEmail }, { phone: trimmedPhone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email hoặc Số điện thoại đã tồn tại!' });
    }

    // Tạo user mới
    const newUser = new User({ 
        firstName: trimmedFirstName, 
        lastName: trimmedLastName, 
        email: trimmedEmail, 
        phone: trimmedPhone, 
        password: trimmedPassword 
    });
    
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công! Vui lòng đăng nhập.', redirect: '/auth/login' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống: ' + error.message });
  }
};

// POST Login (LOGIC GỘP GIỎ HÀNG QUAN TRỌNG)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {}; 
    const trimmedInput = email ? email.trim() : '';

    if (!trimmedInput || !password) {
      return res.status(400).json({ message: 'Vui lòng điền email/SĐT và mật khẩu!' });
    }

    // Xác định là email hay số điện thoại
    const isEmail = trimmedInput.includes('@');
    const queryField = isEmail ? { email: trimmedInput } : { phone: trimmedInput };
    
    // Tìm user và lấy password (đã hash)
    const user = await User.findOne(queryField).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản không tồn tại!' }); 
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không đúng!' });
    }

    // --- LƯU SESSION USER ---
    req.session.user = user; 
    
    // ============================================================
    // LOGIC CHUYỂN GIỎ HÀNG TỪ KHÁCH (SESSION) -> USER
    // ============================================================
    // Tìm giỏ hàng hiện tại của phiên khách (Session ID)
    const guestCart = await Cart.findOne({ sessionId: req.sessionID });
    
    if (guestCart) {
        // Tìm giỏ hàng cũ của User này (nếu có)
        const userCart = await Cart.findOne({ userId: user._id });

        if (userCart) {
            // TRƯỜNG HỢP 1: User đã có giỏ hàng cũ -> GỘP item từ giỏ khách vào
            guestCart.items.forEach(guestItem => {
                const existingItemIndex = userCart.items.findIndex(
                    ui => ui.productId.toString() === guestItem.productId.toString()
                );

                if (existingItemIndex > -1) {
                    // Nếu trùng sản phẩm -> Cộng dồn số lượng
                    userCart.items[existingItemIndex].quantity += guestItem.quantity;
                } else {
                    // Nếu chưa có -> Thêm mới vào
                    userCart.items.push(guestItem);
                }
            });

            // Tính lại tổng tiền cho giỏ User
            userCart.totalItems = userCart.items.reduce((sum, item) => sum + item.quantity, 0);
            userCart.totalPrice = userCart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            
            await userCart.save();
            await Cart.findByIdAndDelete(guestCart._id); // Xóa giỏ tạm sau khi gộp xong
            console.log(`[Login] Merged Guest Cart (${guestCart._id}) into User Cart (${userCart._id})`);
        } else {
            // TRƯỜNG HỢP 2: User chưa có giỏ -> Chuyển quyền sở hữu giỏ khách cho User
            guestCart.userId = user._id;
            guestCart.sessionId = undefined; // Gỡ bỏ session ID cũ
            await guestCart.save();
            console.log(`[Login] Transferred Guest Cart (${guestCart._id}) to User (${user._id})`);
        }
    }
    // ============================================================

    // Điều hướng theo role
    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/';
    
    // Lưu session trước khi redirect để đảm bảo không bị mất
    req.session.save(err => {
        if (err) console.error("Session save error:", err);
        res.json({ message: 'Đăng nhập thành công!', redirect: redirectUrl });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// GET Logout
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/'); 
    }
    res.clearCookie('connect.sid'); // Xóa cookie session
    res.redirect('/'); 
  });
};

// [GET] /profile - Trang thông tin cá nhân
exports.getProfile = (req, res) => {
    res.render("profile", { 
        title: "Thông tin cá nhân",
        user: req.user,
        page: 'info', // [FIX] Thêm biến này để sửa lỗi 'page is not defined'
        messages: {
            success: req.flash('success'),
            error: req.flash('error')
        }
    });
};