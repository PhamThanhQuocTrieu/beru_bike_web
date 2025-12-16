// controllers/productDetailController.js (mới tạo)
const Product = require("../models/Product");

// GET /product-detail/:id
exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render("error", { message: "Sản phẩm không tồn tại!", user: req.session.user || null });
    }

    // Query related products (e.g., same loaiXe, exclude current)
    const relatedProducts = await Product.find({ 
      loaiXe: product.loaiXe, 
      _id: { $ne: product._id } 
    }).limit(3);

    res.render("product-detail", { 
      title: `${product.name} - Chi Tiết Sản Phẩm`,
      product,
      relatedProducts,
      user: req.session.user || null  // Truyền user cho header
    });
  } catch (error) {
    console.error("Product detail error:", error);
    res.status(500).render("error", { message: "Lỗi tải sản phẩm!", user: req.session.user || null });
  }
};