// controllers/admin/userController.js
const User = require("../../models/User");

// 1. Lấy danh sách người dùng
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }); // Mới nhất lên đầu
    res.render("admin/users", {
      title: "Quản lý người dùng",
      users: users,
      user: req.user // Thông tin admin đang login
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi Server");
  }
};

// 2. Hiển thị form thêm người dùng
exports.getAddUser = (req, res) => {
  res.render("admin/addUser", {
    title: "Thêm người dùng mới",
    user: req.user,
    error: null // Để hiển thị lỗi nếu có
  });
};

// 3. Xử lý thêm người dùng (POST)
exports.postAddUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, gender, dob } = req.body;

    // Kiểm tra email hoặc sđt tồn tại
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.render("admin/addUser", {
        title: "Thêm người dùng mới",
        user: req.user,
        error: "Email hoặc Số điện thoại đã tồn tại!"
      });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password, // Model sẽ tự hash password này
      role,
      gender,
      dob
    });

    await newUser.save();
    res.redirect("/admin/users");

  } catch (err) {
    console.error(err);
    res.render("admin/addUser", {
        title: "Thêm người dùng mới",
        user: req.user,
        error: "Lỗi hệ thống: " + err.message
    });
  }
};

// 4. Hiển thị form sửa người dùng
exports.getEditUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const userToEdit = await User.findById(userId);

    if (!userToEdit) {
      return res.redirect("/admin/users");
    }

    res.render("admin/editUser", {
      title: "Chỉnh sửa người dùng",
      user: req.user, // Admin
      editUser: userToEdit, // User cần sửa
      error: null
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/users");
  }
};

// 5. Xử lý sửa người dùng (POST)
exports.postEditUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, email, phone, role, gender, password } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.redirect("/admin/users");

    // Cập nhật thông tin
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.phone = phone;
    user.role = role;
    user.gender = gender;

    // Nếu admin nhập password mới thì cập nhật, nếu bỏ trống thì giữ nguyên
    if (password && password.trim() !== "") {
      user.password = password; // Pre-save hook trong Model sẽ tự hash lại
    }

    await user.save(); // Dùng save() để kích hoạt validate và hash password
    res.redirect("/admin/users");

  } catch (err) {
    console.error(err);
    // Xử lý lỗi (đơn giản là reload lại trang edit)
    res.redirect(`/admin/users/edit/${req.params.id}`);
  }
};

// 6. Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.redirect("/admin/users");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/users");
  }
};