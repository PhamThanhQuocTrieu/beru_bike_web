const Product = require("../../models/Product");
const path = require("path");
const fs = require("fs");

// CẤU HÌNH MULTER
const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../public/uploads"); 
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file hình ảnh!"), false);
    }
  }
});

// [GET] /admin/products - Danh sách sản phẩm
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render("admin/products", { title: "Quản lý sản phẩm", products, user: req.user });
  } catch (error) {
    console.error("Lỗi tải danh sách:", error);
    res.status(500).send("Lỗi server");
  }
};

// [GET] /admin/products/add - Trang thêm sản phẩm
exports.getAddProduct = (req, res) => {
  res.render("admin/addProduct", { title: "Thêm sản phẩm", user: req.user });
};

// [POST] /admin/products/add - Xử lý thêm sản phẩm
exports.postAddProduct = (req, res) => {
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 4 }
  ])(req, res, async (err) => {
    if (err) return res.status(400).send("Lỗi upload: " + err.message);

    try {
      const { name, price, brand, loaiXe, desc, oldPrice, stock } = req.body;
      
      const mainImage = req.files?.['mainImage'] ? `/uploads/${req.files['mainImage'][0].filename}` : "";
      
      const galleryImages = req.files?.['galleryImages'] 
        ? req.files['galleryImages'].map(file => `/uploads/${file.filename}`) 
        : [];

      await Product.create({
        name: name?.trim(),
        price: parseFloat(price) || 0,
        brand: brand?.trim(),
        loaiXe: loaiXe?.trim(), // Lưu đúng giá trị từ select box (5 loại)
        oldPrice: parseFloat(oldPrice) || 0,
        description: desc?.trim(),
        stock: parseInt(stock) || 0,
        mainImage,
        galleryImages
      });

      res.redirect("/admin/products");
    } catch (error) {
      console.error("Lỗi thêm sản phẩm:", error);
      res.status(500).send("Lỗi server: " + error.message);
    }
  });
};

// [GET] /admin/products/edit/:id - Trang chỉnh sửa
exports.getEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Sản phẩm không tồn tại");
    
    // Render view editProduct và truyền data sản phẩm
    res.render("admin/editProduct", { 
        title: "Chỉnh sửa sản phẩm", 
        product,
        user: req.user 
    });
  } catch (error) {
    console.error("Lỗi get edit:", error);
    res.status(500).send("Lỗi server");
  }
};

// [POST] /admin/products/edit/:id - Xử lý cập nhật
exports.postEditProduct = (req, res) => {
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 4 }
  ])(req, res, async (err) => {
    if (err) return res.status(400).send("Lỗi upload: " + err.message);

    try {
      const productId = req.params.id;
      const { name, price, brand, loaiXe, desc, oldPrice, stock } = req.body;

      // 1. Tìm sản phẩm cũ
      const oldProduct = await Product.findById(productId);
      if (!oldProduct) return res.status(404).send("Sản phẩm không tồn tại");

      // 2. Chuẩn bị dữ liệu cập nhật
      const updateData = {
        name: name?.trim() || oldProduct.name,
        price: parseFloat(price) || oldProduct.price,
        brand: brand?.trim() || oldProduct.brand,
        loaiXe: loaiXe?.trim() || oldProduct.loaiXe, // Cập nhật loại xe mới nếu chọn lại
        oldPrice: parseFloat(oldPrice) || 0,
        description: desc?.trim() || oldProduct.description,
        stock: parseInt(stock) >= 0 ? parseInt(stock) : oldProduct.stock // Cho phép cập nhật về 0
      };

      // 3. Xử lý Ảnh Chính (Nếu upload ảnh mới -> Xóa ảnh cũ)
      if (req.files?.['mainImage']?.length > 0) {
        updateData.mainImage = `/uploads/${req.files['mainImage'][0].filename}`;
        
        // Xóa file ảnh cũ
        if (oldProduct.mainImage) {
          const oldPath = path.join(__dirname, "../../public" + oldProduct.mainImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } else {
        // Nếu không upload mới, giữ nguyên ảnh cũ
        updateData.mainImage = oldProduct.mainImage;
      }

      // 4. Xử lý Ảnh Phụ (Gallery)
      if (req.files?.['galleryImages']?.length > 0) {
        // Nếu upload ảnh mới -> Thay thế toàn bộ và xóa ảnh cũ
        updateData.galleryImages = req.files['galleryImages'].map(file => `/uploads/${file.filename}`);
        
        if (oldProduct.galleryImages?.length > 0) {
          oldProduct.galleryImages.forEach(imgPath => {
            const oldPath = path.join(__dirname, "../../public" + imgPath);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          });
        }
      } else {
        // Nếu không upload mới, giữ nguyên
        updateData.galleryImages = oldProduct.galleryImages;
      }

      // 5. Cập nhật vào Database
      await Product.findByIdAndUpdate(productId, updateData);
      
      console.log(`Đã cập nhật sản phẩm ID: ${productId}`);
      res.redirect("/admin/products");

    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      res.status(500).send("Lỗi server: " + error.message);
    }
  });
};

// [POST] /admin/products/delete/:id - Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Sản phẩm không tồn tại");

    // Xóa ảnh chính
    if (product.mainImage) {
      const mainPath = path.join(__dirname, "../../public" + product.mainImage);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
    }

    // Xóa ảnh gallery
    if (product.galleryImages?.length > 0) {
      product.galleryImages.forEach(imgPath => {
        const galleryPath = path.join(__dirname, "../../public" + imgPath);
        if (fs.existsSync(galleryPath)) fs.unlinkSync(galleryPath);
      });
    }

    // Xóa trong DB
    await Product.findByIdAndDelete(req.params.id);
    
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    res.status(500).send("Lỗi xóa sản phẩm");
  }
};