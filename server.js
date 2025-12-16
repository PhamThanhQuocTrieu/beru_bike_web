const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const fs = require("fs");
const multer = require("multer"); 

// Import middleware
const { setupGlobals } = require("./middleware/globalVariables");

// [MỚI] Import Controller để xử lý route lẻ (chi tiết sản phẩm)
const productController = require('./controllers/productController');

const app = express();
const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");
const indexRoutes = require("./routes/index");
const userRoutes = require("./routes/user");
const searchRoutes = require("./routes/search"); 
const productsRoutes = require("./routes/products"); 
const checkoutRoutes = require("./routes/checkout"); 

// Kết nối MongoDB
connectDB().catch(err => {
  console.error("Không thể kết nối DB:", err);
  process.exit(1);
});

// Cấu hình Multer (Giữ nguyên code cũ)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "public/uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh!'), false);
  }
});

// Cấu hình EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware cơ bản
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Logging Middleware
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log(`POST ${req.path}`);
  }
  next();
});

// 1. Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-dev', 
  resave: false,
  saveUninitialized: true,
  rolling: true, 
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// 2. Flash middleware
app.use(flash());

// 3. User Hydration
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user; 
    } else if (req.session && req.session.passport && req.session.passport.user) {
        req.user = { _id: req.session.passport.user }; 
    } else {
        req.user = null;
    }
    next();
});

// 4. Setup Globals
app.use(setupGlobals);

// Routes Protect Middleware
app.use('/profile', require('./middleware/auth').protect);
app.use('/orders', require('./middleware/auth').protect);
app.use('/admin', require('./middleware/auth').protect);

// ================== ROUTES SETUP ==================

app.use("/admin", adminRoutes);

// Route cho Search
app.use("/search", searchRoutes);
app.use("/api/search", searchRoutes); 

// [MỚI] Route cho Danh sách sản phẩm & Filter (URL: /products và /products/filter)
app.use("/products", productsRoutes); 

// [MỚI] Route cho Chi tiết sản phẩm (URL: /product-detail/:id)
// Route này được khai báo thẳng ở đây để khớp với EJS bạn đã viết
app.get("/product-detail/:id", productController.getProductDetail);

app.use("/checkout", checkoutRoutes); 

// Route User & Index (Đặt cuối cùng để tránh override các route cụ thể trên)
app.use("/", userRoutes); 
app.use("/", indexRoutes);

// ==================================================

// Xử lý 404 & Error
app.use((req, res) => {
  res.status(404).render("error", { message: "Không tìm thấy trang!", user: req.session.user || null });
});
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(500).render("error", { message: "Có lỗi xảy ra: " + err.message, user: req.session.user || null });
});

// Chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});