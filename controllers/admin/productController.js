// controllers/admin/productController.js
const Product = require("../../models/Product");
const path = require("path");
const fs = require("fs");

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
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file hình ảnh!"), false);
    }
  }
});

// Trang danh sách sản phẩm (Admin vẫn thấy hết để quản lý nhập hàng)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render("admin/products", { title: "Quản lý sản phẩm", products });
  } catch (error) {
    console.error("Lỗi tải danh sách:", error);
    res.status(500).send("Lỗi server");
  }
};

// Trang thêm sản phẩm
exports.getAddProduct = (req, res) => {
  res.render("admin/addProduct", { title: "Thêm sản phẩm" });
};

// Xử lý thêm sản phẩm
exports.postAddProduct = (req, res) => {
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 4 }
  ])(req, res, async (err) => {
    if (err) return res.status(400).send("Lỗi upload: " + err.message);

    try {
      const { name, price, brand, loaiXe, desc, oldPrice, stock } = req.body;
      const mainImage = req.files?.['mainImage'] ? `/uploads/${req.files['mainImage'][0].filename}` : "";
      const galleryImages = req.files?.['galleryImages'] ? req.files['galleryImages'].map(file => `/uploads/${file.filename}`) : [];

      await Product.create({
        name: name?.trim(),
        price: parseFloat(price) || 0,
        brand: brand?.trim(),
        loaiXe: loaiXe?.trim(),
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

// Trang chỉnh sửa
exports.getEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Sản phẩm không tồn tại");
    res.render("admin/editProduct", { title: "Chỉnh sửa sản phẩm", product });
  } catch (error) {
    res.status(500).send("Lỗi server");
  }
};

// Xử lý cập nhật (ĐÃ SỬA: KHÔNG XÓA KHI STOCK = 0)
exports.postEditProduct = (req, res) => {
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 4 }
  ])(req, res, async (err) => {
    if (err) return res.status(400).send("Lỗi upload: " + err.message);

    try {
      const { name, price, brand, loaiXe, desc, oldPrice, stock } = req.body;
      const productId = req.params.id;

      const oldProduct = await Product.findById(productId);
      if (!oldProduct) return res.status(404).send("Sản phẩm không tồn tại");

      const updateData = {
        name: name?.trim() || oldProduct.name,
        price: parseFloat(price) || oldProduct.price,
        brand: brand?.trim() || oldProduct.brand,
        loaiXe: loaiXe?.trim() || oldProduct.loaiXe,
        oldPrice: parseFloat(oldPrice) || oldProduct.oldPrice,
        description: desc?.trim() || oldProduct.description,
        stock: parseInt(stock) || 0 // Nếu nhập 0 thì lưu là 0, KHÔNG XÓA
      };

      // Xử lý ảnh (như cũ)
      if (req.files?.['mainImage']?.length > 0) {
        updateData.mainImage = `/uploads/${req.files['mainImage'][0].filename}`;
        if (oldProduct.mainImage) {
          const oldPath = path.join(__dirname, "../../public" + oldProduct.mainImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      if (req.files?.['galleryImages']?.length > 0) {
        updateData.galleryImages = req.files['galleryImages'].map(file => `/uploads/${file.filename}`);
        if (oldProduct.galleryImages?.length > 0) {
          oldProduct.galleryImages.forEach(imgPath => {
            const oldPath = path.join(__dirname, "../../public" + imgPath);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          });
        }
      }

      // Cập nhật DB
      await Product.findByIdAndUpdate(productId, updateData);
      
      console.log(`Đã cập nhật sản phẩm ID: ${productId}. Số lượng kho: ${updateData.stock}`);
      res.redirect("/admin/products");

    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      res.status(500).send("Lỗi server: " + error.message);
    }
  });
};

// Xóa sản phẩm (Chỉ xóa khi bấm nút Xóa)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Sản phẩm không tồn tại");

    if (product.mainImage) {
      const mainPath = path.join(__dirname, "../../public" + product.mainImage);
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
    }

    if (product.galleryImages?.length > 0) {
      product.galleryImages.forEach(imgPath => {
        const galleryPath = path.join(__dirname, "../../public" + imgPath);
        if (fs.existsSync(galleryPath)) fs.unlinkSync(galleryPath);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin/products");
  } catch (error) {
    res.status(500).send("Lỗi xóa sản phẩm");
  }
};